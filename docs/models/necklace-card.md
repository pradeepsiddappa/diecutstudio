# Necklace / Bracelet Card (craft — Display Cards)

A jewelry display card for necklaces & bracelets — the second item in the
**Product Display Cards** (handmade-seller) line, after the earring card.

## What it is
The card a necklace sits on for sale/display. **Two styles** (`style` param):

- **flat** — a rounded-rect card with a **hang hole** at the top (hang the card
  on a peg/hook) and a **two-slit chain retainer**: thread the chain down through
  the upper slit and back up through the lower one so it clamps and the necklace
  lies flat on the card, pendant hanging below.
- **fold** — an **hourglass fold-over** card: a wide tapered head + a deep
  concave **waist** + a wide tapered foot, with a **hang slot** in both the head
  and the foot and a **fold crease** across the waist. Fold it in half at the
  waist → the necklace drapes over the fold, the chain seats in the waist pinch,
  and the two slots align to hang as one (double-thickness, sturdy). Use a tall
  size (e.g. 2.25 × 5 or 2.5 × 6).

Sized for necklaces (tall) or bracelets (smaller) via presets.

## Reference example(s)
- Standard necklace display card ≈ 2.5 × 3.5 in (presets: Necklace / Pendant /
  Bracelet). Generic functional card form — no traced art; branding/text is
  user-added in their own fonts (craft IP rule).

## Dimension semantics
- editor **L** → card **width** (x) — param `W`
- editor **W** → card **height** (y) — param `H`
- editor **H** → unused, hidden (flat item).

## Flat layout
- **flat style** — a `roundedRect(W, H)` card. Interior cuts: a centred **hang
  hole** near the top, and **two horizontal stadium slits** (rounded slots)
  stacked ~5.5 mm apart, centred, just below the hole.
- **fold style** — an **hourglass** outline traced clockwise: a tapered head
  (flat top edge inset `te ≈ 0.16W`, rounded corners, flaring out to the full
  width at the **shoulders** at `y ≈ 0.3H`), two **concave waist** quads pinching
  in to `x = wi ≈ 0.3W` at the vertical mid, then a mirrored tapered foot.
  Shoulders touch `x = 0` and `x = W`, so the bbox stays exactly `W × H`.
  Interior cuts: a **hang slot** (horizontal stadium) in the head and another in
  the foot, mirrored about the waist. One horizontal **fold crease** spans the
  waist (`[wi, W−wi]` at `y = H/2`).

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `style` | `flat` (slits) or `fold` (hourglass fold-over) | flat |
| `W`, `H` | card width / height | 2.5 × 3.5 in (fold: try 2.25 × 5) |
| `hangHole` / `hangDia` | flat: top peg hole | on, ⌀ 3/16 in |
| `slits` | flat: the two-slit chain retainer | on |
| `bleed` | bleed margin | 0.0625 in |

## Flat-size formulas
- Both styles: `bboxW = W`, `bboxH = H` exactly (holes/slots are interior).
- **flat**: no creases. Cut = outline + hole + 2 slits = **4 closed paths**.
- **fold**: **1 crease** (the waist fold). Cut = outline + 2 hang slots =
  **3 closed paths**.

## Closure / locking
- **flat** — none; the slits retain the chain, the hole hangs it.
- **fold** — no glue; folds in half at the waist crease. The chain wraps the
  waist pinch; the two aligned slots are the single hang point.

## 3D preview
`has3DPreview: true`, `flat: true` — but the 3D is shown **per style**:

- **fold** — the **Fold Engine** folds the literal dieline: the waist crease
  (`id: "fold"`) panelizes the hourglass into a HEAD + FOOT half (the slots
  become panel holes), hinged at the waist; the FoldSpec folds the foot up at the
  crease (`previewFold 0.5` → a part-open card). The model publishes
  `panels.base` (the head) as the engine root. Print & Cut artwork rides on the
  folded panels for free (engine decal).
- **flat** — no crease → no fold → **no 3D pane**. The editor/gallery gate the
  3D off per-instance (`usesFoldEngine(id) && crease.length === 0` → hide), so
  the flat style shows its 2D dieline like the tags.

Cut many-up: `preferSheetExport: true`.

## Cut vs fold / cutting notes
- **flat**: cut-only (hole + slits are closed interior cuts). **fold**: cut +
  one waist score (the fold line); blue→Cut, red→Score.

## Implementation
- File: `src/core/models/necklaceCard.ts`
- Exported: `buildNecklaceCard(params)`, `defaultParams(W, H, thickness?)`
- `flat: true`, `has3DPreview: true`, `category: "display-cards"`, presets.
- Fold-engine: FoldSpec `"necklace-card"` in `src/core/fold/specs.ts`; the editor
  + `IsoBoxThumb` gate the 3D on `usesFoldEngine(id) ? crease.length>0 : true`.

## Future
- A **clasp lobe** (a small tab/notch the clasp hooks onto) so the clasp doesn't
  dangle; editor toggles for the hole / slit count.

## Changelog
- 2026-06-13 initial entry (Display & Labels batch; sibling of the earring card).
- 2026-06-13 added the **fold-over (hourglass)** style — from a user reference of
  a real kraft necklace card (wide head + concave waist + wide foot, hang slots
  top & bottom, folds at the waist). Editor "Style" segment + a gallery card per
  style + 2 fold-over presets.
- 2026-06-15 the fold-over got a **3D preview** via the Fold Engine (folds the
  hourglass in half at the waist). Introduced **per-instance 3D gating** so the
  flat style (no crease) shows no 3D while the fold style does — `has3DPreview`
  + `usesFoldEngine(id) ? crease.length>0 : true`, applied in the editor and the
  gallery thumbnail; the snapshot now also takes `buildParams` (so the fold card
  snapshots the fold style, not the default flat).
