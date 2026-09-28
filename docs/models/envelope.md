# Envelope (craft — Envelopes & Cards)

The classic diamond / A-style announcement envelope, in **five** flap styles
with an optional contrast liner. The first **Envelopes & Cards** category item.

## What it is
A single flat blank: a centre **face** rectangle (the finished pocket) with four
flaps that fold inward. Two side flaps fold first; the bottom flap folds up and
glues over the side-flap corners to form the pocket; the top **closure flap**
folds down to seal. Three styles:
- **square** — announcement / A-style, flat trapezoid flaps, softly rounded
  closure corners; supports the contrast liner.
- **pointed** — baronial / invitation, pointed top closure (flat side flaps);
  supports the contrast liner.
- **diamond** — the classic **wedding / invitation** envelope: ALL flaps come to
  a point (top + both sides) or a wide truncated point (bottom), every tip
  **rounded**, with a 3 mm relief chamfer at each face corner. Folded, the side
  points tuck under the bottom flap and the diagonal seams meet near the centre.
  Proportions are derived from the face size (see below); no liner.
- **wallet** (UI label "Pocket") — the portrait **card / document** envelope: a
  SMALL rounded top closure flap, SMALL side flaps, and a LONG bottom flap that
  folds up to form the pocket (covers most of the back). Square rounded flaps,
  opens at the top. Proportions derived from the face (see below); no liner.
- **catalog** (UI label "Catalog") — the **open-end / catalog** document
  envelope (manila-style): small top closure + small bottom + LARGE side flaps
  that fold in and overlap at the **centre back seam** (the pocket is formed by
  the sides, not the bottom). Same builder as the wallet, big flaps on the sides
  instead of the bottom. Opens at the top; no liner.

Optional **contrast liner** (square/pointed only) as a second cut piece (glue
inside the flap for a colour pop).

## Reference example(s)
- A2 announcement envelope: 5.75 × 4.375 in (finished). The default.
- Standard finished sizes shipped as presets (public USPS / commercial dims):
  A1, A2, A6, A7, A9, square 5/5.25/6.5, #10 business. IP-safe — these are
  published interchange sizes, not anyone's template file.

## Dimension semantics
**FLAT item.** Editor maps:
- editor **L** → envelope **width** (x, the sealed long edge) — param `W`
- editor **W** → envelope **height** (y) — param `H`
- editor **H** → unused, hidden
- Inner/outer mode N/A (`supportsInnerDim: false`).

The face W×H is the **finished envelope** (the pocket). The card that fits is
~1/4 in smaller on each axis. Extra inputs: closure flap style, contrast liner.

## Flat layout
```
                 [   top CLOSURE flap   ]      ← square or pointed, depth TF
      [ left ]   [        FACE  W×H      ]   [ right ]   ← side flaps, depth SF
                 [   bottom flap (glue)  ]      ← depth BF, glues over the sides
```
Adjacent flaps meet at the four FACE corners; their mitered edges give folding
clearance. The bottom flap is less tapered (wider) for the glue bond.

## Parameters & defaults
| Param | Meaning | Default |
|---|---|---|
| `W`, `H` | face width / height (pt) | A2: 5.75 × 4.375 in |
| `flap` | `square` \| `pointed` \| `diamond` \| `wallet` \| `catalog` | `square` |
| `sideFlap` | each side flap depth | `clamp(W·0.32, 10mm, W·0.46)` |
| `topFlap` | closure flap depth | `clamp(H·0.52, 20mm, H·0.85)` |
| `bottomFlap` | bottom (glue) flap depth | `clamp(H·0.5, 15mm, H·0.7)` |
| `liner` | include the contrast liner piece | `false` |
| `bleed` | bleed margin | 0.0625 in |

Derived (square/pointed): side miter `ssh ≈ sideFlap`; closure miter
`tsh ≈ sideFlap`; bottom miter `bsh ≈ 0.6·sideFlap`; square-flap corner radius
`min(5mm, tsh/2, …)`. Pointed apex at `(W/2, 0)`. Liner = the closure-flap
outline inset 1.5 mm + a drop `clamp(H·0.2, 8mm, H/2)` into the face, placed as
a second piece.

### Diamond style — derived from the face (ISO C5 reference)
The diamond IGNORES the trapezoid-style flap-depth params and derives everything
from W×H using the canonical **ISO C5** reference dieline (face 229×162 mm →
blank 409×387 mm), so any face size reproduces those exact ratios:
| Diamond dim | Ratio | At C5 |
|---|---|---|
| side flap depth `SF` | `W · 90/229` | 90 mm |
| top closure depth `TF` | `H · 135/162` | 135 mm |
| bottom flap depth `BF` | `H · 90/162` | 90 mm |
| truncated bottom flat width | `W · 70/229` | 70 mm |
| tip radius `r1` | `min(15mm, …)` | 15 mm |
| bottom-corner radius `r2` | `min(10mm, …)` | 10 mm |
| corner relief chamfer `g` | `min(3mm, …)` | 3 mm |

So the **C5 (229 × 162 mm)** preset with the diamond style reproduces the
reference dieline to the millimetre: blank **409 × 387 mm**, flat size verified
exactly in tests. The diamond's 4 named creases span the flap BASES between the
relief chamfers (NOT the full face edges) so the corner chamfers don't carve
sliver panels in `panelize` — same fold axis, clean 5-panel / 4-hinge tree.

### Wallet / Pocket style — derived from the face (ISO C5-portrait reference)
The wallet IGNORES the balanced flap-depth params and derives a deep pocket from
W×H using the **C5-portrait** reference dieline (face 162×229 mm → blank 202×469 mm):
| Wallet dim | Ratio | At C5-portrait |
|---|---|---|
| top closure flap `TF` | `H · 50/229` | 50 mm |
| side flaps `SF` | `W · 20/162` | 20 mm |
| bottom pocket flap `BF` | `H · 190/229` | 190 mm |
| edge taper | `5 mm` | 5 mm |
| corner radius | `10 mm` | 10 mm |

