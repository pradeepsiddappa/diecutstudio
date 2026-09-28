# Roll-End Tuck Top Mailer (RETT)

A one-piece tray with a hinged lid that tucks shut — the classic
e-commerce shipper. Often called a **One-Piece Mailer**, **Self-Lock Mailer**,
or **Roll-End Tuck Top (RETT)**.

## What it is
A single flat sheet folds into a shallow rectangular tray; a lid hinged to the
back wall folds over the top, and a chamfered tongue tucks into the front to
hold it shut. No glue, no tape — friction-fit and shipped flat.

## Reference example(s)
- Amazon-style brown shipper (12–14 in long, shallow)
- Branded subscription mailers (Birchbox, Glossier, etc.)
- Apparel mailers, gift kits, brand sample boxes

## Dimension semantics
| Input | Meaning | Maps to |
|-------|---------|---------|
| **L** | Length — the long box dimension | the wide top/bottom face |
| **W** | Width — the short box dimension (depth) | the short top/bottom face |
| **H** | Height — wall height | the depth from bottom to lid |

The folded box is **L × W footprint × H tall**. RETT is normally wider/shallower
than a tuck-end carton (think pizza box, book mailer, tablet shipper).

## Flat layout
Cross-shaped, all walls hinged off the bottom panel:

```
              +---------+
              | TONGUE  |  (chamfered trapezoid, tucks into front wall)
              +---------+
              |   LID   |  L × W
              +---------+
              | BACK    |  L × H
   +---+------+---------+------+---+
   |dust|     |         |     |dust|
   +---+      |         |      +---+
   |LEFT WALL | BOTTOM  | RIGHT WALL|   walls: W × H each;  bottom: L × W
   |  W×H     |  L × W  |   W×H     |
   +---+      |         |      +---+
   |dust|     |         |     |dust|
   +---+------+---------+------+---+
              | FRONT   |  L × H
              +---------+
```

The four dust flaps (corner pieces) fold inward when the side walls fold up,
sitting behind the back and front walls to close the corners.

## Parameters & defaults
All in points internally. Defaults derived from L/W/H so typing 3 numbers gives
a valid die.

| Param | Meaning | Default |
|-------|---------|---------|
| `tongue` | tongue height above the lid | `min(W·0.7, 1.2 in)` |
| `tongueOut` | lateral overhang past the lid per side — forms the rounded "ear" lock-tabs | `min(W·0.22, H·0.5, 0.7 in)` |
| `tongueR` | rounded ear-corner radius | `min(W·0.4, 0.6 in)` |
| `dustH` | dust flap depth | `min(H·0.8, W·0.6)` |
| `dustChamfer` | outer corner chamfer on each dust flap | `min(H·0.32, W·0.18)` |

`thickness` and `bleed` default to the same values as the tuck-end model
(0.018 in and 0.125 in).

## Flat-size formulas
```
bboxW = L + 2H            (side walls extend by H — wall HEIGHT in 3D —
                           not by W)
bboxH = tongue + 2W + 2H  (tongue + lid:W + back:H + bottom:W + front:H)
flat size incl. bleed = (bboxW + 2·bleed) × (bboxH + 2·bleed)
```

**Worked example — 12 × 8 × 2.5 in shallow mailer** (defaults):
- tongue = min(5.6, 1.2) = 1.2
- bboxW = 12 + 5 = **17 in**
- bboxH = 1.2 + 16 + 5 = **22.2 in**
- incl. 0.125 bleed → **17.25 × 22.45 in** ← Select-All size on import

## Closure / locking
Friction-fit one-piece. The tongue chamfer slips under the front wall edge to
hold the lid shut. No glue tab needed (vs. the tuck-end carton). Optional
future enhancement: locking tabs on the lid's left/right edges + matching slot
cuts in the side walls for a tap-to-lock close.

## Cut vs fold / cutting notes
Same export rules as the tuck-end model — cut/crease/bleed on separate layers,
Silhouette maps via *Cut by Line Color* or *Cut by Layer*.

The flat sheet is **much wider than the folded box** (L+2W wide, ~2H+2W+tongue
tall). For the 12×8×2.5 example above, it folds down to ~12×8×2.5 from a
28×22.2 flat — almost 5× the folded area. Plan sheet size accordingly.

## Implementation
- File: `src/core/models/rollEndMailer.ts`
- Exports: `buildRollEndMailer(params) → Dieline`, `defaultParams(L, W, H, thickness?)`, `rollEndMailerDetails(p)`
- Cut outline is one closed polyline walked clockwise around the cross shape
  with chamfered dust flap corners. Crease layer has 2 vertical hinges (left
  and right of the bottom, spanning back wall + bottom + front wall) and 4
  horizontal hinges (lid↔back, back↔bottom, bottom↔front, lid↔tongue).
- The glue layer is empty (one-piece construction).

## Changelog
- 2026-06-07 Initial model + doc. One-piece tray + hinged lid + tongue + 4
  corner dust flaps; no side lock tabs (v2 enhancement).
