# Gift Tag (craft — Tags & Wraps)

The first NON-BOX craft item (see `craft-dielines-catalog.md` §B). A flat
die-cut gift / swing tag in three classic shapes, with a hang hole and a
separate **reinforcement ring** piece.

## What it is
A flat tag for gifts, product hang-tags, favors, and price tags. Three shape
variants, all parametric: **luggage** (chamfered tapered head — the classic
kraft tag), **scallop** (scalloped border all around), **ticket** (rounded
rect with semicircular side notches at mid-height). Each tag ships with a
small donut **reinforcement ring** as a second cut piece — glue it around the
hole on the back so twine/string doesn't tear through.

## Reference example(s)
- Standard large kraft strung tag: 2 × 3.5 in (≈ 51 × 89 mm), 3/16 in hole.
  Public-domain stationery form (centuries old); geometry is ours.

## Dimension semantics
**FLAT item — nothing folds.** The editor maps:
- editor **L** → tag **width** (x, across) — model param `W`
- editor **W** → tag **height** (y, top-to-tail) — model param `H`
- editor **H** → unused, hidden (`dimLabels.H = null`)
- Inner/outer dimension mode does not apply (`supportsInnerDim: false`).

Extra inputs: **Hang hole diameter** (default 3/16 in), **Scallop size**
(bump radius, scallop shape only).

## Flat layout
```
 [ tag W×H ]   ( ring ⌀OD )      ← one row; ring vertically aligned with the hole
```
The ring is a separate piece via `Dieline.pieces` (same machinery as the
drawer box), separated by a gap that clears both pieces' bleed and the
editor's dimension lines.

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `W`, `H` | tag width / height (pt) | 2 × 3.5 in |
| `shape` | `luggage` \| `scallop` \| `ticket` | `luggage` |
| `holeDia` | hang-hole ⌀, clamped to [1.5 mm, W/3] | 0.1875 in |
| `scallopR` | desired scallop bump radius | 0.25 in |
| `ring` | include the reinforcement ring piece | `true` |
| `bleed` | bleed margin | 0.0625 in |

Derived: luggage head chamfer `c = min(W/4, H/6, 0.6in)`; ticket corner
radius `min(4mm, W/6, H/6)`, notch radius `clamp(W/8, 2.5mm, 6mm)`; ring
`OD = max(2.2·holeDia, holeDia + 4mm)`; piece gap
`max(12mm, 2·bleed + 6mm)`; hole center `y = topSolid + holeDia/2 + ~2.5mm`,
clamped ≤ H/3.

**Scallop fitting (exact-bbox trick):** per-edge fitted radii `rT`
(top/bottom) and `rS` (sides) solve `2·nT·rT + 2·rS = W` and
`2·nS·rS + 2·rT = H`, so a whole number of bumps spans each edge AND the bump
apexes touch the nominal W×H box exactly — the entered size IS the cut size.

## Flat-size formulas
- `bboxW = W + gap + ringOD` (ring on) · `= W` (ring off)
- `bboxH = H`
- Worked example (2 × 3.5 in defaults): ring OD 0.4125 in, gap 0.4724 in →
  flat **2.885 × 3.5 in** cut-only, **3.01 × 3.625 in** incl. 1/16 in bleed.
  6-up on Letter at 1/8 in gutter.

## Closure / locking
None — flat item. The reinforcement ring is glue-assembled around the hole.

## Cut vs fold / cutting notes
- **Zero creases** — the first model with an empty crease layer (cut-only
  file; no score mapping needed in the cutter).
- Gangs many-up by default: the editor opens this model with **Full sheet**
  export pre-selected (`preferSheetExport: true`) using the standard
  imposition machinery.

## Implementation
- File: `src/core/models/giftTag.ts`
- Exported: `buildGiftTag(params)`, `defaultParams(W, H, thickness?)`,
  `GiftTagShape`
- Uses the shared craft primitives `scallopEdge` + `circleCut`
  (`src/core/craft.ts`) — the first consumers of Craft Batch 0.
- `has3DPreview: false` + `flat: true` → the editor hides the 3D pane
  entirely; the gallery thumbnail is the real flat dieline.

## Changelog
- 2026-06-11 initial entry (Craft Batch 0 proving item).
