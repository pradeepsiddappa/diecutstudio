// Tray + Lid — Full Telescope box (ECMA C20 / FEFCO 0301).
//
// A TWO-PIECE rigid/setup box: a base open tray that holds the product, plus a
// separate lid open tray that telescopes DOWN over the base. Classic for gift
// boxes, apparel, shoeboxes, premium packaging. Like the drawer box, this is a
// model where "everything depends on each other": you enter the BASE size and
// the lid is auto-sized to slip over it with a fit clearance.
//
// It composes the existing open-tray model TWICE (base + lid) and lays both
// flats in ONE dieline (base on top, lid below), so it exports as a single file
// and fits-checks against the combined sheet — same approach as the drawer box.
//
// Nesting math (all in points) — what makes the lid actually slip over the base:
//   base (tray) floor      : L × W,  wall height H        → base OUTER ≈ (L+2t) × (W+2t)
//   fit gap                : clr (≈ 0.8mm) so it telescopes, not press-fits
//   lid (tray) floor       : (L + 2t + clr) × (W + 2t + clr)
//        +2t because the base's own walls (thickness t per side) push its outer
//        footprint out by 2t; the lid's floor must clear THAT, plus clr slack.
//   lid wall height        : lidDepth (full telescope = H, so the lid covers the
//                            whole base; a shallower lid = partial telescope).
//
// Dims:
//   L → base length  → lid length  (+ fit)
//   W → base width   → lid width   (+ fit)
//   H → base height  → lid height  (full telescope)

import { Dieline, DieLabel, Polyline } from "../types";
import { Pt } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { buildOpenTray, defaultParams as trayDefaults } from "./openTray";

export interface TrayLidParams {
  L: number;          // base floor length (pt)
  W: number;          // base floor width / depth (pt)
  H: number;          // base wall height (pt)
  thickness: number;  // material caliper (pt)
  bleed: number;      // bleed margin (pt)
  clearance: number;  // telescope GAP between base outer and lid inner (pt)
  lidDepth: number;   // lid wall height (full telescope = H) (pt)
  gap: number;        // spacing between the two flats on the sheet (pt)
}

export function defaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): TrayLidParams {
  return {
    L, W, H, thickness,
    bleed: inToPt(0.125),
    clearance: mmToPt(0.8), // pure telescope gap; the base's own 2t is added below
    lidDepth: H,            // full telescope: lid as deep as the base
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

export function buildTrayLid(p: TrayLidParams): Dieline {
  const { L, W, H, thickness: t, bleed, clearance: clr, lidDepth, gap } = p;

  // Base = open tray L × W × H. Lid = open tray whose FLOOR = base outer
  // footprint + telescope clearance, so the lid slips down over the base.
  const base = buildOpenTray({ ...trayDefaults(L, W, H, t), bleed: 0 });
  const fit = 2 * t + clr;
  const lid = buildOpenTray({ ...trayDefaults(L + fit, W + fit, lidDepth, t), bleed: 0 });

  // Lay the lid flat BELOW the base flat, both left-aligned.
  const dy = base.heightPt + gap;
  const lCut = shiftAll(lid.paths.cut, 0, dy);
  const lCrease = shiftAll(lid.paths.crease, 0, dy);
  const lGlue = shiftAll(lid.paths.glue, 0, dy);

  const widthPt = Math.max(base.widthPt, lid.widthPt);
  const heightPt = base.heightPt + gap + lid.heightPt;

  // Outer outline of each piece — drives the white-paper backing per piece.
  const pieces: Polyline[] = [base.paths.cut[0], lCut[0]];

  const labels: DieLabel[] = [
    { x: 2, y: -mmToPt(4), text: "Base (tray)", anchor: "start" },
    { x: 2, y: dy - mmToPt(4), text: "Lid (telescope cover)", anchor: "start" },
  ];

  return {
    paths: {
      cut: [...base.paths.cut, ...lCut],
      crease: [...base.paths.crease, ...lCrease],
      bleed: [], // not used — paper backing uses `pieces`; exports skip bleed
      glue: [...base.paths.glue, ...lGlue],
    },
    widthPt,
    heightPt,
    bleedPt: bleed,
    labels,
    dims: base.dims, // L/W/H arrows on the base flat
    pieces,
    // Per-piece root rects for the Fold Engine (the open-tray bases).
    panels: {
      piece0: base.panels!.base,
      piece1: { ...lid.panels!.base, y: lid.panels!.base.y + dy },
    },
  };
}
