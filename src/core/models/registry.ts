// Central model registry — single source of truth for "what box types exist."
// The editor, the gallery, the docs index, and any future model-aware code
// all read from this list. Adding a new model = add one entry here.
//
// Each entry pairs a builder fn with its defaultParams so a caller only needs
// to know the model id + (L, W, H, thickness, bleed) to get a Dieline.

import { Dieline, FeatureOptions } from "../types";
import { applyFeatures } from "../features";
import { buildTuckEnd, defaultParams as tuckEndDefaults, TuckEndParams } from "./tuckEnd";
import { buildRollEndMailer, defaultParams as rettDefaults, RollEndMailerParams } from "./rollEndMailer";
import { buildFlipTopMailer, defaultParams as flipDefaults, FlipTopMailerParams } from "./flipTopMailer";
import { buildReverseTuckEnd, defaultParams as rteDefaults, ReverseTuckEndParams } from "./reverseTuckEnd";
import { buildAutoBottom, defaultParams as autoDefaults, AutoBottomParams } from "./autoBottom";
import { buildTuckTopAutoBottom, defaultParams as tuckAutoDefaults, TuckTopAutoBottomParams } from "./tuckTopAutoBottom";
import { buildSnapLockBottom, defaultParams as snapLockDefaults, SnapLockBottomParams } from "./snapLockBottom";
import { buildGlueCarton, defaultParams as glueCartonDefaults, GlueCartonParams } from "./glueCarton";
import { buildHingeLidTray, defaultParams as hingeLidDefaults, HingeLidTrayParams } from "./hingeLidTray";
import { buildOpenTray, defaultParams as trayDefaults, OpenTrayParams } from "./openTray";
import { buildPillowBox, defaultParams as pillowDefaults, PillowBoxParams } from "./pillowBox";
import { buildOpenSleeve, defaultParams as sleeveDefaults, OpenSleeveParams } from "./openSleeve";
import { buildDrawerBox, defaultParams as drawerDefaults, DrawerBoxParams } from "./drawerBox";
import { buildRsc, defaultParams as rscDefaults, RscParams } from "./rsc";
import { buildTrayLid, defaultParams as trayLidDefaults, TrayLidParams } from "./trayLid";
import { buildGableBox, defaultParams as gableDefaults, GableBoxParams } from "./gableBox";
import { buildHexBox, defaultParams as hexDefaults, HexBoxParams } from "./hexBox";
import { buildHexTrayLid, defaultParams as hexTrayLidDefaults, HexTrayLidParams } from "./hexTrayLid";
import { buildGiftTag, defaultParams as giftTagDefaults, GiftTagShape } from "./giftTag";
import { buildEnvelope, defaultParams as envelopeDefaults, EnvelopeFlap } from "./envelope";
import { buildEarringCard, defaultParams as earringDefaults, EarringStyle, CardShape } from "./earringCard";
import { buildCupcakeWrapper, defaultParams as cupcakeDefaults } from "./cupcakeWrapper";
import { buildBellyBand, defaultParams as bandDefaults, BandClosure } from "./bellyBand";
import { buildBuntingPennant, defaultParams as buntingDefaults, PennantShape } from "./buntingPennant";
import { buildPlaceCard, defaultParams as placeCardDefaults } from "./placeCard";
import { buildGiftCardHolder, defaultParams as gcHolderDefaults } from "./giftCardHolder";
import { buildFlossBobbin, defaultParams as flossBobbinDefaults } from "./flossBobbin";
import { buildPaperRosette, defaultParams as rosetteDefaults } from "./paperRosette";
import { buildFavorPouch, defaultParams as favorPouchDefaults } from "./favorPouch";
import { buildPaperFlower, defaultParams as paperFlowerDefaults } from "./paperFlower";
import { buildPaperLantern, defaultParams as paperLanternDefaults } from "./paperLantern";
import { buildFoldedStar, defaultParams as foldedStarDefaults } from "./foldedStar";
import { buildSnowflake, defaultParams as snowflakeDefaults } from "./snowflake";
import { buildNecklaceCard, defaultParams as necklaceCardDefaults, NecklaceCardStyle } from "./necklaceCard";
import { buildHairBowCard, defaultParams as hairBowCardDefaults } from "./hairBowCard";
import { buildJarLabel, defaultParams as jarLabelDefaults, JarLabelShape } from "./jarLabel";
import { buildBookmark, defaultParams as bookmarkDefaults, BookmarkShape } from "./bookmark";
import { buildBunnyBox, defaultParams as bunnyDefaults } from "./bunnyBox";
import { buildCatBox, defaultParams as catDefaults } from "./catBox";
import { buildBearBox, defaultParams as bearDefaults } from "./bearBox";
import { buildFoxBox, defaultParams as foxDefaults } from "./foxBox";
import { buildPandaBox, defaultParams as pandaDefaults } from "./pandaBox";
import { buildPigBox, defaultParams as pigDefaults } from "./pigBox";
import { buildOwlBox, defaultParams as owlDefaults } from "./owlBox";
import { buildDogBox, defaultParams as dogDefaults } from "./dogBox";
import { buildLionBox, defaultParams as lionDefaults } from "./lionBox";
import { buildUnicornBox, defaultParams as unicornDefaults } from "./unicornBox";
import { buildFrogBox, defaultParams as frogDefaults } from "./frogBox";
import { buildMouseBox, defaultParams as mouseDefaults } from "./mouseBox";
import { buildSheepBox, defaultParams as sheepDefaults } from "./sheepBox";
import { buildBatBox, defaultParams as batDefaults } from "./batBox";
import { buildChickBox, defaultParams as chickDefaults } from "./chickBox";
import { buildReindeerBox, defaultParams as reindeerDefaults } from "./reindeerBox";
import { buildHeartBox, defaultParams as heartDefaults } from "./heartBox";
import { buildPartyHat, defaultParams as partyHatDefaults, HatEdge } from "./partyHat";
import { buildNapkinRing, defaultParams as napkinRingDefaults, NapkinRingClosure, NapkinRingEdge } from "./napkinRing";
import { buildCakeTopper, defaultParams as cakeTopperDefaults, CakeTopperShape } from "./cakeTopper";


export type ModelId = "tuck-end" | "roll-end-mailer" | "flip-top-mailer" | "reverse-tuck-end" | "auto-bottom" | "tuck-top-auto-bottom" | "snap-lock-bottom" | "glue-carton" | "open-tray" | "hinge-lid-tray" | "pillow-box" | "open-sleeve" | "drawer-box" | "rsc" | "tray-lid" | "gable-box" | "hex-box" | "hex-tray-lid" | "gift-tag" | "envelope" | "earring-card" | "cupcake-wrapper" | "belly-band" | "bunting-pennant" | "place-card" | "gift-card-holder" | "floss-bobbin" | "necklace-card" | "hair-bow-card" | "jar-label" | "bookmark" | "paper-rosette" | "favor-pouch" | "paper-flower" | "paper-lantern" | "folded-star" | "snowflake" | "bunny-box" | "cat-box" | "bear-box" | "fox-box" | "panda-box" | "pig-box" | "owl-box" | "dog-box" | "lion-box" | "unicorn-box" | "frog-box" | "mouse-box" | "sheep-box" | "bat-box" | "chick-box" | "reindeer-box" | "heart-box" | "party-hat" | "napkin-ring" | "cake-topper";

// Phase 3 feature overlays a model can opt into (it must publish the panel the
// feature needs, e.g. `panels.front` for the window cut).
export type FeatureKind = "window" | "euro" | "thumb" | "thumb-notch";

// Which front-panel thumb notches a tuck box has, each toggleable in the editor.
// STE has both ends; the auto/snap-bottom tucks have only the top.
export type NotchEnd = "top" | "bottom";

// Gallery / catalog categories (docs/craft-dielines-catalog.md §4). The landing
// page only shows tabs for categories that actually contain built models.
export type CategoryId =
  | "boxes" | "animals" | "envelopes-cards" | "tags-wraps" | "display-cards"
  | "party" | "organizers" | "decor";
export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "boxes", label: "Boxes" },
  // Animal treat boxes — their own marquee category (the model `category` is
  // DERIVED from ANIMAL_BOX_IDS below, so any new animal lands here automatically).
  { id: "animals", label: "Animals" },
  { id: "envelopes-cards", label: "Envelopes & Cards" },
  { id: "tags-wraps", label: "Tags & Wraps" },
  { id: "display-cards", label: "Display Cards" },
  { id: "party", label: "Party" },
  { id: "organizers", label: "Organize" },
  { id: "decor", label: "Decor" },
];

export interface ModelEntry {
  id: ModelId;
  name: string;                  // display name in UI
  shortName: string;             // condensed label (sidebar dropdown etc.)
  description: string;           // one-line, for headers/subs
  /** Gallery / catalog category (landing tabs group by this). */
  category: CategoryId;
  has3DPreview: boolean;         // whether Box3D supports this model yet
  /** Quality gate: physically printed, cut on a
   *  real machine, folded, and confirmed to hold — shown as a "Cut-tested ✓"
   *  badge on the gallery card. Set ONLY after a real cut-test (record date +
   *  material). All gallery models are at least digital-verified; this badge is
   *  reserved for the ones proven on hardware — the differentiator no other
   *  generator offers, so never set it speculatively. */
  cutTested?: { date: string; material?: string };
  /** FLAT die-cut (tag, card, pennant…): nothing folds, so the editor hides
   *  the 3D pane entirely — the canvas dieline IS the product preview. */
  flat?: boolean;
  /** Editor labels for the L/W/H inputs when the box semantics don't apply
   *  (e.g. a tag's "Tag width"/"Tag height"). `null` HIDES that input. */
  dimLabels?: { L?: string | null; W?: string | null; H?: string | null };
  /** Small ganged items (tags, pennants): default the editor to full-sheet
   *  (n-up) export — nobody cuts ONE gift tag. */
  preferSheetExport?: boolean;
  /** Standard size presets (in inches, mapped to the editor's L/W[/H] inputs).
   *  Shown as a dropdown above the dimension fields. `H` is optional — flat
   *  items (envelopes, cards) omit it; 3-D boxes set it to fill all three
   *  fields from one pick. e.g. A2/A7 envelopes, or a "Soap bar" tuck box. */
  presets?: { label: string; L: number; W: number; H?: number }[];
  /** Does the folded box have a thumb-notch arc on the front panel?
   *  Used by the 3D thumbnail snapshot. STE has it; RTE/mailers don't. */
  hasFrontNotch: boolean;
  /** Phase 3 overlays this model supports (shown as toggles in the editor). */
  supportsFeatures?: FeatureKind[];
  /** Front-panel thumb notches this box has — each gets a show/hide toggle in
   *  the editor. STE = ["top","bottom"]; the auto/snap tucks = ["top"]. */
  notches?: NotchEnd[];
  /** Whether the inner/outer dimension mode applies (uniform thickness
   *  compensation). Default true; false for models where it's meaningless
   *  (e.g. the pillow box, whose depth is a bow, not a wall-bounded cavity). */
  supportsInnerDim?: boolean;
  /** Build the dieline. Params already in points (caller converts from UI units).
   *  `features` applies optional Phase 3 overlays (window cut etc.).
   *  `clearance` is a model-specific override (e.g. the drawer-box slide gap). */
  build: (params: {
    L: number; W: number; H: number; thickness: number; bleed: number;
    features?: FeatureOptions;
    clearance?: number;
    lockSlit?: number; // gable-box: lock-slit length override (pt)
    tagShape?: GiftTagShape; // gift-tag: shape variant
    holeDia?: number;        // gift-tag: hang-hole diameter (pt)
    scallop?: number;        // gift-tag: scallop bump radius (pt)
    flap?: EnvelopeFlap;     // envelope: closure flap style
    liner?: boolean;         // envelope: include the contrast liner piece
    earStyle?: EarringStyle; // earring-card: stud | dangle
    pairs?: number;          // earring-card: number of pair rows
    hangHole?: boolean;      // earring-card: top display hang hole
    cardShape?: CardShape;   // earring-card: rect | scallop | arch | tag-top
    header?: boolean;        // earring-card: fold-over header
    easel?: boolean;         // earring-card: easel-stand piece
    closure?: BandClosure;   // belly-band: glue | lock
    pennantShape?: PennantShape; // bunting: triangle | swallowtail | scallop
    labelShape?: JarLabelShape;  // jar-label: rect | oval | scallop
    bookmarkShape?: BookmarkShape; // bookmark: rounded | pointed | scallop
    necklaceStyle?: NecklaceCardStyle; // necklace-card: flat | fold
    topNotch?: boolean;    // tuck boxes: show the front TOP thumb notch (default on)
    bottomNotch?: boolean; // STE: show the front BOTTOM thumb notch (default on)
    hatEdge?: HatEdge;           // party-hat: straight | scallop
    chinHole?: boolean;          // party-hat: include chin-strap holes
    napkinClosure?: NapkinRingClosure; // napkin-ring: glue | lock
    napkinEdge?: NapkinRingEdge;       // napkin-ring: edge style
    topperShape?: CakeTopperShape;     // cake-topper: circle | heart | star | scallop
    holderW?: number;                  // cake-topper: stick-holder tab width / thickness (pt)
    holderDepth?: number;              // cake-topper: stick-holder tab length / protrusion (pt)

  }) => Dieline;
  /** Reasonable starter L/W/H/thickness/bleed in INCHES for this model.
   *  Editor uses these on first mount and on model swap so the user always
   *  sees a sensible example shape (a tuck-end carton uses card-box proportions,
   *  a mailer uses shallow shipper proportions, etc.). */
  defaultDimensions: { L: number; W: number; H: number; thickness: number; bleed: number };
}

