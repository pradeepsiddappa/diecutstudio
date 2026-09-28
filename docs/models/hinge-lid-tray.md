# Hinged-Lid Tray — one-piece tray with attached flip lid (ECMA C30)

A **four-corner glued base tray** with a **lid hinged off the top edge of the
back wall**. The lid folds forward over the tray and a tuck-in flap on its
leading edge tucks down inside the **front wall** to hold it closed. One piece,
re-closeable — chocolate / confectionery boxes, phone-case boxes, small gift
trays.

**Code:** `src/core/models/hingeLidTray.ts`
**Status:** ✅ built — fully parametric `(L, W, H, thickness) → Dieline`
**ECMA / FEFCO reference:** ECMA C30 (hinged-lid tray) + ECMA C10 four-corner
tray base.
**Implemented from:** public ECMA C30 / C10 references (Paperboard Packaging
Handbook). No SVG import, no competitor code.

## What it is

`[four-corner glued tray] + [lid hinged off the back wall] + [front tuck flap]`.
It reuses the **open-tray** base ([`open-tray`](open-tray.md)) — floor + four
walls, the two end walls carrying corner glue flaps that wrap onto the front/back
walls — then grows the back wall up into a lid panel and a tuck flap.

## Flat layout

```
                  [ lid tuck flap   L × tuckD ]
                  [ lid panel       L × W     ]
   [Ltf]          [ back wall       L × H     ]          [Rtf]
   [L end wall W×H] [    BASE  L×W   ] [R end wall W×H]
   [Lbf]          [ front wall      L × H     ]          [Rbf]
```

- **BASE** = the open-tray cross: floor + four walls; the two **end walls**
  (left/right, width W) each carry two **corner glue flaps** (`Ltf/Lbf/Rtf/Rbf`)
  that wrap 90° and bond to the inner face of the front/back walls — the rigid
  four-corner tray.
- The **back wall** (length L) extends up into the **lid panel** (L×W) and a
  **lid tuck flap** (depth `tuckD`, chamfered corners) that tucks inside the
  front wall.
- The **front wall** (length L) is plain.

## Dimension semantics

| Input | Meaning | Drives |
|---|---|---|
| **L** | base length | base + all length-L walls, lid + tuck width |
| **W** | base width / depth | base + end-wall width, **lid panel depth** |
| **H** | wall height | all four walls + corner-flap height |

## How it holds (two mechanisms)

1. **Base** — the four corner glue flaps bond to the front/back walls, giving the
   rigid four-corner tray (same as the open tray). Glued.
2. **Lid** — closes by the **friction tuck**: the lid tuck flap (depth `tuckD ≤
   H`) tucks down inside the front wall. Re-openable. No lid glue.

## Parameters & defaults

`defaultParams(L, W, H)` derives:

| Param | Formula | Notes |
|---|---|---|
| `relief` | `max(thickness, 1mm)` | corner slit / rim relief |
| `flapDepth` | `clamp(H × 0.8, 5mm, L/2 − relief)` | corner-flap wrap depth |
| `chamfer` | `min(flapDepth × 0.4, 6mm)` | corner-flap "drag" chamfer |
| `tuckD` | `clamp(H × 0.7, 8mm, H − relief)` | lid tuck depth (fits inside the front wall) |
| `tuckChamfer` | `min(tuckD × 0.5, L × 0.1)` | lid tuck leading-corner chamfer |

Default C30 (L=6, W=4, H=1.5 in — a shallow chocolate / gift tray).

## Flat-size formula

```
flat_width  = 2H + L
flat_height = tuckD + 2W + 2H
            = [tuck] + [lid W] + [back wall H] + [base W] + [front wall H]
```

## Layers

| Layer | Contents |
|---|---|
| **cut** | one closed outline (lid tuck + lid + back wall + base + front wall + two end walls with corner flaps) |
| **crease** | **10** lines: 4 base↔wall + 4 wall↔corner-flap + lid hinge + lid↔tuck |
| **bleed** | contour offset (editor preview only; not exported) |
| **glue** | the four corner flaps hatched (base only — the lid is a friction tuck) |

## Cutting / machine notes

- Standard conventions: blue = cut, red dashed = crease.
- Glue **only** the four base corner flaps; the lid + tuck are friction (cut +
  crease, no glue).
- Exports carry **trim + fold only** (no bleed contour).

## 3D fold preview

`has3DPreview: true`. The shared `buildFoldable` maps this model to the
`hingeLid` closure: a statically-erected four-corner tray (floor + 4 walls) plus
a **lid hinged at the back-top edge**. The fold slider swings the lid: closed
(t=0) lies flush on top with the tuck flap folded down into the front wall; open
(t=1) the lid swings up and back to reveal the tray cavity (the tuck flap
flattens as it opens).

## v1 limitations / future work

- The lid has **no side dust flaps** yet — it closes flush on the rim with only
  the front tuck. Side flaps (tucking inside the end walls) would add rigidity —
  a future option.
- A friction-only (no-glue, locking-tab base) variant could be a sibling.

## Changelog

- 2026-06-10 initial parametric build (open-tray base + hinged lid + front tuck).
