// Helpers for building and consuming Polylines.

import { Polyline } from "./types";

export type Pt = [number, number];

// SVG path "d" string from a polyline. Emits M, L, Q, and (optionally) Z.
// Segments with a non-null curves[i] entry render as quadratic beziers; all
// others are straight lines.
export function toSvgPath(pl: Polyline): string {
  if (pl.pts.length === 0) return "";
  const [first, ...rest] = pl.pts;
  let d = `M ${f(first[0])} ${f(first[1])}`;
  rest.forEach((p, i) => {
    const ctrl = pl.curves?.[i];
    if (ctrl) {
      d += ` Q ${f(ctrl[0])} ${f(ctrl[1])} ${f(p[0])} ${f(p[1])}`;
    } else {
      d += ` L ${f(p[0])} ${f(p[1])}`;
    }
  });
  if (pl.closed) d += " Z";
  return d;
}

// Flatten any quadratic-bezier segments in the polyline into straight line
// segments. Used by exporters that can't render curves (DXF), and by anywhere
// else that wants a pure point list. A polyline with no `curves` is returned
// unchanged.
export function flattenPolyline(pl: Polyline, segmentsPerCurve = 12): Polyline {
  if (!pl.curves || pl.curves.every((c) => c == null)) return pl;
  const newPts: Pt[] = [pl.pts[0]];
  for (let i = 1; i < pl.pts.length; i++) {
    const ctrl = pl.curves[i - 1];
    if (ctrl) {
      const [x0, y0] = pl.pts[i - 1];
      const [cx, cy] = ctrl;
      const [x1, y1] = pl.pts[i];
      // Quadratic bezier: B(t) = (1-t)² P0 + 2(1-t)t Pc + t² P1
      for (let j = 1; j <= segmentsPerCurve; j++) {
        const t = j / segmentsPerCurve;
        const u = 1 - t;
        newPts.push([
          u * u * x0 + 2 * u * t * cx + t * t * x1,
          u * u * y0 + 2 * u * t * cy + t * t * y1,
        ]);
      }
    } else {
      newPts.push(pl.pts[i]);
    }
  }
  return { pts: newPts, closed: pl.closed };
}

// Flatten a circular arc into points. Useful when a model wants to emit a
// curve as discrete points (e.g., for backwards compatibility), but for new
// code prefer `curves: [[cx,cy]]` on the Polyline so SVG/PDF render true arcs.
export function arcPoints(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  segments = 18
): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = a0 + ((a1 - a0) * i) / segments;
    out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  return out;
}

// Parse a subset of SVG path "d" data into a Polyline with bezier control
// points where applicable. Supports M, L, Q, Z (absolute, uppercase). This is
// how we ingest authored geometry from real-world references —
// extract the path, scale + translate, drop it into a model file.
// Throws on any unsupported command so we fail loud rather than silently
// rendering the wrong shape.
export function parsePathToPolyline(
  d: string,
  opts: { scale?: number; tx?: number; ty?: number; closed?: boolean } = {}
): Polyline {
  const scale = opts.scale ?? 1;
  const tx = opts.tx ?? 0;
  const ty = opts.ty ?? 0;
  const t = (x: number, y: number): Pt => [x * scale + tx, y * scale + ty];

  // Tokenise: command letter then a flat list of numbers (commas or spaces).
  const tokens = d.match(/[MLQZmlqz]|-?\d*\.?\d+(?:[eE][+-]?\d+)?/g) ?? [];
  const pts: Pt[] = [];
  const curves: Array<[number, number] | null> = [];
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === "M" || cmd === "m") {
      const x = +tokens[i++], y = +tokens[i++];
      pts.push(t(x, y));
      // Subsequent implicit pairs after M are treated as L (SVG spec)
      while (i < tokens.length && /^-?[\d.]/.test(tokens[i])) {
        const x2 = +tokens[i++], y2 = +tokens[i++];
        pts.push(t(x2, y2));
        curves.push(null);
      }
    } else if (cmd === "L" || cmd === "l") {
      while (i < tokens.length && /^-?[\d.]/.test(tokens[i])) {
        const x = +tokens[i++], y = +tokens[i++];
        pts.push(t(x, y));
        curves.push(null);
      }
    } else if (cmd === "Q" || cmd === "q") {
      while (i < tokens.length && /^-?[\d.]/.test(tokens[i])) {
        const cx = +tokens[i++], cy = +tokens[i++];
        const x = +tokens[i++], y = +tokens[i++];
        pts.push(t(x, y));
        curves.push([cx * scale + tx, cy * scale + ty]);
      }
    } else if (cmd === "Z" || cmd === "z") {
      // closed flag — handled below
    } else {
      throw new Error(`parsePathToPolyline: unsupported command "${cmd}". Only M/L/Q/Z supported.`);
    }
  }
  return {
    pts,
    curves,
    closed: opts.closed ?? d.trim().toUpperCase().endsWith("Z"),
  };
}

