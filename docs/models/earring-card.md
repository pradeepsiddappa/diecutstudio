# Earring Display Card (craft — Display Cards)

The first **Product Display Cards** item — the handmade-seller line. The small
branded card a jewelry maker pushes earrings through to display and sell them.

## What it is
A flat rounded-rect card with paired holes, in two styles:
- **stud** — pairs of small POST holes in the card body; each stud's post goes
  through a hole and is held by its back on the reverse.
- **dangle** — pairs of HOOK holes near the top; French-hook / fishhook earrings
  hang through them and dangle down the card front.

`pairs` stacks multiple rows to display a set. Optional top **hang hole** so the
card hangs on a peg/display hook.

## Reference example(s)
- Standard jewelry card sizes shipped as presets: 1.5×2, 2×2, 2×3,
  2.5×3.5, 3×3 in. Generic functional card + hole geometry — no traced artwork.
- Branding/text is added by the user in their cutter software (their fonts) —
  we ship the geometry only (catalog §1 IP rule).

## Dimension semantics
**FLAT item.** Editor maps:
- editor **L** → card **width** (x) — param `W`
- editor **W** → card **height** (y) — param `H`
- editor **H** → unused, hidden.
- Inner/outer mode N/A.

Extra inputs: earring **style** (stud/dangle), **pairs** (rows), **hole
diameter**, **hang hole** toggle.

## Flat layout
A rounded rectangle (corner radius `cornerR`). Hole layout:
- Optional hang hole: top-centre, ~6 mm below the top edge.
- Earring rows: `pairs` rows of two holes at `x = W/2 ± pairGap/2`, spaced
  `rowGap` apart. **Stud** rows sit in the upper-centre (branding below);
  **dangle** rows start near the top so earrings hang down the front.

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `W`, `H` | card width / height | 2 × 3 in |
| `style` | `stud` \| `dangle` | `stud` |
| `pairs` | number of pair rows | 1 |
| `holeDia` | post / hook hole ⌀, clamped [0.8mm, W/4] | 1.6 mm |
| `pairGap` | spacing of a pair's two holes | 18 mm |
| `rowGap` | vertical spacing between rows | 14 mm |
| `cornerR` | card corner radius | 4 mm |
| `hangHole` / `hangDia` | top display hole + ⌀ | off / 5 mm |

## Flat-size formulas
- `bboxW = W`, `bboxH = H` (the card size IS the cut size; holes are interior).
- Cut count = 1 outline + 2·`pairs` holes (+1 if `hangHole`).
- 2×3 in default + 1/16 in bleed → 9-up on Letter, 32-up on 13×19.

## Creative extensions (all parametric, IP-safe)
- **Card shape** (`shape`): `rect` · `scallop` (scalloped border, reuses
  `scallopEdge`, exact W×H bbox via per-edge fitted radii) · `arch` (domed top) ·
  `tag-top` (chamfered head). Suppressed when `header` is on.
- **Fold-over header** (`header`): grows the blank by a top panel (`headerH ≈
  0.28·H`) with a fold crease; folds back into a double-thick, sturdier hang
  area. The hang hole is punched in BOTH halves (mirrored across the fold) so it
  self-registers when folded. A header card is rectangular (shape suppressed).
- **Easel stand** (`easel`): a second `Dieline.pieces` piece — a clean
  rounded-rect **kickstand** (a small centred insert **tab** on top, a wide
  stable body, rounded bottom) with a fold score near the top. Its tab inserts
  into a caliper-aware **slot** (`slotCut`) in the card back; below the fold
  kicks out to the table to prop the card. First product to ship the slot+tab
  primitive. (An earlier shouldered-tab trapezoid read like a milk carton —
  redesigned to a clean kickstand.)

NOTE: still a FLAT-previewed item — the header/easel folds show as score lines
in the dieline; a 3D fold is a future enhancement (the per-model
`has3DPreview` flag makes per-*instance* 3D awkward — see the plan).

## Closure / locking
None for the base card — earrings are held by their own posts/hooks + backs.
The easel tab is a friction fit in the slot (slot = tab + caliper clearance).

## Cut vs fold / cutting notes
- **Zero creases** (cut-only file). Holes are closed interior cuts — the cutter
  removes the slug; the editor canvas punches them via the #paperHoles mask.
- Gangs many-up by default (`preferSheetExport: true`).

## Implementation
- File: `src/core/models/earringCard.ts`
- Exported: `buildEarringCard(params)`, `defaultParams(W, H, thickness?)`,
  `EarringStyle`
- Reuses `roundedRect` (features.ts) + `circleCut` (craft.ts). `has3DPreview:
  false` + `flat: true`; `presets` drive the editor size dropdown.

## Changelog
- 2026-06-11 initial entry (Craft build-order item #3).
