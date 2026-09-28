// Sealed-End / Standard Glue Carton — ECMA B10.
//
// The basic "tube with glued ends" folding carton: a 4-wall glued tube whose
// TOP and BOTTOM are each closed by four flaps that are GLUED shut (not tucked,
// not locked). The pharma / dry-food / confectionery standard — strong, tamper-
// resistant, machine-glued at high speed. Unlike a tuck carton it does not
// re-open; you fill it before the second end is sealed.
//
// Flat layout, left to right:
//   [glue seam] [Back: L] [Side: W] [Front: L] [Side: W]
// Each wall is H tall. Each END has:
//   - SEALING flaps off the two L panels (Back & Front), depth W/2 — they meet
//     at the end's centreline and glue down onto the dust flaps. These are the
//     glue zones (hatched).
//   - DUST flaps off the two W panels (Sides), depth `dustDepth`, with chamfered
//     outer corners — they fold in FIRST and the sealing flaps bond over them.
//   Thin relief slits at the panel boundaries let each flap fold independently.
//
// All math in POINTS (1 in = 72 pt). Origin top-left, y increases downward.
//
// Geometry derived from the public ECMA B10 sealed-end / glue-carton standard
// (4 flaps per end: two W/2 sealing flaps + two chamfered dust flaps). NOT
// imported from any proprietary file.
//
// Dims:
//   L → back/front panel width — sealing-flap width
//   W → side panel width / depth — sealing-flap depth (W/2) + dust-flap width
//   H → wall height

