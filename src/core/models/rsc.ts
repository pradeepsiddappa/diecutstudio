// Regular Slotted Container (RSC) — FEFCO 0201. The classic corrugated shipping
// box: a 4-wall glued tube with four flaps top and bottom. The two OUTER flaps
// (off the long L panels) meet at the centre; the two INNER flaps (off the W
// panels) fold under and leave a gap. Sealed with tape/glue along the centre
// seam. The single most-used box style worldwide.
//
// Flat layout, left to right:
//   [glue/joint] [front L] [side W] [back L] [side W]
// Each wall is H tall. Every flap is W/2 deep (so opposing OUTER flaps meet),
// separated by thin SLOTS at the panel boundaries so they fold independently.
//
// All math in POINTS. Origin top-left, y increases downward.
// Geometry from the public FEFCO 0201 standard (all flaps = half the box width).
//
// Dims:
//   L → front/back panel width (length)
//   W → side panel width (depth) — also sets the flap depth (W/2)
//   H → wall height

import { Dieline, DieLabel, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";

export interface RscParams {
  L: number;
  W: number;
  H: number;
  thickness: number;
  bleed: number;
  glueFlap: number;   // manufacturer's joint flap (pt)
  flapDepth: number;  // top/bottom flap depth = W/2 (pt)
  relief: number;     // slot width between adjacent flaps (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): RscParams {
  return {
    L, W, H, thickness,
    bleed: inToPt(0.125),
    glueFlap: clamp(Math.min(L, W) * 0.25, mmToPt(28), mmToPt(45)),
    flapDepth: W / 2,
    relief: Math.max(thickness, mmToPt(3)), // corrugated slots are a few mm wide
  };
}

const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

export function buildRsc(p: RscParams): Dieline {
  const { L, W, H, bleed, glueFlap: g, flapDepth: fd, relief } = p;
  const g2 = relief / 2; // each flap pulls back half a slot from a shared boundary

  // x boundaries: glue, then panels [L][W][L][W]
  const b1 = g + L;          // panel1 / panel2
  const b2 = g + L + W;      // panel2 / panel3
  const b3 = g + 2 * L + W;  // panel3 / panel4
  const bboxW = g + 2 * L + 2 * W;
  // y levels
  const yT = fd;             // body top (top flaps fill 0..fd)
  const yB = fd + H;         // body bottom
  const yBot = 2 * fd + H;   // outer bottom edge

  // ---- CUT outline (one closed polyline, clockwise) ----
  const pts: Pt[] = [];
  const P = (x: number, y: number) => pts.push([x, y]);

  // glue flap top edge (no flap on the joint)
  P(0, yT); P(g, yT);
  // top flaps with slots between panels
  const topFlap = (xl: number, xr: number, first: boolean, last: boolean) => {
    P(first ? xl : xl + g2, yT);          // up from fold (left side / slot)
    P(first ? xl : xl + g2, 0);
    P(last ? xr : xr - g2, 0);
    P(last ? xr : xr - g2, yT);           // down to fold (right side / slot)
  };
  topFlap(g, b1, true, false);
  topFlap(b1, b2, false, false);
  topFlap(b2, b3, false, false);
  topFlap(b3, bboxW, false, true);
  // right edge down the body
  P(bboxW, yB);
  // bottom flaps (right → left), mirror
  const botFlap = (xl: number, xr: number, first: boolean, last: boolean) => {
    P(last ? xr : xr - g2, yB);
    P(last ? xr : xr - g2, yBot);
    P(first ? xl : xl + g2, yBot);
    P(first ? xl : xl + g2, yB);
  };
  botFlap(b3, bboxW, false, true);
  botFlap(b2, b3, false, false);
  botFlap(b1, b2, false, false);
  botFlap(g, b1, true, false);
  // glue flap bottom edge + left edge up
  P(g, yB); P(0, yB);

  const cutPolyline: Polyline = { pts, closed: true };

  // ---- CREASE lines ----
  const crease: Polyline[] = [];
  // vertical body folds
  const vIds = ["glue-back", "back-side1", "side1-front", "front-side2"];
  [g, b1, b2, b3].forEach((x, i) => crease.push(line([x, yT], [x, yB], vIds[i])));
  // top + bottom flap folds, one per panel
  const spans: [number, number, string][] = [[g, b1, "back"], [b1, b2, "side1"], [b2, b3, "front"], [b3, bboxW, "side2"]];
  for (const [a, b, p] of spans) {
    crease.push(line([a, yT], [b, yT], `${p}-top`));
    crease.push(line([a, yB], [b, yB], `${p}-bottom`));
  }

  // ---- GLUE hatch (manufacturer's joint) ----
  const glue: Polyline[] = [];
  const step = inToPt(0.12);
  for (let c = -(yB - yT); c < g; c += step) {
    const xs = Math.max(0, c);
    const ys = yT + (xs - c);
    const xe = Math.min(g, c + (yB - yT));
    const ye = yT + (xe - c);
    if (xe > xs) glue.push(line([xs, ys], [xe, ye]));
  }

  const bleedBox: Polyline = bleedFromCut(cutPolyline, bleed);

  // ---- Dimensions ----
  const midY = yT + H / 2;
  const dims: DimLine[] = [
    { x1: g, y1: midY, x2: b1, y2: midY, key: "L" },
    { x1: b1, y1: midY, x2: b2, y2: midY, key: "W" },
    { x1: bboxW + bleed + mmToPt(8), y1: yT, x2: bboxW + bleed + mmToPt(8), y2: yB, key: "H", vertical: true },
  ];
  const labels: DieLabel[] = [];

  return {
    paths: { cut: [cutPolyline], crease, bleed: [bleedBox], glue },
    widthPt: bboxW,
    heightPt: yBot,
    bleedPt: bleed,
    labels,
    dims,
    // Front/back body panels — Fold Engine root + future feature overlays.
    panels: {
      front: { x: b2, y: yT, w: L, h: H },
      back: { x: g, y: yT, w: L, h: H },
    },
  };
}
