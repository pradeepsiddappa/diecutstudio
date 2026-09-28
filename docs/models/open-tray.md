# Simple Open Tray — Four-Corner Glued Tray (ECMA C10 / FEFCO 0422 family)

A flat base with a wall folding up on each of its four edges; each corner is
closed by a glue flap that wraps around and bonds to the adjacent wall, giving a
rigid open-top tray. Bakery / food / gift bases, retail trays.

**Code:** `src/core/models/openTray.ts`
**Status:** ✅ built — fully parametric `(L, W, H, thickness) → Dieline`
**ECMA / FEFCO reference:** ECMA C10 / FEFCO 0422 family
**Implemented from:** public references (ECMA C10, Paperboard Packaging
Handbook). No proprietary file imported.

## Flat layout (a plus / cross)

```
                  [ top side wall  L×H ]
   [Ltf]                                      [Rtf]
   [L end wall W×H] [   BASE  L×W   ] [R end wall W×H]
   [Lbf]                                      [Rbf]
                  [ bottom side wall L×H]
```

- **BASE** — L × W rectangle in the centre.
- **Side walls** (top + bottom, length **L**) fold up on the base's long edges.
  They carry **no flaps**.
- **End walls** (left + right, width **W**) fold up on the short edges. Each
  carries **two corner glue flaps** (`Ltf, Lbf, Rtf, Rbf`).
- **Corner glue flaps** are hinged to the END walls, fold 90° around each corner,
  and glue to the **inner face of the side walls** — making the side wall
  double-thick (the standard load-bearing four-corner tray). Each flap's free
  outer corner is **chamfered (< 45°, the "drag" corner)** so it tucks cleanly
  and the erected tray resists collapse.

## Dimension semantics

| Input | Meaning | Drives |
|---|---|---|
| **L** | base length | base length, side-wall length |
| **W** | base width / depth | base width, end-wall width |
| **H** | wall height | all four walls **and** the flap height (H − relief) |

## Parameters & defaults

`defaultParams(L, W, H)`:

| Param | Formula | Notes |
|---|---|---|
| `relief` | `max(thickness, 1mm)` | corner slit + rim clearance so two 90° folds don't bind |
| `flapDepth` | `clamp(H × 0.8, 5mm, L/2 − relief)` | how far each flap wraps along the side wall (capped so the two flaps on one wall don't meet) |
| `chamfer` | `min(flapDepth × 0.4, 6mm)` | "drag" chamfer on the flap's free outer corner |

The flap **height** is `H − relief` by construction (the flap spans the wall
height minus a rim relief).

## Flat-size formula

```
flat_width  = L + 2H      (base + a wall on each side)
flat_height = W + 2H
```

Default tray (L=8, W=6, H=2 in): flat = **12 × 10 in** (+ 0.125 in bleed →
page 12.25 × 10.25 in).

## Layers

| Layer | Contents |
|---|---|
| **cut** | one closed outline (cross + the 4 chamfered corner flaps + corner relief slits) |
| **crease** | 8 lines: 4 base-to-wall + 4 wall-to-flap hinges |
| **bleed** | contour offset (editor preview only; not exported) |
| **glue** | the 4 corner flaps, hatched |

## 3D fold preview

`has3DPreview: true`. The shared `buildFoldable` has a `tray` closure: a base
with four walls that fold up (fold slider: closed = erected tray, open = flat
blank). The corner glue flaps are shown in the flat dieline; the 3D fold
animates the four walls only (the flap wrap onto the side walls is not animated).

## Cutting / machine notes

- Blue = cut, red dashed = crease. The 4 corner relief slits give the folds
  clearance — keep them in the cut file.
- Glue is applied to the 4 corner flaps (hatched), bonded to the inner faces of
  the side walls.
- Exports carry **trim + fold only** (no bleed contour), like every model here.

## v1 limitations / future work

- Glue flaps default to gluing the **inside** of the side walls (clean
  exterior). An "outside" variant is a possible future flag.
- A **tab-lock (no-glue) tray** (friction gussets) is a separate future model —
  same cross layout, locking gussets instead of glue flaps.
- The 3D fold doesn't animate the corner-flap wrap (walls only).

## Changelog

- 2026-06-08 initial parametric build (Phase 2, model #2) + tray 3D fold.
