// Auto-Bottom / Crash-Lock carton — ECMA B40 / FEFCO 0215.
//
// A glued tube whose BOTTOM is pre-glued so it springs into a locked floor the
// instant the flattened carton is squared up — "open and go" for retail packers.
// The TOP is a reverse-tuck closure (the dominant retail pairing, the
// "Tuck-Top Auto-Bottom"). So a B40 here = [reverse-tuck top] + [4-wall tube] +
// [crash-lock bottom].
//
// Flat layout, left to right:
//   [glue seam] [Back: L] [Side: W] [Front: L] [Side: W]
// Each wall is H tall.
//
//   TOP (reverse tuck, like our RTE):
//     Back  = tuck flap (rounded top corners + base shoulder chamfers)
//     Sides = dust flaps (chamfered outer corners)
//     Front = OPEN edge (the box opens at the top-front)
//
//   BOTTOM (crash-lock auto-bottom):
//     Back + Front (the L panels) = MAJOR flaps, depth W/2, each carrying a
//       45° diagonal reverse-score crease that cuts off a right-isosceles glue
//       triangle (leg = W/2). The two triangles sit at diagonally-opposite
//       corners and are pre-glued onto the adjacent side flaps.
//     Sides (the W panels) = MINOR flaps, depth L/2, that receive the glued
//       triangles and tuck under.
//   Squaring the tube rotates the bonded triangles → the floor snaps shut.
//
// All math in POINTS (1 in = 72 pt). Origin top-left, y increases downward.
// Rounded tuck corners are real quadratic beziers (Polyline.curves).
//
// Geometry derived from public packaging-engineering references (FEFCO 0215 /
// ECMA B40, Paperboard Packaging Handbook, US 6,386,437 auto-bottom patent
// mechanism). NOT imported from any proprietary file.
//
// Changing L, W, H independently reshapes the dieline:
//   L → back/front panel width, MINOR flap depth (L/2)
//   W → side panel width, top flap depths, MAJOR flap depth + lock triangle (W/2)
//   H → body (wall) height only

