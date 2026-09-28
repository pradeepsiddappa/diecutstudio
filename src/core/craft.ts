// Shared CRAFT geometry primitives (Craft Batch 0) — small generators that
// unlock dozens of catalog items (docs/craft-dielines-catalog.md §2):
//
//   • scallopEdge()  — scalloped / wavy edge between two points
//   • circleCut() / holeGrid() / holeRing() — hole punches (single, grid, radial)
//   • slotForTab() / slotCut() / tabEdgePts() — caliper-aware slot + tab pair
//
// (roundedRect / pill already exist in features.ts; regular-polygon/star comes
// with the first model that needs it.)
//
// All pure geometry in POINTS, top-left origin, y-down. Arcs are pre-flattened
// to points (same convention as the box models) so PDF/SVG/DXF stay identical.
//
// EDGE CONVENTION: every edge helper takes a directed segment a→b and bulges
// to the LEFT of travel — which is OUTWARD when the host outline is walked
// clockwise in y-down screen coords (the convention every model uses).

import { Polyline } from "./types";
import { Pt, arcPoints } from "./geometry";

const len2 = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

// ---------------------------------------------------------------- scallops --

export interface ScallopOpts {
  /** Desired bump radius (pt). The actual radius is fitted so a whole number
   *  of bumps spans the edge exactly: r = edgeLen / (2·count). */
  radius?: number;
  /** Explicit bump count (overrides radius). */
  count?: number;
  /** Arc-flattening segments per bump (default 10). */
  segments?: number;
  /** "scallop" = every bump bulges left (outward on a CW outline);
   *  "wave" = bumps alternate left/right for a wavy edge. */
  style?: "scallop" | "wave";
}

/** Scalloped (or wavy) edge from `a` to `b` as a flattened point run,
 *  INCLUDING both endpoints — splice it straight into an outline's pts. */
export function scallopEdge(a: Pt, b: Pt, opts: ScallopOpts = {}): Pt[] {
  const L = len2(a, b);
  if (L <= 0) return [a, b];
  const style = opts.style ?? "scallop";
  const n = Math.max(1, opts.count ?? Math.round(L / (2 * (opts.radius ?? L / 8))));
  const r = L / (2 * n);
  // Default to a fine flattening so the bumps read as smooth curves, not facets.
  const segs = Math.max(4, opts.segments ?? 22);
  const dx = (b[0] - a[0]) / L, dy = (b[1] - a[1]) / L; // unit direction
  // Left normal of travel in y-down coords: (dy, -dx). For a left→right top
  // edge that's (0,-1) = up = outward on a clockwise outline.
  const nx = dy, ny = -dx;

  const out: Pt[] = [a];
  for (let i = 0; i < n; i++) {
    // Bump i spans chord [a + 2ri·d̂ , a + 2r(i+1)·d̂]; its center is the chord
    // midpoint. The semicircle runs from the start angle to start∓π, choosing
    // the sweep whose midpoint lies on the bulge side.
    const cx = a[0] + dx * r * (2 * i + 1);
    const cy = a[1] + dy * r * (2 * i + 1);
    const side = style === "wave" && i % 2 === 1 ? -1 : 1; // wave alternates
    const a0 = Math.atan2(a[1] + dy * 2 * r * i - cy, a[0] + dx * 2 * r * i - cx);
    // Midpoint of the sweep must point along ±(nx,ny):
    const aMid = Math.atan2(ny * side, nx * side);
    // Normalize the offset a0→aMid into (-π, π] to pick the sweep direction.
    let d = aMid - a0;
    while (d <= -Math.PI) d += 2 * Math.PI;
    while (d > Math.PI) d -= 2 * Math.PI;
    const a1 = a0 + (d >= 0 ? Math.PI : -Math.PI);
    out.push(...arcPoints(cx, cy, r, a0, a1, segs).slice(1));
  }
  // Snap the final point exactly onto b (kills float drift over many bumps).
  out[out.length - 1] = [b[0], b[1]];
  return out;
}

// ------------------------------------------------------------------- holes --

