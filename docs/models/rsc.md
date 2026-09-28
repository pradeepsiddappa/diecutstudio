# Regular Slotted Container (RSC) — FEFCO 0201

The classic corrugated **shipping box** — a 4-wall glued tube with four flaps top
and bottom. The two **outer** flaps (off the long L panels) meet at the centre;
the two **inner** flaps (off the W panels) fold under and leave a gap. Sealed
with tape/glue along the centre seam. The single most-used box style worldwide.

**Code:** `src/core/models/rsc.ts`
**Status:** ✅ built — fully parametric `(L, W, H, thickness) → Dieline`
**FEFCO reference:** 0201
**Implemented from:** the public FEFCO 0201 standard (all flaps = half the box
width). No proprietary file.

## Flat layout

```
←──────────── flat width = glue + 2L + 2W ────────────→
┌────┬───────────┬────────┬───────────┬────────┐
│    │  top flap │ top fl │ top flap  │ top fl │   ← all flaps W/2 deep
│ gl │═══════════╪════════╪═══════════╪════════│   ← top fold line
│ ue │  front L  │ side W │  back L   │ side W │  H  (wall height)
│ jt │═══════════╪════════╪═══════════╪════════│   ← bottom fold line
│    │  bot flap │ bot fl │ bot flap  │ bot fl │
└────┴───────────┴────────┴───────────┴────────┘
```

- **Manufacturer's joint** (glue flap, left): body-height tab that bonds the
  tube (glued/taped/stitched).
- **Front / Back** walls (length **L**): their flaps are the **outer** flaps —
  depth W/2 each, so they **meet** at the centre.
- **Side** walls (width **W**): their flaps are the **inner** flaps — also W/2
  deep, folding under with a gap of `L − W` between them.
- Adjacent flaps are separated by **slots** (≈ a few mm, the corrugated kerf) at
  each panel boundary so they fold independently.

## Dimension semantics

| Input | Meaning | Drives |
|---|---|---|
| **L** | front/back panel width (length) | panel width (×2) |
| **W** | side panel width (depth) | panel width (×2) **and** the flap depth (W/2) |
| **H** | wall height | body height |

## Parameters & defaults

| Param | Formula |
|---|---|
| `glueFlap` | `clamp(min(L,W) × 0.25, 28mm, 45mm)` (manufacturer's joint) |
| `flapDepth` | `W / 2` (so opposing outer flaps meet) |
| `relief` | `max(thickness, 3mm)` (slot width between flaps) |

## Flat-size formula

```
flat_width  = glueFlap + 2L + 2W
flat_height = H + W          (= W/2 top flap + H body + W/2 bottom flap)
```

Default RSC (L=12, W=9, H=6 in): glueFlap ≈ 1.6 in →
flat ≈ **43.6 × 15 in** (+ bleed). A big sheet — RSCs are large.

## Layers

| Layer | Contents |
|---|---|
| **cut** | one closed "comb" outline (8 flaps + slots + body + joint) |
| **crease** | 12: 4 vertical wall folds + 4 top flap folds + 4 bottom flap folds |
| **bleed** | contour offset (editor preview only; not exported) |
| **glue** | the manufacturer's joint, hatched |

## 3D fold preview

`has3DPreview: true`. The `rsc` closure in `buildFoldable`: four walls + a closed
bottom + four top flaps as hinge groups that fold from flat-closed (outer flaps
meet, inner flaps under) to open, driven by the fold slider. The bottom is shown
closed (a plane) for clarity rather than animating all eight flaps.

## Cutting / machine notes

- Blue = cut (outline + slots), red dashed = crease (wall + flap folds).
- For real corrugated, the slots and caliper are larger than folding carton —
  `relief` defaults to 3mm to reflect that.
- Exports carry **trim + fold only** (no bleed contour), like every model here.

## v1 limitations / future work

- All flaps are W/2 (standard RSC). Variants — **OSC** (0202, overlapping outer
  flaps), **FOL** (0203, full overlap), **center-special** (0204) — are future.
- 3D animates the top flaps only (bottom shown closed).

## Changelog

- 2026-06-09 initial parametric build (FEFCO 0201) + RSC 3D fold.
