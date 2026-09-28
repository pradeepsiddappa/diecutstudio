// Export a Dieline to a standalone SVG at exact physical size.
//
// width/height ALWAYS carry real units (in/mm). The viewBox user-units are set
// to `dpi` per inch. Default dpi = 72, which matches Silhouette Studio's import
// assumption, so the file lands 1:1 in Silhouette EVEN IF it ignores the unit
// string. (Illustrator/Inkscape/Cricut honor the explicit units regardless.)
// Use dpi: 96 for the Inkscape/CSS convention if a tool needs it.

import { Dieline, LAYER_STYLES, LayerKind, Polyline } from "../core/types";
import { toSvgPath } from "../core/geometry";
import { Unit, fromPt } from "../core/units";

/** Print-&-Cut artwork: a raster image embedded as the PRINT layer (below the
 *  cut/score lines), placed at a rect in dieline POINTS. */
export interface ArtworkImage {
  dataUrl: string; // base64 data URI (PNG/JPG)
  xPt: number; yPt: number; wPt: number; hPt: number;
  rotDeg?: number; // rotation about the rect centre, degrees clockwise
}

export interface SvgOptions {
  unit?: Unit; // unit shown on width/height (default in)
  dpi?: number; // user-units per inch in the viewBox (default 72 = Silhouette-safe)
  includeGlue?: boolean;
  image?: ArtworkImage; // optional drop-in artwork, clipped to the cut silhouette
  /** Printable decorations (filled/stroked colour shapes). Default true; a
   *  cut-only file sets false. */
  includeDecorations?: boolean;
}

export function dielineToSvg(die: Dieline, opts: SvgOptions = {}): string {
  const { unit = "in", dpi = 72, includeGlue = true, image, includeDecorations = true } = opts;
  const PX_PER_PT = dpi / 72; // points -> viewBox user units
  const b = die.bleedPt;
  const fullWpt = die.widthPt + 2 * b;
  const fullHpt = die.heightPt + 2 * b;

  // physical size for width/height (authoritative)
  const wReal = fromPt(fullWpt, unit);
  const hReal = fromPt(fullHpt, unit);
  // viewBox user space; a group translate shifts the bleed box to 0,0
  const vbW = fullWpt * PX_PER_PT;
  const vbH = fullHpt * PX_PER_PT;

  const px = (n: number) => Number((n * PX_PER_PT).toFixed(4));

  // No bleed CONTOUR is emitted — the bleed margin is carried by the canvas
  // size (width/height + viewBox include the bleed margin). Only trim + fold
  // (+ optional glue hint) are real lines in a die-cut file.
  const order: LayerKind[] = ["glue", "crease", "cut"];
  const groups = order
    .filter((l) => (l === "glue" ? includeGlue : true))
    .map((layer) => {
      const s = LAYER_STYLES[layer];
      const dash = s.dash ? ` stroke-dasharray="${s.dash.map(px).join(" ")}"` : "";
      const paths = die.paths[layer]
        .map((pl) => `      <path d="${pxPath(pl, px)}" />`)
        .join("\n");
      return (
        `    <g id="${layer}" fill="none" stroke="${s.color}" ` +
        `stroke-width="${px(s.width)}"${dash}>\n${paths}\n    </g>`
      );
    })
    .join("\n");

  // Print-&-Cut artwork: an <image> UNDER the cut/score lines, clipped to the
  // cut silhouette so it shows only inside the piece (the cut trims overflow on
  // the machine, but clipping keeps the file clean). curve-aware path for the
  // clip so rounded/scalloped silhouettes clip exactly.
  let defs = "";
  let imageEl = "";
  if (image) {
    const silhouette = die.pieces ?? die.paths.cut.slice(0, 1);
    const clip = silhouette.map((pl) => pxPath(pl, px)).join(" ");
    defs = `\n    <clipPath id="art-clip" clipPathUnits="userSpaceOnUse">\n      <path d="${clip}" />\n    </clipPath>`;
    // Clip lives on a fixed-coords GROUP; the image rotates INSIDE it (about its
    // own centre) so the silhouette clip stays put while the artwork turns.
    const cx = px(image.xPt + image.wPt / 2), cy = px(image.yPt + image.hPt / 2);
    const rot = image.rotDeg ? ` transform="rotate(${image.rotDeg} ${cx} ${cy})"` : "";
    imageEl =
      `\n    <g clip-path="url(#art-clip)">` +
      `\n      <image preserveAspectRatio="none"${rot}\n` +
      `        x="${px(image.xPt)}" y="${px(image.yPt)}" width="${px(image.wPt)}" height="${px(image.hPt)}"\n` +
      `        xlink:href="${image.dataUrl}" href="${image.dataUrl}" />` +
      `\n    </g>`;
  }

  // Printable DECORATIONS (e.g. an animal box's face) — filled/stroked colour
  // shapes UNDER the cut/score lines. Curve-aware (rounded ears etc.).
  const decorGroups =
    includeDecorations && die.decorations?.length
      ? die.decorations
          .map((d) => {
            const paths = d.shapes.map((pl) => `      <path d="${pxPath(pl, px)}" />`).join("\n");
            const attrs = d.stroke
              ? `fill="none" stroke="${d.color}" stroke-width="${px(d.strokeWidth ?? 1.2)}" stroke-linecap="round" stroke-linejoin="round"`
              : `fill="${d.color}" stroke="none"`;
            return `    <g id="decor-${d.id}" ${attrs}>\n${paths}\n    </g>`;
          })
          .join("\n") + "\n"
      : "";

  // Non-cutting print marks (crop/trim marks on an imposed sheet) — thin + dark.
  const marksGroup = die.marks?.length
    ? `\n    <g id="marks" fill="none" stroke="#222222" stroke-width="${px(0.5)}">\n` +
      die.marks
        .map((pl) => `      <path d="${pxPath(pl, px)}" />`)
        .join("\n") +
      `\n    </g>`
    : "";

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1"\n` +
    `     width="${round(wReal, unit)}${unit}" height="${round(hReal, unit)}${unit}"\n` +
    `     viewBox="0 0 ${round(vbW, "in", 3)} ${round(vbH, "in", 3)}">\n` +
    `  <g transform="translate(${px(b)} ${px(b)})">${defs}${imageEl}\n` +
    `${decorGroups}${groups}${marksGroup}\n` +
    `  </g>\n` +
    `</svg>\n`
  );
}

// A polyline → SVG path "d" in px units, honoring Q-bezier curves (so a
// rounded/scalloped silhouette clips exactly, not as a polygon).
function pxPath(pl: Polyline, px: (n: number) => number): string {
  let d = "";
  pl.pts.forEach((p, i) => {
    if (i === 0) { d += `M ${px(p[0])} ${px(p[1])}`; return; }
    const c = pl.curves?.[i - 1];
    d += c ? ` Q ${px(c[0])} ${px(c[1])} ${px(p[0])} ${px(p[1])}` : ` L ${px(p[0])} ${px(p[1])}`;
  });
  if (pl.closed) d += " Z";
  return d;
}

function round(v: number, _u: Unit, dp = 4) {
  const f = Math.pow(10, dp);
  return Math.round(v * f) / f;
}