The **C5 portrait (162 × 229 mm)** preset with the wallet style reproduces the
reference exactly: blank **202 × 469 mm** (verified in tests). Flaps are square
with rounded corners; they meet at the face corners so the 4 named creases are
the full face edges → clean 5-panel / 4-hinge fold. Glue = the two side flaps
(the long bottom flap folds up over them). The **Pocket Envelope** gallery card
opens the editor pre-set to this size + style (via `?flap=wallet&L=…&W=…`).

The **catalog** style shares this exact builder (`buildPocketEnvelope`) — only
the flap-depth ratios differ: big SIDE flaps + small bottom instead of a big
bottom + small sides:
| | top `tfR` | side `sfR` | bottom `bfR` | C5-portrait blank |
|---|---|---|---|---|
| wallet | 50/229 | 20/162 | 190/229 | 202 × 469 |
| catalog | 50/229 | **85/162** | **35/229** | **332 × 314** |

At catalog ratios `2·SF = 2·85/162·W = 1.05·W > W`, so the side flaps overlap at
the centre back (the open-end seam). The **Catalog Envelope** gallery card opens
it (`?flap=catalog`).

## Flat-size formulas
- `bboxW = 2·sideFlap + W`  (+ `gap + W` when the liner is on)
- `bboxH = topFlap + H + bottomFlap`
- A2 default (5.75 × 4.375, no liner): blank ≈ **9.43 × 8.84 in** cut-only.
  Too big for Letter (expected — A-style envelopes are cut from 12×12);
  1-up on 12×18, 2-up on A2 press sheet.

## Closure / locking
Pocket = bottom flap glued over the two side flaps (glue layer = two bottom-flap
corner triangles). Closure = the top flap folds down; gum/seal line shown as a
glue strip on the square flap (pointed seals along its two angled edges).

## Cut vs fold / cutting notes
- **4 creases** = the four face edges (the flap hinges). The flaps cut free at
  the mitered corners.
- `flat: true` keeps the editor's **2D** dimension treatment (W×H inputs, no H,
  2D export naming) — but the model now **has a 3D fold** (`has3DPreview: true`).

## 3D fold (Fold Engine)
On the Fold Engine: `panelize()` derives **5 panels** (face + 4 flaps) and
**4 hinges** straight from the dieline; the FoldSpec (`specs.ts` → `"envelope"`)
folds all four flaps up and over onto the back (~175°). Root = the face
(`panels.base`), `floor: true`. The **flap style threads into the 3D** via the
renderer's `buildParams` (square / pointed / diamond / wallet all fold the
literal dieline panels — no desync); the **liner is deliberately excluded** from
the fold. **All four styles reuse the same spec unchanged.**

**Fold direction & pose** (`hingeAngleAt`: a flap is flat for t≥t1, folded for
t≤t0, so CLOSING runs t 1→0):
- At **t=1** every flap is flat → the blank **lies completely flat** (open).
- The **closure (top) flap closes LAST and opens FIRST**: stagger windows are
  sides `[0.55, 1]` → bottom `[0.3, 0.8]` → top `[0, 0.45]` (lowest t0 = seats
  last). Locked by a test.
- `previewFold = 0` → the editor + thumbnails default to the **CLOSED, flat-lying
  sealed envelope** (the flaps fold onto the back, occluded from the front so the
  face reads clean — no z-fighting in view). `Box3D` frames the envelope at
  `frameFold = 0` (the closed extent) so it fills the view; dragging the slider
  open unfolds it (flaps splay out, closure flap first).

## Implementation
- File: `src/core/models/envelope.ts`
- Exported: `buildEnvelope(params)`, `defaultParams(W, H, thickness?)`,
  `EnvelopeFlap`
- `has3DPreview: true` + `flat: true`; `presets` drive the editor's size
  dropdown (incl. **C5 / C6** ISO sizes for the diamond reference).
- Diamond path: `buildDiamondEnvelope(p)` (rounded-tip outline + truncated
  bottom + corner reliefs); branched from `buildEnvelope` on `flap === "diamond"`.

## Changelog
- 2026-06-11 initial entry (Craft Batch, build-order item #2).
- 2026-06-14 **diamond** flap style added — the classic wedding / invitation
  envelope (all flaps pointed + rounded tips, truncated rounded bottom, 3 mm
  corner reliefs). Proportions derived from the face via the ISO **C5** reference
  (C5 preset → exact 409×387 mm blank). Reuses the envelope FoldSpec (folds to a
  V-pocket). +C5/C6 presets. 3 new tests.
- 2026-06-14 **wallet / pocket** flap style added — the portrait card/document
  envelope (small top closure, small side flaps, long bottom pocket flap, square
  rounded flaps). Proportions derived from the face via the **C5-portrait**
  reference (C5-portrait preset → exact 202×469 mm blank). +C5-portrait preset,
  +Pocket Envelope gallery card, +URL dimension support (`?L/?W/?H`, fractional)
  so the card opens at the size shown. 3 new tests.
- 2026-06-14 **catalog** flap style added — the open-end / catalog document
  envelope (small top + small bottom + LARGE side flaps meeting at a centre back
  seam). Shares `buildPocketEnvelope` with the wallet (different flap ratios:
  side 85/162, bottom 35/229); C5-portrait → exact **332×314 mm** blank.
  +Catalog Envelope gallery card. 3 new tests (361 total). Also: the editor 3D
  stage now matches the clicked card's exact thumbnail tint (`?bg=`).
