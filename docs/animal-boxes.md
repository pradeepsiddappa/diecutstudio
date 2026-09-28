# Animal Boxes — the playbook

The **animal box** line (Bunny, Cat, Bear, Fox built so far — more to follow) is
a *family*, not a set of one-offs. Every animal is the **same box body + lid +
fold animation + printable-face pipeline** — only the **ear outline** and the
**face shapes** change. Build the next one by copying an existing animal's spec
and swapping those two things. This doc is the contract so they all behave
identically.

The shared body/lid/fold/glue/dims/panels/bleed live in **one builder**,
`src/core/models/animalBox.ts` (`buildAnimalBox(params, spec)`); each animal is a
tiny **`AnimalSpec`** (ears + face) in its own file: `bunnyBox.ts`, `catBox.ts`,
`bearBox.ts`, `foxBox.ts`. Reference build:
[`docs/models/bunny-box.md`](models/bunny-box.md) · fold spec in
`src/core/fold/specs.ts` (cat/bear/fox alias the bunny's).

---

## 1. The shared recipe (geometry)

| Part | What it is | Stays the same across animals? |
|---|---|---|
| **Body** | Open tray (ECMA C10): base + 4 walls, 4 corner glue flaps wrapping onto the end walls | ✅ identical |
| **Ears** | **Rigid** extensions of the **TOP side wall** — *no crease at their base*, so they stand straight up when the wall folds | 🔶 **outline changes per animal** |
| **Lid** | Tuck-top: BACK wall → lid panel (L×W) → chamfered tuck flap that tucks into the front (opens & closes) | ✅ identical |
| **Face** | `Dieline.decorations` — filled/stroked **PRINT** shapes (eyes, nose, cheeks, mouth, inner-ears), recolourable | 🔶 **shapes change per animal** |

**Orientation rule (don't get it wrong):** the **eared wall is the TOP side
wall** (`base-side1`), so the flat net reads **right-side-up** — ears point up,
face below. (The first cut put the ears on the bottom wall → the printed bunny
was upside-down on the sheet.)

**Flat size:** `width = 2H + L`, `height = earH + 2H + 2W + tuckD`
(the extra `W + tuckD` is the lid panel + tuck below the back wall).
`earH = clamp(H·1.2, 16 mm, H·2.4)`, `tuckD = clamp(H·0.7, 8 mm, H − relief)`.

**Layers:** one closed **cut** outline · **10 creases** (4 base↔wall + 4
wall↔corner-flap + `back-lid` + `lid-tuck`) · **glue** = the 4 corner flaps
(the lid is friction-tuck, no glue on top).

### The printable face = `Dieline.decorations`

Named groups of colour shapes that are **PRINT, not cut** — they render in the
2D canvas, the gallery thumbnail, the 3D preview, and **PDF + SVG** exports;
**DXF ignores them** (a cutter file has no colour). Each group is recolourable in
the editor's **Face colours** card (and the mobile **Face** tab); overrides live
in `decorColors` (keyed by group id), persist to localStorage with the design,
and apply to the canvas + every export + the 3D decal. The model only supplies
defaults. See `src/core/types.ts` `Decoration`.

---

## 2. The 3D fold (reuse the Fold Engine — NO bespoke renderer)

The body is an open tray, so the animal folds through the **Fold Engine** by
reusing the open-tray crease scheme. Do **not** write a bespoke three.js closure.

- **Crease ids** (set on the model's crease polylines): `base-side1` = the eared
  **FACE** wall · `base-side2` = the **BACK** wall (grows the lid) · `base-end1`,
  `base-end2` = the two side walls · `end1-flap1/2`, `end2-flap1/2` = the 4
  corner glue flaps · `back-lid` · `lid-tuck`.
- **Root:** publish **only `panels.base`** (the floor) and root there. Do **not**
  also publish `panels.front` — `rootFromFront` prefers `front`, which roots the
  fold at a wall and the box **stays flat**.
- **Spec:** `floor: true`, reuse `TRAY_HINGES`, plus the `back-lid` / `lid-tuck`
  hinges. The ears are part of the `base-side1` panel (their Q-curves flatten at
  fold time), so they stand up when that wall folds — nothing special needed.
- **Face in 3D = a print decal:** `buildDecorCtx` (engineRenderer) rasterises the
  decoration shapes onto a canvas at the dieline-trim size; the same flat-sheet
  UV mapping the Print&Cut artwork uses places the face on the front-wall panel
  and the inner-ears on the ears. Editor colours thread through (`Box3D`
  `decorColors` → `engineFoldable`) so the 3D matches the 2D.

---

## 3. The animation principle ⭐ (the part we tuned — keep it)

The slider runs **flat sheet (t = 1, "Open") → closed box (t = 0, "Closed")**.
The behaviour the owner wants, in plain words:

> **The face + ears open first and close last. Everything else waits until the
> face is past halfway, then folds in sequence. The tuck flap never moves until
> the face is past half.**

Concretely (windows are in `t`, where **t = 0 is closed**; they reverse for
opening):

| Hinge(s) | window `[t0, t1]` | role |
|---|---|---|
| `base-side1` (**FACE** + ears) | `[0.12, 0.44]` | opens FIRST / closes LAST |
| `back-lid` (lid over the top) | `[0.3, 0.6]` linear | waits until face ~56% open |
| `base-side2/end1/end2` + 4 corner flaps | `[0.4, 0.82]` | walls splay, after the lid |
| `lid-tuck` (tuck into front) | `[0.3, 0.5]` | stays tucked until face past half, then comes out **with the lid** |

So **opening** reads: face drops open → (face past half) lid lifts + tuck comes
out → walls splay. **Closing** reverses: walls fold up → lid folds over (+ tuck
tucks) → **face + ears close last**.

**Two non-obvious points that took iteration:**

1. **Tuck timing is a single window that serves both directions.** A low `lid-tuck`
   t0 (e.g. `[0.03,0.15]`) makes the tuck untuck FIRST when opening (flap flips
   out before the face moves — wrong). Setting `[0.3,0.5]` keeps it tucked until
   the face is past half. It's geometrically safe: the tuck sits *inside* the
   front wall, so the face swings open (outward) while the tuck stays put. The
   face still completes its close (t1 0.44) *after* the tuck (t1 0.5 → it tucks
   while the face is finishing) — the face is still the last wall to seat.
2. **Framing vs. animation is a real tension.** The face lies open as a forward
   "drawbridge" through most of the slider, so the only *compact* pose is
   near-closed. We frame the **closed box** so the finished product stays
   well-sized: `Box3D` uses `frameFold = 0.1` for animal boxes (not the default
   `1`), and `previewFold = 0` (closed) is the editor default + the thumbnail.
   The open animation overflows the frame — that's accepted; scroll-zoom to watch
   the full unfold.

**Gallery snapshot pose:** the generic ¾ turn faces the printed front *away* from
the camera. Give each animal a snapshot rotation (bunny: `y ≈ 0.45, x ≈ 0.1`) in
`boxSnapshot.ts` so the face stays toward the camera.

---

## 4. Building the next animal (the checklist)

1. Copy an existing spec file (e.g. `catBox.ts`) → `<animal>Box.ts`. It's a tiny
   `AnimalSpec` passed to `buildAnimalBox` — change **only**:
   - `earW` / `earH` / `earCentres` + **`drawEars`** (the ear outline: bunny =
     tall leaves; cat = triangles; bear = round domes; fox = pointed leaning out);
   - **`decorations`** (the face: inner-ears + eyes/nose/mouth/etc.). Order shapes
     back-to-front (a patch/muzzle before the features that sit on it).
2. The body, lid, crease ids, `panels.base`, flat-size formula, glue flaps and
   bleed all come from `buildAnimalBox` — nothing to redo.
3. Reuse the **same FoldSpec** — add `SPECS["<animal>-box"] = SPECS["bunny-box"];`
   in `specs.ts` (cat/bear/fox already do this). The animation is the family default.
4. Registry entry: `category: "party"`, `has3DPreview: true`, presets, build.
5. `previewFold["<animal>-box"] = 0` (registry); add the id to **`ANIMAL_BOX_IDS`**
   in `registry.ts` (one list — `Box3D.tsx` `frameFold 0.1` and `boxSnapshot.ts`'s
   straight front-on pose both read it via `isAnimalBox`).
6. Landing card with **`tags: ["Animal", …]`** (the `"Animal"` tag is the family
   marker — see §5) and `isNew: true`.
7. Tests: flat size, 10 creases, N face groups, ears above the front wall,
   "folds via the engine to a closed lidded box". Doc:
   `docs/models/<animal>-box.md` (copy bunny's) + link in `docs/README.md`.

**Gotchas to re-check each time:** ears on the TOP wall (right-side-up net) ·
publish only `panels.base` · `buildDecorCtx` guards `typeof document ===
"undefined"` (node smoke test) · snapshot pose faces the camera · a degenerate
dim must not crash the 3D (the `Box3D` guard + try/catch already cover it).

---

## 5. The "Animals" category

Animal boxes are their **own gallery category** (`"animals"`, the 2nd tab after
Boxes). There are **16** so far (bunny, cat, bear, fox, panda, pig, owl, dog,
lion, unicorn, frog, mouse, sheep + the seasonal bat, chick, reindeer).

The category membership is **derived from `ANIMAL_BOX_IDS`**, not hand-set per
model, so a new animal lands in the category automatically:

- `CategoryId` + `CATEGORIES` include `"animals"` (`registry.ts`);
- `registry.ts` runs `for (const m of MODELS) if (isAnimalBox(m.id)) m.category = "animals"`
  (the model literals still read `category: "party"` as a default — the loop is
  the source of truth), and `Landing.tsx` does the same to its gallery cards;
- the gallery tab (paw icon) + the `/docs` hub section + the homepage counts all
  appear automatically (they iterate `CATEGORIES`).

So: **add a new animal's id to `ANIMAL_BOX_IDS` and it's categorised, posed, and
fold-spec'd — no category edits.** Every animal also keeps the **`"Animal"` tag**
(first on its Landing card) for search/facets.

**Next (not built):** a dedicated keyword-rich **collection page** (`/animals`)
with seasonal sub-sections + FAQ + CollectionPage JSON-LD — the SEO asset above
the per-template pages. The category + the docs-hub section are the foundation.

---

## 6. IP & copyright — keep every animal generic

**Structure:** the open-tray + tuck-top body is built from public ECMA/FEFCO
formulas — no IP concern (same as the whole catalog).

**Faces & ears must be ORIGINAL GENERIC geometry** — built from primitives
(circles, triangles, leaves, stroked lines), **never traced from or styled after
a specific branded character**. That keeps us clear of the only real risk here,
which is **trademark / character-likeness**, not copyright (simple generic shapes
carry no protectable expression — for us or anyone).

**The output is the user's:** per `LICENSE`, generated dielines are theirs for
commercial use; a maker can sell the finished boxes. What a user prints via
Print & Cut is their own responsibility.

**Do NOT make a face resemble these (non-exhaustive danger list):**

| Animal | Stay clear of | Tell |
|---|---|---|
| Bunny | **Miffy / Nijntje** (enforced hard) | two dots + an × mouth → we use a triangle nose + smile |
| Cat | **Hello Kitty**, Pusheen | no-mouth + bow + yellow nose → we have a mouth + whiskers |
| Mouse | **Mickey** | the iconic two-perfect-circles-on-top silhouette / ratio |
| Bear | Pooh, Care Bears, Rilakkuma, Line "Brown" | belly badges, signature colour+marking combos |
| Fox / other | Pokémon (Eevee/Vulpix/Pikachu), Sonic, Disney/Pixar | any named mascot |

**Safe-by-construction checklist:** primitive shapes only · generic proportions ·
no signature accessory (bow, badge) · no signature colour+shape lock (recolourable
defaults help) · **if it makes you think of a specific brand, change it.**

This is a practical stance, not legal advice — a quick IP-lawyer review of the
gallery art is cheap insurance before a commercial launch.