const TUCK_END: ModelEntry = {
  id: "tuck-end",
  name: "Straight Tuck End",
  shortName: "Tuck-end carton",
  description: "Classic card / tuck box. Friction-tuck closure top & bottom.",
  category: "boxes",
  has3DPreview: true,
  hasFrontNotch: true,           // STE has the classic thumb notch
  supportsFeatures: ["window", "euro"],
  notches: ["top", "bottom"],    // both ends tuck → both notches toggleable
  // Reference card box: 120 × 60 × 160 mm
  defaultDimensions: { L: 4.7244, W: 2.3622, H: 6.2992, thickness: 0.018, bleed: 0.125 },
  // No size presets on the flagship STE — custom dims only.
  build: ({ L, W, H, thickness, bleed, features, topNotch, bottomNotch }) => {
    const base: TuckEndParams = {
      ...tuckEndDefaults(L, W, H, thickness), bleed,
      topNotch: topNotch ?? true, bottomNotch: bottomNotch ?? true,
    };
    return applyFeatures(buildTuckEnd(base), features);
  },
};

const ROLL_END_MAILER: ModelEntry = {
  id: "roll-end-mailer",
  name: "Roll-End Mailer",
  shortName: "Roll-end mailer",
  description: "One-piece e-commerce mailer. Tray + hinged lid + tuck tongue.",
  category: "boxes",
  has3DPreview: false,  // Box3D component is tuck-end specific for now
  hasFrontNotch: false, // mailer body is a plain rectangle
  // Shallow wide mailer (book/tablet shipper). Width > depth >> height.
  defaultDimensions: { L: 12, W: 8, H: 2.5, thickness: 0.018, bleed: 0.125 },
  build: ({ L, W, H, thickness, bleed }) => {
    const base: RollEndMailerParams = { ...rettDefaults(L, W, H, thickness), bleed };
    return buildRollEndMailer(base);
  },
};

const FLIP_TOP_MAILER: ModelEntry = {
  id: "flip-top-mailer",
  name: "Flip-Top Mailer",
  shortName: "Flip-top mailer",
  description: "One-piece flip-top mailer. Smooth Q-bezier curves + outer-edge lock tabs.",
  category: "boxes",
  has3DPreview: false,
  hasFrontNotch: false, // flip-top mailer is plain-walled
  // Match the reference example
  defaultDimensions: { L: 12.4016, W: 7.9528, H: 2.4409, thickness: 0.018, bleed: 0.125 },
  build: ({ L, W, H, thickness, bleed }) => {
    const base: FlipTopMailerParams = { ...flipDefaults(L, W, H, thickness), bleed };
    return buildFlipTopMailer(base);
  },
};

const REVERSE_TUCK_END: ModelEntry = {
  id: "reverse-tuck-end",
  name: "Reverse Tuck End",
  shortName: "RTE carton",
  description: "Reverse Tuck End carton. Tuck flaps on opposite corners (top off the back panel, bottom off the front). Common for cosmetics, pharma, confectionery.",
  category: "boxes",
  has3DPreview: true,  // uses the shared tuck-end Box3D — RTE looks identical to STE from outside when closed
  hasFrontNotch: false,  // RTE doesn't have the thumb-notch — closure is via the opposite-corner tuck flaps
  supportsFeatures: ["window", "euro", "thumb-notch"],
  // Decoded from source SVG: back/front panel 112.4mm = 4.43in, side 25mm = 0.98in,
  // body 185mm = 7.29in. Tall slim carton.
  defaultDimensions: { L: 4.43, W: 0.98, H: 7.29, thickness: 0.018, bleed: 0.125 },
  presets: [
    { label: "Lipstick (1 × 1 × 3.5)", L: 1, W: 1, H: 3.5 },
    { label: "Mascara (1 × 1 × 5.5)", L: 1, W: 1, H: 5.5 },
    { label: "Serum dropper — 30 ml (1.5 × 1.5 × 4.25)", L: 1.5, W: 1.5, H: 4.25 },
    { label: "Skincare tube (1.75 × 1.25 × 6)", L: 1.75, W: 1.25, H: 6 },
    { label: "Blister pack (2.5 × 0.75 × 4.5)", L: 2.5, W: 0.75, H: 4.5 },
  ],
  build: ({ L, W, H, thickness, bleed, features }) => {
    const base: ReverseTuckEndParams = { ...rteDefaults(L, W, H, thickness), bleed };
    return applyFeatures(buildReverseTuckEnd(base), features);
  },
};

const AUTO_BOTTOM: ModelEntry = {
  id: "auto-bottom",
  name: "Auto-Bottom Mailer",
  shortName: "Auto-bottom carton",
  description: "Crash-lock auto-bottom carton. Reverse-tuck top + pre-glued bottom that springs into a locked floor when squared. Retail / open-and-go.",
  category: "boxes",
  has3DPreview: true,  // crash-lock bottom fold built into buildFoldable
  hasFrontNotch: false,
  // Retail crash-lock box: tall-ish, medium footprint
  defaultDimensions: { L: 4.5, W: 2.2, H: 6.5, thickness: 0.018, bleed: 0.125 },
  presets: [
    { label: "Coffee — 12 oz (4 × 2.5 × 7)", L: 4, W: 2.5, H: 7 },
    { label: "Snack / cereal (5 × 2 × 8)", L: 5, W: 2, H: 8 },
    { label: "Cosmetics retail (3 × 3 × 5)", L: 3, W: 3, H: 5 },
    { label: "Bakery box (4 × 4 × 4.5)", L: 4, W: 4, H: 4.5 },
    { label: "Bottle / oil (3 × 3 × 9)", L: 3, W: 3, H: 9 },
  ],
  build: ({ L, W, H, thickness, bleed }) => {
    const base: AutoBottomParams = { ...autoDefaults(L, W, H, thickness), bleed };
    return buildAutoBottom(base);
  },
};

const TUCK_TOP_AUTO_BOTTOM: ModelEntry = {
  id: "tuck-top-auto-bottom",
  name: "Tuck-Top Auto-Bottom",
  shortName: "Tuck-top auto-bottom",
  description: "Straight tuck top (friction lock + thumb notch) over a glued crash-lock auto-bottom. Open-and-go bottom, re-closeable tuck top. High-volume retail.",
  category: "boxes",
  has3DPreview: true,  // straight-tuck top + crash-lock bottom built into buildFoldable
  hasFrontNotch: true, // STE-style thumb notch on the front
  supportsFeatures: ["window", "euro"],
  notches: ["top"], // tuck top only (bottom is the crash-lock)
  // Retail tuck-top crash-lock box: tall-ish, medium footprint
  defaultDimensions: { L: 4.5, W: 2.2, H: 6.5, thickness: 0.018, bleed: 0.125 },
  presets: [
    { label: "Coffee — 12 oz (4 × 2.5 × 7)", L: 4, W: 2.5, H: 7 },
    { label: "Supplement bottle (3 × 3 × 5.5)", L: 3, W: 3, H: 5.5 },
    { label: "Snack / cereal (5 × 2 × 8)", L: 5, W: 2, H: 8 },
    { label: "Bakery box (4 × 4 × 4.5)", L: 4, W: 4, H: 4.5 },
    { label: "Candle (3 × 3 × 4)", L: 3, W: 3, H: 4 },
  ],
  build: ({ L, W, H, thickness, bleed, features, topNotch }) => {
    const base: TuckTopAutoBottomParams = { ...tuckAutoDefaults(L, W, H, thickness), bleed, topNotch: topNotch ?? true };
    return applyFeatures(buildTuckTopAutoBottom(base), features);
  },
};

const SNAP_LOCK_BOTTOM: ModelEntry = {
  id: "snap-lock-bottom",
  name: "Tuck-Top Snap-Lock",
  shortName: "Snap-lock carton",
  description: "Straight tuck top over a glue-free mechanical snap-lock (1-2-3) bottom. The packer folds the bottom flaps and the front lock-tab snaps the floor shut — no bottom glue. Retail display, hand-pack lines.",
  category: "boxes",
  has3DPreview: true,  // straight-tuck top + snap-lock bottom built into buildFoldable
  hasFrontNotch: true, // STE-style thumb notch on the front
  supportsFeatures: ["window", "euro"],
  notches: ["top"], // tuck top only (bottom is the snap-lock)
  // Retail snap-lock display box
  defaultDimensions: { L: 4.5, W: 2.2, H: 6.5, thickness: 0.018, bleed: 0.125 },
  presets: [
    { label: "Cosmetics retail (3 × 3 × 5)", L: 3, W: 3, H: 5 },
    { label: "Coffee — 12 oz (4 × 2.5 × 7)", L: 4, W: 2.5, H: 7 },
    { label: "Candle jar (3.5 × 3.5 × 4)", L: 3.5, W: 3.5, H: 4 },
    { label: "Snack / cereal (5 × 2 × 8)", L: 5, W: 2, H: 8 },
    { label: "Bottle (3 × 3 × 9)", L: 3, W: 3, H: 9 },
  ],
  build: ({ L, W, H, thickness, bleed, features, topNotch }) => {
    const base: SnapLockBottomParams = { ...snapLockDefaults(L, W, H, thickness), bleed, topNotch: topNotch ?? true };
    return applyFeatures(buildSnapLockBottom(base), features);
  },
};

