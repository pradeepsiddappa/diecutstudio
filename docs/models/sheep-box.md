# Sheep Treat Box

Animal-box family member. **Same body, lid, fold animation and printable-face
pipeline as the [Bunny Treat Box](bunny-box.md)** — see the
**[animal-boxes playbook](../animal-boxes.md)**. Only the ears and face differ.

- **Model:** `src/core/models/sheepBox.ts` (spec) on `animalBox.ts` · **id:** `sheep-box`
- **Category:** party · **Status:** built (folds + opens/closes in 3D)

## What's different from the bunny

- **"Ears":** the whole top edge is a **row of woolly bumps** (the fleece) — a
  loop of small Q-curve domes across `[X1, X2]` (count derived from `L`), instead
  of two distinct ears. This is the family's first scalloped-top silhouette.
- **Face (5 recolourable groups):** `ears` (two floppy tan ovals at the sides of
  the face), `face` (a tan lamb-face oval), `eyes` (dark discs), `nose` (a dark
  oval), `mouth` (a stroked smile). Order: ears → face → features.

Everything else is the family default.
