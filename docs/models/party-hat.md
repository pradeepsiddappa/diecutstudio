# Party Hat (craft — Party)

A cone hat unrolled to an annular sector — the same frustum-unroll math as the
cupcake wrapper but with inner radius zero (a full pointed cone, not a frustum).
Roll the sector into a cone and glue the straight radial seam at assembly.

## What it is

One party hat blank. The sector vertex is the hat tip; the arc is the base
(head opening). Optional scalloped base arc and optional chin-strap holes
are the main decorative/functional choices.

## Reference example(s)
- Common presets: child 6 in head / 8 in tall; adult 7 in / 9 in.
- Generic cone geometry — no traced art.

## Dimension semantics

**FLAT item.** Editor:
- editor **L** → head **diameter** D — param `headDia`
- editor **W** → hat **height** (vertical, tip to base plane) — param `height`
- editor **H** → unused, hidden.

Extra inputs: base **edge** style (straight / scallop), scallop bump width,
chin-strap **hole** toggle + hole diameter.

## Flat layout

Cone-to-sector unroll math:
- slant height `s = √(r² + h²)` where `r = headDia/2`, `h = height`
- sector angle `θ = 2π·r / s`
- vertex placed at top-centre `(offX, 0)` where `offX = s·sin(θ/2)`
- right straight edge descends vertex → `pt(s, +θ/2)`
- base arc sweeps right → left at radius `s` (scalloped or plain arcs at ~3 mm spacing)
- left straight edge closes back to vertex

Chin-strap holes: `circleCut` at polar coords `ρ = 0.93·s`, `φ = ±0.90·(θ/2)` (near
the straight edges, high up the slant).

## Parameters & defaults

| Param | Meaning | Default |
|---|---|---|
| `headDia` | head opening diameter | 7 in |
| `height` | hat height (vertical) | 9 in |
| `edge` | `straight` \| `scallop` | `scallop` |
| `scallopW` | target scallop bump width along the arc | 14 mm |
| `chinHole` | include chin-strap holes | `true` |
| `chinHoleDia` | chin-strap hole diameter | 5 mm |

Clamps: `r = headDia/2 ≥ 1 in (72 pt)`; `height ∈ [2 in, 20 in]`.

## Flat-size formulas

- `bboxW = 2·s·sin(θ/2)` (sector chord width, computed from outline points)
- `bboxH = s` (from vertex at y=0 to arc bottom)
- Cut count = 1 outline + 2 chin-strap holes (when enabled). Zero creases.
- Glue: a **10 mm** strip marked along the right straight radial edge (the seam).

## Closure / locking

None on the die — the two straight radial edges are the glue seam (a 10 mm glue
strip is hatched on the right edge). Glue or tape them at assembly. Thread
elastic ribbon through the chin-strap holes.

## Cut vs fold / cutting notes

- **Zero creases** (cut-only). The scallop bumps are part of the cut outline.
- `preferSheetExport: true` — gang several per mat/sheet.
- Scallop is built as one bump per arc segment via `scallopEdge`, with
  segments of ~12 pts each.

## Implementation

- File: `src/core/models/partyHat.ts`
- Exported: `buildPartyHat(params)`, `defaultParams(headDia, height, thickness?)`,
  `HatEdge`, `partyHatUnroll(params)` (cone params for the 3D)
- Reuses `circleCut` + `scallopEdge` (craft.ts). `has3DPreview: true`,
  `flat: true`. Bounding box derived from the actual outline point coords.

## 3D preview

Bespoke renderer `partyHatFoldable` (`src/ui/box3d/foldable.ts`) rolls the flat
sector into a cone (it ROLLS, not folds, so the Fold Engine can't do it — like
the cupcake cone). Because H is hidden (H=0), the editor's `Box3D` only requires
`L,W > 0` for this model (the H≤0 guard is gated on `dimLabels.H !== null`), so
the cone renders instead of an empty pane.

## Changelog

- 2026-06-24 initial entry (Party category).
- 2026-06-24 bespoke cone **3D preview** (`partyHatFoldable`, `has3DPreview:
  true`); glue seam strip widened 4 mm → **10 mm** for a practical bond.
