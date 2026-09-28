# Napkin Ring (craft — Tags & Wraps)

A belly-band style wrap strip sized to a folded napkin's girth, with an overlap
to close. Mirrors the belly-band construction exactly (same caliper-aware
slot+tab contract) but is positioned in the table-setting use case with
decorative scalloped edges.

## What it is

A single flat strip; wrap around a folded napkin and close the overlap. Two
closure options: glue the overlap or tuck-lock (tab inserts into a slot — no
glue). Three edge options: straight, scalloped top only, or scalloped on both
top and bottom edges.

## Reference example(s)
- Presets: Standard 14×2 in / Wide 16×2.5 in / Slim 12×1.5 in (finished girth × band height).
- Generic functional strip — no traced art.

## Dimension semantics

**FLAT item.** Editor:
- editor **L** → napkin **girth** (circumference around the folded napkin) — param `girth`
- editor **W** → band **height** — param `bandW`
- editor **H** → unused, hidden.

Extra inputs: **closure** (glue / lock), **edge** (straight / scallop-top /
scallop-both), scallop bump radius.

## Flat layout

Plain strip of length `girth + overlap` × `bandW`.

- **Glue closure:** outline is a plain (scalloped) rectangle; a glue hatch
  covers the overlap zone `girth → girth+overlap`.
- **Lock closure:** a `tabEdgePts` trapezoid tab is spliced into the right short
  edge (far end); a `slotCut` stadium slot sits `overlap/2` from the left edge
  (near end), centred on `bandW`. When the far end laps the near end, the tab
  inserts into the slot.

Scallop edges use `scallopEdge` with 14 segments per bump, direction derived
so bumps bulge OUTWARD (away from the strip centre).

## Parameters & defaults

| Param | Meaning | Default |
|---|---|---|
| `girth` | napkin girth | 14 in |
| `bandW` | band height | 2 in |
| `overlap` | closing overlap | `clamp(0.875 in, 0.5 in, girth·0.2)` |
| `closure` | `glue` \| `lock` | `lock` |
| `edge` | `straight` \| `scallop-top` \| `scallop-both` | `scallop-both` |
| `scallopR` | scallop bump radius | 5 mm |

Tab dimensions (lock): `tabW = clamp(bandW×0.55, 12mm, bandW−6mm)`, depth 9 mm.

## Flat-size formulas

- Glue: `bboxW = girth + overlap`, `bboxH = bandW`
- Lock: `bboxW = max(girth + overlap, actual tab extent)`, `bboxH = bandW`
  (the tab protrudes slightly past `girth + overlap`)
- Zero creases.

## Closure / locking

**Glue:** the overlap zone is the glue hatch. **Lock:** the tab on the far end
inserts through the slot on the near end when the strip wraps. No glue needed.

## Cut vs fold / cutting notes

- **Zero creases** (cut-only). The slot is a separate closed cut polyline.
- `flat: true`, `preferSheetExport: true`.
- Default closure is **lock** (the dieline shows the tab + slot, more
  informative than a plain glue rectangle).

## Implementation

- File: `src/core/models/napkinRing.ts`
- Exported: `buildNapkinRing(params)`, `defaultParams(girth, bandW, thickness?)`,
  `NapkinRingClosure`, `NapkinRingEdge`
- Reuses `scallopEdge`, `slotCut`, `tabEdgePts`, `SlotTabSpec` (craft.ts).
  `has3DPreview: true`, `flat: true`.

## 3D preview

Bespoke renderer `napkinRingFoldable` (`src/ui/box3d/foldable.ts`) wraps the
flat strip into the closed ring (a wrap, not a fold). H is hidden (H=0), so the
editor's `Box3D` only requires `L,W > 0` here (the H≤0 guard is gated on
`dimLabels.H !== null`) — otherwise the pane was empty.

## Changelog

- 2026-06-24 initial entry (Tags & Wraps category).
- 2026-06-24 bespoke wrap **3D preview** (`napkinRingFoldable`, `has3DPreview:
  true`).
