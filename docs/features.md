# Feature overlays (Phase 3)

Toggleable features layered onto **existing** models rather than new box styles —
window cut, hanger slot, thumb notch, etc. One overlay implementation serves
every model that publishes the panel it needs.

## How it works

1. **Models publish panel rects.** A model's `Dieline` can include
   `panels: { front: {x,y,w,h}, ... }` (points, top-left origin). A model only
   needs to publish the panels it supports overlays on. STE and RTE publish
   `panels.front` (the front panel `x_s1..x_f1 × TB..BB`).

2. **`applyFeatures(die, features)`** (`src/core/features.ts`) adds the requested
   overlays using those panel rects, then returns the dieline. It no-ops
   gracefully if the model doesn't publish the needed panel.

3. **The registry wires it in.** `ModelEntry.supportsFeatures: FeatureKind[]`
   declares which overlays a model offers; its `build({..., features})` calls
   `applyFeatures(buildX(...), features)`.

4. **The editor** shows a "Features" section with a toggle (+ params) only when
   `model.supportsFeatures` includes the feature, and threads a `FeatureOptions`
   object into `model.build`.

## Implemented

| Feature | `FeatureKind` | What it adds | Models |
|---|---|---|---|
| **Window cut** | `window` | a rounded-rectangle aperture (interior CUT polyline) inset from the front panel by `marginPt` | STE, RTE |
| **Euro hanger slot** | `euro` | an inverted-T "sombrero" peg-display slot (ISO 15348 / EN 13010: 32×9mm, 6.5mm drop-slot) anchored to the top edge of the **back** panel | STE, RTE |
| **Thumb / finger hole** | `thumb` | an oblong "pill" pull-hole near a panel's open edge (push the tray out) | Open Sleeve |
| **Thumb cut (easy-open)** | `thumb-notch` | a half-moon ("D") notch on the front panel's top lip — hook a thumb in to lift the tuck (ECMA A57) | Reverse Tuck End |

`FeatureOptions.window = { marginPt, radiusPt? }`. The aperture is a closed cut
polyline with Q-bezier rounded corners (`windowCut()` → `roundedRect()`), added
to `die.paths.cut`. It does not change the flat size. In exports it becomes a
second cut contour (the window is cut out).

**3D preview:** the window is also punched into the front panel of the 3D fold
(`buildFoldable`, threaded via `Box3D`'s `features` prop) and filled with a
translucent tinted "acetate" panel so it reads clearly (a bare hole is
white-on-white through the interior). The STE inset clears the thumb notch,
matching the dieline.

### Euro hanger slot

`FeatureOptions.euroSlot = { webPt? }`. `euroSlotCut(panel, webPt)` builds the
inverted-T outline (straight segments + a half-circle drop-slot bottom via
`arcPoints`), centered on `panels.back` and anchored `webPt` (default 8mm) below
its top edge; the slot width is capped to stay ≥4mm inside the panel. Added as a
cut polyline; no flat-size change. In the 3D fold it's punched into the **back**
panel (`makeEuroPath` in `buildFoldable`) with a dark translucent fill — rotate
the preview to see it (the back faces away by default).

### Thumb / finger hole

`FeatureOptions.thumb = { webPt? }`. `thumbCut(panel, webPt)` is an oblong pill
(`roundedRect` with full end-radius) centered on `panels.front` (the sleeve's
main face), `webPt` (default 10mm) below its top open edge. Added as a cut
polyline; no flat-size change. In the 3D fold it's punched into the sleeve's top
panel (`makeThumbPath`) with a dark fill.

### Thumb cut (easy-open, A57)

`FeatureOptions.thumbNotch = { webPt?, radiusPt? }`. `thumbNotchCut(panel, webPt,
radiusPt, coverPt?)` is a half-moon / "D" shape centered on `panels.front`: a
flat chord `webPt` below the panel's top (opening) edge, with the arc bulging
DOWN into the panel. Hook a thumb into it to push the tuck-in tongue and release
the lid — the classic easy-open cut. Added as a closed cut polyline; no
flat-size change.

**Backed by the tongue (the key constraint).** The notch is cut into the FRONT
wall, and the back lid's tongue tucks down *inside that same wall*. For the cut
to work — and to never open a hole into the box interior — the whole notch
(`webPt + radius`) must stay within the tongue's reach. The RTE publishes that
reach as `panels.frontTuckCover` (height = `tuckIn`, the tongue depth);
`thumbNotchCut` clamps `web + radius ≤ cover − 1.5mm` safety, scaling the web
and radius down on shallow tongues. Without a published cover it falls back to
`min(panel.h/2, 20mm)` (legacy). **Why it matters:** at the default RTE
(W = 0.98in → tongue ≈ 12.5mm) the old fixed 8mm web + 12mm radius reached 20mm —
8mm *past* the tongue, exposing the contents. Now the notch auto-fits the
tongue. A test sweeps dims and asserts `deepest_notch_y ≤ tongue_cover`.

**Scope = Reverse Tuck End only.** This *is* the A57 definition, and it's the
right target: the STE-family cartons (STE, tuck-top auto-bottom, snap-lock) all
carry a built-in front thumb notch already (`hasFrontNotch: true`), so a second
would be redundant; the glue carton is sealed (no lid to ease open). RTE has a
plain front and publishes `panels.front` + `panels.frontTuckCover`.

In the 3D fold the notch is derived automatically by the Fold Engine: it's a
closed interior cut, so `panelize()` makes it a HOLE in the front panel (no
bespoke `makeThumbNotchPath` — that hand-coded path was deleted in Phase 5).
Distinct from the `thumb` pill hole (a sleeve pull-hole). If the window cut is
*also* on, the two cuts simply overlap (a valid union for a cutter).

### Editor note
Interior feature apertures (window / euro / thumb) render as plain blue cut
lines on the white paper; only the **outer** cut (the silhouette) gets the
white-paper dilation + green bleed border, so the apertures don't pick up a
green halo.

## Adding a new overlay

1. Add the kind to `FeatureKind` (registry) and an options shape to
   `FeatureOptions` (`types.ts`).
2. Implement it in `applyFeatures()` using the relevant `die.panels.*` rect.
3. Have models publish the needed panel rect; list the kind in their
   `supportsFeatures`.
4. Add an editor toggle (gated on `model.supportsFeatures`).
5. Tests: overlay adds the expected geometry, stays within the panel, and
   doesn't change the flat size.

## Planned

- **Euro hanger slot** (`euro`) — a peg-display keyhole/slot near the top of the
  front/back panel.
- **Window + acetate area** and **per-side bleed** are related future options.
- **Thumb cut on more models** — extend `thumb-notch` to any tuck carton whose
  front is a plain lip (none today besides RTE; the rest already have a notch).
