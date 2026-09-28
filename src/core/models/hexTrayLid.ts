// Hexagon Box + Lid — a TWO-PIECE openable hexagonal box: a hexagonal base tray
// (open top, glued bottom) + a slightly larger hexagonal lid tray that
// telescopes down over it. This is the *openable* hexagon (the single-piece
// `hexBox` is glued shut at both ends). Same two-piece machinery as the Tray +
// Lid model (`Dieline.pieces`), but on a hexagonal footprint.
//
// Each piece is an OPEN hexagonal tray: 6 walls in a row + infold triangular
// flaps on ONE end only (the closed/glued end). Edge-to-centre triangles tile
// the hexagon, and they extend past centre to overlap & glue (the same holding
// trick as `hexBox`). The base's closed end is its floor; the lid's closed end
// is its top (it's inverted in use).
//
// Nesting: the lid footprint = base footprint + fit (2·thickness + clearance),
// so the lid slips over the base with a telescope gap — same +2t reasoning as
// the rectangular Tray + Lid.
//
// All geometry in POINTS. Pure regular-polygon math — no proprietary file.

import { Dieline, DieLabel, DimLine, Polyline } from "../types";
import { Pt } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { hexDetails } from "./hexBox";

export interface HexTrayLidParams {
  L: number;          // base overall length, long axis (pt)
  W: number;          // base overall width, short axis (pt)
  H: number;          // base height (pt)
  thickness: number;  // material caliper (pt)
  bleed: number;      // bleed margin (pt)
  glue: number;       // tube glue-flap width (pt)
  relief: number;     // slit between adjacent flaps (pt)
  clearance: number;  // telescope gap between base outer and lid inner (pt)
  lidDepth: number;   // lid wall height (full telescope = H) (pt)
  gap: number;        // spacing between the two flats on the sheet (pt)
}

const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

export function defaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): HexTrayLidParams {
  return {
    L, W, H, thickness,
    bleed: inToPt(0.125),
    glue: Math.min(inToPt(0.5), W * 0.6),
    relief: Math.max(thickness, mmToPt(1.5)),
    clearance: mmToPt(0.8),
    lidDepth: H,        // full telescope: lid as deep as the base
    gap: mmToPt(16),
  };
}

// One OPEN hexagonal tray (6 walls + infold flaps on the bottom only).
// Returned in local coords with the top-left at (0,0). dy shifts it on the sheet.
interface TrayPart { cut: Polyline; crease: Polyline[]; glue: Polyline[]; widthPt: number; heightPt: number; root: { x: number; y: number; w: number; h: number } }

