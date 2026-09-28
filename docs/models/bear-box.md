# Bear Treat Box

Animal-box family member. **Same body, lid, fold animation and printable-face
pipeline as the [Bunny Treat Box](bunny-box.md)** — read the
**[animal-boxes playbook](../animal-boxes.md)** for all the shared mechanics.
Only the ears and the face differ.

- **Model:** `src/core/models/bearBox.ts` (spec) on `src/core/models/animalBox.ts`
  (shared builder) · **id:** `bear-box`
- **Category:** party · **Status:** built (folds + opens/closes in 3D)

## What's different from the bunny

- **Ears:** two **round dome** ears at the top corners (two quadratics rounding
  over the top; `earW = L·0.18`, `earH = clamp(H·0.34, 11 mm, H·0.6)` so the bump
  reads round, centres `H + L·0.24` / `H + L·0.76`).
- **Face (5 recolourable groups):** `ears` (inner-ear discs, tan), `muzzle` (a
  light tan disc the nose/mouth sit on — drawn before them so they layer on top),
  `eyes` (dark discs), `nose` (a dark disc), `mouth` (a stroked smile).

Everything else is the family default (see the playbook): open-tray body,
tuck-top lid, 10 creases, glue flaps, the shared fold spec, `frameFold 0.1`,
`previewFold 0`, snapshot pose.
