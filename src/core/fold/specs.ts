// Fold Engine v2 — per-model FoldSpecs. See docs/fold-engine.md.
//
// This is the ONLY hand-authored part of a model's 3D: which way each named
// crease folds, how far, and when (stagger) — pure data, ~15 lines per model.
// Panels, hinges, holes and slits all derive from the dieline automatically.
//
// Conventions (see solve.ts):
//  - angle is signed, right-hand rule about the hinge axis as canonicalized by
//    panelize (left→right for horizontal creases, top→bottom for vertical).
//  - The flat sheet faces +Z; the ROOT panel is the box front. With the
//    models' [glue][back][side1][front][side2] layout and root=front:
//    body creases left of the root fold +90°, right of it −90° (both wrap the
//    tube backwards); top flaps fold −90°, bottom flaps +90° (toward the
//    tube's interior). Dust flaps over-fold slightly so they dip inside the
//    box instead of sitting z-coplanar with the closing panel.
//  - fixed:true = the carton tube (always erect); only flaps animate.
//  - layer = stacking DEPTH (× one board) into the box from the outermost
//    flap (layer 0 sits exactly on the rim/wall plane). Always positive — the
//    renderer determines the inward direction automatically from the closed
//    pose, so fold-chain normal flips (tongues, reverse-score triangles)
//    never need hand-assigned signs.

import { Dieline } from "../types";
import { FoldSpec, HingeSpec } from "./solve";

const H = Math.PI / 2;
const PI = Math.PI;
const DUST = H * 1.12; // dust flaps dip ~10° past horizontal, inside the box

/** Tube body creases shared by the whole tuck-carton family. */
const TUBE = {
  "glue-back": { angle: H, fixed: true, layer: 1 }, // glue flap sits INSIDE side2
  "back-side1": { angle: H, fixed: true },
  "side1-front": { angle: H, fixed: true },
  "front-side2": { angle: -H, fixed: true },
};

// STE-style straight tuck TOP: lid panel + tongue lead, dust flaps follow.
// Layers: lid outermost (0); tongue one board inside the wall it tucks into;
// dust one board under the lid.
const TUCK_TOP = {
  "back-top": { angle: -H, t0: 0.06, t1: 0.65 },
  "tongue-top": { angle: -H, t0: 0.06, t1: 0.65, layer: 1 }, // one board inside the wall it tucks into
  "side1-top": { angle: -DUST, t0: 0.35, layer: 1 },
  "side2-top": { angle: -DUST, t0: 0.35, layer: 1 },
};

// Crash-lock BOTTOM (auto-bottom family): when CLOSING (t 1→0) the side
// minors fold in first (complete by t=0.4), the majors fold over them last
// (complete at t=0); the 45° reverse-score glue triangles fold ±180° against
// their major. Stack: front major outermost (0) → back major (1) → minors
// innermost (2); the triangles sit between major and minor.
const CRASH_BOTTOM = {
  "back-bottom": { angle: H, t0: 0.06, t1: 0.6, layer: 1 },
  "front-bottom": { angle: H, t0: 0.06, t1: 0.6 },
  "side1-bottom": { angle: H, t0: 0.4, layer: 2 },
  "side2-bottom": { angle: H, t0: 0.4, layer: 2 },
  "lock-back": { angle: -PI, t0: 0.06, t1: 0.6, layer: 0.5 },  // half a board deeper than its
  "lock-front": { angle: -PI, t0: 0.06, t1: 0.6, layer: 0.5 }, // major: lands against the minor
};

// Shared hinge maps (single-piece models + the two-piece compositions that
// embed the same sub-dielines).
const TRAY_HINGES = {
  "base-side1": { angle: -H, t0: 0.06 },
  "base-side2": { angle: H, t0: 0.06 },
  "base-end1": { angle: H, t0: 0.06 },
  "base-end2": { angle: -H, t0: 0.06 },
  "end1-flap1": { angle: -H, t0: 0.06, t1: 0.7, layer: 1 },
  "end1-flap2": { angle: H, t0: 0.06, t1: 0.7, layer: 1 },
  "end2-flap1": { angle: -H, t0: 0.06, t1: 0.7, layer: 1 },
  "end2-flap2": { angle: H, t0: 0.06, t1: 0.7, layer: 1 },
};
const SLEEVE_HINGES = {
  "glue-front": { angle: H, t0: 0.06, layer: 1 },
  "front-right": { angle: -H, t0: 0.06 },
  "right-back": { angle: -H, t0: 0.06 },
  "back-left": { angle: -H, t0: 0.06 },
};

