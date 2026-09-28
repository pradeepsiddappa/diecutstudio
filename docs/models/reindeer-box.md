# Reindeer Treat Box

Animal-box family member (Christmas). **Same body, lid, fold animation and
printable-face pipeline as the [Bunny Treat Box](bunny-box.md)** — see the
**[animal-boxes playbook](../animal-boxes.md)**. Only the ears and face differ.

- **Model:** `src/core/models/reindeerBox.ts` (spec) on `animalBox.ts` · **id:** `reindeer-box`
- **Category:** party · **Status:** built (folds + opens/closes in 3D)

## What's different from the bunny

- **"Ears" = ANTLERS:** two branchy antlers, each a **3-point sawtooth** (outer
  tine → main beam tip → inner tine) via a small `antler()` helper. The spikes are
  separate up-down peaks along the top edge, so the outline never self-intersects
  (the lesson from the frog) — the family's first branchy-protrusion silhouette.
- **Face (5 recolourable groups):** `ears` (brown ovals flanking the upper face,
  below the antlers), `muzzle` (a tan oval), `eyes` (dark discs), `nose` (a dark
  oval), `mouth` (a stroked smile).
- **IP note:** the nose is brown/dark, **not** a glowing red one — a red-nosed
  reindeer evokes a specific trademarked character. The geometry stays generic
  (playbook §6).

Everything else is the family default.
