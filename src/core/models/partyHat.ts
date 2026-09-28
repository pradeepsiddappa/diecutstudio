// Party Hat — Party category (docs/craft-dielines-catalog.md).
//
// A cone hat unrolled to an ANNULAR SECTOR (vertex at the top, base arc at
// the bottom). Derived from the same frustum-unroll math as the cupcake
// wrapper but with ρb = 0 (a pointed hat — no inner circle).
//
//   slant height  s = √(r² + h²)    (r = head radius, h = hat height)
//   sector angle  θ = 2π·r / s
//
// Optional SCALLOP on the base arc; two CHIN-STRAP HOLES near the straight
// edges. FLAT item (rolls/folds at assembly, no flat fold crease).
//
// All geometry in POINTS, top-left origin, y-down. Pure functional geometry.
//
// Dimension semantics:
//   editor L → head diameter D   params.headDia
//   editor W → hat height        params.height
//   editor H → unused (hidden)

import { Dieline, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { circleCut, scallopEdge } from "../craft";

export type HatEdge = "straight" | "scallop";

export interface PartyHatParams {
  headDia: number;       // head opening diameter (pt)
  height: number;        // hat height — vertical (pt)
  thickness: number;     // caliper (pt) — kept for parity
  bleed: number;
  edge: HatEdge;
  scallopW: number;      // target scallop bump width along the arc (pt)
  chinHole: boolean;     // include chin-strap holes
  chinHoleDia: number;   // chin-strap hole diameter (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(headDia: number, height: number, thickness = inToPt(0.012)): PartyHatParams {
  return {
    headDia, height, thickness,
    bleed: inToPt(0.0625),
    edge: "scallop",
    scallopW: mmToPt(14),
    chinHole: true,
    chinHoleDia: mmToPt(5),
  };
}

export function buildPartyHat(p: PartyHatParams): Dieline {
  const r = Math.max(p.headDia / 2, inToPt(1));
  const h = clamp(p.height, inToPt(2), inToPt(20));
  const s = Math.sqrt(r * r + h * h);          // slant height
  const theta = 2 * Math.PI * r / s;           // total sector angle
  const hTheta = theta / 2;                    // half-angle

  // Polar → cartesian, vertex at origin, φ from +Y (downward in y-down coords).
  // Shift so bounding box starts at x = 0: offX = s·sin(hTheta).
  const offX = s * Math.sin(hTheta);
  const pt = (rho: number, phi: number): Pt => [offX + rho * Math.sin(phi), rho * Math.cos(phi)];

  const vertex: Pt = [offX, 0];               // hat tip at top-centre
  const rightEnd = pt(s, hTheta);             // right straight edge base
  // leftEnd = pt(s, -hTheta) — final arc point, the close completes the left edge

  // ---- build outline (vertex → right edge → arc right→left → left edge close) ----
  // Arc sweeps right (+hTheta) to left (-hTheta): "left of travel" = outward ✓
  const pts: Pt[] = [vertex, rightEnd];

  if (p.edge === "scallop") {
    const arcLen = theta * s;
    const nS = Math.max(4, Math.round(arcLen / Math.max(p.scallopW, mmToPt(8))));
    for (let i = 0; i < nS; i++) {
      const phi1 = hTheta - (theta * i) / nS;
      const phi2 = hTheta - (theta * (i + 1)) / nS;
      const a = pt(s, phi1);
      const b = pt(s, phi2);
      const bump = scallopEdge(a, b, { count: 1, segments: 12 });
      for (const q of bump.slice(i === 0 ? 0 : 1)) pts.push(q);
    }
  } else {
    const nArc = Math.max(40, Math.round(theta * s / mmToPt(3)));
    for (let i = 0; i <= nArc; i++) {
      const phi = hTheta - (theta * i) / nArc;
      pts.push(pt(s, phi));
    }
  }
  // Closure from pts.last (= leftEnd) back to vertex = the left straight edge ✓

  const outline: Polyline = { pts, closed: true };
  const cut: Polyline[] = [outline];

  // ---- chin-strap holes ----
  // Holes must land on OPPOSITE sides of the ASSEMBLED cone (left ear / right ear).
  // On the cone the azimuth of a flat point at angle φ is φ·(2π/θ), so φ = θ/4
  // maps to azimuth π/2 = left side, and φ = -θ/4 maps to right side.
  if (p.chinHole) {
    const hRho = s * 0.93;             // 93% up the slant from apex
    const hPhi = hTheta / 2;          // θ/4 from centreline → ±90° on the cone
    const lh = pt(hRho, -hPhi);
    const rh = pt(hRho, hPhi);
    cut.push(circleCut(lh[0], lh[1], p.chinHoleDia));
    cut.push(circleCut(rh[0], rh[1], p.chinHoleDia));
  }

  // ---- glue seam strip along the right straight edge ----
  // The hat is assembled by gluing/taping the two straight radial edges.
  // Mark a 10 mm wide strip on the RIGHT edge as the glue zone.
  const glueW = mmToPt(10);
  const nGlue = 20;
  const gluePts: Pt[] = [];
  for (let i = 0; i <= nGlue; i++) {
    const rho = (i / nGlue) * s;
    gluePts.push(pt(rho, hTheta));
  }
  for (let i = nGlue; i >= 0; i--) {
    const rho = (i / nGlue) * s;
    // offset a bit to the LEFT of the right edge (into the hat face)
    const phi = hTheta - glueW / s;
    gluePts.push(pt(rho, phi));
  }
  const glueStrip: Polyline = { pts: gluePts, closed: true };

  // ---- bounding box from actual pts ----
  let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const widthPt = maxX - minX;
  const heightPt = maxY; // vertex is at y=0

  const bleed = bleedFromCut(outline, p.bleed);

  return {
    paths: { cut, crease: [], bleed: [bleed], glue: [glueStrip] },
    widthPt,
    heightPt,
    bleedPt: p.bleed,
    labels: [],
    dims: [],
  };
}

// Export geometry data for the 3D bespoke renderer.
export interface PartyHatUnroll {
  r: number;   // base radius (pt)
  h: number;   // hat height (pt)
  s: number;   // slant height (pt)
  theta: number; // sector angle (rad)
}

export function partyHatUnroll(p: PartyHatParams): PartyHatUnroll {
  const r = Math.max(p.headDia / 2, inToPt(1));
  const h = Math.max(p.height, inToPt(2));
  const s = Math.sqrt(r * r + h * h);
  const theta = 2 * Math.PI * r / s;
  return { r, h, s, theta };
}
