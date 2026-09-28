# Pillow Box — Curved-End Pillow Carton (ECMA F7001 / commonly "E10")

A flattened tube whose two ends close with curved tuck flaps; squeezing the
folded edges bows the panels into the signature "pillow" shape. Gift cards,
jewelry, lip balm, small retail.

**Code:** `src/core/models/pillowBox.ts`
**Status:** ✅ built — fully parametric `(L, W, D, thickness) → Dieline`
**ECMA reference:** F7001 (pillow boxes sit in ECMA group F; many vendors still
label them E10 — the geometry is the same)
**Implemented from:** public structural formulas (arc-from-chord-and-sagitta).
No proprietary file imported.

## Dimension semantics

| Input | Meaning | Notes |
|---|---|---|
| **L** | tube length (long axis) | vertical in the flat |
| **W** | panel width = flattened-tube width | the wrap direction, per panel |
| **D** | depth / thickness | **not a panel** — realised by the end curvature; drives the arc sagitta `s = D/2` |

> In the editor the third field is labelled **Height (H)**; for the pillow box
> that value is the **depth D** (it drives the end curve). The registry maps
> H → D.

**Constraint:** `D ≤ W` (the curved-fold tangent must stay ≤ 45° or the board
tears). The model clamps the sagitta to `s ≤ 0.45·W`.

## Flat layout (a flattened tube)

```
   <-g->|<------ W ------>|<------ W ------>|
         ___               ___                ← OUTER CUT arc (sagitta s)
        /   \             /   \
   ┌---+. . .+-----------+. . .+              ← INNER CURVED CREASE (sagitta s/2)
   | G |     ‖           |     |
   | L |     ‖  PANEL A  |  PANEL B           ‖ = straight crease (tube edges)
   | U |     ‖   = W     |   = W              . = curved crease
   | E |     ‖           |     |
   ┌---+. . .+-----------+. . .+
        \___/             \___/                ← OUTER CUT arc
```

- **Glue flap** (width g) seams the tube (glued to panel B's far edge). Spans the
  body length only; chamfered outer corners.
- **Panel A / Panel B** (each width W) are the front/back of the flattened tube.
- The two straight creases (glue↔A and A↔B) are the tube's folded edges.
- Each end of each panel: an **outer circular-arc CUT** (the rounded blank edge)
  and a shallower **inner curved CREASE** sharing the same panel corners; the
  flap between them folds inward and the two panels' flaps nest (friction lock,
  no glue at the ends).

## Arc geometry

For an arc with chord = panel width W and sagitta (bow depth) `sag`:

```
radius   R = (W² + 4·sag²) / (8·sag)
center   on the chord's perpendicular bisector, R away from the apex
```

- **Cut arc:** `sag = s = D/2` (clamped to ≤ 0.45·W).
- **Crease arc:** `sag = s/2` (shallower, shares the panel corners) — the curved
  fold line. Both rendered as true circular arcs (flattened via `arcPoints`).

## Flat-size formula

```
flat_width  = glueFlap + 2W
flat_height = L + 2s        (s = D/2, clamped)
```

Default (L=5.5, W=3.5, D=1.2 in): glueFlap = 0.625 in, s = 0.6 in →
flat ≈ **7.625 × 6.7 in** (+ bleed → page ≈ 7.88 × 6.95 in).

## Layers

| Layer | Contents |
|---|---|
| **cut** | one closed outline: glue flap + 4 outer end arcs + the free right edge |
| **crease** | 6: 2 straight tube edges + 4 curved end fold arcs |
| **bleed** | contour offset (editor preview only; not exported) |
| **glue** | the seam flap, hatched |

## 3D fold preview

`has3DPreview: true`. The shared `buildFoldable` has a `pillow` closure that
renders the assembled shape as two **bowed curved surfaces** (not flat hinged
panels). Each panel is a displaced grid with the bow along **Z (toward the
camera)** so the puff reads from the default view instead of looking like a flat
sheet from above: `z = ±amp · cos(π·y/w) · endTaper(x)`. The `cos` across the
width gives the lens cross-section (meeting at the side folds); `endTaper` keeps
the bow ~uniform over the body and rounds it to a seam only near the two ends
(the pillow closure), rather than tapering to an almond. Box3D gives the pillow a
dedicated front-ish 3/4 camera angle (`Box3D.tsx` setup). The fold slider
animates the bow amplitude (closed = full bow, open = flat). Drag to rotate for
other angles.

## Cutting / machine notes

- Blue = cut (outer arcs + outline), red dashed = crease (2 straight + 4 curved).
- The 4 curved creases must be **scored as curves** — set them to Score in the
  cutter so the rounded ends fold cleanly.
- Exports carry **trim + fold only** (no bleed contour), like every model here.

## v1 limitations / future work

- The 3D preview models the bowed body; it doesn't show the curved end-flap tuck
  detail (the body bow is the recognizable feature).
- Optional **thumb-notch** (a small semicircle on one end's cut arc for easy
  opening) is a future overlay (Phase 3).
- Curve is a true circular arc (the universal dieline convention); the
  mathematically-ideal developable curve is a sinusoid — not needed in practice.

## Changelog

- 2026-06-08 initial parametric build (Phase 2, model #3).