const rootFromFront = (die: Dieline): [number, number] => {
  // Tube models root at the FRONT body panel; trays root at the BASE.
  const f = die.panels?.front ?? die.panels?.base;
  if (!f) throw new Error("foldSpec: model publishes no panels.front/base for the root");
  return [f.x + f.w / 2, f.y + f.h / 2];
};

/** Box dims in points — needed by specs whose fold angles depend on shape
 *  (the hexagon's corner angles). */
export interface SpecDims { L: number; W: number; H: number }
type SpecFactory = (die: Dieline, dims?: SpecDims) => FoldSpec;

const SPECS: Record<string, SpecFactory> = {
  // Straight Tuck End: tuck panels + tongues off the BACK at both ends.
  "tuck-end": (die) => ({
    root: rootFromFront(die),
    hinges: {
      ...TUBE,
      ...TUCK_TOP,
      "back-bottom": { angle: H, t0: 0.06, t1: 0.65 },
      "tongue-bottom": { angle: H, t0: 0.06, t1: 0.65, layer: 1 },
      "side1-bottom": { angle: DUST, t0: 0.35, layer: 1 },
      "side2-bottom": { angle: DUST, t0: 0.35, layer: 1 },
    },
  }),

  // Reverse Tuck End: top tuck off the BACK, bottom tuck off the FRONT.
  "reverse-tuck-end": (die) => ({
    root: rootFromFront(die),
    hinges: {
      ...TUBE,
      ...TUCK_TOP,
      "front-bottom": { angle: H, t0: 0.06, t1: 0.65 },
      "tongue-bottom": { angle: H, t0: 0.06, t1: 0.65, layer: 1 },
      "side1-bottom": { angle: DUST, t0: 0.35, layer: 1 },
      "side2-bottom": { angle: DUST, t0: 0.35, layer: 1 },
    },
  }),

  // Auto-Bottom / Crash-Lock (A67): reverse-tuck top + crash-lock bottom.
  "auto-bottom": (die) => ({
    root: rootFromFront(die),
    hinges: {
      ...TUBE,
      "back-top": { angle: -H, t0: 0.06, t1: 0.65 },
      "side1-top": { angle: -DUST, t0: 0.35, layer: 1 },
      "side2-top": { angle: -DUST, t0: 0.35, layer: 1 },
      ...CRASH_BOTTOM,
    },
  }),

  // Tuck-Top Auto-Bottom (A65): STE tuck top + crash-lock bottom.
  "tuck-top-auto-bottom": (die) => ({
    root: rootFromFront(die),
    hinges: { ...TUBE, ...TUCK_TOP, ...CRASH_BOTTOM },
  }),

  // Tuck-Top Snap-Lock (A60): STE tuck top + glue-free 1-2-3 bottom (the
  // front major carries the lock TAB as part of its own cut — no extra hinge).
  // Closing order 1-2-3: back first (innermost), then sides, then the
  // front-with-tab last (outermost).
  "snap-lock-bottom": (die) => ({
    root: rootFromFront(die),
    hinges: {
      ...TUBE,
      ...TUCK_TOP,
      "back-bottom": { angle: H, t0: 0.4, layer: 2 },
      "side1-bottom": { angle: H, t0: 0.2, t1: 0.8, layer: 1 },
      "side2-bottom": { angle: H, t0: 0.2, t1: 0.8, layer: 1 },
      "front-bottom": { angle: H, t0: 0.06, t1: 0.6 },
    },
  }),

  // Sealed-End / Standard Glue Carton (B10): both ends sealed by four glued
  // flaps — dust folds in first (innermost), back seal, front seal on top.
  "glue-carton": (die) => ({
    root: rootFromFront(die),
    hinges: {
      ...TUBE,
      "front-top": { angle: -H, t0: 0.06, t1: 0.6 },
      "back-top": { angle: -H, t0: 0.06, t1: 0.6, layer: 1 },
      "side1-top": { angle: -H, t0: 0.4, layer: 2 },
      "side2-top": { angle: -H, t0: 0.4, layer: 2 },
      "front-bottom": { angle: H, t0: 0.06, t1: 0.6 },
      "back-bottom": { angle: H, t0: 0.06, t1: 0.6, layer: 1 },
      "side1-bottom": { angle: H, t0: 0.4, layer: 2 },
      "side2-bottom": { angle: H, t0: 0.4, layer: 2 },
    },
  }),

  // ---- Phase 3: trays & tubes ----

  // Open Sleeve (D10): a pure wrap — no end flaps; the slider wraps the whole
  // tube between flat and closed. Root = the published main face.
  "open-sleeve": (die) => ({
    root: rootFromFront(die),
    hinges: SLEEVE_HINGES,
  }),

  // Open Tray (C10): root = the BASE; four walls rise, corner glue flaps wrap
  // around onto the side walls' inner faces (they finish before the walls).
  "open-tray": (die) => ({
    root: rootFromFront(die),
    floor: true,
    hinges: TRAY_HINGES,
  }),

  // Bunny Treat Box — the FULL assembly fold: the slider runs from the flat
  // die-cut sheet (t=1, the "Open" end) → the closed box (t=0, "Closed").
  // TWO-PHASE CLOSING (t→0):
  //   Phase 1 [t=1 → 0.55]: TUCK SIDE FIRST — tuck flap folds in [0.62,0.94],
  //     then lid swings over [0.55,0.82]; both COMPLETE before any wall moves.
  //   Phase 2 [t=0.52 → 0.06]: walls (+ corner flaps) fold up, face closes last.
  // (Opening reverses: face opens first, walls open, lid+tuck open last.)
  "bunny-box": (die) => ({
    root: rootFromFront(die),
    floor: true,
    hinges: {
      // TUCK SIDE — folds first, completely done by t=0.55
      "lid-tuck": { angle: H, t0: 0.62, t1: 0.94, ease: "linear", layer: 1 }, // tuck in first
      "back-lid": { angle: H, t0: 0.55, t1: 0.82, ease: "linear" },           // lid follows
      // WALLS — fold after the tuck side is done
      "base-side2": { angle: H, t0: 0.10, t1: 0.52 },
      "base-end1": { angle: H, t0: 0.10, t1: 0.52 },
      "base-end2": { angle: -H, t0: 0.10, t1: 0.52 },
      "end1-flap1": { angle: -H, t0: 0.14, t1: 0.50, layer: 1 },
      "end1-flap2": { angle: H, t0: 0.14, t1: 0.50, layer: 1 },
      "end2-flap1": { angle: -H, t0: 0.14, t1: 0.50, layer: 1 },
      "end2-flap2": { angle: H, t0: 0.14, t1: 0.50, layer: 1 },
      "base-side1": { angle: -H, t0: 0.06, t1: 0.28 },  // FACE — closes last
    },
  }),

  // Hinged-Lid Tray (C30): the tray erects late in the slider (opens last);
  // the lid + tuck swing closed over it through the early range.
  "hinge-lid-tray": (die) => ({
    root: rootFromFront(die),
    floor: true,
    hinges: {
      "base-back": { angle: -H, t0: 0.6 },
      "base-front": { angle: H, t0: 0.6 },
      "base-end1": { angle: H, t0: 0.6 },
      "base-end2": { angle: -H, t0: 0.6 },
      "end1-flap1": { angle: -H, t0: 0.6, t1: 0.85, layer: 1 },
      "end1-flap2": { angle: H, t0: 0.6, t1: 0.85, layer: 1 },
      "end2-flap1": { angle: -H, t0: 0.6, t1: 0.85, layer: 1 },
      "end2-flap2": { angle: H, t0: 0.6, t1: 0.85, layer: 1 },
      "back-lid": { angle: -H, t0: 0.06, t1: 0.5 },
      "lid-tuck": { angle: -H, t0: 0.06, t1: 0.5, layer: 1 },
    },
  }),

  // Regular Slotted Container (0201): the tuck-family tube + 8 flaps; the
  // outer (front/back) flaps meet at the centreline over the inner ones.
  "rsc": (die) => ({
    root: rootFromFront(die),
    hinges: {
      ...TUBE,
      "back-top": { angle: -H, t0: 0.06, t1: 0.6 },
      "front-top": { angle: -H, t0: 0.06, t1: 0.6 },
      "side1-top": { angle: -H, t0: 0.4, layer: 1 },
      "side2-top": { angle: -H, t0: 0.4, layer: 1 },
      "back-bottom": { angle: H, t0: 0.06, t1: 0.6 },
      "front-bottom": { angle: H, t0: 0.06, t1: 0.6 },
      "side1-bottom": { angle: H, t0: 0.4, layer: 1 },
      "side2-bottom": { angle: H, t0: 0.4, layer: 1 },
    },
  }),

  // ---- Phase 4: the gable acid test ----

  // Gable Top Box (E30/E35): chain is [glue][FRONT][side1][BACK][side2] —
  // the glue joins the FRONT here. Roofs lean 45° to the ridge; the gable-end
  // triangles stay co-planar with their side walls (rigid ends); the four
  // lock EARS fold 135° over the ridge to hang against the gable ends (where
  // the dieline's slits catch them). Straight-tuck bottom off the front.
  "gable-box": (die) => ({
    root: rootFromFront(die),
    hinges: {
      "glue-front": { angle: H, fixed: true, layer: 1 },
      "front-side1": { angle: -H, fixed: true },
      "side1-back": { angle: -H, fixed: true },
      "back-side2": { angle: -H, fixed: true },
      "roof-front": { angle: -Math.PI / 4, t0: 0.06, t1: 0.65 },
      "roof-back": { angle: -Math.PI / 4, t0: 0.06, t1: 0.65 },
      "tri-side1": { angle: 0, fixed: true },
      "tri-side2": { angle: 0, fixed: true },
      "ear-f1": { angle: -H * 1.5, t0: 0.06, t1: 0.5, layer: 1 },
      "ear-f2": { angle: -H * 1.5, t0: 0.06, t1: 0.5, layer: 1 },
      "ear-b1": { angle: -H * 1.5, t0: 0.06, t1: 0.5, layer: 1 },
      "ear-b2": { angle: -H * 1.5, t0: 0.06, t1: 0.5, layer: 1 },
      "front-bottom": { angle: H, t0: 0.06, t1: 0.65 },
      "tongue-bottom": { angle: H, t0: 0.06, t1: 0.65, layer: 1 },
      "side1-bottom": { angle: DUST, t0: 0.35, layer: 1 },
      "side2-bottom": { angle: DUST, t0: 0.35, layer: 1 },
    },
  }),

  // Envelope (diamond / A-style): root = the FACE; the four flaps fold UP and
  // OVER onto the back (~165°) to seal. Assembly order (closing, t 1→0): side
  // flaps first, then the bottom flap over them, then the closure flap on top
  // (stagger windows widen). Edge-sign convention matches the open tray (top −,
  // bottom +, left +, right −) so all four fold to the same side. `flat:true` on
  // the model still drives the editor's 2D dims; the fold here is the assembly.
  // NO layer offsets: an envelope is ONE continuous sheet folding at creases,
  // not separate flaps stacked in a plane (the crash-lock idiom) — a layer
  // offset would rigidly lift each flap off its hinge, opening a gap at the
  // crease (the paper would "break" there). Coplanar overlap only happens at
  // full close (rarely viewed); the staggered ~165° fold keeps them clear
  // otherwise.
  "envelope": (die) => {
    const ENV = PI * 0.997; // ~179.5° — flaps lie flat over the back when closed.
    // (Long pointed flaps amplify any residual tent into a raised tip: at 175°
    // a 190 mm flap's tip rose ~16 mm — the "long side not closing". At 179.5°
    // that's ~1.7 mm, i.e. flat. The 0.5° keeps it just off the back to avoid
    // coplanar z-fighting with the face.)
    // Stagger so the closure (top) flap is the LAST to close and FIRST to open.
    // hingeAngleAt: a flap is OPEN/flat for t ≥ t1, fully FOLDED for t ≤ t0, so
    // CLOSING runs t 1→0. Side flaps close first ([0.55,1] → done by 0.55), then
    // the bottom flap ([0.3,0.8]), then the TOP closure flap LAST ([0,0.45] →
    // only fully seated at t=0). At t=1 all four are flat → lies completely flat.
    return {
      root: rootFromFront(die), // panels.base = the face
      floor: true,
      hinges: {
        "base-left":  { angle: ENV,  t0: 0.55, t1: 1.0 },
        "base-right": { angle: -ENV, t0: 0.55, t1: 1.0 },
        "base-bottom":{ angle: ENV,  t0: 0.3,  t1: 0.8 },
        "base-top":   { angle: -ENV, t0: 0.0,  t1: 0.45 },
      },
    };
  },

  // Necklace card (FOLD-OVER style only): the hourglass card folds in half at
  // the waist crease ("fold"). Root = the head half (panels.base, above the
  // waist); the foot half folds up/over. `floor:true` lays it face-up like the
  // envelope; `previewFold` shows it part-open (a folded card, not flat-stacked).
  // The FLAT style has no crease → 1 panel, no fold (this hinge entry is unused);
  // the editor/gallery gate the 3D off for it (no crease).
  "necklace-card": (die) => ({
    root: rootFromFront(die),
    floor: true,
    hinges: {
      "fold": { angle: PI, t0: 0, t1: 1 }, // fold fully in half; previewFold opens it
    },
  }),

  // Hexagon Box (E50): six walls wrap the elongated-hex footprint. The corner
  // fold angles DEPEND ON THE DIMS: α = atan2(W/2, e) at the long↔slant
  // corners, π − 2α at the two pointed tips (e = bevel reach). The 12 infold
  // end flaps fold ±90° and stack in a spiral (increasing layer).
  "hex-box": (die, dims) => {
    if (!dims) throw new Error("hex-box spec needs dims (corner angles depend on L/W)");
    const e = Math.min(dims.W / 2, dims.L * 0.4);
    const A = Math.atan2(dims.W / 2, e); // long↔slant corner fold
    const TIP = Math.PI - 2 * A;         // slant↔slant tip fold
    const hinges: Record<string, import("./solve").HingeSpec> = {
      "glue-w0": { angle: A, fixed: true, layer: 1 },
      "w0-w1": { angle: -A, fixed: true },
      "w1-w2": { angle: -TIP, fixed: true },
      "w2-w3": { angle: -A, fixed: true },
      "w3-w4": { angle: -A, fixed: true },
      "w4-w5": { angle: -TIP, fixed: true },
    };
    for (let i = 0; i < 6; i++) {
      hinges[`w${i}-top`] = { angle: -H, t0: 0.06, t1: 0.8, layer: i * 0.5 };
      hinges[`w${i}-bottom`] = { angle: H, t0: 0.06, t1: 0.8, layer: i * 0.5 };
    }
    return { root: rootFromFront(die), hinges };
  },
};

