# Die Cut Studio — model docs

This folder documents **each box / die-cut model** in depth: its anatomy,
dimension semantics, parameters, formulas, and any cutting/printing quirks.

`CLAUDE.md` (repo root) is the high-level project overview. **This folder is the
per-model detail.** When you add a new die-cut type, add one file under
`models/` — don't bloat `CLAUDE.md`.

- **[box-styles-catalog.md](box-styles-catalog.md) — master list of every
  standard box style we can implement, with IP boundaries, references, and
  implementation roadmap. Read this before adding a new model.**
- [craft-dielines-catalog.md](craft-dielines-catalog.md) — the NON-BOX craft
  library (envelopes, tags, display cards, party, organizers, decor) with the
  same IP rules and roadmap.
- [print-and-cut.md](print-and-cut.md) — printing artwork on a piece and cutting
  it out: combined vs print/cut-pair export, per-machine setup, bleed/safe-area.
- [fold-engine.md](fold-engine.md) — Fold Engine v2 design: derive the 3D
  panels + hinges from the dieline itself; models supply fold DATA, not 3D
  code. Read before touching `src/core/fold/` or `src/ui/box3d/`.

## Index of models

| Model | Status | Doc | Code |
|-------|--------|-----|------|
| Straight Tuck End (STE) carton | ✅ built | [models/straight-tuck-end.md](models/straight-tuck-end.md) | `src/core/models/tuckEnd.ts` |
| Roll-End Tuck Top Mailer (RETT) | ✅ built | [models/roll-end-mailer.md](models/roll-end-mailer.md) | `src/core/models/rollEndMailer.ts` |
| Flip-Top Mailer | ✅ built (parametric) | [models/flip-top-mailer.md](models/flip-top-mailer.md) | `src/core/models/flipTopMailer.ts` |
| Reverse Tuck End (RTE) | ✅ built | [models/reverse-tuck-end.md](models/reverse-tuck-end.md) | `src/core/models/reverseTuckEnd.ts` |
| Auto-Bottom / Crash-Lock (B40) | ✅ built | [models/auto-bottom.md](models/auto-bottom.md) | `src/core/models/autoBottom.ts` |
| Tuck-Top Auto-Bottom (A65) | ✅ built | [models/tuck-top-auto-bottom.md](models/tuck-top-auto-bottom.md) | `src/core/models/tuckTopAutoBottom.ts` |
| Tuck-Top Snap-Lock (A60) | ✅ built | [models/snap-lock-bottom.md](models/snap-lock-bottom.md) | `src/core/models/snapLockBottom.ts` |
| Sealed-End / Glue Carton (B10) | ✅ built | [models/glue-carton.md](models/glue-carton.md) | `src/core/models/glueCarton.ts` |
| Simple Open Tray (C10) | ✅ built | [models/open-tray.md](models/open-tray.md) | `src/core/models/openTray.ts` |
| Hinged-Lid Tray (C30) | ✅ built | [models/hinge-lid-tray.md](models/hinge-lid-tray.md) | `src/core/models/hingeLidTray.ts` |
| Pillow Box (F7001 / E10) | ✅ built | [models/pillow-box.md](models/pillow-box.md) | `src/core/models/pillowBox.ts` |
| Open Sleeve (D10) | ✅ built | [models/open-sleeve.md](models/open-sleeve.md) | `src/core/models/openSleeve.ts` |
| Drawer Box (sleeve + tray) | ✅ built | [models/drawer-box.md](models/drawer-box.md) | `src/core/models/drawerBox.ts` |
| Regular Slotted Container (RSC, FEFCO 0201) | ✅ built | [models/rsc.md](models/rsc.md) | `src/core/models/rsc.ts` |
| Tray + Lid (Full Telescope, ECMA C20 / FEFCO 0301) | ✅ built | [models/tray-lid.md](models/tray-lid.md) | `src/core/models/trayLid.ts` |
| Gable Top Box (peaked handle carton) | ✅ built | [models/gable-box.md](models/gable-box.md) | `src/core/models/gableBox.ts` |
| Heart Box (two-piece hat-box construction) | ✅ built | [models/heart-box.md](models/heart-box.md) | `src/core/models/heartBox.ts` |
| Hexagon Box (hexagonal prism) | ✅ built | [models/hex-box.md](models/hex-box.md) | `src/core/models/hexBox.ts` |
| Hexagon Box + Lid (two-piece openable) | ✅ built | [models/hex-tray-lid.md](models/hex-tray-lid.md) | `src/core/models/hexTrayLid.ts` |
| Gift Tag (craft — luggage/scallop/ticket) | ✅ built | [models/gift-tag.md](models/gift-tag.md) | `src/core/models/giftTag.ts` |
| Envelope (craft — A-style / baronial + liner) | ✅ built | [models/envelope.md](models/envelope.md) | `src/core/models/envelope.ts` |
| Earring Display Card (craft — stud / dangle) | ✅ built | [models/earring-card.md](models/earring-card.md) | `src/core/models/earringCard.ts` |
| Cupcake Wrapper (craft — scalloped frustum) | ✅ built | [models/cupcake-wrapper.md](models/cupcake-wrapper.md) | `src/core/models/cupcakeWrapper.ts` |
| Belly Band (craft — wrap strip, glue/tuck-lock) | ✅ built | [models/belly-band.md](models/belly-band.md) | `src/core/models/bellyBand.ts` |
| Napkin Ring (craft — belly-band wrap, scallop edge) | ✅ built | [models/napkin-ring.md](models/napkin-ring.md) | `src/core/models/napkinRing.ts` |
| Bunting Pennant (craft — triangle/swallowtail/scallop) | ✅ built | [models/bunting-pennant.md](models/bunting-pennant.md) | `src/core/models/buntingPennant.ts` |
| Party Hat (craft — cone hat, scallop/straight base, 3D) | ✅ built | [models/party-hat.md](models/party-hat.md) | `src/core/models/partyHat.ts` |
| Cake Topper (craft — flat shape + stick-holder tab) | ✅ built | [models/cake-topper.md](models/cake-topper.md) | `src/core/models/cakeTopper.ts` |
| Place Card / Table Tent (craft — folded standing card) | ✅ built | [models/place-card.md](models/place-card.md) | `src/core/models/placeCard.ts` |
| Gift-Card Holder (craft — folded + corner slits) | ✅ built | [models/gift-card-holder.md](models/gift-card-holder.md) | `src/core/models/giftCardHolder.ts` |
| Floss Bobbin (craft — Organize, spool winder card) | ✅ built | [models/floss-bobbin.md](models/floss-bobbin.md) | `src/core/models/flossBobbin.ts` |
| Necklace / Bracelet Card (craft — Display Cards) | ✅ built | [models/necklace-card.md](models/necklace-card.md) | `src/core/models/necklaceCard.ts` |
| Hair-Bow / Clip Card (craft — Display Cards) | ✅ built | [models/hair-bow-card.md](models/hair-bow-card.md) | `src/core/models/hairBowCard.ts` |
| Jar / Product Label (craft — rect/oval/scallop) | ✅ built | [models/jar-label.md](models/jar-label.md) | `src/core/models/jarLabel.ts` |
| Bookmark (craft — rounded/pointed/scallop) | ✅ built | [models/bookmark.md](models/bookmark.md) | `src/core/models/bookmark.ts` |
| Paper Rosette / Fan Medallion (craft — Party) | ✅ built | [models/paper-rosette.md](models/paper-rosette.md) | `src/core/models/paperRosette.ts` |
| Pyramid Favor Pouch (craft — Party) | ✅ built | [models/favor-pouch.md](models/favor-pouch.md) | `src/core/models/favorPouch.ts` |
| Layered Paper Flower (craft — Party) | ✅ built | [models/paper-flower.md](models/paper-flower.md) | `src/core/models/paperFlower.ts` |
| Paper Lantern (craft — Decor) | ✅ built | [models/paper-lantern.md](models/paper-lantern.md) | `src/core/models/paperLantern.ts` |
| 3D Folded Star (craft — Decor) | ✅ built | [models/folded-star.md](models/folded-star.md) | `src/core/models/foldedStar.ts` |
| Geometric Snowflake (craft — Decor) | ✅ built | [models/snowflake.md](models/snowflake.md) | `src/core/models/snowflake.ts` |
| Bunny Treat Box (animal — Party; printable face) | ✅ built | [models/bunny-box.md](models/bunny-box.md) · [animal-boxes.md](animal-boxes.md) | `src/core/models/bunnyBox.ts` |
| Cat Treat Box (animal — Party) | ✅ built | [models/cat-box.md](models/cat-box.md) | `src/core/models/catBox.ts` |
| Bear Treat Box (animal — Party) | ✅ built | [models/bear-box.md](models/bear-box.md) | `src/core/models/bearBox.ts` |
| Fox Treat Box (animal — Party) | ✅ built | [models/fox-box.md](models/fox-box.md) | `src/core/models/foxBox.ts` |
| Panda Treat Box (animal — Party) | ✅ built | [models/panda-box.md](models/panda-box.md) | `src/core/models/pandaBox.ts` |
| Pig Treat Box (animal — Party) | ✅ built | [models/pig-box.md](models/pig-box.md) | `src/core/models/pigBox.ts` |
| Owl Treat Box (animal — Party) | ✅ built | [models/owl-box.md](models/owl-box.md) | `src/core/models/owlBox.ts` |
| Dog Treat Box (animal — Party) | ✅ built | [models/dog-box.md](models/dog-box.md) | `src/core/models/dogBox.ts` |
| Lion Treat Box (animal — Party) | ✅ built | [models/lion-box.md](models/lion-box.md) | `src/core/models/lionBox.ts` |
| Unicorn Treat Box (animal — Party) | ✅ built | [models/unicorn-box.md](models/unicorn-box.md) | `src/core/models/unicornBox.ts` |
| Frog Treat Box (animal — Party) | ✅ built | [models/frog-box.md](models/frog-box.md) | `src/core/models/frogBox.ts` |
| Mouse Treat Box (animal — Party) | ✅ built | [models/mouse-box.md](models/mouse-box.md) | `src/core/models/mouseBox.ts` |
| Sheep Treat Box (animal — Party) | ✅ built | [models/sheep-box.md](models/sheep-box.md) | `src/core/models/sheepBox.ts` |
| Bat Treat Box (animal — Party; Halloween) | ✅ built | [models/bat-box.md](models/bat-box.md) | `src/core/models/batBox.ts` |
| Chick Treat Box (animal — Party; Easter) | ✅ built | [models/chick-box.md](models/chick-box.md) | `src/core/models/chickBox.ts` |
| Reindeer Treat Box (animal — Party; Christmas) | ✅ built | [models/reindeer-box.md](models/reindeer-box.md) | `src/core/models/reindeerBox.ts` |

