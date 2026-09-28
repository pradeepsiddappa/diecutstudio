# Hexagon Box + Lid (two-piece openable hexagon)

The **openable** hexagonal gift box: a hexagonal **base tray** (open top, glued
bottom) plus a slightly larger hexagonal **lid tray** that telescopes down over
it. This is the openable counterpart to the single-piece **[Hexagon Box](hex-box.md)**
(which is glued shut at both ends). Same two-piece machinery as the
**[Tray + Lid](tray-lid.md)** model, on a hexagonal footprint.

**Code:** `src/core/models/hexTrayLid.ts`
**Status:** ✅ built — fully parametric `(L, W, H, thickness) → Dieline`
**Reference:** regular-polygon geometry + the two-piece telescope pattern. No
proprietary file.

## How it's built

It builds an **open hexagonal tray** twice (base + lid) and lays both flats in
**one dieline** (base on top, larger lid below). Each tray:

- 6 walls in a row `[glue][w1..w6]` + a glue seam — the elongated-hexagon walls
  from `hexDetails` (2 long edges `m`, 4 slants `s`; bevel `e = min(W/2, 0.4L)`).
- **Infold flaps on ONE end only** (the closed/glued end): one triangle per
  wall, apex just past the polygon centre so adjacent flaps overlap and **glue**
  (hatched). The other end is **open**.
- The **base**'s closed end is its floor; the **lid**'s closed end is its top
  (the lid is inverted in use).

Both pieces' outlines are published in `Dieline.pieces`, so the editor draws a
white-paper backing behind each.

## Nesting

```
lid footprint = base footprint + fit,   fit = 2·thickness + clearance
```

`+2t` because the base's own walls push its outer footprint out; the lid floor
must clear that, plus `clearance` of telescope slack. Editor field: **"Lid fit
clearance"**. `L`/`W` are enlarged by `fit` for the lid (a hexagon enlarged
uniformly ≈ an outward offset — close enough; the clearance provides the slack).

## Dimension semantics

| Input | Meaning | Drives |
|---|---|---|
| **L** | base overall length (long axis) | base + lid footprint |
| **W** | base overall width (short axis) | base + lid footprint |
| **H** | base height | base height; lid height (`lidDepth`, default = H) |

Only **H** gets an on-canvas arrow (L/W are footprint diagonals).

## Flat-size formula

Each tray: `width = glue + 2m + 4s`, `height = H + (maxApothem + overlap)`
(flaps on one end only). The combined sheet:

```
width  = max(base_width, lid_width)            [lid is wider]
height = base_height + gap + lid_height
```

## Layers

| Layer | Contents |
|---|---|
| **cut** | two open-hex-tray outlines (base + lid), each with infold flaps on one end |
| **crease** | 12 per piece (6 vertical + 6 bottom flap) = 24 total |
| **bleed** | not used — paper backing uses `pieces`; exports skip the bleed contour |
| **glue** | per piece: the tube seam + the hatched infold end flaps |

## 3D fold preview

`has3DPreview: true`. The `hexTrayLid` closure in `buildFoldable`: a **static
base** hex shell (6 walls + a hex floor) plus a slightly larger **lid** hex shell
(6 walls + a hex ceiling) in a group that **lifts straight up along Y** with the
fold slider — closed = telescoped over the base, open = lifted clear. Verified
in-browser (the hex lid lifts cleanly off the hex base).

## Cutting / machine notes

- Blue = cut, red dashed = crease, grey hatch = glue (tube seam + the end flaps
  that bond each tray's closed end).
- Two pieces nest in one file; separate them on the sheet as needed.
- Exports carry **trim + fold only** (no bleed contour), like every model here.

## v1 limitations / future work

- **Full telescope** (`lidDepth = H`) by default; a partial-telescope lid (covers
  only the top portion) would expose `lidDepth`.
- Hexagon enlargement for the lid is a uniform L/W bump (not a true polygon
  offset); fine at normal clearances. A true outward offset is future.
- Regular-hex preset (single size) would be a nice option.

## Changelog

- 2026-06-09 initial parametric build — two open hex trays (base + telescoping
  lid) via the `Dieline.pieces` machinery + a `hexTrayLid` 3D fold (lifting hex
  lid). The openable counterpart to the single-piece glued Hexagon Box.