// Cat / Bear / Fox boxes are the same animal-box body + lid as the bunny, so
// they share its fold spec verbatim (the face/ears differ only in the dieline).
SPECS["cat-box"] = SPECS["bunny-box"];
SPECS["bear-box"] = SPECS["bunny-box"];
SPECS["fox-box"] = SPECS["bunny-box"];
SPECS["panda-box"] = SPECS["bunny-box"];
SPECS["pig-box"] = SPECS["bunny-box"];
SPECS["owl-box"] = SPECS["bunny-box"];
SPECS["dog-box"] = SPECS["bunny-box"];
SPECS["lion-box"] = SPECS["bunny-box"];
SPECS["unicorn-box"] = SPECS["bunny-box"];
SPECS["frog-box"] = SPECS["bunny-box"];
SPECS["mouse-box"] = SPECS["bunny-box"];
SPECS["sheep-box"] = SPECS["bunny-box"];
SPECS["bat-box"] = SPECS["bunny-box"];
SPECS["chick-box"] = SPECS["bunny-box"];
SPECS["reindeer-box"] = SPECS["bunny-box"];

// ---- Two-piece models (Dieline.pieces): each piece folds STATICALLY to its
// closed pose; the slider animates the inter-piece MOTION (lid lifts, drawer
// slides) — matching how the legacy closures presented these models. ----

