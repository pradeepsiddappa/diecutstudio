// Animal Box — the SHARED builder for the animal-box family (bunny, cat, bear,
// fox). One four-corner glued open tray + tuck-top lid + rigid ears on the TOP
// side wall + a printable recolourable face. Each animal supplies ONLY its ear
// outline + face shapes via an AnimalSpec; everything else — body, lid, creases
// (the open-tray Fold Engine ids), glue, dims, panels, bleed — is identical.
//
// The eared wall is the TOP side wall, so the flat reads RIGHT-SIDE-UP (ears up,
// face below) and folds upright. Tips are at y=0; the front-wall top edge is at
// Y0 = earH, so the ears rise `earH` above the wall.
//
// L → front-wall width (the face goes here)   W → box depth   H → wall height.
// All math in POINTS. Origin top-left, y-down. See docs/animal-boxes.md.

import { Dieline, DimLine, Polyline, Decoration } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";

export interface AnimalBoxParams {
  L: number;          // front-wall width / base length (pt)
  W: number;          // base depth (pt)
  H: number;          // wall height (pt)
  thickness: number;  // caliper (pt)
  bleed: number;      // bleed margin (pt)
  relief: number;     // corner relief gap (pt)
  flapDepth: number;  // corner-flap wrap (pt)
  chamfer: number;    // flap drag chamfer (pt)
  tuckD: number;      // lid tuck-in flap depth (pt)
  tuckChamfer: number;// chamfer on the lid tuck flap's leading corners (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function animalDefaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): AnimalBoxParams {
  const relief = Math.max(thickness, mmToPt(1));
  const flapDepth = clamp(H * 0.8, mmToPt(5), L / 2 - relief);
  const tuckD = clamp(H * 0.7, mmToPt(8), H - relief); // tucks inside the front wall (≤ H)
  return {
    L, W, H, thickness, bleed: inToPt(0.0625),
    relief, flapDepth,
    chamfer: Math.min(flapDepth * 0.4, mmToPt(6)),
    tuckD,
    tuckChamfer: Math.min(tuckD * 0.5, L * 0.1),
  };
}

// ---- small geometry helpers shared by every animal's spec ----
export const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

/** A closed leaf (lens) centred on x, spanning baseY..tipY, bulging ±w at mid. */
export function leaf(x: number, baseY: number, tipY: number, w: number): Polyline {
  const midY = (baseY + tipY) / 2;
  return { pts: [[x, tipY], [x, baseY]], closed: true, curves: [[x + w, midY], [x - w, midY]] };
}

/** A filled closed triangle. */
export const tri = (a: Pt, b: Pt, c: Pt): Polyline => ({ pts: [a, b, c], closed: true });

/** A filled ellipse (rx/ry radii). */
export function oval(cx: number, cy: number, rx: number, ry: number, seg = 28): Polyline {
  const pts: Pt[] = [];
  for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
  return { pts, closed: true };
}

/** A filled circle of the given diameter. */
export const disc = (cx: number, cy: number, d: number, seg = 28): Polyline => oval(cx, cy, d / 2, d / 2, seg);

/** Path-builder API handed to an AnimalSpec.drawEars (Ln/Q push point + curve). */
export interface EarApi {
  Ln: (x: number, y: number) => void;                       // straight to (x,y)
  Q: (cx: number, cy: number, x: number, y: number) => void; // quad curve to (x,y), control (cx,cy)
}

export interface EarGeom {
  L: number; H: number;
  X1: number; X2: number;   // front-wall x-range = [H, H+L]
  Y0: number;               // front-wall TOP edge (ear base); tips sit at y=0
  earW: number; earH: number;
  xL: number; xR: number;   // ear centres (absolute x)
}

export interface FaceGeom extends EarGeom {
  Y1: number;               // front-wall BOTTOM edge (base crease)
  cx: number;               // wall centre x = X1 + L/2
}

export interface AnimalSpec {
  earW: (L: number) => number;
  earH: (H: number) => number;
  earCentres: (L: number, H: number) => [number, number]; // [xL, xR] absolute
  /** Draw the top edge from the current point (X1,Y0) across the ears, ending
   *  exactly at (X2,Y0) so the body outline continues. */
  drawEars: (api: EarApi, g: EarGeom) => void;
  /** Inner-ear + face decorations (filled / stroked PRINT shapes). */
  decorations: (g: FaceGeom) => Decoration[];
}

