# Die Cut Studio

**A free, parametric dieline generator for crafters, makers and small packaging
runs.** Pick a template, type its dimensions, watch it fold in 3D, and export a
cut file at **exact 1:1 physical scale**, ready for a cutting machine, a laser
or a print shop.

**Use it online → [diecutstudio.com](https://www.diecutstudio.com)**

No account, no watermark, nothing to install. Everything runs in your browser.

---

## What it does

- **55+ parametric templates.** Every template is a pure function
  `(dimensions) → dieline`. Change a number and the whole net recalculates:
  panels, flaps, tucks, glue tabs, slots and notches.
- **Exact 1:1 output.** All geometry is stored in PDF points (1 in = 72 pt).
  Print or import at 100% and a ruler agrees with what you typed.
- **Live 3D fold preview.** The Fold Engine derives the 3D model *from the flat
  dieline itself*, so the preview can't drift from the file you cut.
- **Separate layers.** Cut (blue), crease/score (red dashed), bleed (green) and
  glue areas are distinct layers and colours, so cutter software can map them
  to cut vs. score.
- **Three export formats:**
  - **PDF** in native points, the exact page size
  - **SVG** with real in/mm units, imports 1:1 into most cutter software
  - **DXF** (R12, mm) for CAD, laser cutters and entry-level cutter software
- **Sheet imposition.** See how many copies fit on a cutting mat or press sheet
  (12×12, 12×24, Letter, A4, 13×19, SRA2…) and export a full ganged sheet with
  crop marks.
- **Print & Cut.** Drop a logo or photo onto the piece. It prints inside the cut
  shape, shows on the 3D preview, and exports as a combined file or as a
  separate print PDF + cut SVG pair.
- **Inner/outer dimensions.** Enter the product (cavity) size and board
  thickness is compensated for you.
- **Private by design.** Your designs and images never leave your browser.

## Templates

| Category | Examples |
|---|---|
| **Boxes** | Straight tuck end, reverse tuck end, auto-bottom (crash-lock), tuck-top snap-lock, sealed-end glue carton, open tray, hinged-lid tray, tray + lid, drawer box, pillow box, open sleeve, gable box, hexagon box (+ lid), heart box, shipping carton (RSC) |
| **Animal treat boxes** | Bunny, cat, bear, fox, panda, pig, owl, dog, lion, unicorn, frog, mouse, sheep, bat, chick, reindeer, each with a printable, recolourable face |
| **Envelopes & cards** | Envelope (square/pointed/diamond/pocket flaps + liner), gift-card holder |
| **Tags & wraps** | Gift tag, belly band, napkin ring, cupcake wrapper, jar label, bookmark |
| **Display cards** | Earring card, necklace/bracelet card, hair-bow card |
| **Party** | Bunting pennant, place card, party hat, cake topper, paper rosette, pyramid favor box, paper flower |
| **Decor & organizers** | Paper lantern, 3D folded star, snowflake, floss bobbin |

Box styles follow public **ECMA** and **FEFCO** structural standards. See
[`docs/`](docs/) for a deep-dive on every model: anatomy, formulas, dimension
semantics and cutting notes.

## Cutting machines

Exported files carry geometry, layer and colour. **Your cutter software decides
what gets cut vs. scored.** Map it by line colour (blue → cut, red → score) or
by layer (`CUT` / `CREASE`).

- **SVG** is the best choice for most cutter apps. It's exported at 72 DPI so it
  imports 1:1 even in software that ignores SVG units.
- **DXF** works in entry-level cutter editions and CAD/laser software.
- **PDF** is for printing. Always print at **100% / actual size**.

More in [`docs/print-and-cut.md`](docs/print-and-cut.md).

## Run it locally

Requires Node 20+.

```bash
npm install      # also enables the git pre-commit hook
npm run dev      # http://localhost:5180
```

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | typecheck + production build → `dist/` (static, host anywhere) |
| `npm run typecheck` | TypeScript check, no emit |
| `npm test` | test suite (Node's built-in runner, no framework) |
| `npm run verify` | print exact export sizes for the reference box |

The build is a static SPA, so any static host works (configure an SPA fallback
to `index.html`). Analytics are **off** unless you set a PostHog token; see
[`.env.example`](.env.example).

## How it works

```
params (in/mm) ──► points ──► model(params) ──► Dieline ──┬─► 2D canvas preview
                                                           ├─► Fold Engine ─► 3D preview
                                                           └─► PDF / SVG / DXF export
```

- **`src/core/models/`**: one pure function per template, all registered in
  `registry.ts`.
- **`src/core/fold/`**: the Fold Engine. It turns the dieline's cut + crease
  lines into panels and a hinge graph, then a rigid-origami solver folds them
  using a small per-model `FoldSpec` (angles + timing).
  See [`docs/fold-engine.md`](docs/fold-engine.md).
- **`src/export/`**: hand-written PDF (via pdf-lib), SVG and DXF writers, all
  fed from the same polylines so the three formats can't disagree.
- **`src/ui/`**: React editor, gallery, and three.js 3D preview.

Tech: React 18 · Vite 5 · TypeScript · three.js · pdf-lib. No backend.

## Contributing

Contributions are welcome, especially new templates. Read
[`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/README.md`](docs/README.md)
("How to add a new model") first. Every model must be derived from public
formulas or functional geometry, never copied from another tool's files.

## License

[MIT](LICENSE) for the code. **Dielines you generate are yours**: use them for
personal or commercial work, no attribution required.
