# Fold Engine v2 — derived 3D folds (design)

Status: **ALL PHASES COMPLETE (2026-06-10).** All 15 foldable models run on
the engine; the pillow box keeps its designed bespoke bowed render. Phase 5
deleted the ~1000 lines of legacy closures (`foldable.ts` is now a ~135-line
facade: pillow + `sideBand` + dispatch) and the `?foldengine` URL flag, and
shipped SLIT MARKS (open interior cuts render as dark slots — the gable lock
visual). Interior material DONE (2026-06-25): each panel's inner face (normal
facing the box centre at the closed pose) renders light gray vs the white
exterior — white-outside, gray-lined-inside. Remaining polish (tracked, not
blocking): glue-zone decals derived from the dieline's glue layer; window
"acetate" fill.

**Renderer capability — Print-&-Cut artwork decal (2026-06-11).** The renderer
can paint a dropped image ONTO the folded box: `buildPrintCtx` composites the
artwork (rect + rotation, in trim points) onto an offscreen canvas the size of
the dieline trim bbox → one `CanvasTexture`; `panelPrintMesh` adds a per-panel
overlay (front-face outline + holes) whose UVs are the panel's FLAT coords
(`u = x/W`, `v = y/H`), floated proud via polygonOffset. Because the UVs are the
flat-sheet coords, the print splits across panels and folds with them for free
(no per-model 3D art code) — the same "derive 3D from the flat" principle as the
fold itself. Wired into both the single-piece and two-piece (`buildStaticPanels`)
paths; the bespoke renderers (pillow/cupcake/belly-band/place-card) don't carry
it yet. `Box3D` passes a decoded image + caches it so artwork edits update live.
Originally: — the engine (`panelize.ts`,
`solve.ts`, `specs.ts`, `engineRenderer.ts`) runs TEN models **BY DEFAULT**
(`?foldengine=0` is the legacy escape hatch until Phase 5): STE, RTE
(Phase 1) + auto-bottom, tuck-top-auto, snap-lock, glue-carton (Phase 2) +
open-sleeve, open-tray, hinge-lid-tray, rsc (Phase 3) + the GABLE (Phase 4a
— the acid test passed: 17 panels/16 hinges incl. four lock ears, both
handle slots derived as holes, closed bbox = L×(H+G)×W exact on first run;
first non-tube
topologies: floor-rooted trays via `FoldSpec.floor` orientation, the sleeve
as a pure animated wrap, corner glue flaps wrapping with auto-inward layers — each was just a ~15-line FoldSpec + crease
ids; zero engine changes needed, including the crash-lock's 45° diagonal
±180° reverse-folds and the inset relief-slit hinges). `layer` stacking hints
are implemented in the renderer (overlapping floor/seal flaps offset along
local +Z by boards — no z-fighting). All six fold closed to exactly L×H×W as
node tests. Known parity gaps before un-flagging: window "acetate" fill,
glue-zone tint, interior material. Phases 3–5 below remain.

---

## 1. Why

Today every model has TWO representations: the **dieline** (exact, tested,
the source of truth) and a **hand-written 3D closure** in
`src/ui/box3d/foldable.ts` that re-creates the panels from scratch and
animates them. The 3D is a manual re-interpretation — and every 3D defect to
date came from that gap, never from the dieline:

| Incident | Root cause |
|---|---|
| Book-wrap removed | 3D modeled a different object than the dieline |
| Gable lock deferred | 3D guessed the lock kinematics (4 failed attempts) |
| Thumb-notch invisible in 3D | unscaled mm constants in the hand-coded path |
| Sealed-end blue plates / floating flaps | hand-coded flap stacking, twice wrong |
| RTE faked an STE box (pre-`buildFoldable`) | 3D drew the wrong flaps entirely |

**Fold Engine v2 inverts the architecture: the 3D folds the literal dieline.**
Panels and hinges are *derived* from the cut + crease geometry; a model
supplies only a small **data** annotation (fold angles + timing). Drift
becomes impossible by construction; every new model (boxes and future craft
items with folds) gets 3D nearly free.

## 2. What it is / honest limits

- **Derived automatically:** panel polygons (with holes — windows, handle
  slots, notches come free), the hinge graph (which panel folds off which,
  along which line).
