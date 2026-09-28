// Earring display card — craft Product Display Cards (the handmade-seller line;
// docs/craft-dielines-catalog.md §C). The small branded card a maker pushes
// earrings through to display + sell them.
//
// A flat card with paired holes, in two earring styles:
//   • stud   — pairs of small POST holes in the card body; each stud's post
//              goes through a hole, secured by its back on the reverse.
//   • dangle — pairs of HOOK holes near the top; French-hook earrings hang
//              through them and dangle down the card front.
// `pairs` stacks rows (display a set). Optional top HANG HOLE for a peg.
//
// Three creative extensions (all parametric, IP-safe geometry):
//   • SHAPE   — rect | scallop (scalloped border, reuses scallopEdge) | arch
//               (domed top) | tag-top (chamfered head).
//   • HEADER  — a fold-over header: the blank grows a top panel that folds back
//               (crease) into a double-thick, sturdier hang area; the hang hole
//               is punched in BOTH halves so they self-register when folded.
//               (A header card is rectangular — shape is suppressed.)
//   • EASEL   — a second piece (a tab-in-slot strut, caliper-aware slot+tab)
//               that lets the card STAND on a table; emitted via Dieline.pieces.
//
// FLAT item (`has3DPreview:false`, `flat:true`) — the header/easel folds show as
// score lines in the dieline; a 3D fold is a future enhancement. Gangs many-up.
//
// All geometry in POINTS, top-left origin, y-down. Dimension semantics:
//   editor L → card WIDTH (x) param.W · editor W → card HEIGHT (y) param.H ·
//   editor H → unused (hidden).

import { Dieline, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut, arcPoints } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { roundedRect } from "../features";
import { circleCut, scallopEdge, slotCut, SlotTabSpec } from "../craft";

export type EarringStyle = "stud" | "dangle";
export type CardShape = "rect" | "scallop" | "arch" | "tag-top";

