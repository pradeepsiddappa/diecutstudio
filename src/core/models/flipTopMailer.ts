// Flip-Top Mailer — one-piece subscription / book mailer with hinged lid.
//
// A cross-shaped flat layout that folds into a rectangular box with a hinged
// top. Lid hinges off the back wall and folds OVER the top of the box. A
// closure tongue at the front of the lid tucks down into the front wall when
// closed. Side walls extend left/right of the bottom panel.
//
// Common uses: subscription boxes (Birchbox, Loot Crate, etc.), book/tablet
// mailers, gift boxes that need a hinged lid (not separate).
//
// Standards reference: not a strict ECMA-coded folding carton (the form is
// more common in corrugated mailers, FEFCO ~04xx range). The geometry below
// is a clean implementation from first principles — bottom panel + 4 walls
// + hinged lid + closure tongue — derived from packaging engineering
// references (Calver, Paperboard Packaging Handbook).
//
// All math is in POINTS (1 in = 72 pt). Origin top-left, y increases downward.
// Outer rounded corners are real quadratic Bezier curves (`Polyline.curves`)
// so they render perfectly at any zoom — no flattening artifacts.
//
// Formulas (derived defaults, all overridable):
//   sideWallW   = H        (when laid flat, the side wall sits H units wide)
//   lidTongueH  = H * 0.5  (closure tongue depth — enough to lock when shut)
//   lidCornerR  = min(W * 0.1, 8mm)  (rounded lid outer corners)
//   tongueR     = min(lidTongueH * 0.4, 6mm)  (rounded tongue top corners)
//   wallCornerR = min(H * 0.15, 4mm)  (small chamfer on side wall outer corners)
//
//   flat_width  = L + 2 * H               (panel + 2 side walls)
//   flat_height = W + H + W + H + lidTongueH
//                 (lid + back wall + bottom + front wall + tongue)
//
// Changing L, W, or H independently reshapes the dieline correctly:
//   L  → bottom-panel & wall lengths (horizontal)
//   W  → bottom-panel & lid depth (vertical, panel-direction)
//   H  → wall heights AND side-wall widths

import { Dieline, DieLabel, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";

export interface FlipTopMailerParams {
  L: number;            // length — long horizontal panel dim (pt)
  W: number;            // width — short panel dim / box depth (pt)
  H: number;            // height — wall height / side-wall width (pt)
  thickness: number;    // material caliper (pt)
  bleed: number;        // bleed margin (pt)
  lidTongueH: number;   // closure tongue depth (pt)
  lidCornerR: number;   // rounded lid outer corner radius (pt)
  tongueR: number;      // rounded tongue top corner radius (pt)
  wallCornerR: number;  // side-wall outer corner chamfer (pt)
}

export function defaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): FlipTopMailerParams {
  return {
    L, W, H, thickness,
    bleed: inToPt(0.125),
    lidTongueH: H * 0.5,
    lidCornerR: Math.min(W * 0.1, mmToPt(8)),
    tongueR: Math.min(H * 0.2, mmToPt(6)),
    wallCornerR: Math.min(H * 0.15, mmToPt(4)),
  };
}

const line = (a: Pt, b: Pt): Polyline => ({ pts: [a, b], closed: false });

