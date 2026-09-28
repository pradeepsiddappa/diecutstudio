// Hexagon Box — an (elongated) hexagonal-prism carton. A decorative gift box
// shape: candles, jewellery, soaps, premium gifts.
//
// The footprint is a convex hexagon that is L long (x) and W wide (y), formed by
// a W×m central band capped by two beveled points on the L-ends:
//
//        (-m/2,+W/2) ___________ (+m/2,+W/2)
//                   /           \
//      (-L/2,0)  <             >  (L/2,0)      e = (L-m)/2  (bevel reach)
//                   \___________/
//        (-m/2,-W/2)             (+m/2,-W/2)
//
//   6 walls: 2 long edges (length m) + 4 slant edges (length s).
//   When e = W/2 the bevels are 45° and (with the right L/W) it's a regular hex.
//
// TOP & BOTTOM close with INFOLD flaps: one triangle per wall, base = that
// wall's width, apex reaching just PAST the polygon CENTRE. Edge-to-centre
// triangles tile any convex polygon, and the small past-centre OVERLAP is the
// bonding surface — the flaps GLUE to each other to hold each end shut (marked
// as glue area). A glue-assembled hexagonal box. (For an openable box, the
// realistic route is a two-piece hex tray + telescoping lid — a future model.)
//
// All geometry in POINTS. Origin top-left, y down. Pure parametric construction
// (regular-polygon math) — no proprietary file.

