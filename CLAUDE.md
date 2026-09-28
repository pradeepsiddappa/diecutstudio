# CLAUDE.md

Guidance for AI coding assistants (and humans) working in this repo. Keep it
updated when the stack, architecture or a core convention changes.

## What this is

**Die Cut Studio** is a parametric **dieline generator**. The user types a
template's dimensions, sees a live 2D + 3D preview, and exports a print-ready /
cut-ready die-cut file at **exact 1:1 physical scale** (PDF, SVG, DXF). Live at
[diecutstudio.com](https://www.diecutstudio.com). 100% client-side, no backend.

## Tech stack

| Concern | Choice | Notes |
|---|---|---|
| UI | **React 18** | components + hooks in `src/**/*.tsx` |
| Build / dev server | **Vite 5** | dev on :5180; `npm run build` → static `dist/` |
| Language | **TypeScript** | geometry core is pure, framework-free TS |
| PDF export | **pdf-lib** | native point units = exact size |
| SVG / DXF export | hand-written | no deps; derived from shared polylines |
| 3D preview | **three.js** | lazy-loaded into its own chunk |
| Analytics | posthog-js | optional; only runs in prod when a token is set |

## Core invariant: physical accuracy

**All geometry is stored in POINTS (1 in = 72 pt, the native PDF unit).** The
UI accepts in/mm and converts at the boundary. Screen rendering scales freely;
only the exported file carries physical truth. Printing/importing at 100%
yields a ruler-accurate template.

## Architecture

```
src/
  core/
    units.ts          in/mm <-> points
    geometry.ts       Polyline primitive, toSvgPath(), arcPoints(), offsetPolygon()
    types.ts          Dieline, Polyline, LayerKind, LAYER_STYLES, Rect, FeatureOptions
    craft.ts          shared craft primitives: scallopEdge, hole punches, slot+tab
    features.ts       toggleable overlays (window cut, euro slot, thumb notch)
    paper.ts          standard sheets + mats, checkFit()
    imposition.ts     n-up grid imposition
    sheet.ts          composeSheet(): N copies → one sheet Dieline + crop marks
    models/           one pure (params) => Dieline per template
      registry.ts     ModelEntry list: metadata, defaults, presets, build(),
                      categories, 3D flags. Editor + gallery dispatch through it.
      animalBox.ts    shared body/lid/face pipeline for the animal treat boxes
    fold/             FOLD ENGINE (docs/fold-engine.md)
      panelize.ts     dieline cut+crease → panel polygons + hinge graph
      solve.ts        rigid-origami solver: FoldSpec + graph → transforms at t
      specs.ts        per-model fold DATA (angles, timing, layers)
  export/
    pdf.ts            Dieline → PDF (points, exact page size)
    svg.ts            Dieline → SVG (real units, 72-dpi viewBox)
    dxf.ts            Dieline → DXF R12 (mm, per-entity colour)
  ui/
    Box3D.tsx              three.js preview (lazy)
    box3d/engineRenderer.ts  renders Fold Engine output (slabs, fillets, decals)
    box3d/foldable.ts      dispatch + bespoke renderers for shapes that roll/bow
    components/            gallery thumbnails, logo, footer, …
    pages/                 Landing (gallery), Editor, TemplatePage, DocsPage
  seo/                siteConfig.ts (site metadata, JSON-LD) + head.ts
  App.tsx             tiny router (no react-router)
tests/diecut.test.ts  Node built-in test runner (via scripts/test.mjs)
scripts/              test runner, verify, SEO/sitemap build step
docs/                 per-model deep-dives + catalogs (see docs/README.md)
```

**Data flow:** `params (pt)` → `model.build()` → `Dieline { paths per layer,
widthPt, heightPt, bleedPt, panels, pieces, decorations }` → 2D preview, Fold
Engine 3D, and every exporter. Curves are Q-beziers or pre-flattened, so all
three formats stay identical.

### Layers

`cut` (blue), `crease` (red dashed), `bleed` (green dashed), `glue` (grey
hatch), defined in `LAYER_STYLES` (`types.ts`). Cutter software maps cut vs
score from these layer names + colours. `decorations` are print-only colour
shapes (e.g. animal faces), and are omitted from DXF.

## Conventions

- Geometry math in points; convert at the UI/export boundary only.
- A model is a **pure function** `(params) => Dieline`. Build the cut outline as
  closed polylines + crease segments + glue; return a `Dieline`. Preview, fit
  and exports are model-agnostic.
- **Every model is derived from public formulas / functional geometry**
  (ECMA, FEFCO, textbooks). Never import another tool's SVG/DXF/code; never
  implement trademarked mechanisms or branded characters. See
  `docs/box-styles-catalog.md`.
- Document each model: copy `docs/models/_TEMPLATE.md`, add it to
  `docs/README.md`.
- Coordinate system: top-left origin, y-down. DXF flips y and shifts to ≥ 0.
- No new runtime dependencies without good reason; no GPL dependencies.

## Fold Engine rules (learned the hard way)

- Models name their creases (`Polyline.id`) and supply a small `FoldSpec`;
  the engine derives panels from the dieline, so 3D can't desync from the flat.
- Draw named creases **canonically** (horizontal left→right, vertical
  top→bottom), because the hinge axis comes from the drawn point order and a
  reversed crease flips the fold sign.
- Use `layer` stacking only for flaps that overlap in a plane (floors, seals),
  never for a continuous sheet folding at creases (it opens a gap at the hinge).
- Closing flaps should finish folding slightly before t=0 (a settle margin).
- Box3D frames the bounding sphere at fold = 1, so bespoke renderers put their
  largest pose at t=1.
- The 3D build runs on every keystroke. Guard degenerate (0) dimensions and
  never let a build error throw to React.
- In `foldable.ts`, any literal mm dimension must be multiplied by `scale`.
- A closed outline whose last segment is a curve must keep its closing
  point + curve (don't pop it), or the final corner renders chamfered.
  `Polyline.curves[j]` is the control for segment `pts[j] → pts[j+1]`.

## Commands

```bash
npm install      # also enables the git pre-commit hook
npm run dev      # http://localhost:5180
npm run build    # typecheck + production build + SEO files -> dist/
npm run typecheck
npm test         # Node built-in test runner (tests/diecut.test.ts)
npm run verify   # print exact export sizes for the reference box
```

## Testing & commit policy

- Tests run with Node's built-in runner (esbuild bundles the TS). No test
  framework dependency.
- **Behaviour changes should add/adjust a test** locking in the invariant
  (flat-size formula, crease count, closed 3D bbox, export page size).
- A pre-commit hook (`.githooks/pre-commit`) runs typecheck + tests; CI
  (`.github/workflows/ci.yml`) runs the same plus a build.

## Cutting-machine notes

Files carry geometry + layer + colour only; **the cutter software decides what
is cut vs scored**. Map by line colour (blue → cut, red → score) or by layer.
SVG exports at a 72-dpi viewBox with explicit in/mm width/height so it imports
1:1 in software that ignores SVG units. DXF is R12 in mm.
