# Jar / Product Label (craft — Tags, labels & wraps)

A label cut to size, in three classic shapes — the first dedicated **label**
item in the craft line.

## What it is
A peel-and-stick-style label cut for a jar, candle, bottle, soap, jam, etc. The
label IS the cut outline — no creases, no holes. Pick a shape, size it, drop
your artwork inside (Print & Cut), and gang a whole sheet.

- **rect** — rounded rectangle (utilitarian front label)
- **oval** — ellipse (the classic preserve / cosmetic label; W=H → round)
- **scallop** — scalloped-border rounded rect (decorative; bump apexes touch W×H)

## Reference example(s)
- Common preserve / candle label ≈ 3 × 2 in (presets: Oval small/medium, Round,
  Rect). Generic functional shapes — no traced art; the design is user-added
  artwork (Print & Cut).

## Dimension semantics
- editor **L** → label **width** (x) — param `W`
- editor **W** → label **height** (y) — param `H`
- editor **H** → unused, hidden (flat item).

## Flat layout
A single closed outline = the chosen shape, bbox exactly W×H. **rect** =
`roundedRect`; **oval** = a 56-pt ellipse (rx=W/2, ry=H/2); **scallop** = a
scalloped rounded-rect with per-edge fitted radii (same exact-bbox solve as the
gift tag — bumps span each edge a whole number of times and touch W×H).

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `W`, `H` | label width / height | 3 × 2 in |
| `shape` | rect / oval / scallop | oval |
| `scallopR` | scallop bump radius (scallop shape) | 0.22 in |
| `bleed` | bleed margin | 0.0625 in |

## Flat-size formulas
- `bboxW = W`, `bboxH = H` exactly (all three shapes fit the box). No creases,
  no holes. Cut = **1 closed outline**.

## Closure / locking
None — it's a sticker/label shape.

## 3D preview
`has3DPreview: false`, `flat: true` — the editor hides the 3D pane; the canvas
dieline IS the preview. Cut many-up: `preferSheetExport: true` (gangs a sheet of
labels). Editor exposes a **Label shape** segment (rect / oval / scallop).

## Cut vs fold / cutting notes
- **Cut-only** — one contour. With Print & Cut, the user's artwork prints inside
  and the cutter contour-cuts the shape (the label's whole value).

## Implementation
- File: `src/core/models/jarLabel.ts`
- Exported: `buildJarLabel(params)`, `defaultParams(W, H, thickness?)`,
  `JarLabelShape`
- `flat: true`, `has3DPreview: false`, `category: "tags-wraps"`, presets;
  editor `labelShape` segment + URL param. Gallery has one card per shape.

## Future
- Scalloped oval / scalloped circle; per-edge bump-count control; a "label set"
  layout (mixed shapes on one sheet).

## Changelog
- 2026-06-13 initial entry (Display & Labels batch #3).
