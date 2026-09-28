# Open Sleeve — Open-Ended Wrap Tube (ECMA D10)

A rectangular tube, **open at both ends**, that slides over an inner tray or the
product itself. The simplest glued structure: four walls wrap around the
cross-section and a glue flap seams the tube; no end flaps. Premium cosmetics,
soap, candles, multi-packs, belly-band sleeves.

**Code:** `src/core/models/openSleeve.ts`
**Status:** ✅ built — fully parametric `(L, W, H, thickness) → Dieline`
**ECMA reference:** D10
**Implemented from:** public references (ECMA D10 sleeve). No proprietary file.

## Flat layout

```
←──────────── flat width = glue + 2W + 2H ────────────→
┌────┬──────────┬──────┬──────────┬──────┐  ▲
│ gl │  top  W  │ right│ bottom W │ left │  │
│ ue │          │  H   │          │  H   │  L   (sleeve length = open-end axis)
│    │          │      │          │      │  │
└────┴──────────┴──────┴──────────┴──────┘  ▼
```

- Wraps into a tube of cross-section **W × H**, length **L**.
- **Glue flap** (left) seams to the far edge of the left panel.
- Both the **top and bottom edges of the blank are the OPEN ends** — no flaps.

## Dimension semantics

| Input | Meaning |
|---|---|
| **L** | sleeve length (the open-end axis) → the blank height |
| **W** | cross-section width (the top/bottom panels) |
| **H** | cross-section height (the side panels) |

## Parameters & defaults

| Param | Formula |
|---|---|
| `glueFlap` | `clamp(min(W,H) × 0.5, 10mm, 18mm)` |
| `glueTaper` | `4mm` chamfer on the glue flap's outer corners |

## Flat-size formula

```
flat_width  = glueFlap + 2W + 2H   (the wrap perimeter + seam)
flat_height = L
```

Default (L=5, W=3, H=1.4 in): glueFlap ≈ 0.55 in → flat ≈ **9.5 × 5 in**
(+ bleed → page ≈ 9.75 × 5.25 in).

## Layers

| Layer | Contents |
|---|---|
| **cut** | one closed rectangle outline with the chamfered glue flap |
| **crease** | 4 vertical panel folds (full length) |
| **bleed** | contour offset (editor preview only; not exported) |
| **glue** | the seam flap, hatched |

## 3D fold preview

`has3DPreview: true`. The shared `buildFoldable` has a `sleeve` closure: four
panels chained as nested hinges that wrap from a flat strip (fold open) into a
rectangular tube (fold closed), open at both ends.

## Cutting / machine notes

- Blue = cut, red dashed = crease (4 folds). Both ends are open — nothing to cut
  there.
- Exports carry **trim + fold only** (no bleed contour), like every model here.

## v1 limitations / future work

- **Thumb-cut / finger-notch** on the open ends (to push the tray out) is a
  future overlay (Phase 3).
- A **closed-end sleeve** or **double-wall sleeve** would be separate models.

## Changelog

- 2026-06-08 initial parametric build (Phase 2, model #4) + sleeve 3D wrap fold.
  **Completes Phase 2.**
