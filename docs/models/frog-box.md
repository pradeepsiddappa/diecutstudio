# Frog Treat Box

Animal-box family member. **Same body, lid, fold animation and printable-face
pipeline as the [Bunny Treat Box](bunny-box.md)** — see the
**[animal-boxes playbook](../animal-boxes.md)**. Only the ears and face differ.

- **Model:** `src/core/models/frogBox.ts` (spec) on `animalBox.ts` · **id:** `frog-box`
- **Category:** party · **Status:** built (folds + opens/closes in 3D)

## What's different from the bunny

- **"Ears":** the frog's two **bulging eyes** — two round bumps on top, close but
  **non-overlapping** (centres `0.31L` / `0.69L`, `earW 0.16L`; the bumps must not
  intersect or the cut outline self-intersects and panelize fails).
- **Face (5 recolourable groups):** `skin` (green front-face patch + fills on the
  two bumps), `eyes` (white discs on the bumps), `pupils` (dark), `nostrils` (two
  dots), `mouth` (a wide stroked grin). Order: skin → eyes → pupils.

Everything else is the family default.
