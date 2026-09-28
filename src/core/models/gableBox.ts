// Gable Top box — the peaked "house / purse" gift carton with a built-in
// die-cut carry handle (a popular retail / favour box).
//
// Flat layout, left to right (a 4-wall tube):
//   [glue flap] [Front: L] [Side: W] [Back: L] [Side: W]
// Each wall is H tall. The identity lives in the TOP:
//   - Above the FRONT and BACK panels (width L): a ROOF panel, height = the
//     slant S, with a centred die-cut handle slot. The two roof panels rotate
//     up and meet at the ridge; their handle slots register into one handle.
//     A LOCK holds the top shut (the authentic gable mechanism): each roof has
//     two lock EARS at its top corners, and each gable-end TRIANGLE has a SLIT
//     near its apex; the ears tuck into the slits (openable, glue-free).
//   - Above each SIDE panel (width W): a triangular gable EAR (apex height G
//     above the eave) with a vertical centre crease so it folds/pinches in
//     between the roof panels — these are the gable ends.
// The BOTTOM is a straight tuck (tuck panel + tongue off the Front, dust flaps
// off the Sides) — the same closure family as the STE carton.
//
// Geometry (all in POINTS, origin top-left, y down):
//   G = W/2                       gable peak height above the eave (→ 45° gable)
//   S = sqrt(G^2 + (W/2)^2)       roof-panel slant height (= W/√2 when G=W/2)
//   flat width  = glue + 2L + 2W
//   flat height = S + H + (tuckH + tongue),  tuckH = W
//
// Derived from the public, standard gable construction (inverted-V gable ends,
// 45° gable, registered handle holes, tuck bottom). No proprietary file.

