// Cupcake wrapper — craft Tags & Wraps (docs/craft-dielines-catalog.md §B).
// The decorative scalloped collar that wraps a cupcake.
//
// A cupcake wrapper is the lateral surface of a truncated cone (frustum), open
// at both ends. Unrolled flat it is an ANNULAR SECTOR (a ring sector):
//   • inner arc (radius ρb) ← the BASE circle (smaller, sits down)
//   • outer arc (radius ρt) ← the TOP circle (wider, flares out) — SCALLOPED
//   • two straight radial edges; one carries the glue-overlap seam.
//
// Derivation (rb,rt = base/top radii, s = slant height):
//   ρb = s·rb/(rt−rb),  ρt = s·rt/(rt−rb),  θ = 2π·(rt−rb)/s
//   (so inner arc length = 2π·rb and outer arc length = 2π·rt — the two
//    circumferences — and ρt−ρb = s, the slant). Requires rt > rb (a flared
//    cup); s is clamped so the sector stays under a full turn (θ ≤ 1.9π).
//
// FLAT item (`has3DPreview:false`, `flat:true`): it ROLLS into a cone (a wrap,
// not a crease-fold) — no fold lines, just the glue seam. A 3D cone is a future
// enhancement. All three dims are meaningful (base ⌀, top ⌀, height).
//
// All geometry in POINTS, top-left origin, y-down. Pure functional geometry
// (a frustum unroll + generic scallops) — no traced artwork.
//
// Dimension semantics: editor L → base ⌀ · editor W → top ⌀ · editor H → height.

