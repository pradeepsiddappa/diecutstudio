# Tuck-Top Auto-Bottom Carton — ECMA A65 / FEFCO 0215 (tuck-top variant)

The high-volume retail pairing: a **straight tuck top** (friction closure, with
a thumb-notch for opening) over a glued **crash-lock auto-bottom** that springs
into a locked floor the instant the flat-shipped carton is squared up. "Open and
go" for the packer; re-closeable on the shelf and in the shopper's hands.

**Code:** `src/core/models/tuckTopAutoBottom.ts`
**Status:** ✅ built — fully parametric `(L, W, H, thickness) → Dieline`
**ECMA / FEFCO reference:** ECMA A65 / FEFCO 0215 (tuck-top auto-bottom)
**Implemented from:** public packaging-engineering formulas (Paperboard
Packaging Handbook, FEFCO/ECMA codes). The top reuses our own STE detail
formulas; the bottom reuses our own auto-bottom formulas. No SVG import, no
competitor code.

## What it is — and how it differs from `auto-bottom`

This is the **sibling** of the [`auto-bottom`](auto-bottom.md) model. Both share
the identical glued crash-lock bottom; they differ only in the **top closure**:

| | top closure | mechanism |
|---|---|---|
| **`auto-bottom`** (≈ ECMA A67) | **reverse tuck** — a single rounded tuck flap off the back, no tongue | flap tucks in |
| **`tuck-top-auto-bottom`** (ECMA A65, this file) | **straight tuck** — a full tuck panel (depth W) **+ a tuck-in tongue** off the back, dust flaps on the sides, **thumb-notch on the front** | two-stage friction lock: panel folds 90°, tongue folds again and tucks inside the front wall |

`[straight tuck top] + [4-wall glued tube] + [crash-lock bottom]`. Ships flat,
pre-glued at the side seam **and** at two bottom triangles.

## Flat layout

```
←──────────────── flat width ────────────────→
       [back tuck panel + tongue]
┌────┬──────────────┬──────┬──────────────┬──────┐
│gl  │  Back  (L)   │Side1 │  Front (L)   │Side2 │
│ue  │ tuck + tongue│ (W)  │ thumb-notch  │ (W)  │  ← TOP: tuck+tongue on back,
│sea │              │ dust │   opening    │ dust │     dust on sides, notch on front
│m   │              │      │              │      │
│    │   wall H     │      │   wall H     │      │  H  (wall height)
├────┼──────────────┼──────┼──────────────┼──────┤  ← bottom hinge
└─┐  │  MAJOR  ╲lock│MINOR │  MAJOR  ╲lock│MINOR │
  │  │  W/2 deep╲tri│ L/2  │  W/2 deep╲tri│ L/2  │  ← BOTTOM auto-lock
  └──┴──────────╲───┴──────┴──────────╲───┴──────┘
                 glue triangles (×2, diagonally opposite)
```

- **Glue seam** (left): bonds behind Side2 when the tube is formed.
- **Back** (L): top tuck panel (depth W) + tuck-in tongue; bottom MAJOR flap.
- **Side1 / Side2** (W): top dust flaps; bottom MINOR flaps.
- **Front** (L): top is the thumb-notch opening; bottom MAJOR flap.

## Dimension semantics

| Input | Meaning | Drives |
|---|---|---|
| **L** | front/back panel width | panel width (×2), **minor (side) flap depth = L/2**, notch position |
| **W** | side panel width / box depth | panel width (×2), **tuck panel depth = W**, top dust depth, **major flap depth + lock triangle = W/2** |
| **H** | wall height | body height only |

## The straight tuck top (the defining feature vs `auto-bottom`)

- **Tuck panel** off the back, depth `tuckH = W` — folds down 90° to cap the box.
- **Tuck-in tongue** beyond the panel, depth `tongue` — folds another ~90° and
  tucks inside the front wall, providing the friction hold. Its corners are
  chamfered (`tc`) so it slides in cleanly.
- **Dust flaps** on the two sides (depth `dust`, chamfered corners `dc`) fold in
  first and back up the tuck.
- **Thumb-notch** (half-moon, radius `rN`) on the front top edge for opening; the
  tongue is sized `≥ rN + clearance` so it fully backs the notch when tucked.

The tongue depth follows the STE rule: `max(min(W·0.55, 0.7in), rN + 0.15in)`.

## The crash-lock bottom (identical to `auto-bottom`)

