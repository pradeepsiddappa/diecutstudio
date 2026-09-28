// A dieline is a set of layered vector paths plus its true physical bounds.
// All coordinates are in POINTS, in a top-left origin, y-down system (SVG-style).

export type LayerKind = "cut" | "crease" | "bleed" | "glue";

export interface LayerStyle {
  label: string;
  color: string;
  dash?: number[]; // stroke-dasharray in pt
  width: number; // stroke width in pt
}

export const LAYER_STYLES: Record<LayerKind, LayerStyle> = {
  // Colors follow common prepress dieline conventions.
  cut: { label: "Cut / Trim", color: "#1f3bb3", width: 1 },
  crease: { label: "Crease / Fold", color: "#e0322b", width: 1, dash: [4, 3] },
  bleed: { label: "Bleed", color: "#2bb24c", width: 1, dash: [2, 2] },
  glue: { label: "Glue area", color: "#b9b9b9", width: 0.5 },
};

// A polyline is the universal geometry primitive: a list of points (M then a
// sequence of L/Q segments) plus whether the contour closes. Every exporter
// (SVG/PDF/DXF) derives from this, so all formats stay consistent.
//
// Optionally, each segment between consecutive points can be a QUADRATIC BEZIER
// instead of a straight line, by setting `curves[i]` to the control point for
// segment i (the segment ending at pts[i+1]). SVG and PDF render Q natively;
// DXF needs the curve flattened to line segments via `flattenPolyline()`.
export interface Polyline {
  pts: [number, number][];
  closed: boolean;
  /** Optional per-segment quadratic-bezier control points.
   *  curves[i] = [cx,cy] → segment from pts[i] to pts[i+1] is a Q curve.
   *  curves[i] = null    → segment is a straight line (default).
   *  May be omitted entirely (all segments straight). */
  curves?: Array<[number, number] | null>;
  /** Optional stable name. Used on CREASE polylines so the Fold Engine's
   *  per-model FoldSpec can reference hinges by id (see docs/fold-engine.md).
   *  Purely additive — rendering/export ignore it. */
  id?: string;
}

// A rectangular region of the flat dieline (points, top-left origin). Models
// publish named panel rects so feature OVERLAYS (window cut, hanger slot, thumb
// notch) can place themselves correctly without knowing each model's internals.
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// A "printable" decoration group: filled vector shapes with an EDITABLE colour.
// These are PRINT, not cut/score — e.g. an animal box's eyes / nose / inner-ears
// / mouth. Rendered as filled shapes in the preview, PDF and SVG, and as a print
// decal in 3D; DXF (a cutter format) ignores them. The model supplies a default
// colour per group; the editor lets the user recolour each `id`.
export interface Decoration {
  id: string;          // stable key for colour overrides, e.g. "eyes"
  label: string;       // editor label, e.g. "Eyes"
  color: string;       // hex (model default; user-overridable)
  shapes: Polyline[];  // closed filled paths, OR open paths when `stroke`
  /** Render as a STROKE (lines: mouth, whiskers) instead of a fill. */
  stroke?: boolean;
  strokeWidth?: number; // pt (stroked decorations only; default ~1.2pt)
}

export interface Dieline {
  // Polylines grouped by layer. All coordinates in points, top-left origin.
  paths: Record<LayerKind, Polyline[]>;
  // Optional PRINTABLE decorations (filled colour shapes) — see Decoration.
  decorations?: Decoration[];
  // Physical extent of the artwork (silhouette, excluding bleed) in points.
  widthPt: number;
  heightPt: number;
  // Bleed amount applied around the silhouette, in points.
  bleedPt: number;
  // Annotations for the on-screen preview (dimension labels etc.).
  labels: DieLabel[];
  // Dimension arrows for the on-screen preview.
  dims: DimLine[];
  // Named panel rects (e.g. "front") for placing feature overlays. Optional —
  // a model only needs to publish the panels it supports overlays on.
  panels?: Record<string, Rect>;
  // For multi-PIECE dielines (e.g. a drawer box = tray + sleeve), the outer
  // outline of each separate piece — used to draw the white-paper backing
  // behind every piece. Single-piece models omit this (the editor falls back
  // to the first cut polyline).
  pieces?: Polyline[];
  // Non-cutting print marks (e.g. crop/trim marks on an imposed sheet). Drawn
  // thin + dark in PDF/SVG only — deliberately NOT a cut layer, so a cutter
  // never cuts them and DXF (cutter format) ignores them. Set by composeSheet().
  marks?: Polyline[];
}

// ---- Phase 3 feature overlays (toggleable, layered onto existing models) ----
// Each is opt-in via FeatureOptions; applied by `applyFeatures()` after a model
// builds its base dieline, using the model's published panel rects.
export interface WindowFeature {
  marginPt: number;   // inset from the front-panel edges
  radiusPt?: number;  // corner radius (default: derived from the aperture size)
}
export interface EuroSlotFeature {
  webPt?: number;     // gap from the panel top edge to the top of the slot
}
export interface ThumbFeature {
  webPt?: number;     // gap from the panel top edge to the top of the finger hole
}
export interface ThumbNotchFeature {
  webPt?: number;     // gap from the panel top (opening) edge to the flat chord
  radiusPt?: number;  // half-moon radius (default ~12mm), clamped to fit the panel
}
export interface FeatureOptions {
  window?: WindowFeature;
  euroSlot?: EuroSlotFeature;  // inverted-T peg-display hang slot on the back panel
  thumb?: ThumbFeature;        // oblong finger hole near a panel's open edge
  thumbNotch?: ThumbNotchFeature; // half-moon easy-open thumb cut on the front lip (A57)
}

export interface DieLabel {
  x: number;
  y: number;
  text: string;
  anchor?: "start" | "middle" | "end";
  rotate?: number;
}

// A dimension annotation: a double-headed arrow spanning a measurement, with a
// label. `key` (L/W/H) lets the UI fill in the unit-aware value.
export interface DimLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  key: string;
  vertical?: boolean;
}
