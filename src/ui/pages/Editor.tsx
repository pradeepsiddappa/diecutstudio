import { useMemo, useState, useRef, useEffect, lazy, Suspense, ReactNode } from "react";
import { usePostHog } from "@posthog/react";
import { LAYER_STYLES, LayerKind } from "../../core/types";
import { toSvgPath } from "../../core/geometry";
import { Unit, toPt, fromPt, fmt, round, inToPt } from "../../core/units";
import { checkFit, FitResult } from "../../core/paper";
import { imposeOnSheet, Imposition } from "../../core/imposition";
import { composeSheet } from "../../core/sheet";
import { Dieline, FeatureOptions, Polyline } from "../../core/types";
import { dielineToPdf } from "../../export/pdf";
import { dielineToSvg } from "../../export/svg";
import { dielineToDxf } from "../../export/dxf";
import { MODELS, getModel, ModelId, previewFold, CATEGORIES } from "../../core/models/registry";
import { usesFoldEngine } from "../../core/fold/specs";
import { useSeo } from "../../seo/head";
import { modelSeo, modelLd } from "../../seo/siteConfig";
import { PRINT_AND_CUT_ENABLED } from "../../config";
import { Maximize2, X, ImagePlus, Ruler, SlidersHorizontal, Layers, Box, MoreHorizontal, Download, Palette, type LucideIcon } from "lucide-react";
import { Logo } from "../components/Logo";

const Box3D = lazy(() => import("../Box3D"));

const clampZoom = (z: number) => Math.min(6, Math.max(0.2, Math.round(z * 100) / 100));

