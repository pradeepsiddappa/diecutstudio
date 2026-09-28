// Gallery card thumbnail — two states, cross-faded on card hover:
//   default (.iso-closed) → the REAL flat dieline (built from the model
//     registry, so it matches the editor 1:1 and shows the actual cut file)
//   hover  (.iso-open)    → a 3D rendered SNAPSHOT of the folded box,
//     produced by snapshotBox() using three.js (one shared WebGL context,
//     one render per model, cached as PNG dataURL).
//
// The snapshot replaces the old stylised iso-open SVG so each model's
// thumbnail shows its actual folded shape (RTE doesn't have a thumb notch,
// STE does, etc — controlled by `hasFrontNotch` in the registry).
import { useEffect, useMemo, useState } from "react";
import { LAYER_STYLES, Dieline } from "../../core/types";
import { toSvgPath } from "../../core/geometry";
import { inToPt } from "../../core/units";
import { getModel, ModelId } from "../../core/models/registry";
import { usesFoldEngine } from "../../core/fold/specs";
import { snapshotBox } from "./boxSnapshot";

interface Props {
  L: number; W: number; H: number;
  modelId?: ModelId;
  /** Variant build params (e.g. {pennantShape:"swallowtail"}) so each gallery
   *  card's thumbnail renders its own shape. */
  buildParams?: Record<string, unknown>;
}

export function IsoBoxThumb({ L, W, H, modelId = "tuck-end", buildParams }: Props) {
  const bpKey = JSON.stringify(buildParams ?? null);
  const flat = useMemo(() => flatThumb(L, W, H, modelId, buildParams), [L, W, H, modelId, bpKey]);
  const [snapUrl, setSnapUrl] = useState<string | null>(null);
  // Per-INSTANCE 3D gate: a Fold-Engine model only folds when this variant's
  // dieline has creases (so the necklace card's flat style shows its flat cut,
  // the fold-over style gets the 3D snapshot). Bespoke renderers always show.
  const creaseCount = useMemo(
    () => getModel(modelId).build({ L: inToPt(L), W: inToPt(W), H: inToPt(H), thickness: inToPt(0.018), bleed: 0, ...buildParams }).paths.crease.length,
    [L, W, H, modelId, bpKey],
  );

  // Defer the 3D snapshot to after first paint so the gallery doesn't
  // block waiting on WebGL during initial render. Each model's snapshot is
  // cached, so subsequent IsoBoxThumb mounts of the same model are instant.
  useEffect(() => {
    let cancelled = false;
    const id = window.requestIdleCallback
      ? window.requestIdleCallback(run)
      : window.setTimeout(run, 60);
    function run() {
      if (cancelled) return;
      const m = getModel(modelId);
      // Only render the folded-box snapshot for models whose 3D fold is real
      // for THIS variant (engine models need creases). Others show their
      // accurate flat dieline only — never a faked box / flat plane.
      if (!m.has3DPreview) return;
      if (usesFoldEngine(modelId) && creaseCount === 0) return;
      try {
        const url = snapshotBox({
          modelId,
          L, W, H,
          size: 280,
          hasFrontNotch: m.hasFrontNotch,
          buildParams,
        });
        if (!cancelled) setSnapUrl(url);
      } catch (e) {
        // WebGL unavailable or scene build failed — fall back to flat thumb only
        // eslint-disable-next-line no-console
        console.warn("box snapshot failed for", modelId, e);
      }
    }
    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(id as number);
      else window.clearTimeout(id as number);
    };
  }, [modelId, L, W, H, bpKey, creaseCount]);

  // When a 3D snapshot is ready, the folded box becomes the DEFAULT view (it's
  // instantly recognisable as a box); hovering the card reveals the flat cut
  // file. `has-3d` on the wrap flips the crossfade direction in CSS.
  return (
    <div className={`iso-thumb-wrap${snapUrl ? " has-3d" : ""}`}>
      <span className="iso-svg iso-closed" dangerouslySetInnerHTML={{ __html: flat }} />
      {snapUrl ? (
        <img className="iso-svg iso-open" src={snapUrl} alt="" />
      ) : null}
    </div>
  );
}

// ---- Flat dieline thumbnail using the REAL model from the registry ----
// L, W, H treated as inches; converted to points for the geometry engine.
// Rendered with blue cut + red dashed crease — same colors as the editor and
// the hero compare slider, so the visual language is consistent end-to-end.
function flatThumb(L: number, W: number, H: number, modelId: ModelId, buildParams?: Record<string, unknown>): string {
  const die: Dieline = getModel(modelId).build({
    L: inToPt(L),
    W: inToPt(W),
    H: inToPt(H),
    thickness: inToPt(0.018),
    bleed: 0,  // skip the bleed margin in the thumbnail; it would just be empty space
    ...buildParams,
  });
  const pad = 12;                                       // viewBox padding (in points)
  const vbW = die.widthPt + 2 * pad;
  const vbH = die.heightPt + 2 * pad;
  const maxW = 280, maxH = 180;
  const s = Math.min(maxW / vbW, maxH / vbH);
  // Pixel-consistent stroke: pick a target on-screen line width (in CSS px),
  // then convert back to viewBox units via the scale `s`. Identical line
  // weight across small (RTE ~3 in flat) and large (large tuck ~15 in flat)
  // dielines.
  const TARGET_PX = 1.4;
  const sw = TARGET_PX / s;
  const dash = `${(sw * 3).toFixed(2)} ${(sw * 2).toFixed(2)}`;

  // Combine ALL cut polylines into one path with fill-rule:evenodd so interior
  // cuts (lock slots etc.) render as HOLES rather than filled-white blobs that
  // would disappear into the silhouette.
  const combinedCut = die.paths.cut.map(toSvgPath).join(" ");
  const cutPath = `<path d="${combinedCut}" fill="#ffffff" fill-rule="evenodd" stroke="${LAYER_STYLES.cut.color}" stroke-width="${sw.toFixed(2)}" stroke-linejoin="round"/>`;
  const creasePaths = die.paths.crease.map((pl) =>
    `<path d="${toSvgPath(pl)}" fill="none" stroke="${LAYER_STYLES.crease.color}" stroke-width="${sw.toFixed(2)}" stroke-dasharray="${dash}" stroke-linecap="round"/>`
  ).join("");

  // Printable DECORATIONS (e.g. an animal box's face) — filled/stroked colour
  // shapes on the white paper, under the crease lines.
  const decorPaths = (die.decorations ?? []).map((d) =>
    d.shapes.map((pl) => d.stroke
      ? `<path d="${toSvgPath(pl)}" fill="none" stroke="${d.color}" stroke-width="${(sw * 1.5).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<path d="${toSvgPath(pl)}" fill="${d.color}" stroke="none"/>`
    ).join("")
  ).join("");

  // Cut first (filled white so the silhouette shows against the pastel card
  // background, interior holes punch through); face decorations; crease on top.
  return `<svg width="${(vbW * s).toFixed(0)}" height="${(vbH * s).toFixed(0)}" viewBox="${-pad} ${-pad} ${vbW.toFixed(2)} ${vbH.toFixed(2)}" xmlns="http://www.w3.org/2000/svg">${cutPath}${decorPaths}${creasePaths}</svg>`;
}
