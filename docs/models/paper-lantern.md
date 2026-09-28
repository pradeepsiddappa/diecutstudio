# Paper Lantern (craft — Decorations)

The classic slit-cylinder lantern. First item in the **Decor** category.

## What it is
A rectangular blank with a SOLID band top and bottom and a field of vertical
SLITS between them. Roll it into a tube (glue the seam), then push the two bands
toward each other → the strips between the slits bow OUTWARD into a barrel /
lantern. A hang hole in the top band threads a string.

## Reference example(s)
- Small / medium / large (presets 3×5 / 5×7 / 7×10). Generic functional lantern
  geometry — no traced art.

## Dimension semantics
- editor **L** → rolled **diameter** — `D`
- editor **W** → lantern **height** (the blank) — `H`
- editor **H** → unused, hidden.

## Flat layout
A `Wb × H` rectangle, `Wb = π·D + glueFlap` (circumference + seam). Solid bands
top & bottom (`bandH ≈ 0.13·H`); between them, `N − 1` vertical **slit cuts** at
`x = i·C/N` split the wrap into `N` strips. A hang hole in the top band; a glue
seam strip on the right. The slit count `N = lanternStrips(D)` is derived from
the circumference (exported, so the 3D uses the SAME count → diecut ⇄ render
agree).

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `D` | rolled diameter | 5 in |
| `H` | lantern height | 7 in |
| `bleed` | bleed margin | 0.0625 in |
| `N` (derived) | strip/slit count | `clamp(round(π·D / 22mm), 10, 26)` |

## Flat-size formula
- `bboxW = π·D + glueFlap`, `bboxH = H`. No creases (the strips bow at assembly).
  Cut = outline + `(N−1)` slit lines + hang hole. Glue = the seam strip.

## Closure / locking
The vertical seam is glued (the one manufacturing glue line). The lantern shape
forms when the user pushes the two bands together after rolling — no glue there.

## 3D preview
`has3DPreview: true` via a **bespoke renderer** (`paperLanternFoldable` in
`src/ui/box3d/foldable.ts`): `N` curved vertical strips (the SAME `lanternStrips`
count) between a top and bottom band ring, each bowing outward at mid-height. The
fold slider squishes it from a straight cylinder (`t = 0`) to the bowed lantern
(`t = 1` = the largest extent, which Box3D frames its no-crop sphere on). Still
`flat: true` (2D dims); `preferSheetExport: true`. No dimension arrows — editor
L/W are the rolled diameter/height, not the flat blank width (`π·D + g`).

## Cut vs fold / cutting notes
- **Cut** = outline + the slit lines + the hang hole. **Glue** = the seam strip.
  No score lines (rolled tube + bowed strips). Map blue→Cut.

## Implementation
- File: `src/core/models/paperLantern.ts`
- Exported: `buildPaperLantern(params)`, `defaultParams(D, H, thickness?)`,
  `lanternStrips(D)` (shared by the 3D so the slit count can't desync).
- `flat: true`, `has3DPreview: true`, `category: "decor"`, presets.

## Future
- A handle STRIP (a 2nd piece glued band-to-band) instead of a hang hole;
  shaped/patterned slits; a colour-overlay option (acetate insert).

## Changelog
- 2026-06-15 initial entry (Decor batch #1). Bespoke bowed-strip 3D.
