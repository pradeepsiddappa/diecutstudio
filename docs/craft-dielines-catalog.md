# Craft die-lines catalog — beyond boxes

Companion to [`box-styles-catalog.md`](box-styles-catalog.md). This is the
master library of **non-box** die-cut templates for the craft audience
(Cricut/Silhouette owners, handmade sellers, party & wedding DIY, small-batch
makers). Same rules as the box catalog: **every item is a parametric pure
function `(dimensions) → Dieline`, derived from public-domain functional
geometry — never traced from anyone's file.**

**Status legend:** ✅ built · 🟡 next batch · 🟠 near-term · 🔵 mid-term · ⚪ future · ⚠️ IP-check first

---

## 1. IP ground rules for craft items (read first)

The box-catalog rules carry over, plus craft-specific ones:

- ✅ **Functional/geometric forms are safe** — envelopes, tags, pennants,
  rosettes, display cards, pouches, wrappers, organizers. These are
  centuries-old utilitarian shapes; copyright does not protect function or
  basic geometry.
- ✅ **Generic decorative geometry is safe** — scalloped edges, geometric
  snowflakes, polygon stars, accordion rosettes, spiral roses. Math, not art.
- ❌ **Never copy a specific crafter's/marketplace design** — a particular
  artistic SVG (e.g. a specific mandala, a hand-drawn floral) is copyrighted
  expression even when the *category* is generic. We generate our own geometry.
- ❌ **No licensed characters, logos, or trademarked phrases** — ever.
- ⚠️ **Text-based items need font licensing** — cake toppers / word banners
  require letterforms; font files are copyrighted. Path: ship only
  **SIL OFL fonts** (open license permits commercial embedding) or generate
  geometry-only bases and let users add text in their cutter software (which
  uses *their* licensed fonts). Start geometry-only.
- ⚠️ **A few mechanisms are patented** — rare for paper craft, but check novel
  post-2000 "auto-pop" or licensed pop-up systems. Classic v-fold /
  parallel-fold / accordion mechanisms are centuries old and safe.

---

## 2. Shared primitives to build once (multiplier investments)

These small geometry generators unlock dozens of catalog items:

| Primitive | Used by | Status |
|---|---|---|
| **Scalloped / wavy edge** generator (arc-flattened, params: radius, count) | tags, cupcake wrappers, banners, labels, doily edges | ✅ `scallopEdge` in `src/core/craft.ts` |
| **Perforation / tear-strip** line style (dash-cut segments on the cut layer) | tickets, coupon edges, tear-open pouches | ⚪ |
| **Slot + tab pair** (sized to caliper) | display stands, cake-topper sticks, interlocking decor | ✅ `slotForTab`/`slotCut`/`tabEdgePts` in `craft.ts` |
| **Hole / hole-array** punch (single, grid, radial) | earring cards, tags, lacing edges, mobiles | ✅ `circleCut`/`holeGrid`/`holeRing` in `craft.ts` |
| **Rounded-rect / pill / stadium** (✅ exists in `features.ts`) | everywhere | ✅ |
| **Regular polygon + star polygon** generator | stars, snowflakes, rosette centers, gift toppers | ⚪ |

---

## 3. The catalog

### A. Envelopes & card bases (papercraft core)

| Item | Description | Params | Status |
|---|---|---|---|
| **Envelope (square flap)** | classic gummed envelope, any size (A2, A7, square, mini presets) | card W×H, flap depth | ✅ ([envelope.md](models/envelope.md)) |
| **Envelope (pointed/baronial flap)** | the formal invitation envelope | same | ✅ (same model, `flap: "pointed"`) |
| **Envelope liner** | auto-sized to any envelope above | derived | ✅ (same model, `liner: true` — a 2nd piece) |
| **Gate-fold card base** | two panels folding to the centre | W×H | 🟠 |
| **Tri-fold / Z-fold card base** | classic brochure folds | panel W×H | 🟠 |
| **Easel card base** | folds into a self-standing easel | W×H | 🟠 |
| **Gift-card holder** | folded holder with retaining slits for a credit-card blank | card size std | ✅ ([gift-card-holder.md](models/gift-card-holder.md)) |
| **Money / voucher holder** | slim folded wallet | bill size | 🔵 |
| **Pop-up card base (v-fold)** | the classic public-domain pop-up mechanism, blank | W×H, fold angle | 🔵 |
| **Photo / polaroid frame card** | aperture card sized to a print | print size | 🔵 |

### B. Tags, labels & wraps