export function buildAnimalBox(p: AnimalBoxParams, spec: AnimalSpec): Dieline {
  const { L, W, H, bleed, relief: r, flapDepth: fd, chamfer: c, tuckD, tuckChamfer: tc } = p;

  const earW = spec.earW(L);
  const earH = spec.earH(H);
  const [xL, xR] = spec.earCentres(L, H);

  // open-tray cross, shifted DOWN by earH so the ears sit on top
  const X0 = 0, Xr = r, X1 = H, X2 = H + L, X3 = 2 * H + L - r, X4 = 2 * H + L;
  const Y0 = earH;             // front wall outer edge = ear base
  const Y1 = earH + H;         // base top edge (front wall ↔ base crease)
  const Y2 = earH + H + W;     // base bottom edge (base ↔ back wall crease)
  const Y4 = earH + 2 * H + W; // back wall outer edge = LID hinge
  const yLid = Y4 + W;         // lid panel far edge (lid ↔ tuck fold)
  const yTuckEnd = Y4 + W + tuckD; // lid tuck flap far edge
  const ytf = Y1 - fd, ybf = Y2 + fd;

  // ---- CUT outline (one closed polyline) ----
  const pts: Pt[] = [];
  const curves: (Pt | null)[] = [];
  const M = (x: number, y: number) => { pts.push([x, y]); };
  const Ln = (x: number, y: number) => { pts.push([x, y]); curves.push(null); };
  const Q = (cx: number, cy: number, x: number, y: number) => { pts.push([x, y]); curves.push([cx, cy]); };

  M(X1, Y0);
  spec.drawEars({ Ln, Q }, { L, H, X1, X2, Y0, earW, earH, xL, xR }); // → ends at (X2, Y0)
  Ln(X2, Y1);                                              // front wall right edge
  Ln(X2, ytf); Ln(X3 - c, ytf); Ln(X3, ytf + c); Ln(X3, Y1); // right-top flap
  Ln(X4, Y1); Ln(X4, Y2);                                  // right end-wall rim
  Ln(X3, Y2); Ln(X3, ybf - c); Ln(X3 - c, ybf); Ln(X2, ybf); Ln(X2, Y2); // right-bottom flap
  Ln(X2, Y4); Ln(X2, yLid);                                // back wall + lid right edge
  Ln(X2 - tc, yTuckEnd); Ln(X1 + tc, yTuckEnd);            // lid tuck flap (chamfered)
  Ln(X1, yLid); Ln(X1, Y4); Ln(X1, Y2);                    // lid + back wall left edge up
  Ln(X1, ybf); Ln(Xr + c, ybf); Ln(Xr, ybf - c); Ln(Xr, Y2); // left-bottom flap
  Ln(X0, Y2); Ln(X0, Y1);                                  // left end-wall rim
  Ln(Xr, Y1); Ln(Xr, ytf + c); Ln(Xr + c, ytf); Ln(X1, ytf); Ln(X1, Y1); // left-top flap
  const cutPolyline: Polyline = { pts, closed: true, curves };

  // ---- CREASE: open-tray scheme so the box folds via the SAME Fold Engine spec
  // (base-side1 = the eared FRONT wall) + the lid hinge + tuck fold. ----
  const crease: Polyline[] = [
    line([X1, Y1], [X2, Y1], "base-side1"),  // base → FRONT (eared) wall
    line([X1, Y2], [X2, Y2], "base-side2"),  // base → back wall
    line([X1, Y1], [X1, Y2], "base-end1"),   // base → left wall
    line([X2, Y1], [X2, Y2], "base-end2"),   // base → right wall
    line([Xr, Y1], [X1, Y1], "end1-flap1"),
    line([Xr, Y2], [X1, Y2], "end1-flap2"),
    line([X2, Y1], [X3, Y1], "end2-flap1"),
    line([X2, Y2], [X3, Y2], "end2-flap2"),
    line([X1, Y4], [X2, Y4], "back-lid"),    // back wall → lid (the lid hinge)
    line([X1, yLid], [X2, yLid], "lid-tuck"), // lid → tuck flap
  ];

  // ---- GLUE hatch on the 4 corner flaps ----
  const glue: Polyline[] = [];
  const step = inToPt(0.1);
  const hatch = (xa: number, xb: number, ya: number, yb: number) => {
    for (let y = ya + step; y < yb; y += step) glue.push(line([xa, y], [xb, y]));
  };
  hatch(Xr, X1, ytf, Y1); hatch(Xr, X1, Y2, ybf);
  hatch(X2, X3, ytf, Y1); hatch(X2, X3, Y2, ybf);

  // ---- DECORATIONS (printable face + inner ears) ----
  const decorations: Decoration[] = spec.decorations({
    L, H, X1, X2, Y0, Y1, earW, earH, xL, xR, cx: X1 + L / 2,
  });

  const bleedBox: Polyline = bleedFromCut(cutPolyline, bleed);
  const dims: DimLine[] = [
    { x1: X1, y1: Y1 + W / 2, x2: X2, y2: Y1 + W / 2, key: "L" },
    { x1: X1 + L / 2, y1: Y1, x2: X1 + L / 2, y2: Y2, key: "W", vertical: true },
    { x1: X4 + bleed + mmToPt(8), y1: Y0, x2: X4 + bleed + mmToPt(8), y2: Y1, key: "H", vertical: true },
  ];

  return {
    paths: { cut: [cutPolyline], crease, bleed: [bleedBox], glue },
    decorations,
    widthPt: X4,
    heightPt: yTuckEnd,
    bleedPt: bleed,
    labels: [],
    dims,
    // Only the BASE — the Fold Engine roots the tray here (rootFromFront prefers
    // `front`, which would mis-root the fold at a wall and leave the box flat).
    panels: { base: { x: X1, y: Y1, w: L, h: W } },
  };
}
