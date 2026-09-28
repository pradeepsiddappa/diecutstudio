// Craft landing page — full-bleed catalog of folding-carton templates. A left
// sidebar holds a single-select Categories list + collapsible "Refine" facet
// accordions; the right column is a full-bleed card grid. Click any template
// card to enter the editor.
import { useState, useMemo, useRef } from "react";
import { usePostHog } from "@posthog/react";
import {
  Layers, FileText, ArrowRight, Sparkles,
  ChevronRight, Box as BoxIcon, Tag as TagIcon, Mail, CreditCard, PartyPopper,
  PawPrint, Search, X, Sliders, Grid2x2, Sparkle, Wrench,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { IsoBoxThumb } from "../components/IsoBoxThumb";
import { Footer } from "../components/Footer";
import "./landing.css";

interface LandingProps {
  onNavigate: (to: string) => void;
}

// ---- template catalogue ----
// `modelId` (when built=true) connects the card to a registered geometry model
// in src/core/models/registry.ts — the thumbnail renders that model's REAL
// flat dieline and clicking opens /editor?model=<id>.
import { CATEGORIES, CategoryId, ModelId, getModel, isAnimalBox } from "../../core/models/registry";
import { useSeo } from "../../seo/head";
import { landingSeo } from "../../seo/siteConfig";
interface Template {
  id: string;
  modelId?: ModelId;       // present when built; selects the geometry engine
  name: string;
  common: string;
  category: CategoryId;
  /** A template can live in MORE than one category (e.g. every animal box is
   *  also a "box"). The primary `category` plus these — `catsOf()` unions them. */
  alsoIn?: CategoryId[];
  L: number; W: number; H: number;
  tags: string[];
  built: boolean;
  /** Variant build params (registry build keys, e.g. {pennantShape:"scallop"})
   *  so one model can appear as several cards — distinct thumbnails, and the
   *  editor opens pre-set to that variant (params ride in the URL). */
  params?: Record<string, string>;
  /** Recently added — shows a "New" badge on the card. */
  isNew?: boolean;
}

// Has this template's model been physically cut-tested? (Registry is the source
// of truth; guards against an unbuilt/unknown id.)
function templateCutTested(t: Template): boolean {
  if (!t.modelId) return false;
  try { return !!getModel(t.modelId).cutTested; } catch { return false; }
}
const TEMPLATES: Template[] = [
  { id: "tuck-end",   modelId: "tuck-end",         name: "Straight Tuck End", common: "Card / tuck box", category: "boxes",       L: 3.0, W: 0.6, H: 5.0, tags: ["Tuck-end", "Cards", "Cosmetics"], built: true },
  { id: "reverse",    modelId: "reverse-tuck-end", name: "Reverse Tuck End",  common: "Tall slim cosmetic / confectionery carton", category: "boxes", L: 4.43, W: 0.98, H: 7.29, tags: ["Tuck-end", "Cosmetics", "Pharma"], built: true },
  { id: "auto",       modelId: "auto-bottom",      name: "Auto-Bottom Lock",  common: "Crash-lock retail box", category: "boxes", L: 4.5, W: 2.2, H: 6.5, tags: ["Auto-bottom", "Retail"],   built: true },
  { id: "tuck-auto",  modelId: "tuck-top-auto-bottom", name: "Tuck-Top Auto-Bottom", common: "Tuck top + crash-lock bottom", category: "boxes", L: 4.5, W: 2.2, H: 6.5, tags: ["Auto-bottom", "Tuck-end", "Retail"], built: true },
  { id: "snap-lock",  modelId: "snap-lock-bottom",  name: "Tuck-Top Snap-Lock", common: "Tuck top + glue-free 1-2-3 bottom", category: "boxes", L: 4.5, W: 2.2, H: 6.5, tags: ["Snap-lock", "Tuck-end", "Retail"], built: true },
  { id: "glue-carton",modelId: "glue-carton",      name: "Sealed-End Carton", common: "Both ends glued — pharma / dry-food", category: "boxes", L: 2.5, W: 1.4, H: 5.0, tags: ["Sealed", "Glue carton", "Pharma"], built: true },
  { id: "tray",       modelId: "open-tray",        name: "Open Tray",         common: "Four-corner glued tray", category: "boxes", L: 8.0, W: 6.0, H: 2.0, tags: ["Tray", "Food", "Gift"],   built: true },
  { id: "hinge-lid",  modelId: "hinge-lid-tray",   name: "Hinged-Lid Tray",   common: "One-piece tray + flip lid", category: "boxes", L: 6.0, W: 4.0, H: 1.5, tags: ["Tray", "Hinged lid", "Gift"], built: true },
  { id: "pillow",     modelId: "pillow-box",       name: "Pillow Box",        common: "Curved-end gift box", category: "boxes",    L: 5.5, W: 3.5, H: 1.2, tags: ["Pillow", "Gift", "Jewelry"], built: true },
  { id: "sleeve",     modelId: "open-sleeve",      name: "Open Sleeve",       common: "Slide-on wrap tube", category: "boxes",     L: 5.0, W: 3.0, H: 1.4, tags: ["Sleeve", "Cosmetics"],     built: true },
  { id: "drawer",     modelId: "drawer-box",       name: "Drawer Box",        common: "Slide / matchbox set", category: "boxes",   L: 4.5, W: 3.0, H: 1.3, tags: ["Drawer", "Two-piece", "Gift"], built: true },
  { id: "rsc",        modelId: "rsc",              name: "Shipping Box (RSC)", common: "Corrugated shipper", category: "boxes",     L: 12.0, W: 9.0, H: 6.0, tags: ["RSC", "Shipping", "Corrugated"], built: true },
  { id: "tray-lid",   modelId: "tray-lid",         name: "Tray + Lid",        common: "Full-telescope two-piece box", category: "boxes", L: 9.0, W: 6.0, H: 2.5, tags: ["Tray + lid", "Two-piece", "Gift"], built: true },
  // Gable card restored after Fold Engine v2 Phase 4a: the engine now folds the
  // literal gable dieline (lock ears + slits + handle holes derived, closed-bbox
  // test exact) — the hand-coded 3D that got it pulled is gone.
  { id: "gable",      modelId: "gable-box",        name: "Gable Top Box",     common: "Peaked carry-handle gift carton", category: "boxes", L: 5.0, W: 4.0, H: 5.5, tags: ["Gable", "Handle", "Gift"], built: true },
  { id: "hex",        modelId: "hex-box",          name: "Hexagon Box",       common: "Six-sided decorative gift box", category: "boxes", L: 5.0, W: 4.3, H: 3.5, tags: ["Hexagon", "Decorative", "Gift"], built: true },
  { id: "hex-lid",    modelId: "hex-tray-lid",     name: "Hexagon Box + Lid", common: "Two-piece openable hexagon", category: "boxes", L: 5.0, W: 4.3, H: 3.5, tags: ["Hexagon", "Two-piece", "Gift"], built: true },
  { id: "heart-box",  modelId: "heart-box",        name: "Heart Box", common: "Heart-shaped two-piece gift box", category: "boxes", L: 5.0, W: 5.0, H: 1.5, tags: ["Heart", "Valentine", "Wedding", "Gift"], built: true, isNew: true },
  // ---- Tags & Wraps (craft line — flat die-cuts, thumbnail = the real cut file) ----
  { id: "gift-tag",   modelId: "gift-tag",         name: "Gift Tag",          common: "Luggage / scallop / ticket tag + reinforced hole", category: "tags-wraps", L: 2.0, W: 3.5, H: 0, tags: ["Tags", "Gift", "Many-up"], built: true },
  { id: "cupcake",    modelId: "cupcake-wrapper",  name: "Cupcake Wrapper",   common: "Scalloped frustum wrap", category: "tags-wraps", L: 2.0, W: 3.0, H: 1.5, tags: ["Cupcake", "Party", "Bakery"], built: true },
  { id: "belly-band", modelId: "belly-band",       name: "Belly Band",        common: "Wrap band — soap / cards / candles", category: "tags-wraps", L: 9.0, W: 2.0, H: 0, tags: ["Band", "Soap", "Wrap"], built: true },
  // Jar label — one card; picker inside the editor lets the user switch oval/scallop/rect.
  { id: "jar-label", modelId: "jar-label", name: "Jar / Product Label", common: "Oval, scallop or rect cut label", category: "tags-wraps", L: 3, W: 2, H: 0, tags: ["Label", "Jar", "Many-up"], built: true, isNew: true, params: { labelShape: "oval" } },
  // Bookmark — one card with 3D preview; 5 shapes selectable in the editor.
  { id: "bookmark", modelId: "bookmark", name: "Bookmark", common: "Rounded · Pointed · Scallop", category: "tags-wraps", L: 1.5, W: 6, H: 0, tags: ["Bookmark", "Tassel", "Many-up"], built: true, isNew: true, params: { bookmarkShape: "scallop" } },
  // Bunting — one card; triangle/swallowtail/scallop selectable in the editor.
  { id: "bunting", modelId: "bunting-pennant", name: "Bunting Pennant", common: "Triangle · Swallowtail · Scallop pennant flags", category: "party", L: 5.0, W: 7.0, H: 0, tags: ["Bunting", "Banner", "Party"], built: true, isNew: true, params: { pennantShape: "triangle" } },
  { id: "place-card",    modelId: "place-card",      name: "Place Card / Table Tent", common: "Folded standing card", category: "party", L: 3.5, W: 2.0, H: 0, tags: ["Place card", "Tent", "Wedding"], built: true, isNew: true },
  { id: "paper-rosette", modelId: "paper-rosette",   name: "Paper Rosette / Fan Medallion", common: "Accordion fan that opens to a circle", category: "party", L: 8.0, W: 0.5, H: 0, tags: ["Rosette", "Medallion", "Party"], built: true, isNew: true },
  { id: "favor-pouch",   modelId: "favor-pouch",     name: "Pyramid Favor Box", common: "Square base + 4 walls fold to a point", category: "party", L: 2.5, W: 2.75, H: 0, tags: ["Favor", "Pyramid", "Party"], built: true, isNew: true },
  { id: "paper-flower",  modelId: "paper-flower",    name: "Layered Paper Flower", common: "Stacked petal layers that bloom", category: "party", L: 6.0, W: 0, H: 0, tags: ["Flower", "Backdrop", "Party"], built: true, isNew: true },
  { id: "bunny-box",     modelId: "bunny-box",       name: "Bunny Treat Box", common: "Eared favour box with a printable, recolourable face", category: "party", L: 3.0, W: 3.0, H: 3.5, tags: ["Animal", "Favor", "Kids", "Easter"], built: true, isNew: true },
  { id: "cat-box",       modelId: "cat-box",         name: "Cat Treat Box", common: "Pointy-eared favour box with a printable cat face", category: "party", L: 3.0, W: 3.0, H: 3.5, tags: ["Animal", "Cat", "Favor", "Kids"], built: true, isNew: true },
  { id: "bear-box",      modelId: "bear-box",        name: "Bear Treat Box", common: "Round-eared favour box with a printable bear face", category: "party", L: 3.0, W: 3.0, H: 3.5, tags: ["Animal", "Bear", "Favor", "Kids"], built: true, isNew: true },
  { id: "fox-box",       modelId: "fox-box",         name: "Fox Treat Box", common: "Pointy-eared favour box with a printable fox face", category: "party", L: 3.0, W: 3.0, H: 3.5, tags: ["Animal", "Fox", "Favor", "Kids"], built: true, isNew: true },
  { id: "panda-box",     modelId: "panda-box",       name: "Panda Treat Box", common: "Round-eared favour box with a printable panda face", category: "party", L: 3.0, W: 3.0, H: 3.5, tags: ["Animal", "Panda", "Favor", "Kids"], built: true, isNew: true },
  { id: "pig-box",       modelId: "pig-box",         name: "Pig Treat Box", common: "Snouty favour box with a printable pig face", category: "party", L: 3.0, W: 3.0, H: 3.5, tags: ["Animal", "Pig", "Favor", "Kids"], built: true, isNew: true },
  { id: "owl-box",       modelId: "owl-box",         name: "Owl Treat Box", common: "Tufted favour box with a printable owl face", category: "party", L: 3.0, W: 3.0, H: 3.5, tags: ["Animal", "Owl", "Favor", "Kids"], built: true, isNew: true },
  { id: "dog-box",       modelId: "dog-box",         name: "Dog Treat Box", common: "Floppy-eared favour box with a printable puppy face", category: "party", L: 3.0, W: 3.0, H: 3.5, tags: ["Animal", "Dog", "Favor", "Kids"], built: true, isNew: true },
  { id: "lion-box",      modelId: "lion-box",        name: "Lion Treat Box", common: "Maned favour box with a printable lion face", category: "party", L: 3.0, W: 3.0, H: 3.5, tags: ["Animal", "Lion", "Favor", "Kids"], built: true, isNew: true },
  { id: "unicorn-box",   modelId: "unicorn-box",     name: "Unicorn Treat Box", common: "Horned favour box with a printable unicorn face", category: "party", L: 3.0, W: 3.0, H: 3.5, tags: ["Animal", "Unicorn", "Favor", "Kids"], built: true, isNew: true },
  { id: "frog-box",      modelId: "frog-box",        name: "Frog Treat Box", common: "Bug-eyed favour box with a printable frog face", category: "party", L: 3.0, W: 3.0, H: 3.5, tags: ["Animal", "Frog", "Favor", "Kids"], built: true, isNew: true },
  { id: "mouse-box",     modelId: "mouse-box",       name: "Mouse Treat Box", common: "Big-eared favour box with a printable mouse face", category: "party", L: 3.0, W: 3.0, H: 3.5, tags: ["Animal", "Mouse", "Favor", "Kids"], built: true, isNew: true },
  { id: "sheep-box",     modelId: "sheep-box",       name: "Sheep Treat Box", common: "Woolly favour box with a printable lamb face", category: "party", L: 3.0, W: 3.0, H: 3.5, tags: ["Animal", "Sheep", "Favor", "Kids"], built: true, isNew: true },
  { id: "bat-box",       modelId: "bat-box",         name: "Bat Treat Box", common: "Pointy-eared Halloween favour box with a printable bat face", category: "party", L: 3.0, W: 3.0, H: 3.5, tags: ["Animal", "Bat", "Halloween", "Favor"], built: true, isNew: true },
  { id: "chick-box",     modelId: "chick-box",       name: "Chick Treat Box", common: "Tufted Easter favour box with a printable chick face", category: "party", L: 3.0, W: 3.0, H: 3.5, tags: ["Animal", "Chick", "Easter", "Favor"], built: true, isNew: true },
  { id: "reindeer-box",  modelId: "reindeer-box",    name: "Reindeer Treat Box", common: "Antlered Christmas favour box with a printable reindeer face", category: "party", L: 3.0, W: 3.0, H: 3.5, tags: ["Animal", "Reindeer", "Christmas", "Favor"], built: true, isNew: true },
  { id: "paper-lantern", modelId: "paper-lantern",   name: "Paper Lantern", common: "Slit cylinder that bows into a lantern", category: "decor", L: 5.0, W: 7.0, H: 0, tags: ["Lantern", "Decor", "Party"], built: true, isNew: true },
  { id: "folded-star",   modelId: "folded-star",     name: "3D Folded Star", common: "Scored star that pops into 3D", category: "decor", L: 5.0, W: 0, H: 0, tags: ["Star", "Ornament", "Decor"], built: true, isNew: true },
  { id: "snowflake",     modelId: "snowflake",       name: "Geometric Snowflake", common: "6-fold lacy snowflake", category: "decor", L: 6.0, W: 0, H: 0, tags: ["Snowflake", "Winter", "Decor"], built: true, isNew: true },
  // ---- Envelopes & Cards ----
  { id: "envelope",   modelId: "envelope",         name: "Envelope (A-style)", common: "Announcement / A-style square flap + liner", category: "envelopes-cards", L: 5.75, W: 4.375, H: 0, tags: ["Envelope", "Cards", "Announcement"], built: true, params: { flap: "square" } },
  { id: "envelope-pointed", modelId: "envelope",   name: "Baronial Envelope", common: "Pointed closure flap (invitation)", category: "envelopes-cards", L: 5.75, W: 4.375, H: 0, tags: ["Envelope", "Baronial", "Invitation"], built: true, params: { flap: "pointed" } },
  { id: "envelope-diamond", modelId: "envelope",   name: "Diamond Envelope",  common: "Wedding / invitation — pointed flaps, rounded tips", category: "envelopes-cards", L: 9.0157, W: 6.378, H: 0, tags: ["Envelope", "Wedding", "Invitation"], built: true, isNew: true, params: { flap: "diamond" } },
  { id: "envelope-wallet", modelId: "envelope",    name: "Pocket Envelope",   common: "Portrait wallet — long pocket flap, top closure", category: "envelopes-cards", L: 6.378, W: 9.0157, H: 0, tags: ["Envelope", "Pocket", "Card"], built: true, isNew: true, params: { flap: "wallet" } },
  { id: "envelope-catalog", modelId: "envelope",   name: "Catalog Envelope",  common: "Open-end document — big side flaps, centre seam", category: "envelopes-cards", L: 6.378, W: 9.0157, H: 0, tags: ["Envelope", "Open-end", "Document"], built: true, isNew: true, params: { flap: "catalog" } },
  { id: "gc-holder",  modelId: "gift-card-holder", name: "Gift-Card Holder",  common: "Folded holder + corner slits", category: "envelopes-cards", L: 4, W: 3, H: 0, tags: ["Gift card", "Holder", "Cards"], built: true, isNew: true },
  // ---- Organize ----
  { id: "floss-bobbin", modelId: "floss-bobbin", name: "Floss Bobbin", common: "Spool card for embroidery floss", category: "organizers", L: 1.75, W: 2, H: 0, tags: ["Floss", "Organizer", "Many-up"], built: true, isNew: true },
  // ---- Display Cards (handmade-seller line) — one card per SHAPE (distinct
  //      thumbnails); Stud / Dangle stays a control inside the editor. ----
  { id: "earring-rect",    modelId: "earring-card", name: "Earring Card — Rect",    common: "Rounded-rect display card", category: "display-cards", L: 2, W: 3, H: 0, tags: ["Jewelry", "Handmade", "Display"], built: true, params: { cardShape: "rect" } },
  { id: "earring-scallop", modelId: "earring-card", name: "Earring Card — Scallop", common: "Scalloped-edge display card", category: "display-cards", L: 2, W: 3, H: 0, tags: ["Jewelry", "Scallop", "Handmade"], built: true, params: { cardShape: "scallop" } },
  { id: "earring-arch",    modelId: "earring-card", name: "Earring Card — Arch",    common: "Domed-top display card", category: "display-cards", L: 2, W: 3, H: 0, tags: ["Jewelry", "Arch", "Handmade"], built: true, params: { cardShape: "arch" } },
  { id: "earring-tagtop",  modelId: "earring-card", name: "Earring Card — Tag-top", common: "Chamfered-head display card", category: "display-cards", L: 2, W: 3, H: 0, tags: ["Jewelry", "Tag-top", "Handmade"], built: true, params: { cardShape: "tag-top" } },
  { id: "necklace-flat",   modelId: "necklace-card", name: "Necklace Card — Flat", common: "Hang hole + chain-retainer slits", category: "display-cards", L: 2.5, W: 3.5, H: 0, tags: ["Jewelry", "Necklace", "Handmade"], built: true, isNew: true, params: { necklaceStyle: "flat" } },
  { id: "necklace-fold",   modelId: "necklace-card", name: "Necklace Card — Fold-over", common: "Hourglass card, folds at the waist", category: "display-cards", L: 2.25, W: 5, H: 0, tags: ["Jewelry", "Necklace", "Fold-over"], built: true, isNew: true, params: { necklaceStyle: "fold" } },
  { id: "hair-bow-card",   modelId: "hair-bow-card", name: "Hair-Bow / Clip Card", common: "Slot pairs for bows & clips", category: "display-cards", L: 2.75, W: 4.5, H: 0, tags: ["Hair bow", "Clips", "Handmade"], built: true, isNew: true },
  // ---- New models batch 1 ----
  { id: "party-hat",       modelId: "party-hat",       name: "Party Hat", common: "Cone hat — straight or scalloped brim", category: "party", L: 7.0, W: 9.0, H: 0, tags: ["Hat", "Party", "Cone", "Kids"], built: true, isNew: true },
  { id: "napkin-ring",     modelId: "napkin-ring",     name: "Napkin Ring", common: "Scalloped table-setting band with tuck lock", category: "tags-wraps", L: 6.0, W: 1.75, H: 0, tags: ["Napkin", "Table", "Wedding", "Wrap"], built: true, isNew: true },
  { id: "cake-topper",     modelId: "cake-topper",     name: "Cake Topper", common: "Circle · Heart · Star · Scallop topper on a stick", category: "party", L: 4.0, W: 4.0, H: 0, tags: ["Cake", "Topper", "Birthday", "Wedding"], built: true, isNew: true },

];

// Animal treat boxes get their own "animals" gallery category (derived from the
// registry's ANIMAL_BOX_IDS, the single source of truth) — so the cards' literal
// `category: "party"` above is just a default; this keeps it in sync. They also
// belong to "boxes" (an animal box is still a box), so picking Boxes shows them.
TEMPLATES.forEach((t) => {
  if (isAnimalBox(t.modelId)) { t.category = "animals"; t.alsoIn = ["boxes"]; }
});

// All categories a template belongs to (primary + any `alsoIn`), de-duped.
const catsOf = (t: Template): CategoryId[] =>
  Array.from(new Set<CategoryId>([t.category, ...(t.alsoIn ?? [])]));

// Per-category icons (sidebar list). Reused from the old tab bar + a couple more.
const CATEGORY_ICONS: Partial<Record<CategoryId, JSX.Element>> = {
  boxes: <BoxIcon size={16} />,
  animals: <PawPrint size={16} />,
  "tags-wraps": <TagIcon size={16} />,
  "envelopes-cards": <Mail size={16} />,
  "display-cards": <CreditCard size={16} />,
  party: <PartyPopper size={16} />,
  organizers: <Wrench size={16} />,
  decor: <Sparkle size={16} />,
};

// Sidebar Categories list: "All" + only categories that actually contain a built
// template (registry CATEGORIES defines the full set + display order). Membership
// uses catsOf() so "Boxes" includes the animal boxes too.
const CATEGORY_LIST: { id: "all" | CategoryId; label: string; icon: JSX.Element }[] = [
  { id: "all", label: "All", icon: <Grid2x2 size={16} /> },
  ...CATEGORIES
    .filter((c) => TEMPLATES.some((t) => t.built && catsOf(t).includes(c.id)))
    .map((c) => ({ id: c.id, label: c.label, icon: CATEGORY_ICONS[c.id] ?? <BoxIcon size={16} /> })),
];

// ---- Refine facets ----
// Facet options are derived from each template's free-text `tags` (case-
// insensitive), grouped into named buckets. A few "Feature" options are derived
// from model metadata instead (printable face / flat). Any tag not claimed by a
// named group is collected into a final "Tags" bucket.
type FacetGroupId = "occasion" | "use" | "feature" | "tags";
interface FacetOption { id: string; label: string; }
interface FacetGroup { id: FacetGroupId; label: string; options: FacetOption[]; defaultOpen: boolean; }

// Tag → group maps (the matching is case-insensitive on the tag text).
const OCCASION_TAGS = ["Easter", "Halloween", "Christmas", "Wedding", "Birthday", "Baby", "Kids", "Party"];
const USE_TAGS = ["Soap", "Candle", "Jewelry", "Cosmetics", "Pharma", "Food", "Gift", "Wrap", "Bakery", "Retail"];
// Feature options match against tag text…
const FEATURE_TAGS = ["Many-up", "Two-piece", "Window", "No-glue"];
const FEATURE_TAG_LABELS: Record<string, string> = {
  "Many-up": "Many-up",
  "Two-piece": "Two-piece",
  "Window": "Window",
  "No-glue": "No-glue",
};
// …plus two DERIVED feature options (not tag-based).
const FEAT_PRINTFACE = "printable-face"; // isAnimalBox(modelId)
const FEAT_FLAT = "flat";                // template H === 0 (flat die-cut)

const lc = (s: string) => s.toLowerCase();

// Does a template match a derived/tag feature option id?
function matchesFeature(t: Template, optId: string): boolean {
  if (optId === FEAT_PRINTFACE) return isAnimalBox(t.modelId);
  if (optId === FEAT_FLAT) return t.H === 0;
  // tag-based feature: optId is the lower-cased tag
  return t.tags.some((tg) => lc(tg) === optId);
}
// Does a template carry a given tag (case-insensitive)? — for occasion/use/tags.
const hasTag = (t: Template, tag: string) => t.tags.some((tg) => lc(tg) === lc(tag));

// Count of built templates matching a facet option (used for the live counts).
function facetCount(group: FacetGroupId, optId: string): number {
  return TEMPLATES.filter((t) => {
    if (!t.built) return false;
    if (group === "feature") return matchesFeature(t, optId);
    return hasTag(t, optId);
  }).length;
}

// Build the facet groups. Occasion/Use/Tags options exist only if ≥1 template
// has the tag; the "Tags" bucket collects every remaining (un-grouped) tag.
const FACET_GROUPS: FacetGroup[] = (() => {
  const namedTags = new Set<string>(
    [...OCCASION_TAGS, ...USE_TAGS, ...FEATURE_TAGS].map(lc)
  );
  // Leftover tags → the final "Tags" group (distinct, sorted by frequency).
  const leftoverCounts = new Map<string, { label: string; n: number }>();
  for (const t of TEMPLATES) {
    if (!t.built) continue;
    for (const tg of t.tags) {
      if (namedTags.has(lc(tg))) continue;
      const key = lc(tg);
      const cur = leftoverCounts.get(key);
      if (cur) cur.n++;
      else leftoverCounts.set(key, { label: tg, n: 1 });
    }
  }
  const leftover: FacetOption[] = [...leftoverCounts.entries()]
    .sort((a, b) => b[1].n - a[1].n || a[1].label.localeCompare(b[1].label))
    .map(([id, v]) => ({ id, label: v.label }));

  const occasion: FacetOption[] = OCCASION_TAGS
    .filter((tag) => facetCount("occasion", tag) > 0)
    .map((tag) => ({ id: lc(tag), label: tag }));
  const use: FacetOption[] = USE_TAGS
    .filter((tag) => facetCount("use", tag) > 0)
    .map((tag) => ({ id: lc(tag), label: tag }));

  // Feature: the two derived options first, then any tag-based feature present.
  const feature: FacetOption[] = [];
  if (TEMPLATES.some((t) => t.built && isAnimalBox(t.modelId)))
    feature.push({ id: FEAT_PRINTFACE, label: "Printable face" });
  if (TEMPLATES.some((t) => t.built && t.H === 0))
    feature.push({ id: FEAT_FLAT, label: "Flat (cut-only)" });
  for (const tag of FEATURE_TAGS) {
    if (facetCount("feature", lc(tag)) > 0)
      feature.push({ id: lc(tag), label: FEATURE_TAG_LABELS[tag] ?? tag });
  }

  const groups: FacetGroup[] = [
    { id: "occasion", label: "Occasion", options: occasion, defaultOpen: true },
    { id: "use", label: "Use & material", options: use, defaultOpen: true },
    { id: "feature", label: "Feature", options: feature, defaultOpen: false },
    { id: "tags", label: "Tags", options: leftover, defaultOpen: false },
  ];
  return groups.filter((g) => g.options.length > 0);
})();

// Flat lookup: option id → its group + label (for chips).
const OPTION_INDEX: Record<string, { group: FacetGroupId; label: string }> = {};
for (const g of FACET_GROUPS) for (const o of g.options) OPTION_INDEX[o.id] = { group: g.id, label: o.label };

export function Landing({ onNavigate }: LandingProps) {
  const posthog = usePostHog();
  // Active single-select category (sidebar "Categories" list).
  const [cat, setCat] = useState<"all" | CategoryId>("all");
  // Checked facet options, by group. A group with ≥1 checked option restricts
  // (OR within the group); groups AND together.
  const [facets, setFacets] = useState<Record<FacetGroupId, Set<string>>>({
    occasion: new Set(), use: new Set(), feature: new Set(), tags: new Set(),
  });
  // Which "Refine" accordions are open (seeded from each group's defaultOpen).
  const [openGroups, setOpenGroups] = useState<Set<FacetGroupId>>(
    () => new Set(FACET_GROUPS.filter((g) => g.defaultOpen).map((g) => g.id))
  );
  // Mobile: toggle the sidebar drawer.
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Seed the catalog search from ?q= (powers the structured-data SearchAction /
  // sitelinks search box; harmless empty default otherwise).
  const [query, setQuery] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("q") ?? ""; }
    catch { return ""; }
  });
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // SEO head for the landing. The full JSON-LD graph (Organization, WebSite,
  // WebApplication, FAQPage) is static in index.html <head>, so we only sync
  // the title/meta/canonical here (and clear any per-model JSON-LD on return).
  useSeo(landingSeo());

  // Built-template count per category — uses catsOf() so "Boxes" counts the
  // animal boxes too. Static (reflects the catalogue, not search/facets).
  const countFor = (id: "all" | CategoryId) =>
    TEMPLATES.filter((t) => t.built && (id === "all" || catsOf(t).includes(id))).length;

  // Does a template pass the checked facets? OR within a group, AND across groups.
  const passesFacets = (t: Template) => {
    for (const g of FACET_GROUPS) {
      const checked = facets[g.id];
      if (checked.size === 0) continue; // group not constraining
      const ok = [...checked].some((opt) =>
        g.id === "feature" ? matchesFeature(t, opt) : hasTag(t, opt)
      );
      if (!ok) return false;
    }
    return true;
  };

  // Filter: active category (multi-membership) AND facets AND search text.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEMPLATES.filter((t) => {
      if (cat !== "all" && !catsOf(t).includes(cat)) return false;
      if (!passesFacets(t)) return false;
      if (q) {
        const hay = (t.name + " " + t.common + " " + t.tags.join(" ")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, facets, query]);

  function onCardClick(t: Template, e: React.MouseEvent) {
    e.preventDefault();
    if (!t.built || !t.modelId) return; // "planned" templates are placeholders
    posthog?.capture("template_card_clicked", {
      template_id: t.modelId,
      template_name: t.name,
      template_category: t.category,
      template_tags: t.tags,
      has_variant_params: !!t.params,
    });
    const extra = t.params ? Object.entries(t.params).map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join("") : "";
    // Open the editor at the size shown in the card thumbnail (so e.g. a portrait
    // wallet envelope opens portrait). A saved design for the model still wins.
    const dims = `&L=${t.L}&W=${t.W}&H=${t.H}`;
    // Carry this card's exact thumbnail tint so the editor's 3D stage matches it.
    const thumb = (e.currentTarget as HTMLElement).closest(".card")?.querySelector(".thumb") as HTMLElement | null;
    const tint = thumb ? getComputedStyle(thumb).backgroundColor : "";
    const bg = tint ? `&bg=${encodeURIComponent(tint)}` : "";
    onNavigate(`/editor?model=${t.modelId}${extra}${dims}${bg}`);
  }

  function toggleFacet(group: FacetGroupId, optId: string) {
    setFacets((prev) => {
      const next = new Set(prev[group]);
      const enabling = !next.has(optId);
      if (enabling) next.add(optId); else next.delete(optId);
      posthog?.capture("gallery_filter_toggled", { group, filter: optId, enabled: enabling });
      return { ...prev, [group]: next };
    });
  }
  function toggleGroup(id: FacetGroupId) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function clearAll() {
    setCat("all");
    setFacets({ occasion: new Set(), use: new Set(), feature: new Set(), tags: new Set() });
    setQuery("");
  }

  // Active filters → removable chips (category chip if not "All" + one per facet).
  const activeChips: { key: string; label: string; remove: () => void }[] = [];
  if (cat !== "all") {
    const c = CATEGORY_LIST.find((x) => x.id === cat);
    if (c) activeChips.push({ key: "cat", label: c.label, remove: () => setCat("all") });
  }
  for (const g of FACET_GROUPS) {
    for (const opt of facets[g.id]) {
      const label = OPTION_INDEX[opt]?.label ?? opt;
      activeChips.push({ key: `${g.id}:${opt}`, label, remove: () => toggleFacet(g.id, opt) });
    }
  }
  const hasActive = activeChips.length > 0 || query.trim() !== "";

  // The sidebar content — shared between desktop (sticky aside) and the mobile
  // drawer.
  const sidebar = (
    <>
      <div className="side-head">Categories</div>
      <nav className="cat-list">
        {CATEGORY_LIST.map((c) => (
          <button
            key={c.id}
            className={cat === c.id ? "cat on" : "cat"}
            onClick={() => {
              setCat(c.id);
              setFiltersOpen(false);
              posthog?.capture("template_gallery_category_selected", {
                category_id: c.id,
                category_label: c.label,
              });
            }}
          >
            <span className="ic">{c.icon}</span>
            <span className="lbl">{c.label}</span>
            <span className="n">{countFor(c.id)}</span>
          </button>
        ))}
      </nav>

      <div className="side-head">Refine</div>
      <div className="facets">
        {FACET_GROUPS.map((g) => {
          const open = openGroups.has(g.id);
          return (
            <div className={open ? "facet open" : "facet"} key={g.id}>
              <button className="facet-sum" onClick={() => toggleGroup(g.id)} aria-expanded={open}>
                {g.label}
                <ChevronRight size={15} className="facet-caret" />
              </button>
              {open && (
                <div className="facet-opts">
                  {g.options.map((o) => (
                    <label className="opt" key={o.id}>
                      <input
                        type="checkbox"
                        checked={facets[g.id].has(o.id)}
                        onChange={() => toggleFacet(g.id, o.id)}
                      />
                      <span className="lbl">{o.label}</span>
                      <span className="n">{facetCount(g.id, o.id)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="landing landing-catalog">
      {/* ===== NAV (full-bleed) ===== */}
      <header className="nav">
        <a
          className="logo"
          href="/"
          onClick={(e) => { e.preventDefault(); onNavigate("/"); }}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <Logo size={20} />
        </a>
        <div className="nav-links">
          <a href="#templates"><Layers size={14} /> Templates</a>
          <a href="/docs" onClick={(e) => { e.preventDefault(); onNavigate("/docs"); }}><FileText size={14} /> Docs</a>
          <button
            className="btn btn-pri"
            onClick={() => onNavigate("/editor")}
          >
            Open editor <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* ===== CATALOG: [ sidebar | grid ] ===== */}
      <div className="catalog" id="templates">
        {/* ---- LEFT SIDEBAR (desktop) ---- */}
        <aside className="side">{sidebar}</aside>

        {/* ---- MOBILE DRAWER ---- */}
        {filtersOpen && (
          <>
            <div className="side-backdrop" onClick={() => setFiltersOpen(false)} />
            <aside className="side side-drawer">
              <button className="drawer-close" aria-label="Close filters" onClick={() => setFiltersOpen(false)}>
                <X size={18} />
              </button>
              {sidebar}
            </aside>
          </>
        )}

        {/* ---- RIGHT COLUMN ---- */}
        <main className="catalog-main">
          <div className="catalog-top">
            <h1>Templates</h1>
            <label className="search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search templates, tags…"
                value={query}
                onChange={(e) => {
                  const v = e.target.value;
                  setQuery(v);
                  if (searchDebounce.current) clearTimeout(searchDebounce.current);
                  if (v.trim()) {
                    searchDebounce.current = setTimeout(() => {
                      posthog?.capture("template_searched", { query: v.trim() });
                    }, 800);
                  }
                }}
              />
              {query && (
                <button className="search-clear" aria-label="Clear search" onClick={() => setQuery("")}>
                  <X size={14} />
                </button>
              )}
            </label>
            <button className="filter-btn" onClick={() => setFiltersOpen(true)}>
              <Sliders size={15} /> Filters
            </button>
          </div>

          {/* Active filters + result count */}
          <div className="filt-bar">
            <span className="count">{visible.length} {visible.length === 1 ? "template" : "templates"}</span>
            {activeChips.map((c) => (
              <span className="chip" key={c.key}>
                {c.label}
                <button aria-label={`Remove ${c.label}`} onClick={c.remove}><X size={12} /></button>
              </span>
            ))}
            {hasActive && (
              <button className="clear" onClick={clearAll}>Clear all</button>
            )}
          </div>

          {/* Grid (full-bleed, edge to edge) */}
          {visible.length === 0 ? (
            <div className="empty">
              <p>No templates match your filters.</p>
              <button className="btn btn-out" onClick={clearAll}>Clear all filters</button>
            </div>
          ) : (
            <div className="grid">
              {visible.map((t) => (
                <a
                  key={t.id}
                  href={t.built ? "/editor" : "#"}
                  className="card"
                  onClick={(e) => onCardClick(t, e)}
                  style={{ cursor: t.built ? "pointer" : "default", opacity: t.built ? 1 : 0.78 }}
                >
                  <div className="thumb">
                    {t.isNew && <span className="new-badge">New</span>}
                    {templateCutTested(t) && <span className="tested-badge" title="Printed, cut on a real machine & confirmed to hold">Cut-tested ✓</span>}
                    <IsoBoxThumb L={t.L} W={t.W} H={t.H} modelId={t.modelId} buildParams={t.params} />
                  </div>
                  <div className="meta">
                    <div className="name-row">
                      <div className="name">{t.name}</div>
                      {!t.built && (
                        <span className="status planned">
                          <Sparkles size={10} />
                          Planned
                        </span>
                      )}
                    </div>
                    <div className="common">{t.common}</div>
                    <div className="tagrow">
                      {t.tags.slice(0, 3).map((x) => <span key={x}>{x}</span>)}
                    </div>
                    {t.built && (
                      <span className="open">
                        Open editor <ChevronRight size={14} />
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* ===== FOOT ===== */}
          <Footer onNavigate={onNavigate} />
        </main>
      </div>
    </div>
  );
}