const GLUE_CARTON: ModelEntry = {
  id: "glue-carton",
  name: "Sealed-End Carton",
  shortName: "Glue carton",
  description: "Standard glue carton: a glued tube with BOTH ends sealed by four glued flaps — no tuck, no lock. The pharma / dry-food / confectionery standard. Strong, tamper-resistant, machine-glued.",
  category: "boxes",
  has3DPreview: true,  // 4 walls + glued flaps both ends in buildFoldable
  hasFrontNotch: false,
  supportsFeatures: ["window", "euro"],
  // Tall slim pharma / dry-goods carton
  defaultDimensions: { L: 2.5, W: 1.4, H: 5.0, thickness: 0.018, bleed: 0.125 },
  presets: [
    { label: "Pharma carton (2 × 1 × 4)", L: 2, W: 1, H: 4 },
    { label: "Tablet bottle (1.75 × 1.75 × 4)", L: 1.75, W: 1.75, H: 4 },
    { label: "Toothpaste (1.75 × 1.5 × 7)", L: 1.75, W: 1.5, H: 7 },
    { label: "Supplement (2.25 × 2.25 × 4.5)", L: 2.25, W: 2.25, H: 4.5 },
    { label: "Loose tea (2.75 × 2.75 × 4)", L: 2.75, W: 2.75, H: 4 },
  ],
  build: ({ L, W, H, thickness, bleed, features }) => {
    const base: GlueCartonParams = { ...glueCartonDefaults(L, W, H, thickness), bleed };
    return applyFeatures(buildGlueCarton(base), features);
  },
};

const OPEN_TRAY: ModelEntry = {
  id: "open-tray",
  name: "Open Tray",
  shortName: "Open tray",
  description: "Four-corner glued open tray. Base + four fold-up walls, corners glued for rigidity. Bakery / food / gift bases, retail trays.",
  category: "boxes",
  has3DPreview: true,  // tray fold-up built into buildFoldable
  hasFrontNotch: false,
  // Shallow gift / bakery tray
  defaultDimensions: { L: 8, W: 6, H: 2, thickness: 0.018, bleed: 0.125 },
  presets: [
    { label: "Chocolate tray — 12 pc (8 × 6 × 1)", L: 8, W: 6, H: 1 },
    { label: "Drawer organizer (6 × 4 × 2)", L: 6, W: 4, H: 2 },
    { label: "Catch-all (5 × 5 × 1.5)", L: 5, W: 5, H: 1.5 },
    { label: "Produce / bakery (9 × 6 × 2.5)", L: 9, W: 6, H: 2.5 },
    { label: "Seed-starter tray (7 × 5 × 1.5)", L: 7, W: 5, H: 1.5 },
  ],
  build: ({ L, W, H, thickness, bleed }) => {
    const base: OpenTrayParams = { ...trayDefaults(L, W, H, thickness), bleed };
    return buildOpenTray(base);
  },
};

const HINGE_LID_TRAY: ModelEntry = {
  id: "hinge-lid-tray",
  name: "Hinged-Lid Tray",
  shortName: "Hinged-lid tray",
  description: "One-piece tray with an attached flip lid. A four-corner glued base + a lid hinged off the back that tucks into the front wall to close. Chocolate / confectionery, phone-case, gift boxes.",
  category: "boxes",
  has3DPreview: true,  // erected tray + hinged folding lid in buildFoldable
  hasFrontNotch: false,
  // A shallow chocolate / gift tray
  defaultDimensions: { L: 6.0, W: 4.0, H: 1.5, thickness: 0.018, bleed: 0.125 },
  presets: [
    { label: "Chocolate — 9 pc (5 × 5 × 1.25)", L: 5, W: 5, H: 1.25 },
    { label: "Jewelry tray (4 × 4 × 1.5)", L: 4, W: 4, H: 1.5 },
    { label: "Soap gift (4 × 3 × 1.5)", L: 4, W: 3, H: 1.5 },
    { label: "Card / stationery (6 × 4.5 × 1)", L: 6, W: 4.5, H: 1 },
    { label: "Phone case (6.5 × 3.5 × 1)", L: 6.5, W: 3.5, H: 1 },
  ],
  build: ({ L, W, H, thickness, bleed }) => {
    const base: HingeLidTrayParams = { ...hingeLidDefaults(L, W, H, thickness), bleed };
    return buildHingeLidTray(base);
  },
};

const PILLOW_BOX: ModelEntry = {
  id: "pillow-box",
  name: "Pillow Box",
  shortName: "Pillow box",
  description: "Curved-end pillow box. Flattened tube with rounded tuck ends — gift cards, jewelry, lip products. The 'Height' input is the box DEPTH (drives the end curve).",
  category: "boxes",
  has3DPreview: true,  // bowed curved-surface pillow fold in buildFoldable
  hasFrontNotch: false,
  supportsInnerDim: false, // depth is a bow, not a wall-bounded cavity
  // Gift-card / jewelry pillow: L length, W width, depth ~1.2in. (H input = depth)
  defaultDimensions: { L: 5.5, W: 3.5, H: 1.2, thickness: 0.018, bleed: 0.125 },
  // Pillow "H" is the DEPTH (bow); the model clamps depth ≤ ~0.45·W, so keep H well under W.
  presets: [
    { label: "Jewelry (4 × 3 × 1)", L: 4, W: 3, H: 1 },
    { label: "Gift card (4.5 × 3 × 0.75)", L: 4.5, W: 3, H: 0.75 },
    { label: "Scarf / apparel (7 × 5 × 1.5)", L: 7, W: 5, H: 1.5 },
    { label: "Small favor (3 × 2.5 × 1)", L: 3, W: 2.5, H: 1 },
    { label: "Lip product (3.5 × 2 × 0.8)", L: 3.5, W: 2, H: 0.8 },
  ],
  build: ({ L, W, H, thickness, bleed }) => {
    // H (the editor's third dimension) is the pillow DEPTH for this model.
    const base: PillowBoxParams = { ...pillowDefaults(L, W, H, thickness), bleed };
    return buildPillowBox(base);
  },
};

const OPEN_SLEEVE: ModelEntry = {
  id: "open-sleeve",
  name: "Open Sleeve",
  shortName: "Open sleeve",
  description: "Open-ended wrap sleeve. A rectangular tube open at both ends that slides over a tray or product. Premium cosmetics, soap, candles, multi-packs.",
  category: "boxes",
  has3DPreview: true,  // wrap-into-tube fold built into buildFoldable
  hasFrontNotch: false,
  supportsFeatures: ["thumb"],
  // Slide-on sleeve (L = sleeve height, W × H = the cross-section it wraps)
  defaultDimensions: { L: 5, W: 3, H: 1.4, thickness: 0.018, bleed: 0.125 },
  presets: [
    { label: "Candle (3.5 × 3 × 3)", L: 3.5, W: 3, H: 3 },
    { label: "Soap band (3.5 × 2.5 × 1)", L: 3.5, W: 2.5, H: 1 },
    { label: "Card-box sleeve (5.5 × 4.25 × 0.6)", L: 5.5, W: 4.25, H: 0.6 },
    { label: "Mug box (4.5 × 4 × 4)", L: 4.5, W: 4, H: 4 },
    { label: "Multi-pack (6 × 4 × 3)", L: 6, W: 4, H: 3 },
  ],
  build: ({ L, W, H, thickness, bleed, features }) => {
    const base: OpenSleeveParams = { ...sleeveDefaults(L, W, H, thickness), bleed };
    return applyFeatures(buildOpenSleeve(base), features);
  },
};

const DRAWER_BOX: ModelEntry = {
  id: "drawer-box",
  name: "Drawer Box (sleeve + tray)",
  shortName: "Drawer box",
  description: "Two-piece slide / matchbox: an inner tray (drawer) + an outer sleeve auto-sized to wrap it. Enter the drawer size — the sleeve follows. Both flats in one file.",
  category: "boxes",
  has3DPreview: true,  // sleeve tube + sliding drawer in buildFoldable
  hasFrontNotch: false,
  // A drawer / gift box (enter the inner DRAWER size — the sleeve auto-sizes)
  defaultDimensions: { L: 4.5, W: 3, H: 1.3, thickness: 0.018, bleed: 0.125 },
  presets: [
    { label: "Matchbox (2 × 1.5 × 0.6)", L: 2, W: 1.5, H: 0.6 },
    { label: "Ring / jewelry (3 × 3 × 1.5)", L: 3, W: 3, H: 1.5 },
    { label: "Trinket (3.5 × 2.5 × 1)", L: 3.5, W: 2.5, H: 1 },
    { label: "Gift — small (5 × 3.5 × 1.5)", L: 5, W: 3.5, H: 1.5 },
    { label: "Tea drawer (4 × 3 × 1)", L: 4, W: 3, H: 1 },
  ],
  build: ({ L, W, H, thickness, bleed, clearance }) => {
    const base: DrawerBoxParams = { ...drawerDefaults(L, W, H, thickness), bleed };
    if (clearance != null) base.clearance = clearance;
    return buildDrawerBox(base);
  },
};

const RSC: ModelEntry = {
  id: "rsc",
  name: "Regular Slotted Container (RSC)",
  shortName: "RSC shipping box",
  description: "The classic corrugated shipping box (RSC). 4 walls + four flaps top & bottom; the outer flaps meet and you tape the seam. The most-used box style worldwide.",
  category: "boxes",
  has3DPreview: true,  // 4 walls + folding top flaps in buildFoldable
  hasFrontNotch: false,
  // A medium shipper
  defaultDimensions: { L: 12, W: 9, H: 6, thickness: 0.018, bleed: 0.125 },
  presets: [
    { label: "Small mailer (9 × 6 × 4)", L: 9, W: 6, H: 4 },
    { label: "Medium (12 × 9 × 6)", L: 12, W: 9, H: 6 },
    { label: "Large (16 × 12 × 8)", L: 16, W: 12, H: 8 },
    { label: "Cube (8 × 8 × 8)", L: 8, W: 8, H: 8 },
    { label: "Book / flat (11 × 8.5 × 2)", L: 11, W: 8.5, H: 2 },
  ],
  build: ({ L, W, H, thickness, bleed }) => {
    const base: RscParams = { ...rscDefaults(L, W, H, thickness), bleed };
    return buildRsc(base);
  },
};

const TRAY_LID: ModelEntry = {
  id: "tray-lid",
  name: "Tray + Lid (Full Telescope)",
  shortName: "Tray + lid box",
  description: "Two-piece full-telescope box: a base tray + a separate lid that telescopes down over it. Enter the base size — the lid follows. Gift, apparel, premium packaging.",
  category: "boxes",
  has3DPreview: true,  // base tray + lifting telescope lid in buildFoldable
  hasFrontNotch: false,
  // A gift / apparel two-piece box (enter the base size — the lid auto-sizes)
  defaultDimensions: { L: 9, W: 6, H: 2.5, thickness: 0.018, bleed: 0.125 },
  presets: [
    { label: "Apparel / shirt (12 × 9 × 2)", L: 12, W: 9, H: 2 },
    { label: "Gift — medium (8 × 6 × 3)", L: 8, W: 6, H: 3 },
    { label: "Photo / keepsake (6 × 6 × 2)", L: 6, W: 6, H: 2 },
    { label: "Shallow gift (9 × 6 × 1.5)", L: 9, W: 6, H: 1.5 },
    { label: "Hat / large (12 × 12 × 5)", L: 12, W: 12, H: 5 },
  ],
  build: ({ L, W, H, thickness, bleed, clearance }) => {
    const base: TrayLidParams = { ...trayLidDefaults(L, W, H, thickness), bleed };
    if (clearance != null) base.clearance = clearance;
    return buildTrayLid(base);
  },
};

