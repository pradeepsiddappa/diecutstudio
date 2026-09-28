// Tuck-Top Snap-Lock Bottom carton — ECMA A60 / "1-2-3 bottom" / Himes lock.
//
// The GLUE-FREE retail sibling of the Tuck-Top Auto-Bottom (A65). Same straight
// tuck top (friction lock + thumb notch), but the bottom is a MECHANICAL
// snap-lock instead of a pre-glued crash-lock: the packer folds the four bottom
// flaps in a 1-2-3 sequence and the last (front) flap's lock-tab snaps the floor
// shut — no glue needed on the bottom (only the side seam is glued). This makes
// converting cheaper (one glue line) and lets the box be shipped flat and locked
// up by hand on the pack line.
//
// Flat layout, left to right:
//   [glue seam] [Back: L] [Side: W] [Front: L] [Side: W]
// Each wall is H tall.
//
//   TOP (straight tuck, identical to A65):
//     Back  = tuck panel (depth W) + tuck-in tongue (chamfered)
//     Sides = dust flaps (chamfered outer corners)
//     Front = thumb-notch opening
//
//   BOTTOM (snap-lock / 1-2-3):
//     Back (L panel)  = MAJOR flap, depth W/2 — plain; folds in first, the lock
//                       tab tucks UNDER its free edge.
//     Sides (W panels)= MINOR flaps, depth L/2 — each with a 45° CLIP on its
//                       front-facing inner corner; the clips form the catch the
//                       front tab's shoulders snap into.
//     Front (L panel) = MAJOR flap, depth W/2, with a central LOCK TAB that
//                       projects `tabLen` past the floor centre. Folded in last,
//                       the tab tucks under the back flap and its shoulders catch
//                       the two side-flap clips → snaps locked.
//   The hold is mechanical (tab-under-back-flap + shoulder hooks on the clips);
//   there is NO bottom glue and NO reverse-score diagonal (unlike the A65
//   crash-lock).
//
// All math in POINTS (1 in = 72 pt). Origin top-left, y increases downward.
// The thumb-notch is a true semicircle flattened to points via arcPoints.
//
// Geometry derived from public packaging-engineering references (the 1-2-3 /
// snap-lock / Himes-lock bottom, Paperboard Packaging Handbook, FEFCO/ECMA
// codes). The top reuses our own STE detail formulas. NOT imported from any
// proprietary file.
//
// Changing L, W, H independently reshapes the dieline:
//   L → back/front panel width, MINOR flap depth (L/2), notch + tab position
//   W → side panel width, tuck panel depth, MAJOR flap depth (W/2), tab reach
//   H → body (wall) height only