- **Still per-model data (inherent, not a shortcoming):** fold **angles**,
  **direction** (mountain/valley), and **sequence/stagger** — a flat pattern
  genuinely does not encode them (the same dieline folds to many 3D states).
  Also genuinely-3D facts: layering of overlapping flaps, "tongue goes
  INSIDE the wall" nuances.
- **Out of scope:** the pillow box (bowed non-rigid surfaces — keeps its
  bespoke closure); physical paper simulation (wobble reduces legibility);
  collision solving (layer hints are cheaper and deterministic).

Prior art (reference only, no new deps): the open **FOLD format** (MIT spec)
proves the model — crease patterns + per-crease target angles; Ghassaei's
MIT Origami Simulator folds such files with a spring solver (too soft for
crisp cartons, and it needs angle annotations anyway). Our domain is narrower
(tree-structured rigid carton folds), so we own a small exact engine instead.
**License rule: MIT/BSD/Boost-compatible helpers only — no GPL (e.g. CGAL).**
Current plan needs no new runtime deps at all.

## 3. Architecture

```
src/core/fold/
  panelize.ts    Dieline -> PanelGraph        (pure geometry, fully tested)
  foldspec.ts    FoldSpec types + helpers
  solve.ts       PanelGraph + FoldSpec -> FoldTree (root, hinges, angles)
src/ui/box3d/
  engineRenderer.ts  FoldTree -> THREE groups (reuses thickness/material/
                     shadow pipeline from the render-quality pass)
  foldable.ts        becomes a FACADE: models with a FoldSpec use the engine;
                     legacy closures remain until per-model parity, then die
```

### 3.1 Panelizer (`panelize.ts`)

Input: one piece's cut outline (closed `Polyline`), interior cut polylines,
crease polylines. Output: `PanelGraph`.

Algorithm (planar subdivision, constrained to our domain):
1. **Collect segments**: outline edges + crease segments (curves already
   flattened in `Polyline.pts`).
2. **Node graph**: endpooints + all intersections (crease×crease,
   crease×outline), snapped to an epsilon grid (~1e-4 pt) so T-junctions
   (very common: vertical panel folds meeting horizontal flap folds) are
   exact graph nodes. Split segments at nodes.
3. **Face tracing**: half-edge walk (always take the most-clockwise next
   edge) → interior faces = **panels**. The outer face is discarded.
4. **Holes & slits**: interior *closed* cut polylines (window, handle slot,
   euro slot, thumb cuts) are assigned as **holes** of the containing panel —
   so apertures appear in 3D automatically, correctly placed, forever.
   Interior *open* cuts (lock slits) attach to their panel as **slit marks**
   (rendered as the dark slot decal).
5. **Hinges**: every interior edge shared by two faces that originated from a
   CREASE becomes a hinge `{panelA, panelB, segment}`. Outline edges are
   boundary. Carton flat patterns are trees by construction (the tube closes
   visually via angles, not via a graph cycle — the glue flap hangs off one
   crease only), so the hinge graph is a tree; **validate and fail loudly**
   if not (catches dieline bugs too).

Multi-piece dielines (`Dieline.pieces` — drawer box, tray+lid, hex+lid):
panelize each piece independently; each piece gets its own root + transform.

### 3.2 Crease identity (tiny core change)

Models name their creases at creation: `Polyline.id?: string` (e.g.
`"back-top-hinge"`, `"tongue-fold"`, `"lockEar-L"`). Backwards compatible —
unnamed creases panelize fine; only hinges referenced by the FoldSpec need
ids. The model already knows every coordinate, so naming is one string per
crease at the place it's built.

### 3.3 FoldSpec (per model, data not code)

```ts
interface FoldSpec {
  root: Pt;                       // a point inside the root panel (e.g. front-panel centre)
  hinges: Record<string, {        // key = crease id
    angle: number;                // target fold in radians, signed (valley/mountain)
    t0?: number; t1?: number;     // slider window (stagger), default 0..1
    ease?: "linear" | "smooth";   // default "smooth"
    layer?: number;               // stacking hint for overlapping flaps (× board lay)
  }>;
  pieceMotion?: ...               // two-piece models: lid lifts, drawer slides
  decals?: ...                    // glue-zone patches (until derived from the glue layer)
}
```

