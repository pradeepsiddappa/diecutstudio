# 3D Folded Star (craft — Decorations)

A flat star that folds into a dimensional 3D star. Decor batch #2 (built after
the paper lantern; replaced a rolled-rose attempt that didn't read well in 3D).

## What it is
A flat `STAR_POINTS`-point star (5 by default) scored from the **centre to every
vertex**: the lines to the TIPS are MOUNTAIN folds, the lines to the INNER notches
are VALLEY folds. Fold them and the star pops into a dimensional half-star (centre
apex, each point a raised ridge). **Cut TWO**, fold both, and **glue them
back-to-back** via the glue FLAPS on the alternating outer edges → a full closed
3D star ornament. A hang hole in the top point takes the string.

## Reference example(s)
- Small / medium / large (presets 3 / 5 / 8 in tip-to-tip). Pure generated star
  geometry — no traced art (math, not a copyrighted design).

## Dimension semantics
- editor **L** → tip-to-tip **diameter** — `D`
- editor **W / H** → unused, hidden (single-dimension item).

## Flat layout
A 5-point star outline (`2·points` boundary vertices alternating tip radius `R`
and inner radius `STAR_INNER_RATIO·R`, tip 0 pointing up) with a **glue TAB**
spliced onto each tip→inner edge (5 trapezoidal flaps sticking outward, each with
a fold score at its base) + `2·points` radial **score** lines from the centre to
every vertex + a hang hole near the top tip. So crease = `2·points` radial +
`points` tab folds (15 for a 5-point star); glue = the `points` tab quads.
`starVertices(R)` and the constants are exported so the 3D builds the SAME star
(diecut ⇄ render can't desync).

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `D` | tip-to-tip diameter | 5 in |
| `bleed` | bleed margin | 0.0625 in |
| `STAR_POINTS` (const) | number of points | 5 |
| `STAR_INNER_RATIO` (const) | inner / tip radius | 0.40 |

## Flat-size formula
- bbox = the star's actual extent (not a clean rectangle). Cut = outline + hang
  hole = **2 paths**. Crease = `2·points` radial scores. No glue.

## Closure / locking
Cut TWO halves; fold each (tips mountain, inners valley); glue the flaps of one
half to the matching edges of the other → a full closed 3D star.

## 3D preview
`has3DPreview: true` via a **bespoke renderer** (`foldedStarFoldable` in
`src/ui/box3d/foldable.ts`). The facets all meet at the centre — a closed FAN =
a cycle — which the Fold Engine deliberately can't do (it needs a tree), so the
3D is a hand-built fan of `2·points` triangles (centre → each adjacent vertex
pair). **The CENTRE is the apex**: a star vertex with alternating mountain/valley
radial creases can't stay flat (origami non-flat-foldable vertex), so the centre
pops out of plane and the tip lines are raised ridges (mountain) sloping down to
the inner VALLEYS — one continuous 3D surface. (A first cut lifted only the tip
*vertices* with a flat body, which read as "two flat layers pasted" — the fix was
to peak the centre.) The slider puffs it flat (`t = 0`) → dimensional (`t = 1` =
the largest extent, framed); `previewFold 0.7`. It renders **both halves** as a
star BIPYRAMID — the perimeter (the whole star outline) is the shared glue plane
(y = 0) and each half bulges from its own centre apex (front +Y, back −Y), so the
**point edges meet** (the real two-piece construction, not splayed open at the
tips). The star is tipped to face the low Box3D camera
(`rotation.x ≈ 1.05`) so the 5-point shape + ridges read; the gallery snapshot
special-cases the same pose. A diameter guard (min 20 mm) keeps a 0 input from
NaN-ing the geometry. Still `flat: true` (single 2D dim); `preferSheetExport: true`.

## Cut vs fold / cutting notes
- **Cut** = the star outline + the hang hole. **Crease** = the radial scores
  (alternate mountain at the tips / valley at the inner notches). Map blue→Cut,
  red→Score.

## Implementation
- File: `src/core/models/foldedStar.ts`
- Exported: `buildFoldedStar(params)`, `defaultParams(D, thickness?)`,
  `starVertices(R)`, `STAR_POINTS`, `STAR_INNER_RATIO` (shared with the 3D).
- `flat: true`, `has3DPreview: true`, `category: "decor"`, presets.

## Future
- Expose the point count (6-point, etc.) and the inner ratio (spikier/rounder);
  a true two-layer star (front + back glued) for a fuller ornament.

## Changelog
- 2026-06-15 initial entry (Decor batch #2). Bespoke radial folded-star 3D.
- 2026-06-15 fixed the 3D fold: the centre is the APEX (the points slope down from
  a central peak to the valleys) — the first cut lifted only the tips on a flat
  body, which the owner flagged as reading like "two layers pasted."
- 2026-06-15 added GLUE FLAPS (owner shared a reference): a real 3D star is TWO
  folded halves glued back-to-back, so each half needs flaps to join. Spliced a
  glue tab onto each tip→inner edge (+ fold scores), and the 3D now renders both
  halves into a full closed star. A diameter guard prevents a 0 input from NaN-ing
  the 3D.
- 2026-06-15 owner follow-ups: (a) the two halves now meet along their WHOLE
  perimeter (a star bipyramid: perimeter on the shared y=0 plane, each half
  apex'd) so the point edges touch — they were splayed open at the tips before;
  (b) glue zones in the EDITOR now render with a diagonal **hatch** (a new
  `glueHatch` pattern) instead of a bare grey outline, so the flaps clearly read
  as glue tabs (applies to every model's glue zones, not just the star).
