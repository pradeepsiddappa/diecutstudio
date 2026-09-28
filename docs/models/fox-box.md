# Fox Treat Box

Animal-box family member. **Same body, lid, fold animation and printable-face
pipeline as the [Bunny Treat Box](bunny-box.md)** — read the
**[animal-boxes playbook](../animal-boxes.md)** for all the shared mechanics.
Only the ears and the face differ.

- **Model:** `src/core/models/foxBox.ts` (spec) on `src/core/models/animalBox.ts`
  (shared builder) · **id:** `fox-box`
- **Category:** party · **Status:** built (folds + opens/closes in 3D)

## What's different from the bunny

- **Ears:** two **tall pointed triangles** whose tips lean slightly outward
  (`earW = L·0.15`, `earH = clamp(H·0.9, 14 mm, H·1.6)`, centres `H + L·0.2` /
  `H + L·0.8`).
- **Face (5 recolourable groups):** because the box is white paperboard, the fox
  colour is PRINTED — `ears` (orange inner-ear triangles), `face` (a big orange
  inverted-triangle face patch), `snout` (a white inverted triangle on top of the
  orange), `eyes` (dark discs), `nose` (a dark triangle at the snout tip). Order
  matters: the orange patch is drawn before the white snout, which is drawn before
  the eyes/nose, so they layer correctly.

Everything else is the family default (see the playbook): open-tray body,
tuck-top lid, 10 creases, glue flaps, the shared fold spec, `frameFold 0.1`,
`previewFold 0`, snapshot pose.
