// Tuck-Top Auto-Bottom carton — ECMA A65 / FEFCO 0215 (tuck-top variant).
//
// The high-volume retail pairing: a STRAIGHT TUCK TOP (friction closure) over a
// glued CRASH-LOCK auto-bottom that springs into a locked floor the instant the
// flattened carton is squared up. "Open and go" for the packer, re-closeable for
// the shopper.
//
// This is the SIBLING of our `auto-bottom` model (autoBottom.ts), which pairs a
// REVERSE tuck top (a rounded flap, no tongue ≈ ECMA A67) with the same bottom.
// The difference is the TOP closure:
//   A65 (this file): a full tuck panel (depth W) + a tuck-IN TONGUE that folds
//        down past the panel and tucks inside the front wall (the STE top), plus
//        a thumb-notch on the front for opening. Two-stage friction lock.
//   A67 (autoBottom.ts): a single rounded reverse-tuck flap, no tongue.
//
// Flat layout, left to right:
//   [glue seam] [Back: L] [Side: W] [Front: L] [Side: W]
// Each wall is H tall.
//
//   TOP (straight tuck, like our STE):
//     Back  = tuck panel (depth W) + tuck-in tongue (chamfered)
//     Sides = dust flaps (chamfered outer corners)
//     Front = thumb-notch opening (half-moon, dips into the panel)
//
//   BOTTOM (crash-lock auto-bottom — identical mechanism to autoBottom.ts):
//     Back + Front (the L panels) = MAJOR flaps, depth W/2, each carrying a 45°
//       diagonal reverse-score crease that cuts off a right-isosceles glue
//       triangle (leg = W/2) at diagonally-opposite corners.
//     Sides (the W panels) = MINOR flaps, depth L/2, that receive the triangles.
//   Squaring the tube rotates the bonded triangles → the floor snaps shut.
//
// All math in POINTS (1 in = 72 pt). Origin top-left, y increases downward.
// The thumb-notch is a true semicircle flattened to points via arcPoints.
//
// Geometry derived from public packaging-engineering references (FEFCO 0215 /
// ECMA A65, Paperboard Packaging Handbook). The top reuses our own STE detail
// formulas; the bottom reuses our own auto-bottom formulas. NOT imported from
// any proprietary file.
//
// Changing L, W, H independently reshapes the dieline:
//   L → back/front panel width, MINOR flap depth (L/2), notch position
//   W → side panel width, tuck panel depth, MAJOR flap depth + lock triangle (W/2)
//   H → body (wall) height only

