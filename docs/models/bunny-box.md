# Bunny Treat Box

The first **animal** model, and the first to carry a **printable, recolourable
face**. A bunny-eared favour / treat box: a four-corner glued tray with a **flip
lid**, whose **front (top) wall** grows two smooth ears, with a face — eyes,
nose, inner-ears, cheeks, mouth — printed on the front. The lid closes the top
(it opens & closes). Easter baskets, kids' parties, favours.

- **Model:** `src/core/models/bunnyBox.ts` · **id:** `bunny-box`
- **Category:** party · **Status:** built (folds + opens/closes in 3D)
- **Family:** first of the **animal box** line — cat / bear / fox follow the SAME
  body + lid + fold animation + face pipeline. Read the
  **[animal-boxes playbook](../animal-boxes.md)** before adding another animal.

## Anatomy

Body = the open-tray base (ECMA C10): a base + four walls folding up, each corner
closed by a glue flap that wraps onto the adjacent wall. The **eared wall is the
TOP side wall**, so the flat net reads **right-side-up** (ears up, face below) —
a recognisable preview/thumbnail — and folds upright. The **BACK wall extends
into a flip LID** (panel L×W) + a chamfered **tuck flap** that folds over the top
and tucks into the front to close (a tuck-top lid, like the hinged-lid tray).

```
            (  ears  )            ← rise above the front wall, tips at y=0
        [ FRONT wall + face ]     ← top side wall  (L × H)   eyes/nose/mouth here
 [Ltf]                    [Rtf]
 [L end wall] [  BASE L×W ] [R end wall]
 [Lbf]                    [Rbf]
        [   BACK wall   ]         ← bottom side wall  (L × H)
        [   LID panel   ]         ← folds over the top  (L × W)
        [  tuck flap    ]         ← tucks into the front (chamfered)
```

- **Ears** are RIGID extensions of the front wall (no crease at the base), so they
  stand straight up when the wall folds. Two smooth Q-bezier leaves, centred over
  the front wall (`earH = clamp(H·1.2, 16 mm, H·2.4)`, half-width `L·0.12`).
- **Corner glue flaps** (4) on the end walls — the standard four-corner tray bond.
- **Lid** = back wall → lid panel (L×W) → tuck flap (`tuckD = clamp(H·0.7, 8 mm,
  H − relief)`); friction-tuck close, no glue on top.

## Dimensions

| input | meaning |
|---|---|
| **L** | front-wall width (where the face goes) + base length |
| **W** | box depth (base width) + lid-panel depth |
| **H** | wall height |

- Flat size: **width = `2H + L`**, **height = `earH + 2H + 2W + tuckD`** (the
  extra `W + tuckD` is the lid panel + tuck below the back wall).
- **Cut** = one closed outline. **Crease** = 10 (4 base↔wall + 4 wall↔corner-flap
  + back↔lid + lid↔tuck). **Glue** = the 4 corner flaps (the lid is friction).

## Printable face (decorations)

The face is **`Dieline.decorations`** — filled / stroked colour shapes that are
**PRINT, not cut**. They render in the preview, PDF and SVG; **DXF ignores them**
(a cutter file has no colour fills). Five groups, each recolourable in the
editor's **Face colours** card (and the mobile **Face** tab):

| id | label | shape | default |
|---|---|---|---|
| `ears` | Inner ears | 2 leaves in the ears | `#f3a9c0` |
| `cheeks` | Cheeks | 2 circles | `#f8c4d2` |
| `eyes` | Eyes | 2 circles | `#2b2622` |
| `nose` | Nose | triangle | `#e26d8e` |
| `mouth` | Mouth | stroked stem + smile | `#7a5560` |

Colour overrides live in editor state (`decorColors`, keyed by id), persist to
localStorage with the rest of the design, and are applied to the canvas + every
export via `decoratedDie`. The model only supplies defaults.

## Cutting notes

The cut + score net is a real 1:1 cut file. Print the face (the colour fills /
stroke), then cut the trim + score the creases — i.e. a **Print & Cut** job.
The single seam is the four corner glue flaps.

## 3D

Folds through the **Fold Engine** (no bespoke renderer): the creases reuse the
open-tray scheme (`base-side1` = the eared FRONT/FACE wall, etc.) + `back-lid` /
`lid-tuck` for the lid; root at `panels.base` (publish only the base — adding
`panels.front` mis-roots the fold and it stays flat). The slider runs the **flat
sheet (t=1, "Open") → closed box (t=0, "Closed")**, with the family animation
(see the [playbook §3](../animal-boxes.md)): the **face + ears open first /
close last**, the other flaps wait until the face is past halfway, and the
**tuck stays tucked until the face is past half** then comes out with the lid.
Windows: `base-side1` (FACE) [0.12,0.44] · `back-lid` [0.3,0.6] · walls + corner
flaps [0.4,0.82] · `lid-tuck` [0.3,0.5]. The ears are part of the front-wall
panel, so they stand up. `previewFold` = 0 (closed = the finished look + the
thumbnail); `Box3D` frames `frameFold = 0.1` (the near-closed box) so the box
stays well-sized — the open animation lies the face open as a forward
"drawbridge" and overflows the frame (scroll-zoom to watch the full unfold).

The **face is a print decal** — `buildDecorCtx` (engineRenderer) rasterises the
decorations onto a canvas at the dieline-trim size; the same flat-sheet UV
mapping the Print&Cut artwork uses then places the face on the front-wall panel
and the inner-ears on the ears. The editor's chosen colours thread through
(`Box3D` `decorColors` → `engineFoldable`), so the 3D face matches the 2D. The
gallery snapshot uses a `rotation.y ≈ 0.45` pose so the face stays toward the
camera (the generic 3/4 turn would face it away).

## Roadmap

- **Ear / face swaps** → **cat ✅** (triangle ears), **bear ✅** (round ears),
  **fox ✅** (pointed ears) — built on the shared `animalBox.ts` builder; the same
  box body, only the ear outline + face shapes change. More animals follow the
  same [playbook](../animal-boxes.md).
