# Gift-Card Holder (craft — Envelopes & Cards)

A folded card that holds a gift / credit card by its corners. Build-order
item #7b.

## What it is
A card that opens like a book: the left panel is the message, the right panel
is the card pocket. The right panel carries four **diagonal corner slits** sized
to a standard ID-1 gift card (3.375 × 2.125 in) — tuck the card's four corners
under the slits, then fold the left panel over to close.

## Reference example(s)
- Standard holder 4 × 3 in (folded), card ID-1 3.375 × 2.125 in. Generic folded
  form + photo-corner slits — no traced art.

## Dimension semantics
**FLAT item.** Editor:
- editor **L** → folded **panel width** (the blank is **2W** wide) — param `W`
- editor **W** → holder **height** — param `H`
- editor **H** → unused, hidden.

## Flat layout
A rounded-rect blank `2W × H` with one VERTICAL fold at `x = W`. The gift card is
centred on the right panel; its four corners get a diagonal slit each (TL/BR
along one diagonal, TR/BL along the other — mirrored photo corners).

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `W`, `H` | folded panel width / height | 4 × 3 in |
| `cardW`, `cardH` | gift-card size (ID-1) | 3.375 × 2.125 in |
| `slitLen` | corner-slit length | 18 mm |
| `cornerR` | rounded blank corners | 3 mm |

## Flat-size formulas
- `bboxW = 2W`, `bboxH = H`. Cut = 1 outline + 4 open slits, 1 fold crease.
  4 × 3 default → 8 × 3 in blank; gangs 3-up Letter, 15-up SRA2.

## Closure / locking
The card is held by the four corner slits; the left panel folds over to close
(no glue). The slits are **open** cuts (the blade cuts the line; the card corner
tucks under the paper, no material removed).

## Cut vs fold / cutting notes
- 1 fold crease (score) + 4 open slits + the outline.
- Gangs many-up by default (`preferSheetExport: true`). `has3DPreview:false`
  (flat) — a 3D book-fold is a future enhancement.

## Implementation
- File: `src/core/models/giftCardHolder.ts`
- Exported: `buildGiftCardHolder(params)`, `defaultParams(W, H, thickness?)`
- Reuses `roundedRect` (features.ts). Slits are open-cut line polylines. Size
  presets via `ModelEntry.presets`.

## Changelog
- 2026-06-11 initial entry (Craft build-order item #7b).