import { Dieline, DieLabel, DimLine, Polyline } from "../types";
import { arcPoints, Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";

export interface TuckTopAutoBottomParams {
  L: number;            // length — back/front panel width (pt)
  W: number;            // depth — side panel width (pt)
  H: number;            // body / wall height (pt)
  thickness: number;    // material caliper (pt)
  bleed: number;        // bleed margin (pt)
  glueFlap: number;     // seam glue flap width (pt)
  tongue: number;       // top tuck-in tongue depth (pt)
  dust: number;         // top dust flap reach (pt)
  majorDepth: number;   // back/front bottom flap depth — also the lock-triangle leg (pt)
  minorDepth: number;   // side bottom flap depth (pt)
  relief: number;       // slit gap between adjacent bottom flaps (pt)
  topNotch: boolean;    // thumb notch on the front top edge (default on)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): TuckTopAutoBottomParams {
  // Notch radius — must match the rN formula in detail() below.
  const notchR = Math.min(inToPt(0.4), L * 0.18);
  // Tongue depth: natural size, but never shorter than the thumb-notch so the
  // tongue fully backs the semicircle (+ clearance) when tucked in (STE rule).
  const tongue = Math.max(Math.min(W * 0.55, inToPt(0.7)), notchR + inToPt(0.15));
  return {
    L, W, H, thickness,
    bleed: inToPt(0.125),
    glueFlap: clamp(W * 0.5, mmToPt(10), mmToPt(20)),
    tongue,
    dust: Math.min(W * 0.85, L * 0.45),
    majorDepth: W / 2,      // reaches the short centerline; = the 45° triangle leg
    minorDepth: L / 2,      // reaches the long centerline
    relief: Math.max(thickness, mmToPt(0.8)), // a thin but visible knife slit
    topNotch: true,
  };
}

// Derived flap detail sizes — mirrors tuckEndDetails() (top) so the flat die and
// the 3D fold can't drift. Kept local so the model is self-contained.
function detail(p: TuckTopAutoBottomParams) {
  const { L, tongue, dust, H } = p;
  return {
    tc: Math.min(tongue * 0.7, L * 0.25), // tongue corner chamfer
    dc: Math.min(dust * 0.5, p.W * 0.25), // dust-flap corner chamfer
    gt: Math.min(H * 0.1, inToPt(0.2)),   // glue-flap taper
    rN: Math.min(inToPt(0.4), L * 0.18),  // thumb-notch radius
  };
}

const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

export function buildTuckTopAutoBottom(p: TuckTopAutoBottomParams): Dieline {
  const {
    L, W, H, bleed, glueFlap, tongue, dust,
    majorDepth: majD, minorDepth: minD, relief, topNotch,
  } = p;
  const { tc, dc, gt, rN } = detail(p);
  const g2 = relief / 2; // half-slit each bottom flap pulls back from a junction

  // ---- x boundaries ----
  const x_g0 = 0;
  const x_b0 = glueFlap;        // glue / back
  const x_b1 = x_b0 + L;         // back / side1
  const x_s1 = x_b1 + W;         // side1 / front
  const x_f1 = x_s1 + L;         // front / side2
  const x_s2 = x_f1 + W;         // outer right edge

  // ---- y levels ----
  const tuckH = W;               // tuck panel covers the full depth
  const topRegion = tuckH + tongue;
  const TB = topRegion;          // body top
  const BB = TB + H;             // body bottom
  const tuckTop = TB - tuckH;
  const tongueTop = TB - tuckH - tongue; // = 0
  const dustTop = TB - dust;
  const botMax = BB + Math.max(majD, minD);

  // thumb notch on the front top edge
  const notchCx = x_s1 + L / 2;
  const nL = notchCx - rN;

  // ---- CUT outline: one closed polyline walked clockwise ----
  const cut: Pt[] = [];
  const P = (x: number, y: number) => cut.push([x, y]);

  // Seam glue flap top taper
  P(x_g0, TB + gt);
  P(gt, TB);
  P(x_b0, TB);

  // BACK TUCK PANEL + TONGUE (top)
  P(x_b0, tuckTop);
  P(x_b0 + tc, tongueTop);
  P(x_b1 - tc, tongueTop);
  P(x_b1, tuckTop);
  P(x_b1, TB);

  // SIDE1 DUST FLAP (top)
  P(x_b1, dustTop + dc);
  P(x_b1 + dc, dustTop);
  P(x_s1 - dc, dustTop);
  P(x_s1, dustTop + dc);
  P(x_s1, TB);

  // FRONT TOP EDGE — thumb notch (dips down into the panel), toggleable
  if (topNotch) {
    P(nL, TB);
    for (const pt of arcPoints(notchCx, TB, rN, Math.PI, 0)) cut.push(pt);
  }
  P(x_f1, TB);

  // SIDE2 DUST FLAP (top)
  P(x_f1, dustTop + dc);
  P(x_f1 + dc, dustTop);
  P(x_s2 - dc, dustTop);
  P(x_s2, dustTop + dc);
  P(x_s2, TB);

  // Right edge down to the bottom hinge
  P(x_s2, BB);

  // ---- BOTTOM auto-lock flaps (right → left), separated by relief slits ----
  // SIDE2 flap (minor) [x_f1+g2 .. x_s2]
  P(x_s2, BB + minD);
  P(x_f1 + g2, BB + minD);
  P(x_f1 + g2, BB);
  // FRONT flap (major) [x_s1+g2 .. x_f1-g2]
  P(x_f1 - g2, BB);
  P(x_f1 - g2, BB + majD);
  P(x_s1 + g2, BB + majD);
  P(x_s1 + g2, BB);
  // SIDE1 flap (minor) [x_b1+g2 .. x_s1-g2]
  P(x_s1 - g2, BB);
  P(x_s1 - g2, BB + minD);
  P(x_b1 + g2, BB + minD);
  P(x_b1 + g2, BB);
  // BACK flap (major) [x_b0 .. x_b1-g2]
  P(x_b1 - g2, BB);
  P(x_b1 - g2, BB + majD);
  P(x_b0, BB + majD);
  P(x_b0, BB);

  // Seam glue flap bottom taper + left edge up (closed back to start)
  P(gt, BB);
  P(x_g0, BB - gt);

  const cutPolyline: Polyline = { pts: cut, closed: true };

  // ---- CREASE (fold) lines ----
  const crease: Polyline[] = [];

  // Vertical wall folds (body height only)
  const vIds = ["glue-back", "back-side1", "side1-front", "front-side2"];
  [x_b0, x_b1, x_s1, x_f1].forEach((x, i) => crease.push(line([x, TB], [x, BB], vIds[i])));

  // Top flap hinges — over panels that HAVE a top flap (front top is the notch)
  crease.push(line([x_b0, TB], [x_b1, TB], "back-top")); // back tuck
  crease.push(line([x_b1, TB], [x_s1, TB], "side1-top")); // side1 dust
  crease.push(line([x_f1, TB], [x_s2, TB], "side2-top")); // side2 dust

  // Tongue fold (tuck panel -> tongue)
  crease.push(line([x_b0, tuckTop], [x_b1, tuckTop], "tongue-top"));

  // Bottom flap hinges — one per flap
  crease.push(line([x_b0, BB], [x_b1 - g2, BB], "back-bottom"));        // back (major)
  crease.push(line([x_b1 + g2, BB], [x_s1 - g2, BB], "side1-bottom"));   // side1 (minor)
  crease.push(line([x_s1 + g2, BB], [x_f1 - g2, BB], "front-bottom"));   // front (major)
  crease.push(line([x_f1 + g2, BB], [x_s2, BB], "side2-bottom"));        // side2 (minor)

  // Crash-lock diagonals (reverse-score) on the two MAJOR flaps — the spring.
  // 45° right-isosceles, leg = majD, diagonally opposite (back→side1, front→side2).
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
  const hatchLockTri = (xR: number) => {
    for (let dy = step; dy < majD; dy += step) {
      glue.push(line([xR - dy, BB + dy], [xR, BB + dy]));
    }
  };
  hatchLockTri(x_b1 - g2); // back lock triangle
  hatchLockTri(x_f1 - g2); // front lock triangle

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
    // Panel rects for Phase 3 overlays. Front is inset top by the thumb-notch
    // radius so a window cut clears the notch; back carries the tuck top, full
    // height available for a Euro hang slot anchored to its top edge.
    panels: {
      front: { x: x_s1, y: TB + rN, w: L, h: H - rN },
      back: { x: x_b0, y: TB, w: L, h: H },
    },
  };
}
