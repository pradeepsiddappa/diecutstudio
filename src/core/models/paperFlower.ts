// Layered Paper Flower — craft Party & Events (party batch #3).
// docs/craft-dielines-catalog.md §F ("petal flowers (layered)").
//
// The big layered paper flower (party backdrops, gift toppers, wreaths). Cut
// several flower-BURST layers — a solid hub with rounded petals radiating out —
// in GRADUATED sizes, score each at the hub so the petals curl up, then stack
// them (biggest at the back, smallest in front) and glue at the centre with a
// little centre disc. The layers' petal counts/sizes match the 3D preview's
// tiers exactly, so the diecut, title and render all describe the same flower.
//
// FLAT die-cut item with a bespoke layered-flower 3D preview
// (`paperFlowerFoldable`). Cut many-up: `preferSheetExport: true`.
//
// All geometry in POINTS, top-left origin, y-down. Pure functional flower
// geometry (a generated lobed-polygon burst) — no traced artwork.
//
// Dimension semantics (editor mapping):
//   editor L → flower DIAMETER (the outer layer)  params.D
//   editor W / H → unused (hidden)

import { Dieline, Polyline } from "../types";
import { bleedFromCut } from "../geometry";
import { inToPt } from "../units";

export interface PaperFlowerParams {
  D: number;          // flower diameter (pt)
  thickness: number;  // caliper (pt) — unused today, kept for parity
  bleed: number;      // bleed margin (pt)
}

const TAU = Math.PI * 2;

// The graduated layers — petal count + size fraction. MUST match the tiers in
// `paperFlowerFoldable` (src/ui/box3d/foldable.ts) so the diecut and the 3D
// describe the same flower.
export const FLOWER_LAYERS = [
  { count: 6, s: 1.0 },
  { count: 5, s: 0.74 },
  { count: 3, s: 0.5 },
];

export function defaultParams(D: number, thickness = inToPt(0.012)): PaperFlowerParams {
  return { D, thickness, bleed: inToPt(0.0625) };
}

// Polar radius of a flower-burst layer at angle `a`: a hub of radius rHub with
// `count` rounded petals bumping out to radius R (1 at the tips, 0 at valleys).
// Shared so the bespoke 3D (`paperFlowerFoldable`) builds the SAME lobed layers
// as the diecut — diecut ⇄ render can't drift.
export function burstRadius(count: number, R: number, rHub: number, a: number): number {
  const lobe = Math.pow(0.5 + 0.5 * Math.cos(count * a), 1.2); // 1 at tips, 0 at valleys
  return rHub + (R - rHub) * lobe;
}
// The radial hub fraction of each layer (where the petals are scored to curl up).
export const FLOWER_HUB_FRAC = 0.45;

// A flower-burst outline: a solid hub (radius rHub) with `count` rounded petals
// bumping out to radius R. Pre-flattened to points (a smooth lobed polygon).
function flowerBurst(cx: number, cy: number, count: number, R: number, rHub: number): Polyline {
  const pts: [number, number][] = [];
  const steps = Math.max(72, count * 20);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU;
    const r = burstRadius(count, R, rHub, a);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return { pts, closed: true };
}

function circle(cx: number, cy: number, radius: number, steps = 48): Polyline {
  const pts: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU;
    pts.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
  }
  return { pts, closed: true };
}

export function buildPaperFlower(p: PaperFlowerParams): Dieline {
  const D = Math.max(p.D, inToPt(2));
  const R0 = D / 2;
  const rc = R0 * 0.18;                                  // centre-disc radius
  const gap = Math.max(inToPt(0.2), 2 * p.bleed + inToPt(0.05));

  const cut: Polyline[] = [];
  const crease: Polyline[] = [];
  const bleed: Polyline[] = [];
  const pieces: Polyline[] = [];

  // Lay the graduated burst layers + the centre disc in a row (biggest → disc).
  let x = 0;
  const cy = R0;                                         // tallest layer spans 2·R0
  for (const L of FLOWER_LAYERS) {
    const R = R0 * L.s;
    const rHub = R * FLOWER_HUB_FRAC;
    const cx = x + R;
    const burst = flowerBurst(cx, cy, L.count, R, rHub);
    cut.push(burst);
    pieces.push(burst);
    bleed.push(bleedFromCut(burst, p.bleed));
    crease.push(circle(cx, cy, rHub));                  // score: petals curl up at the hub
    x += 2 * R + gap;
  }
  const dcx = x + rc;
  const disc = circle(dcx, cy, rc);
  cut.push(disc);
  pieces.push(disc);
  bleed.push(bleedFromCut(disc, p.bleed));
  x += 2 * rc;

  // No dimension arrows: editor L is the finished flower diameter, not the
  // row-of-layers bbox, so a dim would mislead (cf. the rosette). The top-bar
  // flat-size readout gives the accurate sheet size.
  return {
    paths: { cut, crease, bleed, glue: [] },
    widthPt: x,
    heightPt: 2 * R0,
    bleedPt: p.bleed,
    labels: [],
    dims: [],
    pieces,
  };
}
