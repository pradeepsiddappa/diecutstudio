# Auto-Bottom / Crash-Lock Carton — ECMA B40 / FEFCO 0215

A glued tube whose **bottom is pre-glued** so it springs into a fully locked
floor the instant the flat-shipped carton is squared up — "open and go" for
retail packers. The **top** is a reverse-tuck closure (the dominant retail
pairing, often called the *Tuck-Top Auto-Bottom*).

**Code:** `src/core/models/autoBottom.ts`
**Status:** ✅ built — fully parametric `(L, W, H, thickness) → Dieline`
**ECMA / FEFCO reference:** ECMA B40 / FEFCO 0215
**Implemented from:** public packaging-engineering formulas (Paperboard
Packaging Handbook, FEFCO/ECMA codes, the US 6,386,437 auto-bottom mechanism).
No SVG import, no competitor code.

## What it is

`[reverse-tuck top] + [4-wall glued tube] + [crash-lock bottom]`. Ships flat,
pre-glued at the side seam **and** at two bottom triangles; the packer just pops
it open and the bottom locks itself.

## Flat layout

```
←──────────────── flat width ────────────────→
       [back tuck flap]
┌────┬──────────────┬──────┬──────────────┬──────┐
│gl  │  Back  (L)   │Side1 │  Front (L)   │Side2 │
│ue  │   tuck top   │ (W)  │  OPEN top    │ (W)  │  ← TOP: tuck on back,
│sea │              │ dust │              │ dust │     dust on sides, front open
│m   │              │      │              │      │
│    │   wall H     │      │   wall H     │      │  H  (wall height)
├────┼──────────────┼──────┼──────────────┼──────┤  ← bottom hinge
└─┐  │  MAJOR  ╲lock│MINOR │  MAJOR  ╲lock│MINOR │
  │  │  W/2 deep╲tri│ L/2  │  W/2 deep╲tri│ L/2  │  ← BOTTOM auto-lock
  └──┴──────────╲───┴──────┴──────────╲───┴──────┘
                 glue triangles (×2, diagonally opposite)
```

- **Glue seam** (left): bonds behind Side2 when the tube is formed.
- **Back** (L): top tuck flap (rounded corners + base shoulder chamfers);
  bottom MAJOR flap.
- **Side1 / Side2** (W): top dust flaps; bottom MINOR flaps.
- **Front** (L): top is the OPEN edge; bottom MAJOR flap.

## Dimension semantics

| Input | Meaning | Drives |
|---|---|---|
| **L** | front/back panel width | panel width (×2), **minor (side) flap depth = L/2** |
| **W** | side panel width / box depth | panel width (×2), top flap depths, **major flap depth + lock triangle = W/2** |
| **H** | wall height | body height only |

## The crash-lock bottom (the defining feature)

- **Major flaps** (off the two **L** panels — Back & Front): depth **W/2**. Each
  carries a **45° reverse-score diagonal** from its right hinge corner down to
  the floor centerline, cutting off a **right-isosceles glue triangle** with
  leg = W/2.
- **Minor flaps** (off the two **W** panels — Sides): depth **L/2**. They receive
  the glued triangles and tuck under.
- The two glue triangles sit at **diagonally-opposite corners** (Back→Side1,
  Front→Side2) — exactly two glue points, which is what makes the bottom
  *automatic*: squaring the tube rotates the bonded triangles and the floor
  snaps shut.
- Adjacent bottom flaps are separated by a thin **relief slit** (`relief`,
  ≈ board thickness) so each folds independently.

The 45° right-isosceles construction (leg = W/2, apex at the bottom center) is
the version that provably lies flat when collapsed **and** locks when erected.
The diagonal angle is the standard nominal; references accept 40–50°.

## Parameters & defaults

`defaultParams(L, W, H)` derives:

| Param | Formula | Notes |
|---|---|---|
| `glueFlap` | `clamp(W × 0.5, 10mm, 20mm)` | side-seam glue lap |
| `tuckH` | `W × 0.85` | top tuck flap depth |
| `dustH` | `W − 2mm` | top dust flap depth |
| `shoulderCut` | `min(W × 0.3, 8mm)` | tuck base chamfer |
| `tuckCornerR` | `min(W × 0.4, 12mm)` | rounded tuck corners (Q-bezier) |
| `dustCornerR` | `min(W × 0.25, 4mm)` | dust outer chamfer |
| `glueTaper` | `min(H × 0.1, 0.2in)` | seam-flap top/bottom taper |
| `majorDepth` | `W / 2` | back/front flap depth = lock-triangle leg |
| `minorDepth` | `L / 2` | side flap depth |
| `relief` | `max(thickness, 0.8mm)` | slit between adjacent bottom flaps |

## Flat-size formula

```
flat_width  = glueFlap + 2L + 2W
flat_height = tuckH + H + max(majorDepth, minorDepth)
            = tuckH + H + max(W/2, L/2)
```

Default B40 (L=4.5, W=2.2, H=6.5 in):
- `glueFlap = clamp(1.1, 0.39, 0.79) = 0.787 in` (20 mm cap)
- `tuckH = 1.87 in`, `max(W/2, L/2) = max(1.1, 2.25) = 2.25 in`
- `flat_width = 0.787 + 9 + 4.4 = 14.19 in`
- `flat_height = 1.87 + 6.5 + 2.25 = 10.62 in`
- (+ 0.125 in bleed → page ≈ 14.44 × 10.87 in)

## Layers

| Layer | Contents |
|---|---|
| **cut** | one closed outline (top tucks + walls + 4 bottom flaps with relief slits) |
| **crease** | 13 lines: 4 vertical walls + 3 top hinges + 4 bottom hinges + 2 lock diagonals (reverse-score) |
| **bleed** | contour offset (editor preview only; not exported) |
| **glue** | seam hatch + the two lock triangles hatched |

## Cutting / machine notes

- Same shared conventions: blue = cut, red dashed = crease. Map via *Cut by Line
  Color* / *Cut by Layer* in Silhouette.
- The **two diagonal lock creases are reverse-scored** in real production (scored
  from the opposite side) so the triangles fold the right way and the bottom
  springs open. The file marks them as creases; set the score direction in your
  finishing step.
- Exports carry **trim + fold only** (no bleed contour), like every model here.

## 3D fold preview

`has3DPreview: true`. The shared `buildFoldable` (`src/ui/box3d/foldable.ts`)
has an `auto` closure: a square tube with the reverse-tuck top + the crash-lock
bottom. Dragging the fold slider closes the bottom — the four flaps rotate in to
form the floor (minor/side flaps lead, major/front-back flaps follow), with the
two glue triangles **tinted** so the lock zone is legible. The diagonal split is
the same 45° geometry as the dieline. The animation is illustrative of the
mechanism; it does not simulate the full collapse-and-square kinematics.

## v1 limitations / future work

- **Wide-footprint reinforcement** (a central extra flap when `L > 2W`) is not
  yet added — fine for normal retail proportions.
- Lock-triangle angle is fixed at 45°; could be exposed (40–50°) to tune lock
  tension later.
- Snap-lock (no-glue, manual 1-2-3) variant (ECMA B60) would be the same blank
  without the pre-glue — a future toggle.

## Changelog

- 2026-06-08 initial parametric build (Phase 2, model #1).
