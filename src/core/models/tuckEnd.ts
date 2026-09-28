// Straight Tuck End (STE) carton — the classic tuck box (e.g. a card deck box).
//
// Flat layout, left to right:
//   [glue flap] [Back panel: L] [Side: W] [Front panel: L] [Side: W]
// Each panel is H tall. Top & bottom of each end are closed by:
//   - a tuck panel + tuck-in tongue (on the Back panel)
//   - two dust flaps (on the Side panels)
//   - the Front panel carries a thumb-notch (the half-moon opening cut)
//
// All math is in POINTS. Origin top-left, y increases downward (SVG style).

import { Dieline, DieLabel, DimLine, Polyline } from "../types";
import { arcPoints, Pt, bleedFromCut } from "../geometry";
import { inToPt } from "../units";

export interface TuckEndParams {
  L: number; // length / front-panel width (pt)
  W: number; // width / depth — the side panel width (pt)
  H: number; // height (pt)
  thickness: number; // material caliper (pt) — used for tolerance allowances
  bleed: number; // bleed margin (pt)
  glue: number; // glue-flap width (pt)
  tongue: number; // tuck-in tongue depth (pt)
  dust: number; // dust-flap reach (pt)
  topNotch: boolean; // thumb notch on the front TOP edge (default on)
  bottomNotch: boolean; // thumb notch on the front BOTTOM edge (default on)
}

// Sensible defaults derived from the box dimensions, so a user only has to type
// L / W / H to get a valid die. All overridable from the UI.
export function defaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): TuckEndParams {
  // Notch radius — must match the rN formula in buildTuckEnd().
  const notchR = Math.min(inToPt(0.4), L * 0.18);
  // Tongue depth: the natural size, but never shorter than the thumb-notch, so
  // the tongue fully backs the semicircle (+ clearance) when tucked in.
  const tongue = Math.max(Math.min(W * 0.55, inToPt(0.7)), notchR + inToPt(0.15));
  return {
    L,
    W,
    H,
    thickness,
    bleed: inToPt(0.125),
    glue: Math.min(inToPt(0.5), W * 0.9),
    tongue,
    dust: Math.min(W * 0.85, L * 0.45),
    topNotch: true,
    bottomNotch: true,
  };
}

const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

// Derived flap detail sizes. The single source of truth for both the flat
// dieline (buildTuckEnd) and the 3D fold preview (Box3D), so they can't drift.
export function tuckEndDetails(p: TuckEndParams) {
  const { L, W, H, tongue, dust } = p;
  return {
    tuckH: W, // tuck panel depth
    dc: Math.min(dust * 0.5, W * 0.25), // dust-flap corner chamfer
    tc: Math.min(tongue * 0.7, L * 0.25), // tongue corner chamfer
    gt: Math.min(H * 0.1, inToPt(0.2)), // glue-flap taper
    rN: Math.min(inToPt(0.4), L * 0.18), // thumb-notch radius
  };
}