/** A circular hole punch as a closed cut Polyline (flattened). */
export function circleCut(cx: number, cy: number, dia: number, segments = 36): Polyline {
  const pts = arcPoints(cx, cy, dia / 2, 0, 2 * Math.PI, segments);
  pts.pop(); // drop the duplicated seam point; `closed` redraws it
  return { pts, closed: true };
}

/** A cols×rows grid of hole punches. (x0,y0) = center of the first hole;
 *  pitch = center-to-center spacing. */
export function holeGrid(
  x0: number, y0: number,
  cols: number, rows: number,
  pitchX: number, pitchY: number,
  dia: number,
): Polyline[] {
  const out: Polyline[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push(circleCut(x0 + c * pitchX, y0 + r * pitchY, dia));
  return out;
}

/** `count` hole punches evenly spaced on a circle of radius ringR around
 *  (cx,cy), starting at `startAngle` (default 12 o'clock). */
export function holeRing(
  cx: number, cy: number,
  ringR: number, count: number, dia: number,
  startAngle = -Math.PI / 2,
): Polyline[] {
  const out: Polyline[] = [];
  for (let i = 0; i < count; i++) {
    const a = startAngle + (2 * Math.PI * i) / count;
    out.push(circleCut(cx + ringR * Math.cos(a), cy + ringR * Math.sin(a), dia));
  }
  return out;
}

// -------------------------------------------------------------- slot + tab --

export interface SlotTabSpec {
  /** Tab base width along its host edge (pt). */
  tabW: number;
  /** How far the tab protrudes from the host edge (pt). */
  depth: number;
  /** Material caliper (pt) — the slot's width derives from it. */
  caliper: number;
  /** Extra play so the tab inserts without binding (pt).
   *  Default = 25% of caliper (snug friction fit). */
  clearance?: number;
}

/** The slot dimensions that RECEIVE a given tab: long enough for the tab base
 *  plus play, wide enough for the material thickness plus play. This pairing
 *  is the caliper-aware contract — tests lock it. */
export function slotForTab(spec: SlotTabSpec): { len: number; w: number } {
  const clr = spec.clearance ?? spec.caliper * 0.25;
  return { len: spec.tabW + clr, w: spec.caliper + clr };
}

/** The receiving slot as a closed rounded-end (stadium) cut, centered at
 *  (cx,cy). `angle` rotates it (0 = slot length along +x). */
export function slotCut(cx: number, cy: number, spec: SlotTabSpec, angle = 0): Polyline {
  const { len, w } = slotForTab(spec);
  const r = w / 2;
  const half = Math.max(0, len / 2 - r); // straight half-length between end arcs
  // Build along x then rotate: right end-cap arc (top→bottom), left end-cap.
  const pts: Pt[] = [
    ...arcPoints(half, 0, r, -Math.PI / 2, Math.PI / 2, 10),
    ...arcPoints(-half, 0, r, Math.PI / 2, (3 * Math.PI) / 2, 10),
  ];
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return {
    pts: pts.map(([x, y]): Pt => [cx + x * cos - y * sin, cy + x * sin + y * cos]),
    closed: true,
  };
}

/** An insert TAB spliced onto the host edge a→b: a centered trapezoid bulging
 *  LEFT of travel (outward on a CW outline), base `tabW`, tapering by
 *  `shoulder` per side (default 15% of tabW — eases insertion). Returns the
 *  point run from `a` to `b` INCLUDING both endpoints. */
export function tabEdgePts(a: Pt, b: Pt, spec: SlotTabSpec, shoulder?: number): Pt[] {
  const L = len2(a, b);
  const tabW = Math.min(spec.tabW, L);
  const sh = Math.min(shoulder ?? tabW * 0.15, tabW / 2 - 1e-9);
  const dx = (b[0] - a[0]) / L, dy = (b[1] - a[1]) / L;
  const nx = dy, ny = -dx; // left of travel (outward, CW outline)
  const at = (t: number, d: number): Pt => [a[0] + dx * t + nx * d, a[1] + dy * t + ny * d];
  const m = L / 2;
  return [
    a,
    at(m - tabW / 2, 0),
    at(m - tabW / 2 + sh, spec.depth),
    at(m + tabW / 2 - sh, spec.depth),
    at(m + tabW / 2, 0),
    b,
  ];
}
