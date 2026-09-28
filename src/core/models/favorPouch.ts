// Pyramid Favor Box — craft Party & Events (party batch #2).
// docs/craft-dielines-catalog.md §D ("favor pouch / pyramid box").
//
// A SQUARE-BASED pyramid favour box: a square base with four triangular walls,
// one hinged on each base edge, that fold UP to meet at a point. A small
// chamfered GLUE TAB on each wall's trailing slant edge laps onto the next wall
// to hold the pyramid closed. Folds flat; holds candy / favors / small gifts.
//
// Net (flat): a central square (the base) + 4 isosceles triangles around it (a
// pinwheel), each with a glue tab on one slant edge.
//   cut    = the single outer perimeter (slant edges + tab bumps)
//   crease = 4 base edges (wall hinges) + 4 tab folds = 8
//   glue   = the 4 tabs
//
// Geometry: base side b, pyramid height Hp → each face is an isosceles triangle
// of height = the pyramid SLANT height `s = √((b/2)² + Hp²)`. Flat bbox is a
// `(b + 2·s)` square (the four apexes define the extent).
//
// FLAT die-cut with a bespoke square-pyramid 3D preview (pyramidPouchFoldable).
// Cut many-up: `preferSheetExport: true`.
//
// All geometry in POINTS, top-left origin, y-down. Pure functional pyramid
// geometry — no traced artwork.
//
// Dimension semantics (editor mapping):
//   editor L → base edge `b`        params.b
//   editor W → pyramid height `Hp`  params.h
//   editor H → unused (hidden)

import { Dieline, Polyline } from "../types";
import { bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";

export interface FavorPouchParams {
  b: number;          // base edge (pt)
  h: number;          // pyramid height (pt)
  thickness: number;  // caliper (pt) — unused today, kept for parity
  bleed: number;      // bleed margin (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
type P = [number, number];

export function defaultParams(b: number, h: number, thickness = inToPt(0.012)): FavorPouchParams {
  return { b, h, thickness, bleed: inToPt(0.0625) };
}

// Shared so the 3D renderer builds the SAME pyramid (base + slant) as the net.
export function pyramidGeom(b: number, h: number) {
  return { b, h, slant: Math.hypot(b / 2, h) };
}

export function buildFavorPouch(p: FavorPouchParams): Dieline {
  const b = Math.max(p.b, inToPt(1));
  const Hp = Math.max(p.h, inToPt(0.5));
  const { slant } = pyramidGeom(b, Hp);
  const hb = b / 2;

  // Square base centred at the origin; each wall's apex is `slant` out from its
  // base-edge midpoint (so a folded wall reaches the pyramid apex).
  const TL: P = [-hb, -hb], TR: P = [hb, -hb], BR: P = [hb, hb], BL: P = [-hb, hb];
  const apexT: P = [0, -hb - slant];
  const apexR: P = [hb + slant, 0];
  const apexB: P = [0, hb + slant];
  const apexL: P = [-hb - slant, 0];

  // glue-tab geometry (a chamfered trapezoid on each wall's trailing edge)
  const d = clamp(slant * 0.14, mmToPt(5), mmToPt(10));   // tab depth
  const gEnd = clamp(slant * 0.1, mmToPt(3), mmToPt(6));  // inset from each edge end
  const chamf = d * 0.5;

  const sub = (a: P, c: P): P => [a[0] - c[0], a[1] - c[1]];
  const add = (a: P, c: P): P => [a[0] + c[0], a[1] + c[1]];
  const mul = (a: P, s: number): P => [a[0] * s, a[1] * s];
  const norm = (a: P): P => { const L = Math.hypot(a[0], a[1]) || 1; return [a[0] / L, a[1] / L]; };

  const outline: P[] = [TL];
  const creases: Polyline[] = [];
  const glue: Polyline[] = [];

  // One wall, clockwise: previous point = cLead → apex (plain slant edge) →
  // cTrail (slant edge carrying the glue tab). cLead picks the OUTWARD normal.
  function wall(cLead: P, apex: P, cTrail: P) {
    outline.push(apex);
    const eh = norm(sub(cTrail, apex));                    // along the trailing edge
    const mid = mul(add(apex, cTrail), 0.5);
    let n: P = [-eh[1], eh[0]];                            // tab normal — point OUTWARD
    if (n[0] * (mid[0] - cLead[0]) + n[1] * (mid[1] - cLead[1]) < 0) n = [eh[1], -eh[0]];
    const P1 = add(apex, mul(eh, gEnd));                   // tab start on the edge
    const Pc = sub(cTrail, mul(eh, gEnd));                 // tab end on the edge
    const P1o = add(add(P1, mul(n, d)), mul(eh, chamf));   // outer corners (drag chamfer)
    const P2o = add(sub(Pc, mul(eh, chamf)), mul(n, d));
    outline.push(P1, P1o, P2o, Pc, cTrail);
    creases.push({ pts: [P1, Pc], closed: false });        // tab fold (along the edge)
    glue.push({ pts: [P1, P1o, P2o, Pc], closed: true });  // the glue tab
  }
  wall(TL, apexT, TR);
  wall(TR, apexR, BR);
  wall(BR, apexB, BL);
  wall(BL, apexL, TL);
  outline.pop(); // last cTrail duplicates the start TL — drop it

  // base-edge hinges (the four wall folds)
  creases.push({ pts: [TL, TR], closed: false });
  creases.push({ pts: [TR, BR], closed: false });
  creases.push({ pts: [BR, BL], closed: false });
  creases.push({ pts: [BL, TL], closed: false });

  // shift to a 0-origin
  const xs = outline.map((q) => q[0]), ys = outline.map((q) => q[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const ox = -minX, oy = -minY;
  const sh = (q: P): P => [q[0] + ox, q[1] + oy];
  const shPL = (pl: Polyline): Polyline => ({ ...pl, pts: pl.pts.map(sh) });

  const cut: Polyline = { pts: outline.map(sh), closed: true };

  // No dimension arrows: editor L/W are the finished base/height, not the flat
  // net's span (b + 2·slant), so an on-canvas dim would mislead (cf. the
  // rosette). The top-bar flat-size readout gives the accurate net size.
  return {
    paths: { cut: [cut], crease: creases.map(shPL), bleed: [bleedFromCut(cut, p.bleed)], glue: glue.map(shPL) },
    widthPt: maxX - minX,
    heightPt: maxY - minY,
    bleedPt: p.bleed,
    labels: [],
    dims: [],
  };
}
