// Reverse Tuck End (RTE) carton — ECMA A55.
//
// The most common cosmetic / pharma / confectionery carton form. Tuck flaps
// fold off OPPOSITE panels (top off back, bottom off front), distinguishing
// it from the Straight Tuck End where both tucks fold off the same panel.
//
// Flat layout, left to right:
//   [glue flap] [Back panel: L] [Side: W] [Front panel: L] [Side: W]
// Each panel is H tall. Top & bottom flap configuration:
//   TOP:    Back = tuck PANEL (depth W) + a creased tuck-in TONGUE (rounded)
//           Side1, Side2 = dust flaps (corners chamfered)
//           Front = OPEN edge (no flap — box opens here)
//   BOTTOM: Side1, Side2 = dust flaps
//           Front = tuck panel + tongue (mirror of back top)
//           Back = OPEN edge
//
// The tuck PANEL (depth = box depth W) folds 90° to become the top; the
// TONGUE beyond it folds again at a crease and tucks down inside the front
// wall — the positive closure. (An RTE's panel covers the top exactly; the
// tongue is what actually holds it shut.)
//
// All math is in POINTS (1 in = 72 pt). Origin top-left, y increases downward.
// Curves are real quadratic beziers — the Polyline `curves` field stores the
// control point for each segment that needs one.
//
// Formulas (derived from packaging engineering references, e.g. Calver's
// _Packaging Design_, _Paperboard Packaging Handbook_):
//
//   glueFlap     ≈ clamp(W * 0.8, 8mm, 20mm)
//   tuckH        = W                    (tuck PANEL depth = box depth)
//   tuckIn       ≈ clamp(W*0.5, 8mm, H*0.5)  (tuck-in TONGUE depth, folds inside)
//   dustH        ≈ W - 2mm              (slightly shorter so it tucks first)
//   shoulderCut  ≈ min(W * 0.3, 8mm)    (base chamfer of tuck flap)
//   tuckCornerR  ≈ min(W * 0.4, 12mm)   (rounded tuck top corners)
//   dustCornerR  ≈ min(W * 0.25, 4mm)   (dust flap outer corner chamfer)
//   glueTaper    ≈ min(H * 0.08, 4mm)   (slight taper on glue flap top/bottom)
//
// Changing L, W, or H independently reshapes the dieline correctly:
//   L  → panel widths (back/front)
//   W  → side-panel widths AND flap depths (tuck, dust, glue)
//   H  → body height

