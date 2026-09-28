// Jar / product Label set — craft Tags, labels & wraps.
// docs/craft-dielines-catalog.md §B.
//
// A flat label cut to size for a jar, candle, bottle, soap, jam etc., in three
// classic shapes. The label IS the cut outline — no creases, no holes; gang a
// whole sheet and (with Print & Cut) drop your artwork inside each one.
//
//   • rect    — rounded rectangle (utilitarian front label)
//   • oval     — ellipse (the classic preserve / cosmetic label)
//   • scallop  — scalloped-border rounded rect (decorative; bumps touch W×H)
//
// FLAT item: no creases, no fold, no 3D (`has3DPreview:false`, `flat:true`).
// Cut many-up — the editor defaults this model to full-sheet export.
//
// All geometry in POINTS, top-left origin, y-down. Pure functional label shapes
// — no traced artwork.
//
// Dimension semantics (editor mapping):
//   editor L → label WIDTH  (x)  params.W
//   editor W → label HEIGHT (y)  params.H
//   editor H → unused (hidden for flat items)

import { Dieline, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { roundedRect } from "../features";
import { scallopEdge } from "../craft";

export type JarLabelShape = "rect" | "oval" | "scallop";

export interface JarLabelParams {
  W: number;          // label width (pt)
  H: number;          // label height (pt)
  thickness: number;  // caliper (pt) — unused today, kept for parity
  bleed: number;      // bleed margin (pt)
  shape: JarLabelShape;
  scallopR: number;   // desired scallop bump radius (pt; scallop shape)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(W: number, H: number, thickness = inToPt(0.008)): JarLabelParams {
  return {
    W, H, thickness,
    bleed: inToPt(0.0625),
    shape: "oval",
    scallopR: inToPt(0.22),
  };
}

// Ellipse outline, bbox exactly W×H.
function ovalOutline(W: number, H: number, segments = 56): Polyline {
  const cx = W / 2, cy = H / 2, rx = W / 2, ry = H / 2;
  const pts: Pt[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * 2 * Math.PI;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return { pts, closed: true };
}

// Scalloped rounded-rect: per-edge fitted radii so a whole number of bumps spans
// each edge AND the apexes touch the nominal W×H box exactly (same solve as the
// gift tag's scallop).
function scallopOutline(W: number, H: number, r0in: number): Polyline {
  const r0 = clamp(r0in, mmToPt(2), Math.min(W, H) / 6);
  const nT = Math.max(2, Math.round((W - 2 * r0) / (2 * r0)));
  const nS = Math.max(2, Math.round((H - 2 * r0) / (2 * r0)));
  let rT = (nS * W - H) / (2 * (nS * nT - 1));
  let rS = (nT * H - W) / (2 * (nS * nT - 1));
  rT = clamp(rT, mmToPt(0.8), Math.min(W, H) / 2);
  rS = clamp(rS, mmToPt(0.8), Math.min(W, H) / 2);
  const pts: Pt[] = [];
  const run = (seg: Pt[]) => { for (const p of seg.slice(pts.length ? 1 : 0)) pts.push(p); };
  run(scallopEdge([rS, rT], [W - rS, rT], { count: nT }));         // top
  run(scallopEdge([W - rS, rT], [W - rS, H - rT], { count: nS }));  // right
  run(scallopEdge([W - rS, H - rT], [rS, H - rT], { count: nT }));  // bottom
  run(scallopEdge([rS, H - rT], [rS, rT], { count: nS }));          // left
  pts.pop(); // last point duplicates the start; closed redraws it
  return { pts, closed: true };
}

export function buildJarLabel(p: JarLabelParams): Dieline {
  const { W, H, bleed, shape } = p;
  const outline =
    shape === "oval" ? ovalOutline(W, H)
    : shape === "scallop" ? scallopOutline(W, H, p.scallopR)
    : roundedRect(0, 0, W, H, Math.min(mmToPt(4), W / 8, H / 8)); // rect

  const dims: DimLine[] = [
    { x1: 0, y1: H, x2: W, y2: H, key: "L" },                    // width  (editor "L")
    { x1: W, y1: 0, x2: W, y2: H, key: "W", vertical: true },    // height (editor "W")
  ];

  return {
    paths: { cut: [outline], crease: [], bleed: [bleedFromCut(outline, bleed)], glue: [] },
    widthPt: W,
    heightPt: H,
    bleedPt: bleed,
    labels: [],
    dims,
  };
}
