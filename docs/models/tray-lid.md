# Tray + Lid — Full Telescope box (ECMA C20 / FEFCO 0301)

A **two-piece** rigid/setup box: a **base tray** that holds the product plus a
**separate lid tray** that telescopes down over the base. The classic gift /
apparel / premium / shoebox style. Like the **drawer box**, it's a model where
"everything depends on each other" — you enter the **base** size and the lid is
auto-sized to slip over it with a fit clearance.

**Code:** `src/core/models/trayLid.ts`
**Status:** ✅ built — fully parametric `(L, W, H, thickness) → Dieline`
**ECMA / FEFCO reference:** C20 / 0301 (full telescope)
**Implemented from:** the public open-tray (C10) geometry, composed twice. No
proprietary file. Same two-piece machinery as the drawer box.

## How it's built

It composes the existing **Open Tray (C10)** model **twice** and lays both flats
in **one dieline** (base on top, lid below), so it exports as a single file and
fits-checks against the combined sheet.

```
┌───────────────────────────┐
│   BASE tray flat (plus)   │   ← L × W × H, four-corner glued tray
└───────────────────────────┘
            (gap)
┌───────────────────────────┐
│   LID  tray flat (plus)   │   ← (L+fit) × (W+fit) × H, larger so it telescopes
└───────────────────────────┘
```

Both pieces' outer outlines are published in `Dieline.pieces`, so the editor
draws a white-paper backing behind **each** piece.

## Nesting math (the bit that makes the lid actually fit)

All in points. The lid must slip **over** the base, not jam:

```
base (tray) floor   : L × W,  wall height H     → base OUTER ≈ (L+2t) × (W+2t)
fit gap             : clr (≈ 0.8 mm default)    → telescope slack
lid (tray) floor    : (L + 2t + clr) × (W + 2t + clr)
lid wall height     : lidDepth   (full telescope = H)
```

`+2t` because the **base's own walls** (thickness `t` per side) push its outer
footprint out by `2t`; the lid's floor must clear *that*, plus `clr` of slack.
So `lidFloor − baseOuter = clr` exactly — the leftover is the telescope gap.
Editor field: **"Lid fit clearance"** (the `clearance` build param).

## Dimension semantics

| Input | Meaning | Drives |
|---|---|---|
| **L** | base floor length | base length **and** lid length (+ fit) |
| **W** | base floor width / depth | base width **and** lid width (+ fit) |
| **H** | base wall height | base height **and** lid height (full telescope) |

## Parameters & defaults

| Param | Default |
|---|---|
| `clearance` | `0.8 mm` (telescope gap; the base's own `2t` is added on top) |
| `lidDepth` | `H` (full telescope — lid as deep as the base) |
| `gap` | `16 mm` (spacing between the two flats on the sheet) |

Each sub-tray inherits the Open Tray defaults (relief slit, corner glue-flap
depth, drag chamfer).

## Flat-size formula

Each piece is an Open Tray, so each is `(pieceL + 2H) × (pieceW + 2H)`. The
combined sheet:

```
width   = max(base_width, lid_width)              [lid is the wider one]
height  = base_height + gap + lid_height
```

Default (L=9, W=6, H=2.5 in): combined flat ≈ **14.3 × 22.9 in** (+ bleed).

## Layers

| Layer | Contents |
|---|---|
| **cut** | two closed "plus/cross" outlines (base + lid), each with corner glue flaps |
| **crease** | 8 per piece (4 base-to-wall + 4 wall-to-flap) = 16 total |
| **bleed** | not used — paper backing uses `pieces`; exports skip the bleed contour |
| **glue** | the four corner glue flaps on each tray, hatched |

## 3D fold preview

`has3DPreview: true`. The `trayLid` closure in `buildFoldable`: a **static
erected base tray** (floor + four walls) plus an **inverted lid tray** (top
panel + four walls hanging down), slightly larger, in a group that **lifts
straight up along Y** with the fold slider — closed = telescoped over the base,
open = lifted clear. Verified in-browser (the larger lid lifts cleanly off the
base, no intersection or crop).

## Cutting / machine notes

- Blue = cut (both outlines + flaps), red dashed = crease (wall + flap folds).
- Two pieces nest in one file; for cut-by-color both pieces share the same
  layers, so they cut together — separate them on the sheet as needed.
- Exports carry **trim + fold only** (no bleed contour), like every model here.

## v1 limitations / future work

- **Full telescope only** (`lidDepth = H`). A **partial telescope** (shoebox —
  the lid covers only the top portion, `lidDepth < H`) would expose `lidDepth`
  as an editor field. Easy follow-on.
- Lid uses the same corner-glue tray as the base; a **slip-fit lid with no glue
  flaps** (just folded walls) is another common variant.
- Thickness/fit is uniform (mirrors the drawer box); per-panel precision is
  still future.

## Changelog

- 2026-06-09 initial parametric build (ECMA C20 / FEFCO 0301 full telescope) +
  Tray + Lid 3D fold (lifting telescope lid). Composes Open Tray twice via the
  two-piece `Dieline.pieces` machinery (same as the drawer box).