const GABLE_BOX: ModelEntry = {
  id: "gable-box",
  name: "Gable Top Box",
  shortName: "Gable box",
  description: "Peaked 'house' gift carton with a built-in die-cut carry handle. 4-wall tube, gable roof + handle on top, tuck bottom. Retail, gift, party favours.",
  category: "boxes",
  has3DPreview: true,  // gable roof + gable ends + handle in buildFoldable
  hasFrontNotch: false,
  // A gable favour / gift box (tallish, square-ish footprint)
  defaultDimensions: { L: 5, W: 4, H: 5.5, thickness: 0.018, bleed: 0.125 },
  presets: [
    { label: "Mini favor (2.5 × 2.5 × 3)", L: 2.5, W: 2.5, H: 3 },
    { label: "Party favor (4 × 4 × 5)", L: 4, W: 4, H: 5 },
    { label: "Treat / cookie (5 × 4 × 5.5)", L: 5, W: 4, H: 5.5 },
    { label: "Gift — small (3.5 × 3 × 4)", L: 3.5, W: 3, H: 4 },
    { label: "Lunch / large (6 × 5 × 7)", L: 6, W: 5, H: 7 },
  ],
  build: ({ L, W, H, thickness, bleed, lockSlit }) => {
    const base: GableBoxParams = { ...gableDefaults(L, W, H, thickness), bleed };
    if (lockSlit != null) base.slitLen = lockSlit;
    return buildGableBox(base);
  },
};

const HEX_BOX: ModelEntry = {
  id: "hex-box",
  name: "Hexagon Box",
  shortName: "Hexagon box",
  description: "Decorative (elongated) hexagonal-prism box. Six walls + infold flaps that fold to a hex floor/lid. Candles, jewellery, soap, premium gifts. L = long axis, W = short axis.",
  category: "boxes",
  has3DPreview: true,  // hex prism + folding infold flaps in buildFoldable
  hasFrontNotch: false,
  // A hexagonal gift box (elongated). Keep L > W (L = long axis, W = short axis).
  defaultDimensions: { L: 5, W: 4.3, H: 3.5, thickness: 0.018, bleed: 0.125 },
  presets: [
    { label: "Pillar candle (5 × 4.3 × 6)", L: 5, W: 4.3, H: 6 },
    { label: "Soap (4.5 × 3.8 × 2.5)", L: 4.5, W: 3.8, H: 2.5 },
    { label: "Jewelry (4 × 3.3 × 2)", L: 4, W: 3.3, H: 2 },
    { label: "Gift (5.5 × 4.5 × 4)", L: 5.5, W: 4.5, H: 4 },
  ],
  build: ({ L, W, H, thickness, bleed }) => {
    const base: HexBoxParams = { ...hexDefaults(L, W, H, thickness), bleed };
    return buildHexBox(base);
  },
};

const HEX_TRAY_LID: ModelEntry = {
  id: "hex-tray-lid",
  name: "Hexagon Box + Lid",
  shortName: "Hex box + lid",
  description: "Two-piece OPENABLE hexagonal box: a hex base tray + a hex lid that telescopes over it (the single-piece Hexagon Box is glued shut). Enter the base size — the lid follows. Decorative gifts.",
  category: "boxes",
  has3DPreview: true,  // base hex tray + lifting telescope hex lid in buildFoldable
  hasFrontNotch: false,
  // Enter the base size — the lid auto-sizes. Keep L > W (long / short axis).
  defaultDimensions: { L: 5, W: 4.3, H: 3.5, thickness: 0.018, bleed: 0.125 },
  presets: [
    { label: "Pillar candle (5 × 4.3 × 6)", L: 5, W: 4.3, H: 6 },
    { label: "Soap (4.5 × 3.8 × 2.5)", L: 4.5, W: 3.8, H: 2.5 },
    { label: "Jewelry (4 × 3.3 × 2)", L: 4, W: 3.3, H: 2 },
    { label: "Gift (5.5 × 4.5 × 4)", L: 5.5, W: 4.5, H: 4 },
  ],
  build: ({ L, W, H, thickness, bleed, clearance }) => {
    const base: HexTrayLidParams = { ...hexTrayLidDefaults(L, W, H, thickness), bleed };
    if (clearance != null) base.clearance = clearance;
    return buildHexTrayLid(base);
  },
};

const GIFT_TAG: ModelEntry = {
  id: "gift-tag",
  name: "Gift Tag",
  shortName: "Gift tag",
  description: "Classic gift / swing tag — luggage, scalloped, or ticket shape — with a hang hole + a reinforcement ring piece. Flat die-cut; exports many-up on a sheet by default.",
  category: "tags-wraps",
  has3DPreview: false,   // nothing folds —
  flat: true,            // — so the editor hides the 3D pane entirely
  hasFrontNotch: false,
  supportsInnerDim: false, // flat item: no cavity to compensate
  // Editor inputs: L = tag width, W = tag height; H is meaningless → hidden.
  dimLabels: { L: "Tag width", W: "Tag height", H: null },
  preferSheetExport: true, // tags are ganged — default to the n-up sheet
  // A standard large kraft tag (2 × 3.5 in) in 110 lb cover stock.
  defaultDimensions: { L: 2, W: 3.5, H: 0, thickness: 0.014, bleed: 0.0625 },
  build: ({ L, W, thickness, bleed, tagShape, holeDia, scallop }) => {
    // Editor L = tag WIDTH, editor W = tag HEIGHT (flat item, H unused).
    const base = { ...giftTagDefaults(L, W, thickness), bleed };
    if (tagShape) base.shape = tagShape;
    if (holeDia != null) base.holeDia = holeDia;
    if (scallop != null) base.scallopR = scallop;
    return buildGiftTag(base);
  },
};

const ENVELOPE: ModelEntry = {
  id: "envelope",
  name: "Envelope",
  shortName: "Envelope",
  description: "Envelope — square (announcement), pointed (baronial), diamond (wedding / invitation: all flaps pointed with rounded tips + truncated glued bottom), pocket (portrait wallet with a long bottom pocket flap), or catalog (open-end document envelope: big side flaps meet at a centre back seam) flap. Optional contrast liner. Enter the finished face size, or pick a standard A/C-size preset. Flat die-cut; folds to seal.",
  category: "envelopes-cards",
  has3DPreview: true,    // folds on the Fold Engine (4 flaps off the face)
  flat: true,            // 2D-dimensioned (W×H, no H input; 2D export naming)
  hasFrontNotch: false,
  supportsInnerDim: false,
  // Editor inputs: L = envelope width, W = envelope height; H meaningless → hidden.
  dimLabels: { L: "Envelope width", W: "Envelope height", H: null },
  // Standard finished envelope sizes (public USPS / commercial dims), W × H in
  // inches → editor L (width) × W (height).
  presets: [
    { label: "A1 (3.625 × 5.125)", L: 5.125, W: 3.625 },
    { label: "A2 (4.375 × 5.75)", L: 5.75, W: 4.375 },
    { label: "A6 (4.75 × 6.5)", L: 6.5, W: 4.75 },
    { label: "A7 (5.25 × 7.25)", L: 7.25, W: 5.25 },
    { label: "A9 (5.75 × 8.75)", L: 8.75, W: 5.75 },
    { label: "C6 (162 × 114 mm)", L: 162 / 25.4, W: 114 / 25.4 },
    { label: "C5 (229 × 162 mm)", L: 229 / 25.4, W: 162 / 25.4 },
    { label: "C5 portrait (162 × 229 mm)", L: 162 / 25.4, W: 229 / 25.4 },
    { label: "Square 5×5", L: 5, W: 5 },
    { label: "Square 5.25×5.25 (CD)", L: 5.25, W: 5.25 },
    { label: "Square 6.5×6.5", L: 6.5, W: 6.5 },
    { label: "#10 business (4.125 × 9.5)", L: 9.5, W: 4.125 },
  ],
  // A2 — the most common card/invitation envelope.
  defaultDimensions: { L: 5.75, W: 4.375, H: 0, thickness: 0.012, bleed: 0.0625 },
  build: ({ L, W, thickness, bleed, flap, liner }) => {
    // Editor L = envelope WIDTH, editor W = envelope HEIGHT.
    const base = { ...envelopeDefaults(L, W, thickness), bleed };
    if (flap) base.flap = flap;
    if (liner != null) base.liner = liner;
    return buildEnvelope(base);
  },
};

const EARRING_CARD: ModelEntry = {
  id: "earring-card",
  name: "Earring Display Card",
  shortName: "Earring card",
  description: "Branded display card for earrings — stud (post holes) or dangle (hook holes) style, 1+ pairs, optional hang hole. Enter your card size or pick a preset. Flat die-cut; gangs many-up.",
  category: "display-cards",
  has3DPreview: false,
  flat: true,
  hasFrontNotch: false,
  supportsInnerDim: false,
  dimLabels: { L: "Card width", W: "Card height", H: null },
  preferSheetExport: true,
  // Common jewelry card sizes (W × H, inches → editor L × W).
  presets: [
    { label: "1.5 × 2", L: 1.5, W: 2 },
    { label: "2 × 2", L: 2, W: 2 },
    { label: "2 × 3", L: 2, W: 3 },
    { label: "2.5 × 3.5 (card)", L: 2.5, W: 3.5 },
    { label: "3 × 3", L: 3, W: 3 },
  ],
  defaultDimensions: { L: 2, W: 3, H: 0, thickness: 0.018, bleed: 0.0625 },
  build: ({ L, W, thickness, bleed, earStyle, pairs, holeDia, hangHole, cardShape, header, easel }) => {
    // Editor L = card WIDTH, editor W = card HEIGHT.
    const base = { ...earringDefaults(L, W, thickness), bleed };
    if (earStyle) base.style = earStyle;
    if (pairs != null) base.pairs = pairs;
    if (holeDia != null) base.holeDia = holeDia;
    if (hangHole != null) base.hangHole = hangHole;
    if (cardShape) base.shape = cardShape;
    if (header != null) base.header = header;
    if (easel != null) base.easel = easel;
    return buildEarringCard(base);
  },
};

const CUPCAKE_WRAPPER: ModelEntry = {
  id: "cupcake-wrapper",
  name: "Cupcake Wrapper",
  shortName: "Cupcake wrapper",
  description: "Scalloped cupcake wrapper — the decorative collar that wraps a cupcake. A frustum (truncated cone) unrolled to a ring sector, scalloped top edge, glue seam. Enter base ⌀, top ⌀ and height. Flat die-cut.",
  category: "tags-wraps",
  has3DPreview: true,    // bespoke cone renderer (flat sector mapped onto the cone)
  flat: true,           // 2D-dimensioned naming/title; the 3D pane shows (has3DPreview)
  hasFrontNotch: false,
  supportsInnerDim: false,
  dimLabels: { L: "Base ⌀", W: "Top ⌀", H: "Height" }, // all three meaningful
  preferSheetExport: true,
  // Standard cupcake: base ⌀ 2, top ⌀ 3, height 1.5 in (a flared cup).
  defaultDimensions: { L: 2, W: 3, H: 1.5, thickness: 0.012, bleed: 0.0625 },
  build: ({ L, W, H, thickness, bleed }) => {
    // Editor L = base ⌀, W = top ⌀, H = height (slant).
    const base = { ...cupcakeDefaults(L, W, H, thickness), bleed };
    return buildCupcakeWrapper(base);
  },
};

