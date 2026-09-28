// Gift-card holder — craft Envelopes & Cards (docs/craft-dielines-catalog.md
// §A). A folded card (opens like a book) that holds a gift card / credit-card
// blank by its corners.
//
// A rounded-rect blank `2W × H` with one VERTICAL fold at x = W (left panel =
// message, right panel = the card pocket). The right panel carries four
// diagonal CORNER SLITS sized to a standard ID-1 gift card (3.375 × 2.125 in);
// you tuck the card's four corners under the slits, then fold the left panel
// over to close.
//
// FLAT item (`has3DPreview:false`, `flat:true`): the fold + slits show in the
// dieline; a 3D book-fold is a future enhancement. Gangs many-up.
//
// All geometry in POINTS, top-left origin, y-down. Generic folded-holder form
// + corner slits — no traced artwork.
//
// Dimension semantics: editor L → folded panel WIDTH (the blank is 2W wide) ·
//   editor W → holder HEIGHT · editor H → unused.

import { Dieline, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { roundedRect } from "../features";

export interface GiftCardHolderParams {
  W: number;          // folded panel width (pt) — blank is 2W wide
  H: number;          // holder height (pt)
  thickness: number;  // caliper (pt) — unused today, kept for parity
  bleed: number;      // bleed margin (pt)
  cardW: number;      // gift-card width (pt) — standard ID-1
  cardH: number;      // gift-card height (pt)
  slitLen: number;    // corner-slit length (pt)
  cornerR: number;    // rounded blank corners (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

export function defaultParams(W: number, H: number, thickness = inToPt(0.018)): GiftCardHolderParams {
  return {
    W, H, thickness,
    bleed: inToPt(0.0625),
    cardW: inToPt(3.375), // ID-1 credit/gift card
    cardH: inToPt(2.125),
    slitLen: mmToPt(18),
    cornerR: mmToPt(3),
  };
}

export function buildGiftCardHolder(p: GiftCardHolderParams): Dieline {
  const { W, H, bleed } = p;
  const blankW = 2 * W;
  const cornerR = clamp(p.cornerR, 0, Math.min(W, H) / 2);
  const blank = roundedRect(0, 0, blankW, H, cornerR);

  // Vertical fold between the two panels.
  const crease: Polyline[] = [line([W, 0], [W, H], "fold")];

  // Gift card centred on the RIGHT panel; clamp it to fit with a margin.
  const gw = clamp(p.cardW, mmToPt(20), W - mmToPt(10));
  const gh = clamp(p.cardH, mmToPt(20), H - mmToPt(10));
  const cx = W + W / 2, cy = H / 2;
  const corners: { c: Pt; dir: Pt }[] = [
    { c: [cx - gw / 2, cy - gh / 2], dir: [1, -1] },  // TL — slit perp to the (−1,−1) diagonal
    { c: [cx + gw / 2, cy - gh / 2], dir: [1, 1] },   // TR
    { c: [cx - gw / 2, cy + gh / 2], dir: [1, 1] },   // BL
    { c: [cx + gw / 2, cy + gh / 2], dir: [1, -1] },  // BR
  ];
  const half = clamp(p.slitLen, mmToPt(8), Math.min(gw, gh) * 0.8) / 2;
  const inv = 1 / Math.SQRT2;
  // Open cut slits (the blade cuts the line; the card corner tucks under).
  const slits: Polyline[] = corners.map(({ c, dir }) =>
    line(
      [c[0] - dir[0] * half * inv, c[1] - dir[1] * half * inv],
      [c[0] + dir[0] * half * inv, c[1] + dir[1] * half * inv],
    ),
  );

  const dims: DimLine[] = [
    { x1: W, y1: H, x2: blankW, y2: H, key: "L" },             // folded width (one panel)
    { x1: blankW, y1: 0, x2: blankW, y2: H, key: "W", vertical: true }, // height
  ];

  return {
    paths: { cut: [blank, ...slits], crease, bleed: [bleedFromCut(blank, bleed)], glue: [] },
    widthPt: blankW,
    heightPt: H,
    bleedPt: bleed,
    labels: [],
    dims,
  };
}
