// Bunting pennant — craft Party & Events (docs/craft-dielines-catalog.md §D).
// A single flag for a bunting / banner garland; you cut many and string them
// through the lacing holes.
//
// Three shapes:
//   • triangle   — the classic pennant, point down.
//   • swallowtail — a rectangle with a V notched into the bottom (forked tail).
//   • scallop    — a rectangle with a scalloped bottom edge (reuses scallopEdge).
// Two lacing holes near the top corners thread the string.
//
// FLAT item (`has3DPreview:false`, `flat:true`): nothing folds. Gangs many-up
// (a banner is a row of these).
//
// All geometry in POINTS, top-left origin, y-down. Generic functional flag
// shapes — no traced artwork.
//
// Dimension semantics: editor L → pennant WIDTH (top edge) · editor W → pennant
//   HEIGHT (drop) · editor H → unused (hidden).

import { Dieline, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { circleCut, scallopEdge } from "../craft";

export type PennantShape = "triangle" | "swallowtail" | "scallop";

export interface BuntingPennantParams {
  W: number;          // pennant width — top edge (pt)
  H: number;          // pennant height — drop (pt)
  thickness: number;  // caliper (pt) — unused today, kept for parity
  bleed: number;      // bleed margin (pt)
  shape: PennantShape;
  holeDia: number;    // lacing-hole diameter (pt)
  notch: number;      // swallowtail V-notch depth (pt)
  scallopW: number;   // scallop bump width (pt, scallop shape)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(W: number, H: number, thickness = inToPt(0.014)): BuntingPennantParams {
  return {
    W, H, thickness,
    bleed: inToPt(0.0625),
    shape: "triangle",
    holeDia: inToPt(0.1875),
    notch: clamp(H * 0.4, mmToPt(8), H * 0.6),
    scallopW: mmToPt(16),
  };
}

export function buildBuntingPennant(p: BuntingPennantParams): Dieline {
  const { W, H, bleed, shape } = p;

  // ---- outline per shape (top edge straight, from (0,0) to (W,0)) ----
  const pts: Pt[] = [];
  if (shape === "triangle") {
    pts.push([0, 0], [W, 0], [W / 2, H]);
  } else if (shape === "swallowtail") {
    const notch = clamp(p.notch, mmToPt(4), H * 0.8);
    pts.push([0, 0], [W, 0], [W, H], [W / 2, H - notch], [0, H]);
  } else { // scallop
    const nS = Math.max(2, Math.round(W / Math.max(p.scallopW, mmToPt(6))));
    const r = W / (2 * nS); // fitted bump radius; chord sits r above H so the
    // bumps bulge DOWN to exactly y = H (kept within the height — not cropped).
    pts.push([0, 0], [W, 0], [W, H - r]);
    for (const q of scallopEdge([W, H - r], [0, H - r], { count: nS }).slice(1)) pts.push(q);
  }
  const outline: Polyline = { pts, closed: true };

  // ---- two lacing holes near the top corners ----
  const holeDia = clamp(p.holeDia, mmToPt(1.5), W / 4);
  const inset = holeDia / 2 + mmToPt(5);
  const cut: Polyline[] = [
    outline,
    circleCut(inset, inset, holeDia),
    circleCut(W - inset, inset, holeDia),
  ];

  const dims: DimLine[] = [
    { x1: 0, y1: 0, x2: W, y2: 0, key: "L" },                  // width (top edge)
    { x1: W, y1: 0, x2: W, y2: H, key: "W", vertical: true },  // height (drop)
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