const BELLY_BAND: ModelEntry = {
  id: "belly-band",
  name: "Belly Band",
  shortName: "Belly band",
  description: "Wrap band for soap / cards / napkins / candles — a strip sized to the product's girth (the distance around), with a glue or tuck-lock closure. Flat die-cut; gangs many-up.",
  category: "tags-wraps",
  has3DPreview: true,    // bespoke "wrapped around a product" 3D
  flat: true,           // 2D-dimensioned naming; the 3D pane shows (has3DPreview)
  hasFrontNotch: false,
  supportsInnerDim: false,
  dimLabels: { L: "Girth (around)", W: "Band width", H: null },
  preferSheetExport: true,
  presets: [
    { label: "Soap bar (girth 9)", L: 9, W: 2 },
    { label: "Napkin (girth 6)", L: 6, W: 1.5 },
    { label: "Card stack (girth 5)", L: 5, W: 2 },
    { label: "Candle jar (girth 9)", L: 9, W: 2.5 },
    { label: "Tea towel (girth 12)", L: 12, W: 3 },
  ],
  defaultDimensions: { L: 9, W: 2, H: 0, thickness: 0.012, bleed: 0.0625 },
  build: ({ L, W, thickness, bleed, closure }) => {
    // Editor L = girth, W = band width.
    const base = { ...bandDefaults(L, W, thickness), bleed };
    if (closure) base.closure = closure;
    return buildBellyBand(base);
  },
};

const BUNTING_PENNANT: ModelEntry = {
  id: "bunting-pennant",
  name: "Bunting Pennant",
  shortName: "Bunting flag",
  description: "A single bunting / banner flag — triangle, swallowtail, or scalloped — with two lacing holes to thread the string. Cut many, string a garland. Flat die-cut; gangs many-up.",
  category: "party",
  has3DPreview: false,
  flat: true,
  hasFrontNotch: false,
  supportsInnerDim: false,
  dimLabels: { L: "Pennant width", W: "Pennant height", H: null },
  preferSheetExport: true,
  presets: [
    { label: "Mini (3 × 4)", L: 3, W: 4 },
    { label: "Small (4 × 5)", L: 4, W: 5 },
    { label: "Medium (5 × 7)", L: 5, W: 7 },
    { label: "Large (6 × 8)", L: 6, W: 8 },
  ],
  defaultDimensions: { L: 5, W: 7, H: 0, thickness: 0.014, bleed: 0.0625 },
  build: ({ L, W, thickness, bleed, pennantShape }) => {
    // Editor L = pennant width, W = pennant height.
    const base = { ...buntingDefaults(L, W, thickness), bleed };
    if (pennantShape) base.shape = pennantShape;
    return buildBuntingPennant(base);
  },
};

const PLACE_CARD: ModelEntry = {
  id: "place-card",
  name: "Place Card / Table Tent",
  shortName: "Place card",
  description: "A card folded in half that stands on a table — a name place card or a table tent. Enter the finished (folded) size; the blank is twice as tall with a centre fold. Stands on its bottom edges, no glue.",
  category: "party",
  has3DPreview: true,    // bespoke tent fold
  flat: true,            // 2D-dimensioned (W×H); the 3D pane shows (has3DPreview)
  hasFrontNotch: false,
  supportsInnerDim: false,
  dimLabels: { L: "Card width", W: "Card height (folded)", H: null },
  preferSheetExport: true,
  presets: [
    { label: "Place card (3.5 × 2)", L: 3.5, W: 2 },
    { label: "Tent — small (4 × 3)", L: 4, W: 3 },
    { label: "Tent — A7 (5 × 3.5)", L: 5, W: 3.5 },
    { label: "Tent — large (6 × 4)", L: 6, W: 4 },
  ],
  defaultDimensions: { L: 3.5, W: 2, H: 0, thickness: 0.018, bleed: 0.0625 },
  build: ({ L, W, thickness, bleed }) => {
    // Editor L = card width, W = card height (one panel).
    return buildPlaceCard({ ...placeCardDefaults(L, W, thickness), bleed });
  },
};

const GIFT_CARD_HOLDER: ModelEntry = {
  id: "gift-card-holder",
  name: "Gift-Card Holder",
  shortName: "Gift-card holder",
  description: "A folded card (opens like a book) that holds a gift / credit card by its corners — four diagonal retaining slits sized to a standard card. Enter the folded panel size; the blank is twice as wide with a centre fold.",
  category: "envelopes-cards",
  has3DPreview: false,
  flat: true,
  hasFrontNotch: false,
  supportsInnerDim: false,
  dimLabels: { L: "Panel width", W: "Holder height", H: null },
  preferSheetExport: true,
  presets: [
    { label: "Standard (4 × 3)", L: 4, W: 3 },
    { label: "Tall (3.75 × 5)", L: 3.75, W: 5 },
    { label: "Wide (4.5 × 3.25)", L: 4.5, W: 3.25 },
  ],
  defaultDimensions: { L: 4, W: 3, H: 0, thickness: 0.018, bleed: 0.0625 },
  build: ({ L, W, thickness, bleed }) => {
    // Editor L = folded panel width, W = holder height.
    return buildGiftCardHolder({ ...gcHolderDefaults(L, W, thickness), bleed });
  },
};

const FLOSS_BOBBIN: ModelEntry = {
  id: "floss-bobbin",
  name: "Floss Bobbin",
  shortName: "Floss bobbin",
  description: "Embroidery-floss organizer card — a spool-waisted card you wind floss around, with a hang hole for binder-ring storage and a thread-catch slit. Flat die-cut; cut a whole sheet at once.",
  category: "organizers",
  has3DPreview: false,
  flat: true,
  hasFrontNotch: false,
  supportsInnerDim: false,
  // Editor inputs: L = bobbin width, W = bobbin height; H is meaningless → hidden.
  dimLabels: { L: "Bobbin width", W: "Bobbin height", H: null },
  preferSheetExport: true, // bobbins are wound by the dozen — default to n-up
  presets: [
    { label: "Standard (1.75 × 2)", L: 1.75, W: 2 },
    { label: "Mini (1.4 × 1.6)", L: 1.4, W: 1.6 },
    { label: "Wide (2 × 1.75)", L: 2, W: 1.75 },
  ],
  // A standard floss card (1.75 × 2 in, portrait — like a plastic bobbin).
  defaultDimensions: { L: 1.75, W: 2, H: 0, thickness: 0.024, bleed: 0.0625 },
  build: ({ L, W, thickness, bleed }) => {
    // Editor L = bobbin WIDTH, editor W = bobbin HEIGHT (flat item, H unused).
    return buildFlossBobbin({ ...flossBobbinDefaults(L, W, thickness), bleed });
  },
};

const PAPER_ROSETTE: ModelEntry = {
  id: "paper-rosette",
  name: "Paper Rosette / Fan Medallion",
  shortName: "Rosette",
  description: "Accordion-pleated paper fan that opens into a full circle medallion (party backdrops, gift toppers). Enter the finished diameter + pleat width; you get two half-circle pleated strips (score lines alternate mountain/valley) and a centre disc. Flat die-cut; cut a whole sheet at once.",
  category: "party",
  has3DPreview: true, // bespoke fanned-medallion preview (paperRosetteFoldable)
  flat: true,
  hasFrontNotch: false,
  supportsInnerDim: false,
  // Editor inputs: L = finished diameter, W = pleat width; H is meaningless → hidden.
  dimLabels: { L: "Rosette diameter", W: "Pleat width", H: null },
  preferSheetExport: true, // strips + disc gang efficiently on a sheet
  presets: [
    { label: "Small (4 in)", L: 4, W: 0.4 },
    { label: "Medium (8 in)", L: 8, W: 0.5 },
    { label: "Large (12 in)", L: 12, W: 0.6 },
  ],
  // A medium party rosette: 8 in diameter, 0.5 in pleats.
  defaultDimensions: { L: 8, W: 0.5, H: 0, thickness: 0.012, bleed: 0.0625 },
  build: ({ L, W, thickness, bleed }) => {
    // Editor L = finished DIAMETER, editor W = PLEAT width (flat item, H unused).
    return buildPaperRosette({ ...rosetteDefaults(L, W, thickness), bleed });
  },
};

const FAVOR_POUCH: ModelEntry = {
  id: "favor-pouch",
  name: "Pyramid Favor Box",
  shortName: "Favor box",
  description: "A square-based pyramid favour box — a square base with four triangular walls that fold up to a point and glue at the tabs. Folds flat; holds candy, favors, and small gifts. Flat die-cut; cut a whole sheet at once.",
  category: "party",
  has3DPreview: true, // bespoke square-pyramid preview (pyramidPouchFoldable)
  flat: true,
  hasFrontNotch: false,
  supportsInnerDim: false,
  // Editor inputs: L = base edge, W = pyramid height; H is meaningless → hidden.
  dimLabels: { L: "Base width", W: "Pyramid height", H: null },
  preferSheetExport: true,
  presets: [
    { label: "Small treats (2 × 2)", L: 2, W: 2 },
    { label: "Candy / favor (2.5 × 2.5)", L: 2.5, W: 2.5 },
    { label: "Tall gift (3 × 3.5)", L: 3, W: 3.5 },
  ],
  // A candy / party-favor pyramid box.
  defaultDimensions: { L: 2.5, W: 2.75, H: 0, thickness: 0.012, bleed: 0.0625 },
  build: ({ L, W, thickness, bleed }) => {
    // Editor L = base edge, editor W = pyramid height (flat item, H unused).
    return buildFavorPouch({ ...favorPouchDefaults(L, W, thickness), bleed });
  },
};

const PAPER_FLOWER: ModelEntry = {
  id: "paper-flower",
  name: "Layered Paper Flower",
  shortName: "Paper flower",
  description: "The big layered paper flower (party backdrops, gift toppers, wreaths) — cut several flower-burst layers in graduated sizes, score each at the hub so the petals curl up, stack biggest-to-smallest, and glue at the centre with a little disc. Flat die-cut; cut a whole sheet at once.",
  category: "party",
  has3DPreview: true, // bespoke layered-flower preview (paperFlowerFoldable)
  flat: true,
  hasFrontNotch: false,
  supportsInnerDim: false,
  // Editor input: L = flower diameter; W and H are meaningless → hidden.
  dimLabels: { L: "Flower diameter", W: null, H: null },
  preferSheetExport: true,
  presets: [
    { label: "Small (4 in)", L: 4, W: 0 },
    { label: "Medium (6 in)", L: 6, W: 0 },
    { label: "Backdrop (12 in)", L: 12, W: 0 },
  ],
  // A medium party flower.
  defaultDimensions: { L: 6, W: 0, H: 0, thickness: 0.012, bleed: 0.0625 },
  build: ({ L, thickness, bleed }) => {
    // Editor L = flower diameter (flat item, W/H unused).
    return buildPaperFlower({ ...paperFlowerDefaults(L, thickness), bleed });
  },
};

