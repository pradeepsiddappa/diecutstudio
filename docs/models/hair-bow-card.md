# Hair-Bow / Clip Card (craft — Display Cards)

A display card for hair bows & clips — third item in the **Product Display
Cards** (handmade-seller) line.

## What it is
The card a hair bow or clip mounts on for sale/display. A flat rounded-rect card
with a **hang hole** at the top and **N slot pairs** down the card: each pair is
two short parallel slits with a card "bridge" between them — slide a snap/
alligator clip's prong (or thread a bow's elastic) through so it grips the
bridge and the bow sits on the front. Display 1–4 bows per card via `pairs`.

## Reference example(s)
- Standard 2-bow clip card ≈ 2.75 × 4.5 in (presets: Single / 2 bows / 3 bows).
  Generic functional card form — no traced art (branding is user-added).

## Dimension semantics
- editor **L** → card **width** (x) — param `W`
- editor **W** → card **height** (y) — param `H`
- editor **H** → unused, hidden (flat item).

## Flat layout
A `roundedRect(W, H)` card. Interior cuts: a centred **hang hole** near the top,
then `pairs` **slot pairs** distributed evenly down the card. Each pair = two
horizontal stadium slits a clip-bite (~9 mm) apart, centred.

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `W`, `H` | card width / height | 2.75 × 4.5 in |
| `pairs` | clip slot pairs (bows per card) | 2 (1–4) |
| `hangHole` / `hangDia` | top peg hole | on, ⌀ 3/16 in |
| `bleed` | bleed margin | 0.0625 in |

## Flat-size formulas
- `bboxW = W`, `bboxH = H` exactly. No creases. Cut = outline + hole + `2·pairs`
  slits, all closed paths.

## Closure / locking
None — flat display card. The slot pairs grip the clips/bows.

## 3D preview
`has3DPreview: false`, `flat: true` — the editor hides the 3D pane; the canvas
dieline IS the preview. Cut many-up: `preferSheetExport: true`.

## Cut vs fold / cutting notes
- **Cut-only** — no creases. Hole + slits are closed interior cuts.

## Implementation
- File: `src/core/models/hairBowCard.ts`
- Exported: `buildHairBowCard(params)`, `defaultParams(W, H, thickness?)`
- `flat: true`, `has3DPreview: false`, `category: "display-cards"`, presets;
  reuses the shared `pairs` + `hangHole` build params.

## Future
- Editor field for `pairs`; tunable slot spacing; horizontal (landscape) layout.

## Changelog
- 2026-06-13 initial entry (Display & Labels batch #2).
