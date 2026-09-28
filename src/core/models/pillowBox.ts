// Pillow Box — curved-end "pillow" carton (ECMA F7001, commonly catalogued E10).
//
// A flattened tube whose two ends close with curved tuck flaps; squeezing the
// folded edges bows the panels into the signature pillow shape. Gift cards,
// jewelry, lip balm, small retail.
//
// Flat layout across the WRAP direction:
//   [ glue flap g ] [ Panel A (W) ] [ Panel B (W) ]
// wrapping into a flattened tube of width W, length L. The depth D is realised
// by the curvature of the ends (not a separate panel): each end arc has a
// sagitta s = D/2, so the assembled box bows to ~D.
//
// Each end of each panel has:
//   • an OUTER circular-arc CUT (the rounded blank edge, sagitta s), and
//   • an INNER curved CREASE (a shallower concentric-chord arc) along which the
//     flap folds inward and the two panels' flaps nest (friction lock, no glue).
//
// All math in POINTS. Origin top-left, y increases downward. Arcs are true
// circular arcs (flattened via arcPoints) — chord = panel width W, sagitta from
// the depth. Constraint: D ≤ W (the fold tangent must stay ≤ 45° or the board
// tears); we clamp s ≤ 0.45·W.
//
// Geometry derived from public references (ECMA F7001 / pillow-box structural
// formulas, arc-from-chord-and-sagitta R = (W²+4s²)/(8s)). No proprietary file.
//
// Dims:
//   L → tube length (long axis, vertical in the flat)
//   W → panel width (the flattened tube width)
//   D → depth/thickness (drives the end-curve sagitta s = D/2)

import { Dieline, DieLabel, DimLine, Polyline } from "../types";
import { Pt, arcPoints, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";

export interface PillowBoxParams {
  L: number;          // tube length (pt)
  W: number;          // panel width (pt)
  D: number;          // depth / thickness (pt)
  thickness: number;  // material caliper (pt)
  bleed: number;      // bleed margin (pt)
  glueFlap: number;   // seam glue flap width (pt)
  glueTaper: number;  // chamfer on the glue flap's outer corners (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(L: number, W: number, D: number, thickness = inToPt(0.018)): PillowBoxParams {
  return {
    L, W, D, thickness,
    bleed: inToPt(0.125),
    glueFlap: clamp(W * 0.2, mmToPt(10), mmToPt(16)),
    glueTaper: mmToPt(4),
  };
}

// Circular arc through the two panel-edge corners (chord = W) bulging by `sag`.
//   midX     — chord midpoint x
//   chordY   — y of both chord endpoints
//   sign     — -1 = bulge toward smaller y (top end), +1 = toward larger y (bottom)
//   sag      — sagitta (bulge depth)
// Returns points LEFT endpoint → apex → RIGHT endpoint.
function archChord(midX: number, chordY: number, sign: number, sag: number, W: number, seg: number): Pt[] {
  const r = (W * W + 4 * sag * sag) / (8 * sag);
  const apexY = chordY + sign * sag;
  const cy = apexY - sign * r;       // arc center (on the body side)
  const cx = midX;
  const aL = Math.atan2(chordY - cy, -W / 2);
  const aR = Math.atan2(chordY - cy, W / 2);
  return arcPoints(cx, cy, r, aL, aR, seg);
}

export function buildPillowBox(p: PillowBoxParams): Dieline {
  const { L, W, D, bleed, glueFlap: g, glueTaper: gt } = p;

  // sagitta of the end curve (each panel contributes D/2 of the bow), clamped
  // so D ≤ ~0.9·W (the 45° developability limit).
  const s = Math.min(D / 2, W * 0.45);
  const sc = s * 0.5;          // shallower crease sagitta (inner fold arc)

  // x boundaries
  const x_g0 = 0;
  const x_a0 = g;              // glue / panel A fold
  const x_b0 = g + W;          // panel A / panel B fold
  const x_b1 = g + 2 * W;      // outer right edge (free seam edge)
  const midA = x_a0 + W / 2;
  const midB = x_b0 + W / 2;

  // y levels
  const yT = s;                // top body line (chord of the top end arcs)
  const yB = s + L;            // bottom body line
  const heightPt = L + 2 * s;  // apex-to-apex

  const SEG_CUT = 28, SEG_CRE = 24;

  // ---- CUT outline: one closed polyline ----
  const pts: Pt[] = [];
  const push = (pt: Pt) => {
    const last = pts[pts.length - 1];
    if (!last || last[0] !== pt[0] || last[1] !== pt[1]) pts.push(pt);
  };
  const pushArc = (arr: Pt[]) => arr.forEach(push);

  push([x_g0, yT + gt]);              // glue flap top-left chamfer
  push([gt, yT]);
  push([x_a0, yT]);
  pushArc(archChord(midA, yT, -1, s, W, SEG_CUT));   // top panel A
  pushArc(archChord(midB, yT, -1, s, W, SEG_CUT));   // top panel B
  push([x_b1, yB]);                                  // down right (free) edge
  pushArc([...archChord(midB, yB, +1, s, W, SEG_CUT)].reverse()); // bottom B (R→L)
  pushArc([...archChord(midA, yB, +1, s, W, SEG_CUT)].reverse()); // bottom A
  push([gt, yB]);                     // glue flap bottom edge
  push([x_g0, yB - gt]);              // glue flap bottom-left chamfer

  const cutPolyline: Polyline = { pts, closed: true };

  // ---- CREASE: 2 straight (tube edges) + 4 curved (end fold lines) ----
  const crease: Polyline[] = [
    { pts: [[x_a0, yT], [x_a0, yB]], closed: false }, // glue ↔ A
    { pts: [[x_b0, yT], [x_b0, yB]], closed: false }, // A ↔ B
    { pts: archChord(midA, yT, -1, sc, W, SEG_CRE), closed: false }, // top A
    { pts: archChord(midB, yT, -1, sc, W, SEG_CRE), closed: false }, // top B
    { pts: archChord(midA, yB, +1, sc, W, SEG_CRE), closed: false }, // bottom A
    { pts: archChord(midB, yB, +1, sc, W, SEG_CRE), closed: false }, // bottom B
  ];

  // ---- GLUE hatch (seam flap) ----
  const glue: Polyline[] = [];
  const step = inToPt(0.1);
  for (let c = -(yB - yT); c < x_a0 - x_g0; c += step) {
    const xs = Math.max(x_g0, x_g0 + c);
    const ys = yT + (xs - x_g0 - c);
    const xe = Math.min(x_a0, x_g0 + c + (yB - yT));
    const ye = yT + (xe - x_g0 - c);
    if (xe > xs) glue.push({ pts: [[xs, ys], [xe, ye]], closed: false });
  }

  // ---- BLEED contour ----
  const bleedBox: Polyline = bleedFromCut(cutPolyline, bleed);

  // ---- Dimensions (L = length vertical, W = panel width horizontal) ----
  const dims: DimLine[] = [
    { x1: x_a0, y1: yT + L / 2, x2: x_b0, y2: yT + L / 2, key: "W" },
    { x1: x_b1 + bleed + mmToPt(8), y1: yT, x2: x_b1 + bleed + mmToPt(8), y2: yB, key: "L", vertical: true },
  ];

  const labels: DieLabel[] = [];

  return {
    paths: { cut: [cutPolyline], crease, bleed: [bleedBox], glue },
    widthPt: x_b1,
    heightPt,
    bleedPt: bleed,
    labels,
    dims,
  };
}