export interface EarringCardParams {
  W: number;          // card width (pt)
  H: number;          // card height (pt)
  thickness: number;  // caliper (pt) — drives the easel slot+tab fit
  bleed: number;      // bleed margin (pt)
  style: EarringStyle;
  pairs: number;      // number of earring-pair rows
  holeDia: number;    // post / hook hole diameter (pt)
  pairGap: number;    // centre-to-centre spacing of a pair's two holes (pt)
  rowGap: number;     // vertical spacing between pair rows (pt)
  cornerR: number;    // card corner radius (pt)
  hangHole: boolean;  // top-centre display hang hole
  hangDia: number;    // hang-hole diameter (pt)
  shape: CardShape;   // outline style (suppressed when header is on)
  scallopR: number;   // scallop bump radius (scallop shape)
  header: boolean;    // fold-over header
  easel: boolean;     // add an easel-stand piece
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

export function defaultParams(W: number, H: number, thickness = inToPt(0.018)): EarringCardParams {
  return {
    W, H, thickness,
    bleed: inToPt(0.0625),
    style: "stud",
    pairs: 1,
    holeDia: mmToPt(1.6),
    pairGap: mmToPt(18),
    rowGap: mmToPt(14),
    cornerR: mmToPt(4),
    hangHole: false,
    hangDia: mmToPt(5),
    shape: "rect",
    scallopR: mmToPt(6),
    header: false,
    easel: false,
  };
}

// ---- card outline per shape (within [0,W] × [yTop, yTop+H]) ----
interface Acc { pts: Pt[]; curves: (Pt | null)[] }
const acc = (): Acc => ({ pts: [], curves: [] });
const lin = (o: Acc, p: Pt) => { o.pts.push(p); if (o.pts.length > 1) o.curves.push(null); };
const quad = (o: Acc, p: Pt, c: Pt) => { o.pts.push(p); o.curves.push(c); };
const run = (o: Acc, pts: Pt[]) => { for (const p of pts.slice(o.pts.length ? 1 : 0)) lin(o, p); };
const close = (o: Acc): Polyline => ({ pts: o.pts, curves: o.curves, closed: true });

// Scalloped border: per-edge fitted radii so a whole number of bumps spans each
// edge AND the bbox stays exactly W×H (same trick as the gift tag).
function scallopCard(W: number, H: number, yTop: number, r0in: number): Polyline {
  const r0 = clamp(r0in, mmToPt(2), Math.min(W, H) / 6);
  const nT = Math.max(2, Math.round((W - 2 * r0) / (2 * r0)));
  const nS = Math.max(2, Math.round((H - 2 * r0) / (2 * r0)));
  let rT = (nS * W - H) / (2 * (nS * nT - 1));
  let rS = (nT * H - W) / (2 * (nS * nT - 1));
  rT = clamp(rT, mmToPt(0.8), Math.min(W, H) / 2);
  rS = clamp(rS, mmToPt(0.8), Math.min(W, H) / 2);
  const Y = (y: number): number => y + yTop;
  const o = acc();
  run(o, scallopEdge([rS, Y(rT)], [W - rS, Y(rT)], { count: nT }).map(([x, y]): Pt => [x, y]));
  run(o, scallopEdge([W - rS, Y(rT)], [W - rS, Y(H - rT)], { count: nS }));
  run(o, scallopEdge([W - rS, Y(H - rT)], [rS, Y(H - rT)], { count: nT }));
  run(o, scallopEdge([rS, Y(H - rT)], [rS, Y(rT)], { count: nS }));
  o.pts.pop(); o.curves.pop();
  return close(o);
}

// Domed (arch) top, rounded bottom corners.
function archCard(W: number, H: number, yTop: number, rb: number): Polyline {
  const ad = Math.min(W * 0.32, H * 0.4); // arch drop (corner height of the dome)
  const o = acc();
  lin(o, [0, yTop + ad]);
  quad(o, [W, yTop + ad], [W / 2, yTop - ad]);   // dome up to (W/2, yTop)
  lin(o, [W, yTop + H - rb]); quad(o, [W - rb, yTop + H], [W, yTop + H]);
  lin(o, [rb, yTop + H]); quad(o, [0, yTop + H - rb], [0, yTop + H]);
  return close(o);
}

// Chamfered head (tag-top), rounded bottom corners.
function tagTopCard(W: number, H: number, yTop: number, rb: number): Polyline {
  const c = Math.min(W / 4, H / 5, inToPt(0.6));
  const o = acc();
  lin(o, [c, yTop]); lin(o, [W - c, yTop]); lin(o, [W, yTop + c]);
  lin(o, [W, yTop + H - rb]); quad(o, [W - rb, yTop + H], [W, yTop + H]);
  lin(o, [rb, yTop + H]); quad(o, [0, yTop + H - rb], [0, yTop + H]);
  lin(o, [0, yTop + c]);
  return close(o);
}

export function buildEarringCard(p: EarringCardParams): Dieline {
  const { W, H, bleed, style, header, easel } = p;
  const cornerR = clamp(p.cornerR, 0, Math.min(W, H) / 2);
  const holeDia = clamp(p.holeDia, mmToPt(0.8), W / 4);
  const pairGap = clamp(p.pairGap, holeDia + mmToPt(2), W - mmToPt(8) - holeDia);
  const rowGap = Math.max(p.rowGap, holeDia + mmToPt(4));
  const pairs = Math.max(1, Math.round(p.pairs));

  const crease: Polyline[] = [];
  // Fold-over header: a top panel of height `headerH` folds back at the crease.
  const headerH = header ? clamp(H * 0.28, mmToPt(14), H * 0.5) : 0;
  const cardTop = headerH;             // the card body starts below the header
  const totalH = headerH + H;          // full blank height

  // ---- card / blank outline ----
  let outline: Polyline;
  if (header) {
    // A header card is a clean rounded rectangle with a fold across it.
    outline = roundedRect(0, 0, W, totalH, cornerR);
    crease.push(line([0, headerH], [W, headerH], "header-fold"));
  } else if (p.shape === "scallop") {
    outline = scallopCard(W, H, 0, p.scallopR);
  } else if (p.shape === "arch") {
    outline = archCard(W, H, 0, Math.min(mmToPt(3), W / 8));
  } else if (p.shape === "tag-top") {
    outline = tagTopCard(W, H, 0, Math.min(mmToPt(3), W / 8));
  } else {
    outline = roundedRect(0, 0, W, H, cornerR);
  }
  const cut: Polyline[] = [outline];

  // ---- hang hole(s) ----
  let topUsed = cardTop + mmToPt(5);
  if (p.hangHole) {
    if (header) {
      // Two holes mirrored across the fold (y=headerH ± headerH/2) so they
      // coincide when the header folds back — a self-registered hang hole.
      cut.push(circleCut(W / 2, headerH * 0.5, p.hangDia));
      cut.push(circleCut(W / 2, headerH * 1.5, p.hangDia));
      topUsed = headerH * 1.5 + p.hangDia / 2 + mmToPt(4);
    } else {
      const hy = (p.shape === "arch" ? mmToPt(10) : mmToPt(6)) + p.hangDia / 2;
      cut.push(circleCut(W / 2, hy, p.hangDia));
      topUsed = hy + p.hangDia / 2 + mmToPt(4);
    }
  }

  // ---- earring-pair rows (in the card body) ----
  const blockH = (pairs - 1) * rowGap;
  const top = topUsed + holeDia / 2 + mmToPt(2);
  const bot = cardTop + H - mmToPt(8) - holeDia / 2 - blockH;
  const y0 = style === "dangle"
    ? clamp(top, top, Math.max(top, bot))
    : clamp(cardTop + H * 0.34, top, Math.max(top, bot));
  const cxL = W / 2 - pairGap / 2, cxR = W / 2 + pairGap / 2;
  for (let i = 0; i < pairs; i++) {
    const cy = y0 + i * rowGap;
    cut.push(circleCut(cxL, cy, holeDia));
    cut.push(circleCut(cxR, cy, holeDia));
  }

  // ---- optional EASEL stand (a second piece, slot + tab) ----
  let widthPt = W, heightPt = totalH;
  let pieces: Polyline[] | undefined;
  if (easel) {
    // A clean rounded-rect KICKSTAND: a small insert tab centred on the top, a
    // wide stable body, and a fold score near the top (above the fold tucks to
    // the card; below it kicks out to the table to prop the card up).
    const tabW = clamp(W * 0.3, mmToPt(12), W * 0.5);
    const spec: SlotTabSpec = { tabW, depth: mmToPt(10), caliper: Math.max(p.thickness, mmToPt(0.4)) };
    // Slot in the lower-middle of the card back (receives the tab).
    cut.push(slotCut(W / 2, cardTop + H * 0.52, spec));

    const gap = Math.max(mmToPt(14), 2 * bleed + mmToPt(8));
    const tabH = mmToPt(8);                         // tab height (above the body)
    const strutW = clamp(W * 0.62, tabW + mmToPt(10), W);
    const eH = H * 0.6;                             // body height
    const rcb = mmToPt(4);                          // rounded bottom corners
    const dx = W + gap;
    const cxE = dx + strutW / 2;
    const top = tabH, bot = tabH + eH;
    const o = acc();
    lin(o, [cxE - strutW / 2, top]);                // body top-left
    lin(o, [cxE - tabW / 2, top]);                  // to tab base (left)
    lin(o, [cxE - tabW / 2, 0]);                    // up the tab
    lin(o, [cxE + tabW / 2, 0]);                    // across the tab top
    lin(o, [cxE + tabW / 2, top]);                  // down the tab (right)
    lin(o, [cxE + strutW / 2, top]);                // body top-right
    lin(o, [cxE + strutW / 2, bot - rcb]); quad(o, [cxE + strutW / 2 - rcb, bot], [cxE + strutW / 2, bot]);
    lin(o, [cxE - strutW / 2 + rcb, bot]); quad(o, [cxE - strutW / 2, bot - rcb], [cxE - strutW / 2, bot]);
    const easelOutline = close(o);
    cut.push(easelOutline);
    // Fold score near the top so the strut bends into a prop.
    crease.push(line([cxE - strutW / 2 + mmToPt(2), top + eH * 0.3], [cxE + strutW / 2 - mmToPt(2), top + eH * 0.3], "easel-fold"));

    pieces = [outline, easelOutline];
    widthPt = dx + strutW;
    heightPt = Math.max(totalH, bot);
  }

  const bleedPaths = (pieces ?? [outline]).map((pl) => bleedFromCut(pl, bleed));

  const dims: DimLine[] = [
    { x1: 0, y1: totalH, x2: W, y2: totalH, key: "L" },             // card width
    { x1: W, y1: cardTop, x2: W, y2: cardTop + H, key: "W", vertical: true }, // card height
  ];

  return {
    paths: { cut, crease, bleed: bleedPaths, glue: [] },
    widthPt,
    heightPt,
    bleedPt: bleed,
    labels: [],
    dims,
    ...(pieces ? { pieces } : {}),
  };
}