const PAPER_LANTERN: ModelEntry = {
  id: "paper-lantern",
  name: "Paper Lantern",
  shortName: "Lantern",
  description: "The classic slit-cylinder lantern — a blank with a solid band top & bottom and vertical slits between. Roll it into a tube, glue the seam, and push the bands together so the strips bow out into a lantern. Hang hole included. Flat die-cut; cut a whole sheet at once.",
  category: "decor",
  has3DPreview: true, // bespoke rolled-lantern preview (paperLanternFoldable)
  flat: true,
  hasFrontNotch: false,
  supportsInnerDim: false,
  // Editor inputs: L = rolled diameter, W = height; H is meaningless → hidden.
  dimLabels: { L: "Lantern diameter", W: "Lantern height", H: null },
  preferSheetExport: true,
  presets: [
    { label: "Small (3 × 5)", L: 3, W: 5 },
    { label: "Medium (5 × 7)", L: 5, W: 7 },
    { label: "Large (7 × 10)", L: 7, W: 10 },
  ],
  // A medium party lantern.
  defaultDimensions: { L: 5, W: 7, H: 0, thickness: 0.008, bleed: 0.0625 },
  build: ({ L, W, thickness, bleed }) => {
    // Editor L = diameter, editor W = height (flat item, H unused).
    return buildPaperLantern({ ...paperLanternDefaults(L, W, thickness), bleed });
  },
};

const FOLDED_STAR: ModelEntry = {
  id: "folded-star",
  name: "3D Folded Star",
  shortName: "Folded star",
  description: "A flat 5-point star scored from the centre to every vertex — fold the tip lines (mountain) and the inner lines (valley) and it pops into a dimensional star, each point a raised ridge. Hang hole for an ornament. Flat die-cut; cut a whole sheet at once.",
  category: "decor",
  has3DPreview: true, // bespoke radial folded-star preview (foldedStarFoldable)
  flat: true,
  hasFrontNotch: false,
  supportsInnerDim: false,
  // Editor input: L = tip-to-tip diameter; W and H are meaningless → hidden.
  dimLabels: { L: "Star diameter", W: null, H: null },
  preferSheetExport: true,
  presets: [
    { label: "Small (3 in)", L: 3, W: 0 },
    { label: "Medium (5 in)", L: 5, W: 0 },
    { label: "Large (8 in)", L: 8, W: 0 },
  ],
  // A medium ornament star.
  defaultDimensions: { L: 5, W: 0, H: 0, thickness: 0.012, bleed: 0.0625 },
  build: ({ L, thickness, bleed }) => {
    // Editor L = tip diameter (flat item, W/H unused).
    return buildFoldedStar({ ...foldedStarDefaults(L, thickness), bleed });
  },
};

const SNOWFLAKE: ModelEntry = {
  id: "snowflake",
  name: "Geometric Snowflake",
  shortName: "Snowflake",
  description: "A parametric 6-fold snowflake — six branchy arms radiating from a hexagonal hub, with lacy interior cut-outs and a hang hole. Generated geometry (no traced design). Flat die-cut; cut a whole sheet at once.",
  category: "decor",
  has3DPreview: false, // flat decoration — the canvas dieline IS the preview
  flat: true,
  hasFrontNotch: false,
  supportsInnerDim: false,
  // Editor input: L = tip-to-tip diameter; W and H are meaningless → hidden.
  dimLabels: { L: "Snowflake diameter", W: null, H: null },
  preferSheetExport: true,
  presets: [
    { label: "Small (4 in)", L: 4, W: 0 },
    { label: "Medium (6 in)", L: 6, W: 0 },
    { label: "Large (10 in)", L: 10, W: 0 },
  ],
  // A medium ornament snowflake.
  defaultDimensions: { L: 6, W: 0, H: 0, thickness: 0.012, bleed: 0.0625 },
  build: ({ L, thickness, bleed }) => {
    // Editor L = tip diameter (flat item, W/H unused).
    return buildSnowflake({ ...snowflakeDefaults(L, thickness), bleed });
  },
};

const NECKLACE_CARD: ModelEntry = {
  id: "necklace-card",
  name: "Necklace / Bracelet Card",
  shortName: "Necklace card",
  description: "Jewelry display card for necklaces & bracelets. Flat style: a hang hole + a two-slit chain retainer that holds the piece flat. Fold-over style: an hourglass card that folds at the waist, with a hang slot top & bottom (the chain wraps the waist). Flat die-cut; cut a whole sheet at once.",
  category: "display-cards",
  has3DPreview: true, // the fold-over style folds in 3D (the flat style has no crease → gated off)
  flat: true,
  hasFrontNotch: false,
  supportsInnerDim: false,
  // Editor inputs: L = card width, W = card height; H is meaningless → hidden.
  dimLabels: { L: "Card width", W: "Card height", H: null },
  preferSheetExport: true,
  presets: [
    { label: "Necklace flat (2.5 × 3.5)", L: 2.5, W: 3.5 },
    { label: "Pendant flat (2 × 3)", L: 2, W: 3 },
    { label: "Bracelet flat (3.5 × 2.5)", L: 3.5, W: 2.5 },
    { label: "Necklace fold-over (2.25 × 5)", L: 2.25, W: 5 },
    { label: "Long fold-over (2.5 × 6)", L: 2.5, W: 6 },
  ],
  // A standard necklace display card (2.5 × 3.5 in).
  defaultDimensions: { L: 2.5, W: 3.5, H: 0, thickness: 0.018, bleed: 0.0625 },
  build: ({ L, W, thickness, bleed, hangHole, necklaceStyle }) => {
    // Editor L = card WIDTH, editor W = card HEIGHT (flat item, H unused).
    const base = necklaceCardDefaults(L, W, thickness);
    if (necklaceStyle) base.style = necklaceStyle;
    if (hangHole != null) base.hangHole = hangHole;
    return buildNecklaceCard({ ...base, bleed });
  },
};

const HAIR_BOW_CARD: ModelEntry = {
  id: "hair-bow-card",
  name: "Hair-Bow / Clip Card",
  shortName: "Hair-bow card",
  description: "Display card for hair bows & clips — a hang hole + slot pairs you thread each clip/bow through. Set how many bows per card. Flat die-cut; cut a whole sheet at once.",
  category: "display-cards",
  has3DPreview: false,
  flat: true,
  hasFrontNotch: false,
  supportsInnerDim: false,
  // Editor inputs: L = card width, W = card height; H is meaningless → hidden.
  dimLabels: { L: "Card width", W: "Card height", H: null },
  preferSheetExport: true,
  presets: [
    { label: "2 bows (2.75 × 4.5)", L: 2.75, W: 4.5 },
    { label: "Single (2.5 × 3)", L: 2.5, W: 3 },
    { label: "3 bows (3 × 6)", L: 3, W: 6 },
  ],
  // A standard 2-bow hair-clip card (2.75 × 4.5 in).
  defaultDimensions: { L: 2.75, W: 4.5, H: 0, thickness: 0.018, bleed: 0.0625 },
  build: ({ L, W, thickness, bleed, hangHole, pairs }) => {
    // Editor L = card WIDTH, editor W = card HEIGHT (flat item, H unused).
    const base = hairBowCardDefaults(L, W, thickness);
    if (hangHole != null) base.hangHole = hangHole;
    if (pairs != null) base.pairs = pairs;
    return buildHairBowCard({ ...base, bleed });
  },
};

const JAR_LABEL: ModelEntry = {
  id: "jar-label",
  name: "Jar / Product Label",
  shortName: "Jar label",
  description: "A label cut to size — rounded-rect, oval, or scalloped — for jars, candles, bottles, soap. The shape is the cut; drop your artwork inside (Print & Cut) and gang a whole sheet.",
  category: "tags-wraps",
  has3DPreview: false,
  flat: true,
  hasFrontNotch: false,
  supportsInnerDim: false,
  // Editor inputs: L = label width, W = label height; H is meaningless → hidden.
  dimLabels: { L: "Label width", W: "Label height", H: null },
  preferSheetExport: true,
  presets: [
    { label: "Oval — small (2.5 × 1.5)", L: 2.5, W: 1.5 },
    { label: "Oval — medium (3.5 × 2)", L: 3.5, W: 2 },
    { label: "Round (2.5 × 2.5)", L: 2.5, W: 2.5 },
    { label: "Rect (3 × 2)", L: 3, W: 2 },
  ],
  // A common preserve / candle label (oval, 3 × 2 in).
  defaultDimensions: { L: 3, W: 2, H: 0, thickness: 0.008, bleed: 0.0625 },
  build: ({ L, W, thickness, bleed, labelShape, scallop }) => {
    // Editor L = label WIDTH, editor W = label HEIGHT (flat item, H unused).
    const base = jarLabelDefaults(L, W, thickness);
    if (labelShape) base.shape = labelShape;
    if (scallop != null) base.scallopR = scallop;
    return buildJarLabel({ ...base, bleed });
  },
};

const BOOKMARK: ModelEntry = {
  id: "bookmark",
  name: "Bookmark",
  shortName: "Bookmark",
  description: "A flat bookmark with a tassel hole — rounded, pointed, or scalloped. Gang several per sheet.",
  category: "tags-wraps",
  has3DPreview: true,   // bespoke thin-card renderer in bookmarkFoldable
  flat: true,
  hasFrontNotch: false,
  supportsInnerDim: false,
  // Editor inputs: L = bookmark width, W = bookmark height; H is meaningless → hidden.
  dimLabels: { L: "Bookmark width", W: "Bookmark height", H: null },
  preferSheetExport: true,
  presets: [
    { label: "Standard (2 × 6)", L: 2, W: 6 },
    { label: "Slim (1.5 × 7)", L: 1.5, W: 7 },
    { label: "Wide (2.5 × 5)", L: 2.5, W: 5 },
  ],
  // A standard bookmark (2 × 6 in).
  defaultDimensions: { L: 2, W: 6, H: 0, thickness: 0.018, bleed: 0.0625 },
  build: ({ L, W, thickness, bleed, bookmarkShape, scallop }) => {
    // Editor L = bookmark WIDTH, editor W = bookmark HEIGHT (flat item, H unused).
    const base = bookmarkDefaults(L, W, thickness);
    if (bookmarkShape) base.shape = bookmarkShape;
    if (scallop != null) base.scallopR = scallop;
    return buildBookmark({ ...base, bleed });
  },
};

const BUNNY_BOX: ModelEntry = {
  id: "bunny-box",
  name: "Bunny Treat Box",
  shortName: "Bunny box",
  description: "A bunny-eared favour / treat box: a four-corner glued open tray whose front wall grows two ears, with a PRINTABLE face — eyes, nose, inner-ears, cheeks, mouth — you can recolour. Folds + glues; the face prints. Swap the ears/face → cat, bear, fox.",
  category: "party",
  has3DPreview: true,    // folds via the open-tray Fold Engine spec; face = print decal
  hasFrontNotch: false,
  // A square favour / treat box; the ears add height on top of the walls.
  defaultDimensions: { L: 3, W: 3, H: 3.5, thickness: 0.018, bleed: 0.0625 },
  presets: [
    { label: "Mini favour (2.25 × 2.25 × 2.5)", L: 2.25, W: 2.25, H: 2.5 },
    { label: "Treat box (3 × 3 × 3.5)", L: 3, W: 3, H: 3.5 },
    { label: "Tall (3 × 3 × 5)", L: 3, W: 3, H: 5 },
    { label: "Wide (4 × 3 × 3.5)", L: 4, W: 3, H: 3.5 },
  ],
  build: ({ L, W, H, thickness, bleed }) => buildBunnyBox({ ...bunnyDefaults(L, W, H, thickness), bleed }),
};