import { Dieline, DieLabel, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";

export interface AutoBottomParams {
  L: number;            // length — back/front panel width (pt)
  W: number;            // depth — side panel width (pt)
  H: number;            // body / wall height (pt)
  thickness: number;    // material caliper (pt)
  bleed: number;        // bleed margin (pt)
  glueFlap: number;     // seam glue flap width (pt)
  tuckH: number;        // top tuck flap depth (pt)
  dustH: number;        // top dust flap depth (pt)
  shoulderCut: number;  // base chamfer of the top tuck flap (pt)
  tuckCornerR: number;  // rounded radius at top tuck corners (pt)
  dustCornerR: number;  // chamfer at dust flap outer corners (pt)
  glueTaper: number;    // taper on the seam glue flap top/bottom (pt)
  majorDepth: number;   // back/front bottom flap depth — also the lock-triangle leg (pt)
  minorDepth: number;   // side bottom flap depth (pt)
  relief: number;       // slit gap between adjacent bottom flaps (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): AutoBottomParams {
  return {
    L, W, H, thickness,
    bleed: inToPt(0.125),
    glueFlap: clamp(W * 0.5, mmToPt(10), mmToPt(20)),
    tuckH: W * 0.85,
    dustH: W - mmToPt(2),
    shoulderCut: Math.min(W * 0.3, mmToPt(8)),
    tuckCornerR: Math.min(W * 0.4, mmToPt(12)),
    dustCornerR: Math.min(W * 0.25, mmToPt(4)),
    glueTaper: Math.min(H * 0.1, inToPt(0.2)),
    majorDepth: W / 2,      // reaches the short centerline; = the 45° triangle leg
    minorDepth: L / 2,      // reaches the long centerline
    relief: Math.max(thickness, mmToPt(0.8)), // a thin but visible knife slit
  };
}

const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

export function buildAutoBottom(p: AutoBottomParams): Dieline {
  const {
    L, W, H, bleed, glueFlap, tuckH, dustH,
    shoulderCut: sc, tuckCornerR: tR, dustCornerR: dR, glueTaper: gt,
    majorDepth: majD, minorDepth: minD, relief,
  } = p;
  const g2 = relief / 2; // half-slit each flap pulls back from a shared junction

  // ---- x boundaries ----
  const x_g0 = 0;
  const x_b0 = glueFlap;        // glue / back
  const x_b1 = x_b0 + L;         // back / side1
  const x_s1 = x_b1 + W;         // side1 / front
  const x_f1 = x_s1 + L;         // front / side2
  const x_s2 = x_f1 + W;         // outer right edge

  // ---- y levels ----
  const TB = tuckH;              // body top (top tuck flap fills 0..TB on the back)
  const BB = TB + H;             // body bottom (bottom flaps hang below)
  const tuckTop = TB - tuckH;    // = 0
  const dustTop = TB - dustH;
  const botMax = BB + Math.max(majD, minD);

  // ---- CUT outline: one closed polyline walked clockwise ----
  const pts: Pt[] = [];
  const curves: (Pt | null)[] = [];
  const lin = (pt: Pt) => { pts.push(pt); if (pts.length > 1) curves.push(null); };
  const quad = (pt: Pt, ctrl: Pt) => { pts.push(pt); curves.push(ctrl); };

  // Seam glue flap top taper
  lin([x_g0, TB + gt]);
  lin([gt, TB]);
  lin([x_b0, TB]);

  // BACK TUCK FLAP (top) — shoulder chamfer → rounded top corners → shoulder
  lin([x_b0 + sc, TB - sc]);
  lin([x_b0 + sc, tuckTop + tR]);
  quad([x_b0 + sc + tR, tuckTop], [x_b0 + sc, tuckTop]);
  lin([x_b1 - sc - tR, tuckTop]);
  quad([x_b1 - sc, tuckTop + tR], [x_b1 - sc, tuckTop]);
  lin([x_b1 - sc, TB - sc]);
  lin([x_b1, TB]);

  // SIDE1 DUST FLAP (top)
  lin([x_b1, dustTop + dR]);
  lin([x_b1 + dR, dustTop]);
  lin([x_s1 - dR, dustTop]);
  lin([x_s1, dustTop + dR]);
  lin([x_s1, TB]);

  // FRONT TOP — open edge
  lin([x_f1, TB]);

  // SIDE2 DUST FLAP (top)
  lin([x_f1, dustTop + dR]);
  lin([x_f1 + dR, dustTop]);
  lin([x_s2 - dR, dustTop]);
  lin([x_s2, dustTop + dR]);
  lin([x_s2, TB]);

  // Right edge down to the bottom hinge
  lin([x_s2, BB]);

  // ---- BOTTOM auto-lock flaps (right → left), separated by relief slits ----
  // Each flap is a rectangle in the CUT outline; the crash-lock diagonals on the
  // two MAJOR flaps are internal creases (added below), not cut edges.

  // SIDE2 flap (minor) [x_f1+g2 .. x_s2], right edge x_s2 is the free seam edge
  lin([x_s2, BB + minD]);
  lin([x_f1 + g2, BB + minD]);
  lin([x_f1 + g2, BB]);

  // FRONT flap (major) [x_s1+g2 .. x_f1-g2]
  lin([x_f1 - g2, BB]);
  lin([x_f1 - g2, BB + majD]);
  lin([x_s1 + g2, BB + majD]);
  lin([x_s1 + g2, BB]);

  // SIDE1 flap (minor) [x_b1+g2 .. x_s1-g2]
  lin([x_s1 - g2, BB]);
  lin([x_s1 - g2, BB + minD]);
  lin([x_b1 + g2, BB + minD]);
  lin([x_b1 + g2, BB]);

  // BACK flap (major) [x_b0 .. x_b1-g2], left edge x_b0 free (glue flap stops at BB)
  lin([x_b1 - g2, BB]);
  lin([x_b1 - g2, BB + majD]);
  lin([x_b0, BB + majD]);
  lin([x_b0, BB]);

  // Seam glue flap bottom taper + left edge up (closed back to start)
  lin([gt, BB]);
  lin([x_g0, BB - gt]);

  const cutPolyline: Polyline = { pts, curves, closed: true };

  // ---- CREASE (fold) lines ----
  const crease: Polyline[] = [];

  // Vertical wall folds (body height only)
  const vIds = ["glue-back", "back-side1", "side1-front", "front-side2"];
  [x_b0, x_b1, x_s1, x_f1].forEach((x, i) => crease.push(line([x, TB], [x, BB], vIds[i])));

  // Top flap hinges — over panels that HAVE a top flap (front top is open)
  crease.push(line([x_b0, TB], [x_b1, TB], "back-top")); // back tuck
  crease.push(line([x_b1, TB], [x_s1, TB], "side1-top")); // side1 dust
  crease.push(line([x_f1, TB], [x_s2, TB], "side2-top")); // side2 dust

  // Bottom flap hinges — one per flap
  crease.push(line([x_b0, BB], [x_b1 - g2, BB], "back-bottom"));        // back (major)
  crease.push(line([x_b1 + g2, BB], [x_s1 - g2, BB], "side1-bottom"));   // side1 (minor)
  crease.push(line([x_s1 + g2, BB], [x_f1 - g2, BB], "front-bottom"));   // front (major)
  crease.push(line([x_f1 + g2, BB], [x_s2, BB], "side2-bottom"));        // side2 (minor)

  // Crash-lock diagonals (reverse-score) on the two MAJOR flaps — the spring.
  // 45° right-isosceles, leg = majD, from the flap's right hinge corner down to
  // the floor centerline. Diagonally opposite (back→side1, front→side2).
  crease.push(line([x_b1 - g2, BB], [x_b1 - g2 - majD, BB + majD], "lock-back")); // back lock
  crease.push(line([x_f1 - g2, BB], [x_f1 - g2 - majD, BB + majD], "lock-front")); // front lock

  // ---- GLUE areas (visual hint, hatched) ----
  const glue: Polyline[] = [];
  const step = inToPt(0.12);

  // Seam glue flap [x_g0..x_b0] over the body height (diagonal hatch)
  for (let c = -(BB - TB); c < x_b0 - x_g0; c += step) {
    const xs = Math.max(x_g0, x_g0 + c);
    const ys = TB + (xs - x_g0 - c);
    const xe = Math.min(x_b0, x_g0 + c + (BB - TB));
    const ye = TB + (xe - x_g0 - c);
    if (xe > xs) glue.push(line([xs, ys], [xe, ye]));
  }

  // Lock triangles on the major flaps (horizontal hatch within each triangle).
  // Triangle = right-isosceles, vertical right edge at xR (BB→BB+majD),
  // hypotenuse from (xR,BB) to (xR-majD, BB+majD).
  const hatchLockTri = (xR: number) => {
    for (let dy = step; dy < majD; dy += step) {
      glue.push(line([xR - dy, BB + dy], [xR, BB + dy]));
    }
  };
  hatchLockTri(x_b1 - g2); // back lock triangle (right end of back flap)
  hatchLockTri(x_f1 - g2); // front lock triangle (right end of front flap)

  // ---- BLEED — true contour offset of the cut perimeter ----
  const bleedBox: Polyline = bleedFromCut(cutPolyline, bleed);

  // ---- Dimension annotations ----
  const midY = TB + H / 2;
  const dims: DimLine[] = [
    { x1: x_s1, y1: midY, x2: x_f1, y2: midY, key: "L" },
    { x1: x_b1, y1: midY, x2: x_s1, y2: midY, key: "W" },
    { x1: x_s2 + bleed + mmToPt(8), y1: TB, x2: x_s2 + bleed + mmToPt(8), y2: BB, key: "H", vertical: true },
  ];

  const labels: DieLabel[] = [];

  return {
    paths: { cut: [cutPolyline], crease, bleed: [bleedBox], glue },
    widthPt: x_s2,
    heightPt: botMax,
    bleedPt: bleed,
    labels,
    dims,
    // Panel rects (front/back body panels) — used by the Fold Engine for its
    // root point, and available for future feature overlays.
    panels: {
      front: { x: x_s1, y: TB, w: L, h: H },
      back: { x: x_b0, y: TB, w: L, h: H },
    },
  };
}
