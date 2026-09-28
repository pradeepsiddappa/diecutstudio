# Lion Treat Box

Animal-box family member. **Same body, lid, fold animation and printable-face
pipeline as the [Bunny Treat Box](bunny-box.md)** — see the
**[animal-boxes playbook](../animal-boxes.md)**. Only the ears and face differ.

- **Model:** `src/core/models/lionBox.ts` (spec) on `animalBox.ts` · **id:** `lion-box`
- **Category:** party · **Status:** built (folds + opens/closes in 3D)

## What's different from the bunny

- **Ears:** two **small round** ears at the corners.
- **Face (6 recolourable groups):** `mane` (a golden spiky sun-burst — the lion's
  signature, drawn first/behind), `ears` (inner-ear discs), `face` (a cream disc
  on the mane), `eyes` (dark discs), `nose` (a dark triangle), `mouth` (a stroked
  cat-style smile). Order: mane → face → features so they layer on top.

The mane is a `burst()` star polygon (alternating outer/inner radii). Everything
else is the family default.