// Cat / Bear / Fox — the same animal-box body + lid + fold + face pipeline as the
// bunny (see docs/animal-boxes.md); only the ears + face shapes differ.
const CAT_BOX: ModelEntry = {
  id: "cat-box",
  name: "Cat Treat Box",
  shortName: "Cat box",
  description: "A cat-eared favour / treat box: the same four-corner glued open tray + tuck-top lid as the bunny, with pointed triangle ears and a PRINTABLE cat face — inner ears, eyes, nose, mouth, whiskers — you can recolour.",
  category: "party",
  has3DPreview: true,
  hasFrontNotch: false,
  defaultDimensions: { L: 3, W: 3, H: 3.5, thickness: 0.018, bleed: 0.0625 },
  presets: [
    { label: "Mini favour (2.25 × 2.25 × 2.5)", L: 2.25, W: 2.25, H: 2.5 },
    { label: "Treat box (3 × 3 × 3.5)", L: 3, W: 3, H: 3.5 },
    { label: "Tall (3 × 3 × 5)", L: 3, W: 3, H: 5 },
    { label: "Wide (4 × 3 × 3.5)", L: 4, W: 3, H: 3.5 },
  ],
  build: ({ L, W, H, thickness, bleed }) => buildCatBox({ ...catDefaults(L, W, H, thickness), bleed }),
};

const BEAR_BOX: ModelEntry = {
  id: "bear-box",
  name: "Bear Treat Box",
  shortName: "Bear box",
  description: "A bear-eared favour / treat box: the same four-corner glued open tray + tuck-top lid as the bunny, with round ears and a PRINTABLE bear face — inner ears, a muzzle, eyes, nose, mouth — you can recolour.",
  category: "party",
  has3DPreview: true,
  hasFrontNotch: false,
  defaultDimensions: { L: 3, W: 3, H: 3.5, thickness: 0.018, bleed: 0.0625 },
  presets: [
    { label: "Mini favour (2.25 × 2.25 × 2.5)", L: 2.25, W: 2.25, H: 2.5 },
    { label: "Treat box (3 × 3 × 3.5)", L: 3, W: 3, H: 3.5 },
    { label: "Tall (3 × 3 × 5)", L: 3, W: 3, H: 5 },
    { label: "Wide (4 × 3 × 3.5)", L: 4, W: 3, H: 3.5 },
  ],
  build: ({ L, W, H, thickness, bleed }) => buildBearBox({ ...bearDefaults(L, W, H, thickness), bleed }),
};

const FOX_BOX: ModelEntry = {
  id: "fox-box",
  name: "Fox Treat Box",
  shortName: "Fox box",
  description: "A fox-eared favour / treat box: the same four-corner glued open tray + tuck-top lid as the bunny, with tall pointed ears and a PRINTABLE fox face — orange ears + face patch, white snout, eyes, nose — you can recolour.",
  category: "party",
  has3DPreview: true,
  hasFrontNotch: false,
  defaultDimensions: { L: 3, W: 3, H: 3.5, thickness: 0.018, bleed: 0.0625 },
  presets: [
    { label: "Mini favour (2.25 × 2.25 × 2.5)", L: 2.25, W: 2.25, H: 2.5 },
    { label: "Treat box (3 × 3 × 3.5)", L: 3, W: 3, H: 3.5 },
    { label: "Tall (3 × 3 × 5)", L: 3, W: 3, H: 5 },
    { label: "Wide (4 × 3 × 3.5)", L: 4, W: 3, H: 3.5 },
  ],
  build: ({ L, W, H, thickness, bleed }) => buildFoxBox({ ...foxDefaults(L, W, H, thickness), bleed }),
};

const ANIMAL_PRESETS = [
  { label: "Mini favour (2.25 × 2.25 × 2.5)", L: 2.25, W: 2.25, H: 2.5 },
  { label: "Treat box (3 × 3 × 3.5)", L: 3, W: 3, H: 3.5 },
  { label: "Tall (3 × 3 × 5)", L: 3, W: 3, H: 5 },
  { label: "Wide (4 × 3 × 3.5)", L: 4, W: 3, H: 3.5 },
];

const PANDA_BOX: ModelEntry = {
  id: "panda-box",
  name: "Panda Treat Box",
  shortName: "Panda box",
  description: "A panda-eared favour / treat box: the same four-corner glued open tray + tuck-top lid as the bunny, with round black ears and a PRINTABLE panda face — black eye patches, eyes, nose, mouth — you can recolour.",
  category: "party",
  has3DPreview: true,
  hasFrontNotch: false,
  defaultDimensions: { L: 3, W: 3, H: 3.5, thickness: 0.018, bleed: 0.0625 },
  presets: ANIMAL_PRESETS,
  build: ({ L, W, H, thickness, bleed }) => buildPandaBox({ ...pandaDefaults(L, W, H, thickness), bleed }),
};

const PIG_BOX: ModelEntry = {
  id: "pig-box",
  name: "Pig Treat Box",
  shortName: "Pig box",
  description: "A pig-eared favour / treat box: the same four-corner glued open tray + tuck-top lid as the bunny, with small ears and a PRINTABLE pig face — a pink snout with nostrils, eyes, mouth — you can recolour.",
  category: "party",
  has3DPreview: true,
  hasFrontNotch: false,
  defaultDimensions: { L: 3, W: 3, H: 3.5, thickness: 0.018, bleed: 0.0625 },
  presets: ANIMAL_PRESETS,
  build: ({ L, W, H, thickness, bleed }) => buildPigBox({ ...pigDefaults(L, W, H, thickness), bleed }),
};

const OWL_BOX: ModelEntry = {
  id: "owl-box",
  name: "Owl Treat Box",
  shortName: "Owl box",
  description: "An owl-eared favour / treat box: the same four-corner glued open tray + tuck-top lid as the bunny, with feather tufts and a PRINTABLE owl face — big eyes (facial discs + pupils) and a beak — you can recolour.",
  category: "party",
  has3DPreview: true,
  hasFrontNotch: false,
  defaultDimensions: { L: 3, W: 3, H: 3.5, thickness: 0.018, bleed: 0.0625 },
  presets: ANIMAL_PRESETS,
  build: ({ L, W, H, thickness, bleed }) => buildOwlBox({ ...owlDefaults(L, W, H, thickness), bleed }),
};

const DOG_BOX: ModelEntry = {
  id: "dog-box",
  name: "Dog Treat Box",
  shortName: "Dog box",
  description: "A dog-eared favour / treat box: the same four-corner glued open tray + tuck-top lid as the bunny, with floppy ears and a PRINTABLE puppy face — inner ears, eyes, a muzzle, nose and tongue — you can recolour.",
  category: "party",
  has3DPreview: true,
  hasFrontNotch: false,
  defaultDimensions: { L: 3, W: 3, H: 3.5, thickness: 0.018, bleed: 0.0625 },
  presets: ANIMAL_PRESETS,
  build: ({ L, W, H, thickness, bleed }) => buildDogBox({ ...dogDefaults(L, W, H, thickness), bleed }),
};

const LION_BOX: ModelEntry = {
  id: "lion-box",
  name: "Lion Treat Box",
  shortName: "Lion box",
  description: "A lion favour / treat box: the same four-corner glued open tray + tuck-top lid as the bunny, with small round ears and a PRINTABLE lion face — a golden mane, eyes, nose and mouth — you can recolour.",
  category: "party",
  has3DPreview: true,
  hasFrontNotch: false,
  defaultDimensions: { L: 3, W: 3, H: 3.5, thickness: 0.018, bleed: 0.0625 },
  presets: ANIMAL_PRESETS,
  build: ({ L, W, H, thickness, bleed }) => buildLionBox({ ...lionDefaults(L, W, H, thickness), bleed }),
};

const UNICORN_BOX: ModelEntry = {
  id: "unicorn-box",
  name: "Unicorn Treat Box",
  shortName: "Unicorn box",
  description: "A unicorn favour / treat box: the same four-corner glued open tray + tuck-top lid as the bunny, with a centre horn + ears and a PRINTABLE unicorn face — horn, mane, lash eyes and blush cheeks — you can recolour.",
  category: "party",
  has3DPreview: true,
  hasFrontNotch: false,
  defaultDimensions: { L: 3, W: 3, H: 3.5, thickness: 0.018, bleed: 0.0625 },
  presets: ANIMAL_PRESETS,
  build: ({ L, W, H, thickness, bleed }) => buildUnicornBox({ ...unicornDefaults(L, W, H, thickness), bleed }),
};

const FROG_BOX: ModelEntry = {
  id: "frog-box",
  name: "Frog Treat Box",
  shortName: "Frog box",
  description: "A frog favour / treat box: the same four-corner glued open tray + tuck-top lid as the bunny, with two bulging eyes on top and a PRINTABLE frog face — green skin, big eyes, nostrils and a wide grin — you can recolour.",
  category: "party",
  has3DPreview: true,
  hasFrontNotch: false,
  defaultDimensions: { L: 3, W: 3, H: 3.5, thickness: 0.018, bleed: 0.0625 },
  presets: ANIMAL_PRESETS,
  build: ({ L, W, H, thickness, bleed }) => buildFrogBox({ ...frogDefaults(L, W, H, thickness), bleed }),
};

const MOUSE_BOX: ModelEntry = {
  id: "mouse-box",
  name: "Mouse Treat Box",
  shortName: "Mouse box",
  description: "A mouse favour / treat box: the same four-corner glued open tray + tuck-top lid as the bunny, with big round ears and a PRINTABLE mouse face — inner ears, eyes, a little nose and whiskers — you can recolour.",
  category: "party",
  has3DPreview: true,
  hasFrontNotch: false,
  defaultDimensions: { L: 3, W: 3, H: 3.5, thickness: 0.018, bleed: 0.0625 },
  presets: ANIMAL_PRESETS,
  build: ({ L, W, H, thickness, bleed }) => buildMouseBox({ ...mouseDefaults(L, W, H, thickness), bleed }),
};

const SHEEP_BOX: ModelEntry = {
  id: "sheep-box",
  name: "Sheep Treat Box",
  shortName: "Sheep box",
  description: "A sheep favour / treat box: the same four-corner glued open tray + tuck-top lid as the bunny, with a woolly scalloped top and a PRINTABLE lamb face — floppy ears, eyes, nose and a smile — you can recolour.",
  category: "party",
  has3DPreview: true,
  hasFrontNotch: false,
  defaultDimensions: { L: 3, W: 3, H: 3.5, thickness: 0.018, bleed: 0.0625 },
  presets: ANIMAL_PRESETS,
  build: ({ L, W, H, thickness, bleed }) => buildSheepBox({ ...sheepDefaults(L, W, H, thickness), bleed }),
};

const BAT_BOX: ModelEntry = {
  id: "bat-box",
  name: "Bat Treat Box",
  shortName: "Bat box",
  description: "A bat favour / treat box for Halloween: the same four-corner glued open tray + tuck-top lid as the bunny, with pointed ears and a PRINTABLE bat face — dark face, big eyes and little fangs — you can recolour.",
  category: "party",
  has3DPreview: true,
  hasFrontNotch: false,
  defaultDimensions: { L: 3, W: 3, H: 3.5, thickness: 0.018, bleed: 0.0625 },
  presets: ANIMAL_PRESETS,
  build: ({ L, W, H, thickness, bleed }) => buildBatBox({ ...batDefaults(L, W, H, thickness), bleed }),
};

