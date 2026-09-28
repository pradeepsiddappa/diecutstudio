// Fold Engine v2 — SOLVER. See docs/fold-engine.md.
//
// Takes a PanelGraph (from panelize) + a FoldSpec (the per-model fold data)
// and produces rigid-body transforms for every panel at any fold amount t
// (t = 0 closed … 1 open, matching the UI slider).
//
// Composition is classic rigid-origami: every panel starts in the flat plane;
// a panel's world transform is its parent's transform composed with a
// rotation about the connecting hinge LINE (in flat coordinates):
//   T_child = T_parent ∘ R(hingeLine, θ(t))
// Flat (x, y) [y-down] maps to 3D as (x, -y, 0) — the sheet stands upright in
// the XY plane facing +Z, so the root panel reads like a box front.
//
// Pure math (no three.js) so the fold itself is unit-testable in node — e.g.
// "fold to t=0 and the bounding box must be L × H × W".

import { Pt } from "../geometry";
import { PanelGraph, pointInPolygon } from "./panelize";

export interface HingeSpec {
  /** Target fold angle in RADIANS, signed (right-hand rule about the hinge
   *  axis p0→p1 as canonicalized by panelize). Applied fully at t=0 (closed). */
  angle: number;
  /** Slider window for staggered folding (defaults 0..1). */
  t0?: number;
  t1?: number;
  ease?: "linear" | "smooth";
  /** Angle at the OPEN end (t=1), default 0 (fully unfolded / coplanar). Set
   *  non-zero to let a flap rest past the unfolded plane — e.g. a lid that
   *  leans BACK past vertical instead of stopping straight up. */
  openAngle?: number;
  /** Always fully folded regardless of t (the carton tube's body creases). */
  fixed?: boolean;
  /** Stacking hint (× board layer) for overlapping flaps — used by the
   *  renderer, ignored by the solver. */
  layer?: number;
}

export interface FoldSpec {
  /** A point INSIDE the root panel (stays fixed; everything folds off it). */
  root: Pt;
  /** The root panel is a FLOOR (tray base): the renderer lays it horizontal,
   *  cavity up, instead of the default upright box-front orientation. */
  floor?: boolean;
  /** Keyed by crease id (Polyline.id set by the model). Every hinge must have
   *  an entry — prepare() throws listing any missing ids. */
  hinges: Record<string, HingeSpec>;
}

export interface FoldModel {
  graph: PanelGraph;
  spec: FoldSpec;
  rootPanel: number;
  /** For each panel: the hinge connecting it to its parent (null for root)
   *  and whether the panel is hinge.a (affects nothing — kept for debug). */
  parentHinge: (number | null)[];
  /** Panels in BFS order from the root (parents always precede children). */
  order: number[];
}

// ---- minimal affine 3D (row-major 3×4: [r00 r01 r02 tx, r10.., r20..]) ----
export type Mat = Float64Array;

export const matIdentity = (): Mat =>
  new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);

export function matMul(A: Mat, B: Mat): Mat {
  const M = new Float64Array(12);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      M[r * 4 + c] = A[r * 4] * B[c] + A[r * 4 + 1] * B[4 + c] + A[r * 4 + 2] * B[8 + c];
    }
    M[r * 4 + 3] = A[r * 4] * B[3] + A[r * 4 + 1] * B[7] + A[r * 4 + 2] * B[11] + A[r * 4 + 3];
  }
  return M;
}

export function matApply(M: Mat, x: number, y: number, z: number): [number, number, number] {
  return [
    M[0] * x + M[1] * y + M[2] * z + M[3],
    M[4] * x + M[5] * y + M[6] * z + M[7],
    M[8] * x + M[9] * y + M[10] * z + M[11],
  ];
}

/** Rotation about the line through point a with unit direction u (Rodrigues). */
export function matRotAboutLine(ax: number, ay: number, az: number, ux: number, uy: number, uz: number, ang: number): Mat {
  const c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
  // rotation part
  const r00 = t * ux * ux + c, r01 = t * ux * uy - s * uz, r02 = t * ux * uz + s * uy;
  const r10 = t * ux * uy + s * uz, r11 = t * uy * uy + c, r12 = t * uy * uz - s * ux;
  const r20 = t * ux * uz - s * uy, r21 = t * uy * uz + s * ux, r22 = t * uz * uz + c;
  // translation = a - R·a
  const tx = ax - (r00 * ax + r01 * ay + r02 * az);
  const ty = ay - (r10 * ax + r11 * ay + r12 * az);
  const tz = az - (r20 * ax + r21 * ay + r22 * az);
  return new Float64Array([r00, r01, r02, tx, r10, r11, r12, ty, r20, r21, r22, tz]);
}

