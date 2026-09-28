# Bookmark (craft — Tags, labels & wraps)

A flat bookmark — a broad-appeal cut-and-print item that rounds out the
**Display & labels** batch.

## What it is
A bookmark strip with a tassel **hole** near the top, in three shapes. The
design is the user's artwork (ideally via Print & Cut); the model is the cut.

- **rounded** — rounded-rect strip (the classic)
- **pointed** — rounded top, tapering to a centred point at the bottom (banner tip)
- **scallop** — scalloped border (decorative; bump apexes touch W×H)

## Reference example(s)
- Standard bookmark ≈ 2 × 6 in (presets: Standard / Slim 1.5×7 / Wide 2.5×5).
  Generic functional forms — no traced art.

## Dimension semantics
- editor **L** → bookmark **width** (x) — param `W`
- editor **W** → bookmark **height** (y) — param `H`
- editor **H** → unused, hidden (flat item).

## Flat layout
A single closed outline = the chosen shape; one interior cut = the tassel hole
(centred, near the top). **rounded** = `roundedRect`; **pointed** = rounded top +
straight sides tapering to `(W/2, H)`; **scallop** = scalloped rounded-rect
(gift-tag fitted-radius solve, exact W×H bbox).

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `W`, `H` | bookmark width / height | 2 × 6 in |
| `shape` | rounded / pointed / scallop | rounded |
| `hole` / `holeDia` | tassel hole | on, ⌀ 1/4 in |
| `scallopR` | scallop bump radius (scallop shape) | 0.22 in |
| `bleed` | bleed margin | 0.0625 in |

## Flat-size formulas
- `bboxW = W`, `bboxH = H` exactly (pointed tip + scallop bumps stay within the
  box). No creases. Cut = outline + tassel hole = **2 closed paths**.

## Closure / locking
None — a flat bookmark.

## 3D preview
`has3DPreview: false`, `flat: true` — the editor hides the 3D pane; the canvas
dieline IS the preview. Cut several-up: `preferSheetExport: true`. Editor
exposes a **Bookmark shape** segment (rounded / pointed / scallop).

## Cut vs fold / cutting notes
- **Cut-only** — outline + hole. With Print & Cut, the user's artwork prints and
  the cutter contour-cuts the shape.

## Implementation
- File: `src/core/models/bookmark.ts`
- Exported: `buildBookmark(params)`, `defaultParams(W, H, thickness?)`,
  `BookmarkShape`
- `flat: true`, `has3DPreview: false`, `category: "tags-wraps"`, presets;
  editor `bookmarkShape` segment + URL param. Gallery has one card per shape.

## Future
- A corner (fold-over) bookmark variant; tag-top / arch shapes; tassel slot
  instead of a round hole.

## Changelog
- 2026-06-13 initial entry (Display & Labels batch #4).
