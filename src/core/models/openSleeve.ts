// Open Sleeve — open-ended wrap tube (ECMA D10).
//
// A rectangular tube, OPEN at both ends, that slides over an inner tray or the
// product itself (premium cosmetics, soap, candles, multi-packs). The simplest
// glued structure: four walls wrap around the cross-section and a glue flap
// seams the tube; there are no end flaps.
//
// Flat layout, left to right (each panel is L tall — L = the sleeve length /
// the open-end axis):
//   [ glue flap ] [ top W ] [ right H ] [ bottom W ] [ left H ]
// wrapping into a tube of cross-section W × H. Both top and bottom edges of the
// blank are the OPEN ends (no flaps).
//
// All math in POINTS. Origin top-left, y increases downward.
// Geometry derived from public references (ECMA D10 sleeve). No proprietary file.
//
// Dims:
//   L → sleeve length (the open-end axis) — the blank height
//   W → cross-section width (the top/bottom panels)
//   H → cross-section height (the side panels)

import { Dieline, DieLabel, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";

export interface OpenSleeveParams {
  L: number;          // sleeve length (pt)
  W: number;          // cross-section width (pt)
  H: number;          // cross-section height (pt)
  thickness: number;  // material caliper (pt)
  bleed: number;      // bleed margin (pt)
  glueFlap: number;   // seam glue flap width (pt)
  glueTaper: number;  // chamfer on the glue flap's outer corners (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): OpenSleeveParams {
  return {
    L, W, H, thickness,
    bleed: inToPt(0.125),
    glueFlap: clamp(Math.min(W, H) * 0.5, mmToPt(10), mmToPt(18)),
    glueTaper: mmToPt(4),
  };
}

const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

export function buildOpenSleeve(p: OpenSleeveParams): Dieline {
  const { L, W, H, bleed, glueFlap: g, glueTaper: gt } = p;

  // x boundaries: glue, top(W), right(H), bottom(W), left(H)
  const x_g0 = 0;
  const x_g1 = g;            // glue / top fold
  const x_t1 = g + W;        // top / right fold
  const x_r1 = g + W + H;    // right / bottom fold
  const x_b1 = g + 2 * W + H; // bottom / left fold
  const x_l1 = g + 2 * W + 2 * H; // outer right edge (free seam edge)
  // y: 0 .. L (both ends open)
  const yT = 0, yB = L;

  // ---- CUT outline: rectangle with a chamfered glue flap on the left ----
  const pts: Pt[] = [
    [gt, yT],         // top edge from glue chamfer
    [x_l1, yT],       // top-right
    [x_l1, yB],       // bottom-right
    [gt, yB],         // bottom edge back to glue
    [x_g0, yB - gt],  // glue bottom-left chamfer
    [x_g0, yT + gt],  // glue left edge up
  ];
  const cutPolyline: Polyline = { pts, closed: true };

  // ---- CREASE: 4 vertical panel folds (full length) ----
  const sleeveIds = ["glue-front", "front-right", "right-back", "back-left"];
  const crease: Polyline[] = [x_g1, x_t1, x_r1, x_b1].map((x, i) => line([x, yT], [x, yB], sleeveIds[i]));

  // ---- GLUE hatch (seam flap) ----
  const glue: Polyline[] = [];
  const step = inToPt(0.1);
  for (let c = -L; c < x_g1 - x_g0; c += step) {
    const xs = Math.max(x_g0, x_g0 + c);
    const ys = yT + (xs - x_g0 - c);
    const xe = Math.min(x_g1, x_g0 + c + L);
    const ye = yT + (xe - x_g0 - c);
    if (xe > xs) glue.push(line([xs, ys], [xe, ye]));
  }

  // ---- BLEED contour ----
  const bleedBox: Polyline = bleedFromCut(cutPolyline, bleed);

  // ---- Dimensions (W + H across adjacent panels, L vertical) ----
  const midY = L / 2;
  const dims: DimLine[] = [
    { x1: x_g1, y1: midY, x2: x_t1, y2: midY, key: "W" },
    { x1: x_t1, y1: midY, x2: x_r1, y2: midY, key: "H" },
    { x1: x_l1 + bleed + mmToPt(8), y1: yT, x2: x_l1 + bleed + mmToPt(8), y2: yB, key: "L", vertical: true },
  ];

  const labels: DieLabel[] = [];

  return {
    paths: { cut: [cutPolyline], crease, bleed: [bleedBox], glue },
    widthPt: x_l1,
    heightPt: L,
    bleedPt: bleed,
    labels,
    dims,
    // Main face ("top" panel) for Phase 3 overlays (thumb / finger hole).
    panels: { front: { x: x_g1, y: yT, w: W, h: L } },
  };
}