// Tiny SSR-safe media-query hook: true while the query matches. Used to switch
// the editor between the desktop floating inspector and the phone tab-bar UI.
function useMediaQuery(query: string): boolean {
  const get = () => (typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

const VISIBLE_LAYERS: LayerKind[] = ["bleed", "glue", "crease", "cut"];

interface EditorProps {
  onNavigate?: (to: string) => void;
}

// Pick the initial model from a ?model=<id> query string on first load.
function initialModelId(): ModelId {
  const id = new URLSearchParams(window.location.search).get("model") || "";
  return MODELS.some((m) => m.id === id) ? (id as ModelId) : "tuck-end";
}

// Read a validated variant param from the URL (gallery cards link to a specific
// variant, e.g. ?model=bunting-pennant&pennantShape=scallop).
function urlPick<T extends string>(key: string, allowed: readonly T[], def: T): T {
  const v = new URLSearchParams(window.location.search).get(key);
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : def;
}
function urlNum(key: string, def: number): number {
  const n = Number(new URLSearchParams(window.location.search).get(key));
  return Number.isFinite(n) && n >= 1 ? Math.round(n) : def;
}

// Fractional URL number (for dimensions, which are e.g. 6.378 in) — NOT rounded.
// A non-positive / missing value falls back to `def` (so H=0 flat items use their
// default of 0).
function urlFloat(key: string, def: number): number {
  const n = Number(new URLSearchParams(window.location.search).get(key));
  return Number.isFinite(n) && n > 0 ? n : def;
}

// Raw URL string (decoded). Used for the 3D-stage tint a gallery card passes
// (?bg=rgb(...)), so the editor preview matches the card the user clicked.
function urlStr(key: string): string {
  return new URLSearchParams(window.location.search).get(key) ?? "";
}

// ---- Design persistence (Phase 4) ------------------------------------------
// The editor's size + dropped Print-&-Cut artwork (image + placement) are saved
// to localStorage PER MODEL, so a reload/revisit resumes the same design. The
// artwork transform is only meaningful together with the dimensions it was
// placed against, so we persist both as one snapshot. 100% local; the image
// (base64) never leaves the browser, same as the rest of Print & Cut.
interface SavedArt { dataUrl: string; natW: number; natH: number; xPt: number; yPt: number; wPt: number; hPt: number; rotDeg: number; }
interface SavedDesign { v: 1; unit: Unit; L: number; W: number; H: number; thickness: number; bleed: number; showArt: boolean; art: SavedArt | null; decorColors?: Record<string, string>; }
const designKey = (id: ModelId) => `diecut.design.v1.${id}`;
function loadDesign(id: ModelId): SavedDesign | null {
  try {
    const s = localStorage.getItem(designKey(id));
    const d = s ? (JSON.parse(s) as SavedDesign) : null;
    if (!d || d.v !== 1) return null;
    // Reject a corrupt save (a degenerate 0/NaN dimension that got persisted) so
    // the editor falls back to the model's own consistent defaults rather than a
    // sliver/blank box. The dims share the saved unit, so we can't just swap one.
    if (![d.L, d.W, d.H].every((v) => Number.isFinite(v) && v > 0)) return null;
    return d;
  } catch { return null; }
}
function saveDesign(id: ModelId, d: SavedDesign) {
  try {
    localStorage.setItem(designKey(id), JSON.stringify(d));
  } catch {
    // Over quota (a big image) — keep the size, drop the raster rather than fail.
    try { localStorage.setItem(designKey(id), JSON.stringify({ ...d, art: null })); } catch { /* give up */ }
  }
}
function clearDesign(id: ModelId) { try { localStorage.removeItem(designKey(id)); } catch { /* ignore */ } }

// ---- Collapsible-card open/closed state (per model) -------------------------
// The floating inspector's cards remember which ones the user left open, per
// model, in localStorage. Default (no save): the 3D preview + dimensions open,
// everything else collapsed to a pill. 100% local; SSR-safe.
type CardState = Record<string, boolean>;
const DEFAULT_CARDS: CardState = { preview: true, dimensions: true, facecolors: true };
const cardsKey = (id: ModelId) => `diecut.cards.v1.${id}`;
function loadCards(id: ModelId): CardState {
  try {
    if (typeof localStorage === "undefined") return { ...DEFAULT_CARDS };
    const s = localStorage.getItem(cardsKey(id));
    if (!s) return { ...DEFAULT_CARDS };
    const d = JSON.parse(s) as CardState;
    return d && typeof d === "object" ? d : { ...DEFAULT_CARDS };
  } catch { return { ...DEFAULT_CARDS }; }
}
function saveCards(id: ModelId, state: CardState) {
  try { if (typeof localStorage !== "undefined") localStorage.setItem(cardsKey(id), JSON.stringify(state)); }
  catch { /* ignore */ }
}

export function Editor({ onNavigate }: EditorProps = {}) {
  const posthog = usePostHog();
  // Model comes from the URL (?model=…) set by the gallery; switching is done by
  // navigating back there, so there's no in-editor setter.
  const [modelId] = useState<ModelId>(initialModelId);
  const model = getModel(modelId);
  // SEO: per-model title/description/canonical + HowTo/Breadcrumb JSON-LD.
  const catLabel = CATEGORIES.find((c) => c.id === model.category)?.label ?? "Templates";
  useSeo(modelSeo(model), modelLd(model, catLabel));
  // Track when a user opens a template in the editor (top of conversion funnel).
  const templateOpenedRef = useRef(false);
  useEffect(() => {
    if (templateOpenedRef.current) return;
    templateOpenedRef.current = true;
    posthog?.capture("template_opened", {
      template_id: model.id,
      template_name: model.name,
      template_category: model.category,
      has_3d_preview: model.has3DPreview ?? false,
      is_flat: model.flat ?? false,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Saved design for this model (size + artwork), read ONCE at mount.
  const savedRef = useRef<SavedDesign | null>(loadDesign(modelId));
  const saved = savedRef.current;
  // L/W/H/etc start at THE CURRENT MODEL'S defaults — so /editor?model=roll-end-mailer
  // opens with mailer-appropriate dimensions (wide, shallow), not the card-box
  // defaults. Swapping the model via the dropdown also resets to the new defaults.
  const [unit, setUnit] = useState<Unit>(saved?.unit ?? "in");
  // Dimension priority: a saved design (user's last edit of THIS model) wins;
  // else a gallery card's ?L/?W/?H (so the editor opens at the size shown in the
  // thumbnail — e.g. a portrait wallet envelope); else the model default.
  const [L, setL] = useState(saved?.L ?? urlFloat("L", model.defaultDimensions.L));
  const [W, setW] = useState(saved?.W ?? urlFloat("W", model.defaultDimensions.W));
  const [H, setH] = useState(saved?.H ?? urlFloat("H", model.defaultDimensions.H));
  const [thickness, setThickness] = useState(saved?.thickness ?? model.defaultDimensions.thickness);
  const [bleed, setBleed] = useState(saved?.bleed ?? model.defaultDimensions.bleed);
  // 3D-stage tint passed by the gallery card (?bg=) so the preview matches the
  // exact thumbnail colour the user clicked; empty → the CSS default vignette.
  const stageBg = urlStr("bg");
  // Phase 3 feature overlays
  const [windowOn, setWindowOn] = useState(false);
  const [windowMargin, setWindowMargin] = useState(0.4); // inset in the chosen unit
  const [euroOn, setEuroOn] = useState(false);
  const [thumbOn, setThumbOn] = useState(false);
  const [thumbNotchOn, setThumbNotchOn] = useState(false);
  const supportsWindow = !!model.supportsFeatures?.includes("window");
  const supportsEuro = !!model.supportsFeatures?.includes("euro");
  const supportsThumb = !!model.supportsFeatures?.includes("thumb");
  const supportsThumbNotch = !!model.supportsFeatures?.includes("thumb-notch");
  // Toggleable thumb notches (front lip). Each box declares which ends it has.
  const [topNotch, setTopNotch] = useState(true);
  const [bottomNotch, setBottomNotch] = useState(true);
  const hasTopNotch = !!model.notches?.includes("top");
  const hasBottomNotch = !!model.notches?.includes("bottom");
  // Inner/outer dimension mode (uniform thickness compensation).
  const [dimMode, setDimMode] = useState<"outer" | "inner">("outer");
  const supportsInner = model.supportsInnerDim !== false;
  const innerComp = dimMode === "inner" && supportsInner ? 2 * thickness : 0; // added to each dim
  // Drawer-box slide clearance (only used by that model).
  const [slideClearance, setSlideClearance] = useState(0.03);
  // Gable-box lock-slit length (only used by that model).
  const [lockSlit, setLockSlit] = useState(0.6);
  // Gift-tag shape / hang-hole / scallop params (only used by that model).
  const [tagShape, setTagShape] = useState<"luggage" | "scallop" | "ticket">("luggage");
  const [holeDia, setHoleDia] = useState(0.1875);
  const [scallopR, setScallopR] = useState(0.25);
  // Envelope closure-flap style / liner (only used by that model).
  const [envFlap, setEnvFlap] = useState<"square" | "pointed" | "diamond" | "wallet" | "catalog">(() => urlPick("flap", ["square", "pointed", "diamond", "wallet", "catalog"] as const, "square"));
  const [envLiner, setEnvLiner] = useState(false);
  // Earring-card style / pairs / hole / hang hole / shape / header / easel.
  const [earStyle, setEarStyle] = useState<"stud" | "dangle">(() => urlPick("earStyle", ["stud", "dangle"] as const, "stud"));
  const [earPairs, setEarPairs] = useState(() => urlNum("pairs", 1));
  const [earHole, setEarHole] = useState(0.0625);
  const [earHang, setEarHang] = useState(false);
  const [earShape, setEarShape] = useState<"rect" | "scallop" | "arch" | "tag-top">(() => urlPick("cardShape", ["rect", "scallop", "arch", "tag-top"] as const, "rect"));
  const [earHeader, setEarHeader] = useState(false);
  const [earEasel, setEarEasel] = useState(false);
  // Belly-band closure (only used by that model). Defaults to the tuck-lock
  // (matches the model default; shows the slot/tab).
  const [bandClosure, setBandClosure] = useState<"glue" | "lock">("lock");
  // Bunting pennant shape (only used by that model).
  const [pennantShape, setPennantShape] = useState<"triangle" | "swallowtail" | "scallop">(() => urlPick("pennantShape", ["triangle", "swallowtail", "scallop"] as const, "triangle"));
  // Jar-label shape (only used by that model).
  const [labelShape, setLabelShape] = useState<"rect" | "oval" | "scallop">(() => urlPick("labelShape", ["rect", "oval", "scallop"] as const, "oval"));
  // Bookmark shape (only used by that model).
  const [bookmarkShape, setBookmarkShape] = useState<"rounded" | "pointed" | "scallop">(() => urlPick("bookmarkShape", ["rounded", "pointed", "scallop"] as const, "rounded"));
  // Necklace-card style (only used by that model): flat slits vs hourglass fold-over.
  const [necklaceStyle, setNecklaceStyle] = useState<"flat" | "fold">(() => urlPick("necklaceStyle", ["flat", "fold"] as const, "flat"));
  // Party hat brim edge (only used by that model).
  const [hatEdge, setHatEdge] = useState<"straight" | "scallop">(() => urlPick("hatEdge", ["straight", "scallop"] as const, "scallop"));
  // Party hat chin holes toggle.
  const [hatChinHole, setHatChinHole] = useState(true);
  // Napkin ring closure (only used by that model).
  const [napkinClosure, setNapkinClosure] = useState<"glue" | "lock">(() => urlPick("napkinClosure", ["glue", "lock"] as const, "lock"));
  // Napkin ring edge (only used by that model).
  const [napkinEdge, setNapkinEdge] = useState<"straight" | "scallop-top" | "scallop-both">(() => urlPick("napkinEdge", ["straight", "scallop-top", "scallop-both"] as const, "scallop-both"));
  // Cake topper shape + stick-holder tab size (only used by that model).
  const [topperShape, setTopperShape] = useState<"circle" | "heart" | "star" | "scallop">(() => urlPick("topperShape", ["circle", "heart", "star", "scallop"] as const, "circle"));
  const [cakeHolderW, setCakeHolderW] = useState(0.6);   // holder tab width / thickness (in)
  const [cakeHolderLen, setCakeHolderLen] = useState(1.0); // holder tab length / protrusion (in)
  // Straw flag shape (only used by that model).

  // Print & Cut artwork: a dropped logo/photo embedded as the PRINT layer
  // (PDF/SVG). 100% local — the file never leaves the browser. Gated by the
  // PRINT_AND_CUT_ENABLED flag: when off, saved artwork is NOT restored (and the
  // UI to add more is hidden), so the feature is fully dormant.
  const savedArt = PRINT_AND_CUT_ENABLED ? saved?.art : undefined;
  const [artwork, setArtwork] = useState<{ dataUrl: string; natW: number; natH: number } | null>(
    savedArt ? { dataUrl: savedArt.dataUrl, natW: savedArt.natW, natH: savedArt.natH } : null,
  );
  // Editable placement rect (dieline POINTS). Drag to move, corner handles to
  // resize (image aspect locked). Set to a contain-fit on drop.
  const [artRect, setArtRect] = useState<{ xPt: number; yPt: number; wPt: number; hPt: number } | null>(
    savedArt ? { xPt: savedArt.xPt, yPt: savedArt.yPt, wPt: savedArt.wPt, hPt: savedArt.hPt } : null,
  );
  const [artRot, setArtRot] = useState(savedArt?.rotDeg ?? 0); // artwork rotation, degrees clockwise
  const [showArt, setShowArt] = useState(saved?.showArt ?? true);
  // Per-decoration colour overrides (the printable face — eyes/nose/ears/mouth).
  // Keyed by decoration id; falls back to the model's default colour.
  const [decorColors, setDecorColors] = useState<Record<string, string>>(saved?.decorColors ?? {});

  // Persist this model's design (size + dropped artwork) to localStorage,
  // debounced, so a reload/revisit resumes it. 100% local.
  useEffect(() => {
    if (!(L > 0 && W > 0 && H > 0)) return; // never persist a transient/degenerate dim
    const t = setTimeout(() => {
      saveDesign(modelId, {
        v: 1, unit, L, W, H, thickness, bleed, showArt,
        art: artwork && artRect
          ? { dataUrl: artwork.dataUrl, natW: artwork.natW, natH: artwork.natH, ...artRect, rotDeg: artRot }
          : null,
        decorColors: Object.keys(decorColors).length ? decorColors : undefined,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [modelId, unit, L, W, H, thickness, bleed, showArt, artwork, artRect, artRot, decorColors]);
  const [zoom, setZoom] = useState(1);
  // Auto-fit zoom to the canvas until the user manually zooms or pans.
  const [autoFit, setAutoFit] = useState(true);
  const [hoverFit, setHoverFit] = useState<FitResult | null>(null);
  const [showDims, setShowDims] = useState(true);
  const [gutter, setGutter] = useState(0.125); // gap between ganged pieces (in current unit)
  const [sheetExport, setSheetExport] = useState(!!model.preferSheetExport); // export one box vs the full imposed sheet
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null); // chosen press sheet
  const [cropMarks, setCropMarks] = useState(true); // crop/trim marks on the imposed sheet (PDF/SVG)
  const [fold, setFold] = useState(() => previewFold(modelId)); // 0 closed .. 1 open
  const [expanded, setExpanded] = useState(false); // bigger 3D view modal
  // Phone layout (< 768px): a bottom tab bar raises a bottom sheet per category.
  // The desktop floating inspector is rendered only when this is false.
  const isPhone = useMediaQuery("(max-width: 767px)");
  // Active mobile sheet: null = closed; a category tab id, or 'export' (the
  // toolbar ↓ Export button). Only ONE sheet open at a time.
  const [mobileSheet, setMobileSheet] = useState<string | null>(null);
  // Floating-inspector card open/closed state (per model), persisted.
  const [cardOpen, setCardOpen] = useState<CardState>(() => loadCards(modelId));
  const isCardOpen = (id: string) => cardOpen[id] === true;
  const toggleCard = (id: string) => setCardOpen((o) => ({ ...o, [id]: !o[id] }));
  // Persist the inspector's card open/closed state per model.
  useEffect(() => { saveCards(modelId, cardOpen); }, [modelId, cardOpen]);

  // Floating-inspector scroll cues: the panel is a fixed height and scrolls; a
  // chevron pill appears at the top/bottom edge when there's more above/below,
  // so a clipped card reads as "scroll for more", not "squeezed/broken".
  const railScrollRef = useRef<HTMLDivElement>(null);
  const [railCue, setRailCue] = useState({ above: false, below: false });
  const updateRailCue = () => {
    const el = railScrollRef.current;
    if (!el) { setRailCue((p) => (p.above || p.below ? { above: false, below: false } : p)); return; }
    const above = el.scrollTop > 4;
    const below = el.scrollTop + el.clientHeight < el.scrollHeight - 4;
    setRailCue((p) => (p.above === above && p.below === below ? p : { above, below }));
  };
  const nudgeRail = (dir: number) => {
    const el = railScrollRef.current;
    if (el) el.scrollBy({ top: dir * Math.round(el.clientHeight * 0.7), behavior: "smooth" });
  };
  // Recompute the cues whenever the content height could change (cards
  // open/close, model/decorations/3D-pane change) or the panel resizes.
  useEffect(() => {
    updateRailCue();
    const el = railScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateRailCue);
    ro.observe(el);
    window.addEventListener("resize", updateRailCue);
    return () => { ro.disconnect(); window.removeEventListener("resize", updateRailCue); };
    // cardOpen (expand/collapse) + modelId (card set) drive content height; the
    // ResizeObserver catches viewport-driven size changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardOpen, modelId, isPhone]);
  const [tool, setTool] = useState<"select" | "pan">("select");
  const [panning, setPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false); // hold Space → temporary hand/pan
  // Pan is a CSS translate applied to the SVG, in pixels, measured from the
  // canvas centre. Works at any zoom (even when the SVG is smaller than the
  // viewport, where scroll-based panning can't move anything).
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const artInputRef = useRef<HTMLInputElement>(null);
  const panRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [show, setShow] = useState<Record<LayerKind, boolean>>({
    cut: true,
    crease: true,
    bleed: true,
    glue: true,
  });

  // Active feature overlays (only when the model supports them).
  const features = useMemo<FeatureOptions | undefined>(() => {
    const f: FeatureOptions = {};
    if (windowOn && supportsWindow) f.window = { marginPt: toPt(windowMargin, unit) };
    if (euroOn && supportsEuro) f.euroSlot = {};
    if (thumbOn && supportsThumb) f.thumb = {};
    if (thumbNotchOn && supportsThumbNotch) f.thumbNotch = {};
    return f.window || f.euroSlot || f.thumb || f.thumbNotch ? f : undefined;
  }, [windowOn, supportsWindow, windowMargin, euroOn, supportsEuro, thumbOn, supportsThumb, thumbNotchOn, supportsThumbNotch, unit]);

  // Inputs are in the chosen unit; convert to points and dispatch to the
  // current model's builder (via the registry).
  // In INNER mode the box is built ~2× thickness larger so the entered L/W/H is
  // the cavity that fits the product; in OUTER mode the entered dims are the box
  // exterior (no compensation).
  const die = useMemo(
    () => model.build({
      L: toPt(L + innerComp, unit),
      W: toPt(W + innerComp, unit),
      H: toPt(H + innerComp, unit),
      thickness: toPt(thickness, unit),
      bleed: toPt(bleed, unit),
      features,
      clearance: model.id === "drawer-box" || model.id === "tray-lid" || model.id === "hex-tray-lid" ? toPt(slideClearance, unit) : undefined,
      lockSlit: model.id === "gable-box" ? toPt(lockSlit, unit) : undefined,
      tagShape: model.id === "gift-tag" ? tagShape : undefined,
      scallop: model.id === "gift-tag" ? toPt(scallopR, unit) : undefined,
      flap: model.id === "envelope" ? envFlap : undefined,
      liner: model.id === "envelope" ? envLiner : undefined,
      earStyle: model.id === "earring-card" ? earStyle : undefined,
      pairs: model.id === "earring-card" ? earPairs : undefined,
      holeDia: model.id === "earring-card" ? toPt(earHole, unit)
             : model.id === "gift-tag" ? toPt(holeDia, unit) : undefined,
      hangHole: model.id === "earring-card" ? earHang : undefined,
      cardShape: model.id === "earring-card" ? earShape : undefined,
      header: model.id === "earring-card" ? earHeader : undefined,
      easel: model.id === "earring-card" ? earEasel : undefined,
      closure: model.id === "belly-band" ? bandClosure : undefined,
      pennantShape: model.id === "bunting-pennant" ? pennantShape : undefined,
      labelShape: model.id === "jar-label" ? labelShape : undefined,
      bookmarkShape: model.id === "bookmark" ? bookmarkShape : undefined,
      necklaceStyle: model.id === "necklace-card" ? necklaceStyle : undefined,
      topNotch: hasTopNotch ? topNotch : undefined,
      bottomNotch: hasBottomNotch ? bottomNotch : undefined,
      hatEdge: model.id === "party-hat" ? hatEdge : undefined,
      chinHole: model.id === "party-hat" ? hatChinHole : undefined,
      napkinClosure: model.id === "napkin-ring" ? napkinClosure : undefined,
      napkinEdge: model.id === "napkin-ring" ? napkinEdge : undefined,
      topperShape: model.id === "cake-topper" ? topperShape : undefined,
      holderW: model.id === "cake-topper" ? toPt(cakeHolderW, unit) : undefined,
      holderDepth: model.id === "cake-topper" ? toPt(cakeHolderLen, unit) : undefined,
    }),
    [model, L, W, H, thickness, bleed, unit, features, innerComp, slideClearance, lockSlit, tagShape, holeDia, scallopR, envFlap, envLiner, earStyle, earPairs, earHole, earHang, earShape, earHeader, earEasel, bandClosure, pennantShape, labelShape, bookmarkShape, necklaceStyle, hasTopNotch, hasBottomNotch, topNotch, bottomNotch, hatEdge, hatChinHole, napkinClosure, napkinEdge, topperShape, cakeHolderW, cakeHolderLen]
  );

  // The dieline with the user's printable-face colours applied (the model
  // supplies default colours; `decorColors` overrides per id). Used by the
  // canvas, the exports and the 3D, so the face colour is consistent everywhere.
  const decoratedDie = useMemo(() => {
    if (!die.decorations?.length) return die;
    return { ...die, decorations: die.decorations.map((d) => ({ ...d, color: decorColors[d.id] ?? d.color })) };
  }, [die, decorColors]);

  // Per-model build params for the 3D that reshape the dieline (so the fold
  // matches the flat). Envelope: the closure flap style; necklace card: the
  // style (only the fold-over folds). Deliberately NOT the envelope liner —
  // it's a flat insert, not part of the fold; folding a second piece would
  // break panelization.
  const box3dParams = useMemo<Record<string, unknown> | undefined>(() => {
    const p: Record<string, unknown> = {};
    if (model.id === "envelope") p.flap = envFlap;
    if (model.id === "necklace-card") p.necklaceStyle = necklaceStyle;
    if (hasTopNotch) p.topNotch = topNotch;       // so the folded 3D drops the notch too
    if (hasBottomNotch) p.bottomNotch = bottomNotch;
    return Object.keys(p).length ? p : undefined;
  }, [model.id, envFlap, necklaceStyle, hasTopNotch, hasBottomNotch, topNotch, bottomNotch]);

  // Show the 3D pane per-INSTANCE: a Fold-Engine model only folds when its
  // dieline actually has creases (so the necklace card's flat style — no crease
  // — shows no 3D, while its fold-over style does). Bespoke renderers (cupcake,
  // rosette…) have no FoldSpec and always show when has3DPreview.
  const show3D = model.has3DPreview && (!usesFoldEngine(model.id) || die.paths.crease.length > 0);

  const fullW = die.widthPt + 2 * die.bleedPt;
  const fullH = die.heightPt + 2 * die.bleedPt;
  const fits = useMemo(() => checkFit(fullW, fullH), [fullW, fullH]);
  // Sheet imposition ("how many up") per sheet, aligned 1:1 with `fits`.
  const gutterPt = toPt(gutter, unit);
  const imps = useMemo(
    () => fits.map((f) => imposeOnSheet(fullW, fullH, f.sheet, gutterPt, 0)),
    [fits, fullW, fullH, gutterPt],
  );
  // The press sheet to export: the user's pick (if it fits), else the most-up
  // sheet that fits (ties → the smaller sheet, i.e. least wasted material).
  const selImp = useMemo<Imposition | null>(() => {
    const picked = selectedSheet ? imps.find((i) => i.sheet.name === selectedSheet && i.up > 0) : null;
    if (picked) return picked;
    const fitting = imps.filter((i) => i.up > 0)
      .sort((a, b) => b.up - a.up || a.sheet.wPt * a.sheet.hPt - b.sheet.wPt * b.sheet.hPt);
    return fitting[0] ?? null;
  }, [imps, selectedSheet]);

  // Sheet count that doesn't fit (shown as a muted note under the chips).
  const tooBigCount = fits.filter((f) => !f.fits).length;
  // The sheet the inline preview shows: the HOVERED chip (peek), else the chosen
  // sheet, else the best fitting one, else the largest (so big dies still show
  // their overflow). previewImp is the matching Imposition (aligned with `fits`).
  const previewFit =
    hoverFit ??
    fits.find((f) => f.sheet.name === selImp?.sheet.name) ??
    fits.find((f) => f.fits) ??
    fits[fits.length - 1] ??
    null;
  const previewImp = previewFit ? imps[fits.indexOf(previewFit)] : null;

  // SVG viewBox spans the bleed box plus margins. Extra room on the right so the
  // vertical H dimension arrow + its label aren't clipped.
  const padBase = die.bleedPt + 12;
  const padRight = 64;   // room for the vertical H dimension on the right
  const padBottom = 56;  // room for the L/W dimensions below the flat
  const vbW = fullW + padBase + padRight;
  const vbH = fullH + padBase + padBottom;
  const vb = `${-die.bleedPt - padBase} ${-die.bleedPt - padBase} ${vbW} ${vbH}`;

  // Reference region for placing dimension lines at the EDGES (off the artwork):
  // the main piece's bbox for multi-piece sets (e.g. the drawer box's tray, so
  // its L/W sit at the tray's edges, not way down past the sleeve), else the
  // whole flat.
  const dimRef = useMemo(() => {
    const ref = die.pieces?.[0];
    if (!ref) return { right: die.widthPt, bottom: die.heightPt };
    let r = -Infinity, b = -Infinity;
    for (const [x, y] of ref.pts) { if (x > r) r = x; if (y > b) b = y; }
    return { right: r, bottom: b };
  }, [die]);
  const pxW = vbW * zoom;
  const pxH = vbH * zoom;

  // The white-paper backing + its punch-outs. Interior CLOSED cut contours
  // (hang hole, reinforcement-ring inner, window, euro slot…) are real
  // cut-outs — the cutter removes that material — so they're MASKED out of
  // the paper and the canvas grid shows through, exactly like the cut sheet.
  // A contour counts as a hole when its bbox sits STRICTLY inside a piece
  // outline's bbox (a piece outline equals its own bbox, so it can never be
  // misclassified even when `die.pieces` holds clones, not references).
  const { paperPieces, paperHoles } = useMemo(() => {
    const pieces = die.pieces ?? die.paths.cut.slice(0, 1);
    const bb = (pl: Polyline) => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of pl.pts) {
        if (x < x0) x0 = x; if (y < y0) y0 = y;
        if (x > x1) x1 = x; if (y > y1) y1 = y;
      }
      return { x0, y0, x1, y1 };
    };
    const outers = pieces.map(bb);
    const eps = 1e-6;
    const holes = die.paths.cut.filter((pl) => {
      if (!pl.closed || pieces.includes(pl)) return false;
      const h = bb(pl);
      return outers.some((o) => h.x0 > o.x0 + eps && h.y0 > o.y0 + eps && h.x1 < o.x1 - eps && h.y1 < o.y1 - eps);
    });
    return { paperPieces: pieces, paperHoles: holes };
  }, [die]);

  // Dimension arrows show the BUILT (outer) box size — in inner mode that's the
  // entered cavity + compensation, so the arrows always match the real panels.
  const labelText: Record<string, string> = {
    L: `L ${fmt(toPt(L + innerComp, unit), unit)}`,
    W: `W ${fmt(toPt(W + innerComp, unit), unit)}`,
    H: `H ${fmt(toPt(H + innerComp, unit), unit)}`,
  };

  // The artwork to feed preview + export: the editable rect + rotation + data URL.
  const artImage = artwork && artRect ? { dataUrl: artwork.dataUrl, ...artRect, rotDeg: artRot } : undefined;

  // Contain-fit a natW×natH image centered inside the silhouette bbox (points).
  const fitRect = (natW: number, natH: number) => {
    const bw = die.widthPt, bh = die.heightPt;
    const s = Math.min(bw / natW, bh / natH);
    const wPt = natW * s, hPt = natH * s;
    return { xPt: (bw - wPt) / 2, yPt: (bh - hPt) / 2, wPt, hPt };
  };

  // Load a dropped/picked image file → data URL + natural pixel size (for the
  // aspect-ratio fit). 100% local: FileReader never sends the file anywhere.
  function loadImageFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        setArtwork({ dataUrl, natW: img.naturalWidth, natH: img.naturalHeight });
        setArtRect(fitRect(img.naturalWidth, img.naturalHeight));
        setArtRot(0);
        posthog?.capture("artwork_added", {
          template_id: model.id,
          template_name: model.name,
          image_type: file.type,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // Reset this model's saved design back to the example defaults (clears the
  // persisted size + artwork).
  function resetDesign() {
    clearDesign(modelId);
    setL(model.defaultDimensions.L);
    setW(model.defaultDimensions.W);
    setH(model.defaultDimensions.H);
    setThickness(model.defaultDimensions.thickness);
    setBleed(model.defaultDimensions.bleed);
    setArtwork(null); setArtRect(null); setArtRot(0);
    setDecorColors({});
    posthog?.capture("design_reset", { template_id: model.id, template_name: model.name });
  }

  // Artwork drag/resize: convert screen px deltas → points (1 pt = `zoom` px).
  // Corner handles keep the image aspect, anchoring the opposite corner.
  const artDragRef = useRef<null | {
    mode: "move" | "nw" | "ne" | "sw" | "se" | "rotate";
    sx: number; sy: number;
    orig: { xPt: number; yPt: number; wPt: number; hPt: number };
    startRot?: number; startAngle?: number; cScreen?: { x: number; y: number };
  }>(null);
  function onArtPointerDown(e: React.PointerEvent, mode: "move" | "nw" | "ne" | "sw" | "se" | "rotate") {
    if (!artRect) return;
    if (spaceHeld) return; // Space-pan wins: let the event bubble to the canvas pan
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const base: { sx: number; sy: number; orig: typeof artRect } = { sx: e.clientX, sy: e.clientY, orig: { ...artRect } };
    if (mode === "rotate") {
      // capture the rect centre in SCREEN coords so we can measure the pointer
      // angle around it (the SVG maps points → screen via its CTM).
      const svg = canvasRef.current?.querySelector("svg.die-svg") as SVGSVGElement | null;
      const ctm = svg?.getScreenCTM();
      let cScreen = { x: e.clientX, y: e.clientY };
      if (svg && ctm) {
        const pt = svg.createSVGPoint();
        pt.x = artRect.xPt + artRect.wPt / 2;
        pt.y = artRect.yPt + artRect.hPt / 2;
        const s = pt.matrixTransform(ctm);
        cScreen = { x: s.x, y: s.y };
      }
      artDragRef.current = { mode, ...base, startRot: artRot, startAngle: Math.atan2(e.clientY - cScreen.y, e.clientX - cScreen.x), cScreen };
      return;
    }
    artDragRef.current = { mode, ...base };
  }
  function onArtPointerMove(e: React.PointerEvent) {
    const d = artDragRef.current;
    if (!d) return;
    e.stopPropagation();
    if (d.mode === "rotate") {
      const c = d.cScreen!;
      const ang = Math.atan2(e.clientY - c.y, e.clientX - c.x);
      let deg = d.startRot! + ((ang - d.startAngle!) * 180) / Math.PI;
      deg = ((deg % 360) + 360) % 360;
      // snap to 15° increments when close (easy straight angles)
      const near = Math.round(deg / 15) * 15;
      if (Math.abs(deg - near) <= 4) deg = near % 360;
      setArtRot(Math.round(deg));
      return;
    }
    const dxs = (e.clientX - d.sx) / zoom;
    const dys = (e.clientY - d.sy) / zoom;
    const o = d.orig;
    if (d.mode === "move") {
      setArtRect({ ...o, xPt: o.xPt + dxs, yPt: o.yPt + dys });
      return;
    }
    // Resize: rotate the screen delta into the artwork's LOCAL (unrotated) frame
    // so corner drags behave correctly even when the artwork is turned.
    const r = (artRot * Math.PI) / 180;
    const dx = dxs * Math.cos(r) + dys * Math.sin(r);
    const dy = -dxs * Math.sin(r) + dys * Math.cos(r);
    const aspect = artwork ? artwork.natW / artwork.natH : o.wPt / o.hPt;
    const right = d.mode === "ne" || d.mode === "se";
    const bottom = d.mode === "se" || d.mode === "sw";
    const ax = right ? o.xPt : o.xPt + o.wPt;        // anchored (opposite) corner X
    const ay = bottom ? o.yPt : o.yPt + o.hPt;       //   "        "        "     Y
    const cornerX = (right ? o.xPt + o.wPt : o.xPt) + dx;
    const wPt = Math.max(right ? cornerX - ax : ax - cornerX, 12);
    const hPt = wPt / aspect;
    setArtRect({ xPt: right ? ax : ax - wPt, yPt: bottom ? ay : ay - hPt, wPt, hPt });
  }
  function onArtPointerUp(e: React.PointerEvent) {
    if (!artDragRef.current) return;
    e.stopPropagation();
    artDragRef.current = null;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  }

  function download(data: BlobPart, ext: string, mime: string, suffix = "") {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // 2-dim filename only when the H input is hidden (dimLabels.H === null);
    // flat items that still use all three dims (cupcake wrapper) keep 3 dims.
    const twoDim = model.dimLabels?.H === null;
    const dimsTag = twoDim ? `${round(L, 2)}x${round(W, 2)}` : `${round(L, 2)}x${round(W, 2)}x${round(H, 2)}`;
    a.download = `${model.id}_${dimsTag}${unit}${suffix}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // The artwork to export: a single box, or the whole imposed press sheet when
  // "Full sheet" is on and at least one copy fits. Crop marks ride in PDF/SVG
  // only (DXF ignores die.marks — a cutter shouldn't cut them).
  const sheetMode = sheetExport && !!selImp;
  const sheetTag = sheetMode ? `_sheet-${selImp!.sheet.name.replace(/[^\w]+/g, "")}-${selImp!.up}up` : "";
  const exportDie = (withMarks: boolean) =>
    sheetMode ? composeSheet(decoratedDie, selImp!, { cropMarks: cropMarks && withMarks }) : decoratedDie;

  // Exports carry trim (cut) + fold (crease) lines only — no bleed contour.
  // The bleed margin is still baked into each file's physical size.
  // Print-&-Cut artwork rides in PDF/SVG only, and only for a single piece —
  // full-sheet imposition stamps N copies, so a one-off image rect wouldn't map.
  const exportArt = sheetMode || !showArt ? undefined : artImage;
  const exportProps = () => ({
    template_id: model.id,
    template_name: model.name,
    unit,
    L: round(L, 3),
    W: round(W, 3),
    H: round(H, 3),
    sheet_mode: sheetMode,
    sheet_name: sheetMode ? selImp?.sheet.name : undefined,
    copies_up: sheetMode ? selImp?.up : undefined,
    has_artwork: !!exportArt,
  });
  async function exportPdf() {
    const bytes = await dielineToPdf(exportDie(true), { includeGlue: show.glue, image: exportArt });
    download(bytes as BlobPart, "pdf", "application/pdf", sheetTag);
    posthog?.capture(sheetMode ? "full_sheet_exported" : "dieline_exported", { ...exportProps(), format: "pdf" });
  }
  function exportSvg() {
    const svg = dielineToSvg(exportDie(true), { unit, includeGlue: show.glue, image: exportArt });
    download(svg, "svg", "image/svg+xml", sheetTag);
    posthog?.capture(sheetMode ? "full_sheet_exported" : "dieline_exported", { ...exportProps(), format: "svg" });
  }
  function exportDxf() {
    // DXF is the cutter format — crop marks are never included.
    const dxf = dielineToDxf(exportDie(false), { includeCrease: show.crease });
    download(dxf, "dxf", "application/dxf", sheetTag);
    posthog?.capture(sheetMode ? "full_sheet_exported" : "dieline_exported", { ...exportProps(), format: "dxf" });
  }

  // Phase 3 — the matched Print & Cut PAIR: a PRINT file (artwork at exact size,
  // NO cut/score lines so they aren't inked onto the piece) + a CUT file (lines
  // only, no art). The maker opens both in their own cutter software, which adds
  // the registration marks for THEIR machine. Single-piece only.
  async function exportPrintCutPair() {
    if (!artImage) return;
    const pdf = await dielineToPdf(decoratedDie, { image: artImage, includeLines: false });
    download(pdf as BlobPart, "pdf", "application/pdf", "_print");
    const svg = dielineToSvg(decoratedDie, { unit, includeGlue: show.glue, includeDecorations: false }); // cut lines only
    download(svg, "svg", "image/svg+xml", "_cut");
    posthog?.capture("print_cut_pair_exported", {
      template_id: model.id,
      template_name: model.name,
      unit,
      L: round(L, 3),
      W: round(W, 3),
      H: round(H, 3),
    });
  }

  // Wheel handler (Figma/Miro-style): Ctrl/⌘ or pinch → zoom; plain wheel /
  // two-finger scroll → pan. ALWAYS preventDefault so the page never scrolls
  // when the gesture happens over the canvas. Native (non-passive) listener.
  // (macOS pinch sends ctrlKey=true; if it slightly drifts directionally,
  // events arrive without ctrl, which used to fall through to page scroll.)
  // Close the bigger-3D modal on Escape.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setAutoFit(false);
      if (e.ctrlKey || e.metaKey) {
        // ZOOM, anchored at cursor.
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left - rect.width / 2;
        const my = e.clientY - rect.top - rect.height / 2;
        // Smooth proportional zoom. Trackpad pinch fires 30–60 small deltas/sec
        // (deltaY ~1–20 each); a mouse wheel notch is one large delta (~100).
        // exp(-dy·k) scales correctly for both; clamp |dy| to cap one event.
        const dy = Math.max(-100, Math.min(100, e.deltaY));
        const factor = Math.exp(-dy * 0.004);
        setZoom((prev) => {
          const next = clampZoom(prev * factor);
          if (next !== prev) {
            const r = next / prev;
            setPan((p) => ({ x: mx - (mx - p.x) * r, y: my - (my - p.y) * r }));
          }
          return next;
        });
      } else {
        // PAN: treat plain wheel / two-finger scroll as a pan.
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Auto-fit the dieline to the canvas (zoom + recentre). Stays on until the
  // user manually zooms or pans, then they take control.
  useEffect(() => {
    if (!autoFit) return;
    const el = canvasRef.current;
    if (!el) return;
    const fit = () => {
      const pad = 24;
      const w = el.clientWidth - pad * 2;
      const h = el.clientHeight - pad * 2;
      if (w <= 0 || h <= 0) return;
      setZoom(clampZoom(Math.min(w / vbW, h / vbH)));
      setPan({ x: 0, y: 0 });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [autoFit, vbW, vbH]);

  // Hold SPACE → temporary hand tool (pan), like Figma/Photoshop: while held,
  // click-drag pans regardless of the active tool; releasing reverts. Ignored
  // while typing in a field so Space still types a space there.
  useEffect(() => {
    const editable = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || editable(e.target)) return;
      e.preventDefault(); // stop the page scrolling on Space
      setSpaceHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      setSpaceHeld(false);
      panRef.current = null;
      setPanning(false);
    };
    // releasing focus (alt-tab, devtools) must not leave Space "stuck" on
    const reset = () => { setSpaceHeld(false); panRef.current = null; setPanning(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
    };
  }, []);

  function onCanvasPointerDown(e: React.PointerEvent) {
    if (tool !== "pan" && !spaceHeld) return;
    if ((e.target as HTMLElement).closest(".box-overlay, .sheet-overlay")) return; // let 3D handle it
    e.preventDefault();
    const el = canvasRef.current!;
    el.setPointerCapture(e.pointerId);
    panRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    setPanning(true);
    setAutoFit(false);
  }
  function onCanvasPointerMove(e: React.PointerEvent) {
    const p = panRef.current;
    if (!p) return;
    setPan({ x: p.px + (e.clientX - p.x), y: p.py + (e.clientY - p.y) });
  }
  function onCanvasPointerUp() {
    panRef.current = null;
    setPanning(false);
  }

  const numField = (label: string, value: number, set: (n: number) => void, step = 0.0625) => (
    <div>
      <label>{label}</label>
      <input
        type="number"
        value={value}
        step={step}
        min={0}
        onChange={(e) => set(parseFloat(e.target.value) || 0)}
      />
    </div>
  );

  // A choice control. Segmented buttons read well up to ~3 options; beyond that
  // they overflow / wrap (especially on mobile), so switch to a dropdown. Keeps
  // every "tabbed group" capped at 3 buttons.
  function choice<T extends string>(value: T, options: readonly (readonly [T, string])[], set: (v: T) => void) {
    if (options.length <= 3) {
      return (
        <div className="seg">
          {options.map(([id, label]) => (
            <button key={id} type="button" className={value === id ? "active" : ""} onClick={() => set(id)}>{label}</button>
          ))}
        </div>
      );
    }
    return (
      <select value={value} onChange={(e) => set(e.target.value as T)} style={{ width: "100%" }}>
        {options.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
    );
  }

  // Collapsible-card header: a caret + label + optional one-line summary. Each
  // control section uses this; clicking toggles the card (open ⇄ pill).
  const cardHead = (id: string, label: ReactNode, summary?: ReactNode) => (
    <button type="button" className="card-head" onClick={() => toggleCard(id)}>
      <span className="caret" />
      <span className="card-lbl">{label}</span>
      {summary != null && <span className="card-sum">{summary}</span>}
    </button>
  );

  // ---- Control-section BODIES ----------------------------------------------
  // Each section's controls are extracted into a render helper so the DESKTOP
  // floating cards and the MOBILE bottom sheets render the SAME controls (no
  // forked logic). The desktop card wraps these in `.preview-stage` / card body;
  // the mobile sheet drops them straight in.

  // 3D "Assembled" preview body — Box3D + fold slider, or a placeholder.
  const previewBody = (boxSize = 280) => (
    <div className="preview-stage" style={stageBg ? { background: stageBg } : undefined}>
      {show3D ? (
        <>
          <Suspense fallback={<div style={{ width: "100%", height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#9aa1ad", fontSize: 12 }}>Loading 3D…</div>}>
            <Box3D Lpt={toPt(L, unit)} Wpt={toPt(W, unit)} Hpt={toPt(H, unit)} fold={fold} model={model.id} features={features} buildParams={box3dParams} artwork={showArt ? artImage : undefined} decorColors={decorColors} size={boxSize} />
          </Suspense>
          <div className="box-fold">
            <span className="muted">Closed</span>
            <input type="range" min={0} max={1} step={0.01} value={fold} onChange={(e) => setFold(parseFloat(e.target.value))} />
            <span className="muted">Open</span>
          </div>
        </>
      ) : (
        <div className="preview-placeholder">
          <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
          3D fold preview coming<br />for the {model.shortName}.
        </div>
      )}
      <div className="preview-foot muted">
        {round(L, 2)} × {round(W, 2)} × {round(H, 2)} {unit}
      </div>
    </div>
  );

  // Units segmented control.
  const unitsBody = () => (
    <div className="seg">
      {(["in", "mm"] as Unit[]).map((u) => (
        <button
          key={u}
          className={unit === u ? "active" : ""}
          onClick={() => {
            if (u === unit) return;
            // convert current values so the physical box stays the same
            const conv = (v: number) => round(fromPt(toPt(v, unit), u), u === "in" ? 4 : 2);
            setL(conv(L)); setW(conv(W)); setH(conv(H));
            setThickness(conv(thickness)); setBleed(conv(bleed));
            setSlideClearance(conv(slideClearance));
            setLockSlit(conv(lockSlit));
            setHoleDia(conv(holeDia));
            setScallopR(conv(scallopR));
            setEarHole(conv(earHole));
            setCakeHolderW(conv(cakeHolderW));
            setCakeHolderLen(conv(cakeHolderLen));
            setUnit(u);
          }}
        >
          {u}
        </button>
      ))}
    </div>
  );

  // Dimensions body: presets + Outer/Inner + L/W/H/thickness/bleed + all the
  // per-model option blocks (envelope flap, pennant shape, notch params, …).
  const dimsBody = () => (
    <>
      {model.presets && (
        <div style={{ marginBottom: 10 }}>
          <label>Size preset</label>
          <select
            defaultValue=""
            onChange={(e) => {
              const pre = model.presets!.find((x) => x.label === e.target.value);
              if (!pre) return;
              // presets are in inches; convert to the active unit
              const cv = (v: number) => round(fromPt(inToPt(v), unit), unit === "in" ? 4 : 2);
              setL(cv(pre.L)); setW(cv(pre.W));
              if (pre.H != null) setH(cv(pre.H)); // 3-D box presets fill H too
              posthog?.capture("size_preset_selected", {
                template_id: model.id,
                template_name: model.name,
                preset_label: pre.label,
              });
            }}
          >
            <option value="">Custom…</option>
            {model.presets.map((pre) => (
              <option key={pre.label} value={pre.label}>{pre.label}</option>
            ))}
          </select>
        </div>
      )}
      {supportsInner && (
        <div style={{ marginBottom: 10 }}>
          <div className="seg">
            {(["outer", "inner"] as const).map((m) => (
              <button key={m} className={dimMode === m ? "active" : ""} onClick={() => setDimMode(m)}>
                {m === "outer" ? "Outer" : "Inner"}
              </button>
            ))}
          </div>
          <p className="sub" style={{ margin: "6px 0 0" }}>
            {dimMode === "inner"
              ? `L/W/H = the inner cavity. Each dimension is built ${(2 * thickness).toFixed(3)} ${unit} larger — one wall thickness (${thickness} ${unit}) added on each of the two opposite sides — so contents fit. Approximate; verify with a sample.`
              : "L/W/H = the box exterior."}
          </p>
        </div>
      )}
      {/* dimLabels lets a model rename the L/W/H inputs (a tag's "Tag
          width") or hide one entirely (null — e.g. H on a flat item). */}
      <div className="row">
        {model.dimLabels?.L !== null && numField(model.dimLabels?.L ?? "Length (L)", L, setL)}
        {model.dimLabels?.W !== null && numField(model.dimLabels?.W ?? "Width / depth (W)", W, setW)}
      </div>
      <div className="row">
        {model.dimLabels?.H !== null && numField(model.dimLabels?.H ?? "Height (H)", H, setH)}
        {numField("Material thickness", thickness, setThickness, 0.001)}
      </div>
      {numField("Bleed", bleed, setBleed, 0.0625)}
      {model.id === "envelope" && (
        <>
          <div style={{ margin: "8px 0 6px" }}>
            <label>Closure flap</label>
            {choice(envFlap, [["square", "Square"], ["pointed", "Pointed"], ["diamond", "Diamond"], ["wallet", "Pocket"], ["catalog", "Catalog"]] as const, (id) => { setEnvFlap(id); posthog?.capture("variant_selected", { template_id: model.id, field: "envelope_flap", value: id }); })}
          </div>
          {(envFlap === "square" || envFlap === "pointed") && (
            <label className="toggle">
              <input type="checkbox" checked={envLiner} onChange={(e) => setEnvLiner(e.target.checked)} />
              <span className="swatch" style={{ background: LAYER_STYLES.cut.color }} />
              Contrast liner (separate piece)
            </label>
          )}
          <p className="sub" style={{ margin: "2px 0 0" }}>
            Square = announcement / A-style; Pointed = baronial; Diamond = wedding /
            invitation (pointed flaps); Pocket = portrait wallet with a long bottom
            pocket flap; Catalog = open-end document envelope (big side flaps meet
            at a centre back seam). Square/Pointed support a contrast liner. Tip:
            use the C5 / C5 portrait presets for ISO sizes.
          </p>
        </>
      )}
      {model.id === "bunting-pennant" && (
        <div style={{ margin: "8px 0 6px" }}>
          <label>Pennant shape</label>
          <div className="seg">
            {([["triangle", "Triangle"], ["swallowtail", "Swallowtail"], ["scallop", "Scallop"]] as const).map(([id, label]) => (
              <button key={id} className={pennantShape === id ? "active" : ""} onClick={() => setPennantShape(id)}>
                {label}
              </button>
            ))}
          </div>
          <p className="sub" style={{ margin: "6px 0 0" }}>
            Two lacing holes at the top thread the string. Cut a row and
            string a banner.
          </p>
        </div>
      )}
      {model.id === "jar-label" && (
        <div style={{ margin: "8px 0 6px" }}>
          <label>Label shape</label>
          <div className="seg">
            {([["rect", "Rect"], ["oval", "Oval"], ["scallop", "Scallop"]] as const).map(([id, label]) => (
              <button key={id} className={labelShape === id ? "active" : ""} onClick={() => setLabelShape(id)}>
                {label}
              </button>
            ))}
          </div>
          <p className="sub" style={{ margin: "6px 0 0" }}>
            The shape IS the cut. Drop your artwork inside (Print &amp; Cut)
            and gang a whole sheet.
          </p>
        </div>
      )}
      {model.id === "bookmark" && (
        <div style={{ margin: "8px 0 6px" }}>
          <label>Bookmark shape</label>
          <div className="seg">
            {([["rounded", "Rounded"], ["pointed", "Pointed"], ["scallop", "Scallop"]] as const).map(([id, label]) => (
              <button key={id} className={bookmarkShape === id ? "active" : ""} onClick={() => setBookmarkShape(id)}>
                {label}
              </button>
            ))}
          </div>
          <p className="sub" style={{ margin: "6px 0 0" }}>
            Tassel hole at the top. Gang several per sheet; add your art with
            Print &amp; Cut.
          </p>
        </div>
      )}
      {model.id === "necklace-card" && (
        <div style={{ margin: "8px 0 6px" }}>
          <label>Style</label>
          <div className="seg">
            {([["flat", "Flat (slits)"], ["fold", "Fold-over"]] as const).map(([id, label]) => (
              <button key={id} className={necklaceStyle === id ? "active" : ""} onClick={() => setNecklaceStyle(id)}>
                {label}
              </button>
            ))}
          </div>
          <p className="sub" style={{ margin: "6px 0 0" }}>
            {necklaceStyle === "fold"
              ? "Hourglass card — folds in half at the waist; the chain wraps the waist and hangs from the slots. Try a tall size (e.g. 2.25 × 5)."
              : "Flat card — a hang hole + a two-slit retainer holds the necklace flat."}
          </p>
        </div>
      )}
      {model.id === "party-hat" && (
        <div style={{ margin: "8px 0 6px" }}>
          <label>Brim edge</label>
          <div className="seg">
            {([["straight", "Straight"], ["scallop", "Scallop"]] as const).map(([id, label]) => (
              <button key={id} className={hatEdge === id ? "active" : ""} onClick={() => { setHatEdge(id); posthog?.capture("variant_selected", { template_id: model.id, field: "hat_edge", value: id }); }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <label className="check-row">
              <input type="checkbox" checked={hatChinHole} onChange={e => { setHatChinHole(e.target.checked); posthog?.capture("variant_selected", { template_id: model.id, field: "chin_hole", value: e.target.checked }); }} />
              Chin-strap holes
            </label>
          </div>
          <p className="sub" style={{ margin: "6px 0 0" }}>
            Flat sector unrolls from the cone. Scallop edge bumps outward. Chin holes pair with ribbon or elastic.
          </p>
        </div>
      )}
      {model.id === "napkin-ring" && (
        <div style={{ margin: "8px 0 6px" }}>
          <label>Closure</label>
          <div className="seg">
            {([["lock", "Tuck-lock"], ["glue", "Glue"]] as const).map(([id, label]) => (
              <button key={id} className={napkinClosure === id ? "active" : ""} onClick={() => { setNapkinClosure(id); posthog?.capture("variant_selected", { template_id: model.id, field: "napkin_closure", value: id }); }}>
                {label}
              </button>
            ))}
          </div>
          <label style={{ marginTop: 8 }}>Edge</label>
          <div className="seg">
            {([["scallop-both", "Scallop both"], ["scallop-top", "Scallop top"], ["straight", "Straight"]] as const).map(([id, label]) => (
              <button key={id} className={napkinEdge === id ? "active" : ""} onClick={() => { setNapkinEdge(id); posthog?.capture("variant_selected", { template_id: model.id, field: "napkin_edge", value: id }); }}>
                {label}
              </button>
            ))}
          </div>
          <p className="sub" style={{ margin: "6px 0 0" }}>
            Girth = distance around the folded napkin. Tuck-lock is glue-free; glue overlaps the ends.
          </p>
        </div>
      )}
      {model.id === "cake-topper" && (
        <div style={{ margin: "8px 0 6px" }}>
          <label>Shape</label>
          {choice(topperShape, [["circle", "Circle"], ["heart", "Heart"], ["star", "Star"], ["scallop", "Scallop"]] as const, (id) => { setTopperShape(id); posthog?.capture("variant_selected", { template_id: model.id, field: "topper_shape", value: id }); })}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            {numField(`Holder width (${unit})`, cakeHolderW, setCakeHolderW, unit === "in" ? 0.05 : 1)}
            {numField(`Holder length (${unit})`, cakeHolderLen, setCakeHolderLen, unit === "in" ? 0.1 : 2)}
          </div>
          <p className="sub" style={{ margin: "6px 0 0" }}>
            The tab at the bottom is the stick holder — tape a bamboo skewer or lollipop stick behind it,
            then press into a cake or cupcake. Make it wider/longer for a firmer hold.
          </p>
        </div>
      )}

      {model.id === "belly-band" && (
        <div style={{ margin: "8px 0 6px" }}>
          <label>Closure</label>
          <div className="seg">
            {([["glue", "Glue"], ["lock", "Tuck-lock"]] as const).map(([id, label]) => (
              <button key={id} className={bandClosure === id ? "active" : ""} onClick={() => setBandClosure(id)}>
                {label}
              </button>
            ))}
          </div>
          <p className="sub" style={{ margin: "6px 0 0" }}>
            Girth = the distance around the product. Glue overlaps + glues the
            ends; Tuck-lock inserts a tab into a slot (glue-free).
          </p>
        </div>
      )}
      {model.id === "earring-card" && (
        <>
          <div style={{ margin: "8px 0 6px" }}>
            <label>Earring style</label>
            <div className="seg">
              {([["stud", "Stud"], ["dangle", "Dangle / hook"]] as const).map(([id, label]) => (
                <button key={id} className={earStyle === id ? "active" : ""} onClick={() => setEarStyle(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="row">
            {numField("Pairs (rows)", earPairs, (n) => setEarPairs(Math.max(1, Math.round(n))), 1)}
            {numField("Hole diameter", earHole, setEarHole, 0.015625)}
          </div>
          <label className="toggle">
            <input type="checkbox" checked={earHang} onChange={(e) => setEarHang(e.target.checked)} />
            <span className="swatch" style={{ background: LAYER_STYLES.cut.color }} />
            Top hang hole (for a display peg)
          </label>
          {!earHeader && (
            <div style={{ margin: "8px 0 6px" }}>
              <label>Card shape</label>
              {choice(earShape, [["rect", "Rect"], ["scallop", "Scallop"], ["arch", "Arch"], ["tag-top", "Tag-top"]] as const, (id) => setEarShape(id))}
            </div>
          )}
          <label className="toggle">
            <input type="checkbox" checked={earHeader} onChange={(e) => setEarHeader(e.target.checked)} />
            <span className="swatch" style={{ background: LAYER_STYLES.crease.color }} />
            Fold-over header (sturdy double-thick top)
          </label>
          <label className="toggle">
            <input type="checkbox" checked={earEasel} onChange={(e) => setEarEasel(e.target.checked)} />
            <span className="swatch" style={{ background: LAYER_STYLES.cut.color }} />
            Easel stand (extra strut piece)
          </label>
          <p className="sub" style={{ margin: "2px 0 0" }}>
            Stud = post holes in the card body; Dangle = hook holes near the top.
            Header folds back for a rigid hang area; Easel adds a slot-in strut
            so the card stands.
          </p>
        </>
      )}
      {model.id === "gift-tag" && (
        <>
          <div style={{ margin: "8px 0 6px" }}>
            <label>Tag shape</label>
            <div className="seg">
              {([["luggage", "Luggage"], ["scallop", "Scallop"], ["ticket", "Ticket"]] as const).map(([id, label]) => (
                <button key={id} className={tagShape === id ? "active" : ""} onClick={() => setTagShape(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {numField("Hang hole diameter", holeDia, setHoleDia, 0.03125)}
          {tagShape === "scallop" && numField("Scallop size", scallopR, setScallopR, 0.03125)}
          <p className="sub" style={{ margin: "2px 0 0" }}>
            The small ring is a reinforcement patch — glue it around the hole
            on the back so twine doesn't tear through.
          </p>
        </>
      )}
      {model.id === "drawer-box" && numField("Slide clearance", slideClearance, setSlideClearance, 0.01)}
      {(model.id === "tray-lid" || model.id === "hex-tray-lid") && numField("Lid fit clearance", slideClearance, setSlideClearance, 0.01)}
      {model.id === "gable-box" && (
        <>
          {numField("Lock slit length", lockSlit, setLockSlit, 0.05)}
          <p className="sub" style={{ margin: "2px 0 0" }}>
            How far the gable-end slit runs. Auto-clamped so it stays clear of the
            tip and the base. Longer = the lock ears insert deeper.
          </p>
        </>
      )}
    </>
  );

  // Thumb-notch toggles (per end). Only rendered when the model has notches.
  const notchBody = () => (
    <>
      {hasTopNotch && (
        <label className="toggle">
          <input type="checkbox" checked={topNotch} onChange={(e) => setTopNotch(e.target.checked)} />
          <span className="swatch" style={{ background: LAYER_STYLES.cut.color }} />
          Top notch
        </label>
      )}
      {hasBottomNotch && (
        <label className="toggle">
          <input type="checkbox" checked={bottomNotch} onChange={(e) => setBottomNotch(e.target.checked)} />
          <span className="swatch" style={{ background: LAYER_STYLES.cut.color }} />
          Bottom notch
        </label>
      )}
    </>
  );

  // Feature overlays (window / euro / thumb hole / easy-open thumb cut).
  const featuresBody = () => (
    <>
      {supportsWindow && (
        <label className="toggle">
          <input
            type="checkbox"
            checked={windowOn}
            onChange={(e) => { setWindowOn(e.target.checked); posthog?.capture("feature_overlay_toggled", { template_id: model.id, feature: "window", enabled: e.target.checked }); }}
          />
          <span className="swatch" style={{ background: LAYER_STYLES.cut.color }} />
          Window cut (front panel)
        </label>
      )}
      {windowOn && supportsWindow && numField("Window margin", windowMargin, setWindowMargin, 0.0625)}
      {supportsEuro && (
        <label className="toggle">
          <input
            type="checkbox"
            checked={euroOn}
            onChange={(e) => { setEuroOn(e.target.checked); posthog?.capture("feature_overlay_toggled", { template_id: model.id, feature: "euro_hanger", enabled: e.target.checked }); }}
          />
          <span className="swatch" style={{ background: LAYER_STYLES.cut.color }} />
          Euro hanger slot (back panel)
        </label>
      )}
      {supportsThumb && (
        <label className="toggle">
          <input
            type="checkbox"
            checked={thumbOn}
            onChange={(e) => { setThumbOn(e.target.checked); posthog?.capture("feature_overlay_toggled", { template_id: model.id, feature: "thumb_hole", enabled: e.target.checked }); }}
          />
          <span className="swatch" style={{ background: LAYER_STYLES.cut.color }} />
          Thumb / finger hole
        </label>
      )}
      {supportsThumbNotch && (
        <label className="toggle">
          <input
            type="checkbox"
            checked={thumbNotchOn}
            onChange={(e) => { setThumbNotchOn(e.target.checked); posthog?.capture("feature_overlay_toggled", { template_id: model.id, feature: "thumb_notch", enabled: e.target.checked }); }}
          />
          <span className="swatch" style={{ background: LAYER_STYLES.cut.color }} />
          Thumb cut (easy-open, front lip)
        </label>
      )}
    </>
  );

  // Whether the model exposes notch toggles and/or feature overlays.
  const hasNotches = hasTopNotch || hasBottomNotch;
  const hasFeatures = supportsWindow || supportsEuro || supportsThumb || supportsThumbNotch;
  // Mobile "Options" tab = notch + features combined (with sub-labels so each
  // group reads). Only meaningful when one of them exists.
  const optionsBody = () => (
    <>
      {hasNotches && (
        <>
          <div className="m-sub">Thumb notch</div>
          {notchBody()}
        </>
      )}
      {hasFeatures && (
        <>
          <div className={`m-sub${hasNotches ? " mt" : ""}`}>Features</div>
          {featuresBody()}
        </>
      )}
    </>
  );

  // Layer toggles (in two columns on desktop; CSS handles the layout).
  const layersBody = () => (
    <div className="layer-grid">
      {VISIBLE_LAYERS.map((k) => (
        <label key={k} className="toggle">
          <input
            type="checkbox"
            checked={show[k]}
            onChange={(e) => setShow({ ...show, [k]: e.target.checked })}
          />
          <span className="swatch" style={{ background: LAYER_STYLES[k].color }} />
          {LAYER_STYLES[k].label}
        </label>
      ))}
      <label className="toggle">
        <input type="checkbox" checked={showDims} onChange={(e) => setShowDims(e.target.checked)} />
        <span className="swatch" style={{ background: "#1f3bb3" }} />
        Dimensions
      </label>
      {artwork && (
        <label className="toggle">
          <input type="checkbox" checked={showArt} onChange={(e) => setShowArt(e.target.checked)} />
          <span className="swatch" style={{ background: "#9333ea" }} />
          Artwork (print)
        </label>
      )}
    </div>
  );

  // Face colours — recolour each printable decoration group (eyes/nose/ears/…).
  const faceColorsBody = () => (
    <>
      <p className="sub" style={{ margin: "0 0 10px" }}>
        Recolour the printed face. These shapes are <strong>print, not cut</strong> —
        they ride in the PDF &amp; SVG (DXF stays cut-only).
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px 12px" }}>
        {(die.decorations ?? []).map((d) => {
          const val = decorColors[d.id] ?? d.color;
          return (
            <label key={d.id} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, cursor: "pointer" }}>
              <input
                type="color"
                value={val}
                onChange={(e) => {
                  setDecorColors((c) => ({ ...c, [d.id]: e.target.value }));
                  posthog?.capture("face_color_changed", {
                    template_id: model.id,
                    template_name: model.name,
                    decoration_id: d.id,
                    decoration_label: d.label,
                    color: e.target.value,
                  });
                }}
                style={{ width: 30, height: 24, padding: 0, border: "1px solid var(--line)", borderRadius: 6, background: "none", cursor: "pointer", flex: "0 0 auto" }}
                aria-label={d.label}
              />
              {d.label}
            </label>
          );
        })}
      </div>
      {Object.keys(decorColors).length > 0 && (
        <button
          type="button"
          onClick={() => setDecorColors({})}
          style={{ marginTop: 10, background: "none", border: 0, padding: 0, color: "var(--cut, #2a45c4)", font: "inherit", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
        >
          Reset to default colours
        </button>
      )}
    </>
  );

  // Print & Cut body (drop / replace / remove artwork + the Print&Cut pair).
  const printCutBody = () => (
    <>
      <p className="sub" style={{ margin: "0 0 8px" }}>
        Drop a logo or photo on the canvas (or pick a file) to print inside
        the cut shape. Drag it to move; drag a corner to resize. Embeds in
        PDF &amp; SVG; DXF stays cut-only. The image never leaves your browser.
      </p>
      <input
        ref={artInputRef}
        type="file"
        accept="image/png,image/jpeg"
        style={{ display: "none" }}
        onChange={(e) => { loadImageFile(e.target.files?.[0]); e.target.value = ""; }}
      />
      {!artwork ? (
        <button className="btn" onClick={() => artInputRef.current?.click()}>
          <ImagePlus size={15} style={{ marginRight: 6, verticalAlign: "-2px" }} />
          Add artwork…
        </button>
      ) : (
        <>
          <div className="art-loaded" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src={artwork.dataUrl}
              alt="artwork"
              style={{ width: 40, height: 40, objectFit: "contain", background: "#fff", borderRadius: 4, border: "1px solid rgba(0,0,0,0.12)" }}
            />
            <button className="btn" onClick={() => artInputRef.current?.click()}>Replace…</button>
            <button className="btn" onClick={() => { setArtwork(null); setArtRect(null); setArtRot(0); }}>
              <X size={14} style={{ verticalAlign: "-2px" }} /> Remove
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <button
              className="btn"
              onClick={() => artwork && setArtRect(fitRect(artwork.natW, artwork.natH))}
            >
              Fit to shape
            </button>
            <span className="sub" style={{ marginLeft: "auto" }}>
              Rotation: <b>{artRot}°</b>
            </span>
            {artRot !== 0 && (
              <button className="btn" onClick={() => setArtRot(0)}>Reset</button>
            )}
          </div>
          <p className="sub" style={{ margin: "6px 0 0" }}>
            Drag the image to move, a corner to resize, the top knob to rotate.
          </p>
          {!sheetMode && (
            <>
              <button className="btn" style={{ marginTop: 8 }} onClick={exportPrintCutPair}>
                Export Print &amp; Cut pair
              </button>
              <p className="sub" style={{ margin: "8px 0 0" }}>
                Saves two files: <b>_print.pdf</b> (your artwork, no cut lines)
                + <b>_cut.svg</b> (cut/score lines only). Open both in your
                cutter app and turn on its <b>Print &amp; Cut</b> /
                <b> Print&nbsp;Then&nbsp;Cut</b> — it adds the registration
                marks for your machine. Or use the combined <b>PDF/SVG</b>
                below (art + lines in one file) for Silhouette/Cricut.
              </p>
            </>
          )}
        </>
      )}
      {artwork && sheetMode && (
        <p className="sub" style={{ margin: "8px 0 0", color: "#b45309" }}>
          Artwork prints on a single piece only — turn off Full-sheet export
          to include it.
        </p>
      )}
    </>
  );

  // Paper-fit body: gutter + selectable sheet chips + the live layout preview.
  const paperFitBody = (maxW = 236, maxH = 250) => (
    <>
      {numField("Gutter — gap between pieces", gutter, setGutter, 0.0625)}
      <p className="sub" style={{ margin: "2px 0 8px" }}>
        Tap a sheet to choose it for full-sheet export. Hover to preview the layout.
      </p>
      {/* Selectable sheet CHIPS (only sheets the piece fits) + ONE live
          layout preview that follows the hovered (peek) or chosen sheet. */}
      <div className="sheet-chips">
        {fits.map((r, i) =>
          r.fits ? (
            <button
              key={r.sheet.name}
              type="button"
              className={`sheet-chip${sheetExport && selImp?.sheet.name === r.sheet.name ? " on" : ""}`}
              onMouseEnter={() => setHoverFit(r)}
              onMouseLeave={() => setHoverFit((cur) => (cur === r ? null : cur))}
              onClick={() => { setSelectedSheet(r.sheet.name); setSheetExport(true); }}
            >
              <b>{imps[i].up}</b>
              <span className="sfx">up</span>
              <span className="nm">{r.sheet.name.replace(/\s*\(.*\)/, "")}</span>
            </button>
          ) : null
        )}
      </div>
      {tooBigCount > 0 && (
        <p className="sub tiny">
          {tooBigCount} larger sheet{tooBigCount > 1 ? "s" : ""} don't fit at this size.
        </p>
      )}
      {previewFit && previewImp ? (
        <div className="sheet-inline-preview">
          <SheetFitPreview die={die} fit={previewFit} imp={previewImp} unit={unit} maxW={maxW} maxH={maxH} />
        </div>
      ) : (
        <p className="sub tiny">This dieline is larger than every standard sheet — export Single 1:1 and tile by hand.</p>
      )}
    </>
  );

  // Export controls: the Single/Full-sheet toggle + sheet detail/crop marks +
  // the PDF/SVG/DXF buttons + the help text. Shared by the desktop Export card
  // and the mobile Export sheet.
  const exportBody = () => (
    <>
      {/* Single box vs the whole imposed press sheet */}
      <div style={{ display: "flex", border: "1px solid var(--line, #d7d7d2)", borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
        {([["single", "Single 1:1"], ["sheet", `Full sheet${selImp ? ` · ${selImp.up}-up` : ""}`]] as const).map(([mode, label]) => {
          const active = (mode === "sheet") === sheetExport;
          const disabled = mode === "sheet" && !selImp;
          return (
            <button
              key={mode}
              onClick={() => !disabled && setSheetExport(mode === "sheet")}
              disabled={disabled}
              style={{
                flex: 1, padding: "7px 0", fontSize: 13, border: "none", cursor: disabled ? "not-allowed" : "pointer",
                background: active ? "#1c1c1a" : "transparent", color: active ? "#fff" : disabled ? "#aaa" : "#333",
                fontWeight: active ? 600 : 400,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Single-piece note when not full-sheet */}
      {!sheetMode && (
        <p className="sub" style={{ margin: "0 0 10px" }}>
          One piece at exact 1:1 — <b>{fmt(fullW, unit)} × {fmt(fullH, unit)}</b> (incl. bleed).
        </p>
      )}

      {/* Full-sheet: material chips + live layout preview (same as Paper fit) */}
      {sheetExport && (
        <div style={{ marginBottom: 10 }}>
          <div className="sheet-chips">
            {fits.map((r, i) =>
              r.fits ? (
                <button
                  key={r.sheet.name}
                  type="button"
                  className={`sheet-chip${selImp?.sheet.name === r.sheet.name ? " on" : ""}`}
                  onMouseEnter={() => setHoverFit(r)}
                  onMouseLeave={() => setHoverFit((cur) => (cur === r ? null : cur))}
                  onClick={() => { setSelectedSheet(r.sheet.name); setSheetExport(true); }}
                >
                  <b>{imps[i].up}</b>
                  <span className="sfx">up</span>
                  <span className="nm">{r.sheet.name.replace(/\s*\(.*\)/, "")}</span>
                </button>
              ) : null
            )}
          </div>
          {previewFit && previewImp ? (
            <div className="sheet-inline-preview">
              <SheetFitPreview die={die} fit={previewFit} imp={previewImp} unit={unit} maxW={250} maxH={250} />
            </div>
          ) : (
            <p className="sub tiny">This dieline is larger than every standard sheet — export Single 1:1 and tile by hand.</p>
          )}
        </div>
      )}

      {sheetMode && selImp && (
        <div style={{ fontSize: 13, margin: "0 0 10px", lineHeight: 1.5 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={cropMarks} onChange={(e) => setCropMarks(e.target.checked)} />
            Crop marks (PDF / SVG)
          </label>
        </div>
      )}

      <button className="btn" onClick={exportPdf}>↓ Download {sheetMode ? "full-sheet " : ""}PDF</button>
      <button className="btn secondary" onClick={exportSvg}>Export {sheetMode ? "sheet " : ""}SVG</button>
      <button className="btn secondary" onClick={exportDxf}>Export {sheetMode ? "sheet " : ""}DXF</button>
      {PRINT_AND_CUT_ENABLED && artImage && !sheetMode && (
        <button type="button" className="reset-link" style={{ display: "block", margin: "11px auto 0", textAlign: "center" }} onClick={exportPrintCutPair}>
          Print &amp; Cut pair
        </button>
      )}
      <p className="sub" style={{ margin: "8px 0 0" }}>
        {sheetMode && selImp ? (
          <>
            One file = the whole <b>{selImp.sheet.name}</b> press sheet with{" "}
            <b>{selImp.up}</b> copies laid out, ready to print &amp; cut. DXF omits crop marks (cutter format).
          </>
        ) : (
          <>
            For Silhouette: <b>DXF</b> (free) or <b>SVG</b> (Designer Edition).
            {model.flat ? (
              <> This is the flat die-cut at exact size.</>
            ) : (
              <> This is the <b>unfolded flat sheet</b> — it folds down to your{" "}
              {round(L, 2)}×{round(W, 2)}×{round(H, 2)} {unit} box.</>
            )}<br />
            After import, <b>Select All</b> → the size should read{" "}
            <b>{fmt(fullW, unit)} × {fmt(fullH, unit)}</b>. If it's off by a
            constant %, your cutter rescaled it — set it back to that size.
          </>
        )}
      </p>
    </>
  );

  // Mobile category tabs: id, icon, label, and whether to render (per model).
  const mobileTabs: { id: string; Icon: LucideIcon; label: string; show: boolean }[] = [
    { id: "size", Icon: Ruler, label: "Size", show: true },
    { id: "options", Icon: SlidersHorizontal, label: "Options", show: hasNotches || hasFeatures },
    { id: "face", Icon: Palette, label: "Face", show: !!die.decorations?.length },
    { id: "layers", Icon: Layers, label: "Layers", show: true },
    { id: "3d", Icon: Box, label: "3D", show: show3D },
    // "More" always shows — it carries Reset (and Print & Cut when enabled).
    { id: "more", Icon: MoreHorizontal, label: "More", show: true },
  ].filter((t) => t.show);

  // Title + body for the active mobile sheet.
  const mobileSheetTitle = (id: string): string => {
    switch (id) {
      case "size": return "Size";
      case "options": return "Options";
      case "face": return "Face colours";
      case "layers": return "Layers";
      case "3d": return "3D preview";
      case "more": return "More";
      case "export": return "Export";
      default: return "";
    }
  };
  const mobileSheetBody = (id: string): ReactNode => {
    switch (id) {
      case "size": return (<>{unitsBody()}<div style={{ height: 12 }} />{dimsBody()}</>);
      case "options": return optionsBody();
      case "face": return faceColorsBody();
      case "layers": return layersBody();
      case "3d": return previewBody(240);
      case "more": return (
        <>
          {PRINT_AND_CUT_ENABLED && (<><div className="m-sub">Print &amp; Cut</div>{printCutBody()}</>)}
          <div className={`m-sub${PRINT_AND_CUT_ENABLED ? " mt" : ""}`}>Reset</div>
          <button type="button" className="btn secondary" onClick={resetDesign}>Reset to defaults</button>
        </>
      );
      case "export": return exportBody();
      default: return null;
    }
  };

  return (
    <div className="editor-page">
      <header className="ed-nav">
        <a className="logo" href="/" onClick={(e) => { e.preventDefault(); onNavigate?.("/"); }}>
          <Logo size={20} />
        </a>
        <nav className="nav-links">
          <a href="/" onClick={(e) => { e.preventDefault(); onNavigate?.("/"); }}>Templates</a>
          <a href="/docs" onClick={(e) => { e.preventDefault(); onNavigate?.("/docs"); }}>Docs</a>
        </nav>
      </header>

      {/* TOOLBAR — hoisted out of .main so it spans the full width above the
          canvas; the model title lives here now (not in the rail). */}
      <div className="topbar">
          <span className="model-title">{model.name}</span>
          <span className="tb-div" />
          <div className="dims">
            Flat size:&nbsp;
            <b>{fmt(fullW, unit)}</b> × <b>{fmt(fullH, unit)}</b>
            &nbsp;<span className="muted">(incl. bleed)</span>
          </div>
          <div className="seg tools">
            <button
              className={tool === "select" ? "active" : ""}
              title="Select"
              onClick={() => setTool("select")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M5 3l14 7-6.4 2.2L10.2 20z" />
              </svg>
            </button>
            <button
              className={tool === "pan" ? "active" : ""}
              title="Pan (drag to move)"
              onClick={() => setTool("pan")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 11V6a2 2 0 0 0-4 0" />
                <path d="M14 10V4a2 2 0 0 0-4 0v2" />
                <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
                <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
              </svg>
            </button>
          </div>
          <div className="zoom">
            <button onClick={() => { setAutoFit(false); setZoom((z) => clampZoom(z - 0.1)); }}>−</button>
            <button
              onClick={() => setAutoFit(true)}
              className={autoFit ? "active" : ""}
              title="Fit to screen"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={() => { setAutoFit(false); setZoom((z) => clampZoom(z + 0.1)); }}>+</button>
          </div>
          <div className="legend">
            {VISIBLE_LAYERS.map((k) => (
              <span key={k}>
                <span className="swatch" style={{ background: LAYER_STYLES[k].color }} />
                {LAYER_STYLES[k].label}
              </span>
            ))}
          </div>
          {/* Phone-only ↓ Export button — top-right of the toolbar (opens the
              Export sheet). On desktop the Export card in the inspector covers
              this, so it's hidden there. */}
          {isPhone && (
            <button type="button" className="tb-export" onClick={() => setMobileSheet("export")}>
              <Download size={15} strokeWidth={2.4} /> Export
            </button>
          )}
        </div>

      <div className="app">
        {/* FLOATING INSPECTOR — category cards float over the canvas, top-right,
            each collapsing to a pill. Marked .box-overlay so canvas pan ignores
            clicks on it. The 3D preview is the first card. Desktop/tablet only;
            phones (< 768px) use the bottom tab bar + sheet instead. */}
        {!isPhone && (
        <aside className={`rail box-overlay${railCue.above ? " more-above" : ""}${railCue.below ? " more-below" : ""}`}>
          {/* The controls (no in-rail back-link; the title lives in the toolbar
              and "Templates"/the logo go home). */}
          <div className="rail-scroll" ref={railScrollRef} onScroll={updateRailCue}>
        <button type="button" className="reset-link reset-link-top" onClick={resetDesign}>
          Reset to defaults
        </button>

        {/* 3D "Assembled" preview — first card. Same visibility rule the dock
            used: a real 3D fold, or a non-flat model that gets a placeholder. */}
        {(show3D || !model.flat) && (
          <div className={`group card preview-card${isCardOpen("preview") ? " open" : ""}`}>
            <button type="button" className="card-head" onClick={() => toggleCard("preview")}>
              <span className="caret" />
              <span className="card-lbl">3D preview</span>
              {show3D && (
                <span
                  className="preview-expand"
                  role="button"
                  tabIndex={0}
                  title="Expand to a bigger view"
                  aria-label="Expand 3D view"
                  onClick={(e) => { e.stopPropagation(); setExpanded(true); posthog?.capture("3d_preview_expanded", { template_id: model.id, template_name: model.name }); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setExpanded(true); posthog?.capture("3d_preview_expanded", { template_id: model.id, template_name: model.name }); } }}
                >
                  <Maximize2 size={13} />
                </span>
              )}
            </button>
            <div className="card-body">{previewBody(280)}</div>
          </div>
        )}

        <div className={`group card${isCardOpen("dimensions") ? " open" : ""}`}>
          {cardHead(
            "dimensions",
            `${model.flat ? "Dimensions" : "Box dimensions"} (${unit})`,
            `${round(L, 2)} × ${round(W, 2)} × ${round(H, 2)} ${unit}`,
          )}
          <div className="card-body">
            {unitsBody()}
            <div style={{ height: 12 }} />
            {dimsBody()}
          </div>
        </div>

        {(hasTopNotch || hasBottomNotch) && (
          <div className={`group card${isCardOpen("notch") ? " open" : ""}`}>
            {cardHead("notch", "Thumb notch")}
            <div className="card-body">{notchBody()}</div>
          </div>
        )}

        {(supportsWindow || supportsEuro || supportsThumb || supportsThumbNotch) && (
          <div className={`group card${isCardOpen("features") ? " open" : ""}`}>
            {cardHead("features", "Features")}
            <div className="card-body">{featuresBody()}</div>
          </div>
        )}


        {die.decorations?.length ? (
          <div className={`group card${isCardOpen("facecolors") ? " open" : ""}`}>
            {cardHead("facecolors", "Face colours", `${die.decorations.length} parts`)}
            <div className="card-body">{faceColorsBody()}</div>
          </div>
        ) : null}

        <div className={`group card${isCardOpen("layers") ? " open" : ""}`}>
          {cardHead(
            "layers",
            "Layers",
            `${VISIBLE_LAYERS.filter((k) => show[k]).length + (showDims ? 1 : 0) + (artwork && showArt ? 1 : 0)} visible`,
          )}
          <div className="card-body">{layersBody()}</div>
        </div>

        {PRINT_AND_CUT_ENABLED && (
        <div className={`group card${isCardOpen("printcut") ? " open" : ""}`}>
          {cardHead("printcut", "Print & Cut", artwork ? "artwork" : "no artwork")}
          <div className="card-body">{printCutBody()}</div>
        </div>
        )}

        <div className={`group card${isCardOpen("paperfit") ? " open" : ""}`}>
          {cardHead(
            "paperfit",
            "Paper fit · how many up",
            selImp ? `${selImp.up}-up ${selImp.sheet.name.replace(/\s*\(.*\)/, "")}` : undefined,
          )}
          <div className="card-body">{paperFitBody(236, 250)}</div>
        </div>

        <div className={`group card${isCardOpen("export") ? " open" : ""}`}>
          {cardHead("export", "Export (exact 1:1)", "1:1")}
          <div className="card-body">{exportBody()}</div>
        </div>
          </div>
          <button type="button" className="rail-cue rail-cue-top" aria-label="Scroll up for more controls" onClick={() => nudgeRail(-1)}>
            <span className="cue-chev" />
          </button>
          <button type="button" className="rail-cue rail-cue-bot" aria-label="Scroll down for more controls" onClick={() => nudgeRail(1)}>
            <span className="cue-chev" />
          </button>
        </aside>
        )}

        {/* MOBILE: bottom tab bar + the active category sheet (phones only). */}
        {isPhone && (
          <>
            {/* backdrop — tap to close the open sheet */}
            {mobileSheet && (
              <div className="m-backdrop box-overlay" onClick={() => setMobileSheet(null)} />
            )}
            {/* the active bottom sheet */}
            {mobileSheet && (
              <div className="m-sheet box-overlay" role="dialog" aria-label={mobileSheetTitle(mobileSheet)}>
                <div className="m-grab" />
                <div className="m-sheet-head">
                  <b>{mobileSheetTitle(mobileSheet)}</b>
                  <button type="button" className="m-x" onClick={() => setMobileSheet(null)} aria-label="Close">✕</button>
                </div>
                <div className="m-sheet-body">
                  {mobileSheetBody(mobileSheet)}
                </div>
              </div>
            )}
            {/* the fixed bottom tab bar (categories). Export is a toolbar button,
                not a tab — it's a one-off action, not a category. */}
            <nav className="m-tabbar box-overlay">
              {mobileTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`m-tab${mobileSheet === t.id ? " on" : ""}`}
                  onClick={() => setMobileSheet((cur) => (cur === t.id ? null : t.id))}
                >
                  <span className="m-i"><t.Icon size={22} /></span>
                  <span className="m-lbl">{t.label}</span>
                </button>
              ))}
            </nav>
          </>
        )}

      <main className="main">
        <div
          ref={canvasRef}
          className={`canvas-wrap${tool === "pan" || spaceHeld ? " pan" : ""}${panning ? " panning" : ""}`}
          style={{ position: "relative" }}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onDragOver={PRINT_AND_CUT_ENABLED ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } : undefined}
          onDrop={PRINT_AND_CUT_ENABLED ? (e) => { e.preventDefault(); loadImageFile(e.dataTransfer.files?.[0]); } : undefined}
        >
          <svg
            className="die-svg"
            width={pxW}
            height={pxH}
            viewBox={vb}
            xmlns="http://www.w3.org/2000/svg"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
          >
            <defs>
              {/* Diagonal hatch for glue zones — the standard "apply glue here"
                  shading so flaps read as glue tabs, not just outlines. */}
              <pattern id="glueHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <rect width="6" height="6" fill={LAYER_STYLES.glue.color} fillOpacity="0.18" />
                <line x1="0" y1="0" x2="0" y2="6" stroke={LAYER_STYLES.glue.color} strokeWidth="1.1" />
              </pattern>
              <marker
                id="dimArrow"
                markerWidth="10"
                markerHeight="10"
                refX="7"
                refY="3.5"
                orient="auto-start-reverse"
                markerUnits="userSpaceOnUse"
              >
                <path d="M0,0 L7,3.5 L0,7 Z" fill="#1f3bb3" />
              </marker>
              {paperHoles.length > 0 && (
                <mask
                  id="paperHoles"
                  maskUnits="userSpaceOnUse"
                  x={-die.bleedPt - padBase}
                  y={-die.bleedPt - padBase}
                  width={vbW}
                  height={vbH}
                >
                  <rect x={-die.bleedPt - padBase} y={-die.bleedPt - padBase} width={vbW} height={vbH} fill="#fff" />
                  {paperHoles.map((pl, i) => (
                    <path key={i} d={toSvgPath(pl)} fill="#000" />
                  ))}
                </mask>
              )}
              {showArt && artImage && (
                <clipPath id="artClip" clipPathUnits="userSpaceOnUse">
                  {(die.pieces ?? die.paths.cut.slice(0, 1)).map((pl, i) => (
                    <path key={i} d={toSvgPath(pl)} />
                  ))}
                </clipPath>
              )}
            </defs>
            {/* White "paper" backing shaped like cut + bleed margin. We DILATE
                the cut path itself with a thick round-join stroke rather than
                stroking the contour-offset polyline: the offset polyline
                self-intersects in concave valleys (between flaps, around the
                notch) and its green line crossed the blue cut. Round-join
                stroke dilation is concave-safe — the browser draws the outer
                margin cleanly. The bleed line is now simply the paper's green
                border (toggled by the "Bleed" legend item).
                Only the OUTER outline of each PIECE gets the paper + bleed
                border (die.pieces for multi-piece sets like the drawer box;
                otherwise the first cut polyline). Interior closed cuts (hang
                hole, window, euro slot) are PUNCHED OUT of the paper via the
                #paperHoles mask — the canvas shows through, like the real cut
                sheet — and their blue cut lines are drawn below as the rim. */}
            <g mask={paperHoles.length > 0 ? "url(#paperHoles)" : undefined}>
            {paperPieces.map((pl, i) => {
              const d = toSvgPath(pl);
              const bleedSW = 2 * die.bleedPt;        // physical margin (scales with zoom)
              const ring = 1.4 / zoom;                 // ~1.4px green border, zoom-independent
              const showBleed = show.bleed && die.bleedPt > 0;
              const whiteSW = showBleed ? Math.max(0, bleedSW - 2 * ring) : bleedSW;
              return (
                <g key={`paper-${i}`}>
                  {showBleed && (
                    <path
                      d={d}
                      fill="none"
                      stroke={LAYER_STYLES.bleed.color}
                      strokeWidth={bleedSW}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  )}
                  <path
                    d={d}
                    fill="#ffffff"
                    stroke="#ffffff"
                    strokeWidth={whiteSW}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
            </g>
            {/* Print-&-Cut artwork: the dropped image as the PRINT layer, UNDER
                the cut/score lines, clipped to the silhouette and masked by the
                same holes as the paper (apertures show through the art too). */}
            {showArt && artImage && (
              <g clipPath="url(#artClip)" mask={paperHoles.length > 0 ? "url(#paperHoles)" : undefined}>
                <image
                  href={artImage.dataUrl}
                  x={artImage.xPt}
                  y={artImage.yPt}
                  width={artImage.wPt}
                  height={artImage.hPt}
                  preserveAspectRatio="none"
                  transform={artRot ? `rotate(${artRot} ${artImage.xPt + artImage.wPt / 2} ${artImage.yPt + artImage.hPt / 2})` : undefined}
                  style={{ cursor: tool === "select" && !spaceHeld ? "move" : undefined }}
                  onPointerDown={tool === "select" ? (e) => onArtPointerDown(e, "move") : undefined}
                  onPointerMove={onArtPointerMove}
                  onPointerUp={onArtPointerUp}
                />
              </g>
            )}
            {/* Printable DECORATIONS (the animal face) — filled / stroked colour
                shapes on the paper, UNDER the cut/score lines. Live colours from
                the Face-colours card. Masked by the same holes as the paper. */}
            {decoratedDie.decorations?.length ? (
              <g mask={paperHoles.length > 0 ? "url(#paperHoles)" : undefined}>
                {decoratedDie.decorations.map((deco) =>
                  deco.shapes.map((pl, j) =>
                    deco.stroke ? (
                      <path
                        key={`${deco.id}-${j}`}
                        d={toSvgPath(pl)}
                        fill="none"
                        stroke={deco.color}
                        strokeWidth={deco.strokeWidth ?? 1.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : (
                      <path key={`${deco.id}-${j}`} d={toSvgPath(pl)} fill={deco.color} stroke="none" />
                    ),
                  ),
                )}
              </g>
            ) : null}
            {VISIBLE_LAYERS.map((layer) =>
              layer === "bleed"
                ? null /* bleed is drawn as the paper border above */
                : show[layer]
                ? die.paths[layer].map((pl, i) => {
                    // Pixel-consistent strokes + dashes via vector-effect.
                    // strokeWidth and strokeDasharray are then in screen px regardless of
                    // the SVG's zoom/scale — so a tiny dieline (L=1in) and a huge one
                    // (L=12in) render with identical visual line weight and dash size.
                    // Without this, the dashes were 8pt = ~1% of a big box's width
                    // (looked invisible) but ~11% of a small box (looked massive).
                    const dashPx = layer === "crease" ? "8 5" : undefined;
                    return (
                      <path
                        key={`${layer}-${i}`}
                        d={toSvgPath(pl)}
                        fill={layer === "glue" ? "url(#glueHatch)" : "none"}
                        stroke={LAYER_STYLES[layer].color}
                        strokeWidth={1.6}
                        strokeDasharray={dashPx}
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })
                : null
            )}
            {/* Artwork selection box + corner resize handles (above the lines so
                they stay grabbable). Handle size is constant in screen px. */}
            {showArt && artImage && tool === "select" && (() => {
              const hs = 5 / zoom; // handle half-extent ≈ 5px at any zoom
              const cx = artImage.xPt + artImage.wPt / 2;
              const cy = artImage.yPt + artImage.hPt / 2;
              const rotArm = 22 / zoom; // distance of the rotate knob above the top edge
              const corners: { m: "nw" | "ne" | "sw" | "se"; cx: number; cy: number }[] = [
                { m: "nw", cx: artImage.xPt, cy: artImage.yPt },
                { m: "ne", cx: artImage.xPt + artImage.wPt, cy: artImage.yPt },
                { m: "sw", cx: artImage.xPt, cy: artImage.yPt + artImage.hPt },
                { m: "se", cx: artImage.xPt + artImage.wPt, cy: artImage.yPt + artImage.hPt },
              ];
              return (
                <g transform={artRot ? `rotate(${artRot} ${cx} ${cy})` : undefined}>
                  <rect
                    x={artImage.xPt} y={artImage.yPt} width={artImage.wPt} height={artImage.hPt}
                    fill="none" stroke="#9333ea" strokeWidth={1.2} strokeDasharray="5 4"
                    vectorEffect="non-scaling-stroke" pointerEvents="none"
                  />
                  {/* rotate knob: arm + circle above the top-centre */}
                  <line x1={cx} y1={artImage.yPt} x2={cx} y2={artImage.yPt - rotArm}
                    stroke="#9333ea" strokeWidth={1.2} vectorEffect="non-scaling-stroke" pointerEvents="none" />
                  <circle
                    cx={cx} cy={artImage.yPt - rotArm} r={hs * 1.2}
                    fill="#9333ea" stroke="#fff" strokeWidth={1.2} vectorEffect="non-scaling-stroke"
                    style={{ cursor: "grab" }}
                    onPointerDown={(e) => onArtPointerDown(e, "rotate")}
                    onPointerMove={onArtPointerMove}
                    onPointerUp={onArtPointerUp}
                  />
                  {corners.map((c) => (
                    <rect
                      key={c.m} x={c.cx - hs} y={c.cy - hs} width={hs * 2} height={hs * 2}
                      fill="#fff" stroke="#9333ea" strokeWidth={1.2} vectorEffect="non-scaling-stroke"
                      style={{ cursor: c.m === "nw" || c.m === "se" ? "nwse-resize" : "nesw-resize" }}
                      onPointerDown={(e) => onArtPointerDown(e, c.m)}
                      onPointerMove={onArtPointerMove}
                      onPointerUp={onArtPointerUp}
                    />
                  ))}
                </g>
              );
            })()}
            {showDims &&
              die.dims.map((dm, i) => {
                const text = labelText[dm.key] ?? dm.key;
                const fs = 12 / zoom;
                const tw = text.length * fs * 0.6;
                const th = fs * 1.4;
                // Place dimension lines at the EDGES (off the artwork): horizontal
                // (L/W) just below the reference region, vertical (H) to its
                // right, with thin witness lines from the feature to the dim line.
                const yEdge = dimRef.bottom + die.bleedPt + 22;
                const xEdge = dimRef.right + die.bleedPt + 22;
                let ax1 = dm.x1, ay1 = dm.y1, ax2 = dm.x2, ay2 = dm.y2;
                let witness: [number, number, number, number][];
                if (dm.vertical) {
                  ax1 = ax2 = xEdge;
                  witness = [[dm.x1, dm.y1, xEdge, dm.y1], [dm.x1, dm.y2, xEdge, dm.y2]];
                } else {
                  ay1 = ay2 = yEdge;
                  witness = [[dm.x1, dm.y1, dm.x1, yEdge], [dm.x2, dm.y2, dm.x2, yEdge]];
                }
                const mx = (ax1 + ax2) / 2;
                const my = (ay1 + ay2) / 2;
                return (
                  <g key={i}>
                    {witness?.map((w, j) => (
                      <line key={j} x1={w[0]} y1={w[1]} x2={w[2]} y2={w[3]} stroke="#9fb0e8" strokeWidth={0.6 / zoom} />
                    ))}
                    <line
                      x1={ax1}
                      y1={ay1}
                      x2={ax2}
                      y2={ay2}
                      stroke="#1f3bb3"
                      strokeWidth={1 / zoom}
                      markerStart="url(#dimArrow)"
                      markerEnd="url(#dimArrow)"
                    />
                    <g transform={dm.vertical ? `rotate(-90 ${mx} ${my})` : undefined}>
                      <rect
                        x={mx - tw / 2}
                        y={my - th / 2}
                        width={tw}
                        height={th}
                        fill="#fff"
                        rx={2 / zoom}
                      />
                      <text
                        x={mx}
                        y={my}
                        fontSize={fs}
                        fill="#1f3bb3"
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {text}
                      </text>
                    </g>
                  </g>
                );
              })}
          </svg>
        </div>
      </main>
      </div>

      {expanded && show3D && (
        <div className="box3d-overlay" onClick={() => setExpanded(false)}>
          <div className="box3d-modal" onClick={(e) => e.stopPropagation()}>
            <button className="box3d-close" onClick={() => setExpanded(false)} aria-label="Close bigger view">
              <X size={18} />
            </button>
            <div className="b3d-title">{model.name}</div>
            <div className="b3d-sub">
              Drag to rotate · scroll to zoom · {round(L, 2)} × {round(W, 2)} × {round(H, 2)} {unit}
            </div>
            <Suspense fallback={<div style={{ width: 520, height: 520, display: "flex", alignItems: "center", justifyContent: "center", color: "#9aa1ad", fontSize: 13 }}>Loading 3D…</div>}>
              <Box3D
                Lpt={toPt(L, unit)} Wpt={toPt(W, unit)} Hpt={toPt(H, unit)}
                fold={fold} model={model.id} features={features} buildParams={box3dParams}
                artwork={showArt ? artImage : undefined} decorColors={decorColors}
                size={Math.max(320, Math.min(580, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.72)))}
              />
            </Suspense>
            <div className="box-fold">
              <span className="muted">Closed</span>
              <input type="range" min={0} max={1} step={0.01} value={fold} onChange={(e) => setFold(parseFloat(e.target.value))} />
              <span className="muted">Open</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// Overlay: draws the die placed on a chosen sheet, to scale, so the user can
// see the actual fit (and whether it must be rotated).
function SheetFitPreview({ die, fit, imp, unit, maxW = 250, maxH = 320 }: { die: Dieline; fit: FitResult; imp: Imposition; unit: Unit; maxW?: number; maxH?: number }) {
  const sw = fit.sheet.wPt;
  const sh = fit.sheet.hPt;
  const dw = die.widthPt + 2 * die.bleedPt;
  const dh = die.heightPt + 2 * die.bleedPt;

  // die center in its own coords (coords span -bleed..bbox+bleed)
  const dcx = die.widthPt / 2;
  const dcy = die.heightPt / 2;

  // on-screen size, keep sheet aspect
  const k = Math.min(maxW / sw, maxH / sh);
  const W = sw * k;
  const H = sh * k;
  const swk = Math.max(sw, sh) / 320; // stroke scale

  const layers: { key: keyof Dieline["paths"]; }[] = [
    { key: "bleed" },
    { key: "crease" },
    { key: "cut" },
  ];

  // When at least one copy fits, draw the WHOLE imposition grid: each placement
  // is the real die artwork, centred in its cell and rotated to the chosen
  // orientation. When nothing fits, fall back to a single centred (red) copy so
  // the overflow is visible.
  const fits = imp.up > 0;
  const cells: { cx: number; cy: number }[] = fits
    ? imp.placements.map((p) => ({ cx: p.xPt + p.wPt / 2, cy: p.yPt + p.hPt / 2 }))
    : [{ cx: sw / 2, cy: sh / 2 }];
  const rotate = fits ? imp.rotated : Math.min(sw - dh, sh - dw) > Math.min(sw - dw, sh - dh);

  return (
    <div>
      <div className="sheet-overlay-head">
        <b>{fit.sheet.name}</b>{" "}
        <span className="muted">
          {fmt(sw, unit)} × {fmt(sh, unit)}
        </span>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${sw} ${sh}`} style={{ display: "block" }}>
        <rect x={0} y={0} width={sw} height={sh} fill="#fff" stroke="#9aa1ad" strokeWidth={swk} />
        {cells.map((cell, ci) => (
          <g key={ci} transform={`translate(${cell.cx} ${cell.cy}) rotate(${rotate ? 90 : 0}) translate(${-dcx} ${-dcy})`}>
            {layers.map(({ key }) =>
              die.paths[key].map((pl, i) => (
                <path
                  key={`${key}-${i}`}
                  d={toSvgPath(pl)}
                  fill={key === "cut" ? (fits ? "rgba(31,59,179,0.05)" : "rgba(179,38,30,0.08)") : "none"}
                  stroke={key === "cut" && !fits ? "#b3261e" : LAYER_STYLES[key].color}
                  strokeWidth={LAYER_STYLES[key].width * swk}
                  strokeDasharray={LAYER_STYLES[key].dash?.map((d) => d * swk).join(" ")}
                />
              ))
            )}
          </g>
        ))}
      </svg>
      <div className="sheet-overlay-foot">
        {fits ? (
          <span className="ok">
            ✓ <b>{imp.up}-up</b> · {imp.cols}×{imp.rows}{imp.rotated ? " (rotated)" : ""} · {Math.round(imp.usedFraction * 100)}% sheet used
          </span>
        ) : (
          <span className="no">✗ Doesn't fit — too big by {fmt(-fit.marginPt, unit)}</span>
        )}
      </div>
    </div>
  );
}
