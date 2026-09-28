# Box-styles catalog — intensive library reference

This is the **master library** of every standard die-cut box style we can
implement in Die Cut Studio without IP/copyright/patent risk. ~100 styles
across folding cartons (ECMA), corrugated (FEFCO), and classic/specialty,
indexed by classification AND by use case so you can find what you need
either way.

**Two foundational promises:**

1. **Every style here is a public-domain industry standard.** Centuries-old
   geometry, documented in publicly-available industry references (ECMA,
   FEFCO, packaging textbooks). No patent risk for standard styles.
2. **We build everything ourselves from formulas.** We never copy SVG files,
   source code, or proprietary assets from other dieline tools. The dieline output and
   the code that generates it are 100% original.

If you ever see ⚠️ **FLAG** next to a style, that's an IP-sensitive item to
research before building.

---

## Table of contents

1. [IP & legal stance](#1-ip--legal-stance-read-first)
2. [Standards & references](#2-reference-standards--sources)
3. [Folding cartons (ECMA Classes A-F)](#3-folding-carton-styles-paperboard)
4. [Corrugated styles (FEFCO)](#4-corrugated-styles-shipping--industrial)
5. [Food service & QSR](#5-food-service--qsr-specialty)
6. [Beverage packaging](#6-beverage-packaging)
7. [Retail display](#7-retail-display)
8. [Pharma & healthcare](#8-pharma--healthcare)
9. [Gift, luxury & specialty](#9-gift-luxury--specialty)
10. [Roadmap by phase](#10-implementation-roadmap-by-phase)
11. [Lookup by use case](#11-quick-lookup-by-use-case)
12. [Flag list](#12-flag-list-proprietary--research-first)
13. [Build conventions](#13-build-conventions-so-quality-stays-high)

**Status legend:**
- ✅ **built** — parametric, in gallery
- 🔄 **in progress** — being rewritten
- 🟡 **Phase 1** — committed for next batch
- 🟠 **Phase 2** — committed near-term
- 🔵 **Phase 3** — committed mid-term
- ⚪ **future** — long tail, on-demand
- ⚠️ **flagged** — needs IP/research review before building

---

## 1. IP & legal stance (read first)

### What is safe
- ✅ Implementing standard box styles from published industry standards
  (ECMA, FEFCO, etc.)
- ✅ Using industry-standard names ("Straight Tuck End", "Reverse Tuck End",
  "Crash-Lock Bottom", "Roll-End Tuck Top")
- ✅ Computing geometry from formulas published in packaging engineering
  references (Calver's _Packaging Design_, _Paperboard Packaging Handbook_,
  Pira/Smithers references)
- ✅ Looking at competitor tools' output as a **visual reference** to confirm
  we understand a standard style correctly
- ✅ Generating dielines for users that they own, sell, license, or modify
  freely

### What we don't do (and why)
- ❌ Copy SVG/DXF/PDF files from other tools into our codebase or output
  (copyright on the artistic expression of a specific dieline file)
- ❌ Use competitor trademarks as our brand names (e.g. don't market a feature
  as "a competitor name" in the public UI)
- ❌ Reverse-engineer or decompile competitor source code
- ❌ Claim affiliation with any commercial dieline service
- ❌ Implement a **specific patented mechanism** without verifying the patent
  is expired or licensed (these are RARE — see [Flag list](#12-flag-list-proprietary--research-first))

### Why standard box styles aren't patentable

Three reasons converge:
1. **Prior art** — most styles date to the 1800s-1900s and have been used
   industrially for generations. No novelty to patent.
2. **Functional geometry** — a "rectangle with flaps" is a functional shape;
   geometry that exists purely to enable a function (folding into a box) is
   weak-to-impossible to patent.
3. **Industry standardization** — ECMA and FEFCO publish their codes as
   reference standards specifically so the industry can interoperate. They
   are not exclusive licenses.

Formulas like `glue_flap_width = 0.4 × W` are mathematics; mathematics is
not patentable in the US (35 USC §101 abstract-idea exclusion) and is
similarly excluded in EPO jurisprudence.

### Where to be careful

- **Novel post-2000 locking mechanisms** sometimes have active patents (e.g.
  some specific auto-lock variants from packaging manufacturers). Always
  cross-check before implementing a SPECIFIC unusual mechanism. ⚠️
- **Branded/named proprietary boxes** (specific trademarked lock variants) — we don't implement these by name. We can
  implement the GENERIC equivalent (e.g. "snap-lock auto-bottom") which is
  the underlying public-domain style. ⚠️
- **Decorative/embossing patterns** specific to a brand (e.g. a flagship brand packaging aesthetic) — geometry can be implemented, brand artwork can't.
- **Specialty pharmaceutical safety features** (child-resistant closures,
  anti-counterfeit tabs) — these are often patented. ⚠️

When in doubt, **flag it** and we'll research before implementing.

---

## 2. Reference standards & sources

| Standard | Covers | Where to find |
|---|---|---|
| **ECMA Code** | Folding cartons (paperboard, ~0.012–0.040 in caliper) | Published by European Carton Makers Association. Full code book ~€300 from ECMA. Structure widely documented online (Wikipedia, packaging textbooks). |
| **FEFCO codes** | Corrugated boxes (single/double/triple wall) | Free PDF from [fefco.org](https://www.fefco.org). Universal reference for shipping/transport packaging. |
| **ISO 21067** | Generic packaging terminology | Industry standard for terms ("primary"/"secondary"/"tertiary" packaging etc.) |
| **Calver, _Packaging Design_** | Practical engineering formulas | General textbook reference |
| **_Paperboard Packaging Handbook_** | Detailed folding-carton engineering | Industry reference |
| **TAPPI standards** | Material specs for paperboard / corrugated testing | Free abstracts at tappi.org |
| **DIN 55540** | German folding-carton standard | Companion to ECMA |
| **Pira/Smithers reports** | Industry analysis / format trends | Paid reports, but free summaries widely available |

The ECMA codes used in this catalog are **approximate** — I'm confident about
the categories (A-tuck, B-glued-bottom, C-tray, D-sleeve, E-specialty) and
the well-known specific codes (A55 RTE etc.), but a few specific numeric
codes should be **verified against the ECMA reference book** before being
treated as authoritative. Common names are unambiguous regardless.

---

## 3. Folding-carton styles (paperboard)

### Class A — Tuck-end cartons
The friction-fit closure family. Most retail product cartons are in this class.

| ECMA¹ | Common name | Description | Status | Notes |
|---|---|---|---|---|
| A10 | **Sealed-End Carton** | Both ends fully glued, no flap closures. Liquid-tight food/dairy. | ⚪ future | Glue-only, no tuck |
| A20 | **Reverse Tuck Glued** | RTE pattern but glued at one end (typically bottom). | ⚪ future | Hybrid A55 + glue |
| A50 | **Straight Tuck End (STE)** | Both tucks fold off the SAME panel (typically back). Friction-fit top + bottom. | ✅ **built** — `tuckEnd.ts` | card-box reference; parametric, all L/W/H |
| A55 | **Reverse Tuck End (RTE)** | Tucks fold off OPPOSITE panels (top off back, bottom off front). The most common cosmetic carton form. | ✅ **built** — `reverseTuckEnd.ts` (parametric, all L/W/H reshape) | Was SVG-import, rewritten Phase 1 |
| A57 | **Reverse Tuck with Thumb Cut** | RTE + half-moon thumb cut on front for easy opening | 🟢 **DONE** | `thumb-notch` overlay (`features.ts`); toggle on A55. See `docs/features.md` |
| A60 | **Tuck-Top Snap-Lock Bottom (1-2-3)** | Friction tuck on top, snap-lock (1-2-3) bottom — no glue. | ✅ **built** | `snapLockBottom.ts` (straight tuck top + glue-free 1-2-3 bottom) |
| A65 | **Tuck-Top Auto-Bottom** | Friction tuck on top, glued crash-lock bottom that pops into shape when squeezed. | ✅ **built** | `tuckTopAutoBottom.ts` (straight tuck top + crash-lock bottom) |
| A67 | **Reverse Tuck with Auto-Bottom** | Combination of A55 + B40 | ✅ **built** | = our `autoBottom.ts` (reverse-tuck top + crash-lock bottom) |
| A70 | **Edge-Lock Tuck End** | Tuck with edge-locking tabs for secure closure. | ⚪ future | |
| A75 | **Mitered/Chamfered Tuck End** | Standard tuck with chamfered tongue corners for cleaner closure. | ⚪ future | Variant of A50/A55 |
| A80 | **Tuck-End with Locking Tabs** | Tabs slot into matching cuts in the side wall | ⚪ future | |
| A85 | **Friction-Fit with Relief Cuts** | Pharma standard — relief cuts on flap shoulders allow cleaner re-closing | ⚪ future | |
| A87 | **Tuck-End with Window Cut** | Any A-class + circular/rect window cut + acetate area | 🟢 **Phase 3 — DONE** (rect window, STE/RTE) | `features.ts` overlay; see `docs/features.md` |
| A89 | **Tuck-End with Euro Hanger Slot** | Punched hole at top for peg display | 🟢 **Phase 3 — DONE** (inverted-T, STE/RTE) | `features.ts` overlay; see `docs/features.md` |

### Class B — Glued / auto-lock cartons
Cartons where one end is glued (typically the bottom) so the closure works without separate assembly.

| ECMA¹ | Common name | Description | Status | Notes |
|---|---|---|---|---|
| B10 | **Standard Glue Carton** | Both ends glued. Pharma / dry food standard. | ✅ **built** | `glueCarton.ts` (sealed-end, both ends glued) |
| B20 | **Glue-End / Tuck-Top** | Glued bottom, tuck top. | ⚪ future | |
| B40 | **Auto-Bottom / Crash-Lock** | Glued bottom that auto-locks when carton is squared. Open-and-go for retail packers. | ✅ **built** | `autoBottom.ts` |
| B45 | **Six-Corner Auto-Bottom** | Extra-rigid auto-bottom for heavier products | ⚪ future | |
| B50 | **Six-Corner Beer Carrier** | Glued tray with handle — beer/wine multi-pack. | ⚪ future | |
| B55 | **Click-Lock Bottom** | Mechanical lock without glue | ⚪ future | ⚠️ Some variants patented |
| B60 | **Snap-Lock Auto-Bottom** | Auto-bottom variant with locking tabs (no glue needed). | ⚪ future | |
| B65 | **Auto-Bottom with Reinforced Corners** | Extra panels at corners for heavy products | ⚪ future | |
| B70 | **Closed Sealed End** | Both ends fully sealed (pharma blister carriers) | ⚪ future | |
| B80 | **Six-Corner Glue Carton** | Premium retail; extra rigidity | ⚪ future | |

### Class C — Trays
Open-top containers, often with separate or hinged lids.

| ECMA¹ | Common name | Description | Status | Notes |
|---|---|---|---|---|
| C10 | **Simple Open Tray (4-corner glued)** | Basic rectangular tray, glued at 4 corners. | ✅ **built** | `openTray.ts` |
| C15 | **Open Tray with Thumb Notches** | Display tray with finger access cutouts | 🔵 Phase 3 | |
| C20 | **Tray + Separate Lid (Telescope)** | Tray with a slide-on/lift-off lid. | ✅ **built** | `trayLid.ts` (full telescope; composes C10 ×2) |
| C25 | **Tray + Slip-On Cover (Shallow)** | Cover covers only top edge, ~25% of tray height | ⚪ future | |
| C30 | **Hinged-Lid Tray (one-piece)** | Tray with the lid attached on one edge. | ✅ **built** | `hingeLidTray.ts` (open-tray base + hinged lid + front tuck) |
| C35 | **Auto-Erect Tray (snap-lock corners)** | Pops into shape from flat | ⚪ future | |
| C40 | **Display Tray with Riser/Header** | Front-cut tray + back riser for branding. | 🔵 Phase 3 | |
| C45 | **Compartment Tray (with dividers)** | Tray with built-in or insertable dividers | ⚪ future | |
| C50 | **Stackable Tray** | Trays that nest/stack with locating tabs | ⚪ future | |
| C55 | **Beverage Tray (cup wells)** | Carrier with shaped wells for cups | ⚪ future | |
| C60 | **Bakery Tray + Window** | Tray + window cut + plastic insert | ⚪ future | Food service |
| C65 | **Donut Box** | Standard pastry tray with window option | ⚪ future | |

### Class D — Sleeves
Open-ended tubes, typically used as outer wrappers or as inner liners.

| ECMA¹ | Common name | Description | Status | Notes |
|---|---|---|---|---|
| D10 | **Open Sleeve (both ends open)** | Tube — slips over an inner tray. Premium cosmetics, soaps. | ✅ **built** | `openSleeve.ts` |
| D15 | **Closed-End Sleeve** | Sleeve with one end tucked closed. | ⚪ future | |
| D20 | **Belly Band Sleeve (narrow)** | Narrow band wrap, ~30% of product height | ⚪ future | |
| D25 | **Full-Wrap Sleeve** | Single panel that wraps fully around contents, glued | ⚪ future | Multi-pack outer wrap |
| D30 | **Sleeve with Window** | Open or closed sleeve + product window | 🔵 Phase 3 | |
| D35 | **Hexagonal Sleeve** | 6-sided slip sleeve | ⚪ future | |

### Class E — Specialty / decorative
Non-rectangular shapes for specific products or gift presentation.

| ECMA¹ | Common name | Description | Status | Notes |
|---|---|---|---|---|
| E10 | **Pillow Box** | Curved-end "pillow" shape. Gift cards, jewelry, lip products. | ✅ **built** | `pillowBox.ts` |
| E15 | **Pillow Box with Window** | Pillow + center window | 🔵 Phase 3 | Toggle on E10 |
| E20 | **Pyramid Box** | Triangular pyramid with tuck closure. Promotional. | ⚪ future | |
| E25 | **Truncated Pyramid (Frustum)** | Pyramid with flat top | ⚪ future | |
| E30 | **Gable Top / Milk Carton** | Peaked-top carton with handle. Beverages, take-out food. | ✅ **built** | `gableBox.ts` (gable + handle, tuck bottom) |
| E35 | **Gable Box (Gift)** | Gable top + handle as gift box | ✅ **built** | `gableBox.ts` (same model) |
| E40 | **Cone Box** | Conical, popcorn or single-serve snacks. | ⚪ future | |
| E45 | **Cone with Spiral Lock** | Cone closed via spiral seam | ⚪ future | |
| E50 | **Hexagonal Carton** | 6-sided body with hex top/bottom. Decorative. | ✅ **built** | `hexBox.ts` (single-piece, glued) + `hexTrayLid.ts` (two-piece openable) |
| E55 | **Octagonal Carton** | 8-sided body. Premium cosmetics. | ⚪ future | |
| E60 | **Triangular Carton** | 3-sided body (toblerone-style). | ⚪ future | |
| E65 | **Heart-Shaped Box** | Heart-outlined carton. Valentine's/wedding. | ⚪ future | |
| E70 | **Star-Shaped Carton** | Star outline. Kids / holiday. | ⚪ future | |
| E75 | **House-Shaped (Gift)** | House silhouette with peaked roof | ⚪ future | |
| E80 | **Crown / Tiara Box** | Crown profile (kids/birthday) | ⚪ future | |

### Class F — Bags (paper bag patterns)
Optional category — not strictly "die-cut boxes" but commonly bundled.

| ECMA¹ | Common name | Description | Status | Notes |
|---|---|---|---|---|
| F10 | **Flat-Bottom Paper Bag** | Standard grocery / takeout bag | ⚪ future | Outside core scope |
| F15 | **SOS Bag (self-opening square)** | Pre-creased bag that opens to square shape | ⚪ future | |
| F20 | **Gusseted Bag** | Side-pleated bag | ⚪ future | |
| F25 | **Wine Bottle Bag (gift)** | Tall narrow bag for wine | ⚪ future | |

---

## 4. Corrugated styles (shipping / industrial)

Larger boxes, B-flute / C-flute / E-flute corrugated board (3–8mm thick).
Documented in FEFCO codes ([free PDF from fefco.org](https://www.fefco.org)).

### 02 — Slotted commercial (most common)

| FEFCO | Common name | Description | Status | Notes |
|---|---|---|---|---|
| **0201** | **Regular Slotted Container (RSC)** | The classic shipping box. 4 flaps top + bottom, opposing flaps meet at center. | ✅ **built** | `rsc.ts` |
| **0202** | **Overlap Slotted Container (OSC)** | RSC with outer flaps fully overlapping for extra strength. | ⚪ future | Heavy-duty shipping |
| **0203** | **Full Overlap Slotted** | Both inner and outer flaps overlap fully. Max strength. | ⚪ future | |
| **0204** | **Center Special Slotted** | All 4 flaps meet at center top and bottom | ⚪ future | |
| **0205** | **Center Special Overlap** | Center-meet with overlap reinforcement | ⚪ future | |

### 03 — Telescope (two-piece)

| FEFCO | Common name | Description | Status | Notes |
|---|---|---|---|---|
| **0301** | **Two-Piece Tray + Cover** | Tray bottom + telescoping cover (separate pieces). | ✅ **built** | `trayLid.ts` (= ECMA C20) |
| **0302** | **Tray + Slip-On Cover** | Shallow cover variant | ⚪ future | |
| **0304** | **Full Telescope** | Cover and tray same height, full overlap | ✅ **built** | `trayLid.ts` default (`lidDepth = H`) is exactly this |
| **0310** | **Postal/Mailing Tube** | Cylindrical mailing tube | ⚪ future | Special: cylinder geometry |

### 04 — Folder type (one-piece)

| FEFCO | Common name | Description | Status | Notes |
|---|---|---|---|---|
| **0401** | **One-Piece Folder** | Single sheet folded around contents | ⚪ future | |
| **0402** | **Tray with Overlapping Flaps** | One-piece tray with sealed top | ⚪ future | |
| **0421** | **Half-Slotted Container (HSC)** | RSC with no top flaps — open top | ⚪ future | For liners or trays |
| **0427** | **Roll-End Tuck Top Mailer (RETT)** | Amazon-style mailer. Flat → assembles via side walls + tuck. | ✅ **built** — `rollEndMailer.ts` | Already in gallery |
| **0470** | **Tray w/ Self-Locking Walls + Hinged Lid** | FEFCO Group 04 folder: self-locking tray base + hinged tongue-slot lid. (NOT a book wrap — corrected 2026-06-10.) ~= our C30 Hinged-Lid Tray. | ⚪ future | A true variable-depth book-wrap *mailer* is a separate 04xx folder; the hidden Roll-End Mailer covers book/tablet shipping |
| **0472** | **One-Piece Dispatch Box** | Auto-locking dispatch mailer | ⚪ future | |
| **0473** | **Flip-Top Mailer** | Hinged top mailer with closure tongue. | ✅ **built** — `flipTopMailer.ts` (parametric, all L/W/H reshape) | Was an SVG import, rewritten Phase 1 |

### 09 — Rigid / specialty
Higher-strength / specialty corrugated.

| FEFCO | Description | Status |
|---|---|---|
| **0900-series** | Wedge-shape, hexagonal, multi-wall variants | ⚪ future |

---

## 5. Food service & QSR specialty

These are not in ECMA/FEFCO but are well-established public-domain forms.

| Common name | Description | Status | Notes |
|---|---|---|---|
| **Pizza box** | Square corrugated tray with hinged lid | ⚪ future | Specialty corrugated |
| **Cake box** | Tall tray + lift-off lid for layer cakes | ⚪ future | Variants: 6"/8"/10"/12" |
| **Cupcake box (single)** | Small box with internal divider | ⚪ future | |
| **Cupcake box (4-pack)** | 2×2 tray with insert | ⚪ future | |
| **Cupcake box (6-pack)** | 2×3 with handle option | ⚪ future | |
| **Cupcake box (12-pack)** | 3×4 with carry handle | ⚪ future | |
| **Macaron box** | Long narrow box, often window-cut | ⚪ future | |
| **Donut box** | Wide flat box, window optional | ⚪ future | |
| **Cookie box** | Square shallow box | ⚪ future | |
| **Bakery tray + window** | Open tray with film window | ⚪ future | |
| **Pie box** | Square box sized for 9"/10" pies | ⚪ future | |
| **Sandwich wedge** | Triangular cardboard sleeve | ⚪ future | |
| **Burger clamshell** | 2-half hinged container | ⚪ future | Printed paperboard |
| **Hot dog tray** | Boat-shape tray | ⚪ future | |
| **French fry container** | Tapered open-top container | ⚪ future | |
| **Chinese takeout pail** | Foldable food container, wire handle | ⚪ future | Wire handle is separate part |
| **Sushi tray** | Shallow tray + transparent lid | ⚪ future | Plastic lid usually |
| **Coffee cup carrier (2-cup)** | 2-well drink carrier | ⚪ future | |
| **Coffee cup carrier (4-cup)** | 4-well drink carrier | ⚪ future | |
| **Pizza slice holder** | Triangular sleeve for individual slice | ⚪ future | |
| **Salad bowl wrap** | Sleeve around plastic salad bowl | ⚪ future | |
| **Noodle/ramen bowl wrap** | Insulating sleeve | ⚪ future | |

---

## 6. Beverage packaging

| Common name | Description | Status | Notes |
|---|---|---|---|
| **Single wine bottle box** | Tall narrow box for 1 bottle | ⚪ future | |
| **2-bottle wine carrier** | Side-by-side with divider | ⚪ future | |
| **3-bottle wine carrier** | Triangular or in-line | ⚪ future | |
| **4-bottle wine carrier** | 2×2 layout | ⚪ future | |
| **6-bottle wine carrier** | 2×3 layout with handle | ⚪ future | |
| **12-bottle wine case** | 3×4 layout (corrugated) | ⚪ future | |
| **Champagne single box** | Premium gift box for 1 bottle | ⚪ future | |
| **Spirit bottle gift box** | Magnetic-close box ⚠️ FLAG | ⚪ future | ⚠️ magnetic close often patented; generic equivalent OK |
| **Beer 4-pack carrier** | Glued tray + handle | ⚪ future | |
| **Beer 6-pack carrier** | Standard cardboard carrier | ⚪ future | B50 variant |
| **Mug box** | Square box with internal padding cutouts | ⚪ future | |
| **Tumbler/glass box** | Tall narrow box with foam cutouts | ⚪ future | |
| **Cocktail kit box** | Multi-compartment tray with lid | ⚪ future | |

---

## 7. Retail display

Not for product PROTECTION but for in-store PRESENTATION.

| Common name | Description | Status | Notes |
|---|---|---|---|
| **Counter Display Unit (CDU)** | Small countertop display with header | ⚪ future | |
| **Floor Display Unit (FDU)** | Full-height standing display | ⚪ future | Multi-component |
| **Sidekick display** | Narrow display attached to gondola end | ⚪ future | |
| **Power wing display** | Side-of-shelf clip-on display | ⚪ future | |
| **Header card** | Tall printed card above product display | ⚪ future | Often a separate piece |
| **Shelf-ready display tray** | Tray that ships with product, opens to display | ⚪ future | |
| **PDQ tray** (Product-Display-Quickly) | Pre-packed retail display tray | ⚪ future | |
| **Endcap display** | Display unit for store endcap | ⚪ future | |
| **Tabletop display** | Small showcase for trade shows | ⚪ future | |
| **Pop-up display stand** | Easel-fold standing display | ⚪ future | |
| **Brochure holder** | Wall/desk mount paper holder | ⚪ future | |
| **Postcard display** | Tiered card display | ⚪ future | |

---

## 8. Pharma & healthcare

⚠️ This category has more IP/regulatory concerns than others. Many child-resistant
features, anti-counterfeit features, and serialization mechanisms are patented.

| Common name | Description | Status | Notes |
|---|---|---|---|
| **Standard pharma carton (tuck)** | Generic tuck-end with insert area | ⚪ future | Safe — generic A50 with insert spec |
| **Standard pharma carton (glued)** | Glued-end variant | ⚪ future | Safe — generic B10 |
| **Multi-pack pharma carton** | Carton sized for blister packs | ⚪ future | Safe |
| **Vial tray** | Tray with circular wells for vials | ⚪ future | |
| **Blister card carrier** | Carton sized for blister packs | ⚪ future | |
| **Sample/single-dose carton** | Small carton for unit dose | ⚪ future | |
| **Child-resistant tuck-end** ⚠️ | Tuck with locking mechanism requiring squeeze-to-open | ⚠️ flagged | Multiple patents — research before building |
| **Tamper-evident snap band** ⚠️ | Carton with tear-strip indicating opening | ⚠️ flagged | Some variants patented |
| **Serialized track-and-trace carton** ⚠️ | Unique barcode/QR area | ⚠️ flagged | Software/serialization, not pure geometry |
| **Veterinary multi-pack carton** | Sized for vet products | ⚪ future | |

---

## 9. Gift, luxury & specialty

| Common name | Description | Status | Notes |
|---|---|---|---|
| **Rigid telescoping ("set-up") box** | Premium box with separate lid — heavy board | ⚪ future | Different manufacturing (rigid board) |
| **Magnetic-close gift box** ⚠️ | Lid closes via embedded magnets | ⚠️ flagged | Specific mechanisms patented; generic flap-close OK |
| **Drawer-style gift box** | Outer sleeve + inner sliding tray | ⚪ future | |
| **Book-style gift box** | Hinged "book" with ribbon close | ⚪ future | |
| **Ribbon-handle gift box** | Box with ribbon as integrated handle | ⚪ future | |
| **Watch box** | Pillow-fit interior for watch + receipt area | ⚪ future | |
| **Ring box** | Small hinged jewelry box | ⚪ future | |
| **Necklace box** | Long flat box with internal holder | ⚪ future | |
| **Pen box** | Long narrow box for pen + pads | ⚪ future | |
| **Phone/tablet gift box** | Sized for device + accessories | ⚪ future | device-style proportions OK; brand artwork NOT |
| **Cufflink box** | Small specialty box | ⚪ future | |
| **Apparel folding box** | Shallow tray for folded clothes | ⚪ future | Shirt/tie box |
| **Subscription box (monthly)** | Branded mailer with custom internals | ⚪ future | Body is generic; artwork is brand |
| **Truffle/chocolate divider tray** | Tray with internal compartments | ⚪ future | |
| **Tea sampler box** | Small compartment grid + lid | ⚪ future | |
| **Candle box (single)** | Sized for jar/pillar candle | ⚪ future | |
| **Candle box (set)** | Multi-compartment | ⚪ future | |
| **Soap box** | Tuck or sleeve sized for bar soap | ⚪ future | |

---

## 10. Implementation roadmap by phase

This is the **committed** order of implementation. Items below Phase 4 are
on-demand from the long-tail catalog above.

### ✅ Already built (parametric)
1. **Straight Tuck End (STE)** — `src/core/models/tuckEnd.ts`
2. **Roll-End Tuck Top Mailer (RETT)** — `src/core/models/rollEndMailer.ts`

### ✅ Phase 1 — Parametric rewrites (complete)
3. **Reverse Tuck End (RTE)** — ✅ **DONE** — rewritten as parametric
4. **Flip-Top Mailer** — ✅ **DONE** — rewritten as parametric

### 🟡 Phase 2 — New parametric models (this batch)
5. **Auto-Bottom / Crash-Lock** (ECMA B40) — ✅ **DONE** — `autoBottom.ts`
6. **Simple Open Tray** (ECMA C10) — ✅ **DONE** — `openTray.ts`
7. **Pillow Box** (ECMA E10 / F7001) — ✅ **DONE** — `pillowBox.ts`
8. **Open Sleeve** (ECMA D10) — ✅ **DONE** — `openSleeve.ts`

**Phase 2 COMPLETE: 8-model gallery (6 cartons/trays/sleeves shown + 2 mailers
in the registry), fully parametric, covers most indie packaging.**

### 🟠 Phase 2 — Common variations
9. Tuck-Top Auto-Bottom (A65) — ✅ **DONE** — `tuckTopAutoBottom.ts`
10. Tuck-Top Snap-Lock Bottom (A60) — ✅ **DONE** — `snapLockBottom.ts`
11. Standard Glue Carton (B10) — ✅ **DONE** — `glueCarton.ts`
12. Reverse Tuck with Thumb Cut (A57) — ✅ **DONE** — `thumb-notch` overlay (`features.ts`)
13. Hinged-Lid Tray (C30) — ✅ **DONE** — `hingeLidTray.ts`
14. Tray + Separate Lid (C20)
15. Gable Top / Milk Carton (E30)
16. Regular Slotted Container — RSC (FEFCO 0201)
17. Book/Tablet Mailer — covered by the hidden Roll-End Mailer (the Amazon-style
    tray + tuck-top book/tablet shipper); a variable-depth roll-over book *wrap*
    is a separate future item. (FEFCO 0470 ≠ book wrap — it's a self-locking
    hinged-lid tray, ~= our C30.)

**End of Phase 2: ~17 models, covers indie + small-business + e-commerce.**

### 🔵 Phase 3 — Toggleable features + specialty
18. **Window cut** option (toggle on tuck-ends, trays, sleeves) — ✅ **DONE**
19. **Euro hanger slot** option (toggle on tuck-ends) — ✅ **DONE**
20. **Thumb notch** option (toggle on tuck-ends) — ✅ **DONE** (`thumb-notch`, RTE / A57)
21. **Crease perforation** vs solid crease (toggle, manufacturing detail)
22. Display Tray with Riser (C40)
23. Open Tray with Thumb Notches (C15)
24. Sleeve with Window (D30)
25. Pillow Box with Window (E15)
26. Hexagonal Carton (E50)

**End of Phase 3: ~26 models + modifiers. Comprehensive coverage.**

### 🔧 3D visualization backlog
- **Gable top-lock 3D** — the Gable Top Box dieline is correct (handle-flap
  corner tabs + fold crease below the notch + gable-end slits, two tabs per
  slit), but the 3D fold preview of the lock isn't right yet, so the gallery card
  is **pulled** for now (model still works in the editor). Rebuild needs a
  confirmed mechanism + reference (see "specs needed" below).

  **Specs needed to get the gable-lock visualization right:**
  1. **Mechanism**: which edge each lock tab folds from (handle-flap top edge vs
     a side edge), where the fold crease sits relative to the notch, and how the
     two tabs seat in a single slit (layered front/back? side by side? one
     through, one behind?).
  2. **Reference**: an annotated dieline (mark the fold line, the tab, the slit)
     OR photos of the *assembled* lock from 2–3 angles, OR a short folding
     clip/GIF. A single flat dieline alone leaves the 3D kinematics ambiguous.
  3. **Closed-state target**: what the locked top should look like (tabs flush /
     tucked under / tips poking out of the slit).
  4. **Animation**: should the fold-and-tuck animate with the fold slider, or is
     a correct static closed pose enough?

### ⚪ Phase 4 (on-demand) — Long tail
- Food service: pizza, cake, cupcake variants, donut, bakery tray
- Beverage: wine carriers (1/2/3/4/6/12), beer carriers, mug box
- Retail display: CDU, FDU, sidekick, header card
- Gift/luxury: drawer-style, book-style, watch box, jewelry boxes
- Specialty shapes: pyramid, cone, octagonal, heart, star
- Industrial corrugated: OSC, Full Overlap, telescope

---

## 11. Quick lookup by use case

If you know what you need to pack but not which standard style, start here.

### Cosmetics & beauty
- **Mascara / lipstick / lip balm:** RTE (A55), Pillow Box (E10), Pen Box
- **Cream jars / serums:** STE (A50), B10 glue carton
- **Bar soap:** D10 sleeve, A50 tuck
- **Multi-pack gift set:** B40 auto-bottom, C20 tray + lid, drawer-style

### Pharma
- **Tablet/capsule blister packs:** A50/A55 tuck, B10 glue
- **Liquid medicine bottles:** B10 glue (sealed end)
- **Single-dose samples:** Small tuck
- ⚠️ Child-resistant: research-first

### Food
- **Chocolate bars:** A55 RTE (tall slim) — tested in your reference
- **Confectionery pralines:** C20 tray + lid, drawer-style
- **Cookies/biscuits:** B40 auto-bottom, A60 tuck-top snap-lock
- **Tea bags:** A50/A55, B10
- **Cereal:** B10 glue carton (large)
- **Bakery:** C10 tray, donut box, cake box, pizza box

### E-commerce & shipping
- **Books / tablets:** FEFCO 0470 mailer
- **General mailer:** FEFCO 0427 RETT (✅ built), 0473 Flip-Top (🔄)
- **Heavy shipping:** FEFCO 0201 RSC (Phase 2)
- **Subscription:** 0473 Flip-Top with custom interior

### Gift & luxury
- **Gift cards:** E10 pillow box
- **Watches / jewelry:** Rigid telescope, drawer-style, book-style
- **Premium liquor:** Rigid box, magnetic-close ⚠️ (use generic flap close)
- **Apparel:** C30 hinged tray

### Beverage
- **Single wine bottle:** Sleeve + tray combo
- **6-pack beer/wine:** B50 six-corner carrier
- **Mug/glass:** Custom internal padded box

### Retail / display
- **Counter top:** CDU
- **Floor:** FDU
- **Peg hook:** A50/A55 + Euro slot

---

## 12. Flag list (proprietary / research-first)

Items we should NOT implement without further IP research:

| Item | Why flagged | Generic equivalent (safe) |
|---|---|---|
| **A proprietary trademarked auto-bottom** | Trademarked + specific patented mechanism | B40 standard auto-bottom |
| **A proprietary engineered carton** | Proprietary engineered design | B-class glued cartons |
| **Amazon "Frustration-Free Packaging" specific mailers** | Some variants patented | FEFCO 0427 / 0473 mailers |
| **A premium-brand precision-fit cosmetic box** | Geometry can be generic; exact dimensions/finish proprietary | Rigid telescope, drawer-style |
| **Child-resistant pharma closures (CRC)** | Often patented; safety-critical regulation | Standard pharma carton; CRC requires licensing |
| **Tamper-evident snap-bands** | Some variants patented | Tuck end + tear-perforated strip (generic) |
| **Magnetic-close gift boxes** | Specific mechanisms patented | Flap-close or magnetless lid lock |
| **Specific brand artwork/embossing** | Always copyrighted | Design your own |
| **A proprietary food multi-pack** | Proprietary | Multi-compartment tray |
| **A proprietary blister carrier** | Proprietary blister carrier | Standard B10 glue carton |
| **A proprietary auto-erect pack** | Proprietary auto-erect | Generic auto-erect tray (C35) |
| **A proprietary pharma serialization carton** ⚠️ | Pharma serialization mechanism | Generic carton with QR placeholder |
| **Pharma anti-counterfeit "Inkwall"** ⚠️ | Patented printing/coding | Standard carton |
| **Pop-up display patented mechanisms** | Multiple proprietary | Generic CDU/FDU geometry |

**Rule:** generic equivalents (the unbranded base style) are always safe.
The names, branded mechanisms, and specific patented locking features are
where IP risk lives.

---

## 13. Build conventions (so quality stays high)

Every model implemented under this catalog follows these rules:

1. **Parametric** — a pure function `(L, W, H, thickness, [options]) → Dieline`.
   No SVG import for new models.
2. **Formula-derived** — every coordinate computed from packaging-engineering
   formulas (referenced in the per-model doc).
3. **Real arcs, not flattened polylines** — use `Polyline.curves` for actual
   quadratic beziers. Renders perfectly at any zoom.
4. **Single-line creases** — each crease is one `Polyline`, drawn with a dash
   style at render time. No clustering, no doughnut deduping.
5. **Thickness compensation** where the standard calls for it (e.g. side
   panels = W - 2×thickness on STE/RTE so the assembled box has the right
   inner dimensions).
6. **Bleed as a true contour offset** (✅ shipped 2026-06-08) — the
   `bleedFromCut()` helper in `src/core/geometry.ts` dilates the cut
   polyline; every model uses it. The editor draws a white "paper" backing
   in the SAME shape so the dieline reads as a sheet cut to the bleed
   outline, not a bbox card.
7. **Per-model doc** — copy `docs/models/_TEMPLATE.md` to
   `docs/models/<name>.md` with formulas, dimension semantics, and any
   cutting-machine quirks.
8. **Tests at multiple dimensions** to lock in the geometry.

See `docs/fold-engine.md` for how the 3D preview is derived from the dieline.

---

## 14. What about models that started as SVG imports?

Two existing models in the codebase were built by reverse-engineering hand-drawn
SVGs (the "chocolate box" → RTE, and the reference Flip-Top Mailer).
**Both are being rewritten as parametric in Phase 1** following this catalog's
conventions.

The SVG-import machinery (`scripts/extract-svg-dieline.mjs`, the dash-clustering,
doughnut-dedupe, thin-strip-collapse, and endpoint-snapping passes) stays in
the repo as a **one-off proof-of-concept tool** — useful if someone hands us a
hand-drawn dieline and we want to scaffold a parametric model from it. It is
NOT the production path for shipped models.

---

## Updates

When adding a model, update:
1. The relevant table above (mark as ✅ built)
2. The roadmap section (section 10)
3. `docs/README.md` index
4. `CLAUDE.md` decision log (one-line entry)
5. Add `docs/models/<name>.md` from `_TEMPLATE.md`
