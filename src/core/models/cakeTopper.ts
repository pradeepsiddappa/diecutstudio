// Cake Topper — Party category.
//
// A single-layer flat topper shape on a STICK HOLDER. The shape has a solid
// rectangular tab protruding from the bottom centre — you tape/glue a bamboo
// skewer or lollipop stick behind the tab, then press it into the cake. The
// tab is wide enough to give a firm bond so the topper stands upright.
//
// Shapes: circle / heart / star / scallop-circle
//
// The holder tab is merged into the shape outline as ONE closed cut contour
// (shape ∪ bottom tab), via a robust run-based splice that works for every
// shape — including the star's concave bottom valley and the scallop's bumps.
//
// FLAT item (flat:true), preferSheetExport:true (gang several per mat/sheet).
// All geometry in POINTS, top-left origin, y-down. Pure functional geometry.
//
// Dimension semantics:
//   editor L → topper diameter / width   params.D
//   editor W → unused (hidden)
//   editor H → unused (hidden)

import { Dieline, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { circleCut, scallopEdge } from "../craft";

export type CakeTopperShape = "circle" | "heart" | "star" | "scallop";

export interface CakeTopperParams {
  D: number;             // topper diameter / bounding dimension (pt)
  shape: CakeTopperShape;
  holderW: number;       // stick-holder tab WIDTH / thickness (pt)
  holderDepth: number;   // stick-holder tab LENGTH / protrusion depth (pt)
  scallopR: number;      // scallop bump radius (pt) — for scallop shape
  thickness: number;     // caliper (pt)
  bleed: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const TWO_PI = 2 * Math.PI;

export function defaultParams(D: number, thickness = inToPt(0.012)): CakeTopperParams {
  return {
    D, shape: "circle", thickness,
    holderW: clamp(D * 0.18, mmToPt(14), D * 0.4), // sturdy tab, proportional to size
    holderDepth: inToPt(1),
    scallopR: mmToPt(7),
    bleed: inToPt(0.0625),
  };
}

function circleOutline(cx: number, cy: number, r: number, segs = 60): Polyline {
  const pts: Pt[] = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * TWO_PI;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return { pts, closed: true };
}

// Heart shape (algebraic heart, scaled to fit D × ~0.875*D bounding box)
function heartOutline(cx: number, cy: number, D: number, segs = 80): Polyline {
  const sc = D / 32;
  const pts: Pt[] = [];
  for (let i = 0; i < segs; i++) {
    const t = (i / segs) * TWO_PI - Math.PI / 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push([cx + x * sc, cy + y * sc]);
  }
  return { pts, closed: true };
}

// Star shape (5-point, inner radius = outer × 0.4)
function starOutline(cx: number, cy: number, R: number, points = 5): Polyline {
  const rIn = R * 0.4;
  const pts: Pt[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * TWO_PI - Math.PI / 2;
    const r = i % 2 === 0 ? R : rIn;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return { pts, closed: true };
}

// Scalloped circle: circle with scallop bumps around the perimeter
function scallopCircle(cx: number, cy: number, R: number, scallopR: number): Polyline {
  const circ = TWO_PI * R;
  const n = Math.max(8, Math.round(circ / (scallopR * 2)));
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a1 = (i / n) * TWO_PI - Math.PI / 2;
    const a2 = ((i + 1) / n) * TWO_PI - Math.PI / 2;
    const p1: Pt = [cx + R * Math.cos(a1), cy + R * Math.sin(a1)];
    const p2: Pt = [cx + R * Math.cos(a2), cy + R * Math.sin(a2)];
    const bump = scallopEdge(p1, p2, { count: 1, segments: 14 });
    for (const q of bump.slice(i === 0 ? 0 : 1)) pts.push(q);
  }
  return { pts, closed: true };
}

// Intersect segment p1→p2 with the vertical line x = X. Returns the crossing
// point, or null if the segment doesn't span X (or is itself vertical).
function vCross(p1: Pt, p2: Pt, X: number): Pt | null {
  const [x1, y1] = p1, [x2, y2] = p2;
  if (x1 === x2) return null;
  const t = (X - x1) / (x2 - x1);
  if (t < 0 || t > 1) return null;
  return [X, y1 + t * (y2 - y1)];
}

// Merge a rectangular STICK-HOLDER tab into the bottom of the shape outline,
// producing ONE closed contour (shape ∪ tab). The tab is centred at x = cx,
// spans 2·hw wide, and hangs down to y = botY + depth (botY = the shape's
// lowest extent).
//
// Robust for every shape — including concave bottoms (the star's valley) and
// bumpy edges (the scallop): instead of fragile "is a vertex exactly at the
// lowest point" detection, it finds the LOWEST contiguous run of outline
// vertices that lie inside the tab's x-column [cx−hw, cx+hw], then splices the
// tab in at the exact edge-crossings on either side of that run.
function withSlotProtrusion(outline: Polyline, cx: number, hw: number, botY: number, depth: number): Polyline {
  const pts = outline.pts;
  const n = pts.length;
  const tabBottom = botY + depth;
  const xL = cx - hw, xR = cx + hw;

  const inCol = pts.map(([x]) => x >= xL && x <= xR);
  if (!inCol.some(v => !v)) return outline; // degenerate: whole outline in column

  // Collect contiguous cyclic runs of in-column vertices; pick the LOWEST one.
  type Run = { start: number; end: number; maxY: number };
  const runs: Run[] = [];
  const s0 = inCol.findIndex(v => !v); // start scanning from an out-of-column vertex
  for (let k = 0; k < n; k++) {
    const i = (s0 + k) % n;
    if (inCol[i] && !inCol[(i - 1 + n) % n]) {
      let j = i, maxY = -Infinity;
      while (inCol[j]) {
        if (pts[j][1] > maxY) maxY = pts[j][1];
        const nj = (j + 1) % n;
        if (!inCol[nj]) break;
        j = nj;
      }
      runs.push({ start: i, end: j, maxY });
    }
  }
  if (runs.length === 0) return outline;
  let best = runs[0];
  for (const r of runs) if (r.maxY > best.maxY) best = r;

  const prevI = (best.start - 1 + n) % n;
  const nextI = (best.end + 1) % n;
  const pPrev = pts[prevI], pStart = pts[best.start];
  const pEnd = pts[best.end], pNext = pts[nextI];

  // Which vertical edge of the tab each side crosses.
  const Xa = pPrev[0] < cx ? xL : xR;
  const Xb = pNext[0] < cx ? xL : xR;
  const isectA: Pt = vCross(pPrev, pStart, Xa) ?? [Xa, pStart[1]];
  const isectB: Pt = vCross(pEnd, pNext, Xb) ?? [Xb, pEnd[1]];

  // Keep the outline arc OUTSIDE the bottom run (pNext → … → pPrev), then
  // splice the tab: down one wall, across the bottom, up the other wall.
  const result: Pt[] = [];
  let idx = nextI;
  while (true) {
    result.push(pts[idx]);
    if (idx === prevI) break;
    idx = (idx + 1) % n;
  }
  result.push(isectA, [Xa, tabBottom], [Xb, tabBottom], isectB);

  return { pts: result, closed: true };
}

export function buildCakeTopper(p: CakeTopperParams): Dieline {
  const D = Math.max(p.D, inToPt(1.5));
  const R = D / 2;
  // Stick HOLDER tab: a solid rectangle you tape the skewer behind. Both the
  // WIDTH (thickness) and the LENGTH (protrusion depth) are user-adjustable;
  // clamp to keep them sane relative to the shape (wide enough to bond a stick,
  // never wider than the shape itself / absurdly long).
  const holderW = clamp(p.holderW, mmToPt(6), D * 0.6);
  const holderDepth = clamp(p.holderDepth, mmToPt(8), D * 1.5);

  // Place the shape centred at (R, R) so bounding box starts at (0,0)
  const cx = R, cy = R;

  let baseOutline: Polyline;
  switch (p.shape) {
    case "heart":
      baseOutline = heartOutline(cx, cy, D);
      break;
    case "star":
      baseOutline = starOutline(cx, cy, R);
      break;
    case "scallop":
      baseOutline = scallopCircle(cx, cy, R * 0.88, p.scallopR);
      break;
    default:
      baseOutline = circleOutline(cx, cy, R);
  }

  // ---- merge the stick-holder tab at the actual bottom of the shape ----
  // Compute the true bottom of this shape (varies by shape — heart tip ≠ circle bottom).
  const botY = Math.max(...baseOutline.pts.map(p => p[1]));
  const hw = holderW / 2;
  const outline = withSlotProtrusion(baseOutline, cx, hw, botY, holderDepth);

  const cut: Polyline[] = [outline];

  const widthPt = D;
  const heightPt = botY + holderDepth; // shape height + the protruding holder tab

  return {
    paths: { cut, crease: [], bleed: [bleedFromCut(outline, p.bleed)], glue: [] },
    widthPt,
    heightPt,
    bleedPt: p.bleed,
    labels: [],
    dims: [],
  };
}
