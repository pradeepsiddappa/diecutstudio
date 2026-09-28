// Fold Engine v2 — PANELIZER. See docs/fold-engine.md.
//
// Derives the 3D-foldable structure from the dieline itself: splits the flat
// sheet (the closed cut outline) along the crease lines into PANEL polygons,
// and produces the HINGE graph (which panel folds off which, along which
// segment). Interior CLOSED cuts (windows, slots) become panel holes;
// interior OPEN cuts (lock slits) attach as slit marks.
//
// Algorithm: planar subdivision + half-edge face tracing.
//   1. Flatten all geometry (Q-beziers sampled) into straight segments.
//   2. Snap endpoints to an epsilon grid; split every segment at every node
//      that lies on it (T-junctions are everywhere in carton dielines) and at
//      proper segment×segment intersections.
//   3. DEDUPE identical sub-segments. This is load-bearing: carton outlines
//      double back on themselves between adjacent flaps (a zero-width SLIT,
//      e.g. tuck flap vs dust flap) — the two overlapping traversals must
//      become ONE graph edge with a face on each side.
//   4. Trace faces (at each node, edges sorted by angle; the next half-edge
//      of u→v is the clockwise neighbour of v→u). Bounded faces = panels.
//   5. Crease-derived edges shared by two bounded faces = hinges (merged per
//      source crease).
//
// Pure geometry, no three.js — fully unit-testable in node.

import { Polyline } from "../types";
import { Pt, flattenPolyline } from "../geometry";

export interface Panel {
  id: number;
  outline: Pt[];      // closed polygon (no duplicate last point)
  holes: Pt[][];      // interior closed cuts contained in this panel
  slits: Pt[][];      // interior open cuts contained in this panel
  area: number;       // |shoelace| of the outline
}

export interface Hinge {
  a: number;          // panel id
  b: number;          // panel id
  p0: Pt;             // hinge segment start (flat coords)
  p1: Pt;             // hinge segment end
  creaseId?: string;  // the source crease Polyline.id, if named
}

export interface PanelGraph {
  panels: Panel[];
  hinges: Hinge[];
}

// Snap grid: 1e-3 pt ≈ 0.35 µm — far below any real feature distance, far
// above f64 noise from the models' closed-form coordinate arithmetic.
const EPS = 1e-3;
const keyOf = (x: number, y: number) => `${Math.round(x / EPS)},${Math.round(y / EPS)}`;

interface Seg { ax: number; ay: number; bx: number; by: number; crease: boolean; creaseRef: number }

interface Edge { a: number; b: number; crease: boolean; creaseRef: number } // node indices

