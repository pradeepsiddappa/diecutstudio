# Layered Paper Flower (craft — Party & Events)

The big layered paper flower — party backdrops, gift toppers, wreaths. Party
batch #3. (Started life as a "3D paper bow"; the loop-bow 3D never read cleanly,
and the render came out looking like a flower, so the whole model was pivoted to
a coherent flower — title, diecut and render all describe the same thing.)

## What it is
Cut several flower-**burst** layers — a solid hub with rounded petals radiating
out — in **graduated sizes**, score each at the hub so the petals curl up, then
stack them biggest-to-smallest and glue at the centre with a little **centre
disc**. The layers' petal counts/sizes match the 3D preview's tiers exactly.

## Reference example(s)
- Small / medium / backdrop (presets 4 / 6 / 12 in). Generic generated
  lobed-polygon geometry — no traced art.

## Dimension semantics
- editor **L** → flower **diameter** (the outer layer) — `D`
- editor **W / H** → unused, hidden (single-dimension item).

## Flat layout
A row of **3 flower-burst pieces** + a **centre disc**, laid out left
(biggest) → right. The shared layer table `FLOWER_LAYERS` (exported from the
model) drives both the diecut and the 3D:

| Layer | Petals | Size (of diameter) |
|---|---|---|
| outer | 6 | 1.0 |
| mid | 5 | 0.74 |
| inner | 3 | 0.5 |

Each burst: `r(α) = rHub + (R − rHub)·(½ + ½cos(count·α))^1.2` — a smooth lobed
polygon (tips at `R`, valleys at the hub `rHub = 0.45·R`). A **score circle** at
`rHub` per layer marks where the petals curl up.

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `D` | flower diameter (outer layer) | 6 in |
| `bleed` | bleed margin | 0.0625 in |

## Flat-size formula
- Cut = one burst per `FLOWER_LAYERS` entry + the centre disc =
  `layers + 1` closed paths. Crease = one hub score circle per layer.
  bbox = the row of layers + disc (the top-bar readout; **no dimension arrows** —
  editor L is the finished diameter, not the row bbox, so a dim would mislead).

## Closure / locking
No glue layer in the file — the maker scores the hubs (the red circles), curls
the petals up, stacks the layers, and glues them at the centre with the disc.

## 3D preview
`has3DPreview: true` via a **bespoke renderer** (`paperFlowerFoldable` in
`src/ui/box3d/foldable.ts`). It builds the **same lobed flower-burst layers as
the diecut** — `FLOWER_LAYERS` + the shared `burstRadius(count, R, rHub, a)`
formula — as filled triangle-fan meshes, **stacked** (biggest at the back,
smallest in front) and **cupped** by the fold slider: each rim vertex lifts in
`+Y` by `t · cup · lobe` (petal tips lift, hub stays flat), so it blooms from
flat (`t = 0`) to a domed layered flower (`t = 1` = the largest extent, which
Box3D frames its no-crop sphere on). A **flat centre disc** (a `CircleGeometry`,
NOT a sphere) caps the hub. The whole flower faces `+Y`, so it's tipped forward
(`rotation.x ≈ 1.0`) toward the low Box3D camera (~24° elevation) — otherwise it
reads edge-on; the gallery snapshot mirrors the same pose so the thumbnail
matches the editor. A `max(20mm, D)` radius guard avoids NaN geometry on a
degenerate dim. Still `flat: true` (single 2D dimension). `preferSheetExport:
true`.

> Earlier this renderer used abstract OVAL petals + a `SphereGeometry` "knob"
> for the centre — it read as a sphere, not the layered flower, and didn't use
> the diecut's actual layer shapes. Rebuilt to render the real lobed layers
> (faithful to the diecut) with a flat disc centre.

## Cut vs fold / cutting notes
- **Cut** = the petal bursts + centre disc. **Crease** = the hub score circles
  (curl the petals up here). Map blue→Cut, red→Score.

## Implementation
- File: `src/core/models/paperFlower.ts`
- Exported: `buildPaperFlower(params)`, `defaultParams(D, thickness?)`,
  `FLOWER_LAYERS` + `burstRadius` + `FLOWER_HUB_FRAC` (shared by the 3D so
  diecut ⇄ render build the SAME lobed layers).
- `flat: true`, `has3DPreview: true`, `category: "party"`, presets.

## Future
- Expose layer count / petals per layer; pointed vs rounded petal styles
  (reuse a sharper lobe exponent); a separate true **ribbon bow** model (the
  loop-bow 3D that was deferred when this pivoted to a flower).

## Changelog
- 2026-06-15 initial entry. Pivoted from a "3D paper bow" (loop-strip dieline +
  pom-pom 3D that wouldn't read) to a coherent Layered Paper Flower after the
  owner flagged the title/diecut/render mismatch.
