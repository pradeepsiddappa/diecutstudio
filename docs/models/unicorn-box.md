# Unicorn Treat Box

Animal-box family member. **Same body, lid, fold animation and printable-face
pipeline as the [Bunny Treat Box](bunny-box.md)** — see the
**[animal-boxes playbook](../animal-boxes.md)**. Only the ears and face differ.

- **Model:** `src/core/models/unicornBox.ts` (spec) on `animalBox.ts` · **id:** `unicorn-box`
- **Category:** party · **Status:** built (folds + opens/closes in 3D)

## What's different from the bunny

- **Ears + horn:** two pointed ears at the corners **plus a centre HORN** — the
  horn is the tallest element (its tip is the top of the net, `earH` = horn
  height; the ears are ~55% of that). `drawEars` draws left ear → horn → right ear.
- **Face (5 recolourable groups):** `horn` (a golden triangle over the centre
  horn), `ears` (pink inner triangles), `mane` (a pastel forelock — a few locks
  hanging onto the forehead), `eyes` (stroked downward lash curves — happy closed
  eyes), `cheeks` (pink blush discs).

Everything else is the family default. Note: because the horn defines the net's
top, the per-animal flat-size test uses `earH` = the horn height.