import { Dieline, DieLabel, DimLine, Polyline } from "../types";
import { Pt, arcPoints, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";

export interface GableBoxParams {
  L: number;          // front/back panel width (pt)
  W: number;          // side panel width / depth (pt)
  H: number;          // wall height (pt)
  thickness: number;  // material caliper (pt)
  bleed: number;      // bleed margin (pt)
  glue: number;       // glue-flap width (pt)
  gableH: number;     // gable peak height above the eave (pt) — default W/2 (45°)
  tongue: number;     // bottom tuck-in tongue depth (pt)
  dust: number;       // bottom dust-flap reach (pt)
  handleW: number;    // handle slot length (pt)
  handleH: number;    // handle slot height (pt)
  slitLen: number;    // gable-end lock-slit length (pt) — clamped so it never
                      // reaches the apex tip or the triangle base
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): GableBoxParams {
  const gableH = W / 2; // 45° gable
  return {
    L, W, H, thickness,
    bleed: inToPt(0.125),
    glue: Math.min(inToPt(0.5), W * 0.9),
    gableH,
    tongue: Math.min(W * 0.5, inToPt(0.7)),
    dust: Math.min(W * 0.85, L * 0.45),
    handleW: clamp(L * 0.42, mmToPt(40), L - mmToPt(12)),
    handleH: mmToPt(14),
    slitLen: gableH * 0.4, // sensible default; clamped in buildGableBox
  };
}

const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

// A horizontal rounded "pill" (stadium) slot, centred at (cx, cy). Used for the
// carry handle. Width pw, height ph (fully rounded ends, radius ph/2).
function pillSlot(cx: number, cy: number, pw: number, ph: number): Polyline {
  const r = ph / 2;
  const lcx = cx - pw / 2 + r; // left cap centre
  const rcx = cx + pw / 2 - r; // right cap centre
  const pts: Pt[] = [];
  pts.push([lcx, cy - r], [rcx, cy - r]);                  // top edge L→R
  for (const p of arcPoints(rcx, cy, r, -Math.PI / 2, Math.PI / 2)) pts.push(p); // right cap
  pts.push([lcx, cy + r]);                                 // bottom edge R→L
  for (const p of arcPoints(lcx, cy, r, Math.PI / 2, (3 * Math.PI) / 2)) pts.push(p); // left cap
  return { pts, closed: true };
}

export function buildGableBox(p: GableBoxParams): Dieline {
  const { L, W, H, bleed, glue: g, gableH: G, tongue, dust, handleW, handleH } = p;

  const S = Math.sqrt(G * G + (W / 2) * (W / 2)); // roof slant height
  const tuckH = W;                                 // bottom tuck panel depth
  // Top LOCK (the authentic gable mechanism): each ROOF panel has two lock EARS
  // at its top corners that stick above the ridge; each gable-end TRIANGLE has a
  // SLIT near its apex. When erected, the ears that meet at each gable end tuck
  // into that triangle's slit → the top latches shut (openable, glue-free).
  const earH = Math.min(mmToPt(11), S * 0.32);             // ear height (above ridge)
  const earW = clamp(L * 0.13, mmToPt(10), L * 0.24);      // ear width
  const ce = Math.min(earW * 0.35, earH * 0.55);           // ear outer-corner chamfer
  const TB = earH + S;                             // eave (top) line (ears sit above the ridge, y∈[0,earH])
  const BB = TB + H;                               // bottom eave line
  const bboxW = g + 2 * L + 2 * W;
  const bboxH = earH + S + H + tuckH + tongue;

  // x boundaries
  const x0 = 0;          // glue outer edge
  const xF0 = g;         // glue | Front
  const xS1 = g + L;     // Front | Side1
  const xB0 = g + L + W; // Side1 | Back
  const xS2 = g + 2 * L + W; // Back | Side2
  const xR = g + 2 * L + 2 * W; // outer right edge

  const roofTop = TB - S;          // y of the roof panels' top edge (= 0)
  const apexY = TB - G;            // y of the gable ears' apex
  const midS1 = (xS1 + xB0) / 2;   // Side1 ear apex x
  const midS2 = (xS2 + xR) / 2;    // Side2 ear apex x

  // chamfers / tapers
  const tc = Math.min(tongue * 0.7, L * 0.25); // tongue corner chamfer
  const dc = Math.min(dust * 0.5, W * 0.25);   // dust-flap corner chamfer
  const gt = Math.min(H * 0.1, inToPt(0.2));   // glue-flap taper

  // bottom y levels
  const dustBot = BB + dust;
  const tuckBot = BB + tuckH;
  const tongueBot = BB + tuckH + tongue;

  // ---- CUT outline (one closed polyline), walked clockwise from glue top ----
  const cut: Pt[] = [];
  const P = (x: number, y: number) => cut.push([x, y]);

  // Roof top edge with a lock EAR at each corner (sticks up to y=0, chamfered).
  // Assumes the path is currently at (xa, roofTop).
  const emitRoofTop = (xa: number, xc: number) => {
    P(xa, roofTop - earH + ce);     // up the left ear's outer edge
    P(xa + ce, roofTop - earH);     // chamfer
    P(xa + earW, roofTop - earH);   // left ear top
    P(xa + earW, roofTop);          // step down into the roof
    P(xc - earW, roofTop);          // flat across the ridge
    P(xc - earW, roofTop - earH);   // up the right ear
    P(xc - ce, roofTop - earH);
    P(xc, roofTop - earH + ce);     // chamfer
    P(xc, roofTop);                 // end at (xc, roofTop)
  };

  // glue flap top taper → eave
  P(x0, TB + gt);
  P(gt, TB);
  P(xF0, TB);
  // FRONT roof panel (ridge edge with two lock ears)
  P(xF0, roofTop);
  emitRoofTop(xF0, xS1);
  P(xS1, TB);
  // SIDE1 gable ear (triangle up to apex)
  P(midS1, apexY);
  P(xB0, TB);
  // BACK roof panel (ridge edge with two lock ears)
  P(xB0, roofTop);
  emitRoofTop(xB0, xS2);
  P(xS2, TB);
  // SIDE2 gable ear
  P(midS2, apexY);
  P(xR, TB);
  // outer right edge down
  P(xR, BB);
  // ---- bottom (right → left) ----
  // Side2 dust flap
  P(xR, dustBot - dc);
  P(xR - dc, dustBot);
  P(xS2 + dc, dustBot);
  P(xS2, dustBot - dc);
  P(xS2, BB);
  // Back bottom — plain edge
  P(xB0, BB);
  // Side1 dust flap
  P(xB0, dustBot - dc);
  P(xB0 - dc, dustBot);
  P(xS1 + dc, dustBot);
  P(xS1, dustBot - dc);
  P(xS1, BB);
  // Front tuck panel + tongue
  P(xS1, tuckBot);
  P(xS1 - tc, tongueBot);
  P(xF0 + tc, tongueBot);
  P(xF0, tuckBot);
  P(xF0, BB);
  // glue flap bottom taper + left edge
  P(gt, BB);
  P(x0, BB - gt);

  const cutPolyline: Polyline = { pts: cut, closed: true };

  // ---- Handle slots (interior cuts) — one per roof panel, centred, near top.
  const handleCy = roofTop + mmToPt(12) + handleH / 2;
  const handleFront = pillSlot((xF0 + xS1) / 2, handleCy, handleW, handleH);
  const handleBack = pillSlot((xB0 + xS2) / 2, handleCy, handleW, handleH);

  // ---- Lock SLITS — one inside each gable-end triangle. The roof ears that
  // meet at that gable end tuck into the slit (vertical open cuts).
  //  • the slit starts well BELOW the apex so a solid tip remains (no fragile
  //    point that would tear),
  //  • its length is user-tunable (`slitLen`) but CLAMPED so it can never reach
  //    the apex tip or the triangle base/eave.
  const slitGap = clamp(G * 0.28, mmToPt(7), G * 0.5); // solid tip above the slit
  const baseMargin = mmToPt(5);                        // solid material at the base
  const maxSlitLen = Math.max(mmToPt(3), G - slitGap - baseMargin);
  const slitLen = clamp(p.slitLen, mmToPt(3), maxSlitLen);
  const triSlit = (mid: number): Polyline => ({
    pts: [[mid, apexY + slitGap], [mid, apexY + slitGap + slitLen]],
    closed: false,
  });
  const slit1 = triSlit(midS1);
  const slit2 = triSlit(midS2);

  // ---- CREASE (fold) lines ----
  const crease: Polyline[] = [];
  // vertical wall folds (body height)
  const vIds = ["glue-front", "front-side1", "side1-back", "back-side2"];
  [xF0, xS1, xB0, xS2].forEach((x, i) => crease.push(line([x, TB], [x, BB], vIds[i])));
  // eave creases (top of each wall)
  const eaveIds = ["roof-front", "tri-side1", "roof-back", "tri-side2"];
  ([[xF0, xS1], [xS1, xB0], [xB0, xS2], [xS2, xR]] as [number, number][])
    .forEach(([a, b], i) => crease.push(line([a, TB], [b, TB], eaveIds[i])));
  // (no centre crease on the gable triangles — they're rigid gable ends that
  //  fold in only at the eave; the slit + roof ears do the locking)
  // lock-ear folds (2 per roof panel) so each ear folds in to tuck into a slit
  const earIds = ["ear-f1", "ear-f2", "ear-b1", "ear-b2"];
  ([
    [xF0, xF0 + earW], [xS1 - earW, xS1],   // front roof ears
    [xB0, xB0 + earW], [xS2 - earW, xS2],   // back roof ears
  ] as [number, number][])
    .forEach(([a, b], i) => crease.push(line([a, roofTop], [b, roofTop], earIds[i])));
  // bottom eave creases over the flap-bearing panels (Front tuck + 2 dust)
  const botIds = ["front-bottom", "side1-bottom", "side2-bottom"];
  ([[xF0, xS1], [xS1, xB0], [xS2, xR]] as [number, number][])
    .forEach(([a, b], i) => crease.push(line([a, BB], [b, BB], botIds[i])));
  // tongue fold (tuck panel → tongue) on the Front bottom
  crease.push(line([xF0, tuckBot], [xS1, tuckBot], "tongue-bottom"));

  // ---- GLUE area hatch (diagonal, on the glue flap) ----
  const glueHatch: Polyline[] = [];
  const step = inToPt(0.12);
  const gh = BB - TB;
  for (let c = -gh; c < xF0 - x0; c += step) {
    const xs = Math.max(x0, x0 + c);
    const ys = TB + (xs - x0 - c);
    const xe = Math.min(xF0, x0 + c + gh);
    const ye = TB + (xe - x0 - c);
    if (xe > xs) glueHatch.push(line([xs, ys], [xe, ye]));
  }

  // ---- BLEED — true contour offset of the outer cut ----
  const bleedBox: Polyline = bleedFromCut(cutPolyline, bleed);

  // ---- dimension arrows ----
  const midY = (TB + BB) / 2;
  const dims: DimLine[] = [
    { x1: xF0, y1: midY, x2: xS1, y2: midY, key: "L" }, // L across Front
    { x1: xS1, y1: midY, x2: xB0, y2: midY, key: "W" }, // W across Side1
    { x1: xR + bleed + mmToPt(8), y1: TB, x2: xR + bleed + mmToPt(8), y2: BB, key: "H", vertical: true },
  ];
  const labels: DieLabel[] = [];

  return {
    paths: {
      cut: [cutPolyline, handleFront, handleBack, slit1, slit2],
      crease,
      bleed: [bleedBox],
      glue: glueHatch,
    },
    widthPt: bboxW,
    heightPt: bboxH,
    bleedPt: bleed,
    labels,
    dims,
    panels: {
      // Front wall (the body, below the eave) — available for a window overlay.
      front: { x: xF0, y: TB, w: L, h: H },
    },
  };
}
