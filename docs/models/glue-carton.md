# Sealed-End / Standard Glue Carton — ECMA B10

The basic **"tube with glued ends"** folding carton: a 4-wall glued tube whose
**top and bottom are each sealed shut by four glued flaps** — no tuck, no lock.
The pharma / dry-food / confectionery standard: strong, tamper-resistant, and
machine-glued at high speed. Unlike a tuck carton it doesn't re-open; the product
is filled before the second end is sealed.

**Code:** `src/core/models/glueCarton.ts`
**Status:** ✅ built — fully parametric `(L, W, H, thickness) → Dieline`
**ECMA / FEFCO reference:** ECMA B10 (standard glue / sealed-end carton)
**Implemented from:** the public sealed-end / glue-carton standard (4 flaps per
end: two W/2 sealing flaps + two chamfered dust flaps). No SVG import, no
competitor code.

## What it is

`[4-wall glued tube] + [glued top end] + [glued bottom end]`. The single glued
side seam forms the tube; then each end is closed by four flaps and bonded. The
closure is a **glued seal**, not a mechanical tuck or lock — that's what
distinguishes B10 from the tuck/auto/snap cartons.

It is structurally a folding-carton cousin of the corrugated RSC
([`rsc`](rsc.md)), but: thin board, **both ends fully glued** (RSC is taped and
shows one open/folding end), **chamfered dust flaps** (folding cartons chamfer
them; the RSC doesn't), and thin knife slits instead of wide corrugated slots.

## Flat layout

```
←──────────────── flat width ────────────────→
┌────┬──────────────┬──────┬──────────────┬──────┐
│gl  │  Back SEAL   │Side  │  Front SEAL  │Side  │  ← TOP end (glued)
│ue  │  (L, W/2)▓▓  │ dust │  (L, W/2)▓▓  │ dust │     seal flaps hatched = glue
│sea ├──────────────┼──────┼──────────────┼──────┤  ← top hinge
│m   │  Back  (L)   │Side  │  Front (L)   │Side  │
│    │   wall H     │ (W)  │   wall H     │ (W)  │  H
│    ├──────────────┼──────┼──────────────┼──────┤  ← bottom hinge
│    │  Back SEAL   │ dust │  Front SEAL  │ dust │  ← BOTTOM end (glued)
└─┐  │  (L, W/2)▓▓  │      │  (L, W/2)▓▓  │      │
  └──┴──────────────┴──────┴──────────────┴──────┘
```

- **Glue seam** (left): bonds the tube.
- **Back / Front** (L panels): **sealing flaps**, depth W/2 — they meet at each
  end's centreline and glue down. Hatched (glue) at **both** ends.
- **Side1 / Side2** (W panels): **dust flaps**, chamfered outer corners — fold in
  first; the sealing flaps bond over them.

## Dimension semantics

| Input | Meaning | Drives |
|---|---|---|
| **L** | back/front panel width | panel width (×2), sealing-flap width |
| **W** | side panel width / box depth | panel width (×2), **sealing-flap depth = W/2**, dust-flap width |
| **H** | wall height | body height only |

## The sealed ends (the defining feature)

Each end is closed in two layers:

1. The two **dust flaps** (off the side W panels) fold in first — depth
   `dustDepth` (≈ 0.9·W/2, clamped so they never collide across the L gap),
   chamfered so they clear the corners.
2. The two **sealing flaps** (off the front & back L panels) fold over, **meet at
   the end centreline** (depth W/2 each), and are **glued down onto the dust
   flaps** — four glue joints per end, eight per carton.

The hold is a permanent **glued seal** (the box is not designed to re-open). For
the dieline the four sealing flaps are hatched as the glue zones, plus the side
seam.

## Parameters & defaults

`defaultParams(L, W, H)` derives:

| Param | Formula | Notes |
|---|---|---|
| `glueFlap` | `clamp(W × 0.6, 8mm, 16mm)` | side-seam flap |
| `sealDepth` | `W / 2` | front/back sealing flap depth (meet at centre) |
| `dustDepth` | `min(sealDepth × 0.9, L/2 − relief)` | side dust flap depth (folds under) |
| `dustChamfer` | `min(dustDepth × 0.4, W × 0.2)` | dust-flap outer-corner chamfer |
| `relief` | `max(thickness, 0.8mm)` | slit between adjacent flaps |

Default B10 (L=2.5, W=1.4, H=5 in — a tall slim pharma carton).

## Flat-size formula

```
flat_width  = glueFlap + 2L + 2W
flat_height = 2 × sealDepth + H = W + H
```

## Layers

| Layer | Contents |
|---|---|
| **cut** | one closed outline (4 walls + 4 sealing flaps + 4 chamfered dust flaps, with relief slits) |
| **crease** | **12** lines: 4 vertical walls + 4 top hinges + 4 bottom hinges |
| **bleed** | contour offset (editor preview only; not exported) |
| **glue** | side seam **+ all four sealing flaps** (both ends) hatched |

## Cutting / machine notes

- Standard conventions: blue = cut, red dashed = crease. Map via *Cut by Line
  Color* / *Cut by Layer* in Silhouette.
- This is a **glued** carton: the four sealing flaps per end are bonded. On a
  digital cutter you'd cut + crease the blank and glue by hand (or run it through
  a folder-gluer for production).
- Exports carry **trim + fold only** (no bleed contour), like every model here.

## Feature overlays

Supports `window` (front aperture) and `euro` (back hang slot) — publishes
front/back panel rects in `Dieline.panels`.

## 3D fold preview

`has3DPreview: true`. The shared `buildFoldable` maps this model to the `sealed`
closure: a 4-wall tube with **both ends** carrying four flaps — the two sealing
flaps (off the L walls) **tinted** as the glue zones, the two dust flaps (off the
W walls) plain. The fold slider opens/closes both ends together (sealing flaps
lead, dust flaps follow). Closed = a clean sealed box with the tinted seal flaps
meeting on top; open = all eight flaps splayed.

## v1 limitations / future work

- The seal is shown as a full-flap glue zone; per-joint glue dots aren't modelled.
- A 1-end-glued / 1-end-tuck hybrid (fill-then-tuck retail variant) could be a
  future toggle.

## Changelog

- 2026-06-10 initial parametric build (sealed-end glue carton, both ends).