export function buildTuckEnd(p: TuckEndParams): Dieline {
  const { L, W, H, bleed, glue: g, tongue, dust, topNotch, bottomNotch } = p;

  const tuckH = W; // tuck panel covers the full depth
  const topRegion = tuckH + tongue; // tallest upward extent
  const TB = topRegion; // body top line
  const BB = TB + H; // body bottom line
  const bboxW = g + 2 * L + 2 * W;
  const bboxH = topRegion + H + topRegion;

  // vertical x boundaries
  const x_g0 = 0; // glue outer edge
  const x_b0 = g; // glue/back fold
  const x_b1 = g + L; // back/side1 fold
  const x_s1 = g + L + W; // side1/front fold
  const x_f1 = g + 2 * L + W; // front/side2 fold
  const x_s2 = g + 2 * L + 2 * W; // outer right edge

  // vertical y levels (top + bottom mirror)
  const tuckTop = TB - tuckH;
  const tongueTop = TB - tuckH - tongue;
  const dustTop = TB - dust;
  const tuckBot = BB + tuckH;
  const tongueBot = BB + tuckH + tongue;
  const dustBot = BB + dust;

  // chamfers / details — shared with the 3D preview (single source of truth)
  const { dc, tc, gt, rN } = tuckEndDetails(p);
  const notchCx = x_s1 + L / 2;
  const nL = notchCx - rN;
  const nR = notchCx + rN;

  // ---- CUT outline: one closed polyline, walked clockwise ----
  const cut: Pt[] = [];
  const P = (x: number, y: number) => cut.push([x, y]);
  // glue taper + top edge
  P(x_g0, TB + gt);
  P(gt, TB);
  P(x_b0, TB);
  // back tuck panel + tongue
  P(x_b0, tuckTop);
  P(x_b0 + tc, tongueTop);
  P(x_b1 - tc, tongueTop);
  P(x_b1, tuckTop);
  P(x_b1, TB);
  // side1 dust flap
  P(x_b1, dustTop + dc);
  P(x_b1 + dc, dustTop);
  P(x_s1 - dc, dustTop);
  P(x_s1, dustTop + dc);
  P(x_s1, TB);
  // front top edge — thumb notch (dips down into panel), toggleable
  if (topNotch) {
    P(nL, TB);
    for (const pt of arcPoints(notchCx, TB, rN, Math.PI, 0)) cut.push(pt);
  }
  P(x_f1, TB);
  // side2 dust flap
  P(x_f1, dustTop + dc);
  P(x_f1 + dc, dustTop);
  P(x_s2 - dc, dustTop);
  P(x_s2, dustTop + dc);
  P(x_s2, TB);
  // outer right edge down
  P(x_s2, BB);
  // ---- bottom mirror (right to left) ----
  P(x_s2, dustBot - dc);
  P(x_s2 - dc, dustBot);
  P(x_f1 + dc, dustBot);
  P(x_f1, dustBot - dc);
  P(x_f1, BB);
  // front bottom — thumb notch (dips up into panel), toggleable
  if (bottomNotch) {
    P(nR, BB);
    for (const pt of arcPoints(notchCx, BB, rN, 0, -Math.PI)) cut.push(pt);
  }
  P(x_s1, BB);
  // side1 dust flap
  P(x_s1, dustBot - dc);
  P(x_s1 - dc, dustBot);
  P(x_b1 + dc, dustBot);
  P(x_b1, dustBot - dc);
  P(x_b1, BB);
  // back tuck bottom
  P(x_b1, tuckBot);
  P(x_b1 - tc, tongueBot);
  P(x_b0 + tc, tongueBot);
  P(x_b0, tuckBot);
  P(x_b0, BB);
  // glue bottom taper + left edge up
  P(gt, BB);
  P(x_g0, BB - gt);

  // ---- CREASE (fold) lines ----
  const crease: Polyline[] = [];
  // vertical panel folds (full body height) — ids feed the Fold Engine spec
  const vIds = ["glue-back", "back-side1", "side1-front", "front-side2"];
  [x_b0, x_b1, x_s1, x_f1].forEach((x, i) => crease.push(line([x, TB], [x, BB], vIds[i])));
  // horizontal flap folds (top & bottom) over each flap-bearing panel
  const foldSpans: [number, number, string][] = [
    [x_b0, x_b1, "back"],  // tuck
    [x_b1, x_s1, "side1"], // dust
    [x_f1, x_s2, "side2"], // dust
  ];
  for (const [a, b, p] of foldSpans) {
    crease.push(line([a, TB], [b, TB], `${p}-top`));
    crease.push(line([a, BB], [b, BB], `${p}-bottom`));
  }
  // tongue folds (tuck panel -> tongue)
  crease.push(line([x_b0, tuckTop], [x_b1, tuckTop], "tongue-top"));
  crease.push(line([x_b0, tuckBot], [x_b1, tuckBot], "tongue-bottom"));

  // ---- GLUE area hatch (visual hint only) ----
  const glueHatch: Polyline[] = [];
  const step = inToPt(0.12);
  const gh = BB - TB;
  for (let c = -gh; c < x_b0 - x_g0; c += step) {
    const xs = Math.max(x_g0, x_g0 + c);
    const ys = TB + (xs - x_g0 - c);
    const xe = Math.min(x_b0, x_g0 + c + gh);
    const ye = TB + (xe - x_g0 - c);
    if (xe > xs) glueHatch.push(line([xs, ys], [xe, ye]));
  }

  // ---- BLEED — true contour offset (follows the cut perimeter at `bleed`) ----
  const cutPolyline: Polyline = { pts: cut, closed: true };
  const bleedBox: Polyline = bleedFromCut(cutPolyline, bleed);

  // ---- dimension arrows for the preview ----
  const midY = (TB + BB) / 2;
  const dims: DimLine[] = [
    // L across the front panel, W across a side panel (horizontal)
    { x1: x_s1, y1: midY, x2: x_f1, y2: midY, key: "L" },
    { x1: x_b1, y1: midY, x2: x_s1, y2: midY, key: "W" },
    // H along the full body height, just outside the right edge (vertical)
    { x1: x_s2 + bleed + 22, y1: TB, x2: x_s2 + bleed + 22, y2: BB, key: "H", vertical: true },
  ];
  const labels: DieLabel[] = [];

  return {
    paths: {
      cut: [cutPolyline],
      crease,
      bleed: [bleedBox],
      glue: glueHatch,
    },
    widthPt: bboxW,
    heightPt: bboxH,
    bleedPt: bleed,
    labels,
    dims,
    // Panel rects for Phase 3 overlays. Front is inset top & bottom by the
    // thumb-notch radius so a window cut clears the notches; back is the full
    // panel (the Euro hang slot anchors to its top edge).
    panels: {
      // inset only the edges that actually carry a notch (so a window can use
      // the full panel when a notch is toggled off)
      front: {
        x: x_s1,
        y: TB + (topNotch ? rN : 0),
        w: L,
        h: H - (topNotch ? rN : 0) - (bottomNotch ? rN : 0),
      },
      back: { x: x_b0, y: TB, w: L, h: H },
    },
  };
}