/** Map flat dieline coords (x, y-down) into 3D: (x, -y, 0). */
export const flatTo3D = (p: Pt): [number, number, number] => [p[0], -p[1], 0];

// ---- prepare: root + BFS tree + spec validation ----

export function prepare(graph: PanelGraph, spec: FoldSpec): FoldModel {
  const rootPanel = graph.panels.findIndex((p) => pointInPolygon(spec.root, p.outline));
  if (rootPanel < 0) throw new Error("fold: spec.root is not inside any panel");

  const parentHinge: (number | null)[] = graph.panels.map(() => null);
  const order: number[] = [rootPanel];
  const seen = new Set<number>([rootPanel]);
  const missing: string[] = [];
  for (let qi = 0; qi < order.length; qi++) {
    const p = order[qi];
    graph.hinges.forEach((h, hi) => {
      const o = h.a === p ? h.b : h.b === p ? h.a : -1;
      if (o < 0 || seen.has(o)) return;
      seen.add(o);
      order.push(o);
      parentHinge[o] = hi;
      const id = h.creaseId;
      if (!id || !spec.hinges[id]) missing.push(id ?? `<unnamed hinge ${hi}>`);
    });
  }
  if (missing.length) {
    throw new Error(`fold: hinges without a FoldSpec entry: ${missing.join(", ")}`);
  }
  return { graph, spec, rootPanel, parentHinge, order };
}

// ---- angles + transforms at a fold amount ----

export function hingeAngleAt(s: HingeSpec, t: number): number {
  if (s.fixed) return s.angle;
  const t0 = s.t0 ?? 0, t1 = s.t1 ?? 1;
  const p = Math.max(0, Math.min(1, (t - t0) / Math.max(t1 - t0, 1e-9)));
  const e = s.ease === "linear" ? p : p * p * (3 - 2 * p); // smoothstep default
  const open = s.openAngle ?? 0;
  return s.angle + (open - s.angle) * e; // t=0 → folded (angle), t=1 → open (default 0)
}

/** World transform per panel (indexed by panel id) at fold amount t. */
export function transformsAt(model: FoldModel, t: number): Mat[] {
  const { graph, spec } = model;
  const M: Mat[] = graph.panels.map(() => matIdentity());
  for (const pi of model.order) {
    const hi = model.parentHinge[pi];
    if (hi == null) continue; // root
    const h = graph.hinges[hi];
    const parent = h.a === pi ? h.b : h.a;
    const s = spec.hinges[h.creaseId!];
    const [ax, ay, az] = flatTo3D(h.p0);
    const [bx, by, bz] = flatTo3D(h.p1);
    let ux = bx - ax, uy = by - ay, uz = bz - az;
    const len = Math.hypot(ux, uy, uz) || 1;
    ux /= len; uy /= len; uz /= len;
    const R = matRotAboutLine(ax, ay, az, ux, uy, uz, hingeAngleAt(s, t));
    M[pi] = matMul(M[parent], R);
  }
  return M;
}

/** All panel outline points in world space at fold t — for tests + renderer. */
export function foldedPoints(model: FoldModel, t: number): [number, number, number][] {
  const M = transformsAt(model, t);
  const out: [number, number, number][] = [];
  model.graph.panels.forEach((p, pi) => {
    for (const pt of p.outline) {
      const [x, y, z] = flatTo3D(pt);
      out.push(matApply(M[pi], x, y, z));
    }
  });
  return out;
}

export function foldedBBox(model: FoldModel, t: number) {
  const pts = foldedPoints(model, t);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) {
    for (let i = 0; i < 3; i++) {
      if (p[i] < min[i]) min[i] = p[i];
      if (p[i] > max[i]) max[i] = p[i];
    }
  }
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}
