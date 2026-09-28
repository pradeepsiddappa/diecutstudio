// Place card / table tent — craft Party & Events (docs/craft-dielines-catalog.md
// §D). A card folded in half that stands on a table (a "tent"): a name card at a
// place setting, or a table number / info card.
//
// A rounded-rect blank W × 2H with one fold across the middle (at y=H). Fold it
// in half and it stands as an inverted-V tent, W wide × H tall, with a front and
// a back panel. Stands on its two bottom edges — no glue.
//
// FLAT-dimensioned item (`flat:true`) but it FOLDS, so it gets a 3D tent
// preview (`has3DPreview:true`, a bespoke renderer). Gangs many-up.
//
// All geometry in POINTS, top-left origin, y-down. Generic folded-card form —
// no traced artwork.
//
// Dimension semantics: editor L → card WIDTH · editor W → card HEIGHT (the
//   standing/panel height; the flat blank is twice this tall) · editor H → unused.

import { Dieline, DimLine, Polyline } from "../types";
import { bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { roundedRect } from "../features";

export interface PlaceCardParams {
  W: number;          // card width (pt)
  H: number;          // card / panel height (pt) — blank is 2H tall, folds at H
  thickness: number;  // caliper (pt) — unused today, kept for parity
  bleed: number;      // bleed margin (pt)
  cornerR: number;    // rounded blank corners (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const line = (a: [number, number], b: [number, number], id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

export function defaultParams(W: number, H: number, thickness = inToPt(0.018)): PlaceCardParams {
  return { W, H, thickness, bleed: inToPt(0.0625), cornerR: mmToPt(3) };
}

export function buildPlaceCard(p: PlaceCardParams): Dieline {
  const { W, H, bleed } = p;
  const total = 2 * H;                                   // blank height (two panels)
  const cornerR = clamp(p.cornerR, 0, Math.min(W, H) / 2);

  const blank = roundedRect(0, 0, W, total, cornerR);
  const crease: Polyline[] = [line([0, H], [W, H], "fold")]; // the half-fold

  const dims: DimLine[] = [
    { x1: 0, y1: total, x2: W, y2: total, key: "L" },          // card width
    { x1: W, y1: 0, x2: W, y2: H, key: "W", vertical: true },  // card height (one panel)
  ];

  return {
    paths: { cut: [blank], crease, bleed: [bleedFromCut(blank, bleed)], glue: [] },
    widthPt: W,
    heightPt: total,
    bleedPt: bleed,
    labels: [],
    dims,
  };
}
