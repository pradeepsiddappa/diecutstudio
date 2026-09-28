# Pyramid Favor Box (craft — Party & Events)

A square-based pyramid favour box. Party batch #2 (after the rosette).

## What it is
A **square base** with **four triangular walls**, one hinged on each base edge,
that fold UP to meet at a point — a square pyramid. A small chamfered **glue tab**
on each wall's trailing slant edge laps onto the next wall to hold it shut. Folds
flat for storage; pops into a pyramid that sits on its base. Great for
wedding/party favors, candy, small gifts.

> Note: this replaced an earlier tea-bag *tetrahedron* pouch (a rolled tube
> sealed at perpendicular ends). The owner wanted a die-cut that visibly folds
> into a pyramid — a rolled tube's flat blank is just a rectangle — so it was
> rebuilt as this square-pyramid NET.

## Reference example(s)
- Small treats / candy favor / tall gift (presets 2×2 … 3×3.5). Generic
  functional pyramid geometry — no traced art.

## Dimension semantics
- editor **L** → base edge `b` (the square base side) — `b`
- editor **W** → pyramid height `Hp` — `h`
- editor **H** → unused, hidden.

## Flat layout
A central **square base** (`b × b`) with four isosceles **triangles** around it
(a pinwheel), one hinged on each base edge. Each triangle's height = the pyramid
**slant height** `s = √((b/2)² + Hp²)` (so a folded wall reaches the apex). Each
triangle carries a chamfered **glue tab** on its trailing slant edge, jutting
into the corner gap.
- `cut` = the single outer perimeter (the 8 slant edges + the 4 tab bumps)
- `crease` = 4 base edges (wall hinges) + 4 tab folds = **8**
- `glue` = the 4 tabs

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `b` | base edge | 2.5 in |
| `Hp` | pyramid height | 2.75 in |
| `bleed` | bleed margin | 0.0625 in |
| `s` (derived) | face slant height = `√((b/2)² + Hp²)` | — |
| `d` (derived) | glue-tab depth = `clamp(0.14·s, 5mm, 10mm)` | — |

## Flat-size formula
- The four apexes define the extent → the net is a **`(b + 2·s)` square**
  (`bboxW = bboxH = b + 2·s`). The tabs sit in the corner gaps, within that box.
- A square-pyramid net is **large** (≈ 8.5 in square at the defaults), so it
  gangs on a press sheet / 12×24 cutting mat rather than Letter.

## Closure / locking
Glue-assembled: fold the 4 walls up, glue each wall's tab behind the adjacent
wall → the apex closes. The 4 tabs are the only glue (hatched in the dieline).

## 3D preview
`has3DPreview: true` via a **bespoke renderer** (`pyramidPouchFoldable` in
`src/ui/box3d/foldable.ts`): a **square base** (on the ground) + 4 triangular
walls. Each wall rotates about its base edge from lying flat outward (`t = 0`,
the net) up & inward to the apex `(0, Hp, 0)` (`t = 1`, the closed pyramid — the
LARGEST extent, which Box3D frames its no-crop sphere on, so keep it at fold 1).
Fold angle `φ_end = atan2(Hp, −b/2)` (obtuse — the faces lean in past vertical to
meet). Shown 3/4 (`rotation.y = −0.5`, a base corner toward the camera); the
gallery `boxSnapshot` mirrors that pose so the **thumbnail matches the editor**.
A `max(20mm, …)` base guard avoids NaN geometry on a degenerate dim. Still
`flat: true` (2D export naming); `preferSheetExport: true`. No dimension arrows —
editor L/W are the finished base/height, not the net span (`b + 2·s`), so a dim
would mislead (cf. the rosette); the top-bar flat-size readout is accurate.

## Cut vs fold / cutting notes
- **Cut** = the outer perimeter. **Score** = 4 base hinges + 4 tab folds.
  **Glue** = the 4 tabs. Map blue→Cut, red→Score; the grey hatch is glue.

## Implementation
- File: `src/core/models/favorPouch.ts`
- Exported: `buildFavorPouch(params)`, `defaultParams(b, h, thickness?)`,
  `pyramidGeom(b, h)` (shared base/slant so the 3D matches the net).
- `flat: true`, `has3DPreview: true`, `category: "party"`, presets.

## Future
- Optional ribbon hole / apex tuck closure (no-glue); a hexagonal-base pyramid;
  a window/aperture overlay on the walls.

## Changelog
- 2026-06-14 initial entry (party batch #2). Bespoke tetrahedron 3D.
- 2026-06-17 **rebuilt as a SQUARE-BASED pyramid box** (net = square base + 4
  fold-up triangular walls + glue tabs) per owner feedback — the tea-bag
  tetrahedron's flat blank was just a rectangle and didn't read as a pyramid.
  New bespoke square-pyramid 3D; thumbnail pose mirrors the editor.
