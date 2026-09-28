# Tuck-Top Snap-Lock Bottom — ECMA A60 / "1-2-3 bottom" / Himes lock

The **glue-free** retail sibling of the [Tuck-Top Auto-Bottom](tuck-top-auto-bottom.md).
Same straight tuck top (friction lock + thumb-notch), but the bottom is a
**mechanical snap-lock** instead of a pre-glued crash-lock: the packer folds the
four bottom flaps in a 1-2-3 sequence and the last (front) flap's **lock-tab**
snaps the floor shut — **no glue on the bottom** (only the side seam is glued).

**Code:** `src/core/models/snapLockBottom.ts`
**Status:** ✅ built — fully parametric `(L, W, H, thickness) → Dieline`
**ECMA / FEFCO reference:** ECMA A60 (tuck-top, 1-2-3 / snap-lock bottom)
**Implemented from:** public packaging-engineering references (the 1-2-3 /
snap-lock / Himes-lock bottom, Paperboard Packaging Handbook, FEFCO/ECMA codes).
Top reuses our own STE detail formulas. No SVG import, no competitor code.

## Why it exists (vs A65 crash-lock)

Both share the **identical straight tuck top**. They differ only in the bottom:

| | bottom | glue | how it closes |
|---|---|---|---|
| **A65** ([`tuck-top-auto-bottom`](tuck-top-auto-bottom.md)) | crash-lock | side seam **+ 2 bottom triangles** | pre-glued, springs shut when squared |
| **A60** (`snap-lock-bottom`, this) | snap-lock (1-2-3) | side seam **only** | packer folds flaps; front lock-tab snaps under |

The A60 needs **one glue line** on the converting machine (cheaper) and is the
classic choice for boxes erected and locked by hand on a pack line.

## Flat layout

```
←──────────────── flat width ────────────────→
       [back tuck panel + tongue]
┌────┬──────────────┬──────┬──────────────┬──────┐
│gl  │  Back  (L)   │Side1 │  Front (L)   │Side2 │
│ue  │ tuck + tongue│ (W)  │ thumb-notch  │ (W)  │  ← TOP (same as A65)
│sea │              │ dust │              │ dust │
│m   │   wall H     │      │   wall H     │      │  H
├────┼──────────────┼──────┼──────────────┼──────┤  ← bottom hinge
│    │  MAJOR (W/2) │MINOR │ MAJOR + ⊓tab │MINOR │  ← BOTTOM snap-lock
│    │   plain      │ L/2 ◹│  lock tab    │◺ L/2 │    sides clipped 45°,
└─┐  └──────────────┴──────┴──────⊔───────┴──────┘    front carries the lock tab
  └──┘
```

- **Back** (L panel): plain MAJOR flap, depth W/2 — folds in first; the lock-tab
  tucks **under** its free edge.
- **Side1 / Side2** (W panels): MINOR flaps, depth L/2, each with a **45° clip**
  on its **front-facing inner corner** — the clips form the catch.
- **Front** (L panel): MAJOR flap, depth W/2, with a central **lock-tab** that
  projects `tabLen` past the floor centre. Folded in last, the tab tucks under
  the back flap and its shoulders snap into the side-flap clips → locked.

## Dimension semantics

| Input | Meaning | Drives |
|---|---|---|
| **L** | front/back panel width | panel width (×2), **minor (side) flap depth = L/2**, notch + tab position |
| **W** | side panel width / box depth | panel width (×2), **tuck panel depth = W**, **major flap depth = W/2**, tab reach |
| **H** | wall height | body height only |

## The snap-lock (the defining feature)

The hold is **purely mechanical** — there is **no bottom glue** and **no
reverse-score diagonal** (unlike the A65 crash-lock):

1. Fold the two **side flaps** in (their 45° clips face the front).
2. Fold the **back flap** in flat (it becomes the floor under-layer).
3. Fold the **front flap** in last: its central tab passes between the side
   clips, tucks under the back flap, and the **tab shoulders catch the clips** —
   it snaps and holds.

