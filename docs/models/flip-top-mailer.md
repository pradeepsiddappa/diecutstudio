# Flip-Top Mailer

One-piece subscription / book / gift mailer with a hinged lid. The lid hinges
off the back wall and folds OVER the top of the box to close. A closure
tongue at the front of the lid tucks down into the front wall.

**Code:** `src/core/models/flipTopMailer.ts`
**Status:** ✅ built — fully parametric `(L, W, H, thickness) → Dieline`
**Standards reference:** Not a strict ECMA-coded folding carton; closer to
FEFCO ~04xx one-piece dispatch mailers. Geometry built from first principles
(bottom panel + 4 walls + hinged lid + closure tongue).

## What it looks like assembled

A rectangular box with a hinged top. The lid swings up to reveal the contents.

```
         ╱╲   ← Lid open
        ╱  ╲
       ╱    ╲
      ┌──────┐
      │ BOX  │
      │BODY  │
      └──────┘
```

Common for: subscription boxes (Birchbox, Loot Crate), book mailers,
tablet/laptop shippers, gift presentations.

## Flat layout

A cross-shaped sheet — central column has lid + back wall + bottom panel +
front wall, with side wall extensions left and right of the bottom panel.

```
                   y
                   ↓
       ┌──────────────────────┐
       │  TONGUE (top of lid) │   lidTongueH tall
       ├──────────────────────┤
       │                      │
       │      LID             │   W tall
       │      (L × W)         │
       │                      │
       ├──────────────────────┤
       │     BACK WALL        │   H tall
       │     (L × H)          │
   ┌───┼──────────────────────┼───┐
   │ L │    BOTTOM PANEL      │ R │   W tall (side walls H wide each)
   │SW │    (L × W)           │SW │
   │H×W│                      │H×W│
   └───┼──────────────────────┼───┘
       │     FRONT WALL       │   H tall
       │     (L × H)          │
       └──────────────────────┘
   ←H──┤  ←─────  L  ─────→  ├─H─→
```

## Parameters

```ts
interface FlipTopMailerParams {
  L: number;            // long horizontal panel dim (pt)
  W: number;            // short panel dim / box depth (pt)
  H: number;            // wall height / side wall width (pt)
  thickness: number;    // material caliper (pt)
  bleed: number;        // bleed margin (pt)
  lidTongueH: number;   // closure tongue depth (pt)
  lidCornerR: number;   // rounded lid outer corner radius (pt)
  tongueR: number;      // rounded tongue top corner radius (pt)
  wallCornerR: number;  // side-wall outer corner chamfer (pt)
}
```

## Default formulas

When the editor calls `defaultParams(L, W, H)`:

| Param | Formula | Rationale |
|---|---|---|
| `lidTongueH` | `H × 0.5` | Long enough to lock when closed |
| `lidCornerR` | `min(W × 0.1, 8mm)` | Subtle rounded outer corners on front of lid |
| `tongueR` | `min(H × 0.2, 6mm)` | Subtle rounded corners on the tongue top |
| `wallCornerR` | `min(H × 0.15, 4mm)` | Small chamfer where side walls meet at corners |

All values in points (1 in = 72 pt).

## Geometry construction

The cut outline is built as **one closed polyline** walked clockwise from
the tongue top-left. All rounded corners are real **quadratic Bézier curves**
(via `Polyline.curves`) — 8 total — so they render perfectly at any zoom.

Layout coordinates (x):
- `x0 = 0` — outer left (side wall outer edge)
- `x1 = H` — body left edge (= where left side wall folds)
- `x2 = x1 + L` — body right edge
- `x3 = x2 + H` — outer right edge

Layout coordinates (y):
- `y0 = 0` — top of tongue
- `y1 = lidTongueH` — top of lid (= bottom of tongue)
- `y2 = y1 + W` — bottom of lid (= top of back wall)
- `y3 = y2 + H` — bottom of back wall (= top of bottom panel)
- `y4 = y3 + W` — bottom of bottom panel (= top of front wall)
- `y5 = y4 + H` — bottom of front wall (with rounded outer corners)

## Flat-size formula

```
flat_width  = L + 2H
flat_height = 2W + 2H + lidTongueH
```

For the default Flip-Top (L=12.40, W=7.95, H=2.44 in):
- `lidTongueH = 2.44 × 0.5 = 1.22 in`
- `flat_width  = 12.40 + 4.88 = 17.28 in`
- `flat_height = 15.90 + 4.88 + 1.22 = 22.00 in`

(Plus 0.125 in bleed → 17.53 × 22.25 in printed sheet.)

## Crease structure

6 fold lines total — 4 horizontal + 2 vertical:

| Position | Span | Purpose |
|---|---|---|
| Horizontal at `y1` | x1 → x2 | Tongue/lid fold (tongue tucks down) |
| Horizontal at `y2` | x1 → x2 | Lid/back-wall fold |
| Horizontal at `y3` | x1 → x2 | Back-wall/bottom-panel fold |
| Horizontal at `y4` | x1 → x2 | Bottom-panel/front-wall fold |
| Vertical at `x1` | y3 → y4 | Left side-wall fold (only in bottom-panel y-range) |
| Vertical at `x2` | y3 → y4 | Right side-wall fold |

## Cutting machine notes

- **Cut lines** (blue): one closed perimeter — the cross shape
- **Crease lines** (red dashed): 6 segments
- **Bleed bbox** (green): rectangular margin
- **No glue layer** — friction-fit closure

Standard layer/color mapping for Silhouette / Cricut applies.

## Use cases

- **Subscription boxes:** monthly curation services, lifestyle/beauty brands
- **Book/tablet mailers:** thin form factor for flat goods (use H ≈ 1–2 in)
- **Gift sets:** premium feel without needing a separate lid
- **DTC product mailers:** unboxing experiences with branded interior printing

## v1 limitations / future work

This Phase 1 implementation is a clean, simple flip-top without specialty
features. Future enhancements (Phase 2+):

- **Lock tabs** on side walls that hook into slots in the back/front walls
  (FEFCO 0427-style mechanism — adds structural integrity)
- **Tongue slot** in the front wall for positive closure
- **Curved insets** on the lid base (decorative + functional)
- **Bleed as true contour offset** rather than bbox

These additions are straightforward parametric extensions when needed.

## Comparison to the previous SVG-import version

The previous flipTopMailer.ts (an earlier version) parsed a verbatim imported
SVG path string. That version:
- Only scaled uniformly with L (W and H were decorative)
- Had decorative curved insets and lock tabs from the source
- Cost ~1200 chars of embedded SVG path data

The new parametric version:
- Reshapes properly with all three of L, W, H
- Has clean rounded outer corners (8 Q-bezier corners)
- Is ~150 lines of formula-driven geometry
- Easy to extend with lock tabs, slots, windows, etc.

The simpler geometry means the new version looks LESS ornate than the
imported version, but is structurally correct and infinitely scalable.
