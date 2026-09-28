# Reverse Tuck End (RTE) — ECMA A55

The most common cosmetic, pharma, and confectionery folding carton form.
Distinguished from the Straight Tuck End (STE / ECMA A50) by having its tuck
flaps fold off **opposite** corners — top off the BACK panel, bottom off the
FRONT panel — instead of both off the same panel.

**Code:** `src/core/models/reverseTuckEnd.ts`
**Status:** ✅ built — fully parametric `(L, W, H, thickness) → Dieline`
**ECMA reference:** A55
**Implemented from:** packaging engineering formulas (no SVG import)

## What it looks like assembled

A rectangular box with a tuck-flap closure at each end. The two tucks fold
INWARD in opposite directions:

```
       ┌──────────┐    ← Top: back panel's tuck flap folds DOWN
       │          │       into the front of the box
       │  BOX     │
       │  BODY    │
       │          │
       └──────────┘    ← Bottom: front panel's tuck flap folds UP
                          into the back of the box
```

## Flat layout

```
←────────────── flat width ──────────────→
    [back tuck flap (top)]                              [side2 dust]
┌──┬──────────────────┬──┬──────────────┬──────────────┐
│  │       ↑          │  │              │              │
│gl│       │          │ s│  Front       │  Side 2      │
│ue│  Back panel      │ i│  panel       │              │
│  │       │          │ d│  (L)         │  (W)         │
│fl│   (L wide        │ e│              │              │
│ap│   × H tall)      │ 1│              │              │
│  │       │          │  │              │              │
│  │       ↓          │  │              │              │
└──┴──────────────────┴──┴──────────────┴──────────────┘
                            [front tuck flap (bottom)]    [side2 dust]
```

Where:
- **Glue flap** (left): glued behind side 2 when assembled
- **Back panel** (L wide): has the TOP tuck panel + a rounded tuck-in tongue
- **Side 1** (W wide): has dust flaps top + bottom (chamfered corners)
- **Front panel** (L wide): has BOTTOM tuck flap (mirror of back top); TOP edge is open
- **Side 2** (W wide): has dust flaps top + bottom

## Parameters

```ts
interface ReverseTuckEndParams {
  L: number;            // back/front panel width (pt)
  W: number;            // side panel width / box depth (pt)
  H: number;            // body height (pt)
  thickness: number;    // material caliper (pt)
  bleed: number;        // bleed margin (pt)
  glueFlap: number;     // glue flap width (pt)
  tuckH: number;        // tuck PANEL depth (pt) — = box depth W
  tuckIn: number;       // tuck-in TONGUE depth (pt) — folds in at the panel crease
  dustH: number;        // dust flap height (pt)
  shoulderCut: number;  // base chamfer of tuck flap (pt)
  tuckCornerR: number;  // rounded top corner radius (pt)
  dustCornerR: number;  // dust flap outer corner chamfer (pt)
  glueTaper: number;    // glue flap top/bottom taper (pt)
}
```

## Default formulas

When the editor calls `defaultParams(L, W, H)`, derived sizes come from these
formulas (from packaging engineering references — Calver's _Packaging Design_,
_Paperboard Packaging Handbook_):

| Param | Formula | Rationale |
|---|---|---|
| `glueFlap` | `clamp(W × 0.8, 8mm, 20mm)` | Wide enough for a good glue bond, capped so it doesn't dominate small boxes |
| `tuckH` | `W` | Tuck PANEL depth = box depth, so the lid spans the top exactly |
| `tuckIn` | `clamp(W × 0.5, 8mm, H × 0.5)` | Tuck-in TONGUE depth — folds at the panel crease and tucks down inside the front wall (the positive closure) |
| `dustH` | `W − 2mm` | Slightly shorter than the panel so it tucks first when closing |
| `shoulderCut` | `min(W × 0.3, 8mm)` | Base chamfer that clears the dust flap when folding |
| `tuckCornerR` | `min(W × 0.4, 12mm)` | Rounded top — friendly look, easier to push tab in |
| `dustCornerR` | `min(W × 0.25, 4mm)` | Outer corner chamfer (clean fold) |
| `glueTaper` | `min(H × 0.08, 4mm)` | Slight glue-flap taper for finger access |

All values in points (1 in = 72 pt). The clamps prevent any one feature from
dominating at very small or very large box sizes.

## Geometry construction

The cut outline is built as **one closed polyline** walked clockwise from the
glue flap top-left. Each end flap is a **tuck panel** (depth `tuckH = W`, full
width) followed by a **tuck-in tongue** (depth `tuckIn`) joined at a crease;
the tongue narrows via shoulder chamfers (`shoulderCut`) and has real
**quadratic Bézier** rounded leading corners (clamped to fit shallow tongues),
so it renders perfectly at any zoom. When assembled the panel becomes the top
and the tongue folds again to tuck down inside the front/back wall.

Layout coordinates (x):
- `x_g0 = 0` — glue flap left edge
- `x_b0 = glueFlap` — glue/back boundary
- `x_b1 = x_b0 + L` — back/side1 boundary
- `x_s1 = x_b1 + W` — side1/front boundary
- `x_f1 = x_s1 + L` — front/side2 boundary
- `x_s2 = x_f1 + W` — outer right edge