export interface PieceSpec {
  /** Point inside this piece's root panel (per-piece published rect). */
  root: [number, number];
  hinges: Record<string, HingeSpec>;
  /** Static pose of the folded piece within the assembly (Euler XYZ, rad). */
  pose?: [number, number, number];
  /** Slider motion in POINT units, in assembly space (pre-`floor` rotation):
   *  offset = axis · dist · smooth(t). t=0 assembled, t=1 apart. */
  motion?: { axis: [number, number, number]; dist: number };
}
export interface MultiFoldSpec { floor?: boolean; pieces: PieceSpec[] }

const pieceRoot = (die: Dieline, key: string): [number, number] => {
  const r = die.panels?.[key];
  if (!r) throw new Error(`foldSpec: model publishes no panels.${key}`);
  return [r.x + r.w / 2, r.y + r.h / 2];
};

// NOTE on axes: assembly space is the base piece's solved frame (its cavity
// faces −Z); the global `floor` rotation then maps −Z → world UP. So "lift"
// motions use axis [0,0,−1]; the drawer slide along X stays X.
const MULTI_SPECS: Record<string, (die: Dieline, dims?: SpecDims) => MultiFoldSpec> = {
  // Tray + Lid (C20/0301): both pieces are open trays; the lid is flipped
  // (cavity toward the base) and lifts off as the slider opens.
  "tray-lid": (die, dims) => ({
    floor: true,
    pieces: [
      { root: pieceRoot(die, "piece0"), hinges: TRAY_HINGES },
      {
        root: pieceRoot(die, "piece1"), hinges: TRAY_HINGES,
        pose: [Math.PI, 0, 0],
        motion: { axis: [0, 0, -1], dist: (dims?.H ?? 100) * 2.6 }, // must clear lidDepth(=H) + base height
      },
    ],
  }),

  // Hexagon Box + Lid: two wall-rooted hex trays — they already stand
  // cavity-up in solved space (no floor rotation); the lid flips and lifts.
  "hex-tray-lid": (die, dims) => ({
    pieces: [
      { root: pieceRoot(die, "piece0"), hinges: hexTrayHinges(dims) },
      {
        root: pieceRoot(die, "piece1"), hinges: hexTrayHinges(dims),
        pose: [Math.PI, 0, 0],
        motion: { axis: [0, 1, 0], dist: (dims?.H ?? 100) * 2.6 },
      },
    ],
  }),

  // Drawer Box: an open-tray drawer sliding inside an open-sleeve cover —
  // the sleeve's tube axis (its local Y) is posed onto the slide axis X.
  "drawer-box": (die, dims) => ({
    floor: true,
    pieces: [
      {
        root: pieceRoot(die, "piece0"), hinges: TRAY_HINGES,
        motion: { axis: [1, 0, 0], dist: (dims?.L ?? 100) * 0.72 },
      },
      { root: pieceRoot(die, "piece1"), hinges: SLEEVE_HINGES, pose: [0, 0, Math.PI / 2] },
    ],
  }),
};

