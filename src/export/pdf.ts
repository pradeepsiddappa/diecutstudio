// Export a Dieline to a print-ready PDF at exact 1:1 physical scale.
// pdf-lib works in points natively, so the page and every path are exact.

import { PDFDocument, rgb, degrees } from "pdf-lib";
import { Dieline, LAYER_STYLES, LayerKind } from "../core/types";
import { toSvgPath } from "../core/geometry";
import type { ArtworkImage } from "./svg";

const hexToRgb = (hex: string) => {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

// base64 data URL → bytes (atob is available in browsers and Node 18+).
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export interface PdfOptions {
  includeGlue?: boolean;
  image?: ArtworkImage; // optional Print-&-Cut artwork (the PRINT layer)
  includeLines?: boolean; // draw cut/crease/glue strokes (default true).
  // false → an art-only PRINT file (Print-&-Cut: the cut/score lines live in a
  // separate cut file, so they aren't printed onto the finished piece).
  includeDecorations?: boolean; // filled/stroked colour shapes (default true)
}

export async function dielineToPdf(die: Dieline, opts: PdfOptions = {}): Promise<Uint8Array> {
  const { includeGlue = true, image, includeLines = true, includeDecorations = true } = opts;
  const b = die.bleedPt;

  // Page = silhouette + bleed margin on all sides. Exact physical size.
  const pageW = die.widthPt + 2 * b;
  const pageH = die.heightPt + 2 * b;

  const doc = await PDFDocument.create();
  doc.setTitle("Die Cut Studio dieline");
  const page = doc.addPage([pageW, pageH]);

  // The geometry uses a top-left origin, y-down. pdf-lib's drawSvgPath renders
  // SVG-style paths and flips y internally: a path point (px,py) lands at
  // device (x+px, y-py). With x=b and y=pageH-b the silhouette (0..bbox) sits
  // inside the bleed margin, and the bleed rect (which spans -b..bbox+b) fills
  // the whole page. Same transform works for every layer.
  const originX = b;
  const originY = pageH - b;

  // Print-&-Cut artwork FIRST (the print layer, under the lines). pdf-lib's
  // y is bottom-up: the image's bottom-left = top-left point − its height.
  if (image) {
    const isPng = image.dataUrl.startsWith("data:image/png");
    const bytes = dataUrlToBytes(image.dataUrl);
    const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const w = image.wPt, h = image.hPt;
    const deg = image.rotDeg ?? 0;
    // pdf-lib rotates an image about its lower-left placement point. To pivot
    // about the rect CENTRE instead, solve for the placement point so the centre
    // lands at (cx,cy). PDF y is up + flipped vs the SVG preview's y-down, so a
    // clockwise SVG rotation of `deg` is degrees(-deg) here.
    const cx = originX + image.xPt + w / 2;
    const cy = originY - image.yPt - h / 2;
    const pa = (-deg * Math.PI) / 180;
    const rx = (w / 2) * Math.cos(pa) - (h / 2) * Math.sin(pa);
    const ry = (w / 2) * Math.sin(pa) + (h / 2) * Math.cos(pa);
    page.drawImage(img, { x: cx - rx, y: cy - ry, width: w, height: h, rotate: degrees(-deg) });
  }

  // Printable DECORATIONS (e.g. an animal box's face) — filled/stroked colour
  // shapes UNDER the cut/score lines. Independent of includeLines (a print-only
  // file still wants the decorations).
  if (includeDecorations && die.decorations) {
    for (const d of die.decorations) {
      for (const pl of d.shapes) {
        page.drawSvgPath(
          toSvgPath(pl),
          d.stroke
            ? { x: originX, y: originY, borderColor: hexToRgb(d.color), borderWidth: d.strokeWidth ?? 1.2 }
            : { x: originX, y: originY, color: hexToRgb(d.color), borderWidth: 0 },
        );
      }
    }
  }

  // Draw order: glue hint, crease, cut (front). The bleed margin is carried by
  // the page size (silhouette + bleed on all sides); we don't draw a bleed
  // CONTOUR — in a die-cut file the only real cut is the trim line, and the
  // contour offset self-intersects in concave areas anyway.
  const order: LayerKind[] = includeLines ? ["glue", "crease", "cut"] : [];
  for (const layer of order) {
    if (layer === "glue" && !includeGlue) continue;
    const style = LAYER_STYLES[layer];
    for (const pl of die.paths[layer]) {
      page.drawSvgPath(toSvgPath(pl), {
        x: originX,
        y: originY,
        borderColor: hexToRgb(style.color),
        borderWidth: style.width,
        borderDashArray: style.dash,
      });
    }
  }

  // Non-cutting print marks (crop/trim marks on an imposed sheet) — thin + dark.
  if (die.marks && includeLines) {
    for (const pl of die.marks) {
      page.drawSvgPath(toSvgPath(pl), {
        x: originX,
        y: originY,
        borderColor: hexToRgb("#222222"),
        borderWidth: 0.5,
      });
    }
  }

  return doc.save();
}
