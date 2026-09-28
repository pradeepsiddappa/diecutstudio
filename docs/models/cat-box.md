# Cat Treat Box

Animal-box family member. **Same body, lid, fold animation and printable-face
pipeline as the [Bunny Treat Box](bunny-box.md)** — read the
**[animal-boxes playbook](../animal-boxes.md)** for all the shared mechanics.
Only the ears and the face differ.

- **Model:** `src/core/models/catBox.ts` (spec) on `src/core/models/animalBox.ts`
  (shared builder) · **id:** `cat-box`
- **Category:** party · **Status:** built (folds + opens/closes in 3D)

## What's different from the bunny

- **Ears:** two upright **pointed triangles** at the top corners
  (`earW = L·0.17`, `earH = clamp(H·0.7, 12 mm, H·1.3)`, centres `H + L·0.22` /
  `H + L·0.78`).
- **Face (5 recolourable groups):** `ears` (inner-ear triangles, pink), `eyes`
  (dark discs), `nose` (small pink triangle), `mouth` (a stroked `:3`), and
  `whiskers` (three stroked lines per side).

Everything else — the four-corner glued open-tray body, the tuck-top lid, the 10
creases (open-tray ids + `back-lid`/`lid-tuck`), the glue flaps, the fold spec
(`SPECS["cat-box"]` aliases the bunny's), `frameFold 0.1`, `previewFold 0`, and
the snapshot pose — is the family default.
