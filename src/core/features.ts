// Phase 3 — toggleable feature OVERLAYS layered onto existing models.
//
// A model builds its base dieline and publishes named panel rects
// (`die.panels`). `applyFeatures()` then adds optional features (window cut,
// and later hanger slot / thumb notch) placed relative to those panels — so the
// overlay logic lives in ONE place and every model that publishes the right
// panel gets the feature for free.
//
// Overlays add interior CUT polylines (e.g. a window aperture is a closed cut
// inside the front panel). All coordinates in points.

import { Dieline, FeatureOptions, Polyline, Rect } from "./types";
import { arcPoints } from "./geometry";
import { mmToPt } from "./units";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Standard "Euro slot" (inverted-T / sombrero) hang hole — ISO 15348 / EN 13010
// nominal: 32 mm wide × 9 mm tall, 6.5 mm central drop-slot. Anchored to the top
// edge of a panel (typically the BACK panel), centered, `web` below the edge.
export function euroSlotCut(panel: Rect, webPt: number): Polyline {
  const W = mmToPt(32), H = mmToPt(9), slotW = mmToPt(6.5), brimH = mmToPt(3);
  const halfW = Math.min(W / 2, panel.w / 2 - mmToPt(4)); // keep ≥4mm edge web
  const halfSlot = slotW / 2;
  const rEnd = slotW / 2; // rounded bottom of the drop-slot (half-circle)
  const cx = panel.x + panel.w / 2;
  const yTop = panel.y + webPt;
  const yBrim = yTop + brimH;        // bottom of the wide top slot
  const yEnd = yTop + H;             // tip of the drop-slot
  const yArc = yEnd - rEnd;          // center of the bottom half-circle

  const pts: [number, number][] = [];
  pts.push([cx - halfW, yTop]);
  pts.push([cx + halfW, yTop]);
  pts.push([cx + halfW, yBrim]);
  pts.push([cx + halfSlot, yBrim]);
  pts.push([cx + halfSlot, yArc]);
  // half-circle bottom: right → bottom → left (y-down: bottom is +y, angle 0→π)
  for (const p of arcPoints(cx, yArc, rEnd, 0, Math.PI).slice(1)) pts.push(p);
  pts.push([cx - halfSlot, yBrim]);
  pts.push([cx - halfW, yBrim]);
  return { pts, closed: true };
}

// A rounded rectangle as a closed Polyline with quadratic-bezier corners.
// Walked clockwise from just right of the top-left corner.
export function roundedRect(x0: number, y0: number, x1: number, y1: number, r: number): Polyline {
  const rr = clamp(r, 0, Math.min(x1 - x0, y1 - y0) / 2);
  const pts: [number, number][] = [];
  const curves: ([number, number] | null)[] = [];
  const lin = (p: [number, number]) => { pts.push(p); if (pts.length > 1) curves.push(null); };
  const quad = (p: [number, number], c: [number, number]) => { pts.push(p); curves.push(c); };

  lin([x0 + rr, y0]);
  lin([x1 - rr, y0]);
  quad([x1, y0 + rr], [x1, y0]);   // top-right
  lin([x1, y1 - rr]);
  quad([x1 - rr, y1], [x1, y1]);   // bottom-right
  lin([x0 + rr, y1]);
  quad([x0, y1 - rr], [x0, y1]);   // bottom-left
  lin([x0, y0 + rr]);
  quad([x0 + rr, y0], [x0, y0]);   // top-left
  return { pts, curves, closed: true };
}

// Window aperture: a rounded rectangle inset from the front panel by `marginPt`.
export function windowCut(front: Rect, marginPt: number, radiusPt?: number): Polyline {
  const m = clamp(marginPt, 0, Math.min(front.w, front.h) / 2 - 1);
  const x0 = front.x + m, y0 = front.y + m;
  const x1 = front.x + front.w - m, y1 = front.y + front.h - m;
  const r = radiusPt ?? Math.min(x1 - x0, y1 - y0) * 0.12;
  return roundedRect(x0, y0, x1, y1, r);
}