export function buildFlipTopMailer(p: FlipTopMailerParams): Dieline {
  const { L, W, H, bleed, lidTongueH: tH, lidCornerR: lR, tongueR: tR, wallCornerR: wR } = p;

  // Layout (left to right)
  const x0 = 0;                 // outer left (side wall)
  const x1 = H;                 // body left edge (= side wall fold)
  const x2 = x1 + L;            // body right edge
  const x3 = x2 + H;            // outer right (side wall)

  // Layout (top to bottom)
  const y0 = 0;                 // top of tongue
  const y1 = tH;                // top of lid (= bottom of tongue)
  const y2 = y1 + W;            // bottom of lid (= top of back wall)
  const y3 = y2 + H;            // bottom of back wall (= top of bottom panel)
  const y4 = y3 + W;            // bottom of bottom panel (= top of front wall)
  const y5 = y4 + H;            // bottom of front wall

  // ---- CUT outline: one closed polyline, walked clockwise ----
  const pts: Pt[] = [];
  const curves: (Pt | null)[] = [];
  const lin = (p: Pt) => { pts.push(p); if (pts.length > 1) curves.push(null); };
  const quad = (p: Pt, ctrl: Pt) => { pts.push(p); curves.push(ctrl); };

  // ===== TONGUE + LID (top of dieline) =====
  // Tongue top with rounded outer corners
  lin([x1 + tR, y0]);                                    // 0: tongue top-left corner start
  quad([x1, y0 + tR], [x1, y0]);                         // 1: rounded top-left (Q-bezier)
  lin([x1, y1]);                                         // 2: down to lid top-left edge
  // Lid extends slightly left/right of tongue (lid corners are at y1)
  // But since tongue width = lid width = L, no diagonal needed

  // ===== LEFT EDGE OF LID + BACK WALL =====
  lin([x1, y2]);                                         // 3: bottom of lid (= top of back wall)
  lin([x1, y3]);                                         // 4: bottom of back wall (= top of bottom panel)

  // ===== LEFT SIDE WALL (extends left at bottom panel y-range) =====
  lin([x0 + wR, y3]);                                    // 5: outer-left wall top, near corner
  quad([x0, y3 + wR], [x0, y3]);                         // 6: rounded outer-top-left of side wall
  lin([x0, y4 - wR]);                                    // 7: down to bottom-corner area
  quad([x0 + wR, y4], [x0, y4]);                         // 8: rounded outer-bottom-left
  lin([x1, y4]);                                         // 9: back to body left edge

  // ===== LEFT EDGE OF FRONT WALL + BOTTOM =====
  lin([x1, y5 - lR]);                                    // 10: down toward front-wall bottom-left
  quad([x1 + lR, y5], [x1, y5]);                         // 11: rounded front-wall bottom-left corner

  // ===== ACROSS FRONT WALL BOTTOM =====
  lin([x2 - lR, y5]);                                    // 12: across to bottom-right
  quad([x2, y5 - lR], [x2, y5]);                         // 13: rounded front-wall bottom-right

  // ===== RIGHT EDGE OF FRONT WALL =====
  lin([x2, y4]);                                         // 14: up to bottom panel right edge

  // ===== RIGHT SIDE WALL (extends right at bottom panel y-range) =====
  lin([x3 - wR, y4]);                                    // 15: outer-right wall bottom
  quad([x3, y4 - wR], [x3, y4]);                         // 16: rounded outer-bottom-right
  lin([x3, y3 + wR]);                                    // 17: up
  quad([x3 - wR, y3], [x3, y3]);                         // 18: rounded outer-top-right
  lin([x2, y3]);                                         // 19: back to body right edge

  // ===== RIGHT EDGE OF BACK WALL + LID =====
  lin([x2, y2]);                                         // 20: top of back wall
  lin([x2, y1]);                                         // 21: top of lid (right side)

  // ===== TONGUE TOP-RIGHT CORNER =====
  lin([x2, y0 + tR]);                                    // 22: up toward tongue corner
  quad([x2 - tR, y0], [x2, y0]);                         // 23: rounded tongue top-right
  lin([x1 + tR, y0]);                                    // 24: across tongue top back to start
  // Polygon closes back to pts[0]

  const cutPolyline: Polyline = { pts, curves, closed: true };

  // ---- CREASES ----
  const crease: Polyline[] = [];

  // Horizontal folds (across the central column)
  crease.push(line([x1, y1], [x2, y1]));   // tongue/lid fold (where tongue hinges down)
  crease.push(line([x1, y2], [x2, y2]));   // lid/back-wall fold
  crease.push(line([x1, y3], [x2, y3]));   // back-wall/bottom-panel fold
  crease.push(line([x1, y4], [x2, y4]));   // bottom-panel/front-wall fold

  // Vertical folds (where side walls hinge off bottom panel)
  crease.push(line([x1, y3], [x1, y4]));   // left side-wall fold
  crease.push(line([x2, y3], [x2, y4]));   // right side-wall fold

  // ---- BLEED — true contour offset of the cut perimeter ----
  const bboxW = x3;
  const bboxH = y5;
  const bleedBox: Polyline = bleedFromCut(cutPolyline, bleed);

  // ---- Dimension annotations ----
  const midY = y3 + W / 2;     // center of bottom panel
  const midX = x1 + L / 2;
  const dims: DimLine[] = [
    { x1: x1, y1: midY, x2: x2, y2: midY, key: "L" },                            // L on bottom panel (horizontal)
    { x1: midX, y1: y3, x2: midX, y2: y4, key: "W", vertical: true },            // W on bottom panel (vertical)
    { x1: x3 + bleed + mmToPt(8), y1: y3, x2: x3 + bleed + mmToPt(8), y2: y4 - H, key: "H", vertical: true }, // wall height — uses depth
  ];

  const labels: DieLabel[] = [];

  return {
    paths: { cut: [cutPolyline], crease, bleed: [bleedBox], glue: [] },
    widthPt: bboxW,
    heightPt: bboxH,
    bleedPt: bleed,
    labels,
    dims,
  };
}