// Hex tray piece hinges (used twice by hex-tray-lid). Wall corner angles are
// dims-dependent like the single-piece hexagon; the lid's +fit delta changes
// them by <1% — visually negligible, so both pieces use the base dims.
const hexTrayHinges = (dims?: SpecDims): Record<string, HingeSpec> => {
  const L = dims?.L ?? 360, W = dims?.W ?? 300;
  const e = Math.min(W / 2, L * 0.4);
  const A = Math.atan2(W / 2, e);
  const TIP = Math.PI - 2 * A;
  const h: Record<string, HingeSpec> = {
    "glue-w0": { angle: A, fixed: true, layer: 1 },
    "w0-w1": { angle: -A, fixed: true },
    "w1-w2": { angle: -TIP, fixed: true },
    "w2-w3": { angle: -A, fixed: true },
    "w3-w4": { angle: -A, fixed: true },
    "w4-w5": { angle: -TIP, fixed: true },
  };
  for (let i = 0; i < 6; i++) h[`w${i}-bottom`] = { angle: H, layer: i * 0.5 };
  return h;
};

export const hasMultiFoldSpec = (modelId: string): boolean => modelId in MULTI_SPECS;

export function multiFoldSpecFor(modelId: string, die: Dieline, dims?: SpecDims): MultiFoldSpec {
  const f = MULTI_SPECS[modelId];
  if (!f) throw new Error(`foldSpec: no MultiFoldSpec for model "${modelId}"`);
  return f(die, dims);
}

/** The engine handles a model iff it has a FoldSpec here. */
export const hasFoldSpec = (modelId: string): boolean => modelId in SPECS;

/** True iff the model's 3D is derived by the Fold Engine (single- or two-piece)
 *  rather than a bespoke renderer. Used to gate the 3D pane per-INSTANCE: an
 *  engine model only folds when its dieline actually has creases (e.g. the
 *  necklace card's fold-over style has a crease, its flat style doesn't). */
export const usesFoldEngine = (modelId: string): boolean =>
  hasFoldSpec(modelId) || hasMultiFoldSpec(modelId);

export function foldSpecFor(modelId: string, die: Dieline, dims?: SpecDims): FoldSpec {
  const f = SPECS[modelId];
  if (!f) throw new Error(`foldSpec: no FoldSpec for model "${modelId}"`);
  return f(die, dims);
}