| Item | Description | Params | Status |
|---|---|---|---|
| **Gift tag set** | luggage-tag, scallop, ticket shapes + reinforced hole | W×H, hole ⌀ | ✅ ([gift-tag.md](models/gift-tag.md)) |
| **Belly band** | wrap band for soap / cards / napkins (catalog D20 cousin) | girth, band W | ✅ ([belly-band.md](models/belly-band.md)) |
| **Candy-bar wrapper** | full chocolate-bar wrap with end folds | bar L×W×T | 🟠 |
| **Cupcake wrapper** | the scalloped frustum wrap | base ⌀, top ⌀, H | ✅ ([cupcake-wrapper.md](models/cupcake-wrapper.md)) |
| **Jar label set** | rect / oval / scallop labels sized to a jar | jar ⌀, H | ✅ ([jar-label.md](models/jar-label.md)) |
| **Treat-bag topper** | fold-over header for a cello bag (+ optional hang hole) | bag W, fold H | 🟠 |
| **Seed packet** | small glued pouch | W×H | 🔵 |
| **Straw flags / drink tags** | wrap-around pennant for straws | flag W×H | 🔵 |
| **Bookmark** | rounded / pointed / scallop strip + tassel hole | W×H | ✅ ([bookmark.md](models/bookmark.md)) |

### C. Product display cards (the handmade-seller line)

High-value: small sellers buy these in bulk and want their own sizes.

| Item | Description | Params | Status |
|---|---|---|---|
| **Earring display card** | stud + dangle variants: hole pairs, hook slits, optional hang hole | card W×H, hole layout | ✅ ([earring-card.md](models/earring-card.md)) |
| **Necklace / bracelet card** | flat (slits to wrap the chain) + hourglass **fold-over** (folds at the waist, slots top & bottom) | card W×H | ✅ ([necklace-card.md](models/necklace-card.md)) |
| **Hair-bow / clip card** | slot pair for clips | card W×H | ✅ ([hair-bow-card.md](models/hair-bow-card.md)) |
| **Keychain display card** | reinforced hang hole + hook slot | card W×H | 🔵 |
| **Sticker backing card** | header + grip area for sticker sheets | sheet size | 🔵 |
| **Header card for bagged product** | fold-over stapled header (+ euro slot — ✅ feature exists) | bag W | 🟠 |
| **Soap wrap / band** | belly band variant with tuck | bar L×W×T | 🟡 |

### D. Party & events

