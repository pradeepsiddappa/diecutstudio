# Cupcake Wrapper (craft — Tags & Wraps)

The decorative scalloped collar that wraps a cupcake. Build-order item #4.

## What it is
The lateral surface of a truncated cone (frustum), open both ends, that wraps
around a cupcake. Unrolled flat it is an **annular sector** (a ring sector):
inner arc = the base circle, outer arc = the wider top circle (**scalloped**),
two straight radial edges (one is the glue-overlap seam). Rolls into a cone and
glues — no fold creases.

## Reference example(s)
- Standard cupcake: base ⌀ 2 in, top ⌀ 3 in, height 1.5 in (the default — a
  flared cup). True frustum-unroll geometry; generic scallops — no traced art.

## Dimension semantics
All three dims are meaningful (unlike the other flat craft items). Editor:
- editor **L** → **base ⌀** (bottom, smaller) — param `baseDia`
- editor **W** → **top ⌀** (top, wider) — param `topDia`
- editor **H** → **height** (slant) — param `height`
- `flat: true` (no 3D pane) but `dimLabels.H = "Height"` (shown). The export
  filename keeps all three dims (2-dim naming only when `dimLabels.H === null`).

## Geometry (the frustum unroll)
With `rb, rt` = base/top radii and `s` = slant height:
```
ρb = s·rb/(rt−rb)      inner arc radius (base)
ρt = s·rt/(rt−rb)      outer arc radius (top)
θ  = 2π·(rt−rb)/s      sector angle
```
so the inner arc length = `2π·rb` and outer = `2π·rt` (the two circumferences),
and `ρt − ρb = s` (the slant). The outer arc is scalloped via `scallopEdge`
(one outward bump per `~scallopW` of arc). Constraints: `rt > rb` (clamped to
`rb·1.05` — a flared cup); `s` clamped so `θ ≤ 1.9π` (stays under a full turn).

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `baseDia`, `topDia`, `height` | base ⌀ / top ⌀ / slant | 2 / 3 / 1.5 in |
| `scallopW` | target scallop width along the top arc | 12 mm |
| `glueTab` | glue-overlap seam width | 10 mm |
| `bleed` | bleed margin | 0.0625 in |

## Flat-size formulas
- The bbox is the annular sector's extent (non-trivial in W/H — depends on θ).
  Default 2/3/1.5 in → ≈ 8.2 × 3.4 in flat; gangs 3-up on Letter, 15-up on SRA2.

## Closure / locking
A glue overlap seam on one radial edge (marked as a glue fan). Roll into a cone,
overlap the straight ends, glue.

## Cut vs fold / cutting notes
- **Zero creases** — it ROLLS into a cone (a wrap, not a crease-fold). The only
  join is the glued seam.
- Gangs many-up by default (`preferSheetExport: true`).

## 3D preview (bespoke cone)
`has3DPreview: true`. Because it ROLLS (not folds at creases), the Fold Engine
can't render it — it gets a **bespoke** renderer (`cupcakeFoldable` in
`box3d/foldable.ts`, alongside the pillow box). Rather than re-code the scallops
in 3D, it MAPS the real flat sector onto the cone: `cupcakeUnroll()` exports the
unroll params + the scalloped rim in polar `(φ, ρ)`; each rim point at flat
radius `ρ` maps to cone radius `r = rb + (rt−rb)·t` and height `hv·t` (where
`t = (ρ−ρb)/(ρt−ρb)`, `hv = √(s²−(rt−rb)²)`), and the sector angle scales
`a = φ·2π/θ` so it wraps a full turn — so the scalloped flat edge becomes the
scalloped rim for free. The fold slider MORPHS each vertex flat (open) ↔ rolled
cone (closed); `previewFold = 0` (rolled).

## Implementation
- File: `src/core/models/cupcakeWrapper.ts`
- Exported: `buildCupcakeWrapper(params)`, `defaultParams(baseDia, topDia, height, thickness?)`,
  `cupcakeUnroll(params)` (consumed by the 3D renderer).
- Reuses `scallopEdge` (craft.ts) on the curved outer arc — one bump per arc
  segment. `has3DPreview: true` (bespoke cone) + `flat: true` (2D naming/title).

## Changelog
- 2026-06-11 initial entry (Craft build-order item #4).