import { Dieline, DieLabel, DimLine, Polyline } from "../types";
import { arcPoints, Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";

export interface SnapLockBottomParams {
  L: number;            // length — back/front panel width (pt)
  W: number;            // depth — side panel width (pt)
  H: number;            // body / wall height (pt)
  thickness: number;    // material caliper (pt)
  bleed: number;        // bleed margin (pt)
  glueFlap: number;     // seam glue flap width (pt)
  tongue: number;       // top tuck-in tongue depth (pt)
  dust: number;         // top dust flap reach (pt)
  majorDepth: number;   // back/front bottom flap depth (= W/2, reaches centre)
  minorDepth: number;   // side bottom flap depth (= L/2)
  tabW: number;         // front lock-tab width (pt)
  tabLen: number;       // how far the lock-tab projects past the floor centre (pt)
  clip: number;         // 45° clip on the side flaps' front-facing corners (pt)
  relief: number;       // slit gap between adjacent bottom flaps (pt)
  topNotch: boolean;    // thumb notch on the front top edge (default on)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): SnapLockBottomParams {
  const notchR = Math.min(inToPt(0.4), L * 0.18);
  const tongue = Math.max(Math.min(W * 0.55, inToPt(0.7)), notchR + inToPt(0.15));
  const majorDepth = W / 2;
  const minorDepth = L / 2;
  return {
    L, W, H, thickness,
    bleed: inToPt(0.125),
    glueFlap: clamp(W * 0.5, mmToPt(10), mmToPt(20)),
    tongue,
    dust: Math.min(W * 0.85, L * 0.45),
    majorDepth,
    minorDepth,
    tabW: clamp(L * 0.4, mmToPt(18), L * 0.7),
    tabLen: Math.min(W * 0.22, mmToPt(14)),
    clip: Math.min(minorDepth * 0.35, majorDepth * 0.7),
    relief: Math.max(thickness, mmToPt(0.8)),
    topNotch: true,
  };
}

// Derived top detail sizes — mirrors tuckEndDetails() so the flat die and the
// 3D fold can't drift. Kept local so the model is self-contained.
function detail(p: SnapLockBottomParams) {
  const { L, tongue, dust, H, W } = p;
  return {
    tc: Math.min(tongue * 0.7, L * 0.25), // tongue corner chamfer
    dc: Math.min(dust * 0.5, W * 0.25),   // dust-flap corner chamfer
    gt: Math.min(H * 0.1, inToPt(0.2)),   // glue-flap taper
    rN: Math.min(inToPt(0.4), L * 0.18),  // thumb-notch radius
  };
}

const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

export function buildSnapLockBottom(p: SnapLockBottomParams): Dieline {
  const {
    L, W, H, bleed, glueFlap, tongue, dust,
    majorDepth: dMaj, minorDepth: dMin, tabW, tabLen, clip, relief, topNotch,
  } = p;
  const { tc, dc, gt, rN } = detail(p);
  const g2 = relief / 2;

  // ---- x boundaries ----
  const x_g0 = 0;
  const x_b0 = glueFlap;        // glue / back
  const x_b1 = x_b0 + L;         // back / side1
  const x_s1 = x_b1 + W;         // side1 / front
  const x_f1 = x_s1 + L;         // front / side2
  const x_s2 = x_f1 + W;         // outer right edge

  // ---- y levels ----
  const tuckH = W;
  const topRegion = tuckH + tongue;
  const TB = topRegion;          // body top
  const BB = TB + H;             // body bottom
  const tuckTop = TB - tuckH;
  const tongueTop = TB - tuckH - tongue; // = 0
  const dustTop = TB - dust;
  const botMax = BB + Math.max(dMin, dMaj + tabLen);

  // thumb notch on the front top edge; lock tab centred on the front panel
  const notchCx = x_s1 + L / 2;
  const nL = notchCx - rN;
  const tabL = notchCx - tabW / 2;
  const tabR = notchCx + tabW / 2;

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

  // FRONT TOP EDGE — thumb notch, toggleable
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

  // ---- BOTTOM snap-lock flaps (right → left), separated by relief slits ----
  // SIDE2 minor flap [x_f1+g2 .. x_s2] — 45° clip on its front-facing (left) corner
  P(x_s2, BB + dMin);
  P(x_f1 + g2 + clip, BB + dMin);
  P(x_f1 + g2, BB + dMin - clip);   // diagonal up-left (the catch)
  P(x_f1 + g2, BB);

  // FRONT major flap [x_s1+g2 .. x_f1-g2] with central projecting LOCK TAB
  P(x_f1 - g2, BB);
  P(x_f1 - g2, BB + dMaj);          // down the right shoulder
  P(tabR, BB + dMaj);               // across to the tab's right shoulder
  P(tabR, BB + dMaj + tabLen);      // down the tab right side
  P(tabL, BB + dMaj + tabLen);      // across the tab tip
  P(tabL, BB + dMaj);               // up the tab left side
  P(x_s1 + g2, BB + dMaj);          // across to the left shoulder
  P(x_s1 + g2, BB);

  // SIDE1 minor flap [x_b1+g2 .. x_s1-g2] — 45° clip on its front-facing (right) corner
  P(x_s1 - g2, BB);
  P(x_s1 - g2, BB + dMin - clip);
  P(x_s1 - g2 - clip, BB + dMin);   // diagonal down-left (the catch)
  P(x_b1 + g2, BB + dMin);
  P(x_b1 + g2, BB);

  // BACK major flap [x_b0 .. x_b1-g2] — plain (the tab tucks under it)
  P(x_b1 - g2, BB);
  P(x_b1 - g2, BB + dMaj);
  P(x_b0, BB + dMaj);
  P(x_b0, BB);

  // Seam glue flap bottom taper + left edge up
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

  // Tongue fold
  crease.push(line([x_b0, tuckTop], [x_b1, tuckTop], "tongue-top"));

  // Bottom flap hinges — one per flap (no reverse-score diagonals: it's a
  // mechanical snap-lock, not a glued crash-lock).
  crease.push(line([x_b0, BB], [x_b1 - g2, BB], "back-bottom"));        // back (major)
  crease.push(line([x_b1 + g2, BB], [x_s1 - g2, BB], "side1-bottom"));   // side1 (minor)
  crease.push(line([x_s1 + g2, BB], [x_f1 - g2, BB], "front-bottom"));   // front (major)
  crease.push(line([x_f1 + g2, BB], [x_s2, BB], "side2-bottom"));        // side2 (minor)

  // ---- GLUE areas (visual hint, hatched) — SEAM ONLY (bottom is glue-free) ----
  const glue: Polyline[] = [];
  const step = inToPt(0.12);
  for (let c = -(BB - TB); c < x_b0 - x_g0; c += step) {
    const xs = Math.max(x_g0, x_g0 + c);
    const ys = TB + (xs - x_g0 - c);
    const xe = Math.min(x_b0, x_g0 + c + (BB - TB));
    const ye = TB + (xe - x_g0 - c);
    if (xe > xs) glue.push(line([xs, ys], [xe, ye]));
  }

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
    panels: {
      front: { x: x_s1, y: TB + rN, w: L, h: H - rN },
      back: { x: x_b0, y: TB, w: L, h: H },
    },
  };
}
