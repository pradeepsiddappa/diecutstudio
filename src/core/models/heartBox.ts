// Heart-Shaped Box — a curved-wall two-piece gift box (base + lid). The classic
// Valentine's / wedding chocolate box.
//
// A heart box can't fold up from a curved base edge with a rigid crease (a curved
// fold isn't developable). It's built like a HAT BOX instead: a straight WALL
// BAND that's rolled around the heart perimeter and glued at the seam, with a row
// of bottom TABS that fold inward and glue a separate HEART FLOOR on. Two such
// assemblies — a base + a slightly larger lid that telescopes over it.
//
// The flat dieline lays out four parts: base band, base floor, lid band, lid
// floor. FLAT item (the bands roll, the floors are flat) — `flat:true`. A 3D
// preview (extruded heart prisms, lid lifting off) is a follow-up.
//
// Dimension semantics: editor L → heart width · editor H → box depth (wall
// height); the heart's height follows the width by the heart's fixed aspect.
// All geometry in POINTS, top-left origin, y-down.

import { Dieline, DimLine, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";

export interface HeartBoxParams {
  heartW: number;    // heart footprint width (pt)
  wallH: number;     // base wall height / box depth (pt)
  thickness: number; // caliper (pt)
  bleed: number;     // bleed margin (pt)
  clearance: number; // lid-over-base slip clearance (pt)
  overlap: number;   // band seam glue-overlap (pt)
  tabDepth: number;  // bottom floor-glue tab depth (pt)
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const line = (a: Pt, b: Pt, id?: string): Polyline => ({ pts: [a, b], closed: false, ...(id ? { id } : {}) });

export function defaultParams(heartW: number, wallH: number, thickness = inToPt(0.018)): HeartBoxParams {
  return {
    heartW, wallH, thickness,
    bleed: inToPt(0.0625),
    clearance: mmToPt(0.6),
    overlap: mmToPt(12),
    tabDepth: clamp(wallH * 0.32, mmToPt(7), mmToPt(14)),
  };
}

// The classic parametric heart, point DOWN.
// Raw formula domain: x=16sin³t, y=13cost−5cos2t−2cos3t−cos4t
// Raw bbox: x∈[-16,16] (width 32), y∈[~-17, ~12] — the two HUMPS peak above
// the cleft (t=0 → ry=5, the cleft; t≈0.85 → ry≈12, the hump peaks).
// In y-down screen space: cleft maps to oy, but humps extend ABOVE oy.
// Use heartBounds() to get the actual top-of-humps offset before placing hearts.
const HEART_ASPECT = 22 / 32; // cleft→tip height / width (used for the H dim)
export const heartHeight = (w: number) => w * HEART_ASPECT;

/** Actual bounding box of the heart sampled at width `w`, placed at origin (0,0).
 *  `humpAbove` = how far the hump peaks are ABOVE y=0 (the cleft anchor).
 *  `fullH` = total height from hump tops to the bottom tip. */
export function heartBounds(w: number, n = 240): { humpAbove: number; fullH: number } {
  let minY = Infinity, maxY = -Infinity;
  const s = w / 32;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const ry = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const y = (5 - ry) * s; // screen y, oy=0
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { humpAbove: -minY, fullH: maxY - minY };
}

/** Heart outline as a closed polyline of `n` points, scaled to width `w`,
 *  placed with the CLEFT (top dip between the two humps) at (ox+w/2, oy).
 *  The hump peaks extend above oy by heartBounds(w).humpAbove — call that
 *  first and offset oy accordingly so the whole heart clears what's above. */
export function heartOutline(w: number, n = 120, ox = 0, oy = 0): Pt[] {
  const s = w / 32;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const rx = 16 * Math.pow(Math.sin(t), 3);
    const ry = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    // raw x∈[-16,16] → [ox, ox+w]; cleft (ry=5) maps to oy; humps go above oy
    pts.push([(rx + 16) * s + ox, (5 - ry) * s + oy]);
  }
  return pts;
}

const perimeter = (pts: Pt[]): number => {
  let p = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    p += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return p;
};

/** A wall band: a rectangle (length L × height wallH) with a seam glue tab on the
 *  right and a comb of fold-in floor tabs along the bottom. Returns the outline,
 *  the tab-fold crease, the seam glue hatch, and the band's total bbox h. */
function band(L: number, wallH: number, p: HeartBoxParams, ox: number, oy: number) {
  const { overlap, tabDepth: tabD } = p;
  const nTabs = Math.max(8, Math.round(L / mmToPt(16)));
  const slot = L / nTabs;          // one tab+gap cell
  const tabW = slot * 0.66;        // tab width; rest is the relief gap
  const cham = Math.min(tabD * 0.5, (slot - tabW) / 2 + mmToPt(0.5));

  const pts: Pt[] = [];
  pts.push([ox, oy]);                       // top-left
  pts.push([ox + L + overlap, oy]);         // top-right (incl. seam tab)
  pts.push([ox + L + overlap, oy + wallH]); // seam tab bottom-right
  pts.push([ox + L, oy + wallH]);           // back to wall right (seam tab has no bottom tab)
  // comb of tabs along the bottom, right→left over [0, L]
  for (let i = nTabs - 1; i >= 0; i--) {
    const xR = ox + (i + 1) * slot, xTabR = ox + i * slot + (slot + tabW) / 2, xTabL = ox + i * slot + (slot - tabW) / 2, xL = ox + i * slot;
    pts.push([xR, oy + wallH]);                       // gap top (right of this tab)
    pts.push([xTabR, oy + wallH]);                    // to tab right
    pts.push([xTabR - cham, oy + wallH + tabD]);      // chamfer down
    pts.push([xTabL + cham, oy + wallH + tabD]);      // tab bottom
    pts.push([xTabL, oy + wallH]);                    // chamfer up
    pts.push([xL, oy + wallH]);                       // gap bottom (left)
  }
  // close up the left edge to (ox, oy)
  const outline: Polyline = { pts, closed: true };
  const crease = line([ox, oy + wallH], [ox + L, oy + wallH], "tab-fold"); // tabs fold in here
  const seamScore = line([ox + L, oy], [ox + L, oy + wallH], "seam"); // seam-overlap fold
  // seam glue hatch (the overlap strip)
  const glue: Polyline[] = [];
  const step = inToPt(0.1);
  for (let y = oy + step; y < oy + wallH; y += step) glue.push(line([ox + L, y], [ox + L + overlap, y]));
  return { outline, crease, seamScore, glue, h: wallH + tabD };
}

export function buildHeartBox(p: HeartBoxParams): Dieline {
  const m = mmToPt(1);
  const gap = mmToPt(8);            // layout gap between parts
  const fit = p.thickness + p.clearance; // lid grows by this on each side
  const lidWallH = clamp(p.wallH * 0.6, mmToPt(8), p.wallH); // partial telescope

  // heart sizes
  const baseW = p.heartW;
  const lidW = p.heartW + 2 * fit;  // lid heart larger so it telescopes over

  // The heart formula places the CLEFT (top dip) at oy, but the two humps peak
  // ABOVE oy by ~6.9×(w/32) ≈ 1 inch for a 5 in heart. Without accounting for
  // this, the hump tops overlap into the band above. Shift each floor down by
  // humpAbove so the hump tops sit at y, never inside the band.
  const baseBounds = heartBounds(baseW);
  const lidBounds  = heartBounds(lidW);

  const cut: Polyline[] = [];
  const crease: Polyline[] = [];
  const glue: Polyline[] = [];
  const bleed: Polyline[] = [];
  let y = m;

  // ---- BASE BAND ----
  const baseFloorPts = heartOutline(baseW, 120, 0, 0);
  const Pbase = perimeter(baseFloorPts);
  const bb = band(Pbase, p.wallH, p, m, y);
  cut.push(bb.outline); crease.push(bb.crease, bb.seamScore); glue.push(...bb.glue);
  bleed.push(rectBleed(bb.outline, p.bleed));
  y += bb.h + gap;

  // ---- BASE FLOOR (heart) ----
  // Shift oy down by humpAbove so hump tops start at y (never inside the band)
  const baseFloorY = y + baseBounds.humpAbove;
  const baseFloor: Polyline = { pts: heartOutline(baseW, 120, m, baseFloorY), closed: true };
  cut.push(baseFloor); bleed.push(bleedFromCut(baseFloor, p.bleed));
  y += baseBounds.fullH + gap;

  // ---- LID BAND ----
  const lidFloorPts = heartOutline(lidW, 120, 0, 0);
  const Plid = perimeter(lidFloorPts);
  const lb = band(Plid, lidWallH, p, m, y);
  cut.push(lb.outline); crease.push(lb.crease, lb.seamScore); glue.push(...lb.glue);
  bleed.push(rectBleed(lb.outline, p.bleed));
  y += lb.h + gap;

  // ---- LID FLOOR (heart, larger) ----
  const lidFloorY = y + lidBounds.humpAbove;
  const lidFloor: Polyline = { pts: heartOutline(lidW, 120, m, lidFloorY), closed: true };
  cut.push(lidFloor); bleed.push(bleedFromCut(lidFloor, p.bleed));
  y += lidBounds.fullH + m;

  // overall size
  const widthPt = m + Math.max(Pbase, Plid) + p.overlap + m;
  const heightPt = y;

  const dims: DimLine[] = [
    // heart width arrow at the widest point of the base floor
    { x1: m, y1: baseFloorY + heartHeight(baseW) / 2, x2: m + baseW, y2: baseFloorY + heartHeight(baseW) / 2, key: "L" },
    // wall height arrow on the base band right edge
    { x1: widthPt - m, y1: m, x2: widthPt - m, y2: m + p.wallH, key: "H", vertical: true },
  ];

  return {
    paths: { cut, crease, bleed, glue },
    pieces: cut,          // all 4 parts are separate paper pieces → each gets white backing
    widthPt, heightPt, bleedPt: p.bleed,
    labels: [],
    dims,
  };
}

/** A rectangular bleed contour around a band (avoids contour-offsetting the
 *  notched tab edge, which would self-intersect). */
function rectBleed(outline: Polyline, b: number): Polyline {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of outline.pts) { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
  return { pts: [[minX - b, minY - b], [maxX + b, minY - b], [maxX + b, maxY + b], [minX - b, maxY + b]], closed: true };
}
