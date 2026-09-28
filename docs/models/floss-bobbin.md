# Floss Bobbin (craft — Organize)

An embroidery-floss organizer card. Build-order item #7c — the **first model in
the "Organize" category** (which now appears as a gallery tab).

## What it is
The classic **I-beam / dog-bone** floss winder. You wind a skein of embroidery
floss around the narrow body; the wide flanges keep the bundle from sliding off,
and the card files in a binder/box by its hole. Matches a standard plastic/
cardboard bobbin:
- a **wide rounded TOP FLANGE** with a hang **hole** in it,
- a **narrow BODY** (the winding area),
- a **wide BOTTOM FLANGE** that flares into two **feet** with a centre **notch**
  (the gap between the feet + thread catch).
Concave shoulder fillets join the flanges to the body.

## Reference example(s)
- Standard plastic floss bobbin ≈ 1.75 × 2 in (portrait), I-beam silhouette
  (presets: Standard / Mini / Wide). Generic functional winder form — no traced
  art, no brand layout. Geometry only; the colour number is user-added.

## Dimension semantics
- editor **L** → bobbin **width** (x, across) — param `W`
- editor **W** → bobbin **height** (y, tall) — param `H`
- editor **H** → unused, hidden (flat item).

## Flat layout
A single closed outline tracing the I-beam: full-width top & bottom flanges
(`capH` / `footH` tall, rounded ends radius `fr`), an inset body (`inset` per
side → body width `W − 2·inset`), concave shoulder fillets (`sf`), and a centre
**V-notch** (width `nw`, depth `nd`) cut up into the bottom edge between the two
feet. One interior cut: the **hang hole**, centred in the top flange.

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `W`, `H` | card width / height | 1.75 × 2 in (portrait) |
| `capH` / `footH` (derived) | top / bottom flange height | `H·0.22` each |
| `inset` (derived) | body inset per side | `W·0.19` (body ≈ 0.62·W) |
| `fr` (derived) | flange end corner radius | `min(capH,footH)·0.45` |
| `sf` (derived) | concave shoulder fillet | `min(inset,capH,footH)·0.4` |
| `nw` / `nd` (derived) | bottom notch width / depth | `W·0.18` / `footH·0.6` |
| `hole` / `holeDia` | top hang hole | on, ⌀ 3/16 in |
| `bleed` | bleed margin | 0.0625 in |

## Flat-size formulas
- `bboxW = W`, `bboxH = H` exactly (flanges reach the full width; body, notch and
  hole are interior). No creases. Cut = outline (closed, notch included) + hole
  (closed) = **2 paths**.

## Closure / locking
None — it's a flat winder, not a folded/locked box. The wide flanges hold the
wound floss; the bottom notch starts/catches the thread; the hole rings it.

## 3D preview
`has3DPreview: false`, `flat: true` — nothing folds, so the editor hides the 3D
pane; the canvas dieline IS the preview. Cut many-up: `preferSheetExport: true`
(≈30-up on a 12×12 cutting mat at the default size).

## Cut vs fold / cutting notes
- **Cut-only** — no creases. The hang hole is a closed interior cut; the bottom
  notch is part of the outline (a triangular bite between the feet).

## Implementation
- File: `src/core/models/flossBobbin.ts`
- Exported: `buildFlossBobbin(params)`, `defaultParams(W, H, thickness?)`
- `flat: true`, `has3DPreview: false`, `category: "organizers"`, size presets.

## Future
- Editor toggles for the hole and a notch-style choice (V vs slot).
- A multi-up "floss card sheet" preset (a whole binder page at once).

## Changelog
- 2026-06-12 initial entry (Craft build-order item #7c; first Organize model).
- 2026-06-12 redesigned twice to match owner reference photos — final shape is
  the standard **I-beam**: wide top flange + hole, narrow body, wide bottom
  flange flaring to two feet with a centre notch (earlier tries had a localized
  side-waist with the hole/slits misplaced).