import { Dieline, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { scallopEdge } from "../craft";

export interface CupcakeWrapperParams {
  baseDia: number;   // bottom (base) diameter (pt)
  topDia: number;    // top diameter (pt) — wider than the base
  height: number;    // slant height (pt)
  thickness: number; // caliper (pt) — unused today, kept for parity
  bleed: number;     // bleed margin (pt)
  scallopW: number;  // target scallop width along the top arc (pt)
  glueTab: number;   // glue-overlap seam width (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const line = (a: Pt, b: Pt): Polyline => ({ pts: [a, b], closed: false });

export function defaultParams(baseDia: number, topDia: number, height: number, thickness = inToPt(0.012)): CupcakeWrapperParams {
  return {
    baseDia, topDia, height, thickness,
    bleed: inToPt(0.0625),
    scallopW: mmToPt(12),
    glueTab: mmToPt(10),
  };
}

/** Frustum-unroll parameters + the scalloped TOP rim in polar (φ from +Y,
 *  ρ from the apex). The 3D renderer (bespoke cone in box3d/cupcake3d.ts) maps
 *  this onto the cone; deriving it here keeps the flat dieline and the 3D in
 *  sync (the scalloped flat edge becomes the scalloped rim automatically). */
export interface CupcakeUnroll {
  rb: number; rt: number;       // base / top cone radii (pt)
  hv: number;                   // vertical cone height = √(s² − (rt−rb)²) (pt)
  rhoB: number; rhoT: number;   // flat inner / outer arc radii (pt)
  theta: number;                // sector angle (rad)
  rim: { phi: number; rho: number }[]; // scalloped top edge, apex-relative polar
}

export function cupcakeUnroll(p: CupcakeWrapperParams): CupcakeUnroll {
  const rb = p.baseDia / 2;
  const rt = Math.max(p.topDia / 2, rb * 1.05);
  const denom = rt - rb;
  const s = Math.max(p.height, denom / 0.95);
  const rhoB = (s * rb) / denom, rhoT = (s * rt) / denom;
  const theta = (2 * Math.PI * denom) / s;
  const h = theta / 2;
  const hv = Math.sqrt(Math.max(s * s - denom * denom, 0));
  const pt = (rho: number, phi: number): Pt => [rho * Math.sin(phi), rho * Math.cos(phi)];
  // Walk the scalloped outer edge +h→−h, recording each point in polar.
  const nS = Math.max(6, Math.round((theta * rhoT) / Math.max(p.scallopW, mmToPt(4))));
  const rim: { phi: number; rho: number }[] = [];
  for (let j = 0; j < nS; j++) {
    const fa = h - (theta * j) / nS, fb = h - (theta * (j + 1)) / nS;
    const bump = scallopEdge(pt(rhoT, fa), pt(rhoT, fb), { count: 1, segments: 8 });
    for (const [x, y] of bump.slice(j === 0 ? 0 : 1)) rim.push({ phi: Math.atan2(x, y), rho: Math.hypot(x, y) });
  }
  return { rb, rt, hv, rhoB, rhoT, theta, rim };
}

export function buildCupcakeWrapper(p: CupcakeWrapperParams): Dieline {
  const rb = p.baseDia / 2;
  const rt = Math.max(p.topDia / 2, rb * 1.05);     // top must flare past the base
  const denom = rt - rb;
  // Keep the sector under ~0.95 of a full turn: θ = 2π·denom/s ≤ 1.9π ⇒ s ≥ denom/0.95.
  const s = Math.max(p.height, denom / 0.95);
  const rhoB = (s * rb) / denom;                    // inner arc radius (base)
  const rhoT = (s * rt) / denom;                    // outer arc radius (top)
  const theta = (2 * Math.PI * denom) / s;          // sector angle
  const h = theta / 2;

  // Polar → cartesian, apex at origin, φ measured from +Y (downward).
  const pt = (rho: number, phi: number): Pt => [rho * Math.sin(phi), rho * Math.cos(phi)];

  // ---- CUT outline (one closed polyline) ----
  // inner arc (plain, base) −h→+h, then the radial R edge + outer SCALLOPED arc
  // +h→−h (bumps bulge OUTWARD when travelling in decreasing-φ), radial L closes.
  const pts: Pt[] = [];
  const nInner = Math.max(28, Math.round((theta * rhoB) / mmToPt(6)));
  for (let k = 0; k <= nInner; k++) pts.push(pt(rhoB, -h + (theta * k) / nInner));

  const nS = Math.max(6, Math.round((theta * rhoT) / Math.max(p.scallopW, mmToPt(4))));
  for (let j = 0; j < nS; j++) {
    const fa = h - (theta * j) / nS;
    const fb = h - (theta * (j + 1)) / nS;
    const bump = scallopEdge(pt(rhoT, fa), pt(rhoT, fb), { count: 1, segments: 8 });
    for (const q of bump.slice(j === 0 ? 0 : 1)) pts.push(q);
  }
  // closing segment → pts[0] = pt(rhoB,−h) is the left radial edge.

  // ---- GLUE: the overlap seam, a radial fan along the LEFT edge ----
  const glue: Polyline[] = [];
  const delta = Math.min(p.glueTab / rhoT, theta * 0.3);
  for (let i = 1; i <= 5; i++) {
    const phi = -h + (delta * i) / 6;
    glue.push(line(pt(rhoB, phi), pt(rhoT, phi)));
  }

  // ---- translate so all coords ≥ 0 ----
  let minX = Infinity, minY = Infinity;
  for (const [x, y] of pts) { if (x < minX) minX = x; if (y < minY) minY = y; }
  const m = mmToPt(1);
  const tx = -minX + m, ty = -minY + m;
  const T = (q: Pt): Pt => [q[0] + tx, q[1] + ty];
  const outline: Polyline = { pts: pts.map(T), closed: true };
  for (const g of glue) g.pts = g.pts.map(T);

  let maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of outline.pts) { if (x > maxX) maxX = x; if (y > maxY) maxY = y; }

  // ---- slant-height dimension (along φ=0, the centre radial) ----
  const dims: DimLine[] = [
    { x1: tx, y1: rhoB + ty, x2: tx, y2: rhoT + ty, key: "H", vertical: true },
  ];

  return {
    paths: { cut: [outline], crease: [], bleed: [bleedFromCut(outline, p.bleed)], glue },
    widthPt: maxX + m,
    heightPt: maxY + m,
    bleedPt: p.bleed,
    labels: [],
    dims,
  };
}