import { Dieline, DieLabel, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";

export interface ReverseTuckEndParams {
  L: number;            // length — back/front panel width (pt)
  W: number;            // depth — side panel width (pt)
  H: number;            // body height (pt)
  thickness: number;    // material caliper (pt)
  bleed: number;        // bleed margin (pt)
  glueFlap: number;     // glue flap width (pt)
  tuckH: number;        // tuck PANEL depth (pt) — = box depth W
  tuckIn: number;       // tuck-in TONGUE depth (pt) — folds in at the panel crease
  dustH: number;        // dust flap height (pt) — slightly < tuckH
  shoulderCut: number;  // diagonal chamfer at tuck-flap base (pt)
  tuckCornerR: number;  // rounded radius at tuck flap top corners (pt)
  dustCornerR: number;  // chamfer at dust flap outer corners (pt)
  glueTaper: number;    // taper on glue flap top/bottom (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): ReverseTuckEndParams {
  return {
    L, W, H, thickness,
    bleed: inToPt(0.125),
    glueFlap: clamp(W * 0.8, mmToPt(8), mmToPt(20)),
    tuckH: W,                                       // tuck panel = box depth
    tuckIn: clamp(W * 0.5, mmToPt(8), H * 0.5),     // tuck-in tongue depth
    dustH: W - mmToPt(2),
    shoulderCut: Math.min(W * 0.3, mmToPt(8)),
    tuckCornerR: Math.min(W * 0.4, mmToPt(12)),
    dustCornerR: Math.min(W * 0.25, mmToPt(4)),
    glueTaper: Math.min(H * 0.08, mmToPt(4)),
  };
}

const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

export function buildReverseTuckEnd(p: ReverseTuckEndParams): Dieline {
  const { L, W, H, bleed, glueFlap, tuckH, tuckIn, dustH, shoulderCut: sc, tuckCornerR: tR, dustCornerR: dR, glueTaper: gt } = p;

  // Tongue corner radius + shoulder, clamped to fit within the tongue depth so
  // the rounded lip is valid even on shallow boxes (small W / small tuckIn).
  const tcR = clamp(tR, mmToPt(1.5), tuckIn * 0.45);
  const tsc = Math.min(sc, L * 0.25, (tuckIn - tcR) * 0.9);

  // Layout — vertical x boundaries
  const x_g0 = 0;
  const x_b0 = glueFlap;        // glue / back boundary
  const x_b1 = x_b0 + L;         // back / side1 boundary
  const x_s1 = x_b1 + W;         // side1 / front boundary
  const x_f1 = x_s1 + L;         // front / side2 boundary
  const x_s2 = x_f1 + W;         // outer right edge

  // Horizontal y boundaries. The top/bottom flap = a tuck PANEL (depth tuckH=W)
  // plus a TONGUE (depth tuckIn) beyond it, so the flap fills tuckH+tuckIn.
  const TB = tuckH + tuckIn;     // body top (flap fills 0..TB)
  const BB = TB + H;             // body bottom
  const panelTop = TB - tuckH;   // panel↔tongue crease (top)  (= tuckIn)
  const tongueTop = 0;           // outer top edge of the tongue
  const panelBot = BB + tuckH;   // panel↔tongue crease (bottom)
  const tongueBot = BB + tuckH + tuckIn; // outer bottom edge of the tongue
  const dustTop = TB - dustH;
  const dustBot = BB + dustH;

  // ---- CUT outline: one closed polyline, walked clockwise ----
  const pts: Pt[] = [];
  const curves: (Pt | null)[] = [];
  const lin = (p: Pt) => { pts.push(p); if (pts.length > 1) curves.push(null); };
  const quad = (p: Pt, ctrl: Pt) => { pts.push(p); curves.push(ctrl); };

  // Glue flap top taper
  lin([x_g0, TB + gt]);
  lin([gt, TB]);
  lin([x_b0, TB]);

  // BACK PANEL (lid, depth W, full width) + TUCK-IN TONGUE (depth tuckIn, rounded)
  lin([x_b0, panelTop]);                                   // up the panel LEFT side (full width)
  lin([x_b0 + tsc, panelTop - tsc]);                       // shoulder chamfer into the tongue
  lin([x_b0 + tsc, tongueTop + tcR]);                      // vertical up to near tongue top
  quad([x_b0 + tsc + tcR, tongueTop], [x_b0 + tsc, tongueTop]);   // rounded top-left
  lin([x_b1 - tsc - tcR, tongueTop]);                      // tongue top edge
  quad([x_b1 - tsc, tongueTop + tcR], [x_b1 - tsc, tongueTop]);   // rounded top-right
  lin([x_b1 - tsc, panelTop - tsc]);                       // vertical down
  lin([x_b1, panelTop]);                                   // shoulder chamfer out
  lin([x_b1, TB]);                                         // down the panel RIGHT side

  // SIDE 1 DUST FLAP (top) — chamfered outer corners
  lin([x_b1, dustTop + dR]);
  lin([x_b1 + dR, dustTop]);
  lin([x_s1 - dR, dustTop]);
  lin([x_s1, dustTop + dR]);
  lin([x_s1, TB]);

  // FRONT PANEL TOP — open edge, straight across
  lin([x_f1, TB]);

  // SIDE 2 DUST FLAP (top)
  lin([x_f1, dustTop + dR]);
  lin([x_f1 + dR, dustTop]);
  lin([x_s2 - dR, dustTop]);
  lin([x_s2, dustTop + dR]);
  lin([x_s2, TB]);

  // OUTER RIGHT EDGE — down to body bottom
  lin([x_s2, BB]);

  // ---- BOTTOM (walked right to left, mirror of top) ----

  // SIDE 2 DUST FLAP (bottom)
  lin([x_s2, dustBot - dR]);
  lin([x_s2 - dR, dustBot]);
  lin([x_f1 + dR, dustBot]);
  lin([x_f1, dustBot - dR]);
  lin([x_f1, BB]);

  // FRONT PANEL (lid, depth W) + TUCK-IN TONGUE (bottom) — mirror of back top
  lin([x_f1, panelBot]);                                   // down the panel RIGHT side
  lin([x_f1 - tsc, panelBot + tsc]);                       // shoulder chamfer into the tongue
  lin([x_f1 - tsc, tongueBot - tcR]);                      // vertical down to near tongue bottom
  quad([x_f1 - tsc - tcR, tongueBot], [x_f1 - tsc, tongueBot]);   // rounded bottom-right
  lin([x_s1 + tsc + tcR, tongueBot]);                      // tongue bottom edge
  quad([x_s1 + tsc, tongueBot - tcR], [x_s1 + tsc, tongueBot]);   // rounded bottom-left
  lin([x_s1 + tsc, panelBot + tsc]);                       // vertical up
  lin([x_s1, panelBot]);                                   // shoulder chamfer out
  lin([x_s1, BB]);                                         // up the panel LEFT side

  // SIDE 1 DUST FLAP (bottom)
  lin([x_s1, dustBot - dR]);
  lin([x_s1 - dR, dustBot]);
  lin([x_b1 + dR, dustBot]);
  lin([x_b1, dustBot - dR]);
  lin([x_b1, BB]);

  // BACK PANEL BOTTOM — open edge, straight across
  lin([x_b0, BB]);

  // Glue flap bottom taper + left edge up (back to start)
  lin([gt, BB]);
  lin([x_g0, BB - gt]);
  // Closing segment back to pts[0] handled by closed:true

  // After all `lin`/`quad` calls, curves.length === pts.length - 1
  const cutPolyline: Polyline = { pts, curves, closed: true };

  // ---- CREASE (fold) lines ----
  const crease: Polyline[] = [];

  // Vertical panel folds — only across body height (TB to BB), NOT into flaps
  const vIds = ["glue-back", "back-side1", "side1-front", "front-side2"];
  [x_b0, x_b1, x_s1, x_f1].forEach((x, i) => crease.push(line([x, TB], [x, BB], vIds[i])));

  // Horizontal flap folds at body top — only over panels that HAVE a top flap
  crease.push(line([x_b0, TB], [x_b1, TB], "back-top")); // back (tuck panel hinge)
  crease.push(line([x_b0, panelTop], [x_b1, panelTop], "tongue-top")); // back tongue fold (panel↔tongue)
  crease.push(line([x_b1, TB], [x_s1, TB], "side1-top")); // side1 (dust flap hinge)
  // NO crease across front panel top — it's an open edge
  crease.push(line([x_f1, TB], [x_s2, TB], "side2-top")); // side2 (dust flap hinge)

  // Horizontal flap folds at body bottom — only over panels that HAVE a bottom flap
  // NO crease across back panel bottom — it's an open edge
  crease.push(line([x_b1, BB], [x_s1, BB], "side1-bottom")); // side1 (dust flap hinge)
  crease.push(line([x_s1, BB], [x_f1, BB], "front-bottom")); // front (tuck panel hinge)
  crease.push(line([x_s1, panelBot], [x_f1, panelBot], "tongue-bottom")); // front tongue fold (panel↔tongue)
  crease.push(line([x_f1, BB], [x_s2, BB], "side2-bottom")); // side2 (dust flap hinge)

  // ---- GLUE area diagonal hatch (visual hint only) ----
  const glueHatch: Polyline[] = [];
  const step = inToPt(0.12);
  for (let c = -H; c < x_b0 - x_g0; c += step) {
    const xs = Math.max(x_g0, x_g0 + c);
    const ys = TB + (xs - x_g0 - c);
    const xe = Math.min(x_b0, x_g0 + c + H);
    const ye = TB + (xe - x_g0 - c);
    if (xe > xs) glueHatch.push(line([xs, ys], [xe, ye]));
  }

  // ---- BLEED — true contour offset of the cut perimeter ----
  // Hugs the actual silhouette at `bleed` distance rather than a rectangle
  // around the bbox; saves printed area and reads more clearly in the preview.
  const bboxW = x_s2;
  const bboxH = tongueBot;
  const bleedBox: Polyline = bleedFromCut(cutPolyline, bleed);

  // ---- Dimension annotations (L, W, H arrows on the body) ----
  const midY = TB + H / 2;
  const dims: DimLine[] = [
    { x1: x_b0, y1: midY, x2: x_b1, y2: midY, key: "L" },
    { x1: x_b1, y1: midY, x2: x_s1, y2: midY, key: "W" },
    { x1: x_s2 + bleed + mmToPt(8), y1: TB, x2: x_s2 + bleed + mmToPt(8), y2: BB, key: "H", vertical: true },
  ];

  const labels: DieLabel[] = [];

  return {
    paths: { cut: [cutPolyline], crease, bleed: [bleedBox], glue: glueHatch },
    widthPt: bboxW,
    heightPt: bboxH,
    bleedPt: bleed,
    labels,
    dims,
    // Panel rects for Phase 3 overlays (window on front, Euro slot on back top).
    panels: {
      front: { x: x_s1, y: TB, w: L, h: H },
      back: { x: x_b0, y: TB, w: L, h: H },
      // How far the back lid's tongue tucks down inside the FRONT wall (from the
      // open top edge). The A57 thumb-notch clamps itself to this so the cut
      // stays BACKED by the tongue when closed — never a hole into the box.
      frontTuckCover: { x: x_s1, y: TB, w: L, h: tuckIn },
    },
  };
}
