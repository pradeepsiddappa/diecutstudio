// Drawer Box (slide / matchbox) — a TWO-PIECE set: an inner open tray (the
// "drawer") that slides into an outer open-ended sleeve (the "cover").
//
// This is the model where "everything depends on each other": you enter the
// DRAWER size, and the sleeve is sized automatically to wrap it with a slide
// clearance — change the drawer and the sleeve follows. It composes the two
// existing parametric models (openTray + openSleeve) and lays both flats out in
// ONE dieline (drawer on top, sleeve below), so it exports as a single file and
// fits-checks against the combined sheet.
//
// Nesting math (all in points) — this is the bit that makes the drawer actually
// FIT (exact dims would jam):
//   drawer (tray) OUTER : L × W × H
//   slide gap           : clr  (≈ 0.8mm) — breathing room so it slides, not press-fits
//   sleeve panel cross  : (W + 2t + clr) × (H + 2t + clr)
//        +2t because the sleeve's OWN walls (thickness t each side) eat into its
//        inner cavity: inner = panelCross − 2t. So panelCross = drawerOuter + 2t
//        leaves inner == drawerOuter; the +clr on top is the actual slide gap.
//   sleeve length       : L (drawer slides out the open ±L ends).
//
// Dims:
//   L → drawer length (the slide axis) — sleeve length too
//   W → drawer width  → sleeve cross-width  (+ clearance)
//   H → drawer height → sleeve cross-height (+ clearance)

import { Dieline, DieLabel, Polyline } from "../types";
import { Pt } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { buildOpenTray, defaultParams as trayDefaults } from "./openTray";
import { buildOpenSleeve, defaultParams as sleeveDefaults } from "./openSleeve";

export interface DrawerBoxParams {
  L: number;
  W: number;
  H: number;
  thickness: number;
  bleed: number;
  clearance: number; // slide GAP between drawer outer and sleeve inner (pt)
  gap: number;       // spacing between the two flats on the sheet (pt)
}

export function defaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): DrawerBoxParams {
  return {
    L, W, H, thickness,
    bleed: inToPt(0.125),
    clearance: mmToPt(0.8), // pure slide gap; the sleeve's own 2t is added below
    gap: mmToPt(16),
  };
}

const shiftPL = (pl: Polyline, dx: number, dy: number): Polyline => ({
  ...(pl.id ? { id: pl.id } : {}),
  pts: pl.pts.map(([x, y]) => [x + dx, y + dy] as Pt),
  curves: pl.curves ? pl.curves.map((c) => (c ? [c[0] + dx, c[1] + dy] as Pt : null)) : undefined,
  closed: pl.closed,
});
const shiftAll = (arr: Polyline[], dx: number, dy: number) => arr.map((pl) => shiftPL(pl, dx, dy));

export function buildDrawerBox(p: DrawerBoxParams): Dieline {
  const { L, W, H, thickness: t, bleed, clearance: clr, gap } = p;

  // Drawer = open tray sized to L × W × H. Sleeve = open tube of length L whose
  // panel cross-section = drawer + 2·thickness (the sleeve's own walls) + slide
  // gap, so the sleeve INNER clears the drawer and it actually slides.
  const tray = buildOpenTray({ ...trayDefaults(L, W, H, t), bleed: 0 });
  const fit = 2 * t + clr;
  const sleeve = buildOpenSleeve({ ...sleeveDefaults(L, W + fit, H + fit, t), bleed: 0 });

  // Lay the sleeve flat BELOW the drawer flat, both left-aligned.
  const dy = tray.heightPt + gap;
  const sCut = shiftAll(sleeve.paths.cut, 0, dy);
  const sCrease = shiftAll(sleeve.paths.crease, 0, dy);
  const sGlue = shiftAll(sleeve.paths.glue, 0, dy);

  const widthPt = Math.max(tray.widthPt, sleeve.widthPt);
  const heightPt = tray.heightPt + gap + sleeve.heightPt;

  // Outer outline of each piece — drives the white-paper backing per piece.
  const pieces: Polyline[] = [tray.paths.cut[0], sCut[0]];

  const labels: DieLabel[] = [
    { x: 2, y: -mmToPt(4), text: "Drawer (tray)", anchor: "start" },
    { x: 2, y: dy - mmToPt(4), text: "Sleeve (cover)", anchor: "start" },
  ];

  return {
    paths: {
      cut: [...tray.paths.cut, ...sCut],
      crease: [...tray.paths.crease, ...sCrease],
      bleed: [], // not used — paper backing uses `pieces`; exports skip bleed
      glue: [...tray.paths.glue, ...sGlue],
    },
    widthPt,
    heightPt,
    bleedPt: bleed,
    labels,
    dims: tray.dims, // L/W/H arrows on the drawer flat
    pieces,
    // Per-piece root rects for the Fold Engine: the drawer's base + the
    // sleeve's main face.
    panels: {
      piece0: tray.panels!.base,
      piece1: { ...sleeve.panels!.front, y: sleeve.panels!.front.y + dy },
    },
  };
}
