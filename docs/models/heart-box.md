# Heart Box

## What it is

A two-piece heart-shaped gift box — the classic Valentine's Day / wedding chocolate box. A flexible wall **band** is rolled around a heart-shaped floor and glued at a vertical seam; the bottom tabs fold inward and glue a heart **floor** on. Two such assemblies — a **base** (the chocolate tray) and a slightly larger **lid** that telescopes over it.

Typical uses: chocolates, jewellery, small gifts for Valentine's Day, anniversaries, weddings, bridal showers.

## Reference standard

No ECMA/FEFCO classification (specialty decorative box). Derived from the public hat-box / cylinder box construction (band + floor), adapted for the parametric heart contour. The heart equation is the classical algebraic heart: `x = 16 sin³(t)`, `y = 13 cos(t) − 5 cos(2t) − 2 cos(3t) − cos(4t)` — public domain mathematics.

## Dimension semantics

| Input | Meaning | Default |
|---|---|---|
| **L** (Heart width) | Width of the base heart footprint (tip-to-tip across the widest point) | 5 in |
| **W** | Hidden (not used) | — |
| **H** (Box depth) | Height of the base wall band (= the box depth) | 1.5 in |
| Caliper | Material thickness (used for lid clearance) | 0.018 in |
| Bleed | Bleed margin | 0.0625 in |

The heart's height follows the width automatically: `heartHeight = heartWidth × (22/32) ≈ 0.6875 × heartWidth`.

## Flat layout

Four pieces laid out vertically, top to bottom:

```
┌──────────────────────────────────────────┐  ← base BAND (wallH + tabDepth tall)
│  wall rectangle + comb of bottom tabs   │
│  seam glue tab on the right             │
└──────────────────────────────────────────┘
     ♥  base HEART FLOOR (heartHeight(baseW))
┌──────────────────────────────────────────┐  ← lid BAND (lidWallH + tabDepth tall)
│  same construction, slightly wider      │
└──────────────────────────────────────────┘
     ♥  lid HEART FLOOR (heartHeight(lidW), slightly larger)
```

## Parameters & defaults

| Param | Meaning | Default formula |
|---|---|---|
| `heartW` | Base heart footprint width | editor L (in points) |
| `wallH` | Base wall height / box depth | editor H (in points) |
| `clearance` | Slip clearance between base and lid | 0.6 mm |
| `overlap` | Band seam glue-overlap length | 12 mm |
| `tabDepth` | Depth of fold-in floor tabs | `clamp(wallH×0.32, 7mm, 14mm)` |
| `lidWallH` | Lid wall height | `clamp(wallH×0.6, 8mm, wallH)` |
| `lidW` | Lid heart width | `heartW + 2 × (thickness + clearance)` |

## Flat-size formulas

```
Pbase = perimeter(heartOutline(heartW))   — base band length
Plid  = perimeter(heartOutline(lidW))     — lid band length

widthPt  = 2mm + max(Pbase, Plid) + overlap + 2mm
heightPt = wallH + tabDepth
         + 8mm gap + heartHeight(baseW)
         + 8mm gap + lidWallH + tabDepth
         + 8mm gap + heartHeight(lidW)
         + 2mm
```

Default 5 in × 1.5 in heart box:
- `heartHeight(5in) ≈ 3.44 in`
- `Pbase ≈ 16.96 in` (perimeter of a 5 in heart)
- `widthPt ≈ 17.5 in` flat width
- `heightPt ≈ 12.0 in` flat height

## Closure / construction

- **Seam**: the band is wrapped around the heart floor with the overlap glued at the right edge (the seam-score crease helps fold this neat).
- **Floor tabs**: the comb of tabs along the bottom of the band fold inward at the `tab-fold` crease line and are glued to the underside of the heart floor.
- **Lid fit**: the lid heart is `2 × (thickness + clearance)` wider than the base, so it slides over without wobbling.
- No tuck lock — glued construction.

## Cut vs fold / cutting notes

- **Cut** (blue): 4 closed outlines — base band (with tab comb), base floor, lid band, lid floor.
- **Crease** (red dashed): `tab-fold` (where tabs fold inward) + `seam` (where the seam overlap folds over) per band = 4 crease lines total.
- **Glue** (grey hatch): seam overlap strips on both bands.
- Set the seam creases to **Score** in your cutter software; the tab-fold crease lines are the assembly guide.
- The heart floors have no creases — they are flat.

## Assembly

1. Score and cut the blank.
2. Wrap the base band around a heart template (or around itself) and glue the seam overlap.
3. Fold all tabs inward along the `tab-fold` crease.
4. Press the base heart floor onto the tabs and glue.
5. Repeat for the lid.
6. Drop the lid over the base.

## Implementation

- File: [`src/core/models/heartBox.ts`](../../src/core/models/heartBox.ts)
- Exported: `buildHeartBox(params)`, `defaultParams(heartW, wallH, thickness?)`, `heartHeight(w)`, `heartOutline(w, n?, ox?, oy?)`
- `heartOutline`: uses the classical parametric heart `(x=16sin³t, y=13cos t−5cos 2t−2cos 3t−cos 4t)`, scaled to width `w`, point-down, y-down, 120-point polygon.
- `band()`: builds the wall rectangle + seam glue tab (right side, width `overlap`) + a comb of `N` fold-in tabs along the bottom; returns outline, tab-fold crease, seam crease, glue hatch.
- `rectBleed()`: rectangular bleed contour around the band (avoids self-intersecting the contour offset on the notched tab edge).
- Heart floors use `bleedFromCut()` (true contour offset, safe on smooth closed curves).
- `flat: true` — the editor shows W/H dims on the flat; no 3D preview (bands roll, not fold).