~10–20 lines per model, versus ~100+ lines of bespoke three.js today.

### 3.4 Runtime (`solve.ts` + `engineRenderer.ts`)

- Root the tree at the panel containing `spec.root`; BFS assigns each panel
  its parent hinge.
- Each hinge = a THREE group positioned on the crease line, rotation axis =
  the crease direction; child panels nest inside. `setFold(t)` sets every
  hinge's angle from its spec (eased, staggered) — same external API as today
  (`Foldable { group, setFold }`), so `Box3D` and `boxSnapshot` don't change.
- Panels render through the EXISTING quality pipeline: thickness slabs +
  `sideBand` caliper, hole punching, contact shadows, decals. The flat sheet
  lies in a plane at `t=1` (fully open); the closed box is centred after the
  fact via its bounding box. Camera framing already uses the fully-open
  bounding sphere — unchanged.

## 4. New test invariants this unlocks (Gate 2 upgrades)

The engine makes 3D *testable* for the first time:

1. **Panelization counts** — "the STE panelizes into N panels and M hinges"
   per model, across dimension sweeps (locks both dieline & panelizer).
2. **Area conservation** — Σ panel areas = sheet area (no lost/overlapping
   faces; catches face-tracing bugs instantly).
3. **Closed-state bounding box** — fold to t=0 and assert the 3D bbox ≈
   `L × W × H` (within board tolerance). This single test catches wrong
   angles, wrong directions, and wrong hinge assignments for EVERY model —
   the class of bug that today only an eyeball catches.
4. Existing 3D smoke tests keep running unchanged.

## 5. Special cases

- **Pillow box**: opt-out, keeps its bespoke bowed closure (documented).
- **Two-piece models**: per-piece fold trees + a `pieceMotion` (lid lift,
  drawer slide) — small, declarative.
- **Gable (the acid test)**: panels incl. roof ears derive automatically
  (they're crease-bounded regions of the real dieline); the lock slits are
  open interior cuts → slit marks on the triangle panels; ears fold over with
  `layer` hints. The mechanism that defeated four hand-coded attempts becomes
  geometry we *read* instead of guess. (Gate 1 reference for the closed pose
  is still wanted before declaring it done.)
- **Curved creases** (pillow only today): out of scope, opt-out covers it.
- **Glue decals**: v1 keeps the few existing tinted markings as spec decals;
  later they can derive from the dieline's glue layer.

## 6. Migration plan (model-by-model, legacy stays until parity)

| Phase | Work | Exit criteria |
|---|---|---|
| **1 — Spike** | `panelize.ts` + tests (STE, RTE across dim sweeps); FoldSpec + solver; engine renderer; STE + RTE running behind a dev flag side-by-side with legacy | STE/RTE visually ≥ legacy in editor + snapshot; closed-bbox test green |
| **2 — Tuck family** | tuck-top-auto, snap-lock, auto-bottom, glue carton (overlap `layer` hints prove out) | all four at parity, legacy closures deleted as each lands |
| **3 — Trays/tubes** | open tray, hinged-lid, sleeve, RSC | same |
| **4 — Hard cases** | gable (slits/ears), hex + hex-lid (non-axis hinges prove generality), two-piece motions (drawer, tray+lid) | gable card returns to the gallery |
| **5 — Cleanup** | foldable.ts facade only; pillow documented opt-out; engine docs | one render path |

Effort honestly: Phase 1 ≈ 1–2 focused sessions (panelizer is the careful
part); each later phase ≈ a session. The facade keeps the app shippable at
every step — no big-bang risk.

## 7. Risks & mitigations

- **Numerical robustness** (face tracing at T-junctions): epsilon snapping +
  the area-conservation test across dimension sweeps; fail loudly, never
  silently drop a face.
- **A model whose hinge graph isn't a tree**: validation error at build time
  (would also indicate a malformed dieline).
- **Visual regressions during migration**: dev flag + side-by-side; per-model
  parity checklist (closed, mid, open, features on).
- **Scope creep toward physics**: explicitly out — rigid hinges + layer
  hints only.

---

When built: mark models migrated here and add the new invariant tests.