function hexTrayPart(L: number, W: number, H: number, g: number, relief: number): TrayPart {
  const { walls } = hexDetails(L, W);
  const apos = walls.map((w) => w.apo);
  const overlap = Math.min(Math.min(...apos) * 0.18, mmToPt(6));
  const botRegion = Math.max(...apos) + overlap;
  const TB = 0;          // open top (wall top edge)
  const BB = H;          // wall bottom
  const heightPt = H + botRegion;

  const xg = g;
  const xb: number[] = [xg];
  for (const w of walls) xb.push(xb[xb.length - 1] + w.w);
  const widthPt = xb[xb.length - 1];
  const gt = Math.min(H * 0.1, inToPt(0.2));

  // ---- CUT: open top, glued infold bottom ----
  const pts: Pt[] = [];
  const P = (x: number, y: number) => pts.push([x, y]);
  P(0, TB + gt);
  P(gt, TB);
  P(widthPt, TB);            // straight open top edge
  P(widthPt, BB);            // right edge down
  for (let i = walls.length - 1; i >= 0; i--) {
    const xa = xb[i], xc = xb[i + 1], mid = (xa + xc) / 2;
    P(xc - relief / 2, BB);
    P(mid, BB + apos[i] + overlap);
    P(xa + relief / 2, BB);
    P(xa, BB);
  }
  P(gt, BB);
  P(0, BB - gt);
  const cut: Polyline = { pts, closed: true };

  // ---- CREASE: 6 vertical (glue + 5 inter-wall) + 6 bottom flap folds ----
  const crease: Polyline[] = [];
  const vIds = ["glue-w0", "w0-w1", "w1-w2", "w2-w3", "w3-w4", "w4-w5"];
  for (let i = 0; i < xb.length - 1; i++) crease.push(line([xb[i], TB], [xb[i], BB], vIds[i]));
  for (let i = 0; i < walls.length; i++) crease.push(line([xb[i], BB], [xb[i + 1], BB], `w${i}-bottom`));

  // ---- GLUE: tube seam (diagonal) + bottom flap hatch ----
  const glue: Polyline[] = [];
  const step = inToPt(0.12);
  const gh = BB - TB;
  for (let c = -gh; c < xg; c += step) {
    const xs = Math.max(0, c), ys = TB + (xs - c);
    const xe = Math.min(xg, c + gh), ye = TB + (xe - c);
    if (xe > xs) glue.push(line([xs, ys], [xe, ye]));
  }
  const hstep = inToPt(0.1);
  for (let i = 0; i < walls.length; i++) {
    const xa = xb[i], xc = xb[i + 1], mid = (xa + xc) / 2;
    const apexY = BB + apos[i] + overlap;
    const ht = apexY - BB;
    for (let t = hstep; t < ht; t += hstep) {
      const f = t / ht;
      const xL = xa + (mid - xa) * f, xR = xc + (mid - xc) * f;
      if (xR > xL) glue.push(line([xL, BB + t], [xR, BB + t]));
    }
  }

  return { cut, crease, glue, widthPt, heightPt, root: { x: xg, y: TB, w: walls[0].w, h: H } };
}

const shiftPL = (pl: Polyline, dy: number): Polyline => ({
  ...(pl.id ? { id: pl.id } : {}),
  pts: pl.pts.map(([x, y]) => [x, y + dy] as Pt),
  closed: pl.closed,
});

export function buildHexTrayLid(p: HexTrayLidParams): Dieline {
  const { L, W, H, thickness: t, bleed, glue: g, relief, clearance: clr, lidDepth, gap } = p;

  const base = hexTrayPart(L, W, H, g, relief);
  const fit = 2 * t + clr;                       // lid footprint clears the base outer
  const lid = hexTrayPart(L + fit, W + fit, lidDepth, g, relief);

  const dy = base.heightPt + gap;
  const lidCut = shiftPL(lid.cut, dy);

  const widthPt = Math.max(base.widthPt, lid.widthPt);
  const heightPt = base.heightPt + gap + lid.heightPt;

  const pieces: Polyline[] = [base.cut, lidCut];

  const labels: DieLabel[] = [
    { x: 2, y: -mmToPt(4), text: "Base (hex tray)", anchor: "start" },
    { x: 2, y: dy - mmToPt(4), text: "Lid (telescope cover)", anchor: "start" },
  ];

  // H dim arrow on the base piece (L/W are footprint diagonals).
  const dims: DimLine[] = [
    { x1: base.widthPt + bleed + mmToPt(8), y1: 0, x2: base.widthPt + bleed + mmToPt(8), y2: H, key: "H", vertical: true },
  ];

  return {
    paths: {
      cut: [base.cut, lidCut],
      crease: [...base.crease, ...lid.crease.map((c) => shiftPL(c, dy))],
      bleed: [],
      glue: [...base.glue, ...lid.glue.map((c) => shiftPL(c, dy))],
    },
    widthPt,
    heightPt,
    bleedPt: bleed,
    labels,
    dims,
    pieces,
    // Per-piece root rects (each tray's first long wall) for the Fold Engine.
    panels: {
      piece0: base.root,
      piece1: { ...lid.root, y: lid.root.y + dy },
    },
  };
}
