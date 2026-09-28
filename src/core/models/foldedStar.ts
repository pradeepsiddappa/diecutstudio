// 3D Folded Star — craft Decorations (decor batch #2; replaces the removed rose).
// docs/craft-dielines-catalog.md §F ("3D star (folded)").
//
// A flat N-point star scored from the centre to every vertex: the lines to the
// TIPS are MOUNTAIN folds, the lines to the INNER notches are VALLEY folds.
// Fold them and the star pops into a dimensional star — each point a raised
// ridge. A hang hole in one point for an ornament.
//
// Dieline: the star OUTLINE (cut) + `2·points` radial SCORES (crease) + a hang
// hole. FLAT die-cut item with a bespoke folded-star 3D (`foldedStarFoldable`):
// the facets all meet at the centre (a closed fan = a cycle), which the Fold
// Engine deliberately can't do (it needs a tree), so the 3D is hand-built.
// Cut many-up: `preferSheetExport: true`.
//
// All geometry in POINTS, top-left origin, y-down. Pure generated star geometry
// — no traced artwork.
//
// Dimension semantics (editor mapping):
//   editor L → star DIAMETER (tip to tip across)  params.D
//   editor W / H → unused (hidden)

import { Dieline, Polyline } from "../types";
import { bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { circleCut } from "../craft";

export interface FoldedStarParams {
  D: number;          // outer (tip) diameter (pt)
  thickness: number;  // caliper (pt) — unused today, kept for parity
  bleed: number;      // bleed margin (pt)
}

const TAU = Math.PI * 2;

// Shared so the 3D builds the SAME star (diecut ⇄ render can't desync).
export const STAR_POINTS = 5;
export const STAR_INNER_RATIO = 0.4; // inner-notch radius / tip radius

export function defaultParams(D: number, thickness = inToPt(0.012)): FoldedStarParams {
  return { D, thickness, bleed: inToPt(0.0625) };
}

// The 2·points boundary vertices (alternating tip / inner), in a centre-origin
// frame; tip 0 points UP (−y). Shared by the diecut and the 3D.
export function starVertices(R: number): { x: number; y: number; tip: boolean }[] {
  const n = STAR_POINTS * 2;
  const innerR = R * STAR_INNER_RATIO;
  const out: { x: number; y: number; tip: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const tip = i % 2 === 0;
    const rad = tip ? R : innerR;
    const ang = -Math.PI / 2 + (i / n) * TAU;
    out.push({ x: rad * Math.cos(ang), y: rad * Math.sin(ang), tip });
  }
  return out;
}

export function buildFoldedStar(p: FoldedStarParams): Dieline {
  const D = Math.max(p.D, inToPt(2));
  const R = D / 2;
  const v = starVertices(R);                    // centre-origin, 10 verts
  const n = v.length;
  const tabDepth = R * 0.13;                     // glue-flap depth

  // Trace the outline; on each tip→inner edge (i even) splice a GLUE TAB sticking
  // outward, with a fold score at its base — fold it under and glue to the other
  // half. You cut TWO of these and join them back-to-back into a full 3D star.
  type P = [number, number];
  const out: P[] = [];
  const tabBaseC: [P, P][] = [];                 // tab fold lines (centre-origin)
  const tabPolyC: P[][] = [];                    // tab glue polygons
  for (let i = 0; i < n; i++) {
    const A = v[i], B = v[(i + 1) % n];
    out.push([A.x, A.y]);
    if (i % 2 === 0) {                           // A is a tip → this edge gets a tab
      let dx = B.x - A.x, dy = B.y - A.y;
      const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      let nx = -dy, ny = dx;                      // edge normal
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; } // point it OUTWARD (away from centre)
      const inset = L * 0.16;                     // trapezoid taper
      const p1: P = [A.x + nx * tabDepth + dx * inset, A.y + ny * tabDepth + dy * inset];
      const p2: P = [B.x + nx * tabDepth - dx * inset, B.y + ny * tabDepth - dy * inset];
      out.push(p1, p2);
      tabBaseC.push([[A.x, A.y], [B.x, B.y]]);
      tabPolyC.push([[A.x, A.y], p1, p2, [B.x, B.y]]);
    }
  }

  const minX = Math.min(...out.map((q) => q[0])), maxX = Math.max(...out.map((q) => q[0]));
  const minY = Math.min(...out.map((q) => q[1])), maxY = Math.max(...out.map((q) => q[1]));
  const ox = -minX, oy = -minY;                  // shift so the bbox starts at 0
  const cx = ox, cy = oy;                         // the star centre
  const sh = (q: P): P => [q[0] + ox, q[1] + oy];

  const outline: Polyline = { pts: out.map(sh), closed: true };

  // Radial scores: centre → every star vertex (tips = mountain, inners = valley).
  const radial: Polyline[] = v.map((q, i) => ({
    pts: [[cx, cy], [q.x + ox, q.y + oy]] as P[],
    closed: false,
    id: `score-${i}`,
  }));
  // Tab fold lines (the tab bases) — a separate set of creases.
  const tabFolds: Polyline[] = tabBaseC.map((seg, i) => ({ pts: seg.map(sh), closed: false, id: `tab-fold-${i}` }));
  const crease: Polyline[] = [...radial, ...tabFolds];

  // Glue: the tab polygons (fold under, glue to the matching edge of the 2nd half).
  const glue: Polyline[] = tabPolyC.map((poly) => ({ pts: poly.map(sh), closed: true }));

  // Hang hole near the top point's tip (vertex 0 points up).
  const top = v[0];
  const hd = mmToPt(3.5);
  const hy = top.y + oy + R * 0.12;
  const cut: Polyline[] = [outline, circleCut(cx, hy, hd)];

  // No dimension arrows: the editor L (tip diameter) is the input; the star bbox
  // isn't a clean rectangle — the top-bar flat-size readout is accurate.
  return {
    paths: { cut, crease, bleed: [bleedFromCut(outline, p.bleed)], glue },
    widthPt: maxX - minX,
    heightPt: maxY - minY,
    bleedPt: p.bleed,
    labels: [],
    dims: [],
  };
}
