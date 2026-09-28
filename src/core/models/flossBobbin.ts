// Floss Bobbin — embroidery-floss organizer card (docs/craft-dielines-catalog.md
// §E Organizers; first model in the "Organize" category).
//
// The classic "I-beam" / dog-bone winder, matching a standard plastic/cardboard
// floss bobbin:
//   • a WIDE rounded TOP FLANGE with a hang HOLE in it (file a stack on a ring),
//   • a NARROW BODY (the floss winds around it; the wide flanges keep the bundle
//     from sliding off the top or bottom),
//   • a WIDE BOTTOM FLANGE that flares into two FEET with a centre NOTCH (the
//     thread-catch + the gap between the feet).
// Concave shoulder fillets join the flanges to the narrow body.
//
// FLAT item: no creases, no fold, no 3D (`has3DPreview:false`, `flat:true`).
// Cut many-up — the editor defaults this model to full-sheet export.
//
// All geometry in POINTS, top-left origin, y-down. Pure functional spool form
// (a universal winder shape) — no traced artwork.
//
// Dimension semantics (editor mapping):
//   editor L → bobbin WIDTH  (x, across)  params.W
//   editor W → bobbin HEIGHT (y, tall)    params.H
//   editor H → unused (hidden for flat items)

import { Dieline, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { circleCut } from "../craft";

export interface FlossBobbinParams {
  W: number;          // card width (pt)
  H: number;          // card height (pt)
  thickness: number;  // material caliper (pt) — unused today, kept for parity
  bleed: number;      // bleed margin (pt)
  hole: boolean;      // include the top hang hole
  holeDia: number;    // hang-hole diameter (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(W: number, H: number, thickness = inToPt(0.024)): FlossBobbinParams {
  return {
    W, H, thickness,
    bleed: inToPt(0.0625),
    hole: true,
    holeDia: inToPt(0.1875), // 3/16in ≈ 4.8mm — fits a binder ring / twine
  };
}

interface OutlineAcc { pts: Pt[]; curves: (Pt | null)[] }
const acc = (): OutlineAcc => ({ pts: [], curves: [] });
const lin = (o: OutlineAcc, p: Pt) => { o.pts.push(p); if (o.pts.length > 1) o.curves.push(null); };
const quad = (o: OutlineAcc, p: Pt, c: Pt) => { o.pts.push(p); o.curves.push(c); };
const done = (o: OutlineAcc): Polyline => ({ pts: o.pts, curves: o.curves, closed: true });

export function buildFlossBobbin(p: FlossBobbinParams): Dieline {
  const { W, H, bleed } = p;
  const capH = clamp(H * 0.22, mmToPt(6), H * 0.34);          // top flange height
  const footH = clamp(H * 0.22, mmToPt(6), H * 0.34);         // bottom flange height
  const inset = clamp(W * 0.19, mmToPt(4), W * 0.3);          // body narrower by this per side
  const bL = inset, bR = W - inset;                           // body left / right x
  const fr = clamp(Math.min(capH, footH) * 0.45, mmToPt(2), Math.min(capH, footH) / 2 - 0.5); // flange end radius
  const sf = clamp(Math.min(inset, capH, footH) * 0.4, mmToPt(1.5), Math.min(inset, capH, footH) / 2); // shoulder fillet
  const capB = capH;                                          // cap bottom y
  const footT = H - footH;                                    // foot top y
  const cx = W / 2;
  const nw = clamp(W * 0.18, mmToPt(5), bR - bL - mmToPt(2)); // bottom notch width (at the edge)
  const nd = clamp(footH * 0.6, mmToPt(4), footH - mmToPt(1.5)); // notch depth (up from bottom)

  // Outline, clockwise from the top-left flange corner. Flanges reach the full
  // width (W); the body is inset on both sides; concave fillets (sf) join them.
  const o = acc();
  lin(o, [fr, 0]);
  lin(o, [W - fr, 0]); quad(o, [W, fr], [W, 0]);             // top edge + TR cap round
  lin(o, [W, capB - fr]); quad(o, [W - fr, capB], [W, capB]); // cap right side + bottom-right outer round
  lin(o, [bR + sf, capB]); quad(o, [bR, capB + sf], [bR, capB]); // cap underside in + concave shoulder down
  lin(o, [bR, footT - sf]); quad(o, [bR + sf, footT], [bR, footT]); // body right side + concave shoulder out
  lin(o, [W - fr, footT]); quad(o, [W, footT + fr], [W, footT]);    // foot top underside + top-right outer round
  lin(o, [W, H - fr]); quad(o, [W - fr, H], [W, H]);         // foot right side + bottom-right outer round
  lin(o, [cx + nw / 2, H]); lin(o, [cx, H - nd]); lin(o, [cx - nw / 2, H]); // bottom edge + centre V-notch (up)
  lin(o, [fr, H]); quad(o, [0, H - fr], [0, H]);             // bottom edge + bottom-left outer round
  lin(o, [0, footT + fr]); quad(o, [fr, footT], [0, footT]); // foot left side + top-left outer round
  lin(o, [bL - sf, footT]); quad(o, [bL, footT - sf], [bL, footT]); // foot top underside in + concave shoulder up
  lin(o, [bL, capB + sf]); quad(o, [bL - sf, capB], [bL, capB]);    // body left side + concave shoulder out
  lin(o, [fr, capB]); quad(o, [0, capB - fr], [0, capB]);    // cap underside out + cap bottom-left outer round
  lin(o, [0, fr]); quad(o, [fr, 0], [0, 0]);                 // cap left side + TL round (closes to start)
  // Keep the closing corner's point+curve (don't pop) — like roundedRect.
  // Popping drops the curve, so the Z would close the top-left ear as a
  // straight chamfer. The duplicate point is harmless.
  const outline = done(o);

  const cut: Polyline[] = [outline];

  // Hang hole: centred in the TOP flange.
  if (p.hole) {
    const hd = clamp(p.holeDia, mmToPt(2), capH * 0.7);
    cut.push(circleCut(cx, clamp(capB * 0.6, hd / 2 + mmToPt(1.5), capB - mmToPt(1)), hd));
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
