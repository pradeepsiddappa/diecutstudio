// Simple Open Tray — four-corner glued tray (ECMA C10 / FEFCO 0422 family).
//
// A flat base with a wall folding up on each of its four edges; each corner is
// closed by a glue flap that wraps around and bonds to the adjacent wall,
// giving a rigid open-top tray. Bakery / food / gift bases, retail trays.
//
// Flat layout = a PLUS/CROSS:
//
//                  [ top side wall  L×H ]
//   [Ltf]                                      [Rtf]
//   [L end wall W×H] [   BASE  L×W   ] [R end wall W×H]
//   [Lbf]                                      [Rbf]
//                  [ bottom side wall L×H]
//
//   • SIDE walls (top/bottom, length L) carry NO flaps.
//   • END walls (left/right, width W) each carry two corner glue flaps
//     ([Ltf],[Lbf],[Rtf],[Rbf]) that fold 90° at the corner and glue to the
//     inner face of the side walls (the side wall becomes double-thick — the
//     standard load-bearing four-corner tray).
//   • Each flap's free outer corner is chamfered (< 45°, the "drag" corner) so
//     it tucks cleanly and the erected tray resists collapse.
//
// All math in POINTS (1 in = 72 pt). Origin top-left, y increases downward.
// Geometry derived from public references (ECMA C10 / FEFCO 0422, Paperboard
// Packaging Handbook). No proprietary file imported.
//
// Changing dims:
//   L → base length, side-wall length
//   W → base width, end-wall width
//   H → wall height (all four walls) AND flap height (H − relief)

import { Dieline, DieLabel, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";

export interface OpenTrayParams {
  L: number;          // base length (pt)
  W: number;          // base width / depth (pt)
  H: number;          // wall height (pt)
  thickness: number;  // material caliper (pt)
  bleed: number;      // bleed margin (pt)
  relief: number;     // corner slit / rim relief gap (pt)
  flapDepth: number;  // how far each corner flap wraps along the side wall (pt)
  chamfer: number;    // "drag" chamfer on the flap's free outer corner (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): OpenTrayParams {
  const relief = Math.max(thickness, mmToPt(1));
  const flapDepth = clamp(H * 0.8, mmToPt(5), L / 2 - relief);
  return {
    L, W, H, thickness,
    bleed: inToPt(0.125),
    relief,
    flapDepth,
    chamfer: Math.min(flapDepth * 0.4, mmToPt(6)),
  };
}

const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

export function buildOpenTray(p: OpenTrayParams): Dieline {
  const { L, W, H, bleed, relief: r, flapDepth: fd, chamfer: c } = p;

  // x boundaries
  const X0 = 0;
  const Xr = r;
  const X1 = H;          // base left edge
  const X2 = H + L;      // base right edge
  const X3 = 2 * H + L - r;
  const X4 = 2 * H + L;  // outer right edge
  // y boundaries
  const Y0 = 0;
  const Y1 = H;          // base top edge
  const Y2 = H + W;      // base bottom edge
  const Y4 = 2 * H + W;  // outer bottom edge
  const ytf = H - fd;        // top flaps' far edge
  const ybf = H + W + fd;    // bottom flaps' far edge

  // ---- CUT outline: one closed polyline, clockwise from top side wall TL ----
  const pts: Pt[] = [];
  const P = (x: number, y: number) => pts.push([x, y]);

  P(X1, Y0); P(X2, Y0); P(X2, Y1);     // top side wall (top + right edges) → TR base corner
  // right-top flap
  P(X2, ytf); P(X3 - c, ytf); P(X3, ytf + c); P(X3, Y1);
  P(X4, Y1); P(X4, Y2);                // relief strip + right end-wall rim
  // right-bottom flap
  P(X3, Y2); P(X3, ybf - c); P(X3 - c, ybf); P(X2, ybf); P(X2, Y2);
  // bottom side wall
  P(X2, Y4); P(X1, Y4); P(X1, Y2);
  // left-bottom flap
  P(X1, ybf); P(Xr + c, ybf); P(Xr, ybf - c); P(Xr, Y2);
  P(X0, Y2); P(X0, Y1);                // relief strip + left end-wall rim
  // left-top flap
  P(Xr, Y1); P(Xr, ytf + c); P(Xr + c, ytf); P(X1, ytf); P(X1, Y1);
  // (close → (X1,Y0): left edge of the top side wall)

  const cutPolyline: Polyline = { pts, closed: true };

  // ---- CREASE lines (8): 4 base-to-wall + 4 wall-to-flap ----
  const crease: Polyline[] = [
    line([X1, Y1], [X2, Y1], "base-side1"), // base → top side wall
    line([X1, Y2], [X2, Y2], "base-side2"), // base → bottom side wall
    line([X1, Y1], [X1, Y2], "base-end1"),  // base → left end wall
    line([X2, Y1], [X2, Y2], "base-end2"),  // base → right end wall
    line([Xr, Y1], [X1, Y1], "end1-flap1"), // left end wall → top flap
    line([Xr, Y2], [X1, Y2], "end1-flap2"), // left end wall → bottom flap
    line([X2, Y1], [X3, Y1], "end2-flap1"), // right end wall → top flap
    line([X2, Y2], [X3, Y2], "end2-flap2"), // right end wall → bottom flap
  ];

  // ---- GLUE hatch on the 4 corner flaps ----
  const glue: Polyline[] = [];
  const step = inToPt(0.1);
  const hatchRect = (xa: number, xb: number, ya: number, yb: number) => {
    for (let y = ya + step; y < yb; y += step) glue.push(line([xa, y], [xb, y]));
  };
  hatchRect(Xr, X1, ytf, Y1);   // left-top
  hatchRect(Xr, X1, Y2, ybf);   // left-bottom
  hatchRect(X2, X3, ytf, Y1);   // right-top
  hatchRect(X2, X3, Y2, ybf);   // right-bottom

  // ---- BLEED contour ----
  const bleedBox: Polyline = bleedFromCut(cutPolyline, bleed);

  // ---- Dimensions ----
  const dims: DimLine[] = [
    { x1: X1, y1: Y1 + W / 2, x2: X2, y2: Y1 + W / 2, key: "L" },
    { x1: X1 + L / 2, y1: Y1, x2: X1 + L / 2, y2: Y2, key: "W", vertical: true },
    { x1: X4 + bleed + mmToPt(8), y1: Y0, x2: X4 + bleed + mmToPt(8), y2: Y1, key: "H", vertical: true },
  ];

  const labels: DieLabel[] = [];

  return {
    paths: { cut: [cutPolyline], crease, bleed: [bleedBox], glue },
    widthPt: X4,
    heightPt: Y4,
    bleedPt: bleed,
    labels,
    dims,
    // The base rect — the Fold Engine roots the fold tree here.
    panels: { base: { x: X1, y: Y1, w: L, h: W } },
  };
}