- **Major flaps** (off the two **L** panels — Back & Front): depth **W/2**, each
  with a **45° reverse-score diagonal** cutting off a **right-isosceles glue
  triangle** (leg = W/2) at diagonally-opposite corners.
- **Minor flaps** (off the two **W** panels — Sides): depth **L/2**, receive the
  glued triangles.
- Squaring the tube rotates the two bonded triangles → the floor snaps shut.
- Adjacent bottom flaps are separated by a thin **relief slit** (`relief`,
  ≈ board thickness).

See [`auto-bottom.md`](auto-bottom.md) for the full crash-lock rationale.

## Parameters & defaults

`defaultParams(L, W, H)` derives:

| Param | Formula | Notes |
|---|---|---|
| `glueFlap` | `clamp(W × 0.5, 10mm, 20mm)` | side-seam glue lap |
| `tongue` | `max(min(W × 0.55, 0.7in), rN + 0.15in)` | tuck-in tongue depth (≥ notch) |
| `dust` | `min(W × 0.85, L × 0.45)` | top dust flap reach |
| `majorDepth` | `W / 2` | back/front bottom flap depth = lock-triangle leg |
| `minorDepth` | `L / 2` | side bottom flap depth |
| `relief` | `max(thickness, 0.8mm)` | slit between adjacent bottom flaps |

Derived detail (local, mirrors `tuckEndDetails`): `tc = min(tongue·0.7, L·0.25)`,
`dc = min(dust·0.5, W·0.25)`, `gt = min(H·0.1, 0.2in)`, `rN = min(0.4in, L·0.18)`.

## Flat-size formula

```
flat_width  = glueFlap + 2L + 2W
flat_height = (W + tongue) + H + max(majorDepth, minorDepth)
            = (tuckH + tongue) + H + max(W/2, L/2)
```

Default A65 (L=4.5, W=2.2, H=6.5 in):
- `glueFlap = clamp(1.1, 0.39, 0.79) = 0.787 in` (20 mm cap)
- top region `= W + tongue = 2.2 + 0.7 = 2.9 in`
- `max(W/2, L/2) = max(1.1, 2.25) = 2.25 in`
- `flat_width = 0.787 + 9 + 4.4 = 14.19 in`
- `flat_height = 2.9 + 6.5 + 2.25 = 11.65 in`
- (+ 0.125 in bleed → page ≈ 14.44 × 11.9 in)

## Layers

| Layer | Contents |
|---|---|
| **cut** | one closed outline (back tuck+tongue, side dust flaps, front notch, walls, 4 bottom flaps with relief slits) |
| **crease** | 14 lines: 4 vertical walls + 3 top hinges + 1 tongue fold + 4 bottom hinges + 2 lock diagonals |
| **bleed** | contour offset (editor preview only; not exported) |
| **glue** | seam hatch + the two lock triangles hatched |

## Cutting / machine notes

- Standard shared conventions: blue = cut, red dashed = crease. Map via *Cut by
  Line Color* / *Cut by Layer* in Silhouette.
- The **two diagonal lock creases are reverse-scored** in real production so the
  triangles fold the right way and the bottom springs open.
- The straight tuck top is **glue-free** (friction); only the side seam and the
  two bottom triangles are glued.
- Exports carry **trim + fold only** (no bleed contour), like every model here.

## Feature overlays

Supports `window` (rounded aperture on the front, notch-safe) and `euro` (hang
slot on the back) — same as STE/RTE. The front/back panel rects are published in
`Dieline.panels`.

## 3D fold preview

`has3DPreview: true`. The shared `buildFoldable` (`src/ui/box3d/foldable.ts`) maps
this model to the `autoTuck` closure: a square tube with the STE-style tuck top
(panel + chamfered tongue + dust flaps + front thumb-notch, reusing the `ste`
closure's top builder) **and** the crash-lock bottom (reusing the `auto`
closure's bottom). The fold slider opens both ends: the tongue lifts out of the
front and the dust flaps splay (top), while the four bottom flaps splay down with
the two glue triangles **tinted** so the lock zone is legible. Illustrative of
the mechanism, not a full collapse-and-square simulation.

## v1 limitations / future work

- Lock-triangle angle fixed at 45° (could be exposed 40–50°), as in `auto-bottom`.
- A snap-lock (no-glue 1-2-3) bottom variant (ECMA A60 / B60) would be the same
  top with a manual-lock bottom — a future sibling.

## Changelog

- 2026-06-10 initial parametric build (straight tuck top + crash-lock bottom).
