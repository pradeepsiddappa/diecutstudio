// Paper Rosette / Fan Medallion — craft Party & Events
// (docs/craft-dielines-catalog.md §D). First of the party batch.
//
// The accordion-pleated paper fan that opens into a full circle medallion (party
// backdrops, cupcake-stand toppers, gift toppers). Construction: accordion-fold
// a long strip, collapse it, glue the ends, fan it into a circle; a decorative
// DISC glued at the centre hides where the pleats converge. Big rosettes use two
// half-circle strips (sturdier + they fit a sheet), so we emit TWO strips.
//
// Geometry (the parametric win — exact pleat spacing):
//   • Fanned to a full circle of diameter D, the strip's OUTER edge IS the rim,
//     so the total developed strip length = the rim circumference = π·D.
//   • Strip HEIGHT = the radial pleat depth = (D − d)/2, where d = centre-disc
//     diameter (the pleats bunch to a small inner hole the disc covers).
//   • Two strips ⇒ each is π·D/2 long; scored into a whole number of pleats of
//     ~the requested pleat width (alternate mountain/valley by hand).
//
// FLAT die-cut item: the strips + disc are the cut; the pleats are SCORES (fold
// lines). No 3D pane (`has3DPreview:false`, `flat:true`) — a bespoke fanned-fan
// 3D could come later. Cut many-up: `preferSheetExport:true`.
//
// All geometry in POINTS, top-left origin, y-down. Pure functional fan geometry
// — no traced artwork.
//
// Dimension semantics (editor mapping):
//   editor L → rosette DIAMETER (finished)  params.D
//   editor W → PLEAT width (target)          params.pleat
//   editor H → unused (hidden)

import { Dieline, Polyline } from "../types";
import { bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { circleCut } from "../craft";

export interface PaperRosetteParams {
  D: number;          // finished rosette diameter (pt)
  pleat: number;      // target pleat width (pt)
  thickness: number;  // caliper (pt) — unused today, kept for parity
  bleed: number;      // bleed margin (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(D: number, pleat = inToPt(0.5), thickness = inToPt(0.012)): PaperRosetteParams {
  return { D, pleat, thickness, bleed: inToPt(0.0625) };
}

function rect(x0: number, y0: number, x1: number, y1: number): Polyline {
  return { pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], closed: true };
}

export function buildPaperRosette(p: PaperRosetteParams): Dieline {
  const D = Math.max(p.D, inToPt(1.5));
  const dCenter = clamp(D * 0.36, mmToPt(22), D * 0.7);   // centre-disc diameter
  const H = (D - dCenter) / 2;                            // strip height = radial pleat depth
  const STRIPS = 2;                                       // two half-circle strips
  const Lstrip = (Math.PI * D) / STRIPS;                  // each strip = half the rim
  const pleat = clamp(p.pleat, mmToPt(4), Lstrip / 4);    // need ≥4 pleats per strip
  const n = Math.max(4, Math.round(Lstrip / pleat));      // pleats per strip
  const step = Lstrip / n;                                // actual pleat width

  const gap = Math.max(mmToPt(12), 2 * p.bleed + mmToPt(6));

  const cut: Polyline[] = [];
  const crease: Polyline[] = [];
  const bleed: Polyline[] = [];
  const pieces: Polyline[] = [];

  // Two pleated strips, stacked. Each = a Lstrip × H rectangle scored into n
  // pleats by (n−1) vertical fold lines.
  for (let s = 0; s < STRIPS; s++) {
    const y0 = s * (H + gap);
    const strip = rect(0, y0, Lstrip, y0 + H);
    cut.push(strip);
    pieces.push(strip);
    bleed.push(bleedFromCut(strip, p.bleed));
    for (let i = 1; i < n; i++) {
      const x = i * step;
      crease.push({ pts: [[x, y0], [x, y0 + H]], closed: false, id: `pleat-${s}-${i}` });
    }
  }

  // Centre medallion disc, below the strips.
  const discCx = dCenter / 2;
  const discCy = STRIPS * H + (STRIPS - 1) * gap + gap + dCenter / 2;
  const disc = circleCut(discCx, discCy, dCenter);
  cut.push(disc);
  pieces.push(disc);
  bleed.push(bleedFromCut(disc, p.bleed));

  const widthPt = Math.max(Lstrip, dCenter);
  const heightPt = discCy + dCenter / 2;

  // No dimension arrows: the editor labels dims with the L/W *inputs* (here the
  // finished diameter / pleat width), which aren't the flat layout's strip
  // length/height — labelling them would mislead. The top-bar flat-size readout
  // gives the accurate bounding box.
  return {
    paths: { cut, crease, bleed, glue: [] },
    widthPt,
    heightPt,
    bleedPt: p.bleed,
    labels: [],
    dims: [],
    pieces,
  };
}
