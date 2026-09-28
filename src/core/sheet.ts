// Compose a whole imposed press SHEET into a single Dieline, so the existing
// PDF/SVG/DXF exporters can write a multi-up file unchanged.
//
// Given the source dieline + an Imposition (the placements computed by
// imposition.ts), this stamps a copy of every cut/crease/bleed/glue path at each
// placement — translated to the placement's cell and rotated 90° if the
// imposition chose the turned orientation — and returns a Dieline whose extents
// ARE the sheet (bleedPt = 0; the sheet is the page). Optional crop marks go in
// the non-cutting `marks` channel.
//
// All coordinates in POINTS, top-left origin, y-down — same as every model.

import { Dieline, LayerKind, Polyline } from "./types";
import { inToPt } from "./units";
import { Imposition } from "./imposition";

const LAYERS: LayerKind[] = ["cut", "crease", "bleed", "glue"];

// Map every point (and any quadratic-bezier control point) of a polyline.
function mapPoly(pl: Polyline, f: (p: [number, number]) => [number, number]): Polyline {
  return {
    pts: pl.pts.map(f),
    closed: pl.closed,
    curves: pl.curves ? pl.curves.map((c) => (c ? f(c) : null)) : undefined,
  };
}

// L-shaped crop/trim ticks at the four corners of a trim rect, pointing OUTWARD
// (away from the box), offset a small gap so they don't touch the artwork.
function cropMarks(x: number, y: number, w: number, h: number): Polyline[] {
  const len = inToPt(0.125);
  const gap = inToPt(0.06);
  const seg = (a: [number, number], b: [number, number]): Polyline => ({ pts: [a, b], closed: false });
  const x1 = x + w, y1 = y + h;
  return [
    // top-left
    seg([x - gap, y], [x - gap - len, y]), seg([x, y - gap], [x, y - gap - len]),
    // top-right
    seg([x1 + gap, y], [x1 + gap + len, y]), seg([x1, y - gap], [x1, y - gap - len]),
    // bottom-left
    seg([x - gap, y1], [x - gap - len, y1]), seg([x, y1 + gap], [x, y1 + gap + len]),
    // bottom-right
    seg([x1 + gap, y1], [x1 + gap + len, y1]), seg([x1, y1 + gap], [x1, y1 + gap + len]),
  ];
}

export interface ComposeOptions {
  cropMarks?: boolean;
}

/** Build a single sheet-sized Dieline containing every imposed copy. */
export function composeSheet(die: Dieline, imp: Imposition, opts: ComposeOptions = {}): Dieline {
  const b = die.bleedPt;
  const dcx = die.widthPt / 2;
  const dcy = die.heightPt / 2;

  const out: Record<LayerKind, Polyline[]> = { cut: [], crease: [], bleed: [], glue: [] };
  const marks: Polyline[] = [];

  for (const p of imp.placements) {
    const cellCx = p.xPt + p.wPt / 2;
    const cellCy = p.yPt + p.hPt / 2;
    // Rotate about the die centre (90° CW when turned), then translate the
    // centre onto the placement's cell centre — matches the on-screen preview.
    const f = (pt: [number, number]): [number, number] => {
      const cx = pt[0] - dcx;
      const cy = pt[1] - dcy;
      const rx = imp.rotated ? -cy : cx;
      const ry = imp.rotated ? cx : cy;
      return [rx + cellCx, ry + cellCy];
    };
    for (const layer of LAYERS) for (const pl of die.paths[layer]) out[layer].push(mapPoly(pl, f));
  }

  // Crop/trim marks: ONE set at the four outer corners of the whole imposed
  // block (inset by bleed to the trim line), sitting in the sheet margin. We do
  // NOT ring every piece — on tightly-ganged craft sheets (gift tags, cards)
  // per-piece marks land in the gutters/bleed and overlap the artwork or get
  // read as stray cuts. The cut LINES already delineate each piece; these marks
  // are only for trimming the printed sheet to size.
  if (opts.cropMarks && imp.placements.length) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of imp.placements) {
      minX = Math.min(minX, p.xPt); minY = Math.min(minY, p.yPt);
      maxX = Math.max(maxX, p.xPt + p.wPt); maxY = Math.max(maxY, p.yPt + p.hPt);
    }
    marks.push(...cropMarks(minX + b, minY + b, maxX - minX - 2 * b, maxY - minY - 2 * b));
  }

  return {
    paths: out,
    widthPt: imp.sheet.wPt,
    heightPt: imp.sheet.hPt,
    bleedPt: 0, // the sheet IS the page; per-piece bleed is already baked into coords
    labels: [],
    dims: [],
    marks: opts.cropMarks ? marks : undefined,
  };
}