import { Dieline, DieLabel, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";

export interface GlueCartonParams {
  L: number;
  W: number;
  H: number;
  thickness: number;
  bleed: number;
  glueFlap: number;    // manufacturer side-seam flap (pt)
  sealDepth: number;   // front/back sealing flap depth = W/2 (pt)
  dustDepth: number;   // side dust flap depth (pt)
  dustChamfer: number; // chamfer on the dust flaps' outer corners (pt)
  relief: number;      // slit between adjacent flaps (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): GlueCartonParams {
  const relief = Math.max(thickness, mmToPt(0.8));
  const sealDepth = W / 2;
  // Dust flaps fold UNDER the sealing flaps; keep them a touch shallower than the
  // seal depth and never deep enough to collide across the L gap.
  const dustDepth = Math.min(sealDepth * 0.9, L / 2 - relief);
  return {
    L, W, H, thickness,
    bleed: inToPt(0.125),
    glueFlap: clamp(W * 0.6, mmToPt(8), mmToPt(16)),
    sealDepth,
    dustDepth,
    dustChamfer: Math.min(dustDepth * 0.4, W * 0.2),
    relief,
  };
}

const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

export function buildGlueCarton(p: GlueCartonParams): Dieline {
  const { L, W, H, bleed, glueFlap: g, sealDepth: sD, dustDepth: dD, dustChamfer: dc, relief } = p;
  const g2 = relief / 2;

  // ---- x boundaries ----
  const x_g0 = 0;
  const x_b0 = g;             // glue / back
  const x_b1 = x_b0 + L;       // back / side1
  const x_s1 = x_b1 + W;       // side1 / front
  const x_f1 = x_s1 + L;       // front / side2
  const x_s2 = x_f1 + W;       // outer right edge

  // ---- y levels (top + bottom mirror; sealing flaps are the deepest) ----
  const TB = sD;               // body top (sealing flaps fill 0..TB)
  const BB = TB + H;           // body bottom
  const yBot = BB + sD;        // outer bottom edge
  const dustTopY = TB - dD;    // dust flaps stop short of the top edge
  const dustBotY = BB + dD;

  // ---- CUT outline: one closed polyline walked clockwise ----
  const pts: Pt[] = [];
  const P = (x: number, y: number) => pts.push([x, y]);

  // Per-flap top builders. `lx`/`rx` already account for relief slots.
  const sealTop = (lx: number, rx: number) => {
    P(lx, TB); P(lx, 0); P(rx, 0); P(rx, TB);
  };
  const dustTop = (lx: number, rx: number) => {
    P(lx, TB); P(lx, dustTopY + dc); P(lx + dc, dustTopY);
    P(rx - dc, dustTopY); P(rx, dustTopY + dc); P(rx, TB);
  };
  const sealBot = (lx: number, rx: number) => {
    P(rx, BB); P(rx, yBot); P(lx, yBot); P(lx, BB);
  };
  const dustBot = (lx: number, rx: number) => {
    P(rx, BB); P(rx, dustBotY - dc); P(rx - dc, dustBotY);
    P(lx + dc, dustBotY); P(lx, dustBotY - dc); P(lx, BB);
  };

  // glue seam top edge (no flap on the joint)
  P(x_g0, TB); P(x_b0, TB);
  // TOP flaps left → right: back seal, side1 dust, front seal, side2 dust
  sealTop(x_b0, x_b1 - g2);          // back (full to glue side on the left)
  dustTop(x_b1 + g2, x_s1 - g2);     // side1
  sealTop(x_s1 + g2, x_f1 - g2);     // front
  dustTop(x_f1 + g2, x_s2);          // side2 (full to the free right edge)
  // right edge down the body
  P(x_s2, BB);
  // BOTTOM flaps right → left: side2 dust, front seal, side1 dust, back seal
  dustBot(x_f1 + g2, x_s2);
  sealBot(x_s1 + g2, x_f1 - g2);
  dustBot(x_b1 + g2, x_s1 - g2);
  sealBot(x_b0, x_b1 - g2);
  // glue seam bottom edge + left edge up
  P(x_b0, BB); P(x_g0, BB);

  const cutPolyline: Polyline = { pts, closed: true };

  // ---- CREASE (fold) lines ----
  const crease: Polyline[] = [];
  // vertical body folds
  const vIds = ["glue-back", "back-side1", "side1-front", "front-side2"];
  [x_b0, x_b1, x_s1, x_f1].forEach((x, i) => crease.push(line([x, TB], [x, BB], vIds[i])));
  // top + bottom flap hinges, one per panel
  const spans: [number, number, string][] = [[x_b0, x_b1, "back"], [x_b1, x_s1, "side1"], [x_s1, x_f1, "front"], [x_f1, x_s2, "side2"]];
  for (const [a, b, p] of spans) {
    crease.push(line([a, TB], [b, TB], `${p}-top`));
    crease.push(line([a, BB], [b, BB], `${p}-bottom`));
  }

  // ---- GLUE hatch: side seam + the four SEALING flaps (the glued ends) ----
  const glue: Polyline[] = [];
  const step = inToPt(0.12);
  // side seam [x_g0..x_b0] over the body height (diagonal hatch)
  for (let c = -(BB - TB); c < x_b0 - x_g0; c += step) {
    const xs = Math.max(x_g0, x_g0 + c);
    const ys = TB + (xs - x_g0 - c);
    const xe = Math.min(x_b0, x_g0 + c + (BB - TB));
    const ye = TB + (xe - x_g0 - c);
    if (xe > xs) glue.push(line([xs, ys], [xe, ye]));
  }
  // horizontal hatch within a sealing-flap rectangle
  const hatchSeal = (lx: number, rx: number, y0: number, y1: number) => {
    for (let y = Math.min(y0, y1) + step; y < Math.max(y0, y1); y += step) {
      glue.push(line([lx, y], [rx, y]));
    }
  };
  hatchSeal(x_b0, x_b1 - g2, 0, TB);            // back top
  hatchSeal(x_s1 + g2, x_f1 - g2, 0, TB);       // front top
  hatchSeal(x_b0, x_b1 - g2, BB, yBot);         // back bottom
  hatchSeal(x_s1 + g2, x_f1 - g2, BB, yBot);    // front bottom

  // ---- BLEED — true contour offset ----
  const bleedBox: Polyline = bleedFromCut(cutPolyline, bleed);

  // ---- Dimensions ----
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
    heightPt: yBot,
    bleedPt: bleed,
    labels,
    dims,
    // Front/back panels available for window/euro overlays.
    panels: {
      front: { x: x_s1, y: TB, w: L, h: H },
      back: { x: x_b0, y: TB, w: L, h: H },
    },
  };
}
