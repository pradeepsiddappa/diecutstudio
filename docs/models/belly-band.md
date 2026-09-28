# Belly Band / Soap Band (craft — Tags & Wraps)

The wrap strip that goes around a product. Build-order item #5.

## What it is
A simple strip that wraps a product (soap, cards, napkins, candles, bundles),
sized to the product's **girth** (the distance around) plus an overlap to close.
Two closures:
- **glue** — the overlap region at one end is a glue zone; wrap and glue.
- **tuck-lock** — a **tab** on the far end inserts into a **slot** near the near
  end (caliper-aware slot+tab, glue-free).

## Reference example(s)
- Soap bar band: girth ~9 in, width 2 in (default). Presets for soap / napkin /
  card stack / candle jar / tea towel. Generic functional strip — no traced art.

## Dimension semantics
**FLAT item.** Editor:
- editor **L** → **girth** (distance around the product) — param `girth`
- editor **W** → **band width** (height of the strip) — param `bandW`
- editor **H** → unused, hidden.

## Flat layout
A rounded-rect strip: `length = girth + overlap`, height = `bandW`.
- glue: a glue overlap zone at the right (far) end.
- tuck-lock: a tab spliced into the right short edge + a vertical slot `overlap`
  from the left (near) end, so when the far end laps the near end by `overlap`
  the tab lands in the slot.

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `girth`, `bandW` | wrap-around distance / band width | 9 × 2 in |
| `closure` | `glue` \| `lock` | `glue` |
| `overlap` | overlap to close | `clamp(girth·0.12, 12mm, 40mm)` |
| `cornerR` | rounded end corners | 3 mm |

## Flat-size formulas
- `bboxW = girth + overlap`, `bboxH = bandW` (lock adds a small tab beyond the
  right edge). Default 9×2 in → ≈ 10.2 × 2 in; gangs 3-up Letter, 7-up Tabloid.

## Closure / locking
- **glue:** overlap + glue the two ends (glue zone marked on the overlap).
- **tuck-lock:** the slot `= slotForTab(tab spec)` (tab + caliper clearance), so
  the far-end tab is a friction tuck — glue-free.

## Cut vs fold / cutting notes
- **Zero creases** — it WRAPS a product; you fold it at the product's edges
  (no pre-scored folds, since the corner positions depend on the product).
- Gangs many-up by default (`preferSheetExport: true`).
- **Default closure = tuck-lock** (so the dieline/thumbnail show the slot+tab;
  it's also the nicer glue-free design). Glue is selectable.

## 3D preview (bespoke wrap)
`has3DPreview: true`. The band WRAPS a product (not a crease-fold), so it gets a
**bespoke** renderer (`bellyBandFoldable` in `box3d/foldable.ts`). It bends the
flat strip around a rounded-rect cross-section (perimeter = girth) — a
**developable** wrap (paper stays rigid) — into a band loop, with the overlap
lapping over at the seam. No physical product is drawn (just the wrap shape).
The fold slider PEELS the seam end up (closed = wrapped loop, open = the end
lifted, tangent-continued).

## Implementation
- File: `src/core/models/bellyBand.ts`
- Exported: `buildBellyBand(params)`, `defaultParams(girth, bandW, thickness?)`,
  `BandClosure`
- tuck-lock reuses `slotForTab`/`slotCut`/`tabEdgePts` (craft.ts).
  `has3DPreview: true` (bespoke wrap) + `flat: true` (2D naming). Size presets
  via `ModelEntry.presets`. The lock tab protrudes past `length`, so `widthPt`
  is the outline bbox, not just `length`.

## Changelog
- 2026-06-11 initial entry (Craft build-order item #5).