Layout coordinates (y):
- `TB = tuckH + tuckIn` — body top (panel + tongue fill 0..TB)
- `BB = TB + H` — body bottom
- `panelTop = TB − tuckH` (= `tuckIn`), `tongueTop = 0` — panel↔tongue crease + outer top edge
- `panelBot = BB + tuckH`, `tongueBot = BB + tuckH + tuckIn` — panel↔tongue crease + outer bottom edge
- `dustTop = TB − dustH`, `dustBot = BB + dustH` — outer top/bottom of dust flaps

## Crease structure

| Position | Span | Why |
|---|---|---|
| Vertical at `x_b0` | `TB → BB` | Back/glue fold |
| Vertical at `x_b1` | `TB → BB` | Back/side1 fold |
| Vertical at `x_s1` | `TB → BB` | Side1/front fold |
| Vertical at `x_f1` | `TB → BB` | Front/side2 fold |
| Horizontal at `TB` over back | hinge | Back tuck PANEL folds here |
| Horizontal at `panelTop` over back | tongue fold | Back TONGUE tucks in here |
| Horizontal at `TB` over side1 | hinge | Side1 dust folds here |
| Horizontal at `TB` over side2 | hinge | Side2 dust folds here |
| **(no crease)** at `TB` over front | — | **Front top is open** |
| Horizontal at `BB` over side1 | hinge | Side1 dust folds here |
| Horizontal at `BB` over front | hinge | Front tuck PANEL folds here |
| Horizontal at `panelBot` over front | tongue fold | Front TONGUE tucks in here |
| Horizontal at `BB` over side2 | hinge | Side2 dust folds here |
| **(no crease)** at `BB` over back | — | **Back bottom is open** |

The missing creases (front top, back bottom) are the **defining feature** of
RTE — those are the OPEN edges of the assembled box.

## Flat-size formula

```
flat_width  = glueFlap + 2L + 2W
flat_height = 2 × (tuckH + tuckIn) + H      // each end = tuck panel + tuck-in tongue
```

For the default RTE (L=4.43, W=0.98, H=7.29 in):
- `glueFlap = 0.98 × 0.8 = 0.78 in` (~20mm)
- `tuckH = W = 0.98 in` (panel), `tuckIn = W × 0.5 = 0.49 in` (tongue)
- `flat_width = 0.78 + 8.86 + 1.96 = 11.60 in`
- `flat_height = 2 × (0.98 + 0.49) + 7.29 = 10.23 in`

(Plus 0.125 in bleed all around → 11.85 × 10.48 in printed sheet.)

## Cutting machine notes

- **Cut lines** (blue): outer perimeter — one closed polyline
- **Crease lines** (red dashed): 12 segments (4 vertical + 8 horizontal: panel hinges, tongue folds, dust hinges — none where the box is open)
- **Bleed bbox** (green): rectangular margin around everything
- **Glue area** (grey hatch): on the glue flap

For **Silhouette Studio** (Designer Edition or Business Edition):
- Use *Cut by Line Color* (blue → Cut, red → Score) OR *Cut by Layer*
- Free edition: turn off the Crease layer to export cut-only, or manually set
  fold lines to Score

For **Cricut**:
- Set blue paths to Cut, red paths to Score

For exports the format-specific notes apply (SVG @ 72dpi viewBox, DXF in mm
with per-entity color, PDF in points).

## Use cases

The RTE is the workhorse of:
- **Cosmetics**: mascara, lipstick, eyeliner, lip balm, serum tubes
- **Pharma**: tablet bottles, OTC medications, samples
- **Confectionery**: chocolate bars, praline boxes, energy bars
- **Small retail**: gift cards, batteries, USB drives, single-use items

The tall-slim variant (defaults: 4.43 × 0.98 × 7.29 in) suits cosmetics and
slim chocolate. For wider cards, try 3 × 0.6 × 5 in. For square-ish boxes
(rare for RTE), the geometry still works but a tray + lid might be more
appropriate.

## Differences from STE (ECMA A50)

| Feature | STE (A50) | RTE (A55) |
|---|---|---|
| Tuck flap positions | Both on BACK panel | TOP on back, BOTTOM on front |
| Thumb notch | Yes, on FRONT panel | None (front top is open edge) |
| Manufacturing | Easier (single tooling side) | Slightly more complex |
| Material usage | More efficient sometimes | Often slightly higher |
| Visual symmetry | Asymmetric folded | Symmetric folded |

For most products the choice is aesthetic; both styles function equivalently.

## v1 limitations / future work

- **Bleed is a bbox** offset, not a true contour offset
- **Window cut**, **Euro hanger slot**, and **thumb cut** (A57) are all
  available as editor feature overlays — see `docs/features.md`
- The shoulder chamfer, tuck corner radius, and tuck-in depth (`tuckIn`) are
  exposed as params but not surfaced in the editor UI yet — easy to add when
  needed (e.g. a "tuck depth" slider)