To open, the shopper flexes the front flap free. Re-closeable, glue-free.

## Parameters & defaults

`defaultParams(L, W, H)` derives:

| Param | Formula | Notes |
|---|---|---|
| `glueFlap` | `clamp(W × 0.5, 10mm, 20mm)` | side-seam glue lap (the only glue) |
| `tongue` | `max(min(W × 0.55, 0.7in), rN + 0.15in)` | tuck-in tongue depth (≥ notch) |
| `dust` | `min(W × 0.85, L × 0.45)` | top dust flap reach |
| `majorDepth` | `W / 2` | back/front flap depth (reaches centre) |
| `minorDepth` | `L / 2` | side flap depth (reaches centre) |
| `tabW` | `clamp(L × 0.4, 18mm, L × 0.7)` | front lock-tab width |
| `tabLen` | `min(W × 0.22, 14mm)` | how far the tab projects past centre |
| `clip` | `min(minorDepth × 0.35, majorDepth × 0.7)` | 45° clip on side flaps' front corners |
| `relief` | `max(thickness, 0.8mm)` | slit between adjacent bottom flaps |

## Flat-size formula

```
flat_width  = glueFlap + 2L + 2W
flat_height = (W + tongue) + H + max(minorDepth, majorDepth + tabLen)
            = (W + tongue) + H + max(L/2, W/2 + tabLen)
```

Default A60 (L=4.5, W=2.2, H=6.5 in): top region 2.9 in, bottom extent
`max(2.25, 1.1+0.19)=2.25 in` → flat ≈ 14.19 × 11.65 in (+ bleed → 14.44 × 11.9).

## Layers

| Layer | Contents |
|---|---|
| **cut** | one closed outline (back tuck+tongue, dust flaps, front notch, walls, 4 snap-lock flaps with side clips + front lock-tab) |
| **crease** | **12** lines: 4 vertical walls + 3 top hinges + 1 tongue + 4 bottom hinges (**no** reverse-score diagonals — that's the A65 crash-lock) |
| **bleed** | contour offset (editor preview only; not exported) |
| **glue** | **side-seam hatch only** — the bottom is glue-free |

## Cutting / machine notes

- Standard conventions: blue = cut, red dashed = crease. Map via *Cut by Line
  Color* / *Cut by Layer* in Silhouette.
- The whole bottom is **glue-free** — only the side seam is glued. The lock-tab,
  side clips and shoulders are all plain knife cuts on the trim layer.
- Exports carry **trim + fold only** (no bleed contour), like every model here.

## Feature overlays

Supports `window` (front, notch-safe) and `euro` (back hang slot) — publishes
front/back panel rects in `Dieline.panels`, same as STE/RTE/A65.

## 3D fold preview

`has3DPreview: true`. The shared `buildFoldable` maps this model to the
`snapTuck` closure: the STE-style tuck top (reusing the `ste` top builder) + a
snap-lock bottom — plain back flap, plain side flaps, and a FRONT flap carrying a
central **tinted lock-tab** (the legible distinguishing element vs the
crash-lock's tinted diagonal triangles). The fold slider folds the flaps in
(sides lead, majors follow). The 45° side clips are shown precisely in the
dieline; the 3D keeps the tab as the readable lock. Illustrative of the
mechanism, not a full kinematic simulation.

## v1 limitations / future work

- The lock engagement (tab-under-back-flap + shoulder/clip catch) is geometric;
  it is not stress-tested for a given board caliper. Tune `tabLen`/`clip` for
  thicker boards if the lock feels loose.
- A scored tab (so it bends to tuck) could be added; currently the tab is rigid
  with the front flap.

## Changelog

- 2026-06-10 initial parametric build (straight tuck top + snap-lock 1-2-3 bottom).
