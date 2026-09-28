# Hexagon Box (elongated hexagonal prism)

A **decorative six-sided gift box** — candles, jewellery, soap, premium gifts.
The footprint is a convex hexagon that is **L** long (long axis) and **W** wide
(short axis): a `W × m` central band capped by two beveled points on the L-ends.

**Code:** `src/core/models/hexBox.ts`
**Status:** ✅ built — fully parametric `(L, W, H, thickness) → Dieline`
**Reference:** regular-polygon geometry (no ECMA/FEFCO code needed — a hex prism
is pure math). No proprietary file; nothing to infringe.

## Footprint

```
        (-m/2,+W/2) ___________ (+m/2,+W/2)
                   /           \
      (-L/2, 0)  <      +      >  (L/2, 0)      e = (L−m)/2  (bevel reach)
                   \___________/
        (-m/2,-W/2)             (+m/2,-W/2)
```

- 6 walls: **2 long edges** (length `m = L − 2e`) + **4 slant edges** (length
  `s = √(e² + (W/2)²)`).
- Bevel reach `e = min(W/2, 0.4·L)`. When `e = W/2` the bevels are 45°; with the
  right L:W ratio it's a **regular hexagon**.

## Top & bottom closure — infold triangles

Each wall carries one **triangular flap**: base = that wall's width, apex
reaching just **past the polygon centre** (by `overlap`). Edge-to-centre
triangles tile *any* convex polygon exactly, and the small **past-centre
overlap is the bonding surface** — the flaps **glue to each other** to hold each
end shut (they're marked as glue area, hatched). This makes it a **glue-assembled
hexagonal box**: flaps that merely met at the centre would have no holding
mechanism. Flap heights are the per-edge **apothems** (+ overlap):

| Edge | Apothem (flap height, + overlap) |
|---|---|
| long (top/bottom) | `W/2` |
| slant (×4) | `W·(m/2 + e) / (2s)` |

`overlap = min(0.18·minApothem, 6 mm)`.

> **Openable variant (future):** a single-piece full lid doesn't work on a
> hexagon (the lid panel is wider than the wall it hinges from and would collide
> with neighbours in the flat). The realistic openable hexagon is **two-piece**
> — a hex tray + a hex lid that telescopes over it (like the Tray + Lid model).

## Dimension semantics

| Input | Meaning | Drives |
|---|---|---|
| **L** | overall length (long axis) | central band `m`, bevel, slant length |
| **W** | overall width (short axis) | band height, long-edge apothem, bevel |
| **H** | height | body height only |

(Only **H** gets an on-canvas arrow — L and W are footprint diagonals, not single
panel widths. The header/footer show all three.)

## Flat-size formula

```
flat width  = glue + 2m + 4s
flat height = 2·max(apoLong, apoSlant) + H
```

## Layers

| Layer | Contents |
|---|---|
| **cut** | one closed outline (6 walls + zig-zag triangular flaps top & bottom) |
| **crease** | 18: 6 vertical (glue + 5 inter-wall) + 6 top flap + 6 bottom flap |
| **bleed** | contour offset (editor preview only; not exported) |
| **glue** | the manufacturer's joint, hatched |

## 3D fold preview

`has3DPreview: true`. The `hex` closure in `buildFoldable` walks the 6 hexagon
edges: each becomes a wall (a plane rotated to the edge's outward normal) plus a
triangular infold flap hinged at its top edge; the bottom is a closed hexagon
floor. The fold slider stands the top flaps up (open) or folds them flat to a lid
(closed). The gallery snapshot renders it nearly closed (per-model
`SNAPSHOT_FOLD`) so the prism reads.

## Cutting / machine notes

- Blue = cut (outline), red dashed = crease (walls + flap folds).
- Relief slits between flaps (`≥ max(thickness, 1.5 mm)`) let them fold cleanly.
- Exports carry **trim + fold only** (no bleed contour), like every model here.

## v1 limitations / future work

- The infold-triangle apex sits above each wall's midpoint; for the slanted
  edges that's a hair off the perpendicular foot, so the 3D flaps tile with a
  tiny visual gap (negligible). The flat dieline is exact.
- No tuck-lock; the closure is glue-bottom / tuck-top. A snap-lock or a separate
  hex lid (two-piece) is a future variant.
- A true **regular** hexagon (single size) could be a preset (`L = 2·a`,
  `W = a√3`).

## Changelog

- 2026-06-09 initial parametric build (elongated hexagon + edge-to-centre infold
  flaps) + hex-prism 3D fold. Pure regular-polygon geometry.
