// Hair-Bow / Clip display card — craft Product Display Cards (handmade-seller
// line). docs/craft-dielines-catalog.md §C.
//
// A flat rounded-rect card for displaying/selling hair bows or clips: a hang
// HOLE at the top + N SLOT PAIRS down the card. Each pair is two short parallel
// slits with a card "bridge" between them — slide a snap/alligator clip's prong
// (or thread a bow's elastic) through so it grips the bridge and the bow sits on
// the card front. Display 1–4 bows per card via `pairs`.
//
// FLAT item: no creases, no fold, no 3D (`has3DPreview:false`, `flat:true`).
// Cut many-up — the editor defaults this model to full-sheet export.
//
// All geometry in POINTS, top-left origin, y-down. Pure functional card form —
// no traced artwork.
//
// Dimension semantics (editor mapping):
//   editor L → card WIDTH  (x)  params.W
//   editor W → card HEIGHT (y)  params.H
//   editor H → unused (hidden for flat items)

import { Dieline, DimLine, Polyline } from "../types";
import { bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { roundedRect } from "../features";
import { circleCut } from "../craft";

export interface HairBowCardParams {
  W: number;          // card width (pt)
  H: number;          // card height (pt)
  thickness: number;  // material caliper (pt) — unused today, kept for parity
  bleed: number;      // bleed margin (pt)
  hangHole: boolean;  // top peg-hang hole
  hangDia: number;    // hang-hole diameter (pt)
  pairs: number;      // number of clip slot pairs (bows per card)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(W: number, H: number, thickness = inToPt(0.018)): HairBowCardParams {
  return {
    W, H, thickness,
    bleed: inToPt(0.0625),
    hangHole: true,
    hangDia: inToPt(0.1875),
    pairs: 2,
  };
}

// A horizontal stadium slot centred at (cx, cy).
function slot(cx: number, cy: number, len: number, w: number): Polyline {
  return roundedRect(cx - len / 2, cy - w / 2, cx + len / 2, cy + w / 2, w / 2);
}

export function buildHairBowCard(p: HairBowCardParams): Dieline {
  const { W, H, bleed } = p;
  const cornerR = Math.min(mmToPt(4), W / 8, H / 8);
  const outline = roundedRect(0, 0, W, H, cornerR);
  const cut: Polyline[] = [outline];

  // Hang hole: top-centre.
  const hd = clamp(p.hangDia, mmToPt(2), W / 4);
  const hy = clamp(cornerR + hd / 2 + mmToPt(2), hd / 2 + mmToPt(1.5), H / 5);
  if (p.hangHole) cut.push(circleCut(W / 2, hy, hd));

  // Slot pairs: each pair = two horizontal slits a clip-bite apart, distributed
  // evenly down the card below the hole.
  const n = clamp(Math.round(p.pairs), 1, 4);
  const slen = clamp(W * 0.45, mmToPt(12), W * 0.7);
  const sw = mmToPt(1.6);
  const bite = mmToPt(9);                                          // bridge between a pair
  const top = (p.hangHole ? hy + hd / 2 : cornerR) + mmToPt(8) + bite / 2;
  const bot = H - cornerR - mmToPt(8) - bite / 2;
  for (let i = 0; i < n; i++) {
    const py = n === 1 ? (top + bot) / 2 : top + ((bot - top) * i) / (n - 1);
    cut.push(slot(W / 2, py - bite / 2, slen, sw));
    cut.push(slot(W / 2, py + bite / 2, slen, sw));
  }

  const dims: DimLine[] = [
    { x1: 0, y1: H, x2: W, y2: H, key: "L" },                    // width  (editor "L")
    { x1: W, y1: 0, x2: W, y2: H, key: "W", vertical: true },    // height (editor "W")
  ];

  return {
    paths: { cut, crease: [], bleed: [bleedFromCut(outline, bleed)], glue: [] },
    widthPt: W,
    heightPt: H,
    bleedPt: bleed,
    labels: [],
    dims,
  };
}