import { Dieline, DieLabel, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";

export interface HexBoxParams {
  L: number;          // overall length, long axis (pt)
  W: number;          // overall width, short axis (pt)
  H: number;          // height (pt)
  thickness: number;  // material caliper (pt)
  bleed: number;      // bleed margin (pt)
  glue: number;       // glue-flap width (pt)
  relief: number;     // slit between adjacent flaps (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): HexBoxParams {
  return {
    L, W, H, thickness,
    bleed: inToPt(0.125),
    glue: Math.min(inToPt(0.5), W * 0.6),
    relief: Math.max(thickness, mmToPt(1.5)),
  };
}

const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

// Geometry shared with the 3D builder: the 6 walls (width + edge-to-centre
// apothem), the bevel reach e, and the central-band length m.
export function hexDetails(L: number, W: number) {
  const e = Math.min(W / 2, L * 0.4); // bevel reach on each L-end (45° when =W/2)
  const m = L - 2 * e;                // central straight band length
  const s = Math.sqrt(e * e + (W / 2) * (W / 2)); // slant edge length
  const apoLong = W / 2;                            // long edge → centre
  const apoSlant = (W * (m / 2 + e)) / (2 * s);     // slant edge → centre
  // Walls in perimeter order, each: width + apothem (edge-to-centre distance).
  const walls = [
    { w: m, apo: apoLong },  // top edge
    { w: s, apo: apoSlant }, // top-right slant
    { w: s, apo: apoSlant }, // bottom-right slant
    { w: m, apo: apoLong },  // bottom edge
    { w: s, apo: apoSlant }, // bottom-left slant
    { w: s, apo: apoSlant }, // top-left slant
  ];
  return { e, m, s, apoLong, apoSlant, walls };
}

export function buildHexBox(p: HexBoxParams): Dieline {
  const { L, W, H, bleed, glue: g, relief: r } = p;
  const { walls } = hexDetails(L, W);

  // Infold flaps extend PAST the centre by `overlap` so adjacent flaps overlap
  // when folded in — that overlap is the bonding/glue surface that actually
  // holds the end shut (flaps that merely meet at the centre wouldn't hold).
  const minApo = Math.min(...walls.map((w) => w.apo));
  const overlap = Math.min(minApo * 0.18, mmToPt(6));
  const topRegion = Math.max(...walls.map((w) => w.apo)) + overlap; // tallest flap
  const TB = topRegion;       // top crease line
  const BB = TB + H;          // bottom crease line
  const bboxH = topRegion + H + topRegion;

  // x boundaries: glue flap, then the 6 walls in a row
  const xg = g;
  const xb: number[] = [xg];
  for (const w of walls) xb.push(xb[xb.length - 1] + w.w);
  const bboxW = xb[xb.length - 1];

  const gt = Math.min(H * 0.1, inToPt(0.2)); // glue taper

  // ---- CUT outline ----
  const cut: Pt[] = [];
  const P = (x: number, y: number) => cut.push([x, y]);

  P(0, TB + gt);
  P(gt, TB);
  P(xg, TB);
  // top flaps (left → right) — apex extends `overlap` past the centre line
  for (let i = 0; i < walls.length; i++) {
    const xa = xb[i], xc = xb[i + 1], mid = (xa + xc) / 2;
    P(xa + r / 2, TB);
    P(mid, TB - walls[i].apo - overlap);
    P(xc - r / 2, TB);
    P(xc, TB);
  }
  // right edge down
  P(bboxW, BB);
  // bottom flaps (right → left)
  for (let i = walls.length - 1; i >= 0; i--) {
    const xa = xb[i], xc = xb[i + 1], mid = (xa + xc) / 2;
    P(xc - r / 2, BB);
    P(mid, BB + walls[i].apo + overlap);
    P(xa + r / 2, BB);
    P(xa, BB);
  }
  // glue flap bottom taper + left edge
  P(gt, BB);
  P(0, BB - gt);

  const cutPolyline: Polyline = { pts: cut, closed: true };

  // ---- CREASE lines ----
  const crease: Polyline[] = [];
  // vertical folds: glue|wall1 + the 5 inter-wall folds
  const vIds = ["glue-w0", "w0-w1", "w1-w2", "w2-w3", "w3-w4", "w4-w5"];
  for (let i = 0; i < xb.length - 1; i++) crease.push(line([xb[i], TB], [xb[i], BB], vIds[i]));
  // top & bottom flap folds over each wall
  for (let i = 0; i < walls.length; i++) {
    crease.push(line([xb[i], TB], [xb[i + 1], TB], `w${i}-top`));
    crease.push(line([xb[i], BB], [xb[i + 1], BB], `w${i}-bottom`));
  }

  // ---- GLUE hatch ----
  const glueHatch: Polyline[] = [];
  const step = inToPt(0.12);
  // (a) the manufacturer's seam on the glue flap (diagonal)
  const gh = BB - TB;
  for (let c = -gh; c < xg; c += step) {
    const xs = Math.max(0, c);
    const ys = TB + (xs - c);
    const xe = Math.min(xg, c + gh);
    const ye = TB + (xe - c);
    if (xe > xs) glueHatch.push(line([xs, ys], [xe, ye]));
  }
  // (b) the infold end flaps — they overlap & GLUE to hold each end shut.
  // Hatch each triangular flap (horizontal lines clipped to the triangle).
  const hstep = inToPt(0.1);
  const hatchTri = (xa: number, xc: number, yBase: number, apex: number) => {
    const mid = (xa + xc) / 2;
    const ht = Math.abs(apex - yBase);
    const dir = Math.sign(apex - yBase);
    for (let t = hstep; t < ht; t += hstep) {
      const f = t / ht;
      const xL = xa + (mid - xa) * f;
      const xR = xc + (mid - xc) * f;
      const y = yBase + dir * t;
      if (xR > xL) glueHatch.push(line([xL, y], [xR, y]));
    }
  };
  for (let i = 0; i < walls.length; i++) {
    const xa = xb[i], xc = xb[i + 1], apo = walls[i].apo;
    hatchTri(xa, xc, TB, TB - apo - overlap); // top flap
    hatchTri(xa, xc, BB, BB + apo + overlap); // bottom flap
  }

  // ---- BLEED contour ----
  const bleedBox: Polyline = bleedFromCut(cutPolyline, bleed);

  // ---- dimension (H only; L/W are footprint diagonals, not single panels) ----
  const dims: DimLine[] = [
    { x1: bboxW + bleed + mmToPt(8), y1: TB, x2: bboxW + bleed + mmToPt(8), y2: BB, key: "H", vertical: true },
  ];
  const labels: DieLabel[] = [];

  return {
    paths: { cut: [cutPolyline], crease, bleed: [bleedBox], glue: glueHatch },
    widthPt: bboxW,
    heightPt: bboxH,
    bleedPt: bleed,
    labels,
    dims,
    // First (long) wall — the Fold Engine roots here.
    panels: { front: { x: xb[0], y: TB, w: walls[0].w, h: H } },
  };
}
