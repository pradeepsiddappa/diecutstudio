# Paper Rosette / Fan Medallion (craft — Party & Events)

The accordion-pleated paper fan that opens into a full-circle medallion — party
backdrops, cupcake-stand toppers, gift toppers. First item in the **party batch**.

## What it is
Accordion-fold a long strip, collapse it, glue the ends, and fan it into a
circle; a decorative **disc** glued at the centre hides where the pleats
converge. Big rosettes use **two half-circle strips** (sturdier + they fit a
sheet), so the model emits two pleated strips + one centre disc.

## Reference example(s)
- Standard party rosette ⌀ 4 / 8 / 12 in (presets Small / Medium / Large).
  Generic functional fan geometry — no traced art.

## Dimension semantics
- editor **L** → finished **diameter** D — param `D`
- editor **W** → target **pleat width** — param `pleat`
- editor **H** → unused, hidden.

## Flat layout
Two horizontal rectangular **strips**, stacked, each scored into a whole number
of pleats by evenly-spaced **vertical fold lines** (alternate mountain/valley by
hand). A **centre disc** sits below.

## Geometry / formulas
- Fanned to a full circle of diameter `D`, the strip's OUTER edge is the rim, so
  the **total developed strip length = the rim circumference = π·D**. Two strips
  ⇒ each is `π·D/2` long.
- Strip **height** = radial pleat depth = `(D − d)/2`, where `d` = centre-disc
  diameter (`≈ 0.36·D`, clamped). The pleats bunch to a small inner hole the disc
  covers.
- Pleats per strip `n = round((π·D/2) / pleat)` (≥ 4); actual pleat width
  `= (π·D/2) / n`. Scores at `i·step` for `i = 1 … n−1`.

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `D` | finished rosette diameter | 8 in |
| `pleat` | target pleat width | 0.5 in |
| `bleed` | bleed margin | 0.0625 in |

## Closure / locking
No glue layer in the file — the maker glues the strip ends together and the
centre disc on by hand. Pleats are SCORES (fold lines), not cuts.

## 3D preview
`has3DPreview: true` via a **bespoke renderer** (`paperRosetteFoldable` in
`src/ui/box3d/foldable.ts`) — the rosette FANS into a circle, which the Fold
Engine (flat panels at creases) can't make, so like the cupcake/pillow it gets a
hand-built mesh: a pleated annulus of `M = round(π·D / pleat)` radial creases
whose z alternates ±amp (peaks & valleys), with the facets between them as the
accordion pleats, plus a centre disc. The fold slider FANS it: `t = 1` = fanned
OPEN (the finished full-circle medallion, `previewFold` default), `t = 0` = a
folded hand-fan wedge (angular span shrinks). **`t = 1` is the LARGEST extent on
purpose** — Box3D frames its no-crop bounding sphere at fold = 1, so the open
medallion must be the widest pose or it crops. Built in XY facing the camera (the
medallion is ~41° off the camera normal, so the full circle reads); a gentle
tilt/turn shows the pleat depth. Still `flat: true` (2D export naming).
`preferSheetExport: true`. **No dimension arrows** — the editor labels dims from
the L/W *inputs* (diameter / pleat width), which aren't the flat strip's
length/height, so they'd mislead; the top-bar flat-size readout is accurate.

## Cut vs fold / cutting notes
- **Cut** = 2 strip outlines + 1 disc outline. **Crease** = all the pleat scores.
  Map blue→Cut, red→Score; the maker alternates the score directions (M/V) to
  accordion-fold.

## Implementation
- File: `src/core/models/paperRosette.ts`
- Exported: `buildPaperRosette(params)`, `defaultParams(D, pleat?, thickness?)`
- `flat: true`, `has3DPreview: false`, `category: "party"`, presets, `pieces`.

## Future
- Expose strip count (1 for mini, 2+ for large); a centre-disc-style choice
  (plain / scalloped, reusing `scallopEdge`); a bespoke fanned 3D preview.

## Changelog
- 2026-06-14 initial entry (party batch #1).
- 2026-06-14 added a **bespoke 3D preview** (`paperRosetteFoldable`): the
  accordion fans into a full-circle pleated medallion; the fold slider folds it
  back into a hand-fan. `has3DPreview: true`; gallery snapshot turns the flat
  medallion only slightly (it self-orients to the camera).
- 2026-06-14 fix: the full-circle "open" pose is `t = 1` (was `t = 0`), so it
  matches the Box3D framing (sphere computed at fold = 1) — the medallion was
  cropping on the left because the frame fit the SMALL folded fan. "Open" on the
  slider now correctly means the fanned circle.
