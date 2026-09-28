// Paper Lantern — craft Decorations (decor batch #1).
// docs/craft-dielines-catalog.md §F ("paper lantern").
//
// The classic slit-cylinder lantern: a rectangular blank with a SOLID band top
// and bottom and a field of vertical SLITS between them. Roll it into a tube
// (glue the seam), then push the two bands toward each other → the strips between
// the slits bow OUTWARD into a barrel/lantern. A hang hole in the top band.
//
// Dieline: the rectangle outline + a glue seam + N−1 vertical slit cuts in the
// middle field + a hang hole. The slits are OPEN cuts (kept off the outline so
// the bleed contour can't self-intersect); the bowing is at assembly (no
// creases). FLAT die-cut item with a bespoke rolled-lantern 3D
// (`paperLanternFoldable`). Cut many-up: `preferSheetExport: true`.
//
// All geometry in POINTS, top-left origin, y-down. Pure functional lantern
// geometry — no traced artwork.
//
// Dimension semantics (editor mapping):
//   editor L → lantern DIAMETER (when rolled)  params.D
//   editor W → lantern HEIGHT (the blank)       params.H
//   editor H → unused (hidden)

import { Dieline, Polyline } from "../types";
import { bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { circleCut } from "../craft";

export interface PaperLanternParams {
  D: number;          // rolled diameter (pt)
  H: number;          // blank height (pt)
  thickness: number;  // caliper (pt) — unused today, kept for parity
  bleed: number;      // bleed margin (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(D: number, H: number, thickness = inToPt(0.008)): PaperLanternParams {
  return { D, H, thickness, bleed: inToPt(0.0625) };
}

function rect(x0: number, y0: number, x1: number, y1: number): Polyline {
  return { pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], closed: true };
}

// Strip count — derived from the circumference so bigger lanterns keep a similar
// slit pitch. Exported so the 3D renderer uses the SAME count (diecut ⇄ render).
export function lanternStrips(D: number): number {
  return clamp(Math.round((Math.PI * D) / mmToPt(22)), 10, 26);
}

export function buildPaperLantern(p: PaperLanternParams): Dieline {
  const D = Math.max(p.D, inToPt(1.5));
  const H = Math.max(p.H, inToPt(2));
  const C = Math.PI * D;                          // circumference = wrap width
  const g = clamp(C * 0.04, mmToPt(8), mmToPt(16)); // glue-seam flap
  const Wb = C + g;
  const bandH = clamp(H * 0.13, mmToPt(8), H * 0.3); // solid top/bottom bands
  const N = lanternStrips(D);

  const outline = rect(0, 0, Wb, H);
  const cut: Polyline[] = [outline];

  // N−1 vertical slit cuts across the wrap field (between the bands), splitting
  // the field into N strips. Kept inside the wrap width (not the glue flap).
  const y0 = bandH, y1 = H - bandH;
  for (let i = 1; i < N; i++) {
    const x = (C * i) / N;
    cut.push({ pts: [[x, y0], [x, y1]], closed: false });
  }

  // Hang hole centred in the top band.
  const hd = clamp(bandH * 0.4, mmToPt(2.5), mmToPt(6));
  cut.push(circleCut(C / 2, bandH / 2, hd));

  // Glue: the seam flap (right strip).
  const glue: Polyline[] = [rect(C, 0, Wb, H)];

  // No dimension arrows: editor L/W are the rolled diameter / height, not the
  // flat blank width (π·D + g), so a dim would mislead (cf. the rosette).
  return {
    paths: { cut, crease: [], bleed: [bleedFromCut(outline, p.bleed)], glue },
    widthPt: Wb,
    heightPt: H,
    bleedPt: p.bleed,
    labels: [],
    dims: [],
  };
}