> **Animal boxes are a family.** Before adding cat / bear / fox / etc., read the
> **[animal-boxes playbook](animal-boxes.md)** — they share one body, lid, fold
> animation, and printable-face pipeline; only the ear outline + face shapes
> change.

See **[box-styles-catalog.md](box-styles-catalog.md)** for the full roadmap
(40+ standard styles classified by ECMA/FEFCO with status and notes).

## How to add a new model

1. Implement the pure function in `src/core/models/<yourModel>.ts`
   (`(params) => Dieline`), all geometry in points. Add a holding mechanism
   (tuck/glue/lock/friction) — every model must actually close.
2. Register it in `src/core/models/registry.ts`: add the `ModelId`, a
   `ModelEntry` (name, description, `defaultDimensions`, `build`,
   `has3DPreview`), and put it in the `MODELS` array. The editor + gallery
   dispatch through this automatically.
3. (Optional but preferred) give it a 3D fold: name its creases (`Polyline.id`)
   and add a small `FoldSpec` in `src/core/fold/specs.ts` (fold angles + timing)
   — the Fold Engine derives the panels from the dieline (see
   [fold-engine.md](fold-engine.md)). Shapes that roll or bow instead of folding
   get a bespoke renderer in `src/ui/box3d/foldable.ts`. Set `has3DPreview: true`;
   no real fold yet → `has3DPreview: false` (never a faked box).
4. Add a gallery card to `src/ui/pages/Landing.tsx` (the `TEMPLATES` list).
5. Add tests to `tests/diecut.test.ts` (flat-size formula, crease count, PDF
   page size) and verify in-browser.
6. Document it: copy `models/_TEMPLATE.md` → `models/<your-model>.md`, add a row
   to the index table above, mark the style **built** in
   `box-styles-catalog.md`.

## Shared conventions (all models)

- **Units:** all geometry in **points** (1 in = 72 pt). Convert at the UI/export
  boundary only. See `src/core/units.ts`.
- **Coordinate system:** top-left origin, y-down (SVG style). DXF flips y.
- **Primitive:** everything is a `Polyline` (arcs pre-flattened) so PDF/SVG/DXF
  stay identical. See `src/core/geometry.ts`.
- **Layers:** `cut` (blue), `crease` (red dashed), `bleed` (green dashed),
  `glue` (grey hatch). Defined in `src/core/types.ts` → `LAYER_STYLES`.
- **A model returns a `Dieline`** = layered polylines + physical bounds + bleed +
  preview annotations (labels, dimension arrows).
- **Output is the unfolded flat sheet**, always larger than the folded box.
