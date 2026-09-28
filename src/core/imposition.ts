// Sheet imposition — "how many up": given a flat dieline's extents (incl. bleed)
// and a press/cutter sheet, compute how many copies fit in a simple grid, in the
// orientation that yields the most, with an adjustable gutter (gap between
// pieces) and sheet-edge margin.
//
// All inputs/outputs in POINTS. The die extents are the full artwork bounding
// box INCLUDING bleed (the same dieW/dieH used by checkFit), so placed copies
// never overlap each other's bleed.
//
// This is deliberately a uniform-orientation grid (every copy the same way up).
// Mixed-orientation / true rectangle-packing for a few extra pieces is a future
// refinement; the uniform grid is what a printer/cutter actually ganging by hand
// uses, and it's exact and verifiable.

import { inToPt } from "./units";
import { Sheet, SHEETS } from "./paper";

export interface Placement {
  xPt: number; // top-left on the sheet (origin top-left, y-down)
  yPt: number;
  wPt: number; // placed extents (already account for rotation)
  hPt: number;
}

export interface Imposition {
  sheet: Sheet;
  up: number;          // total copies that fit (cols × rows)
  cols: number;
  rows: number;
  rotated: boolean;    // true if each copy is turned 90° to fit more
  gutterPt: number;
  marginPt: number;
  /** Fraction of the sheet covered by die artwork (0..1) — a yield hint. */
  usedFraction: number;
  placements: Placement[];
}

// How many w×h rectangles tile into a W×H area with gutter g between them and
// margin m on every edge.
function grid(W: number, H: number, w: number, h: number, g: number, m: number): { cols: number; rows: number } {
  const availW = W - 2 * m;
  const availH = H - 2 * m;
  if (w <= 0 || h <= 0 || availW < w - 1e-6 || availH < h - 1e-6) return { cols: 0, rows: 0 };
  // n pieces span n·size + (n−1)·gutter ≤ avail  ⇒  n ≤ (avail + g) / (size + g)
  const cols = Math.floor((availW + g) / (w + g) + 1e-9);
  const rows = Math.floor((availH + g) / (h + g) + 1e-9);
  return { cols: Math.max(0, cols), rows: Math.max(0, rows) };
}

/** Best uniform-grid imposition of one die onto one sheet. */
export function imposeOnSheet(
  dieW: number,
  dieH: number,
  sheet: Sheet,
  gutterPt = inToPt(0.125),
  marginPt = 0,
): Imposition {
  const upright = grid(sheet.wPt, sheet.hPt, dieW, dieH, gutterPt, marginPt);
  const turned = grid(sheet.wPt, sheet.hPt, dieH, dieW, gutterPt, marginPt);
  const nUpright = upright.cols * upright.rows;
  const nTurned = turned.cols * turned.rows;
  const rotated = nTurned > nUpright;
  const { cols, rows } = rotated ? turned : upright;
  const w = rotated ? dieH : dieW;
  const h = rotated ? dieW : dieH;

  const placements: Placement[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      placements.push({
        xPt: marginPt + c * (w + gutterPt),
        yPt: marginPt + r * (h + gutterPt),
        wPt: w,
        hPt: h,
      });
    }
  }
  const up = cols * rows;
  const usedFraction = up > 0 ? (up * dieW * dieH) / (sheet.wPt * sheet.hPt) : 0;
  return { sheet, up, cols, rows, rotated, gutterPt, marginPt, usedFraction, placements };
}

/** Imposition across all standard sheets, richest (most-up) first. */
export function imposeAll(
  dieW: number,
  dieH: number,
  gutterPt = inToPt(0.125),
  marginPt = 0,
  sheets: Sheet[] = SHEETS,
): Imposition[] {
  return sheets
    .map((s) => imposeOnSheet(dieW, dieH, s, gutterPt, marginPt))
    .sort((a, b) => b.up - a.up || b.usedFraction - a.usedFraction);
}