const f = (n: number) => Number(n.toFixed(4));

// ---- Polygon offset (Minkowski-sum style dilation) ----
//
// Used to build a contour-following bleed boundary: take the cut polyline,
// offset every point outward by `dist`, return a new closed polyline that
// hugs the original shape at `dist` distance.
//
// Algorithm: for each vertex, intersect the two adjacent edges' outward-offset
// lines. The offset direction at each vertex = angular bisector of the two
// adjacent edge normals, scaled by 1/sin(half_angle) to maintain perpendicular
// distance to each edge.
//
// Limitations:
//  - Input must be a SIMPLE polygon (no self-intersections). Carton dielines
//    are simple by construction so this is fine.
//  - Sharp concave corners can produce spikes; mitigated by a miter limit
//    (sharp inside corners fall back to the perpendicular offset distance).
//  - Q-bezier curves: flatten the polyline first via flattenPolyline().
//
// For a CW polygon (typical for our cut outlines in SVG y-down coords),
// positive `dist` offsets OUTWARD. For CCW input it auto-detects and offsets
// outward as well — the sign is figured from the polygon's signed area.
export function offsetPolygon(pts: Pt[], dist: number): Pt[] {
  const n = pts.length;
  if (n < 3) return pts.map((p) => [...p] as Pt);

  // Signed area → winding direction.
  // In SVG/y-down coordinates: POSITIVE signed area = visually CLOCKWISE.
  // (In standard y-up math, positive area = CCW; the flip is just the y-axis.)
  let area2 = 0;
  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    area2 += p1[0] * p2[1] - p2[0] * p1[1];
  }
  const isVisuallyCW = area2 > 0; // y-down convention

  // Outward unit normal for each edge (i → i+1), pointing AWAY from interior:
  //   Visually CW polygon (y-down):  outward = ( dy, -dx) / len
  //   Visually CCW polygon:          outward = (-dy,  dx) / len
  // Sanity-check on unit square (0,0)→(1,0)→(1,1)→(0,1)→… (CW in y-down):
  //   edge (0,0)→(1,0): dx=1,dy=0 → outward=(0,-1) (points UP = outside ✓)
  const sign = isVisuallyCW ? 1 : -1;
  const normals: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) {
      normals.push([0, 0]);
      continue;
    }
    const nx = (sign * dy) / len;
    const ny = (-sign * dx) / len;
    normals.push([nx, ny]);
  }

  // Cap on how far a miter joint can extend (relative to `dist`). At sharp
  // concave corners the bisector → infinity; clamp to keep the bleed shape
  // sane. 4× the bleed amount is the SVG default for stroke-miterlimit.
  const MITER_LIMIT = 4;

  const result: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const ni = normals[(i - 1 + n) % n]; // normal of edge ENDING at vertex i
    const nj = normals[i];                // normal of edge STARTING at vertex i
    const v = pts[i];

    // Bisector of the two normals (their unnormalized sum points along it).
    const bx = ni[0] + nj[0];
    const by = ni[1] + nj[1];
    const blen = Math.hypot(bx, by);

    if (blen < 1e-9) {
      // 180° cusp (rare). Fall back to plain perpendicular offset.
      result.push([v[0] + dist * ni[0], v[1] + dist * ni[1]]);
      continue;
    }

    const bux = bx / blen;
    const buy = by / blen;
    // sin(half_angle) = dot(bisector_unit, edge_normal_unit). The offset
    // length along the bisector that maintains `dist` perpendicular distance
    // from each edge is `dist / sin(half_angle)`.
    const sinHalf = bux * ni[0] + buy * ni[1];
    const absSin = Math.abs(sinHalf);
    const d = absSin < 1 / MITER_LIMIT
      ? Math.sign(sinHalf || 1) * dist * MITER_LIMIT
      : dist / sinHalf;

    result.push([v[0] + d * bux, v[1] + d * buy]);
  }

  return result;
}

// Convenience: produce a CLOSED Polyline that's the contour offset of `cut`,
// at `dist` units outward. Flattens curves on the way in so the offset
// algorithm sees pure line segments.
export function bleedFromCut(cut: Polyline, dist: number): Polyline {
  const flat = flattenPolyline(cut, 16); // a few more samples for smoother curve following
  const offsetPts = offsetPolygon(flat.pts, dist);
  return { pts: offsetPts, closed: true };
}
