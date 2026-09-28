# Place Card / Table Tent (craft — Party & Events)

A card folded in half that stands on a table. Build-order item #7 — the first
flat-craft item that genuinely FOLDS (and gets a 3D fold).

## What it is
A name place card at a place setting, or a table tent (table number / info
card). A rounded-rect blank, folded once across the middle into an inverted-V
tent that stands on its two bottom edges — front and back panels, no glue.

## Reference example(s)
- Place card 3.5 × 2 in (folded); tent sizes up to 6 × 4 in (presets).
  Generic folded-card form — no traced art.

## Dimension semantics
- editor **L** → card **width** — param `W`
- editor **W** → card **height** (the standing/panel height; the flat blank is
  **2H** tall, folded at H) — param `H`
- editor **H** → unused, hidden.

## Flat layout
A rounded-rect blank `W × 2H` with one **fold crease** across the middle at
`y = H`. Fold in half → a W × H tent.

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `W`, `H` | card width / folded height | 3.5 × 2 in |
| `cornerR` | rounded blank corners | 3 mm |
| `bleed` | bleed margin | 0.0625 in |

## Flat-size formulas
- `bboxW = W`, `bboxH = 2H`. One crease. 3.5 × 2 default → 3.5 × 4 in blank.

## Closure / locking
None — it stands on its two bottom edges (the fold weight keeps it open). A
base-flap / interlock for extra rigidity is a future option.

## 3D preview (bespoke tent)
`has3DPreview: true`. A folded card can't be a symmetric tent through the Fold
Engine (which roots a single panel), so it gets a **bespoke** renderer
(`placeCardFoldable` in `box3d/foldable.ts`): two panels (W × H) hinged at a top
ridge, splaying down to the table. The fold slider opens the splay angle (closed
= a standing tent ~20° from vertical, open = the two panels flat/coplanar).
`previewFold = 0` (standing).

## Cut vs fold / cutting notes
- **One crease** (the half-fold); score it. Cut-only otherwise.
- Gangs many-up by default (`preferSheetExport: true`).

## Implementation
- File: `src/core/models/placeCard.ts`
- Exported: `buildPlaceCard(params)`, `defaultParams(W, H, thickness?)`
- `has3DPreview: true` (bespoke tent) + `flat: true` (2D naming); size presets.

## Changelog
- 2026-06-11 initial entry (Craft build-order item #7).
