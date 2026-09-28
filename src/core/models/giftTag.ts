// Gift Tag — the first NON-BOX craft item (docs/craft-dielines-catalog.md §B).
//
// A flat die-cut tag in three classic shapes, each with a hang hole and a
// separate REINFORCEMENT RING piece (the little donut you glue around the hole
// so string/twine doesn't tear it — the classic kraft-tag detail):
//
//   • luggage — rectangle with 45°-chamfered top corners (the tapered head)
//   • scallop — scalloped border all the way around (uses scallopEdge)
//   • ticket  — rounded rectangle with semicircular side notches at mid-height
//
// FLAT item: no creases, no fold, no 3D (`has3DPreview:false`, `flat:true`).
// Tags are cut many-up — the editor defaults this model to full-sheet export
// via the existing imposition machinery.
//
// All geometry in POINTS, top-left origin, y-down. Pure functional shapes
// (centuries-old stationery forms) — no traced artwork.
//
// Dimension semantics (NOTE the editor mapping):
//   editor L → tag WIDTH  (x, across)      params.W
//   editor W → tag HEIGHT (y, top-to-tail) params.H
//   editor H → unused (hidden for flat items)

import { Dieline, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { circleCut, scallopEdge } from "../craft";
import { arcPoints } from "../geometry";

export type GiftTagShape = "luggage" | "scallop" | "ticket";

export interface GiftTagParams {
  W: number;          // tag width (pt)
  H: number;          // tag height (pt)
  thickness: number;  // material caliper (pt) — unused today, kept for parity
  bleed: number;      // bleed margin (pt)
  shape: GiftTagShape;
  holeDia: number;    // hang-hole diameter (pt)
  scallopR: number;   // desired scallop bump radius (pt; scallop shape only)
  ring: boolean;      // include the reinforcement-ring piece
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(W: number, H: number, thickness = inToPt(0.014)): GiftTagParams {
  return {
    W, H, thickness,
    bleed: inToPt(0.0625),
    shape: "luggage",
    holeDia: inToPt(0.1875), // 3/16in ≈ 4.8mm — fits standard twine/eyelets
    scallopR: inToPt(0.25),
    ring: true,
  };
}

// ---- shape outlines (each within [0,W]×[0,H]) + where the hole web starts ----

// Outline builder helpers shared by the shapes: straight point vs Q-bezier
// corner vs a pre-flattened point run (scallops, notch arcs).
interface OutlineAcc { pts: Pt[]; curves: (Pt | null)[] }
const acc = (): OutlineAcc => ({ pts: [], curves: [] });
const lin = (o: OutlineAcc, p: Pt) => { o.pts.push(p); if (o.pts.length > 1) o.curves.push(null); };
const quad = (o: OutlineAcc, p: Pt, c: Pt) => { o.pts.push(p); o.curves.push(c); };
const run = (o: OutlineAcc, pts: Pt[]) => { for (const p of pts.slice(o.pts.length ? 1 : 0)) lin(o, p); };
const done = (o: OutlineAcc): Polyline => ({ pts: o.pts, curves: o.curves, closed: true });

// Luggage tag: chamfered top corners (tapered head), gently rounded bottom.
function luggageOutline(W: number, H: number): { outline: Polyline; topSolidY: number } {
  const c = Math.min(W / 4, H / 6, inToPt(0.6)); // 45° head chamfer
  const rb = Math.min(mmToPt(2.5), W / 8);       // bottom corner rounding
  const o = acc();
  lin(o, [c, 0]); lin(o, [W - c, 0]);            // head top edge
  lin(o, [W, c]);                                 // right chamfer
  lin(o, [W, H - rb]); quad(o, [W - rb, H], [W, H]);
  lin(o, [rb, H]); quad(o, [0, H - rb], [0, H]);
  lin(o, [0, c]);                                 // left chamfer closes to (c,0)
  return { outline: done(o), topSolidY: c };
}

// Scalloped tag: bumps on all four edges whose apexes touch the nominal W×H
// box exactly. Per-edge fitted radii rT (top/bottom) and rS (sides) solve
//   2·nT·rT + 2·rS = W   and   2·nS·rS + 2·rT = H
// so a whole number of bumps spans each edge AND the bbox stays exact.
function scallopOutline(W: number, H: number, r0in: number): { outline: Polyline; topSolidY: number } {
  const r0 = clamp(r0in, mmToPt(2), Math.min(W, H) / 6);
  const nT = Math.max(2, Math.round((W - 2 * r0) / (2 * r0)));
  const nS = Math.max(2, Math.round((H - 2 * r0) / (2 * r0)));
  let rT = (nS * W - H) / (2 * (nS * nT - 1));
  let rS = (nT * H - W) / (2 * (nS * nT - 1));
  // Degenerate aspect-ratio guard (only reachable at extreme W:H) — accept a
  // hair of bbox slip rather than inverted geometry.
  rT = clamp(rT, mmToPt(0.8), Math.min(W, H) / 2);
  rS = clamp(rS, mmToPt(0.8), Math.min(W, H) / 2);

  const o = acc();
  run(o, scallopEdge([rS, rT], [W - rS, rT], { count: nT }));         // top (bulges up)
  run(o, scallopEdge([W - rS, rT], [W - rS, H - rT], { count: nS })); // right
  run(o, scallopEdge([W - rS, H - rT], [rS, H - rT], { count: nT })); // bottom
  run(o, scallopEdge([rS, H - rT], [rS, rT], { count: nS }));         // left
  o.pts.pop(); o.curves.pop(); // last point duplicates the start; closed redraws it
  return { outline: done(o), topSolidY: rT };
}

// Ticket: rounded rect + two inward semicircular side notches at mid-height.
function ticketOutline(W: number, H: number): { outline: Polyline; topSolidY: number } {
  const rc = Math.min(mmToPt(4), W / 6, H / 6);                 // corner radius
  const rn = clamp(W / 8, mmToPt(2.5), mmToPt(6));              // notch radius
  const o = acc();
  lin(o, [rc, 0]); lin(o, [W - rc, 0]); quad(o, [W, rc], [W, 0]);
  lin(o, [W, H / 2 - rn]);
  run(o, arcPoints(W, H / 2, rn, -Math.PI / 2, -3 * Math.PI / 2, 14)); // right notch (bulges in)
  lin(o, [W, H - rc]); quad(o, [W - rc, H], [W, H]);
  lin(o, [rc, H]); quad(o, [0, H - rc], [0, H]);
  lin(o, [0, H / 2 + rn]);
  run(o, arcPoints(0, H / 2, rn, Math.PI / 2, -Math.PI / 2, 14));      // left notch (bulges in)
  lin(o, [0, rc]); quad(o, [rc, 0], [0, 0]); // top-left corner (closes to the start)
  // Keep the closing corner's point+curve (don't pop) — like roundedRect.
  // Popping drops the curve, so the Z closes as a straight chamfer on the
  // top-left. The duplicate point is harmless.
  return { outline: done(o), topSolidY: 0 };
}

export function buildGiftTag(p: GiftTagParams): Dieline {
  const { W, H, bleed, shape } = p;
  const holeDia = clamp(p.holeDia, mmToPt(1.5), W / 3);

  const { outline, topSolidY } =
    shape === "scallop" ? scallopOutline(W, H, p.scallopR)
    : shape === "ticket" ? ticketOutline(W, H)
    : luggageOutline(W, H);

  // Hang hole: centered, just below the shape's solid-material start so the
  // web above it never thins out (luggage: below the chamfer; scallop: below
  // the bump valleys).
  const hx = W / 2;
  const hy = Math.min(topSolidY + holeDia / 2 + mmToPt(2.5) + (shape === "ticket" ? mmToPt(2) : 0), H / 3);
  const hole = circleCut(hx, hy, holeDia);

  const cut: Polyline[] = [outline, hole];
  const bleedPaths: Polyline[] = [bleedFromCut(outline, bleed)];
  let widthPt = W;
  let heightPt = H;
  let pieces: Polyline[] | undefined;

  // Reinforcement ring: a donut (outer cut + the same hole diameter inner cut)
  // as a second PIECE beside the tag, vertically aligned with the hole. Glue
  // it around the hole on the back — the classic tear-resistant detail.
  if (p.ring) {
    const od = Math.max(holeDia * 2.2, holeDia + mmToPt(4));
    // Gap clears both pieces' bleed margins AND the editor's dimension lines.
    const gap = Math.max(mmToPt(12), 2 * bleed + mmToPt(6));
    const rx = W + gap + od / 2;
    const ry = Math.max(hy, od / 2);
    const ringOuter = circleCut(rx, ry, od);
    cut.push(ringOuter, circleCut(rx, ry, holeDia));
    bleedPaths.push(bleedFromCut(ringOuter, bleed));
    widthPt = W + gap + od;
    heightPt = Math.max(H, ry + od / 2);
    pieces = [outline, ringOuter];
  }

  const dims: DimLine[] = [
    { x1: 0, y1: H, x2: W, y2: H, key: "L" },                    // tag width (editor "L")
    { x1: W, y1: 0, x2: W, y2: H, key: "W", vertical: true },    // tag height (editor "W")
  ];

  return {
    paths: { cut, crease: [], bleed: bleedPaths, glue: [] },
    widthPt,
    heightPt,
    bleedPt: bleed,
    labels: [],
    dims,
    ...(pieces ? { pieces } : {}),
  };
}