| Item | Description | Params | Status |
|---|---|---|---|
| **Bunting / banner pennants** | triangle, swallowtail, scallop shapes + lacing holes | flag W×H | ✅ ([bunting-pennant.md](models/bunting-pennant.md)) |
| **Paper rosette / fan medallion** | accordion-folded disc (strip + centre disc) | ⌀, pleat depth | ✅ ([paper-rosette.md](models/paper-rosette.md)) |
| **3D paper bow** | the classic loop-strip gift bow | loop L, count | 🟠 (deferred — a first pass pivoted to the Layered Paper Flower; a true ribbon bow is future) |
| **Party hat (cone)** | sector-of-circle cone + chin-strap holes | head ⌀, height | 🔵 |
| **Christmas cracker** | tube + crimp zones (perforation primitive) | barrel ⌀, L | 🔵 |
| **Place card / table tent** | folded standing card | W×H | ✅ ([place-card.md](models/place-card.md)) |
| **Cake-topper base** | circle/heart/star/polygon on a slotted stick mount — geometry-only (text via user's fonts) | shape ⌀, stick W | 🟠 |
| **Napkin ring** | interlocking band (slot+tab) | girth | 🔵 |
| **Cutlery pouch** | flat folded pocket | W×H | 🔵 |
| **Pyramid favor box** | square base + 4 fold-up triangular walls (glue tabs) | base, H | ✅ ([favor-pouch.md](models/favor-pouch.md)) |
| **Favor pouch (self-closing petal)** | round-bottom petal-close pouch | ⌀, H | 🔵 |

### E. Organizers, tools & studio

| Item | Description | Params | Status |
|---|---|---|---|
| **Embroidery-floss bobbins** | the classic winding card, ganged n-up | bobbin size | 🟡 |
| **Yarn / ribbon wrap cards** | larger winding cards | W×H | 🔵 |
| **Drawer divider strips** | slotted interlocking grid (slot+tab primitive) | drawer L×W×H, cells | 🟠 |
| **Desk / drawer tray** | = open tray (✅ built) with shallow presets | L×W×H | ✅ reuse |
| **Planner pocket / divider / page flags** | punched for ring systems (A5, personal, HP) | system preset | 🔵 |
| **Photo corners** | classic fold-over corners, ganged | photo size | 🔵 |
| **Stencil blanks** | registration-marked frames for user artwork | sheet size | ⚪ |

### F. Decorations

| Item | Description | Params | Status |
|---|---|---|---|
| **3D star (folded)** | n-point star from scored polygon geometry | ⌀, points | ✅ ([folded-star.md](models/folded-star.md)) |
| **Geometric snowflakes** | parametric 6-fold geometry (OUR generated patterns) | ⌀, complexity | ✅ ([snowflake.md](models/snowflake.md)) |
| **Paper lantern** | the classic slit-cylinder lantern | ⌀, H, slits | ✅ ([paper-lantern.md](models/paper-lantern.md)) |
| **Rolled rose / spiral flower** | spiral cut that rolls into a rose | ⌀ | 🟠 |
| **Petal flowers (layered)** | parametric petal sets to layer | ⌀, petals | ✅ ([paper-flower.md](models/paper-flower.md)) |
| **Honeycomb decoration** | glued-strip honeycomb ball/shape | ⌀ | ⚪ |
| **Wreath base ring** | flat ring (+ optional tabs) | outer/inner ⌀ | 🔵 |
| **Garland chain links** | interlocking strips | link size | ⚪ |

---

## 4. Engineering notes

- **Most items are FLAT** — no 3D fold needed (`has3DPreview: false`), so they
  are far cheaper to build than boxes: geometry + tests + flat preview + doc.
  Items with a simple fold (envelope, tent card, rosette) can get a 3D closure
  later; never block shipping on 3D.
- **Same pipeline, same gates** — Spec → Digital-verified → Cut-tested ✓
  Flat items make Gate 3 fast (cut one sheet).
- **Categories in the gallery** — ✅ DONE (2026-06-11): registry entries carry a
  `category` field (`CategoryId` + `CATEGORIES` in `registry.ts`); the landing
  gallery renders one tab per category that has built items ("All" + Boxes +
  Tags & Wraps today) and filters the grid.
- **n-up by default** — ✅ machinery DONE: `ModelEntry.preferSheetExport`
  defaults the editor to Full-sheet (imposed) export for ganged small items;
  nobody cuts ONE tag. Set it on every small flat item.
- **Flat items in the editor** — `ModelEntry.flat: true` hides the 3D pane
  entirely (canvas dieline = the preview) and `dimLabels` renames/hides the
  L/W/H inputs (`null` hides — e.g. H on a tag).
- **Presets are the product** — "A2 envelope", "fits a 12mm stud earring",
  "Mason jar 8oz label": each preset is one line of data and a shareable URL.

## 5. Suggested build order (craft value ÷ effort)

1. ~~**Gift tag set** + scalloped-edge primitive~~ — ✅ DONE 2026-06-11
   (Craft Batch 0: also shipped the hole/hole-array + caliper-aware slot+tab
   primitives, gallery category tabs, and the flat-item editor machinery)
2. ~~**Envelopes** (square + pointed flap, with liner + card-size presets)~~ —
   ✅ DONE 2026-06-11 (one `envelope` model: both flap styles + optional liner
   piece + A-size presets via the new `ModelEntry.presets` mechanism; flat, 3D
   fold later)
3. ~~**Earring display card** (stud + dangle) — handmade-seller flagship~~ — ✅ DONE
   2026-06-11 (one `earring-card` model: stud/dangle styles, N pair rows,
   optional hang hole, size presets; flat, gangs many-up) + **3 creative
   extensions**: card SHAPE (rect/scallop/arch/tag-top), fold-over HEADER
   (double-thick hang area, self-registered hang hole), EASEL stand (2nd piece,
   slot+tab strut — first product to ship the slot+tab primitive).
4. ~~**Cupcake wrapper**~~ — ✅ DONE 2026-06-11 (frustum-unroll annular sector +
   scalloped arc + bespoke rolling-cone 3D).
5. ~~**Belly band / soap band**~~ — ✅ DONE 2026-06-11 (girth-sized strip, glue /
   tuck-lock closure; bespoke wrapped-loop 3D).
6. ~~**Bunting pennants**~~ — ✅ DONE 2026-06-11 (triangle/swallowtail/scallop +
   lacing holes; opened the Party tab).
7. ~~**Place card / table tent**, **gift-card holder**, **floss bobbins**~~ — ✅
   DONE 2026-06-11 (tent 3D; photo-corner slits; I-beam winder → Organize tab).
8. ~~**Display & labels batch**~~ — ✅ DONE 2026-06-13 (necklace card [+ fold-over
   style], hair-bow card, jar label, bookmark). ~~**Party batch**~~ — ✅ DONE
   2026-06-15 (rosette, favor pouch, layered flower [pivoted from the "3D bow"]).
   ~~**Decor batch**~~ — ✅ DONE 2026-06-17 (lantern, folded star, snowflake).
9. **Next: organizers** (drawer dividers, tool holders) + remaining decor
   (spiral rose 🟠, honeycomb, wreath, garland).

---

When an item is built: mark it ✅ here, add `docs/models/<item>.md`, list it in
`docs/README.md`, and log it in `CLAUDE.md` — same convention as boxes.