const CHICK_BOX: ModelEntry = {
  id: "chick-box",
  name: "Chick Treat Box",
  shortName: "Chick box",
  description: "A chick favour / treat box for Easter: the same four-corner glued open tray + tuck-top lid as the bunny, with a little feather tuft and a PRINTABLE chick face — yellow body, eyes, beak and cheeks — you can recolour.",
  category: "party",
  has3DPreview: true,
  hasFrontNotch: false,
  defaultDimensions: { L: 3, W: 3, H: 3.5, thickness: 0.018, bleed: 0.0625 },
  presets: ANIMAL_PRESETS,
  build: ({ L, W, H, thickness, bleed }) => buildChickBox({ ...chickDefaults(L, W, H, thickness), bleed }),
};

const REINDEER_BOX: ModelEntry = {
  id: "reindeer-box",
  name: "Reindeer Treat Box",
  shortName: "Reindeer box",
  description: "A reindeer favour / treat box for Christmas: the same four-corner glued open tray + tuck-top lid as the bunny, with branchy antlers and a PRINTABLE reindeer face — ears, a tan muzzle, eyes and nose — you can recolour.",
  category: "party",
  has3DPreview: true,
  hasFrontNotch: false,
  defaultDimensions: { L: 3, W: 3, H: 3.5, thickness: 0.018, bleed: 0.0625 },
  presets: ANIMAL_PRESETS,
  build: ({ L, W, H, thickness, bleed }) => buildReindeerBox({ ...reindeerDefaults(L, W, H, thickness), bleed }),
};

const HEART_BOX: ModelEntry = {
  id: "heart-box",
  name: "Heart Box",
  shortName: "Heart box",
  description: "A heart-shaped two-piece gift box — the classic Valentine's / wedding chocolate box. A wall band rolls around the heart perimeter (glued seam + fold-in bottom tabs) and a heart floor glues on; a slightly larger lid telescopes over. Enter the heart width + box depth.",
  category: "boxes",
  has3DPreview: true,
  flat: true,            // 2D-dimensioned (heart width × box depth); the bands roll
  hasFrontNotch: false,
  supportsInnerDim: false,
  dimLabels: { L: "Heart width", W: null, H: "Box depth" },
  defaultDimensions: { L: 5, W: 5, H: 1.5, thickness: 0.018, bleed: 0.0625 },
  presets: [
    { label: "Small (4 × 1.25 in)", L: 4, W: 4, H: 1.25 },
    { label: "Medium (5 × 1.5 in)", L: 5, W: 5, H: 1.5 },
    { label: "Large (6.5 × 2 in)", L: 6.5, W: 6.5, H: 2 },
  ],
  // Editor L = heart width, H = box depth (wall height); W is hidden.
  build: ({ L, H, thickness, bleed }) => buildHeartBox({ ...heartDefaults(L, H, thickness), bleed }),
};

const PARTY_HAT: ModelEntry = {
  id: "party-hat",
  name: "Party Hat",
  shortName: "Party hat",
  description: "A cone party hat unrolled to a flat sector — vertex at top, base arc at bottom. Optional scalloped edge + chin-strap holes. Gang many-up on a sheet and cut from festive card.",
  category: "party",
  has3DPreview: true,
  flat: true,
  hasFrontNotch: false,
  supportsInnerDim: false,
  dimLabels: { L: "Head diameter", W: "Hat height", H: null },
  preferSheetExport: true,
  presets: [
    { label: "Child hat (D=7, H=9)", L: 7, W: 9 },
    { label: "Adult hat (D=8, H=10)", L: 8, W: 10 },
    { label: "Mini hat (D=5, H=6)", L: 5, W: 6 },
  ],
  defaultDimensions: { L: 7, W: 9, H: 0, thickness: 0.012, bleed: 0.0625 },
  build: ({ L, W, thickness, bleed, hatEdge, chinHole }) => {
    const base = { ...partyHatDefaults(L, W, thickness), bleed };
    if (hatEdge !== undefined) base.edge = hatEdge;
    if (chinHole !== undefined) base.chinHole = chinHole;
    return buildPartyHat(base);
  },
};


const NAPKIN_RING: ModelEntry = {
  id: "napkin-ring",
  name: "Napkin Ring",
  shortName: "Napkin ring",
  description: "A decorative wrap band for folded napkins — sized to the napkin girth with a scalloped edge and a tuck-lock or glue closure. Cut a set and add instant table elegance.",
  category: "party",
  has3DPreview: true,
  flat: true,
  hasFrontNotch: false,
  supportsInnerDim: false,
  dimLabels: { L: "Napkin girth", W: "Band height", H: null },
  preferSheetExport: true,
  presets: [
    { label: "Dinner napkin (girth 6)", L: 6, W: 1.75 },
    { label: "Cocktail napkin (girth 5)", L: 5, W: 1.5 },
    { label: "Wide band (girth 6)", L: 6, W: 2.5 },
  ],
  defaultDimensions: { L: 6, W: 1.75, H: 0, thickness: 0.012, bleed: 0.0625 },
  build: ({ L, W, thickness, bleed, napkinClosure, napkinEdge }) => {
    const base = { ...napkinRingDefaults(L, W, thickness), bleed };
    if (napkinClosure !== undefined) base.closure = napkinClosure;
    if (napkinEdge !== undefined) base.edge = napkinEdge;
    return buildNapkinRing(base);
  },
};

const CAKE_TOPPER: ModelEntry = {
  id: "cake-topper",
  name: "Cake Topper",
  shortName: "Cake topper",
  description: "A flat decorative topper shape — circle, heart, star, or scallop — with a stick slot at the bottom for a bamboo skewer or lollipop stick. Press into a cake or cupcake.",
  category: "party",
  has3DPreview: false,
  flat: true,
  hasFrontNotch: false,
  supportsInnerDim: false,
  dimLabels: { L: "Topper size", W: null, H: null },
  preferSheetExport: true,
  presets: [
    { label: "Small (3 in)", L: 3, W: 3 },
    { label: "Medium (4 in)", L: 4, W: 4 },
    { label: "Large (5 in)", L: 5, W: 5 },
  ],
  defaultDimensions: { L: 4, W: 4, H: 0, thickness: 0.012, bleed: 0.0625 },
  build: ({ L, thickness, bleed, topperShape, holderW, holderDepth }) => {
    const base = { ...cakeTopperDefaults(L, thickness), bleed };
    if (topperShape !== undefined) base.shape = topperShape;
    if (holderW !== undefined) base.holderW = holderW;
    if (holderDepth !== undefined) base.holderDepth = holderDepth;
    return buildCakeTopper(base);
  },
};


export const MODELS: ModelEntry[] = [TUCK_END, REVERSE_TUCK_END, AUTO_BOTTOM, TUCK_TOP_AUTO_BOTTOM, SNAP_LOCK_BOTTOM, GLUE_CARTON, OPEN_TRAY, HINGE_LID_TRAY, PILLOW_BOX, OPEN_SLEEVE, DRAWER_BOX, TRAY_LID, GABLE_BOX, HEX_BOX, HEX_TRAY_LID, RSC, HEART_BOX, GIFT_TAG, ENVELOPE, EARRING_CARD, CUPCAKE_WRAPPER, BELLY_BAND, BUNTING_PENNANT, PLACE_CARD, GIFT_CARD_HOLDER, FLOSS_BOBBIN, NECKLACE_CARD, HAIR_BOW_CARD, JAR_LABEL, BOOKMARK, PAPER_ROSETTE, FAVOR_POUCH, PAPER_FLOWER, PAPER_LANTERN, FOLDED_STAR, SNOWFLAKE, BUNNY_BOX, CAT_BOX, BEAR_BOX, FOX_BOX, PANDA_BOX, PIG_BOX, OWL_BOX, DOG_BOX, LION_BOX, UNICORN_BOX, FROG_BOX, MOUSE_BOX, SHEEP_BOX, BAT_BOX, CHICK_BOX, REINDEER_BOX, PARTY_HAT, NAPKIN_RING, CAKE_TOPPER, ROLL_END_MAILER, FLIP_TOP_MAILER];

// The animal-box family (shared body/lid/fold/face — see docs/animal-boxes.md).
// Used by the 3D preview + gallery snapshot for the family's framing + front-on
// pose. Add a new animal's id here (one place) when you add one.
export const ANIMAL_BOX_IDS: ModelId[] = ["bunny-box", "cat-box", "bear-box", "fox-box", "panda-box", "pig-box", "owl-box", "dog-box", "lion-box", "unicorn-box", "frog-box", "mouse-box", "sheep-box", "bat-box", "chick-box", "reindeer-box"];
export const isAnimalBox = (id: string): boolean => (ANIMAL_BOX_IDS as string[]).includes(id);

// Animal treat boxes belong to the "animals" gallery category, derived here from
// ANIMAL_BOX_IDS so adding an animal needs no per-entry edit (their literals read
// `category: "party"` only as a default; this is the source of truth).
for (const _m of MODELS) if (isAnimalBox(_m.id)) _m.category = "animals";

export const getModel = (id: string): ModelEntry =>
  MODELS.find((m) => m.id === id) ?? TUCK_END;

// Preferred 3D preview fold per model (0 = closed, 1 = open). Most boxes read
// best partly-open so their flaps show; some read best nearly closed (a gable's
// peaked roof, a wrap's finished package — half-folded they're unrecognisable).
// Shared by the editor preview AND the gallery thumbnail so they always agree.
const PREVIEW_FOLD: Partial<Record<ModelId, number>> = {
  "gable-box": 0.05,
  "hex-box": 0.1,
  "pillow-box": 0.0, // fully bowed — the pillow only reads as a pillow at full bow
  "envelope": 0.0,   // CLOSED & lying flat (sealed); drag the slider open → flaps unfold, closure flap opens first / closes last
  "cupcake-wrapper": 0.0, // rolled into the cone (1 = unrolled flat sector)
  "belly-band": 0.0,      // wrapped around the product (1 = seam end peeled up)
  "place-card": 0.0,      // standing tent (1 = unfolded flat)
  "paper-rosette": 1.0,   // fanned-open full-circle medallion (0 = folded hand-fan)
  "favor-pouch": 1.0,     // puffed pyramid (the largest extent; 0 = flat blank)
  "paper-flower": 1.0,    // bloomed layered flower (largest; 0 = flat petals)
  "necklace-card": 0.5,   // fold-over card shown part-open (0 flat → 1 folded in half)
  "paper-lantern": 1.0,   // squished lantern (strips bowed out, the largest extent)
  "folded-star": 0.7,     // full two-half dimensional star (1 = max-puffed, framed)
  "bunny-box": 0.0,       // assembled box, walls up + ears standing (1 = flat-open tray)
  "cat-box": 0.0,         // animal-box family — see bunny
  "bear-box": 0.0,
  "fox-box": 0.0,
  "panda-box": 0.0,
  "pig-box": 0.0,
  "owl-box": 0.0,
  "dog-box": 0.0,
  "lion-box": 0.0,
  "unicorn-box": 0.0,
  "frog-box": 0.0,
  "mouse-box": 0.0,
  "sheep-box": 0.0,
  "bat-box": 0.0,
  "chick-box": 0.0,
  "reindeer-box": 0.0,
  "heart-box": 0.0,     // assembled (lid resting on base); t=1 lifts the lid off
  "bookmark": 0.0,      // static face-on card (no fold animation)
  "party-hat": 1.0,     // t=1 = assembled cone (what Box3D frames); t=0 = flat sector
  "napkin-ring": 1.0,   // t=1 = closed ring; t=0 = flat strip
};
export const previewFold = (id: string): number => PREVIEW_FOLD[id as ModelId] ?? 0.55;