export function panelize(outline: Polyline, creases: Polyline[], interiorCuts: Polyline[] = []): PanelGraph {
  // ---- 1. collect raw segments (flattened) ----
  const segs: Seg[] = [];
  const out = flattenPolyline(outline).pts;
  const n = out.length;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = out[i];
    const [bx, by] = out[(i + 1) % n]; // outline is closed
    if (Math.hypot(bx - ax, by - ay) > EPS) segs.push({ ax, ay, bx, by, crease: false, creaseRef: -1 });
  }
  creases.forEach((c, ci) => {
    const p = flattenPolyline(c).pts;
    for (let i = 0; i + 1 < p.length; i++) {
      const [ax, ay] = p[i];
      const [bx, by] = p[i + 1];
      if (Math.hypot(bx - ax, by - ay) > EPS) segs.push({ ax, ay, bx, by, crease: true, creaseRef: ci });
    }
  });

  // ---- 2. node set: endpoints + proper pairwise intersections ----
  const nodes: Pt[] = [];
  const nodeIdx = new Map<string, number>();
  const addNode = (x: number, y: number): number => {
    const k = keyOf(x, y);
    let i = nodeIdx.get(k);
    if (i == null) {
      i = nodes.length;
      nodes.push([x, y]);
      nodeIdx.set(k, i);
    }
    return i;
  };
  for (const s of segs) { addNode(s.ax, s.ay); addNode(s.bx, s.by); }
  // proper crossings (interior×interior) — rare in cartons but cheap to support
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const p = segCross(segs[i], segs[j]);
      if (p) addNode(p[0], p[1]);
    }
  }

  // ---- 3. split each segment at every node lying on it; dedupe ----
  const edgeMap = new Map<string, Edge>();
  for (const s of segs) {
    const dx = s.bx - s.ax, dy = s.by - s.ay;
    const len2 = dx * dx + dy * dy;
    // nodes on this segment, sorted by parameter t
    const hits: { t: number; i: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const [px, py] = nodes[i];
      const t = ((px - s.ax) * dx + (py - s.ay) * dy) / len2;
      if (t < -EPS || t > 1 + EPS) continue;
      const cx = s.ax + t * dx, cy = s.ay + t * dy;
      if (Math.hypot(px - cx, py - cy) <= EPS * 2) hits.push({ t: Math.max(0, Math.min(1, t)), i });
    }
    hits.sort((u, v) => u.t - v.t);
    for (let h = 0; h + 1 < hits.length; h++) {
      const a = hits[h].i, b = hits[h + 1].i;
      if (a === b) continue;
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      const prev = edgeMap.get(k);
      if (prev) {
        // overlap (slit double-back, or crease re-stated): crease info wins
        if (s.crease && !prev.crease) { prev.crease = true; prev.creaseRef = s.creaseRef; }
      } else {
        edgeMap.set(k, { a, b, crease: s.crease, creaseRef: s.creaseRef });
      }
    }
  }
  const edges = [...edgeMap.values()];

  // ---- 4. face tracing (half-edge walk) ----
  // adjacency: for each node, outgoing half-edges sorted by angle
  const adj: { to: number; edge: number; angle: number }[][] = nodes.map(() => []);
  edges.forEach((e, ei) => {
    const [ax, ay] = nodes[e.a];
    const [bx, by] = nodes[e.b];
    adj[e.a].push({ to: e.b, edge: ei, angle: Math.atan2(by - ay, bx - ax) });
    adj[e.b].push({ to: e.a, edge: ei, angle: Math.atan2(ay - by, ax - bx) });
  });
  for (const list of adj) list.sort((u, v) => u.angle - v.angle);

  // visited directed edges: edgeIndex*2 + (0 if a→b, 1 if b→a)
  const visited = new Set<number>();
  const dirKey = (ei: number, fromA: boolean) => ei * 2 + (fromA ? 0 : 1);
  interface Face { nodesIdx: number[]; edgesIdx: number[]; area: number }
  const faces: Face[] = [];
  // faceOfDir[dirKey] = face index that this directed edge belongs to
  const faceOfDir = new Map<number, number>();

  for (let ei = 0; ei < edges.length; ei++) {
    for (const fromA of [true, false]) {
      if (visited.has(dirKey(ei, fromA))) continue;
      // walk one face
      const fNodes: number[] = [];
      const fEdges: number[] = [];
      let curEdge = ei;
      let curFrom = fromA ? edges[ei].a : edges[ei].b;
      let curTo = fromA ? edges[ei].b : edges[ei].a;
      const fi = faces.length;
      for (let guard = 0; guard < edges.length * 2 + 4; guard++) {
        const dk = dirKey(curEdge, curFrom === edges[curEdge].a);
        if (visited.has(dk)) break; // closed the loop
        visited.add(dk);
        faceOfDir.set(dk, fi);
        fNodes.push(curFrom);
        fEdges.push(curEdge);
        // next: at curTo, find direction back to curFrom; take its clockwise neighbour
        const list = adj[curTo];
        const backAngle = Math.atan2(
          nodes[curFrom][1] - nodes[curTo][1],
          nodes[curFrom][0] - nodes[curTo][0],
        );
        // index of the back-direction in the sorted list
        let bi = -1;
        for (let i = 0; i < list.length; i++) {
          if (list[i].to === curFrom && Math.abs(angDiff(list[i].angle, backAngle)) < 1e-9) { bi = i; break; }
        }
        if (bi < 0) {
          // fall back: nearest angle entry pointing to curFrom
          let best = Infinity;
          for (let i = 0; i < list.length; i++) {
            if (list[i].to !== curFrom) continue;
            const d = Math.abs(angDiff(list[i].angle, backAngle));
            if (d < best) { best = d; bi = i; }
          }
        }
        const nxt = list[(bi - 1 + list.length) % list.length]; // clockwise neighbour
        curFrom = curTo;
        curTo = nxt.to;
        curEdge = nxt.edge;
      }
      if (fNodes.length >= 3) {
        faces.push({ nodesIdx: fNodes, edgesIdx: fEdges, area: shoelace(fNodes.map((i) => nodes[i])) });
      } else if (fNodes.length > 0) {
        faces.push({ nodesIdx: fNodes, edgesIdx: fEdges, area: 0 });
      }
    }
  }

  // ---- 5. bounded faces = panels ----
  // With the clockwise-neighbour next-rule in y-DOWN coordinates, bounded
  // faces trace with POSITIVE shoelace area; the single unbounded face is
  // negative. (Pinned by the unit-square test in tests/diecut.test.ts.)
  const bounded: number[] = [];
  let unboundedCount = 0;
  faces.forEach((f, i) => {
    if (f.area > EPS * EPS) bounded.push(i);
    else if (f.area < -EPS * EPS) unboundedCount++;
  });
  if (unboundedCount !== 1) {
    throw new Error(`panelize: expected exactly 1 unbounded face, got ${unboundedCount} (malformed outline or non-manifold graph)`);
  }

  const faceToPanel = new Map<number, number>();
  const panels: Panel[] = bounded.map((fi, pi) => {
    faceToPanel.set(fi, pi);
    return {
      id: pi,
      outline: faces[fi].nodesIdx.map((i) => nodes[i] as Pt),
      holes: [],
      slits: [],
      area: Math.abs(faces[fi].area),
    };
  });

  // ---- 6. hinges: crease edges with bounded faces on BOTH sides ----
  // group by (panelA, panelB, creaseRef), then merge to a single span
  const hingeGroups = new Map<string, { a: number; b: number; creaseRef: number; pts: Pt[] }>();
  edges.forEach((e, ei) => {
    if (!e.crease) return;
    const fA = faceOfDir.get(dirKey(ei, true));
    const fB = faceOfDir.get(dirKey(ei, false));
    if (fA == null || fB == null) return;
    const pA = faceToPanel.get(fA);
    const pB = faceToPanel.get(fB);
    if (pA == null || pB == null || pA === pB) return;
    const lo = Math.min(pA, pB), hi = Math.max(pA, pB);
    const k = `${lo}|${hi}|${e.creaseRef}`;
    let g = hingeGroups.get(k);
    if (!g) { g = { a: lo, b: hi, creaseRef: e.creaseRef, pts: [] }; hingeGroups.set(k, g); }
    g.pts.push(nodes[e.a], nodes[e.b]);
  });
  const hinges: Hinge[] = [...hingeGroups.values()].map((g) => {
    // merged span = the farthest pair of points (orientation-agnostic)
    let best = -1, p0 = g.pts[0], p1 = g.pts[0];
    for (let i = 0; i < g.pts.length; i++) {
      for (let j = i + 1; j < g.pts.length; j++) {
        const d = (g.pts[i][0] - g.pts[j][0]) ** 2 + (g.pts[i][1] - g.pts[j][1]) ** 2;
        if (d > best) { best = d; p0 = g.pts[i]; p1 = g.pts[j]; }
      }
    }
    return { a: g.a, b: g.b, p0, p1, creaseId: creases[g.creaseRef]?.id };
  });

  // ---- 7. interior cuts → holes / slits by containment ----
  for (const c of interiorCuts) {
    const p = flattenPolyline(c).pts;
    const probe: Pt = c.closed ? p[0] : p[Math.floor(p.length / 2)];
    const host = panels.find((pn) => pointInPolygon(probe, pn.outline));
    if (host) (c.closed ? host.holes : host.slits).push(p);
  }

  // ---- 8. validate: connected tree ----
  if (hinges.length !== panels.length - 1) {
    throw new Error(`panelize: hinge graph is not a tree (${panels.length} panels, ${hinges.length} hinges)`);
  }
  const seen = new Set<number>([0]);
  const queue = [0];
  while (queue.length) {
    const p = queue.pop()!;
    for (const h of hinges) {
      const o = h.a === p ? h.b : h.b === p ? h.a : -1;
      if (o >= 0 && !seen.has(o)) { seen.add(o); queue.push(o); }
    }
  }
  if (seen.size !== panels.length) {
    throw new Error(`panelize: hinge graph is disconnected (${seen.size}/${panels.length} panels reachable)`);
  }

  return { panels, hinges };
}

// ---- helpers ----

function angDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function shoelace(pts: Pt[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    s += x0 * y1 - x1 * y0;
  }
  return s / 2;
}

// Proper interior crossing of two segments (excludes endpoint touches — those
// are handled by the node-on-segment splitting pass).
function segCross(s: Seg, t: Seg): Pt | null {
  const rdx = s.bx - s.ax, rdy = s.by - s.ay;
  const sdx = t.bx - t.ax, sdy = t.by - t.ay;
  const denom = rdx * sdy - rdy * sdx;
  if (Math.abs(denom) < 1e-12) return null; // parallel/collinear (overlaps dedupe later)
  const qpx = t.ax - s.ax, qpy = t.ay - s.ay;
  const u = (qpx * sdy - qpy * sdx) / denom;
  const v = (qpx * rdy - qpy * rdx) / denom;
  const m = 1e-6;
  if (u <= m || u >= 1 - m || v <= m || v >= 1 - m) return null;
  return [s.ax + u * rdx, s.ay + u * rdy];
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  const [x, y] = p;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
