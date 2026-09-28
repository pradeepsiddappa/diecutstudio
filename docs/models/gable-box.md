# Gable Top Box (ECMA gable / favour box)

The peaked **"house / purse"** gift carton with a built-in **die-cut carry
handle** — a popular retail, gift, and party-favour box. A 4-wall tube whose top
forms a gabled roof: two roof panels rise to meet at a ridge (their handle slots
register into one handle) and two triangular gable ends fill the sides.

**Code:** `src/core/models/gableBox.ts`
**Status:** ✅ built — fully parametric `(L, W, H, thickness) → Dieline`
**Reference:** standard gable construction (ECMA gable / favour box; related to
the milk-carton gable top). No clean ECMA code — it's a craft/retail style.
**Implemented from:** public structural descriptions (inverted-V gable, 45°
gable, registered handle holes, tuck bottom). No proprietary file.

## Flat layout

```
        glue     Front(L)      Side(W)       Back(L)      Side(W)
      ┌────┬──────────────┬────────────┬──────────────┬────────────┐
      │    │  ┌────────┐  │     /\     │  ┌────────┐  │     /\     │  ← roof top edge (y = eave−S)
      │    │  │ (◯ ◯)  │  │    /  \    │  │ (◯ ◯)  │  │    /  \    │  ← handle slot in each roof;
      │ gl │  │ ROOF L │  │   / ear\   │  │ ROOF L │  │   / ear\   │     gable ears (apex height G)
      │ ue │  └────────┘  │  /__W___\  │  └────────┘  │  /__W___\  │
      ├════╪══════════════╪════════════╪══════════════╪════════════┤  ← EAVE creases
      │ gl │              │            │              │            │
      │ ue │   FRONT (L)  │  SIDE (W)  │   BACK (L)   │  SIDE (W)  │  H (walls)
      │    │              │            │              │            │
      ├════╪══════════════╪════════════╪══════════════╪════════════┤  ← bottom eave
      │    │  tuck + tongue   dust flap     (plain)       dust flap
      └────┴──────────────────────────────────────────────────────┘
```

- **Roof panels** (above Front & Back, width **L**): rectangles of height **S**
  (the slant), each with a centred rounded **handle slot**. They rotate up and
  meet at the ridge; the two slots align into the carry handle.
- **Top lock** (the authentic gable mechanism): each **roof panel** has two
  **lock ears** at its top corners (sticking above the ridge), and each
  **gable-end triangle** has a **slit** near its apex. When erected, the ears
  that meet at each gable end tuck into that triangle's slit → the top latches
  shut. Openable and **glue-free** (right for a handled gift box). The gable
  triangles are rigid (they fold in only at the eave — no centre crease).
- **Gable ends** (above each Side, width **W**): rigid triangles rising to an
  apex **G** above the eave, each with a **lock slit** near the apex.
- **Bottom:** a straight tuck — tuck panel + chamfered tongue off the Front, two
  dust flaps off the Sides, plain Back edge (same closure family as the STE).

## Dimension semantics

| Input | Meaning | Drives |
|---|---|---|
| **L** | front/back panel width (length) | roof-panel & wall width |
| **W** | side panel width (depth) | gable height `G = W/2`, slant `S`, tuck depth |
| **H** | wall height (to the eave) | body height only |

## Key formulas

| Quantity | Formula |
|---|---|
| Gable peak height | `G = W / 2`  (→ a 45° gable) |
| Roof slant height | `S = √(G² + (W/2)²) = W/√2 ≈ 0.707·W` |
| Glue flap | `min(0.5 in, 0.9·W)` |
| Handle slot | length `clamp(0.42·L, 40 mm, L−12 mm)`, height `14 mm`, fully rounded, centred, ~12 mm below the roof's top edge |
| Lock slit | gap from apex `clamp(0.28·G, 7 mm, 0.5·G)`; length **user-tunable** (`slitLen`), clamped to `[3 mm, G − gap − 5 mm]` so it never reaches the tip or the base |
| Bottom tuck depth | `W` (+ tongue) |

**Flat width** `= glue + 2L + 2W`
**Flat height** `= earH + S + H + (W + tongue)`  (lock ears + roof + walls + tuck bottom)

## Layers

| Layer | Contents |
|---|---|
| **cut** | the outer "house" outline (with roof lock ears) + 2 handle slots + 2 gable-triangle lock slits |
| **crease** | 16: 4 vertical walls + 4 eave + 4 lock-ear + 3 bottom eave + 1 tongue |
| **bleed** | contour offset (editor preview only; not exported) |
| **glue** | the manufacturer's joint, hatched |

## 3D fold preview

`has3DPreview: true`. The `gable` closure in `buildFoldable`: 4 walls + a closed
bottom + two roof panels (with punched handle slots + a dark fill) that lean to
the ridge at ∓45°, and two triangular gable ends standing vertical. The fold
slider splays the roof panels open and folds the gable ends down. The gallery
snapshot renders this model nearly **closed** (fold ≈ 0.05) so the peak + handle
read (most models snapshot partly-open to show flaps).

## Cutting / machine notes

- Blue = cut (outline + handle slots), red dashed = crease (walls, eaves, gable
  diagonals/centre, tuck folds).
- The two handle slots must **register** when erected — they're identical and
  centred so a hand passes through both.
- Exports carry **trim + fold only** (no bleed contour), like every model here.

## v1 limitations / future work

- **45° gable only** (`G = W/2`). Exposing `gableH` as a "roof pitch" field
  (a *roof height* parameter) would let the diagonals be
  `atan(G/(W/2))` and `S = √(G²+(W/2)²)`.
- Bottom is a simple tuck; an **auto-bottom / 1-2-3 lock** bottom (reusing
  `autoBottom.ts`) is the common heavier-duty variant.
- The 3D shows the gable ends as flat triangles folding down; the real favour
  box **pinches** them in along the centre crease (a closer animation is future).

## Changelog

- 2026-06-09 initial parametric build (gable + registered handle + tuck bottom)
  + gable 3D fold (roof panels to ridge, gable ends, punched handle). Geometry
  researched from public gable-carton references.
- 2026-06-09 added a **top lock** so the top latches shut (it previously had no
  holding mechanism). First as a front-roof tab → back-roof slit; then reworked to
  the **authentic gable mechanism** (matching a real gable box): two **lock ears**
  at each roof panel's top corners + a **slit** in each rigid gable-end triangle;
  the ears tuck into the slits. Shown in the dieline (ears + 2 triangle slits +
  ear creases) and 3D (ears at the ridge). Flat height grows by `earH`; 16
  creases; cut = outer + 2 handles + 2 triangle slits. Built parametrically from
  the standard public mechanism — not traced from any reference file.
- 2026-06-09 made the lock slit **tunable** (editor field "Lock slit length") and
  moved it **down off the apex** (a solid tip remains, so it can't tear). The
  length is clamped so it never reaches the apex tip or the triangle base.
