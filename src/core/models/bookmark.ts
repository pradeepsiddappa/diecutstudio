// Bookmark — craft Tags, labels & wraps (a tall flat die-cut).
// docs/craft-dielines-catalog.md §B (broad-appeal flat item).
//
// A flat bookmark with a tassel HOLE near the top, in three shapes:
//   • rounded — rounded-rect strip (the classic)
//   • pointed — rounded top, tapering to a point at the bottom (banner tip)
//   • scallop — scalloped border (decorative; apexes touch W×H)
//
// FLAT item: no creases, no fold, no 3D (`has3DPreview:false`, `flat:true`).
// Cut several-up — the editor defaults this model to full-sheet export.
//
// All geometry in POINTS, top-left origin, y-down. Pure functional forms — no
// traced artwork (the design is user-added, ideally via Print & Cut).
//
// Dimension semantics (editor mapping):
//   editor L → bookmark WIDTH  (x)  params.W
//   editor W → bookmark HEIGHT (y)  params.H
//   editor H → unused (hidden for flat items)

import { Dieline, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { roundedRect } from "../features";
import { circleCut, scallopEdge } from "../craft";

export type BookmarkShape = "rounded" | "pointed" | "scallop";

export interface BookmarkParams {
  W: number;          // bookmark width (pt)
  H: number;          // bookmark height (pt)
  thickness: number;  // caliper (pt) — unused today, kept for parity
  bleed: number;      // bleed margin (pt)
  shape: BookmarkShape;
  hole: boolean;      // tassel hole near the top
  holeDia: number;    // tassel-hole diameter (pt)
  scallopR: number;   // desired scallop bump radius (pt; scallop shape)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(W: number, H: number, thickness = inToPt(0.018)): BookmarkParams {
  return {
    W, H, thickness,
    bleed: inToPt(0.0625),
    shape: "rounded",
    hole: true,
    holeDia: inToPt(0.25), // 1/4in — fits a tassel loop
    scallopR: inToPt(0.22),
  };
}

interface OutlineAcc { pts: Pt[]; curves: (Pt | null)[] }
const acc = (): OutlineAcc => ({ pts: [], curves: [] });
const lin = (o: OutlineAcc, p: Pt) => { o.pts.push(p); if (o.pts.length > 1) o.curves.push(null); };
const quad = (o: OutlineAcc, p: Pt, c: Pt) => { o.pts.push(p); o.curves.push(c); };
const done = (o: OutlineAcc): Polyline => ({ pts: o.pts, curves: o.curves, closed: true });

// Rounded top, straight sides, tapering to a centred point at the bottom.
function pointedOutline(W: number, H: number): Polyline {
  const r = Math.min(mmToPt(5), W / 4);
  const tip = clamp(W * 0.55, mmToPt(8), H * 0.5); // how far up the point starts
  const o = acc();
  lin(o, [r, 0]); lin(o, [W - r, 0]); quad(o, [W, r], [W, 0]);   // top + corners
  lin(o, [W, H - tip]);                                           // right side down
  lin(o, [W / 2, H]);                                             // taper to the point
  lin(o, [0, H - tip]);                                           // up the left taper
  lin(o, [0, r]); quad(o, [r, 0], [0, 0]);                        // left side + top-left corner
  // NB: keep the closing corner's point+curve (don't pop) — like roundedRect.
  // Popping the duplicate also drops the curve, so the Z would close as a
  // straight chamfer on the top-left. The duplicate point is harmless.
  return done(o);
}

// Scalloped rounded-rect (gift-tag fitted-radius solve: bump apexes touch W×H).
function scallopOutline(W: number, H: number, r0in: number): Polyline {
  const r0 = clamp(r0in, mmToPt(2), Math.min(W, H) / 6);
  const nT = Math.max(2, Math.round((W - 2 * r0) / (2 * r0)));
  const nS = Math.max(2, Math.round((H - 2 * r0) / (2 * r0)));
  let rT = (nS * W - H) / (2 * (nS * nT - 1));
  let rS = (nT * H - W) / (2 * (nS * nT - 1));
  rT = clamp(rT, mmToPt(0.8), Math.min(W, H) / 2);
  rS = clamp(rS, mmToPt(0.8), Math.min(W, H) / 2);
  const o = acc();
  const run = (seg: Pt[]) => { for (const p of seg.slice(o.pts.length ? 1 : 0)) lin(o, p); };
  run(scallopEdge([rS, rT], [W - rS, rT], { count: nT }));
  run(scallopEdge([W - rS, rT], [W - rS, H - rT], { count: nS }));
  run(scallopEdge([W - rS, H - rT], [rS, H - rT], { count: nT }));
  run(scallopEdge([rS, H - rT], [rS, rT], { count: nS }));
  o.pts.pop(); o.curves.pop();
  return done(o);
}

export function buildBookmark(p: BookmarkParams): Dieline {
  const { W, H, bleed, shape } = p;

  const outline =
    shape === "pointed" ? pointedOutline(W, H)
    : shape === "scallop" ? scallopOutline(W, H, p.scallopR)
    : roundedRect(0, 0, W, H, Math.min(mmToPt(5), W / 4));

  const cut: Polyline[] = [outline];

  // Tassel hole near the top, centred.
  // Scallop bumps extend ~rT above their chord, so use a larger top margin to
  // keep the hole clearly below the cut edge.
  if (p.hole) {
    const hd = clamp(p.holeDia, mmToPt(2), W / 2.5);
    const topMargin = shape === "scallop" ? mmToPt(11) : mmToPt(5);
    const hy = clamp(hd / 2 + topMargin, hd / 2 + mmToPt(3), H / 6);
    cut.push(circleCut(W / 2, hy, hd));
  }

  const dims: DimLine[] = [
    { x1: 0, y1: H, x2: W, y2: H, key: "L" },                    // width  (editor "L")
    { x1: W, y1: 0, x2: W, y2: H, key: "W", vertical: true },    // height (editor "W")
  ];

  return {
    paths: { cut, crease: [], bleed: [bleedFromCut(outline, bleed)], glue: [] },
    widthPt: W,
    heightPt: H,
    bleedPt: bleed,
    labels: [],
    dims,
  };
}
