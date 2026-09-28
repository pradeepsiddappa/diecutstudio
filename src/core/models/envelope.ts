// Envelope — craft Envelopes & Cards (docs/craft-dielines-catalog.md §A).
//
// The classic diamond / A-style announcement envelope: a single flat blank
// whose centre is the finished FACE (W×H = the pocket), with four flaps that
// fold inward:
//
//                 [   top CLOSURE flap   ]      ← square or pointed, depth TF
//      [ left ]   [        FACE  W×H      ]   [ right ]   ← side flaps, depth SF
//                 [   bottom flap (glue)  ]      ← depth BF, glues over the sides
//
// Assembly: fold the two side flaps in, fold the bottom flap up and GLUE it over
// the side-flap corners → the pocket. Insert the card. Fold the closure flap
// down and seal. Two closure styles: "square" (announcement / A-style, gently
// rounded corners) and "pointed" (baronial / invitation). Optional contrast
// LINER as a second piece (glue inside the closure flap).
//
// All math in POINTS (1 in = 72 pt). Origin top-left, y increases downward.
// Pure functional geometry (a centuries-old utilitarian form) — never traced.
//
// Dimension semantics (editor mapping, FLAT item):
//   editor L → envelope WIDTH  (x)  param.W   (the open/sealed long edge)
//   editor W → envelope HEIGHT (y)  param.H
//   editor H → unused, hidden

