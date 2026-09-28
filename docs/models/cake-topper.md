# Cake Topper (craft — Party)

A single-layer flat shape with a solid **stick-holder tab** protruding from the
bottom centre. Tape/glue a bamboo skewer or lollipop stick behind the tab, then
press into a cake or cupcake. No assembly beyond attaching the stick.

## What it is

One flat die-cut piece in one of four shapes (circle, heart, star, scallop
circle). A rectangular holder tab is **merged into the bottom of the shape as
ONE closed cut contour** (shape ∪ tab) — not a notch cut into it, and not a
separate piece. The tab is the surface you bond the stick to, so it's sized to
be wide enough that the topper stands firmly.

## Reference example(s)
- Common topper sizes: small 3 in, medium 4 in, large 5 in.
- Generic functional shapes — no traced art.

## Dimension semantics

**FLAT item.** Editor:
- editor **L** → topper **diameter / bounding width** D — param `D`
- editor **W** → unused, hidden.
- editor **H** → unused, hidden.

Extra inputs (all in the editor): **shape**, **Holder width** (tab thickness),
**Holder length** (tab protrusion depth), scallop bump radius.

## Flat layout

The shape is centred at `(R, R)` (bounding box at origin). Four shapes:

- **circle** — 60-segment circular polyline, radius `R`.
- **heart** — algebraic heart `x=16sin³t, y=−(13cos t−5cos2t−2cos3t−cos4t)` ×
  scale `D/32`; same formula as the Heart Box floor.
- **star** — 5-point star, outer radius `R`, inner radius `0.4·R`.
- **scallop** — circle of radius `0.88·R` with one `scallopEdge` bump per
  arc segment; bump radius = `scallopR`.

**Stick-holder tab (`withSlotProtrusion`):** a rectangle centred at `x = cx`,
`2·hw` wide, hanging down to `y = botY + holderDepth` (`botY` = the shape's
lowest extent). It's spliced into the outline by a **robust, shape-agnostic**
algorithm: find the LOWEST contiguous run of outline vertices inside the tab's
x-column `[cx−hw, cx+hw]`, then connect the tab at the exact edge-crossings on
either side of that run (`vCross`). This works for every shape — including the
**star's concave bottom valley** (the tab hangs from the valley between the two
lower arms) and the **scallop's bumpy edge** — where the older "is there a
vertex exactly at the lowest point" detection silently produced NO tab.

## Parameters & defaults

| Param | Meaning | Default |
|---|---|---|
| `D` | topper diameter / bounding width | 4 in |
| `shape` | `circle` \| `heart` \| `star` \| `scallop` | `circle` |
| `holderW` | stick-holder tab **width** (thickness) | `clamp(D·0.18, 14mm, D·0.4)` |
| `holderDepth` | stick-holder tab **length** (protrusion) | 1 in |
| `scallopR` | scallop bump radius (scallop shape only) | 7 mm |

Clamps: `D ≥ 1.5 in`; `holderW ∈ [6mm, D·0.6]`; `holderDepth ∈ [8mm, D·1.5]`.

The editor exposes **Holder width** and **Holder length** as live numeric
fields (respecting the in/mm unit), so the maker can make the tab wider/longer
for a firmer hold (`holderW` / `holderDepth` build params in the registry).

## Flat-size formulas

- `bboxW = D` (shape fills a D-wide bounding box)
- `bboxH = botY + holderDepth` (taller than D — the tab protrudes below the shape)
- Cut count = **1 unified outline** (shape + merged tab). Zero creases, zero glue.

## Closure / locking

None — you tape/glue the stick behind the tab. The tab is a solid rectangle
(not a slot), sized for enough bonding surface that the topper stands upright.

## Cut vs fold / cutting notes

- **Zero creases** (cut-only).
- `flat: true`, `has3DPreview: false`, `preferSheetExport: true` — gang several
  per mat/sheet.
- The tab is part of the single closed outline, so "cut by line colour" sees one
  contour.

## Implementation

- File: `src/core/models/cakeTopper.ts`
- Exported: `buildCakeTopper(params)`, `defaultParams(D, thickness?)`,
  `CakeTopperShape`
- Helpers: `withSlotProtrusion` (run-based tab splice), `vCross`
  (segment↔vertical-line intersection).
- Reuses `circleCut`, `scallopEdge` (craft.ts). `has3DPreview: false`,
  `flat: true`.

## Changelog

- 2026-06-24 initial entry (Party category).
- 2026-06-24 stick slot → **protruding holder tab**: robust run-based splice so
  EVERY shape gets the tab (fixes scallop + star getting none); wider, sturdier
  default; **Holder width / Holder length** editor controls (`holderW` /
  `holderDepth`).