// Thumb / finger hole: an oblong (stadium) pull-hole near the top edge of a
// panel — e.g. on a sleeve face to push the inner tray out. Centered, `web`
// below the top edge.
export function thumbCut(panel: Rect, webPt: number): Polyline {
  const thW = Math.min(panel.w * 0.5, mmToPt(40));
  const thH = Math.min(mmToPt(14), panel.h * 0.4);
  const cx = panel.x + panel.w / 2;
  const y0 = panel.y + webPt, y1 = y0 + thH;
  return roundedRect(cx - thW / 2, y0, cx + thW / 2, y1, thH / 2); // pill (full radius)
}

// Thumb cut (A57 "easy-open"): a half-moon / D-shape removed near the top
// (opening) edge of a panel — hook a thumb in to push the tuck-in tongue and
// release the lid. Distinct from `thumbCut` (an enclosed oblong finger hole on
// a sleeve face). The flat chord sits `webPt` below the panel's top edge; the
// arc bulges DOWN into the panel. Returns a closed cut polyline.
//
// `coverPt` (optional) = how far the closing TONGUE reaches down inside this
// wall from the opening edge. The whole notch (web + radius) is kept within it
// (minus a safety margin) so the tongue always BACKS the cut — a thumb presses
// on the tongue to release, and the box interior is never exposed through the
// notch. Without it (no model info), we fall back to half the panel height.
export function thumbNotchCut(panel: Rect, webPt?: number, radiusPt?: number, coverPt?: number): Polyline {
  const safety = mmToPt(1.5);
  // Total depth budget for web + radius, measured from the opening edge.
  const budget = coverPt != null
    ? Math.max(mmToPt(4), coverPt - safety)        // stay backed by the tongue
    : Math.min(panel.h * 0.5, mmToPt(20));         // no tongue info: legacy cap
  // Web: solid strip above the notch. Default scales with the budget so a
  // shallow tongue still leaves room for a usable arc.
  const web = clamp(webPt ?? Math.min(mmToPt(8), budget * 0.35), mmToPt(1.5), Math.max(mmToPt(1.5), budget - mmToPt(3)));
  const r = clamp(radiusPt ?? mmToPt(12), mmToPt(3), Math.min(panel.w / 2 - mmToPt(4), budget - web));
  const cx = panel.x + panel.w / 2;
  const yTop = panel.y + web; // the flat chord (toward the opening edge)
  // arc from the right chord end (θ=0) through the bottom (θ=π/2, y-down) to the
  // left chord end (θ=π); closing the polyline draws the flat chord left→right.
  const pts = arcPoints(cx, yTop, r, 0, Math.PI);
  return { pts, closed: true };
}

// Apply all requested overlays to a freshly-built dieline, in place + returned.
// No-ops gracefully when the model doesn't publish the panel a feature needs.
export function applyFeatures(die: Dieline, features?: FeatureOptions): Dieline {
  if (!features) return die;

  if (features.window && die.panels?.front) {
    const w = windowCut(die.panels.front, features.window.marginPt, features.window.radiusPt);
    die.paths.cut = [...die.paths.cut, w];
  }

  if (features.euroSlot && die.panels?.back) {
    const web = features.euroSlot.webPt ?? mmToPt(8);
    die.paths.cut = [...die.paths.cut, euroSlotCut(die.panels.back, web)];
  }

  if (features.thumb && die.panels?.front) {
    const web = features.thumb.webPt ?? mmToPt(10);
    die.paths.cut = [...die.paths.cut, thumbCut(die.panels.front, web)];
  }

  if (features.thumbNotch && die.panels?.front) {
    // Clamp the notch to the tongue's reach (if the model publishes it) so the
    // cut stays backed by the closing tongue — never a hole into the box.
    const cover = die.panels.frontTuckCover?.h;
    die.paths.cut = [...die.paths.cut, thumbNotchCut(die.panels.front, features.thumbNotch.webPt, features.thumbNotch.radiusPt, cover)];
  }

  return die;
}
