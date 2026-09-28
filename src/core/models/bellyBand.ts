// Belly band / soap band — craft Tags & Wraps (docs/craft-dielines-catalog.md
// §B/§C). The wrap strip that goes around a product (soap, cards, napkins,
// candles, bundles) — sized to the product's GIRTH (the distance around) plus
// an overlap to close.
//
// A simple rounded-rect strip: length = girth + overlap, height = band width.
// Two closures:
//   • glue — the overlap region (one end) is a glue zone; wrap + glue the ends.
//   • lock — a TAB on the far end inserts into a SLOT near the near end
//            (caliper-aware slot+tab, glue-free "tuck"). The Batch-0 primitive.
//
// FLAT item (`has3DPreview:false`, `flat:true`): it WRAPS a product (no creases
// of its own; you fold it at the product's edges). Gangs many-up.
//
// All geometry in POINTS, top-left origin, y-down. Generic functional strip —
// no traced artwork.
//
// Dimension semantics: editor L → girth (around) · editor W → band width ·
//   editor H → unused (hidden).

import { Dieline, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { roundedRect } from "../features";
import { slotCut, slotForTab, tabEdgePts, SlotTabSpec } from "../craft";

export type BandClosure = "glue" | "lock";

export interface BellyBandParams {
  girth: number;      // distance around the product (pt)
  bandW: number;      // band width / height (pt)
  thickness: number;  // caliper (pt) — drives the lock slot+tab fit
  bleed: number;      // bleed margin (pt)
  closure: BandClosure;
  overlap: number;    // overlap to close (glue zone or tab reach) (pt)
  cornerR: number;    // rounded end corners (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const line = (a: Pt, b: Pt): Polyline => ({ pts: [a, b], closed: false });

export function defaultParams(girth: number, bandW: number, thickness = inToPt(0.012)): BellyBandParams {
  return {
    girth, bandW, thickness,
    bleed: inToPt(0.0625),
    closure: "lock", // glue-free tuck (shows the slot/tab); glue is an option
    overlap: clamp(girth * 0.12, mmToPt(12), mmToPt(40)),
    cornerR: mmToPt(3),
  };
}

export function buildBellyBand(p: BellyBandParams): Dieline {
  const bandW = p.bandW;
  const overlap = clamp(p.overlap, mmToPt(8), p.girth * 0.5);
  const length = p.girth + overlap;
  const cornerR = clamp(p.cornerR, 0, Math.min(bandW, length) / 2);

  const outline = roundedRect(0, 0, length, bandW, cornerR);
  const cut: Polyline[] = [outline];
  const glue: Polyline[] = [];

  if (p.closure === "lock") {
    // Tab on the FAR (right) end + a slot `overlap` from the NEAR (left) end, so
    // when the band wraps and the far end laps the near end by `overlap`, the
    // tab lands in the slot — a glue-free tuck close.
    const tabW = clamp(bandW * 0.55, mmToPt(12), bandW - mmToPt(6));
    const spec: SlotTabSpec = { tabW, depth: mmToPt(9), caliper: Math.max(p.thickness, mmToPt(0.4)) };
    // Re-cut the outline with a tab spliced into its right short edge.
    const r = cornerR;
    const pts: Pt[] = [];
    const cv: (Pt | null)[] = [];
    const lin = (q: Pt) => { pts.push(q); if (pts.length > 1) cv.push(null); };
    const quad = (q: Pt, c: Pt) => { pts.push(q); cv.push(c); };
    lin([r, 0]); lin([length - r, 0]); quad([length, r], [length, 0]);
    for (const q of tabEdgePts([length, r], [length, bandW - r], spec)) lin(q); // right edge + tab (protrudes +x)
    quad([length - r, bandW], [length, bandW]);
    lin([r, bandW]); quad([0, bandW - r], [0, bandW]);
    lin([0, r]); quad([r, 0], [0, 0]);
    pts.pop(); cv.pop(); // closing quad duplicated the start
    cut[0] = { pts, curves: cv, closed: true };
    // The receiving slot (vertical) `overlap` from the left.
    cut.push(slotCut(overlap, bandW / 2, spec, Math.PI / 2));
  } else {
    // Glue closure: hatch the overlap region at the RIGHT end.
    const step = inToPt(0.1);
    for (let y = step; y < bandW; y += step) glue.push(line([p.girth, y], [length, y]));
  }

  const dims: DimLine[] = [
    { x1: 0, y1: bandW + mmToPt(2), x2: p.girth, y2: bandW + mmToPt(2), key: "L" }, // girth
    { x1: length, y1: 0, x2: length, y2: bandW, key: "W", vertical: true },         // band width
  ];

  // Real extent (the lock tab protrudes past `length`, so size to the outline).
  let maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of cut[0].pts) { if (x > maxX) maxX = x; if (y > maxY) maxY = y; }

  return {
    paths: { cut, crease: [], bleed: [bleedFromCut(cut[0], p.bleed)], glue },
    widthPt: Math.max(length, maxX),
    heightPt: Math.max(bandW, maxY),
    bleedPt: p.bleed,
    labels: [],
    dims,
  };
}
