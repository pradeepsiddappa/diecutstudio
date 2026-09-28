// Necklace / Bracelet display card — craft Product Display Cards (the
// handmade-seller line; sibling of the earring card).
// docs/craft-dielines-catalog.md §C.
//
// Two styles:
//   • flat  — a rounded-rect card with a hang HOLE + a two-SLIT chain retainer
//             (thread the chain through to hold the necklace flat).
//   • fold  — an HOURGLASS fold-over card: a wide tapered head + a deep concave
//             WAIST (the chain wraps here) + a wide tapered foot, with a hang
//             SLOT at the top and bottom and a centre FOLD crease at the waist.
//             Fold in half → the necklace drapes over the fold, the two slots
//             align to hang as one.
//
// FLAT die-cut item (the fold style scores one crease but doesn't get a 3D
// pane). Cut many-up — the editor defaults this model to full-sheet export.
//
// All geometry in POINTS, top-left origin, y-down. Pure functional card forms —
// no traced artwork (branding/text is user-added in their own fonts).
//
// Dimension semantics (editor mapping):
//   editor L → card WIDTH  (x)  params.W
//   editor W → card HEIGHT (y)  params.H
//   editor H → unused (hidden for flat items)

import { Dieline, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { roundedRect } from "../features";
import { circleCut } from "../craft";

export type NecklaceCardStyle = "flat" | "fold";

export interface NecklaceCardParams {
  W: number;          // card width (pt)
  H: number;          // card height (pt)
  thickness: number;  // caliper (pt) — unused today, kept for parity
  bleed: number;      // bleed margin (pt)
  style: NecklaceCardStyle;
  hangHole: boolean;  // flat: top peg-hang hole
  hangDia: number;    // flat: hang-hole diameter (pt)
  slits: boolean;     // flat: the two-slit chain retainer
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(W: number, H: number, thickness = inToPt(0.018)): NecklaceCardParams {
  return {
    W, H, thickness,
    bleed: inToPt(0.0625),
    style: "flat",
    hangHole: true,
    hangDia: inToPt(0.1875),
    slits: true,
  };
}

// A horizontal stadium slot centred at (cx, cy).
function slot(cx: number, cy: number, len: number, w: number): Polyline {
  return roundedRect(cx - len / 2, cy - w / 2, cx + len / 2, cy + w / 2, w / 2);
}

interface OutlineAcc { pts: Pt[]; curves: (Pt | null)[] }
const acc = (): OutlineAcc => ({ pts: [], curves: [] });
const lin = (o: OutlineAcc, p: Pt) => { o.pts.push(p); if (o.pts.length > 1) o.curves.push(null); };
const quad = (o: OutlineAcc, p: Pt, c: Pt) => { o.pts.push(p); o.curves.push(c); };
const done = (o: OutlineAcc): Polyline => ({ pts: o.pts, curves: o.curves, closed: true });

// ---- flat style: rounded rect + hole + two retainer slits ----
function buildFlat(p: NecklaceCardParams): Dieline {
  const { W, H, bleed } = p;
  const cornerR = Math.min(mmToPt(4), W / 8, H / 8);
  const outline = roundedRect(0, 0, W, H, cornerR);
  const cut: Polyline[] = [outline];
  const hd = clamp(p.hangDia, mmToPt(2), W / 4);
  const hy = clamp(cornerR + hd / 2 + mmToPt(2), hd / 2 + mmToPt(1.5), H / 4);
  if (p.hangHole) cut.push(circleCut(W / 2, hy, hd));
  if (p.slits) {
    const slen = clamp(W * 0.4, mmToPt(12), W * 0.7);
    const sw = mmToPt(1.6);
    const sTop = (p.hangHole ? hy + hd / 2 : cornerR) + mmToPt(5);
    cut.push(slot(W / 2, sTop, slen, sw));
    cut.push(slot(W / 2, sTop + mmToPt(5.5), slen, sw));
  }
  return finish(cut, [], outline, W, H, bleed);
}

// ---- fold style: hourglass fold-over with slots top/bottom + waist crease ----
function buildFold(p: NecklaceCardParams): Dieline {
  const { W, H, bleed } = p;
  const te = clamp(W * 0.16, mmToPt(6), W * 0.3);          // top/bottom edge inset (tapered head/foot)
  const rc = clamp(mmToPt(4), mmToPt(1), te * 0.7);        // edge corner round
  const sh = clamp(H * 0.3, mmToPt(12), H * 0.42);         // shoulder y (widest, full width)
  const wi = clamp(W * 0.3, mmToPt(8), W * 0.42);          // waist inset (narrowest)
  const ym = H / 2;

  // outline, clockwise from the top edge. Tapered head → concave waist →
  // tapered foot, mirrored. Keep the closing corner (no pop) — see the
  // OutlineAcc chamfer lesson.
  const o = acc();
  lin(o, [te + rc, 0]);
  lin(o, [W - te - rc, 0]); quad(o, [W - te, rc], [W - te, 0]);  // top edge + TR round
  lin(o, [W, sh]);                                               // flare to right shoulder
  quad(o, [W - wi, ym], [W, ym]);                               // concave waist (upper right)
  quad(o, [W, H - sh], [W, ym]);                               // concave waist (lower right)
  lin(o, [W - te, H - rc]); quad(o, [W - te - rc, H], [W - te, H]); // foot + BR round
  lin(o, [te + rc, H]); quad(o, [te, H - rc], [te, H]);         // bottom edge + BL round
  lin(o, [0, H - sh]);                                          // flare to left shoulder
  quad(o, [wi, ym], [0, ym]);                                  // concave waist (lower left)
  quad(o, [0, sh], [0, ym]);                                  // concave waist (upper left)
  lin(o, [te, rc]); quad(o, [te + rc, 0], [te, 0]);            // head + TL round (closes to start)
  const outline = done(o);

  const cut: Polyline[] = [outline];
  // hang slots in the head & foot
  const slen = clamp(W * 0.42, mmToPt(12), (W - 2 * te) * 0.9);
  const sw = mmToPt(3.2);
  const sy = clamp(sh * 0.42, sw / 2 + rc + mmToPt(3), sh - mmToPt(4));
  cut.push(slot(W / 2, sy, slen, sw));
  cut.push(slot(W / 2, H - sy, slen, sw));

  // fold crease across the waist (the narrowest line). NB drawn left→right so
  // the Fold Engine's hinge axis is canonical.
  const crease: Polyline[] = [{ pts: [[wi, ym], [W - wi, ym]], closed: false, id: "fold" }];

  // Publish the HEAD half as the Fold Engine root (its centre sits above the
  // waist). The foot half folds up at the "fold" crease in the 3D preview.
  const panels = { base: { x: wi, y: 0, w: W - 2 * wi, h: ym } };

  return { ...finish(cut, crease, outline, W, H, bleed), panels };
}

function finish(cut: Polyline[], crease: Polyline[], outline: Polyline, W: number, H: number, bleed: number): Dieline {
  const dims: DimLine[] = [
    { x1: 0, y1: H, x2: W, y2: H, key: "L" },                    // width  (editor "L")
    { x1: W, y1: 0, x2: W, y2: H, key: "W", vertical: true },    // height (editor "W")
  ];
  return {
    paths: { cut, crease, bleed: [bleedFromCut(outline, bleed)], glue: [] },
    widthPt: W,
    heightPt: H,
    bleedPt: bleed,
    labels: [],
    dims,
  };
}

export function buildNecklaceCard(p: NecklaceCardParams): Dieline {
  return p.style === "fold" ? buildFold(p) : buildFlat(p);
}
