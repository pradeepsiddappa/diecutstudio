# Geometric Snowflake (craft — Decorations)

A parametric 6-fold snowflake. Decor batch #3 — the flat finale (no 3D).

## What it is
The classic snowflake-icon look: six thin ROUNDED RODS radiating from a small
hexagonal hub, each with three pairs of side branches angled FORWARD (toward the
tip), like a fir/feather. Pure GENERATED 6-fold geometry (math, not a
traced/copyrighted design), so it's IP-safe — "generic decorative geometry is
safe" per the craft IP rules. A flat winter decoration / ornament.

## Reference example(s)
- Small / medium / large (presets 4 / 6 / 10 in tip-to-tip). No two real
  snowflakes alike — this one is a clean stylised generator.

## Dimension semantics
- editor **L** → tip-to-tip **diameter** — `D`
- editor **W / H** → unused, hidden (single-dimension item).

## Flat layout
ONE closed **outline** — a canonical arm (a thin rod + three pairs of
forward-angled branch rods) traced from its `−30°` hub corner out and back to
its `+30°` hub corner, then rotated ×6 and joined at the hexagonal hub so the
six arms form a single continuous contour. **Every tip is a rounded Q-bezier
cap** (the main arm tip + all six branch tips per arm = 7, ×6 arms = 42 caps),
so nothing reads as a sharp point. **No interior holes** (the look is all thin
rods, like the snowflake icon). Arm 0 points up.

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `D` | tip-to-tip diameter | 6 in |
| `bleed` | bleed margin | 0.0625 in |
| (internal) | hub radius, shaft width, branch radii/lengths | fractions of `R` |

## Flat-size formula
- bbox = the snowflake's actual extent (the 6 main tips reach `R`). Cut = the
  **single** thin-rod outline (one closed path). No creases, no glue — a flat
  decoration.

## Closure / locking
None — flat. Tie a string around a tip or punch a hole to hang it.

## 3D preview
`has3DPreview: false`, `flat: true` — nothing folds, so the editor hides the 3D
pane; the canvas dieline IS the preview. Cut many-up: `preferSheetExport: true`
(gangs ~12-up on an SRA2 sheet).

## Cut vs fold / cutting notes
- **Cut-only** — outline + interior holes are all closed cuts the machine
  removes. No score lines. Map blue→Cut.

## Implementation
- File: `src/core/models/snowflake.ts`
- Exported: `buildSnowflake(params)`, `defaultParams(D, thickness?)`
- One canonical `armPoints(R)` traced + rotated ×6 (6-fold); holes placed by the
  same rotation. `flat: true`, `has3DPreview: false`, `category: "decor"`.

## Future
- Expose the fold count (8-point), branch count, and branch angle for variety;
  feathery sub-branches; a few snowflake "styles" as variants.

## Changelog
- 2026-06-15 initial entry (Decor batch #3 — the flat finale).
- 2026-06-15 rebuilt to the snowflake-ICON look (owner shared a reference): thin
  rounded rods with branches angled FORWARD toward the tips, one continuous
  contour, no interior holes — replacing the first cut's spiky lateral-branch
  arms with diamond holes.
- 2026-06-17 every tip rounded uniformly (owner: some tips read pointed, others
  blunt). The main arm tip was a ~90° point + branch tips were blunt flats; now
  all 42 tips (7 per arm × 6) are rounded Q-bezier caps (apex = tipCentre +
  wb·axis, control = +2·wb·axis). Outline gained a `curves` array; widthPt/
  heightPt computed from the FLATTENED outline so the caps aren't clipped.
