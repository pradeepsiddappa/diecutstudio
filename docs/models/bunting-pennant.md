# Bunting Pennant (craft — Party & Events)

A single flag for a bunting / banner garland. Build-order item #6, and the first
**Party** category item.

## What it is
One pennant flag; you cut many and string them through the lacing holes to make
a banner. Three shapes:
- **triangle** — the classic pennant, point down.
- **swallowtail** — a rectangle with a V notched into the bottom (forked tail).
- **scallop** — a rectangle with a scalloped bottom edge (reuses `scallopEdge`).

Two lacing holes near the top corners thread the string.

## Reference example(s)
- Common bunting sizes (presets): mini 3×4, small 4×5, medium 5×7, large 6×8 in.
  Generic functional flag shapes — no traced art.

## Dimension semantics
**FLAT item.** Editor:
- editor **L** → pennant **width** (top edge) — param `W`
- editor **W** → pennant **height** (drop) — param `H`
- editor **H** → unused, hidden.

Extra inputs: pennant **shape**, hole ⌀ (and `notch`/`scallopW` defaults).

## Flat layout
Top edge straight `(0,0)→(W,0)`. Bottom per shape:
- triangle: apex `(W/2, H)`.
- swallowtail: bottom corners `(0,H)`,`(W,H)` + a V apex at `(W/2, H−notch)`.
- scallop: bottom edge `(W,H)→(0,H)` scalloped (bumps bulge down).

Lacing holes: `circleCut` at `(inset, inset)` and `(W−inset, inset)`.

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `W`, `H` | pennant width / height | 5 × 7 in |
| `shape` | `triangle` \| `swallowtail` \| `scallop` | `triangle` |
| `holeDia` | lacing-hole ⌀ | 3/16 in |
| `notch` | swallowtail V depth | `clamp(H·0.4, 8mm, 0.6H)` |
| `scallopW` | scallop bump width | 16 mm |

## Flat-size formulas
- `bboxW = W`, `bboxH = H` (holes are interior cuts).
- Cut count = 1 outline + 2 lacing holes. Gangs 2-up Letter / 9-up A2.

## Closure / locking
None — flat flag; string it through the holes.

## Cut vs fold / cutting notes
- **Zero creases** (cut-only). Holes punch through the editor canvas (mask).
- Gangs many-up by default (`preferSheetExport: true`).

## Implementation
- File: `src/core/models/buntingPennant.ts`
- Exported: `buildBuntingPennant(params)`, `defaultParams(W, H, thickness?)`,
  `PennantShape`
- Reuses `circleCut` + `scallopEdge` (craft.ts). `has3DPreview: false` +
  `flat: true`; size presets; first model in the **party** category.

## Changelog
- 2026-06-11 initial entry (Craft build-order item #6; opens the Party tab).