import { Dieline, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";

export type EnvelopeFlap = "square" | "pointed" | "diamond" | "wallet" | "catalog";

export interface EnvelopeParams {
  W: number;          // face width (pt)
  H: number;          // face height (pt)
  thickness: number;  // caliper (pt)
  bleed: number;      // bleed margin (pt)
  flap: EnvelopeFlap; // closure flap style
  sideFlap: number;   // side flap depth (pt, each)
  topFlap: number;    // closure flap depth (pt)
  bottomFlap: number; // bottom flap depth (pt)
  liner: boolean;     // include a contrast liner piece
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(W: number, H: number, thickness = inToPt(0.012)): EnvelopeParams {
  return {
    W, H, thickness,
    bleed: inToPt(0.0625),
    flap: "square",
    sideFlap: clamp(W * 0.32, mmToPt(10), W * 0.46),
    topFlap: clamp(H * 0.52, mmToPt(20), H * 0.85),
    bottomFlap: clamp(H * 0.5, mmToPt(15), H * 0.7),
    liner: false,
  };
}

const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

// Horizontal-scanline hatch of a triangle (a glue-zone fill hint).
function hatchTriangle(a: Pt, b: Pt, c: Pt, step: number, out: Polyline[]) {
  const y0 = Math.min(a[1], b[1], c[1]);
  const y1 = Math.max(a[1], b[1], c[1]);
  const edges: [Pt, Pt][] = [[a, b], [b, c], [c, a]];
  for (let y = y0 + step; y < y1; y += step) {
    const xs: number[] = [];
    for (const [p, q] of edges) {
      if ((p[1] <= y && q[1] > y) || (q[1] <= y && p[1] > y)) {
        const t = (y - p[1]) / (q[1] - p[1]);
        xs.push(p[0] + t * (q[0] - p[0]));
      }
    }
    if (xs.length >= 2) { xs.sort((m, n) => m - n); out.push(line([xs[0], y], [xs[xs.length - 1], y])); }
  }
}

// ---------------------------------------------------------------------------
// DIAMOND envelope (the classic wedding / invitation "banker" envelope): ALL
// four flaps come to a POINT (top + both sides) or a wide TRUNCATED point
// (bottom), every tip ROUNDED, with a small relief chamfer at each face corner
// so adjacent flaps don't bind when folded. Folded, the two side-flap points
// tuck under the bottom flap and the diagonal seams meet near the centre — the
// look of a real lined invitation envelope.
//
// Proportions are DERIVED from the face W×H (ignoring the trapezoid-style flap
// depths) using the canonical ISO C5 reference (face 229×162, blank 409×387,
// top flap 135, side/bottom flaps 90, flat bottom 70, tip radius 15, bottom
// radius 10, corner relief 3 mm), so any size reproduces those exact ratios.
function buildDiamondEnvelope(p: EnvelopeParams): Dieline {
  const { W, H, bleed } = p;

  // Reference ratios (mm-of-reference / face-dim-of-reference).
  const SF = W * (90 / 229);   // side flap depth (each)
  const TF = H * (135 / 162);  // top closure flap depth
  const BF = H * (90 / 162);   // bottom flap depth
  const bottomFlat = W * (70 / 229); // flat width of the truncated bottom point
  const g = clamp(mmToPt(3), 0, Math.min(SF, TF, BF) * 0.25); // corner relief chamfer
  const r1 = clamp(mmToPt(15), mmToPt(2), Math.min(SF, TF, BF) * 0.42); // pointed-tip radius
  const r2 = clamp(mmToPt(10), mmToPt(2), bottomFlat * 0.42);           // bottom-corner radius

  const Xr = 2 * SF + W, Yb = TF + H + BF;
  const cx = SF + W / 2, cy = TF + H / 2;
  // Face corners
  const A: Pt = [SF, TF], B: Pt = [SF + W, TF], C: Pt = [SF + W, TF + H], D: Pt = [SF, TF + H];
  // Tips
  const apex: Pt = [cx, 0], RT: Pt = [Xr, cy], LT: Pt = [0, cy];
  const BR: Pt = [cx + bottomFlat / 2, Yb], BL: Pt = [cx - bottomFlat / 2, Yb];
  // Shortened flap-base ends (relief chamfers cut across each face corner)
  const a_top: Pt = [A[0] + g, TF], b_top: Pt = [B[0] - g, TF];
  const b_side: Pt = [B[0], TF + g], c_side: Pt = [C[0], C[1] - g];
  const c_bot: Pt = [C[0] - g, C[1]], d_bot: Pt = [D[0] + g, D[1]];
  const d_side: Pt = [D[0], D[1] - g], a_side: Pt = [A[0], TF + g];

  // ---- CUT outline (one closed polyline, clockwise from the top flap) ----
  const pts: Pt[] = [];
  const curves: (Pt | null)[] = [];
  const lin = (q: Pt) => { pts.push(q); if (pts.length > 1) curves.push(null); };
  const quad = (q: Pt, ctrl: Pt) => { pts.push(q); curves.push(ctrl); };
  const unit = (from: Pt, to: Pt): Pt => {
    const dx = to[0] - from[0], dy = to[1] - from[1], L = Math.hypot(dx, dy) || 1;
    return [dx / L, dy / L];
  };
  // Round the tip at V coming from `from`, leaving toward `to` (caller has
  // already placed `from` or a collinear point): straight in to the entry, then
  // a Q-bezier across V to the exit.
  const roundTip = (V: Pt, from: Pt, to: Pt, r: number) => {
    const ein = unit(V, from), eout = unit(V, to);
    lin([V[0] + ein[0] * r, V[1] + ein[1] * r]);
    quad([V[0] + eout[0] * r, V[1] + eout[1] * r], V);
  };

  lin(a_top);
  roundTip(apex, a_top, b_top, r1);   // rounded top point
  lin(b_top);
  lin(b_side);                        // relief chamfer across corner B
  roundTip(RT, b_side, c_side, r1);   // rounded right point
  lin(c_side);
  lin(c_bot);                         // relief chamfer across corner C
  roundTip(BR, c_bot, BL, r2);        // rounded bottom-right corner
  roundTip(BL, BR, d_bot, r2);        // rounded bottom-left corner
  lin(d_bot);
  lin(d_side);                        // relief chamfer across corner D
  roundTip(LT, d_side, a_side, r1);   // rounded left point
  lin(a_side);
  // close a_side -> a_top = relief chamfer across corner A

  const cutOutline: Polyline = { pts, curves, closed: true };

  // ---- CREASE (fold) lines: the four flap hinges, named for the Fold Engine.
  // Each spans the flap BASE between the corner-relief chamfer endpoints (NOT
  // the full face edge — the 3 mm chamfers cut the face corners off the blank,
  // so a full-edge crease would poke outside the cut and panelize would carve
  // sliver panels at the corners). Same fold line/axis; canonical direction
  // (horizontal L→R, vertical T→B) so the FoldSpec signs hold. ----
  const crease: Polyline[] = [
    line(a_top, b_top, "base-top"),     // top closure flap hinge
    line(b_side, c_side, "base-right"), // right flap hinge
    line(d_bot, c_bot, "base-bottom"),  // bottom flap hinge
    line(a_side, d_side, "base-left"),  // left flap hinge
  ];

  // ---- GLUE: the bottom flap's two slanted edges bond over the side flaps ----
  const glue: Polyline[] = [];
  const step = inToPt(0.1);
  hatchTriangle(D, d_bot, BL, step, glue);   // bottom-left underlap
  hatchTriangle(C, c_bot, BR, step, glue);   // bottom-right underlap

  const dims: DimLine[] = [
    { x1: A[0], y1: cy, x2: B[0], y2: cy, key: "L" },
    { x1: cx, y1: A[1], x2: cx, y2: D[1], key: "W", vertical: true },
  ];

  return {
    paths: { cut: [cutOutline], crease, bleed: [bleedFromCut(cutOutline, bleed)], glue },
    widthPt: Xr,
    heightPt: Yb,
    bleedPt: bleed,
    labels: [],
    dims,
    panels: { base: { x: SF, y: TF, w: W, h: H } },
  };
}

// ---------------------------------------------------------------------------
// WALLET / POCKET envelope (the portrait card / document envelope): a SMALL
// rounded top closure flap, SMALL side flaps, and a LONG bottom flap that folds
// up to form the pocket (it covers most of the back). All flap tips are square
// with rounded corners — not pointed. Opens at the top.
//
// Shared by two real portrait-pocket envelopes that differ only in which flap is
// the big pocket-former (all square/rounded flaps, derived from C5-portrait):
//   - WALLET  : small top + small SIDES + long BOTTOM flap (the bottom forms the
//               pocket). Ref blank 202×469 (sf 20/162, bf 190/229).
//   - CATALOG : small top + LARGE SIDES + small bottom (the two big side flaps
//               fold in and overlap at the centre = a back seam; the open-end /
//               catalog / manila document envelope). Ref blank 332×314
//               (sf 85/162, bf 35/229).
// Pass the flap-depth ratios; any face size reproduces the reference proportions.
function buildPocketEnvelope(p: EnvelopeParams, tfR: number, sfR: number, bfR: number): Dieline {
  const { W, H, bleed } = p;

  const TF = H * tfR;   // top closure flap
  const SF = W * sfR;   // side flaps (each)
  const BF = H * bfR;   // bottom flap
  const t = clamp(mmToPt(5), 0, Math.min(SF, TF, BF) * 0.4);          // edge taper / shoulder
  const r = clamp(mmToPt(10), mmToPt(2), Math.min(TF, SF, BF) * 0.8); // corner radius

  const Xl = 0, Xr = 2 * SF + W, Yt = 0, Yb = TF + H + BF;
  const A: Pt = [SF, TF], B: Pt = [SF + W, TF], C: Pt = [SF + W, TF + H], D: Pt = [SF, TF + H];

  // ---- CUT outline (one closed polyline, clockwise from face TL) ----
  const pts: Pt[] = [];
  const curves: (Pt | null)[] = [];
  const lin = (q: Pt) => { pts.push(q); if (pts.length > 1) curves.push(null); };
  const quad = (q: Pt, ctrl: Pt) => { pts.push(q); curves.push(ctrl); };

  lin(A);
  // TOP closure flap (rounded trapezoid, folds DOWN to close)
  lin([SF + t, Yt + r]);                          // up the left taper
  quad([SF + t + r, Yt], [SF + t, Yt]);           // round top-left
  lin([SF + W - t - r, Yt]);                      // top edge
  quad([SF + W - t, Yt + r], [SF + W - t, Yt]);   // round top-right
  lin(B);
  // RIGHT side flap (small, rounded outer corners)
  lin([Xr - r, TF + t]);
  quad([Xr, TF + t + r], [Xr, TF + t]);           // round outer-top
  lin([Xr, TF + H - t - r]);
  quad([Xr - r, TF + H - t], [Xr, TF + H - t]);   // round outer-bottom
  lin(C);
  // BOTTOM pocket flap (long rounded trapezoid, folds UP to form the pocket)
  lin([SF + W - t, Yb - r]);                       // down the right taper
  quad([SF + W - t - r, Yb], [SF + W - t, Yb]);    // round bottom-right
  lin([SF + t + r, Yb]);                           // bottom edge
  quad([SF + t, Yb - r], [SF + t, Yb]);            // round bottom-left
  lin(D);
  // LEFT side flap
  lin([Xl + r, TF + H - t]);
  quad([Xl, TF + H - t - r], [Xl, TF + H - t]);   // round outer-bottom
  lin([Xl, TF + t + r]);
  quad([Xl + r, TF + t], [Xl, TF + t]);           // round outer-top
  // close to A

  const cutOutline: Polyline = { pts, curves, closed: true };

  // ---- CREASE: the four FACE edges (flaps meet at the face corners → clean
  // 5-panel / 4-hinge panelize). Canonical direction. ----
  const crease: Polyline[] = [
    line(A, B, "base-top"),
    line(B, C, "base-right"),
    line(D, C, "base-bottom"),
    line(A, D, "base-left"),
  ];

  // ---- GLUE: a NARROW seam strip along the outer edge of ONE side flap (that
  // edge laps over the other flap / the back when folded — the real bond is a
  // thin gum line, not the whole flap). ----
  const glue: Polyline[] = [];
  const step = inToPt(0.09);
  const gw = Math.min(SF * 0.45, mmToPt(14));   // seam strip width (small)
  const gx2 = Xr - r * 0.5, gx1 = gx2 - gw;     // just inside the right flap's outer edge
  for (let y = TF + t + step; y < TF + H - t; y += step) {
    glue.push(line([gx1, y], [gx2, y]));
  }

  const dims: DimLine[] = [
    { x1: A[0], y1: TF + H / 2, x2: B[0], y2: TF + H / 2, key: "L" },
    { x1: SF + W / 2, y1: A[1], x2: SF + W / 2, y2: D[1], key: "W", vertical: true },
  ];

  return {
    paths: { cut: [cutOutline], crease, bleed: [bleedFromCut(cutOutline, bleed)], glue },
    widthPt: Xr,
    heightPt: Yb,
    bleedPt: bleed,
    labels: [],
    dims,
    panels: { base: { x: SF, y: TF, w: W, h: H } },
  };
}

export function buildEnvelope(p: EnvelopeParams): Dieline {
  if (p.flap === "diamond") return buildDiamondEnvelope(p);
  if (p.flap === "wallet") return buildPocketEnvelope(p, 50 / 229, 20 / 162, 190 / 229);   // big BOTTOM flap
  if (p.flap === "catalog") return buildPocketEnvelope(p, 50 / 229, 85 / 162, 35 / 229);   // big SIDE flaps (centre seam)
  const { W, H, bleed, flap, liner } = p;
  const SF = p.sideFlap, TF = p.topFlap, BF = p.bottomFlap;

  // Miter shoulders — adjacent flaps meet at the four FACE corners; the mitered
  // edges give folding clearance. Side ≈ 45°; bottom less tapered (wide, glued).
  const ssh = clamp(SF, mmToPt(3), H / 2 - mmToPt(3));        // side flap top/bottom miter
  const tsh = clamp(SF, mmToPt(3), W / 2 - mmToPt(8));         // closure flap side miter
  const bsh = clamp(SF * 0.6, mmToPt(3), W / 2 - mmToPt(8));   // bottom flap side miter
  const rc = Math.min(mmToPt(5), tsh * 0.5, (W - 2 * tsh) * 0.12); // square-flap corner radius

  // Blank boundaries
  const Xl = 0, Xr = 2 * SF + W;             // left / right outer
  const Yt = 0, Yb = TF + H + BF;            // top / bottom outer
  // Face corners
  const A: Pt = [SF, TF];                     // face TL
  const B: Pt = [SF + W, TF];                 // face TR
  const C: Pt = [SF + W, TF + H];             // face BR
  const D: Pt = [SF, TF + H];                 // face BL

  // ---- CUT outline: one closed polyline, walked clockwise from face TL ----
  const pts: Pt[] = [];
  const curves: (Pt | null)[] = [];
  const lin = (q: Pt) => { pts.push(q); if (pts.length > 1) curves.push(null); };
  const quad = (q: Pt, ctrl: Pt) => { pts.push(q); curves.push(ctrl); };

  lin(A);
  // TOP closure flap
  if (flap === "pointed") {
    lin([SF + W / 2, Yt]);                                   // apex
  } else {
    // square: trapezoid with softly rounded outer corners
    if (rc > 0.5) {
      lin([SF + tsh, Yt + rc]);                              // up the left miter
      quad([SF + tsh + rc, Yt], [SF + tsh, Yt]);             // rounded top-left
      lin([SF + W - tsh - rc, Yt]);                          // top edge
      quad([SF + W - tsh, Yt + rc], [SF + W - tsh, Yt]);     // rounded top-right
    } else {
      lin([SF + tsh, Yt]);
      lin([SF + W - tsh, Yt]);
    }
  }
  lin(B);
  // RIGHT side flap
  lin([Xr, TF + ssh]);
  lin([Xr, TF + H - ssh]);
  lin(C);
  // BOTTOM flap
  lin([SF + W - bsh, Yb]);
  lin([SF + bsh, Yb]);
  lin(D);
  // LEFT side flap
  lin([Xl, TF + H - ssh]);
  lin([Xl, TF + ssh]);
  // close back to A (left flap top miter)

  const cutOutline: Polyline = { pts, curves, closed: true };

  // ---- CREASE (fold) lines: the four FACE edges (named so the Fold Engine
  //      can reference each flap hinge — see src/core/fold/specs.ts). Each is
  //      drawn in the CANONICAL direction (horizontal left→right, vertical
  //      top→bottom) because panelize takes the hinge axis from the drawn point
  //      order (it does NOT re-canonicalize); the FoldSpec signs assume this, so
  //      a reversed crease would fold its flap the WRONG way (an S/Z twist). ----
  const crease: Polyline[] = [
    line(A, B, "base-top"),     // closure flap hinge (top edge, left→right)
    line(B, C, "base-right"),   // right flap hinge (right edge, top→bottom)
    line(D, C, "base-bottom"),  // bottom flap hinge (bottom edge, left→right)
    line(A, D, "base-left"),    // left flap hinge (left edge, top→bottom)
  ];

  // ---- GLUE: the two bottom-flap corner triangles bond the pocket ----
  const glue: Polyline[] = [];
  const step = inToPt(0.1);
  hatchTriangle(D, [SF + bsh, Yb], [SF, Yb], step, glue);                 // bottom-left
  hatchTriangle(C, [SF + W - bsh, Yb], [SF + W, Yb], step, glue);         // bottom-right
  // Closure seal strip (the gum line) — square flap only (a straight band).
  if (flap === "square") {
    const sealTop = Yt + Math.min(mmToPt(4), TF * 0.18);
    const sealBot = sealTop + Math.min(mmToPt(7), TF * 0.25);
    for (let y = sealTop; y < sealBot; y += inToPt(0.09)) {
      // clip the band to the trapezoid width at this y
      const t = (y - Yt) / (TF || 1);
      const xL = SF + tsh * (1 - t), xR = SF + W - tsh * (1 - t);
      glue.push(line([xL, y], [xR, y]));
    }
  }

  // ---- BLEED contour ----
  const bleedPaths: Polyline[] = [bleedFromCut(cutOutline, bleed)];

  let widthPt = Xr;
  let heightPt = Yb;
  let pieces: Polyline[] | undefined;
  const cut: Polyline[] = [cutOutline];

  // ---- Optional contrast LINER (a second piece, glued inside the flap) ----
  if (liner) {
    const li = mmToPt(1.5);                     // inset so it fits inside
    const drop = clamp(H * 0.2, mmToPt(8), H * 0.5); // how far it reaches into the face
    const gap = Math.max(mmToPt(14), 2 * bleed + mmToPt(8));
    const dx = Xr + gap - SF;                    // translate the local shape to the right
    const T = (q: Pt): Pt => [q[0] + dx, q[1]];

    const lp: Pt[] = [];
    if (flap === "pointed") {
      lp.push(T([SF + W / 2, li]));                                   // apex (inset down)
    } else {
      lp.push(T([SF + tsh + li, li]));
      lp.push(T([SF + W - tsh - li, li]));
    }
    lp.push(T([SF + W - li, TF]));                                    // right shoulder
    lp.push(T([SF + W - li, TF + drop - li]));                        // right, into the face
    lp.push(T([SF + li, TF + drop - li]));                            // left, into the face
    lp.push(T([SF + li, TF]));                                        // left shoulder
    const linerOutline: Polyline = { pts: lp, closed: true };
    cut.push(linerOutline);
    bleedPaths.push(bleedFromCut(linerOutline, bleed));
    pieces = [cutOutline, linerOutline];
    widthPt = Xr + gap + W;
    heightPt = Math.max(Yb, TF + drop);
  }

  // ---- Dimensions (face W × H) ----
  const dims: DimLine[] = [
    { x1: A[0], y1: TF + H / 2, x2: B[0], y2: TF + H / 2, key: "L" },   // width
    { x1: SF + W / 2, y1: A[1], x2: SF + W / 2, y2: D[1], key: "W", vertical: true }, // height
  ];

  return {
    paths: { cut, crease, bleed: bleedPaths, glue },
    widthPt,
    heightPt,
    bleedPt: bleed,
    labels: [],
    dims,
    // The face is the Fold Engine's root panel (the four flaps hinge off it).
    panels: { base: { x: SF, y: TF, w: W, h: H } },
    ...(pieces ? { pieces } : {}),
  };
}
