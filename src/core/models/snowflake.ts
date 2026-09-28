// Geometric Snowflake — craft Decorations (decor batch #3).
// docs/craft-dielines-catalog.md §F ("geometric snowflakes").
//
// The classic snowflake-icon look: six thin ROUNDED RODS radiating from a small
// hexagonal hub, each with pairs of side branches angled FORWARD (toward the
// tip), like a fir/feather. Pure GENERATED 6-fold geometry (math, not a traced
// design), so it's IP-safe. Flat decoration — no fold, no 3D
// (`has3DPreview:false`, `flat:true`); the canvas dieline IS the preview. Cut
// many-up: `preferSheetExport:true`.
//
// All geometry in POINTS, top-left origin, y-down. ONE closed outline: a
// canonical arm (rod + forward branches) traced and rotated ×6, joined at the
// hexagonal hub so it's a single continuous contour.
//
// Dimension semantics (editor mapping):
//   editor L → snowflake DIAMETER (tip to tip)  params.D
//   editor W / H → unused (hidden)

import { Dieline, Polyline } from "../types";
import { bleedFromCut, flattenPolyline } from "../geometry";
import { inToPt } from "../units";

export interface SnowflakeParams {
  D: number;          // tip-to-tip diameter (pt)
  thickness: number;  // caliper (pt) — unused today, kept for parity
  bleed: number;      // bleed margin (pt)
}

const TAU = Math.PI * 2;
const FOLDS = 6;

export function defaultParams(D: number, thickness = inToPt(0.012)): SnowflakeParams {
  return { D, thickness, bleed: inToPt(0.0625) };
}

type P = [number, number];
const rot = (p: P, a: number): P => {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
};

// A canonical arm + the bezier control points for its rounded tip caps.
// curves[j] is the quadratic control for the segment pts[j] → pts[j+1]
// (null = straight); rotated alongside pts when the arm is copied ×6.
interface Arm { pts: P[]; curves: (P | null)[]; }

// One canonical arm pointing +x: a thin rod from the hub apothem out to a
// ROUNDED tip, with three pairs of forward-angled branch rods that are ALSO
// rounded at the tip. EVERY tip is a quadratic cap (apex = tipCentre + wb·axis,
// control = tipCentre + 2·wb·axis) so nothing reads as a sharp point. Traced
// hub corner (−30°) → lower edge out (with lower branches) → main tip → upper
// edge back (with upper branches) → hub corner (+30°). Centre-origin.
//
// curves[j] is the control for the segment pts[j] → pts[j+1] (renderer + flatten
// convention — indexed by the segment's START point), so a cap's control is
// attached to the tip-side point the cap STARTS from, NOT the one it ends at.
function armPoints(R: number): Arm {
  const w = R * 0.038;                 // main rod half-width (thin)
  const wb = R * 0.03;                 // branch half-width
  const rHub = R * 0.14;               // hexagonal hub radius
  const ap = rHub * Math.cos(Math.PI / 6); // apothem = rod base x
  const th = (50 * Math.PI) / 180;     // branch forward angle from the arm axis
  const cT = Math.cos(th), sT = Math.sin(th);
  const half = (wb / sT) * 1.1;        // branch base half-width along the rod edge
  const branches: [number, number][] = [[R * 0.42, R * 0.24], [R * 0.6, R * 0.2], [R * 0.78, R * 0.15]];

  const pts: P[] = [];
  const curves: (P | null)[] = [];
  const push = (p: P, ctrl: P | null = null) => { pts.push(p); curves.push(ctrl); };

  // hub corner (−30°) → rod base, lower
  push([rHub * Math.cos(-Math.PI / 6), rHub * Math.sin(-Math.PI / 6)]);
  push([ap, -w]);
  // lower edge out (increasing x), with rounded lower branches (axis cT,−sT)
  for (const [rb, L] of branches) {
    const tcx = rb + L * cT, tcy = -(w + L * sT);     // branch tip centre
    push([rb - half, -w]);                            // base, trailing
    push([tcx - wb * sT, tcy - wb * cT], [tcx + 2 * wb * cT, tcy - 2 * wb * sT]); // trailing tip side; ctrl caps → leading
    push([tcx + wb * sT, tcy + wb * cT]);             // leading tip side
    push([rb + half, -w]);                            // base, leading
  }
  // main tip: one rounded Q cap from the lower side to the upper side
  push([R - w, -w], [R + w, 0]);                      // ctrl caps the segment → (R−w, +w)
  push([R - w, w]);
  // upper edge back (decreasing x), with rounded upper branches (axis cT,+sT)
  for (let i = branches.length - 1; i >= 0; i--) {
    const [rb, L] = branches[i];
    const tcx = rb + L * cT, tcy = w + L * sT;        // branch tip centre
    push([rb + half, w]);                             // base, leading
    push([tcx + wb * sT, tcy - wb * cT], [tcx + 2 * wb * cT, tcy + 2 * wb * sT]); // leading tip side; ctrl caps → trailing
    push([tcx - wb * sT, tcy + wb * cT]);             // trailing tip side
    push([rb - half, w]);                             // base, trailing
  }
  // rod base, upper → hub corner (+30°)
  push([ap, w]);
  push([rHub * Math.cos(Math.PI / 6), rHub * Math.sin(Math.PI / 6)]);
  return { pts, curves };
}

export function buildSnowflake(p: SnowflakeParams): Dieline {
  const D = Math.max(p.D, inToPt(2));
  const R = D / 2;

  // Six arms around the hub, arm 0 pointing UP. Each arm ends at the next arm's
  // start (shared hub corner), so drop the trailing point to avoid duplicates.
  const ARM0 = -Math.PI / 2;
  const arm = armPoints(R);
  const outPts: P[] = [];
  const outCurves: (P | null)[] = [];
  for (let k = 0; k < FOLDS; k++) {
    const a = ARM0 + (k * TAU) / FOLDS;
    for (let i = 0; i < arm.pts.length - 1; i++) {
      outPts.push(rot(arm.pts[i], a));
      const c = arm.curves[i];
      outCurves.push(c ? rot(c, a) : null);
    }
  }

  // bbox from the FLATTENED outline so the rounded tips (which the curve apexes
  // reach, beyond the anchor points) aren't clipped by the page/bleed size.
  const raw: Polyline = { pts: outPts, closed: true, curves: outCurves };
  const fpts = flattenPolyline(raw, 16).pts;
  const minX = Math.min(...fpts.map((q) => q[0])), maxX = Math.max(...fpts.map((q) => q[0]));
  const minY = Math.min(...fpts.map((q) => q[1])), maxY = Math.max(...fpts.map((q) => q[1]));
  const ox = -minX, oy = -minY;
  const shift = (q: P): P => [q[0] + ox, q[1] + oy];
  const outline: Polyline = {
    pts: outPts.map(shift),
    closed: true,
    curves: outCurves.map((c) => (c ? shift(c) : null)),
  };

  // No dimension arrows (editor L = tip diameter; the bbox isn't a clean rect).
  return {
    paths: { cut: [outline], crease: [], bleed: [bleedFromCut(outline, p.bleed)], glue: [] },
    widthPt: maxX - minX,
    heightPt: maxY - minY,
    bleedPt: p.bleed,
    labels: [],
    dims: [],
  };
}
