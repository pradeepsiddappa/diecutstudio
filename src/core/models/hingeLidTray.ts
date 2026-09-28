// Hinged-Lid Tray — one-piece tray with an attached flip lid (ECMA C30).
//
// A four-corner glued base tray (the open-tray base) with a LID hinged off the
// top edge of the BACK wall. The lid folds forward over the tray and a tuck-in
// flap on the lid's leading edge tucks down inside the FRONT wall to hold it
// closed. One piece, re-closeable — chocolate / confectionery boxes, phone-case
// boxes, small gift trays.
//
// Flat layout (a PLUS/CROSS with the lid extended above the back wall):
//
//                  [ lid tuck flap   L×tuckD ]
//                  [ lid panel       L×W     ]
//   [Ltf]          [ back wall       L×H     ]          [Rtf]
//   [L end wall W×H] [    BASE  L×W   ] [R end wall W×H]
//   [Lbf]          [ front wall      L×H     ]          [Rbf]
//
//   • BASE = open-tray base: floor + 4 walls; the two END walls (left/right,
//     width W) each carry two corner glue flaps that wrap 90° and bond to the
//     inner face of the front/back walls — the rigid four-corner tray.
//   • The BACK wall (length L) extends up into the LID PANEL (L×W) + a LID TUCK
//     FLAP (depth tuckD, chamfered corners) that tucks inside the front wall.
//   • The FRONT wall (length L) is plain.
//
// The base HOLDS as a glued tray; the lid HOLDS closed by the friction tuck. All
// math in POINTS (1 in = 72 pt). Origin top-left, y increases downward.
// Geometry derived from public references (ECMA C30 hinged-lid tray + the C10
// four-corner tray). No proprietary file imported.
//
// Dims:
//   L → base length, all length-L walls, lid + tuck width
//   W → base width, end-wall width, lid panel depth
//   H → wall height (all four walls) + corner-flap height

import { Dieline, DieLabel, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";

export interface HingeLidTrayParams {
  L: number;          // base length (pt)
  W: number;          // base width / depth (pt)
  H: number;          // wall height (pt)
  thickness: number;  // material caliper (pt)
  bleed: number;      // bleed margin (pt)
  relief: number;     // corner slit / rim relief gap (pt)
  flapDepth: number;  // corner glue-flap wrap depth (pt)
  chamfer: number;    // "drag" chamfer on the corner flaps (pt)
  tuckD: number;      // lid tuck-in flap depth (pt)
  tuckChamfer: number;// chamfer on the lid tuck flap's leading corners (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): HingeLidTrayParams {
  const relief = Math.max(thickness, mmToPt(1));
  const flapDepth = clamp(H * 0.8, mmToPt(5), L / 2 - relief);
  const tuckD = clamp(H * 0.7, mmToPt(8), H - relief); // tucks inside the front wall (≤ H)
  return {
    L, W, H, thickness,
    bleed: inToPt(0.125),
    relief,
    flapDepth,
    chamfer: Math.min(flapDepth * 0.4, mmToPt(6)),
    tuckD,
    tuckChamfer: Math.min(tuckD * 0.5, L * 0.1),
  };
}

const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

export function buildHingeLidTray(p: HingeLidTrayParams): Dieline {
  const { L, W, H, bleed, relief: r, flapDepth: fd, chamfer: c, tuckD, tuckChamfer: tc } = p;

  const S = tuckD + W; // vertical room above the back wall for the lid + tuck flap

  // ---- x boundaries (same cross as the open tray) ----
  const X0 = 0;
  const Xr = r;
  const X1 = H;            // base left edge
  const X2 = H + L;        // base right edge
  const X3 = 2 * H + L - r;
  const X4 = 2 * H + L;    // outer right edge

  // ---- y boundaries (open-tray cross shifted down by S; lid sits in [0, S]) ----
  const yTuck0 = 0;        // lid tuck flap top
  const yLid0 = tuckD;     // lid panel top (tuck ↔ lid fold)
  const Y0 = S;            // back wall top (lid hinge)
  const Y1 = S + H;        // base top (back ↔ base fold)
  const Y2 = S + H + W;    // base bottom (base ↔ front fold)
  const Y4 = S + 2 * H + W;// front wall outer edge
  const ytf = Y1 - fd;     // top corner flaps' far edge
  const ybf = Y2 + fd;     // bottom corner flaps' far edge

  // ---- CUT outline: one closed polyline, clockwise ----
  const pts: Pt[] = [];
  const P = (x: number, y: number) => pts.push([x, y]);

  // Lid tuck flap top edge (chamfered leading corners)
  P(X1 + tc, yTuck0);
  P(X2 - tc, yTuck0);
  P(X2, yLid0);                          // chamfer down to the lid
  // lid panel + back wall right edge down to the base top-right corner
  P(X2, Y1);
  // right-top corner flap
  P(X2, ytf); P(X3 - c, ytf); P(X3, ytf + c); P(X3, Y1);
  P(X4, Y1); P(X4, Y2);                  // relief strip + right end-wall rim
  // right-bottom corner flap
  P(X3, Y2); P(X3, ybf - c); P(X3 - c, ybf); P(X2, ybf); P(X2, Y2);
  // front wall (bottom side wall)
  P(X2, Y4); P(X1, Y4); P(X1, Y2);
  // left-bottom corner flap
  P(X1, ybf); P(Xr + c, ybf); P(Xr, ybf - c); P(Xr, Y2);
  P(X0, Y2); P(X0, Y1);                  // relief strip + left end-wall rim
  // left-top corner flap
  P(Xr, Y1); P(Xr, ytf + c); P(Xr + c, ytf); P(X1, ytf); P(X1, Y1);
  // back wall + lid left edge up to the tuck flap (chamfer closes to start)
  P(X1, yLid0);

  const cutPolyline: Polyline = { pts, closed: true };

  // ---- CREASE lines (10) ----
  const crease: Polyline[] = [
    // base ↔ four walls
    line([X1, Y1], [X2, Y1], "base-back"),  // base → back wall
    line([X1, Y2], [X2, Y2], "base-front"), // base → front wall
    line([X1, Y1], [X1, Y2], "base-end1"),  // base → left end wall
    line([X2, Y1], [X2, Y2], "base-end2"),  // base → right end wall
    // end walls ↔ corner flaps
    line([Xr, Y1], [X1, Y1], "end1-flap1"), // left end wall → top flap
    line([Xr, Y2], [X1, Y2], "end1-flap2"), // left end wall → bottom flap
    line([X2, Y1], [X3, Y1], "end2-flap1"), // right end wall → top flap
    line([X2, Y2], [X3, Y2], "end2-flap2"), // right end wall → bottom flap
    // lid folds
    line([X1, Y0], [X2, Y0], "back-lid"),     // back wall → lid (the hinge)
    line([X1, yLid0], [X2, yLid0], "lid-tuck"), // lid → tuck flap
  ];

  // ---- GLUE hatch on the 4 corner flaps (the base tray glue; lid is friction) ----
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
