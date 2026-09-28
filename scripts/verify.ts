// Build the die + all exports with the real production code; verify exact size.
import { writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { buildTuckEnd, defaultParams } from "../src/core/models/tuckEnd";
import { dielineToPdf } from "../src/export/pdf";
import { dielineToSvg } from "../src/export/svg";
import { dielineToDxf } from "../src/export/dxf";
import { inToPt, fromPt } from "../src/core/units";

const die = buildTuckEnd({
  ...defaultParams(inToPt(4.7244), inToPt(2.3622), inToPt(6.2992)),
  bleed: inToPt(0.125),
});

const expW = fromPt(die.widthPt + 2 * die.bleedPt, "in");
const expH = fromPt(die.heightPt + 2 * die.bleedPt, "in");
console.log("Expected flat size:", expW.toFixed(4), "x", expH.toFixed(4), "in");
console.log("                   ", (expW * 25.4).toFixed(2), "x", (expH * 25.4).toFixed(2), "mm\n");

// PDF
const pdf = await dielineToPdf(die);
writeFileSync("/tmp/diecut.pdf", pdf);
const loaded = await PDFDocument.load(pdf);
const { width, height } = loaded.getPage(0).getSize();
console.log("PDF page:", (width / 72).toFixed(4), "x", (height / 72).toFixed(4), "in");

// SVG
const svg = dielineToSvg(die, { unit: "in" });
writeFileSync("/tmp/diecut.svg", svg);
const sw = /width="([\d.]+)in"/.exec(svg)![1];
const sh = /height="([\d.]+)in"/.exec(svg)![1];
console.log("SVG  size:", sw, "x", sh, "in");

// DXF — find coordinate extents in mm
const dxf = dielineToDxf(die, { includeBleed: true });
writeFileSync("/tmp/diecut.dxf", dxf);
const lines = dxf.split(/\r?\n/);
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (let i = 0; i < lines.length - 1; i++) {
  if (lines[i] === "10") { const v = +lines[i + 1]; minX = Math.min(minX, v); maxX = Math.max(maxX, v); }
  if (lines[i] === "20") { const v = +lines[i + 1]; minY = Math.min(minY, v); maxY = Math.max(maxY, v); }
}
console.log("DXF  bbox:", (maxX - minX).toFixed(2), "x", (maxY - minY).toFixed(2), "mm",
  "  ->", ((maxX - minX) / 25.4).toFixed(4), "x", ((maxY - minY) / 25.4).toFixed(4), "in");

console.log("\nFiles: /tmp/diecut.pdf  /tmp/diecut.svg  /tmp/diecut.dxf");
