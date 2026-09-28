# Straight Tuck End carton (STE)

The classic **tuck box** — a folding carton closed at top and bottom by a tuck
flap. Both tuck flaps fold from the **same** panel (that's what makes it
"straight"; in a *reverse* tuck they fold from opposite panels). This is the
first model built and the canonical reference for adding others.

## What it is
A single-piece glued carton for slim stacked contents. Typical use: **playing /
flash card decks, game cards, slim product boxes.** The user's two references:
- **Reference card box** — 120 × 60 × 160 mm = 4.7244 × 2.3622 × 6.2992 in
- **3 × 5 card-stack box** — 3 × 5 in face, 0.6 in thick → entered as
  L = 3, W = 0.6, H = 5

## Dimension semantics
Inputs are the **manufacture (flat) dimensions** of the box body. For a folded
box standing upright:

| Input | Meaning | Maps to |
|-------|---------|---------|
| **L** | Length — width of the front/back panel | the wide face (e.g. the 3" of a 3×5 card) |
| **W** | Width / depth — width of a side panel (the box thickness) | the gap between front & back (e.g. 0.6") |
| **H** | Height — how tall the box stands | the long face (e.g. the 5" of a 3×5 card) |

So the **front panel measures L × H** (= the card face) and the box is W deep.
A 3 × 5 card → L = 3, H = 5, W = card-stack thickness.

> ⚠️ Inner/outer/manufacture modes and thickness compensation are **not yet
> implemented** — inputs are treated as the manufacture (artwork) dimensions.

## Flat layout
Panels run left→right, each H tall, folded around the vertical creases:

```
[glue] [ Back: L ] [ Side: W ] [ Front: L ] [ Side: W ]
         (tuck)      (dust)      (notch)      (dust)
```

Each END (top and bottom) is closed by **3 pieces**:
- **Tuck panel + tongue** — folds from the **Back** panel; panel depth = W
  (covers the opening), then a chamfered **tongue** tucks inside.
- **Two dust flaps** — fold from the **Side** panels; chamfered outer corners so
  they fold in first, under the tuck panel.
- **Thumb notch** — a half-circle cut in the **Front** panel's top & bottom edge
  (the finger opening). The Front panel itself has no closing flap.

The **glue flap** (hatched) is the leftmost strip; the right side panel's edge
glues onto it to form the tube.

## Parameters & defaults
All in points internally; defaults derived so typing only L/W/H gives a valid
die (`defaultParams` in code). All overridable.

| Param | Meaning | Default |
|-------|---------|---------|
| `thickness` | material caliper (tolerance allowance) | 0.018 in |
| `bleed` | bleed margin around the sheet | 0.125 in |
| `glue` | glue-flap width | `min(0.5 in, W·0.9)` |
| `tongue` | tuck-in tongue depth | `max( min(W·0.55, 0.7 in), rN + 0.15 in )` — never shorter than the notch, so it backs the full semicircle |
| `dust` | dust-flap reach | `min(W·0.85, L·0.45)` |
| `dc` | dust-flap corner chamfer | `min(dust·0.5, W·0.25)` |
| `tc` | tongue corner chamfer | `min(tongue·0.7, L·0.25)` |
| `gt` | glue-flap taper | `min(H·0.1, 0.2 in)` |
| `rN` | thumb-notch radius | `min(0.4 in, L·0.18)` |

## Flat-size formulas
```
tuckH      = W
topRegion  = W + tongue          (tallest flap extent at each end)
bboxW      = glue + 2·L + 2·W    (cut-outline width)
bboxH      = 2·(W + tongue) + H  (cut-outline height)
flat size incl. bleed = (bboxW + 2·bleed) × (bboxH + 2·bleed)
```

**Worked example — 3 × 0.6 × 5 in card box** (defaults):
- glue = min(0.5, 0.54) = 0.5
- rN = min(0.4, 0.54) = 0.4; tongue = max(min(0.33, 0.7), 0.4 + 0.15) = **0.55**
- bboxW = 0.5 + 6 + 1.2 = **7.70 in**
- bboxH = 2·(0.6 + 0.55) + 5 = **7.30 in**
- **incl. 0.125 bleed → 7.95 × 7.55 in** ← Select-All size to expect on import

**Worked example — reference (4.7244 × 2.3622 × 6.2992 in)**:
- bboxW = 14.6732, bboxH = 12.4236 → **incl. bleed 14.9232 × 12.6736 in** ✔ verified

## Closure / locking
Friction tuck (no lock tabs in this version). The tongue tucks behind the
opposite panel; dust flaps fold in first. Glue flap bonds the tube seam.

## Cut vs fold / cutting notes
- Cut = blue, crease/fold = red, on separate layers — map in the cutter
  (Silhouette: *Cut by Line Color* or *Cut by Layer*).
- **The export is the flat sheet (~7.95 × 7.11 for the 3×5 box), not 3×5.**
- **Designer Edition → use SVG** (true `in` units, 72-DPI viewBox = 1:1 import).
  **Free edition → DXF** (mm); R12 carries no robust unit, so verify size after
  import and rescale to the exact dimensions if needed.

## Implementation
- File: `src/core/models/tuckEnd.ts`
- Exports: `buildTuckEnd(params)` → `Dieline`, `defaultParams(L, W, H, thickness?)`
- Cut outline is one closed polyline (walked clockwise); thumb notch is an arc
  flattened via `arcPoints`. Crease, glue-hatch, bleed are separate polyline
  sets. Preview also carries L/W/H **dimension arrows** (`dims`).

## Changelog
- 2026-06-06 Initial model + doc. STE tuck box; PDF/SVG/DXF export; dim arrows.
- 2026-06-06 Tongue depth now ≥ notch radius + 0.15 in clearance, so the tuck-in
  flap fully backs the thumb-notch semicircle (was closing it only partially on
  shallow boxes like 3×0.6×5).
