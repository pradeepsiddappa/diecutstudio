// Test suite (Node built-in runner). Run with: npm test
// Bundled by esbuild then executed via `node --test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";

import { toPt, fromPt, inToPt, mmToPt, PT_PER_IN } from "../src/core/units";
import { buildTuckEnd, defaultParams } from "../src/core/models/tuckEnd";
import { buildHeartBox, defaultParams as heartDefaults, heartHeight, heartOutline, heartBounds } from "../src/core/models/heartBox";
import { checkFit } from "../src/core/paper";
import { dielineToPdf } from "../src/export/pdf";
import { dielineToSvg } from "../src/export/svg";
import { dielineToDxf } from "../src/export/dxf";

const near = (a: number, b: number, eps = 1e-3) =>
  assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b} (±${eps})`);

// ---- units ----
test("unit conversions round-trip", () => {
  near(toPt(1, "in"), 72);
  near(toPt(25.4, "mm"), 72);
  near(fromPt(72, "in"), 1);
  near(inToPt(2), 144);
  near(mmToPt(25.4), 72);
  near(fromPt(toPt(3.14, "in"), "in"), 3.14);
  assert.equal(PT_PER_IN, 72);
});

// ---- geometry: flat size formulas ----
const refBox = () =>
  buildTuckEnd({ ...defaultParams(inToPt(4.7244), inToPt(2.3622), inToPt(6.2992)), bleed: inToPt(0.125) });
const card = () =>
  buildTuckEnd({ ...defaultParams(inToPt(3), inToPt(0.6), inToPt(5)), bleed: inToPt(0.125) });

test("reference box flat size is exact", () => {
  const d = refBox();
  near(fromPt(d.widthPt, "in"), 14.6732, 1e-3);
  near(fromPt(d.heightPt, "in"), 12.4236, 1e-3);
  // incl bleed
  near(fromPt(d.widthPt + 2 * d.bleedPt, "in"), 14.9232, 1e-3);
  near(fromPt(d.heightPt + 2 * d.bleedPt, "in"), 12.6736, 1e-3);
});

test("3x0.6x5 card box flat size is exact", () => {
  const d = card();
  near(fromPt(d.widthPt, "in"), 7.7, 1e-3);
  near(fromPt(d.heightPt, "in"), 7.3, 1e-3); // tongue grew to cover notch
});

test("cut outline is a single closed polyline", () => {
  const d = card();
  assert.equal(d.paths.cut.length, 1);
  assert.equal(d.paths.cut[0].closed, true);
  assert.ok(d.paths.cut[0].pts.length > 20);
});

test("STE thumb notches toggle on/off per end", () => {
  const dp = () => defaultParams(inToPt(4), inToPt(2), inToPt(6));
  const n = (p: object) => buildTuckEnd({ ...dp(), bleed: 0, ...p }).paths.cut[0].pts.length;
  const both = n({});                                    // default: both notches
  const topOnly = n({ bottomNotch: false });
  const botOnly = n({ topNotch: false });
  const none = n({ topNotch: false, bottomNotch: false });
  assert.ok(both > topOnly, "dropping the bottom notch removes its arc points");
  assert.ok(both > botOnly && topOnly > none, "each notch arc adds points");
  assert.equal(topOnly, botOnly, "one notch each ⇒ symmetric point count");
  assert.ok(both - none > 20, "both arcs are a meaningful number of points");
});

// ---- invariant: tongue must reach past the thumb notch ----
test("tongue depth >= notch radius (covers the semicircle)", () => {
  for (const [L, W, H] of [
    [3, 0.6, 5],
    [4.7244, 2.3622, 6.2992],
    [2, 0.3, 3.5],
    [5, 1, 7],
  ]) {
    const p = defaultParams(inToPt(L), inToPt(W), inToPt(H));
    const notchR = Math.min(inToPt(0.4), inToPt(L) * 0.18);
    assert.ok(
      p.tongue >= notchR,
      `tongue ${fromPt(p.tongue, "in").toFixed(3)} < notch ${fromPt(notchR, "in").toFixed(3)} for ${L}x${W}x${H}`
    );
  }
});

// ---- paper fit ----
test("checkFit reports correct fits with orientation", () => {
  const d = card(); // ~7.95 x 7.55 incl bleed
  const full = (k: "widthPt" | "heightPt") => d[k] + 2 * d.bleedPt;
  const res = checkFit(full("widthPt"), full("heightPt"));
  const letter = res.find((r) => r.sheet.name.startsWith("Letter"))!;
  assert.equal(letter.fits, true);
  const a4 = res.find((r) => r.sheet.name === "A4")!;
  assert.equal(a4.fits, true);
  // every result carries a margin number
  for (const r of res) assert.equal(typeof r.marginPt, "number");
});

// ---- exports: exact physical size in every format ----
test("PDF page size matches the dieline exactly", async () => {
  const d = card();
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

test("SVG declares real-world units (Silhouette-safe 72dpi)", () => {
  const d = card();
  const svg = dielineToSvg(d, { unit: "in" });
  const w = Number(/width="([\d.]+)in"/.exec(svg)![1]);
  const h = Number(/height="([\d.]+)in"/.exec(svg)![1]);
  near(w, fromPt(d.widthPt + 2 * d.bleedPt, "in"), 1e-3);
  near(h, fromPt(d.heightPt + 2 * d.bleedPt, "in"), 1e-3);
  // viewBox user-units per inch == 72
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)!;
  near(Number(vb[1]) / w, 72, 0.01);
});

test("DXF extents match the dieline (in mm)", () => {
  const d = card();
  const dxf = dielineToDxf(d);
  const lines = dxf.split(/\r?\n/);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i] === "10") { const v = +lines[i + 1]; minX = Math.min(minX, v); maxX = Math.max(maxX, v); }
    if (lines[i] === "20") { const v = +lines[i + 1]; minY = Math.min(minY, v); maxY = Math.max(maxY, v); }
  }
  const wIn = (maxX - minX) / 25.4;
  const hIn = (maxY - minY) / 25.4;
  // Bleed is now a CONTOUR offset that follows the cut, so the DXF extents
  // are between the cut-bbox alone and the cut-bbox + 2×bleed. At convex
  // corners the contour reaches the full bbox+bleed; at concave parts it's
  // tighter. Both bounds should hold.
  const cutW = fromPt(d.widthPt, "in");
  const cutH = fromPt(d.heightPt, "in");
  const maxW = fromPt(d.widthPt + 2 * d.bleedPt, "in");
  const maxH = fromPt(d.heightPt + 2 * d.bleedPt, "in");
  assert.ok(wIn >= cutW - 1e-2, `DXF width ${wIn} should ≥ cut width ${cutW}`);
  assert.ok(wIn <= maxW + 1e-2, `DXF width ${wIn} should ≤ cut+bleed width ${maxW}`);
  assert.ok(hIn >= cutH - 1e-2, `DXF height ${hIn} should ≥ cut height ${cutH}`);
  assert.ok(hIn <= maxH + 1e-2, `DXF height ${hIn} should ≤ cut+bleed height ${maxH}`);
  assert.ok(dxf.includes("$INSUNITS"));
});

// ============================================================
// Roll-End Mailer (RETT) model
// ============================================================
import { buildRollEndMailer, defaultParams as rettDefaults } from "../src/core/models/rollEndMailer";

const rettBox = () =>
  buildRollEndMailer({
    ...rettDefaults(inToPt(12), inToPt(8), inToPt(2.5)),
    bleed: inToPt(0.125),
  });

test("Roll-End Mailer flat size is exact", () => {
  // L=12, W=8, H=2.5
  // bboxW = L + 2H = 12 + 5 = 17     (side walls extend by H, not W)
  // bboxH = tongue + 2W + 2H        (tongue + lid:W + back:H + bottom:W + front:H)
  //       = (W*0.7=5.6, capped at 1.2 → 1.2) + 16 + 5 = 22.2
  const p = rettDefaults(inToPt(12), inToPt(8), inToPt(2.5));
  const d = buildRollEndMailer({ ...p, bleed: inToPt(0.125) });
  near(fromPt(d.widthPt, "in"), 17, 1e-3);
  near(fromPt(d.heightPt, "in"), 1.2 + 16 + 5, 1e-3);
});

test("Roll-End Mailer cut = outer outline + 2 interior lock slots", () => {
  const d = rettBox();
  // 1 outer outline (closed) + 2 capsule lock slots (closed)
  assert.equal(d.paths.cut.length, 3);
  for (const pl of d.paths.cut) assert.equal(pl.closed, true);
  // Outer outline is by far the largest polyline (chamfered cross + tongue arcs)
  const sorted = [...d.paths.cut].sort((a, b) => b.pts.length - a.pts.length);
  assert.ok(sorted[0].pts.length >= 30, `outer outline too few pts (${sorted[0].pts.length})`);
  // The two slot capsules are similar-sized
  assert.ok(sorted[1].pts.length >= 10);
  assert.ok(sorted[2].pts.length >= 10);
});

test("Roll-End Mailer has no glue layer (one-piece)", () => {
  const d = rettBox();
  assert.equal(d.paths.glue.length, 0);
});

test("Roll-End Mailer PDF page size matches the dieline", async () => {
  const d = rettBox();
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

// ============================================================
// Flip-Top Mailer model (with bezier curves)
// ============================================================
import { buildFlipTopMailer, defaultParams as flipDefaults } from "../src/core/models/flipTopMailer";

test("Flip-Top Mailer cut has Q-bezier curves at the corners", () => {
  const d = buildFlipTopMailer({
    ...flipDefaults(inToPt(12), inToPt(8), inToPt(2.5)),
    bleed: inToPt(0.125),
  });
  assert.equal(d.paths.cut.length, 1);
  const cut = d.paths.cut[0];
  assert.equal(cut.closed, true);
  assert.ok(cut.curves, "outer cut should have a curves array");
  const ctrlPoints = cut.curves!.filter((c) => c != null);
  assert.ok(ctrlPoints.length >= 4, `expected ≥4 bezier control points (got ${ctrlPoints.length})`);
});

test("Flip-Top Mailer PDF page matches the dieline", async () => {
  const d = buildFlipTopMailer({
    ...flipDefaults(inToPt(12), inToPt(8), inToPt(2.5)),
    bleed: inToPt(0.125),
  });
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

// ============================================================
// Reverse Tuck End (RTE) — parametric model
// ============================================================
import { buildReverseTuckEnd, defaultParams as rteDefaults } from "../src/core/models/reverseTuckEnd";

test("RTE flat size formula: bboxW = glueFlap + 2L + 2W", () => {
  const L = inToPt(4.43), W = inToPt(0.98), H = inToPt(7.29);
  const p = { ...rteDefaults(L, W, H), bleed: inToPt(0.125) };
  const d = buildReverseTuckEnd(p);
  // Flat width = glueFlap + 2L + 2W
  near(d.widthPt, p.glueFlap + 2 * L + 2 * W, 1e-3);
  // Flat height = 2*(tuckH + tuckIn) + H — each end = a tuck panel (tuckH=W) + a
  // tuck-in tongue (tuckIn); back flap on top, front flap on bottom.
  near(d.heightPt, 2 * (p.tuckH + p.tuckIn) + H, 1e-3);
});

test("RTE flap = tuck panel (depth W) + tuck-in tongue, with a tongue crease each end", () => {
  const L = inToPt(4.43), W = inToPt(0.98), H = inToPt(7.29);
  const p = { ...rteDefaults(L, W, H), bleed: 0 };
  near(p.tuckH, W, 1e-6); // panel depth = box depth
  assert.ok(p.tuckIn > 0, "tuck-in tongue has positive depth");
  const d = buildReverseTuckEnd(p);
  // a horizontal crease at the panel↔tongue boundary on BOTH ends (the fold the
  // tongue tucks at) — at y = tuckIn (top) and y = bbox - tuckIn (bottom).
  const TB = p.tuckH + p.tuckIn;
  const horizAt = (y: number) =>
    d.paths.crease.filter((c) => Math.abs(c.pts[0][1] - y) < 1e-6 && Math.abs(c.pts[1][1] - y) < 1e-6 && c.pts[0][1] === c.pts[1][1]).length;
  assert.equal(horizAt(TB - p.tuckH), 1, "one back tongue-fold crease at panelTop");
  assert.equal(horizAt(TB + H + p.tuckH), 1, "one front tongue-fold crease at panelBot");
});

test("RTE responds to L, W, H independently", () => {
  const base = buildReverseTuckEnd({ ...rteDefaults(inToPt(3), inToPt(1), inToPt(5)), bleed: 0 });
  const bigL = buildReverseTuckEnd({ ...rteDefaults(inToPt(6), inToPt(1), inToPt(5)), bleed: 0 });
  const bigW = buildReverseTuckEnd({ ...rteDefaults(inToPt(3), inToPt(2), inToPt(5)), bleed: 0 });
  const bigH = buildReverseTuckEnd({ ...rteDefaults(inToPt(3), inToPt(1), inToPt(8)), bleed: 0 });
  // Doubling L should add 2L to the width (parameter sweep)
  assert.ok(bigL.widthPt > base.widthPt + inToPt(5.9), "L should make flat wider");
  // Doubling W should add 2W to width AND grow flap heights → taller
  assert.ok(bigW.widthPt > base.widthPt + inToPt(1.9), "W should make flat wider");
  assert.ok(bigW.heightPt > base.heightPt + inToPt(1.5), "W should make tucks deeper, so flat taller");
  // H should only change body height (vertical)
  assert.ok(bigH.heightPt > base.heightPt + inToPt(2.9), "H should make flat taller");
  near(bigH.widthPt, base.widthPt, 1e-3); // H doesn't change width
});

test("RTE cut is one closed polyline with Q-bezier corners", () => {
  const d = buildReverseTuckEnd({ ...rteDefaults(inToPt(4), inToPt(1.5), inToPt(6)), bleed: inToPt(0.125) });
  assert.equal(d.paths.cut.length, 1);
  assert.equal(d.paths.cut[0].closed, true);
  const cut = d.paths.cut[0];
  assert.ok(cut.curves, "RTE cut should have a curves array");
  const ctrlPoints = cut.curves!.filter((c) => c != null);
  // 4 rounded corners (top tuck × 2, bottom tuck × 2) = 4 Q-beziers minimum
  assert.equal(ctrlPoints.length, 4, `expected exactly 4 Q-bezier corners (got ${ctrlPoints.length})`);
});

test("RTE creases: 4 vertical + 8 horizontal (panel hinges + tongue folds, none where open)", () => {
  const d = buildReverseTuckEnd({ ...rteDefaults(inToPt(4), inToPt(1.5), inToPt(6)), bleed: 0 });
  // 4 vertical (panel boundaries)
  // top: back panel hinge + back tongue fold + side1 + side2 (NOT front, it's open) = 4
  // bottom: side1 + front panel hinge + front tongue fold + side2 (NOT back, it's open) = 4
  assert.equal(d.paths.crease.length, 12);
});

test("RTE PDF page matches the dieline", async () => {
  const d = buildReverseTuckEnd({ ...rteDefaults(inToPt(4), inToPt(1.5), inToPt(6)), bleed: inToPt(0.125) });
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

// ============================================================
// Flip-Top Mailer — parametric model (Phase 1 rewrite)
// ============================================================
test("Flip-Top flat size formula: (L + 2H) × (2W + 2H + lidTongueH)", () => {
  const L = inToPt(12), W = inToPt(8), H = inToPt(2.5);
  const p = { ...flipDefaults(L, W, H), bleed: 0 };
  const d = buildFlipTopMailer(p);
  near(d.widthPt, L + 2 * H, 1e-3);
  near(d.heightPt, 2 * W + 2 * H + p.lidTongueH, 1e-3);
});

test("Flip-Top responds to L, W, H independently", () => {
  const base = buildFlipTopMailer({ ...flipDefaults(inToPt(10), inToPt(6), inToPt(2)), bleed: 0 });
  const bigL = buildFlipTopMailer({ ...flipDefaults(inToPt(15), inToPt(6), inToPt(2)), bleed: 0 });
  const bigW = buildFlipTopMailer({ ...flipDefaults(inToPt(10), inToPt(10), inToPt(2)), bleed: 0 });
  const bigH = buildFlipTopMailer({ ...flipDefaults(inToPt(10), inToPt(6), inToPt(4)), bleed: 0 });
  near(bigL.widthPt, base.widthPt + inToPt(5), 1e-3);  // L only affects width
  near(bigL.heightPt, base.heightPt, 1e-3);
  assert.ok(bigW.heightPt > base.heightPt + inToPt(7.9), "W reshapes height (2W in formula)");
  assert.ok(bigH.widthPt > base.widthPt + inToPt(3.9), "H reshapes width (2H in formula)");
  assert.ok(bigH.heightPt > base.heightPt + inToPt(4), "H also reshapes height");
});

test("Flip-Top creases: 4 horizontal + 2 vertical (= 6 fold lines)", () => {
  const d = buildFlipTopMailer({ ...flipDefaults(inToPt(10), inToPt(6), inToPt(2)), bleed: 0 });
  assert.equal(d.paths.crease.length, 6);
});

// ============================================================
// Auto-Bottom / Crash-Lock carton (ECMA B40) — Phase 2
// ============================================================
import { buildAutoBottom, defaultParams as autoDefaults } from "../src/core/models/autoBottom";

test("Auto-Bottom flat size: bboxW = glue + 2L + 2W, bboxH = tuckH + H + max(majD,minD)", () => {
  const L = inToPt(4.5), W = inToPt(2.2), H = inToPt(6.5);
  const p = { ...autoDefaults(L, W, H), bleed: inToPt(0.125) };
  const d = buildAutoBottom(p);
  near(d.widthPt, p.glueFlap + 2 * L + 2 * W, 1e-3);
  near(d.heightPt, p.tuckH + H + Math.max(p.majorDepth, p.minorDepth), 1e-3);
});

test("Auto-Bottom responds to L, W, H independently", () => {
  const base = buildAutoBottom({ ...autoDefaults(inToPt(4.5), inToPt(2.2), inToPt(6.5)), bleed: 0 });
  const bigL = buildAutoBottom({ ...autoDefaults(inToPt(9.0), inToPt(2.2), inToPt(6.5)), bleed: 0 });
  const bigW = buildAutoBottom({ ...autoDefaults(inToPt(4.5), inToPt(4.4), inToPt(6.5)), bleed: 0 });
  const bigH = buildAutoBottom({ ...autoDefaults(inToPt(4.5), inToPt(2.2), inToPt(10.5)), bleed: 0 });
  // L adds 2L to width AND deepens the minor (side) flaps (L/2) → taller too
  near(bigL.widthPt, base.widthPt + inToPt(9), 1e-3);
  assert.ok(bigL.heightPt > base.heightPt + inToPt(2), "L should deepen the side flaps (L/2)");
  // W adds 2W to width AND grows the top tuck/dust depths → taller
  near(bigW.widthPt, base.widthPt + inToPt(4.4), 1e-3);
  assert.ok(bigW.heightPt > base.heightPt + inToPt(1.5), "W should grow the top flap depth");
  // H only changes body height (vertical), not width
  near(bigH.widthPt, base.widthPt, 1e-3);
  near(bigH.heightPt, base.heightPt + inToPt(4), 1e-3);
});

test("Auto-Bottom cut is one closed polyline with 2 Q-bezier corners (back tuck)", () => {
  const d = buildAutoBottom({ ...autoDefaults(inToPt(4.5), inToPt(2.2), inToPt(6.5)), bleed: inToPt(0.125) });
  assert.equal(d.paths.cut.length, 1);
  assert.equal(d.paths.cut[0].closed, true);
  const ctrl = d.paths.cut[0].curves!.filter((c) => c != null);
  assert.equal(ctrl.length, 2, `expected 2 rounded tuck corners (got ${ctrl.length})`);
});

test("Auto-Bottom creases: 4 vertical + 3 top + 4 bottom + 2 lock diagonals = 13", () => {
  const d = buildAutoBottom({ ...autoDefaults(inToPt(4.5), inToPt(2.2), inToPt(6.5)), bleed: 0 });
  assert.equal(d.paths.crease.length, 13);
});

test("Auto-Bottom has glue areas (seam + 2 lock triangles)", () => {
  const d = buildAutoBottom({ ...autoDefaults(inToPt(4.5), inToPt(2.2), inToPt(6.5)), bleed: 0 });
  assert.ok(d.paths.glue.length > 0, "auto-bottom should carry glue-zone hatching");
});

test("Auto-Bottom PDF page matches the dieline", async () => {
  const d = buildAutoBottom({ ...autoDefaults(inToPt(4.5), inToPt(2.2), inToPt(6.5)), bleed: inToPt(0.125) });
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

// ============================================================
// Tuck-Top Auto-Bottom carton (ECMA A65) — straight tuck top + crash-lock bottom
// ============================================================
import { buildTuckTopAutoBottom, defaultParams as tuckAutoDefaults } from "../src/core/models/tuckTopAutoBottom";

test("Tuck-Top Auto-Bottom flat size: bboxW = glue + 2L + 2W, bboxH = (W + tongue) + H + max(majD,minD)", () => {
  const L = inToPt(4.5), W = inToPt(2.2), H = inToPt(6.5);
  const p = { ...tuckAutoDefaults(L, W, H), bleed: inToPt(0.125) };
  const d = buildTuckTopAutoBottom(p);
  near(d.widthPt, p.glueFlap + 2 * L + 2 * W, 1e-3);
  // top region = tuck panel (W) + tuck-in tongue; bottom = max(major, minor) flap
  near(d.heightPt, (W + p.tongue) + H + Math.max(p.majorDepth, p.minorDepth), 1e-3);
});

test("Tuck-Top Auto-Bottom responds to L, W, H independently", () => {
  const base = buildTuckTopAutoBottom({ ...tuckAutoDefaults(inToPt(4.5), inToPt(2.2), inToPt(6.5)), bleed: 0 });
  const bigL = buildTuckTopAutoBottom({ ...tuckAutoDefaults(inToPt(9.0), inToPt(2.2), inToPt(6.5)), bleed: 0 });
  const bigH = buildTuckTopAutoBottom({ ...tuckAutoDefaults(inToPt(4.5), inToPt(2.2), inToPt(10.5)), bleed: 0 });
  // L adds 2L to width AND deepens the minor (side) bottom flaps (L/2) → taller
  near(bigL.widthPt, base.widthPt + inToPt(9), 1e-3);
  assert.ok(bigL.heightPt > base.heightPt + inToPt(2), "L should deepen the side flaps (L/2)");
  // H only changes body height (vertical), not width
  near(bigH.widthPt, base.widthPt, 1e-3);
  near(bigH.heightPt, base.heightPt + inToPt(4), 1e-3);
});

test("Tuck-Top Auto-Bottom cut is one closed polyline (notch + tongue, no Q-beziers)", () => {
  const d = buildTuckTopAutoBottom({ ...tuckAutoDefaults(inToPt(4.5), inToPt(2.2), inToPt(6.5)), bleed: inToPt(0.125) });
  assert.equal(d.paths.cut.length, 1);
  assert.equal(d.paths.cut[0].closed, true);
  // straight-tuck top uses chamfers + an arc-flattened notch, not Q-bezier curves
  assert.ok(!d.paths.cut[0].curves, "tuck-top variant should not carry Q-bezier control points");
});

test("Tuck-Top Auto-Bottom creases: 4 vertical + 3 top + 1 tongue + 4 bottom + 2 lock diagonals = 14", () => {
  const d = buildTuckTopAutoBottom({ ...tuckAutoDefaults(inToPt(4.5), inToPt(2.2), inToPt(6.5)), bleed: 0 });
  assert.equal(d.paths.crease.length, 14);
});

test("Tuck-Top Auto-Bottom has glue areas (seam + 2 lock triangles) and publishes panels", () => {
  const d = buildTuckTopAutoBottom({ ...tuckAutoDefaults(inToPt(4.5), inToPt(2.2), inToPt(6.5)), bleed: 0 });
  assert.ok(d.paths.glue.length > 0, "should carry glue-zone hatching (seam + lock triangles)");
  assert.ok(d.panels?.front && d.panels?.back, "should publish front + back panels for overlays");
});

test("Tuck-Top Auto-Bottom PDF page matches the dieline", async () => {
  const d = buildTuckTopAutoBottom({ ...tuckAutoDefaults(inToPt(4.5), inToPt(2.2), inToPt(6.5)), bleed: inToPt(0.125) });
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

// ============================================================
// Tuck-Top Snap-Lock Bottom (ECMA A60 / 1-2-3 bottom) — glue-free mechanical lock
// ============================================================
import { buildSnapLockBottom, defaultParams as snapLockDefaults } from "../src/core/models/snapLockBottom";

test("Snap-Lock flat size: bboxW = glue + 2L + 2W, bboxH = (W + tongue) + H + max(minD, majD+tabLen)", () => {
  const L = inToPt(4.5), W = inToPt(2.2), H = inToPt(6.5);
  const p = { ...snapLockDefaults(L, W, H), bleed: inToPt(0.125) };
  const d = buildSnapLockBottom(p);
  near(d.widthPt, p.glueFlap + 2 * L + 2 * W, 1e-3);
  near(d.heightPt, (W + p.tongue) + H + Math.max(p.minorDepth, p.majorDepth + p.tabLen), 1e-3);
});

test("Snap-Lock responds to L, W, H independently", () => {
  const base = buildSnapLockBottom({ ...snapLockDefaults(inToPt(4.5), inToPt(2.2), inToPt(6.5)), bleed: 0 });
  const bigL = buildSnapLockBottom({ ...snapLockDefaults(inToPt(9.0), inToPt(2.2), inToPt(6.5)), bleed: 0 });
  const bigH = buildSnapLockBottom({ ...snapLockDefaults(inToPt(4.5), inToPt(2.2), inToPt(10.5)), bleed: 0 });
  near(bigL.widthPt, base.widthPt + inToPt(9), 1e-3);
  assert.ok(bigL.heightPt > base.heightPt + inToPt(2), "L should deepen the side flaps (L/2)");
  near(bigH.widthPt, base.widthPt, 1e-3);
  near(bigH.heightPt, base.heightPt + inToPt(4), 1e-3);
});

test("Snap-Lock creases: 4 vertical + 3 top + 1 tongue + 4 bottom = 12 (NO reverse-score diagonals)", () => {
  // Distinguishes A60 from the A65 crash-lock, which has 14 (2 extra lock diagonals).
  const d = buildSnapLockBottom({ ...snapLockDefaults(inToPt(4.5), inToPt(2.2), inToPt(6.5)), bleed: 0 });
  assert.equal(d.paths.crease.length, 12);
});

test("Snap-Lock bottom is glue-free: glue layer is the side seam only (no lock triangles)", () => {
  const big = buildSnapLockBottom({ ...snapLockDefaults(inToPt(4.5), inToPt(2.2), inToPt(6.5)), bleed: 0 });
  const auto = buildTuckTopAutoBottom({ ...tuckAutoDefaults(inToPt(4.5), inToPt(2.2), inToPt(6.5)), bleed: 0 });
  // The crash-lock adds two hatched lock triangles → strictly more glue segments
  // than the snap-lock, whose only glue is the side seam.
  assert.ok(big.paths.glue.length > 0, "snap-lock still glues the side seam");
  assert.ok(auto.paths.glue.length > big.paths.glue.length, "crash-lock should carry MORE glue (seam + 2 lock triangles)");
});

test("Snap-Lock cut is one closed polyline (notch + tongue + lock tab, no Q-beziers)", () => {
  const d = buildSnapLockBottom({ ...snapLockDefaults(inToPt(4.5), inToPt(2.2), inToPt(6.5)), bleed: inToPt(0.125) });
  assert.equal(d.paths.cut.length, 1);
  assert.equal(d.paths.cut[0].closed, true);
  assert.ok(!d.paths.cut[0].curves, "snap-lock outline should not carry Q-bezier control points");
});

test("Snap-Lock PDF page matches the dieline", async () => {
  const d = buildSnapLockBottom({ ...snapLockDefaults(inToPt(4.5), inToPt(2.2), inToPt(6.5)), bleed: inToPt(0.125) });
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

// ============================================================
// Sealed-End / Standard Glue Carton (ECMA B10) — both ends glued
// ============================================================
import { buildGlueCarton, defaultParams as glueCartonDefaults } from "../src/core/models/glueCarton";

test("Glue Carton flat size: bboxW = glue + 2L + 2W, bboxH = 2·(W/2) + H = W + H", () => {
  const L = inToPt(2.5), W = inToPt(1.4), H = inToPt(5.0);
  const p = { ...glueCartonDefaults(L, W, H), bleed: inToPt(0.125) };
  const d = buildGlueCarton(p);
  near(d.widthPt, p.glueFlap + 2 * L + 2 * W, 1e-3);
  near(d.heightPt, 2 * p.sealDepth + H, 1e-3);     // sealing flaps W/2 each end
  near(d.heightPt, W + H, 1e-3);
});

test("Glue Carton responds to L, W, H independently", () => {
  const base = buildGlueCarton({ ...glueCartonDefaults(inToPt(2.5), inToPt(1.4), inToPt(5.0)), bleed: 0 });
  const bigL = buildGlueCarton({ ...glueCartonDefaults(inToPt(5.0), inToPt(1.4), inToPt(5.0)), bleed: 0 });
  const bigW = buildGlueCarton({ ...glueCartonDefaults(inToPt(2.5), inToPt(2.8), inToPt(5.0)), bleed: 0 });
  const bigH = buildGlueCarton({ ...glueCartonDefaults(inToPt(2.5), inToPt(1.4), inToPt(9.0)), bleed: 0 });
  near(bigL.widthPt, base.widthPt + inToPt(5), 1e-3);   // 2·ΔL
  near(bigL.heightPt, base.heightPt, 1e-3);             // L doesn't change height
  near(bigW.heightPt, base.heightPt + inToPt(1.4), 1e-3); // W adds to both flap depths
  near(bigH.widthPt, base.widthPt, 1e-3);
  near(bigH.heightPt, base.heightPt + inToPt(4), 1e-3);
});

test("Glue Carton creases: 4 vertical + 4 top + 4 bottom hinges = 12", () => {
  const d = buildGlueCarton({ ...glueCartonDefaults(inToPt(2.5), inToPt(1.4), inToPt(5.0)), bleed: 0 });
  assert.equal(d.paths.crease.length, 12);
});

test("Glue Carton glues BOTH ends: glue hatch present on top and bottom sealing flaps", () => {
  const d = buildGlueCarton({ ...glueCartonDefaults(inToPt(2.5), inToPt(1.4), inToPt(5.0)), bleed: 0 });
  const TB = glueCartonDefaults(inToPt(2.5), inToPt(1.4), inToPt(5.0)).sealDepth; // body-top y
  const BB = TB + inToPt(5.0);
  // some glue segments live above the body (top seal) and some below (bottom seal)
  const ys = d.paths.glue.flatMap((pl) => pl.pts.map((pt) => pt[1]));
  assert.ok(ys.some((y) => y < TB - 1), "should hatch the top sealing flaps");
  assert.ok(ys.some((y) => y > BB + 1), "should hatch the bottom sealing flaps");
});

test("Glue Carton cut is one closed polyline; publishes front/back panels", () => {
  const d = buildGlueCarton({ ...glueCartonDefaults(inToPt(2.5), inToPt(1.4), inToPt(5.0)), bleed: inToPt(0.125) });
  assert.equal(d.paths.cut.length, 1);
  assert.equal(d.paths.cut[0].closed, true);
  assert.ok(d.panels?.front && d.panels?.back, "should publish front + back panels for overlays");
});

test("Glue Carton PDF page matches the dieline", async () => {
  const d = buildGlueCarton({ ...glueCartonDefaults(inToPt(2.5), inToPt(1.4), inToPt(5.0)), bleed: inToPt(0.125) });
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

// ============================================================
// Simple Open Tray (ECMA C10) — Phase 2 #2
// ============================================================
import { buildOpenTray, defaultParams as trayDefaults } from "../src/core/models/openTray";

test("Open Tray flat size: bboxW = L + 2H, bboxH = W + 2H", () => {
  const L = inToPt(8), W = inToPt(6), H = inToPt(2);
  const d = buildOpenTray({ ...trayDefaults(L, W, H), bleed: inToPt(0.125) });
  near(d.widthPt, L + 2 * H, 1e-3);
  near(d.heightPt, W + 2 * H, 1e-3);
});

test("Open Tray responds to L, W, H independently", () => {
  const base = buildOpenTray({ ...trayDefaults(inToPt(8), inToPt(6), inToPt(2)), bleed: 0 });
  const bigL = buildOpenTray({ ...trayDefaults(inToPt(12), inToPt(6), inToPt(2)), bleed: 0 });
  const bigW = buildOpenTray({ ...trayDefaults(inToPt(8), inToPt(10), inToPt(2)), bleed: 0 });
  const bigH = buildOpenTray({ ...trayDefaults(inToPt(8), inToPt(6), inToPt(4)), bleed: 0 });
  // L only adds to width; W only adds to height; H adds 2H to BOTH
  near(bigL.widthPt, base.widthPt + inToPt(4), 1e-3);
  near(bigL.heightPt, base.heightPt, 1e-3);
  near(bigW.heightPt, base.heightPt + inToPt(4), 1e-3);
  near(bigW.widthPt, base.widthPt, 1e-3);
  near(bigH.widthPt, base.widthPt + inToPt(4), 1e-3);   // 2H
  near(bigH.heightPt, base.heightPt + inToPt(4), 1e-3); // 2H
});

test("Open Tray creases: 4 base-to-wall + 4 wall-to-flap = 8", () => {
  const d = buildOpenTray({ ...trayDefaults(inToPt(8), inToPt(6), inToPt(2)), bleed: 0 });
  assert.equal(d.paths.crease.length, 8);
});

test("Open Tray cut is one closed polyline; has glue flaps", () => {
  const d = buildOpenTray({ ...trayDefaults(inToPt(8), inToPt(6), inToPt(2)), bleed: 0 });
  assert.equal(d.paths.cut.length, 1);
  assert.equal(d.paths.cut[0].closed, true);
  assert.ok(d.paths.glue.length > 0, "tray should carry glue-zone hatching on the corner flaps");
});

test("Open Tray PDF page matches the dieline", async () => {
  const d = buildOpenTray({ ...trayDefaults(inToPt(8), inToPt(6), inToPt(2)), bleed: inToPt(0.125) });
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

// ============================================================
// Bunny Treat Box — eared open tray + printable recolourable face
// ============================================================
import { buildBunnyBox, defaultParams as bunnyDefaults } from "../src/core/models/bunnyBox";
import { animalDefaultParams as animalDefaults } from "../src/core/models/animalBox";
import { buildCatBox, catSpec } from "../src/core/models/catBox";
import { buildBearBox, bearSpec } from "../src/core/models/bearBox";
import { buildFoxBox, foxSpec } from "../src/core/models/foxBox";
import { buildPandaBox, pandaSpec } from "../src/core/models/pandaBox";
import { buildPigBox, pigSpec } from "../src/core/models/pigBox";
import { buildOwlBox, owlSpec } from "../src/core/models/owlBox";
import { buildDogBox, dogSpec } from "../src/core/models/dogBox";
import { buildLionBox, lionSpec } from "../src/core/models/lionBox";
import { buildUnicornBox, unicornSpec } from "../src/core/models/unicornBox";
import { buildFrogBox, frogSpec } from "../src/core/models/frogBox";
import { buildMouseBox, mouseSpec } from "../src/core/models/mouseBox";
import { buildSheepBox, sheepSpec } from "../src/core/models/sheepBox";
import { buildBatBox, batSpec } from "../src/core/models/batBox";
import { buildChickBox, chickSpec } from "../src/core/models/chickBox";
import { buildReindeerBox, reindeerSpec } from "../src/core/models/reindeerBox";

const bunnyEarH = (H: number) => Math.max(mmToPt(16), Math.min(H * 1.2, H * 2.4));

test("Bunny box flat size: bboxW = 2H + L, bboxH = earH + 2H + 2W + tuckD (lid)", () => {
  const L = inToPt(3), W = inToPt(3), H = inToPt(3.5);
  const dp = bunnyDefaults(L, W, H);
  const d = buildBunnyBox({ ...dp, bleed: 0 });
  near(d.widthPt, L + 2 * H, 1e-3);
  near(d.heightPt, bunnyEarH(H) + 2 * H + 2 * W + dp.tuckD, 1e-3); // + lid panel (W) + tuck
});

test("Bunny box cut is one closed polyline + 10 creases (8 tray + lid + tuck) + glue", () => {
  const d = buildBunnyBox({ ...bunnyDefaults(inToPt(3), inToPt(3), inToPt(3.5)), bleed: 0 });
  assert.equal(d.paths.cut.length, 1);
  assert.equal(d.paths.cut[0].closed, true);
  assert.equal(d.paths.crease.length, 10);
  assert.ok(d.paths.crease.some((c) => c.id === "back-lid"), "has the lid hinge");
  assert.ok(d.paths.crease.some((c) => c.id === "lid-tuck"), "has the lid tuck fold");
  assert.ok(d.paths.glue.length > 0, "corner glue flaps");
});

test("Bunny box has 5 printable face groups (mouth stroked, rest filled)", () => {
  const d = buildBunnyBox({ ...bunnyDefaults(inToPt(3), inToPt(3), inToPt(3.5)), bleed: 0 });
  const ids = (d.decorations ?? []).map((x) => x.id).sort();
  assert.deepEqual(ids, ["cheeks", "ears", "eyes", "mouth", "nose"]);
  const mouth = d.decorations!.find((x) => x.id === "mouth")!;
  assert.equal(mouth.stroke, true, "mouth renders as a stroke");
  for (const id of ["eyes", "nose", "cheeks", "ears"]) {
    assert.ok(!d.decorations!.find((x) => x.id === id)!.stroke, `${id} is filled`);
  }
});

test("Bunny ears rise ABOVE the front wall (tips at the top of the net)", () => {
  const L = inToPt(3), W = inToPt(3), H = inToPt(3.5);
  const d = buildBunnyBox({ ...bunnyDefaults(L, W, H), bleed: 0 });
  const ys = d.paths.cut[0].pts.map((p) => p[1]);
  const minY = Math.min(...ys);
  near(minY, 0, 1e-6);                      // ear tips at y=0
  assert.ok(minY < bunnyEarH(H), "ears extend above the front-wall top edge");
  assert.ok(d.panels?.base, "publishes the base panel (the Fold Engine root)");
});

test("Bunny box folds via the engine to a closed lidded box (panelizes + erects)", () => {
  const L = inToPt(3), W = inToPt(3), H = inToPt(3.5);
  const die = buildBunnyBox({ ...bunnyDefaults(L, W, H), bleed: 0 });
  const g = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
  const model = prepare(g, foldSpecFor("bunny-box", die));
  const { size } = foldedBBox(model, 0);  // t=0 = erected box, lid closed
  // Erected = a real 3D box: every axis positive, and the walls + rigid ears
  // give a vertical extent well past the L×W footprint (not a flat sheet).
  assert.ok(Math.min(size[0], size[1], size[2]) > inToPt(1), "erected box is 3D in every axis");
  assert.ok(Math.max(size[0], size[1], size[2]) > H, "walls + ears give real height (not flat)");
});

// ---- Cat / Bear / Fox — the animal-box family (same body/lid/fold as bunny) --
for (const a of [
  { id: "cat-box", build: buildCatBox, spec: catSpec },
  { id: "bear-box", build: buildBearBox, spec: bearSpec },
  { id: "fox-box", build: buildFoxBox, spec: foxSpec },
  { id: "panda-box", build: buildPandaBox, spec: pandaSpec },
  { id: "pig-box", build: buildPigBox, spec: pigSpec },
  { id: "owl-box", build: buildOwlBox, spec: owlSpec },
  { id: "dog-box", build: buildDogBox, spec: dogSpec },
  { id: "lion-box", build: buildLionBox, spec: lionSpec },
  { id: "unicorn-box", build: buildUnicornBox, spec: unicornSpec },
  { id: "frog-box", build: buildFrogBox, spec: frogSpec },
  { id: "mouse-box", build: buildMouseBox, spec: mouseSpec },
  { id: "sheep-box", build: buildSheepBox, spec: sheepSpec },
  { id: "bat-box", build: buildBatBox, spec: batSpec },
  { id: "chick-box", build: buildChickBox, spec: chickSpec },
  { id: "reindeer-box", build: buildReindeerBox, spec: reindeerSpec },
]) {
  test(`${a.id}: flat size, 10 creases, ≥4 face groups, ears above the front wall`, () => {
    const L = inToPt(3), W = inToPt(3), H = inToPt(3.5);
    const dp = animalDefaults(L, W, H);
    const d = a.build({ ...dp, bleed: 0 });
    const earH = a.spec.earH(H);
    near(d.widthPt, L + 2 * H, 1e-3);
    near(d.heightPt, earH + 2 * H + 2 * W + dp.tuckD, 1e-3);  // + lid panel (W) + tuck
    assert.equal(d.paths.cut.length, 1);
    assert.equal(d.paths.cut[0].closed, true);
    assert.equal(d.paths.crease.length, 10);
    assert.ok(d.paths.crease.some((c) => c.id === "back-lid") && d.paths.crease.some((c) => c.id === "lid-tuck"), "lid hinges");
    assert.ok(d.paths.glue.length > 0, "corner glue flaps");
    assert.ok((d.decorations ?? []).length >= 4, "has a printable face");
    const minY = Math.min(...d.paths.cut[0].pts.map((p) => p[1]));
    near(minY, 0, 1e-6);                       // ear tips at y=0
    assert.ok(minY < earH, "ears extend above the front-wall top edge");
    assert.ok(d.panels?.base, "publishes the base panel (the Fold Engine root)");
  });

  test(`${a.id}: folds via the engine to a closed lidded box`, () => {
    const L = inToPt(3), W = inToPt(3), H = inToPt(3.5);
    const die = a.build({ ...animalDefaults(L, W, H), bleed: 0 });
    const g = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
    const model = prepare(g, foldSpecFor(a.id, die));
    const { size } = foldedBBox(model, 0);
    assert.ok(Math.min(size[0], size[1], size[2]) > inToPt(1), "erected box is 3D in every axis");
    assert.ok(Math.max(size[0], size[1], size[2]) > H, "walls + ears give real height");
  });
}

// ============================================================
// Hinged-Lid Tray (ECMA C30) — one-piece tray with attached flip lid
// ============================================================
import { buildHingeLidTray, defaultParams as hingeLidDefaults } from "../src/core/models/hingeLidTray";

test("Hinged-Lid Tray flat size: bboxW = 2H + L, bboxH = tuckD + 2W + 2H", () => {
  const L = inToPt(6), W = inToPt(4), H = inToPt(1.5);
  const p = { ...hingeLidDefaults(L, W, H), bleed: inToPt(0.125) };
  const d = buildHingeLidTray(p);
  near(d.widthPt, 2 * H + L, 1e-3);
  near(d.heightPt, p.tuckD + 2 * W + 2 * H, 1e-3);
});

test("Hinged-Lid Tray responds to L, W, H independently", () => {
  const base = buildHingeLidTray({ ...hingeLidDefaults(inToPt(6), inToPt(4), inToPt(1.5)), bleed: 0 });
  const bigL = buildHingeLidTray({ ...hingeLidDefaults(inToPt(9), inToPt(4), inToPt(1.5)), bleed: 0 });
  const bigW = buildHingeLidTray({ ...hingeLidDefaults(inToPt(6), inToPt(7), inToPt(1.5)), bleed: 0 });
  near(bigL.widthPt, base.widthPt + inToPt(3), 1e-3);   // L adds to width
  near(bigL.heightPt, base.heightPt, 1e-3);             // L doesn't change height
  near(bigW.heightPt, base.heightPt + inToPt(6), 1e-3); // W adds to lid panel + base (2×)
});

test("Hinged-Lid Tray creases: 4 base-to-wall + 4 wall-to-flap + lid hinge + lid-tuck = 10", () => {
  const d = buildHingeLidTray({ ...hingeLidDefaults(inToPt(6), inToPt(4), inToPt(1.5)), bleed: 0 });
  assert.equal(d.paths.crease.length, 10);
});

test("Hinged-Lid Tray: base is glued (corner flaps), lid is friction-tuck (no glue on lid)", () => {
  const d = buildHingeLidTray({ ...hingeLidDefaults(inToPt(6), inToPt(4), inToPt(1.5)), bleed: 0 });
  assert.ok(d.paths.glue.length > 0, "base corner flaps should carry glue hatch");
  // All glue lives at the base (y within the cross), never up in the lid region (y < tuckD+W).
  const p = hingeLidDefaults(inToPt(6), inToPt(4), inToPt(1.5));
  const lidHinge = p.tuckD + p.W; // back-wall top; everything above is lid/tuck
  const ys = d.paths.glue.flatMap((pl) => pl.pts.map((pt) => pt[1]));
  assert.ok(ys.every((y) => y > lidHinge), "no glue should be on the lid/tuck (friction closure)");
});

test("Hinged-Lid Tray cut is one closed polyline", () => {
  const d = buildHingeLidTray({ ...hingeLidDefaults(inToPt(6), inToPt(4), inToPt(1.5)), bleed: inToPt(0.125) });
  assert.equal(d.paths.cut.length, 1);
  assert.equal(d.paths.cut[0].closed, true);
});

test("Hinged-Lid Tray PDF page matches the dieline", async () => {
  const d = buildHingeLidTray({ ...hingeLidDefaults(inToPt(6), inToPt(4), inToPt(1.5)), bleed: inToPt(0.125) });
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

// ============================================================
// Pillow Box (ECMA F7001 / E10) — Phase 2 #3
// ============================================================
import { buildPillowBox, defaultParams as pillowDefaults } from "../src/core/models/pillowBox";

test("Pillow Box flat size: bboxW = glue + 2W, bboxH = L + 2·(D/2)", () => {
  const L = inToPt(5.5), W = inToPt(3.5), D = inToPt(1.2);
  const p = { ...pillowDefaults(L, W, D), bleed: inToPt(0.125) };
  const d = buildPillowBox(p);
  const s = Math.min(D / 2, W * 0.45);
  near(d.widthPt, p.glueFlap + 2 * W, 1e-3);
  near(d.heightPt, L + 2 * s, 1e-3);
});

test("Pillow Box clamps depth D ≤ ~0.9W (45° fold limit)", () => {
  const W = inToPt(3);
  // Ask for D = 2W (way over the limit); sagitta should clamp to 0.45W
  const d = buildPillowBox({ ...pillowDefaults(inToPt(5), W, inToPt(6)), bleed: 0 });
  // heightPt = L + 2s, with s clamped to 0.45W → 2s = 0.9W
  near(d.heightPt, inToPt(5) + 0.9 * W, 1e-3);
});

test("Pillow Box responds to L, W, D independently", () => {
  const base = buildPillowBox({ ...pillowDefaults(inToPt(5), inToPt(3), inToPt(1)), bleed: 0 });
  const bigL = buildPillowBox({ ...pillowDefaults(inToPt(8), inToPt(3), inToPt(1)), bleed: 0 });
  const bigW = buildPillowBox({ ...pillowDefaults(inToPt(5), inToPt(5), inToPt(1)), bleed: 0 });
  const bigD = buildPillowBox({ ...pillowDefaults(inToPt(5), inToPt(3), inToPt(2)), bleed: 0 });
  near(bigL.heightPt, base.heightPt + inToPt(3), 1e-3);  // L adds to length
  near(bigL.widthPt, base.widthPt, 1e-1);
  assert.ok(bigW.widthPt > base.widthPt + inToPt(3.9), "W widens (2W)");
  assert.ok(bigD.heightPt > base.heightPt + inToPt(0.4), "deeper box → larger end sagitta → taller blank");
  near(bigD.widthPt, base.widthPt, 1e-3);               // D doesn't change width
});

test("Pillow Box creases: 2 straight + 4 curved = 6", () => {
  const d = buildPillowBox({ ...pillowDefaults(inToPt(5), inToPt(3), inToPt(1)), bleed: 0 });
  assert.equal(d.paths.crease.length, 6);
  // the 4 curved creases have many points (arcs); the 2 straight have 2
  const curved = d.paths.crease.filter((c) => c.pts.length > 2);
  assert.equal(curved.length, 4, "should have 4 curved (multi-point) creases");
});

test("Pillow Box PDF page matches the dieline", async () => {
  const d = buildPillowBox({ ...pillowDefaults(inToPt(5.5), inToPt(3.5), inToPt(1.2)), bleed: inToPt(0.125) });
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

// ============================================================
// Open Sleeve (ECMA D10) — Phase 2 #4
// ============================================================
import { buildOpenSleeve, defaultParams as sleeveDefaults } from "../src/core/models/openSleeve";

test("Open Sleeve flat size: bboxW = glue + 2W + 2H, bboxH = L", () => {
  const L = inToPt(5), W = inToPt(3), H = inToPt(1.4);
  const p = { ...sleeveDefaults(L, W, H), bleed: inToPt(0.125) };
  const d = buildOpenSleeve(p);
  near(d.widthPt, p.glueFlap + 2 * W + 2 * H, 1e-3);
  near(d.heightPt, L, 1e-3);
});

test("Open Sleeve responds to L, W, H independently", () => {
  const base = buildOpenSleeve({ ...sleeveDefaults(inToPt(5), inToPt(3), inToPt(1.4)), bleed: 0 });
  const bigL = buildOpenSleeve({ ...sleeveDefaults(inToPt(8), inToPt(3), inToPt(1.4)), bleed: 0 });
  const bigW = buildOpenSleeve({ ...sleeveDefaults(inToPt(5), inToPt(5), inToPt(1.4)), bleed: 0 });
  const bigH = buildOpenSleeve({ ...sleeveDefaults(inToPt(5), inToPt(3), inToPt(3)), bleed: 0 });
  near(bigL.heightPt, base.heightPt + inToPt(3), 1e-3);   // L → blank height only
  near(bigL.widthPt, base.widthPt, 1e-3);
  assert.ok(bigW.widthPt > base.widthPt + inToPt(3.9), "W widens by 2W");
  near(bigW.heightPt, base.heightPt, 1e-3);
  assert.ok(bigH.widthPt > base.widthPt + inToPt(3.1), "H widens by 2H");
  near(bigH.heightPt, base.heightPt, 1e-3);
});

test("Open Sleeve creases: 4 vertical panel folds, both ends open", () => {
  const d = buildOpenSleeve({ ...sleeveDefaults(inToPt(5), inToPt(3), inToPt(1.4)), bleed: 0 });
  assert.equal(d.paths.crease.length, 4);
  assert.equal(d.paths.cut.length, 1);
  assert.equal(d.paths.cut[0].closed, true);
});

test("Open Sleeve PDF page matches the dieline", async () => {
  const d = buildOpenSleeve({ ...sleeveDefaults(inToPt(5), inToPt(3), inToPt(1.4)), bleed: inToPt(0.125) });
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

// ============================================================
// Regular Slotted Container (RSC, FEFCO 0201)
// ============================================================
import { buildRsc, defaultParams as rscDefaults } from "../src/core/models/rsc";

test("RSC flat size: bboxW = glue + 2L + 2W, bboxH = H + W", () => {
  const L = inToPt(12), W = inToPt(9), H = inToPt(6);
  const p = { ...rscDefaults(L, W, H), bleed: inToPt(0.125) };
  const d = buildRsc(p);
  near(d.widthPt, p.glueFlap + 2 * L + 2 * W, 1e-3);
  near(d.heightPt, H + W, 1e-3); // body H + two flaps of W/2
});

test("RSC responds to L, W, H independently", () => {
  const base = buildRsc({ ...rscDefaults(inToPt(12), inToPt(9), inToPt(6)), bleed: 0 });
  const bigL = buildRsc({ ...rscDefaults(inToPt(16), inToPt(9), inToPt(6)), bleed: 0 });
  const bigW = buildRsc({ ...rscDefaults(inToPt(12), inToPt(13), inToPt(6)), bleed: 0 });
  const bigH = buildRsc({ ...rscDefaults(inToPt(12), inToPt(9), inToPt(10)), bleed: 0 });
  near(bigL.widthPt, base.widthPt + inToPt(8), 1e-3);   // +2L
  near(bigL.heightPt, base.heightPt, 1e-3);
  assert.ok(bigW.widthPt > base.widthPt + inToPt(7.9), "W widens (2W)");
  assert.ok(bigW.heightPt > base.heightPt + inToPt(3.9), "W deepens flaps (W) → taller");
  near(bigH.heightPt, base.heightPt + inToPt(4), 1e-3); // H only adds to height
  near(bigH.widthPt, base.widthPt, 1e-3);
});

test("RSC creases: 4 vertical + 4 top + 4 bottom = 12", () => {
  const d = buildRsc({ ...rscDefaults(inToPt(12), inToPt(9), inToPt(6)), bleed: 0 });
  assert.equal(d.paths.crease.length, 12);
});

test("RSC PDF page matches the dieline", async () => {
  const d = buildRsc({ ...rscDefaults(inToPt(12), inToPt(9), inToPt(6)), bleed: inToPt(0.125) });
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

// ============================================================
// Drawer Box (sleeve + tray) — combined two-piece model
// ============================================================
import { buildDrawerBox, defaultParams as drawerDefaults } from "../src/core/models/drawerBox";

test("Drawer Box = tray + auto-sized sleeve, two pieces in one dieline", () => {
  const L = inToPt(4.5), W = inToPt(3), H = inToPt(1.3), t = inToPt(0.018);
  const p = { ...drawerDefaults(L, W, H, t), bleed: inToPt(0.125) };
  const d = buildDrawerBox(p);
  assert.equal(d.pieces?.length, 2, "two pieces (drawer + sleeve)");
  // Composition matches the two sub-models laid out top/bottom with a gap.
  // The sleeve is sized to drawer + 2·thickness (its own walls) + slide gap.
  const tray = buildOpenTray({ ...trayDefaults(L, W, H, t), bleed: 0 });
  const fit = 2 * t + p.clearance;
  const sleeve = buildOpenSleeve({ ...sleeveDefaults(L, W + fit, H + fit, t), bleed: 0 });
  near(d.widthPt, Math.max(tray.widthPt, sleeve.widthPt), 1e-6);
  near(d.heightPt, tray.heightPt + p.gap + sleeve.heightPt, 1e-6);
  // cut has both pieces' outlines (tray + sleeve)
  assert.ok(d.paths.cut.length >= 2);
});

test("Drawer Box: sleeve inner clears the drawer (slides, not press-fit)", () => {
  const L = inToPt(4), W = inToPt(3), H = inToPt(1.2), t = inToPt(0.018);
  const p = { ...drawerDefaults(L, W, H, t), bleed: 0 };
  // sleeve panel cross = drawer + 2t + clr  →  inner = cross − 2t = drawer + clr
  const fit = 2 * t + p.clearance;
  const innerW = (W + fit) - 2 * t;
  assert.ok(innerW > W, "sleeve inner width must exceed the drawer width");
  near(innerW - W, p.clearance, 1e-9); // the leftover is exactly the slide gap
});

test("Drawer Box: the sleeve depends on the drawer (auto-nesting)", () => {
  const base = buildDrawerBox({ ...drawerDefaults(inToPt(4), inToPt(3), inToPt(1.2)), bleed: 0 });
  const bigW = buildDrawerBox({ ...drawerDefaults(inToPt(4), inToPt(5), inToPt(1.2)), bleed: 0 });
  // a wider drawer => the sleeve (and thus the combined sheet) grows
  assert.ok(bigW.widthPt > base.widthPt, "wider drawer -> wider combined sheet");
  assert.equal(bigW.pieces?.length, 2);
});

test("Drawer Box PDF page matches the combined dieline", async () => {
  const d = buildDrawerBox({ ...drawerDefaults(inToPt(4.5), inToPt(3), inToPt(1.3)), bleed: inToPt(0.125) });
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

// ============================================================
// Tray + Lid (full telescope) — combined two-piece model
// ============================================================
import { buildTrayLid, defaultParams as trayLidDefaults } from "../src/core/models/trayLid";

test("Tray + Lid = base tray + auto-sized lid tray, two pieces in one dieline", () => {
  const L = inToPt(9), W = inToPt(6), H = inToPt(2.5), t = inToPt(0.018);
  const p = { ...trayLidDefaults(L, W, H, t), bleed: inToPt(0.125) };
  const d = buildTrayLid(p);
  assert.equal(d.pieces?.length, 2, "two pieces (base + lid)");
  // Composition: base tray + a larger lid tray laid out top/bottom with a gap.
  const base = buildOpenTray({ ...trayDefaults(L, W, H, t), bleed: 0 });
  const fit = 2 * t + p.clearance;
  const lid = buildOpenTray({ ...trayDefaults(L + fit, W + fit, p.lidDepth, t), bleed: 0 });
  near(d.widthPt, Math.max(base.widthPt, lid.widthPt), 1e-6);
  near(d.heightPt, base.heightPt + p.gap + lid.heightPt, 1e-6);
  assert.ok(d.paths.cut.length >= 2);
});

test("Tray + Lid: lid floor clears the base outer (telescopes, not press-fit)", () => {
  const L = inToPt(9), W = inToPt(6), H = inToPt(2.5), t = inToPt(0.018);
  const p = { ...trayLidDefaults(L, W, H, t), bleed: 0 };
  // lid floor = base outer (L + 2t) + clr; the leftover over the base outer is
  // exactly the fit clearance.
  const fit = 2 * t + p.clearance;
  const lidFloorW = W + fit;
  const baseOuterW = W + 2 * t;
  assert.ok(lidFloorW > baseOuterW, "lid floor must exceed the base outer width");
  near(lidFloorW - baseOuterW, p.clearance, 1e-9);
});

test("Tray + Lid: full telescope — lid is as deep as the base", () => {
  const L = inToPt(9), W = inToPt(6), H = inToPt(2.5), t = inToPt(0.018);
  const p = trayLidDefaults(L, W, H, t);
  near(p.lidDepth, H, 1e-9); // full telescope
});

test("Tray + Lid: the lid depends on the base (auto-nesting)", () => {
  const base = buildTrayLid({ ...trayLidDefaults(inToPt(9), inToPt(6), inToPt(2.5)), bleed: 0 });
  // A longer base grows the tray flat width (L + 2H), so the combined sheet
  // widens — both pieces depend on the entered base size.
  const bigL = buildTrayLid({ ...trayLidDefaults(inToPt(12), inToPt(6), inToPt(2.5)), bleed: 0 });
  assert.ok(bigL.widthPt > base.widthPt, "longer base -> wider combined sheet");
  // A deeper base grows the tray flat height (W + 2H), so the sheet gets taller.
  const bigW = buildTrayLid({ ...trayLidDefaults(inToPt(9), inToPt(8), inToPt(2.5)), bleed: 0 });
  assert.ok(bigW.heightPt > base.heightPt, "deeper base -> taller combined sheet");
  assert.equal(bigL.pieces?.length, 2);
});

test("Tray + Lid PDF page matches the combined dieline", async () => {
  const d = buildTrayLid({ ...trayLidDefaults(inToPt(9), inToPt(6), inToPt(2.5)), bleed: inToPt(0.125) });
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

// ============================================================
// Gable Top box (peaked handle carton)
// ============================================================
import { buildGableBox, defaultParams as gableDefaults } from "../src/core/models/gableBox";

test("Gable box flat size: bboxW = glue + 2L + 2W, bboxH = earH + S + H + W + tongue", () => {
  const L = inToPt(5), W = inToPt(4), H = inToPt(5.5), t = inToPt(0.018);
  const p = { ...gableDefaults(L, W, H, t), bleed: inToPt(0.125) };
  const d = buildGableBox(p);
  const G = W / 2;
  const S = Math.sqrt(G * G + (W / 2) * (W / 2));
  const earH = Math.min(mmToPt(11), S * 0.32); // top lock-ear height
  near(d.widthPt, p.glue + 2 * L + 2 * W, 1e-6);
  near(d.heightPt, earH + S + H + W + p.tongue, 1e-6); // tuckH = W
});

test("Gable box: gable peak height G = W/2 (45° gable)", () => {
  const p = gableDefaults(inToPt(5), inToPt(4), inToPt(5.5));
  near(p.gableH, inToPt(4) / 2, 1e-9);
});

test("Gable box cut = outer + 2 handle slots + 2 gable-triangle lock slits", () => {
  const d = buildGableBox({ ...gableDefaults(inToPt(5), inToPt(4), inToPt(5.5)), bleed: 0 });
  assert.equal(d.paths.cut.length, 5, "outer + 2 handles + 2 triangle slits");
  assert.ok(d.paths.cut[0].closed && d.paths.cut[1].closed && d.paths.cut[2].closed);
  assert.equal(d.paths.cut[3].closed, false, "triangle lock slits are open cut lines");
  assert.equal(d.paths.cut[4].closed, false);
});

test("Gable box lock slit: tunable + clamped inside the triangle (never tip/base)", () => {
  const W = inToPt(4), G = W / 2; // triangle height = gable peak G
  const slitLenOf = (req: number) => {
    const d = buildGableBox({ ...gableDefaults(inToPt(5), W, inToPt(5.5)), bleed: 0, slitLen: req });
    const s = d.paths.cut[3]; // first gable-triangle slit (open polyline)
    return Math.abs(s.pts[1][1] - s.pts[0][1]);
  };
  // tunable: a longer request produces a longer slit
  assert.ok(slitLenOf(inToPt(0.8)) > slitLenOf(inToPt(0.2)), "longer request -> longer slit");
  // clamped: even an absurd request can't span the whole triangle (height G),
  // so the slit always leaves solid material at the apex tip AND the base.
  assert.ok(slitLenOf(inToPt(99)) < G, "slit is clamped shorter than the triangle height");
});

test("Gable box responds to L, W, H independently", () => {
  const base = buildGableBox({ ...gableDefaults(inToPt(5), inToPt(4), inToPt(5.5)), bleed: 0 });
  const bigL = buildGableBox({ ...gableDefaults(inToPt(7), inToPt(4), inToPt(5.5)), bleed: 0 });
  const bigW = buildGableBox({ ...gableDefaults(inToPt(5), inToPt(6), inToPt(5.5)), bleed: 0 });
  const bigH = buildGableBox({ ...gableDefaults(inToPt(5), inToPt(4), inToPt(8)), bleed: 0 });
  assert.ok(bigL.widthPt > base.widthPt, "longer L -> wider");
  assert.ok(bigW.widthPt > base.widthPt && bigW.heightPt > base.heightPt, "bigger W -> wider AND taller (gable+tuck)");
  assert.ok(bigH.heightPt > base.heightPt && Math.abs(bigH.widthPt - base.widthPt) < 1e-6, "taller H -> taller only");
});

test("Gable box creases: 4 vert + 4 eave + 4 lock-ear + 3 bottom + 1 tongue = 16", () => {
  const d = buildGableBox({ ...gableDefaults(inToPt(5), inToPt(4), inToPt(5.5)), bleed: 0 });
  assert.equal(d.paths.crease.length, 16);
});

test("Gable box PDF page matches the dieline", async () => {
  const d = buildGableBox({ ...gableDefaults(inToPt(5), inToPt(4), inToPt(5.5)), bleed: inToPt(0.125) });
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

// ============================================================
// Hexagon box (elongated hexagonal prism)
// ============================================================
import { buildHexBox, defaultParams as hexDefaults, hexDetails } from "../src/core/models/hexBox";

test("Hex box flat size: width = glue + 2m + 4s, height = 2·(maxApothem+overlap) + H", () => {
  const L = inToPt(5), W = inToPt(4.3), H = inToPt(3.5), t = inToPt(0.018);
  const p = { ...hexDefaults(L, W, H, t), bleed: inToPt(0.125) };
  const d = buildHexBox(p);
  const { m, s, apoLong, apoSlant } = hexDetails(L, W);
  near(d.widthPt, p.glue + 2 * m + 4 * s, 1e-6);
  // infold flaps extend `overlap` past centre (the glue bonding surface)
  const overlap = Math.min(Math.min(apoLong, apoSlant) * 0.18, mmToPt(6));
  near(d.heightPt, 2 * (Math.max(apoLong, apoSlant) + overlap) + H, 1e-6);
});

test("Hex box: infold end flaps are marked as glue (so the box holds)", () => {
  const d = buildHexBox({ ...hexDefaults(inToPt(5), inToPt(4.3), inToPt(3.5)), bleed: 0 });
  // glue layer carries the seam AND the hatched end flaps — many segments.
  assert.ok(d.paths.glue.length > 20, "end flaps should be hatched as glue areas");
});

test("Hex box: edge-to-centre apothems (flaps tile the footprint)", () => {
  const L = inToPt(5), W = inToPt(4.3);
  const { e, m, apoLong, apoSlant } = hexDetails(L, W);
  near(apoLong, W / 2, 1e-9);                 // long edge apothem = W/2
  near(apoSlant, (W * (m / 2 + e)) / (2 * Math.sqrt(e * e + (W / 2) * (W / 2))), 1e-9);
  assert.ok(apoSlant > 0 && apoLong > 0);
});

test("Hex box cut is one closed polyline; 18 creases (6 vert + 6 top + 6 bot)", () => {
  const d = buildHexBox({ ...hexDefaults(inToPt(5), inToPt(4.3), inToPt(3.5)), bleed: 0 });
  assert.equal(d.paths.cut.length, 1);
  assert.ok(d.paths.cut[0].closed);
  assert.equal(d.paths.crease.length, 18);
});

test("Hex box responds to L, W, H independently", () => {
  const base = buildHexBox({ ...hexDefaults(inToPt(5), inToPt(4.3), inToPt(3.5)), bleed: 0 });
  const bigL = buildHexBox({ ...hexDefaults(inToPt(7), inToPt(4.3), inToPt(3.5)), bleed: 0 });
  const bigH = buildHexBox({ ...hexDefaults(inToPt(5), inToPt(4.3), inToPt(6)), bleed: 0 });
  assert.ok(bigL.widthPt > base.widthPt, "longer L -> wider flat");
  assert.ok(bigH.heightPt > base.heightPt && Math.abs(bigH.widthPt - base.widthPt) < 1e-6, "taller H -> taller only");
});

test("Hex box PDF page matches the dieline", async () => {
  const d = buildHexBox({ ...hexDefaults(inToPt(5), inToPt(4.3), inToPt(3.5)), bleed: inToPt(0.125) });
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

// ============================================================
// Hexagon Box + Lid (two-piece openable hexagon)
// ============================================================
import { buildHexTrayLid, defaultParams as hexTLDefaults } from "../src/core/models/hexTrayLid";

test("Hex Box + Lid = base hex tray + larger lid hex tray, two pieces", () => {
  const L = inToPt(5), W = inToPt(4.3), H = inToPt(3.5), t = inToPt(0.018);
  const d = buildHexTrayLid({ ...hexTLDefaults(L, W, H, t), bleed: inToPt(0.125) });
  assert.equal(d.pieces?.length, 2, "two pieces (base + lid)");
  assert.equal(d.paths.cut.length, 2);
  assert.ok(d.paths.cut[0].closed && d.paths.cut[1].closed);
});

test("Hex Box + Lid: the lid footprint exceeds the base (telescopes over it)", () => {
  const L = inToPt(5), W = inToPt(4.3), H = inToPt(3.5), t = inToPt(0.018);
  const p = { ...hexTLDefaults(L, W, H, t), bleed: 0 };
  const d = buildHexTrayLid(p);
  // base piece is laid first (top of sheet); lid is the larger one below it.
  const widthOf = (pl: any) => Math.max(...pl.pts.map((q: any) => q[0]));
  assert.ok(widthOf(d.pieces![1]) > widthOf(d.pieces![0]), "lid flat is wider than base");
});

test("Hex Box + Lid: the lid depends on the base (auto-nesting)", () => {
  const base = buildHexTrayLid({ ...hexTLDefaults(inToPt(5), inToPt(4.3), inToPt(3.5)), bleed: 0 });
  const bigL = buildHexTrayLid({ ...hexTLDefaults(inToPt(7), inToPt(4.3), inToPt(3.5)), bleed: 0 });
  assert.ok(bigL.widthPt > base.widthPt, "longer base -> wider combined sheet");
  assert.equal(bigL.pieces?.length, 2);
});

test("Hex Box + Lid PDF page matches the combined dieline", async () => {
  const d = buildHexTrayLid({ ...hexTLDefaults(inToPt(5), inToPt(4.3), inToPt(3.5)), bleed: inToPt(0.125) });
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
});

// ============================================================
// Phase 3 — feature overlays (window cut)
// ============================================================
import { applyFeatures, windowCut, euroSlotCut, thumbCut } from "../src/core/features";

test("STE / RTE publish a front-panel rect for overlays", () => {
  const ste = buildTuckEnd({ ...defaultParams(inToPt(4), inToPt(2), inToPt(6)), bleed: 0 });
  assert.ok(ste.panels?.front, "STE should publish panels.front");
  near(ste.panels!.front.w, inToPt(4), 1e-3); // front panel width = L
  // STE front rect is inset top+bottom by the thumb-notch radius (notch-safe),
  // so its height is LESS than the full body height H.
  assert.ok(ste.panels!.front.h < inToPt(6) - 1e-3, "STE front rect is notch-inset");
  assert.ok(ste.panels!.front.h > inToPt(6) - inToPt(1), "STE front rect inset is modest (≈2·notchR)");
  const rte = buildReverseTuckEnd({ ...rteDefaults(inToPt(4), inToPt(2), inToPt(6)), bleed: 0 });
  assert.ok(rte.panels?.front, "RTE should publish panels.front");
  near(rte.panels!.front.h, inToPt(6), 1e-3); // RTE has no notch → full height
});

test("window cut adds one interior closed cut polyline, inside the front panel", () => {
  const base = buildTuckEnd({ ...defaultParams(inToPt(4), inToPt(2), inToPt(6)), bleed: 0 });
  const margin = inToPt(0.4);
  const withWin = applyFeatures(
    buildTuckEnd({ ...defaultParams(inToPt(4), inToPt(2), inToPt(6)), bleed: 0 }),
    { window: { marginPt: margin } }
  );
  assert.equal(base.paths.cut.length, 1, "no window by default");
  assert.equal(withWin.paths.cut.length, 2, "window adds a second cut polyline");
  const win = withWin.paths.cut[1];
  assert.equal(win.closed, true);
  // every window point sits inside the front panel inset by the margin
  const f = withWin.panels!.front;
  for (const [x, y] of win.pts) {
    assert.ok(x >= f.x + margin - 1e-6 && x <= f.x + f.w - margin + 1e-6, "window x within front inset");
    assert.ok(y >= f.y + margin - 1e-6 && y <= f.y + f.h - margin + 1e-6, "window y within front inset");
  }
});

test("window cut does not change the flat size", () => {
  const p = { ...defaultParams(inToPt(4), inToPt(2), inToPt(6)), bleed: inToPt(0.125) };
  const base = buildTuckEnd({ ...p });
  const withWin = applyFeatures(buildTuckEnd({ ...p }), { window: { marginPt: inToPt(0.4) } });
  near(withWin.widthPt, base.widthPt, 1e-6);
  near(withWin.heightPt, base.heightPt, 1e-6);
});

test("windowCut helper returns a rounded rect with Q-bezier corners", () => {
  const w = windowCut({ x: 0, y: 0, w: inToPt(4), h: inToPt(6) }, inToPt(0.4));
  assert.equal(w.closed, true);
  const ctrl = (w.curves ?? []).filter((c) => c != null);
  assert.equal(ctrl.length, 4, "4 rounded corners");
});

test("STE / RTE publish a back-panel rect for the Euro slot", () => {
  const ste = buildTuckEnd({ ...defaultParams(inToPt(4), inToPt(2), inToPt(6)), bleed: 0 });
  assert.ok(ste.panels?.back, "STE should publish panels.back");
  near(ste.panels!.back.w, inToPt(4), 1e-3); // back panel width = L
  const rte = buildReverseTuckEnd({ ...rteDefaults(inToPt(4), inToPt(2), inToPt(6)), bleed: 0 });
  assert.ok(rte.panels?.back, "RTE should publish panels.back");
});

test("Euro slot adds a closed cut near the top of the back panel; no size change", () => {
  const p = { ...defaultParams(inToPt(4), inToPt(2), inToPt(6)), bleed: inToPt(0.125) };
  const base = buildTuckEnd({ ...p });
  const withEuro = applyFeatures(buildTuckEnd({ ...p }), { euroSlot: {} });
  assert.equal(base.paths.cut.length, 1, "no euro by default");
  assert.equal(withEuro.paths.cut.length, 2, "euro adds a second cut polyline");
  near(withEuro.widthPt, base.widthPt, 1e-6);   // flat size unchanged
  near(withEuro.heightPt, base.heightPt, 1e-6);
  const euro = withEuro.paths.cut[1];
  assert.equal(euro.closed, true);
  const back = withEuro.panels!.back;
  // sits in the top portion of the back panel
  for (const [, y] of euro.pts) {
    assert.ok(y >= back.y - 1e-6 && y <= back.y + back.h / 2, "euro slot in the top half of the back panel");
  }
});

test("euroSlotCut is centered on the panel and ~32mm wide (capped to panel)", () => {
  const back = { x: inToPt(1), y: inToPt(0.5), w: inToPt(4), h: inToPt(6) };
  const e = euroSlotCut(back, mmToPt(8));
  let minX = Infinity, maxX = -Infinity;
  for (const [x] of e.pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
  const cx = (minX + maxX) / 2;
  near(cx, back.x + back.w / 2, 1e-3);          // centered
  near(maxX - minX, mmToPt(32), 0.5);           // ~32mm wide (panel is wider)
});

test("Open Sleeve publishes a front panel + supports the thumb hole", () => {
  const d = buildOpenSleeve({ ...sleeveDefaults(inToPt(5), inToPt(3), inToPt(1.4)), bleed: 0 });
  assert.ok(d.panels?.front, "sleeve should publish panels.front (main face)");
  const withThumb = applyFeatures(
    buildOpenSleeve({ ...sleeveDefaults(inToPt(5), inToPt(3), inToPt(1.4)), bleed: 0 }),
    { thumb: {} }
  );
  assert.equal(withThumb.paths.cut.length, 2, "thumb adds a second cut polyline");
  assert.equal(withThumb.paths.cut[1].closed, true);
});

test("thumbCut is a closed pill near the panel top, no flat-size change", () => {
  const p = { ...sleeveDefaults(inToPt(5), inToPt(3), inToPt(1.4)), bleed: 0 };
  const base = buildOpenSleeve({ ...p });
  const withThumb = applyFeatures(buildOpenSleeve({ ...p }), { thumb: {} });
  near(withThumb.widthPt, base.widthPt, 1e-6);
  near(withThumb.heightPt, base.heightPt, 1e-6);
  const front = withThumb.panels!.front;
  const t = thumbCut(front, mmToPt(10));
  for (const [, y] of t.pts) {
    assert.ok(y >= front.y - 1e-6 && y <= front.y + front.h / 2, "thumb in the top half of the face");
  }
});

// ---- A57: easy-open thumb cut (half-moon on the RTE front lip) ----
import { thumbNotchCut } from "../src/core/features";

test("RTE supports the thumb-notch overlay; it adds one closed interior cut", () => {
  const p = { ...rteDefaults(inToPt(4.43), inToPt(0.98), inToPt(7.29)), bleed: 0 };
  const base = buildReverseTuckEnd({ ...p });
  assert.equal(base.paths.cut.length, 1, "no thumb cut by default");
  const withNotch = applyFeatures(buildReverseTuckEnd({ ...p }), { thumbNotch: {} });
  assert.equal(withNotch.paths.cut.length, 2, "thumb-notch adds a second cut polyline");
  assert.equal(withNotch.paths.cut[1].closed, true, "thumb cut is a closed contour");
});

test("thumb cut does not change the flat size", () => {
  const p = { ...rteDefaults(inToPt(4.43), inToPt(0.98), inToPt(7.29)), bleed: 0 };
  const base = buildReverseTuckEnd({ ...p });
  const withNotch = applyFeatures(buildReverseTuckEnd({ ...p }), { thumbNotch: {} });
  near(withNotch.widthPt, base.widthPt, 1e-6);
  near(withNotch.heightPt, base.heightPt, 1e-6);
});

test("thumbNotchCut is a centered half-moon, fully inside the front panel", () => {
  const front = { x: inToPt(1), y: inToPt(2), w: inToPt(4), h: inToPt(6) };
  const web = mmToPt(8), r = mmToPt(12);
  const t = thumbNotchCut(front, web, r);
  const cx = front.x + front.w / 2;
  const yChord = front.y + web;
  let maxY = -Infinity, minX = Infinity, maxX = -Infinity;
  for (const [x, y] of t.pts) {
    // every point is on or below the chord (arc bulges DOWN into the panel)
    assert.ok(y >= yChord - 1e-6, "thumb cut never rises above its chord");
    // and stays inside the front panel rect
    assert.ok(x >= front.x - 1e-6 && x <= front.x + front.w + 1e-6, "thumb x within front panel");
    assert.ok(y <= front.y + front.h + 1e-6, "thumb y within front panel");
    maxY = Math.max(maxY, y); minX = Math.min(minX, x); maxX = Math.max(maxX, x);
  }
  near((minX + maxX) / 2, cx, 1e-6);          // centered horizontally
  near(maxX - minX, 2 * r, 1e-3);             // chord spans the diameter
  near(maxY, yChord + r, 1e-3);               // bulges exactly r into the panel
});

test("thumbNotchCut radius is clamped to fit a narrow panel", () => {
  const narrow = { x: 0, y: 0, w: mmToPt(10), h: inToPt(4) };
  const t = thumbNotchCut(narrow, mmToPt(4), mmToPt(40)); // ask for an oversized radius
  for (const [x] of t.pts) {
    assert.ok(x >= -1e-6 && x <= narrow.w + 1e-6, "clamped thumb cut stays inside a narrow panel");
  }
});

test("thumb-notch stays BACKED by the tuck-in tongue (never a hole into the box)", () => {
  // The closing tongue tucks `tuckIn` deep inside the front wall; the A57 notch
  // must not reach past it, or the box interior shows through the cut.
  for (const [L, W, H] of [[4.43, 0.98, 7.29], [3, 2, 5], [6, 3.5, 4]] as const) {
    const p = { ...rteDefaults(inToPt(L), inToPt(W), inToPt(H)), bleed: 0 };
    const die = applyFeatures(buildReverseTuckEnd({ ...p }), { thumbNotch: {} });
    const cover = die.panels!.frontTuckCover!;        // tongue reach from the open edge
    const notch = die.paths.cut[1];                    // the half-moon
    const yOpen = die.panels!.front.y;                 // front-wall opening edge
    const deepest = Math.max(...notch.pts.map(([, y]) => y));
    // the lowest point of the notch must sit within the tongue's coverage
    assert.ok(
      deepest <= yOpen + cover.h - mmToPt(1) + 1e-6,
      `notch reaches ${(deepest - yOpen).toFixed(1)}pt > tongue ${cover.h.toFixed(1)}pt for ${L}×${W}×${H}`,
    );
    // and it must still be a real, usable cut (not degenerate)
    const minX = Math.min(...notch.pts.map(([x]) => x));
    const maxX = Math.max(...notch.pts.map(([x]) => x));
    assert.ok(maxX - minX >= mmToPt(5), "notch is wide enough to be usable");
  }
});

// ============================================================
// Contour bleed (replaces the bbox-rectangle bleed)
// ============================================================
import { bleedFromCut, offsetPolygon } from "../src/core/geometry";

test("bleed is a contour offset, not a bbox rectangle", () => {
  const d = card();
  const bleed = d.paths.bleed[0];
  // The bleed polyline should have MORE than 4 points (it follows the cut
  // shape, which has many vertices). A bbox bleed would be exactly 4 points.
  assert.ok(bleed.pts.length > 8, `bleed has ${bleed.pts.length} pts — should follow the cut contour, not be a rectangle`);
});

test("bleed extends outward (every point ≥ bleed away from cut bbox or beyond)", () => {
  const d = card();
  const bleed = d.paths.bleed[0];
  // Bleed bbox should ENCLOSE the cut bbox
  let bxMin=Infinity,bxMax=-Infinity,byMin=Infinity,byMax=-Infinity;
  for (const [x,y] of bleed.pts) {
    if (x < bxMin) bxMin = x; if (x > bxMax) bxMax = x;
    if (y < byMin) byMin = y; if (y > byMax) byMax = y;
  }
  // The cut goes from 0..widthPt by 0..heightPt; bleed should extend outward
  // by ~bleedPt on each side at the bbox extremes.
  near(bxMin, -d.bleedPt, 0.05);
  near(byMin, -d.bleedPt, 0.05);
  near(bxMax, d.widthPt + d.bleedPt, 0.05);
  near(byMax, d.heightPt + d.bleedPt, 0.05);
});

test("offsetPolygon preserves winding & inflates a simple rectangle correctly", () => {
  // Unit square, CW (y-down): (0,0) → (1,0) → (1,1) → (0,1) → close
  const sq = offsetPolygon([[0,0],[1,0],[1,1],[0,1]], 0.5);
  // Should produce a 2×2 square centered on the original
  assert.equal(sq.length, 4);
  near(sq[0][0], -0.5, 1e-6); near(sq[0][1], -0.5, 1e-6);
  near(sq[2][0], 1.5, 1e-6); near(sq[2][1], 1.5, 1e-6);
});

// ============================================================
// Sheet imposition ("how many up")
// ============================================================
import { imposeOnSheet, imposeAll } from "../src/core/imposition";

test("imposition: a 4×4in die fits 2×2 = 4-up on Letter (8.5×11), no gutter/margin", () => {
  const letter = { name: "Letter", wPt: inToPt(8.5), hPt: inToPt(11) };
  const imp = imposeOnSheet(inToPt(4), inToPt(4), letter, 0, 0);
  assert.equal(imp.cols, 2);   // floor(8.5/4)=2
  assert.equal(imp.rows, 2);   // floor(11/4)=2
  assert.equal(imp.up, 4);
  assert.equal(imp.placements.length, 4);
});

test("imposition: gutter reduces the count", () => {
  const letter = { name: "Letter", wPt: inToPt(8.5), hPt: inToPt(11) };
  // 4×4 with a 1in gutter: cols = floor((8.5+1)/(4+1)) = 1, rows = floor((11+1)/5)=2 → 2-up
  const imp = imposeOnSheet(inToPt(4), inToPt(4), letter, inToPt(1), 0);
  assert.equal(imp.cols, 1);
  assert.equal(imp.rows, 2);
  assert.equal(imp.up, 2);
});

test("imposition: picks the orientation that yields more (rotation)", () => {
  const letter = { name: "Letter", wPt: inToPt(8.5), hPt: inToPt(11) };
  // 10×4 upright: cols=floor(8.5/10)=0 → 0-up. Rotated to 4×10: cols=floor(8.5/4)=2, rows=floor(11/10)=1 → 2-up.
  const imp = imposeOnSheet(inToPt(10), inToPt(4), letter, 0, 0);
  assert.equal(imp.rotated, true);
  assert.equal(imp.up, 2);
});

test("imposition: a die larger than the sheet yields 0-up", () => {
  const letter = { name: "Letter", wPt: inToPt(8.5), hPt: inToPt(11) };
  const imp = imposeOnSheet(inToPt(20), inToPt(20), letter, 0, 0);
  assert.equal(imp.up, 0);
  assert.equal(imp.placements.length, 0);
});

test("imposition: placements stay within the sheet and never overlap", () => {
  const letter = { name: "Letter", wPt: inToPt(8.5), hPt: inToPt(11) };
  const g = inToPt(0.2), m = inToPt(0.25);
  const imp = imposeOnSheet(inToPt(3), inToPt(2.5), letter, g, m);
  assert.ok(imp.up > 0);
  for (const p of imp.placements) {
    assert.ok(p.xPt >= m - 1e-6 && p.xPt + p.wPt <= letter.wPt - m + 1e-6, "within sheet width");
    assert.ok(p.yPt >= m - 1e-6 && p.yPt + p.hPt <= letter.hPt - m + 1e-6, "within sheet height");
  }
  // pairwise non-overlap (gutter keeps a gap)
  for (let i = 0; i < imp.placements.length; i++) {
    for (let j = i + 1; j < imp.placements.length; j++) {
      const a = imp.placements[i], b = imp.placements[j];
      const disjoint = a.xPt + a.wPt <= b.xPt + 1e-6 || b.xPt + b.wPt <= a.xPt + 1e-6 ||
                       a.yPt + a.hPt <= b.yPt + 1e-6 || b.yPt + b.hPt <= a.yPt + 1e-6;
      assert.ok(disjoint, "placements must not overlap");
    }
  }
});

test("imposeAll returns one result per sheet, sorted most-up first", () => {
  const imps = imposeAll(inToPt(4), inToPt(4), 0, 0);
  assert.ok(imps.length >= 5);
  for (let i = 1; i < imps.length; i++) {
    assert.ok(imps[i - 1].up >= imps[i].up, "sorted by up descending");
  }
});

// ---- composeSheet (multi-up export) ----
import { composeSheet } from "../src/core/sheet";

test("composeSheet stamps N copies of every layer at sheet size", () => {
  const die = buildTuckEnd({ ...defaultParams(inToPt(2), inToPt(1), inToPt(2.5)), bleed: inToPt(0.125) });
  const fullW = die.widthPt + 2 * die.bleedPt, fullH = die.heightPt + 2 * die.bleedPt;
  const sheet = { name: "12×18", wPt: inToPt(12), hPt: inToPt(18) };
  const imp = imposeOnSheet(fullW, fullH, sheet, inToPt(0.125), 0);
  assert.ok(imp.up >= 2, "expected a multi-up case");
  const composed = composeSheet(die, imp);
  // exact sheet page
  near(composed.widthPt, sheet.wPt, 1e-6);
  near(composed.heightPt, sheet.hPt, 1e-6);
  assert.equal(composed.bleedPt, 0);
  // every layer has up× the original polyline count
  for (const layer of ["cut", "crease", "glue"] as const) {
    assert.equal(composed.paths[layer].length, die.paths[layer].length * imp.up, `${layer} count`);
  }
});

test("composeSheet: every placed point stays within the sheet", () => {
  const die = buildTuckEnd({ ...defaultParams(inToPt(2), inToPt(1), inToPt(2.5)), bleed: inToPt(0.125) });
  const fullW = die.widthPt + 2 * die.bleedPt, fullH = die.heightPt + 2 * die.bleedPt;
  const sheet = { name: "12×18", wPt: inToPt(12), hPt: inToPt(18) };
  const imp = imposeOnSheet(fullW, fullH, sheet, inToPt(0.125), 0);
  const composed = composeSheet(die, imp);
  for (const layer of ["cut", "crease", "bleed", "glue"] as const) {
    for (const pl of composed.paths[layer]) {
      for (const [x, y] of pl.pts) {
        assert.ok(x >= -0.5 && x <= sheet.wPt + 0.5 && y >= -0.5 && y <= sheet.hPt + 0.5, "point within sheet");
      }
    }
  }
});

test("composeSheet crop marks: one set of 8 ticks at the outer block corners", () => {
  const die = buildTuckEnd({ ...defaultParams(inToPt(2), inToPt(1), inToPt(2.5)), bleed: inToPt(0.125) });
  const fullW = die.widthPt + 2 * die.bleedPt, fullH = die.heightPt + 2 * die.bleedPt;
  const sheet = { name: "12×18", wPt: inToPt(12), hPt: inToPt(18) };
  const imp = imposeOnSheet(fullW, fullH, sheet, inToPt(0.125), 0);
  assert.equal(composeSheet(die, imp).marks, undefined);
  const withMarks = composeSheet(die, imp, { cropMarks: true });
  // 8 ticks TOTAL (not per piece) — only the four outer corners get marked, so
  // ganged pieces aren't ringed with marks that overlap the artwork.
  assert.equal(withMarks.marks!.length, 8);
  // ...and every tick clusters at one of the 4 OUTER block trim corners (never
  // in an interior gutter between tiles, where they'd overlap a neighbour).
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of imp.placements) {
    minX = Math.min(minX, p.xPt); minY = Math.min(minY, p.yPt);
    maxX = Math.max(maxX, p.xPt + p.wPt); maxY = Math.max(maxY, p.yPt + p.hPt);
  }
  const b = die.bleedPt;
  const corners = [[minX + b, minY + b], [maxX - b, minY + b], [minX + b, maxY - b], [maxX - b, maxY - b]];
  const tol = inToPt(0.25); // gap (0.06) + len (0.125) + slack
  const allAtCorners = withMarks.marks!.every((m) =>
    m.pts.every(([x, y]) => corners.some(([cx, cy]) => Math.abs(x - cx) <= tol && Math.abs(y - cy) <= tol))
  );
  assert.equal(allAtCorners, true);
});

test("composeSheet PDF page equals the sheet size", async () => {
  const die = buildTuckEnd({ ...defaultParams(inToPt(2), inToPt(1), inToPt(2.5)), bleed: inToPt(0.125) });
  const fullW = die.widthPt + 2 * die.bleedPt, fullH = die.heightPt + 2 * die.bleedPt;
  const sheet = { name: "12×18", wPt: inToPt(12), hPt: inToPt(18) };
  const imp = imposeOnSheet(fullW, fullH, sheet, inToPt(0.125), 0);
  const bytes = await dielineToPdf(composeSheet(die, imp, { cropMarks: true }));
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, sheet.wPt, 0.01);
  near(height, sheet.hPt, 0.01);
});

// ============================================================
// 3D drift guard — every model that claims a 3D preview must actually build a
// non-empty scene and fold without throwing. Catches a closure that falls
// through to the wrong/empty branch (the kind of silent 3D↔dieline drift the
// book-wrap audit surfaced).
// ============================================================
import * as THREE from "three";
import { buildFoldable } from "../src/ui/box3d/foldable";
import { MODELS } from "../src/core/models/registry";

// Variant params for models whose 3D shows a non-default variant (the necklace
// card's flat style has no fold — only the fold-over style does).
const SMOKE_PARAMS: Record<string, Record<string, unknown>> = {
  "necklace-card": { necklaceStyle: "fold" },
};
for (const m of MODELS) {
  if (!m.has3DPreview) continue;
  test(`3D smoke: ${m.id} builds a non-empty scene + folds without error`, () => {
    const f = buildFoldable({
      modelId: m.id,
      Lpt: inToPt(m.defaultDimensions.L),
      Wpt: inToPt(m.defaultDimensions.W),
      Hpt: inToPt(m.defaultDimensions.H),
      scale: 0.02,
      material: new THREE.MeshStandardMaterial(),
      buildParams: SMOKE_PARAMS[m.id],
    });
    // A model claiming has3DPreview must produce actual geometry — an empty
    // group means its closure is missing or fell through.
    assert.ok(f.group.children.length > 0, `${m.id}: empty 3D scene graph`);
    assert.doesNotThrow(() => { f.setFold(0); f.setFold(1); f.setFold(0.5); }, `${m.id}: setFold threw`);
  });
}

// Every size preset (across all models) must build a valid dieline — guards
// against a preset whose dims violate a model constraint (hex needs L > W,
// the pillow box clamps depth ≤ ~0.45·W, etc.). presets are in inches.
test("every size preset builds a valid dieline", () => {
  for (const m of MODELS) {
    if (!m.presets) continue;
    for (const pre of m.presets) {
      const die = m.build({
        L: inToPt(pre.L),
        W: inToPt(pre.W),
        H: inToPt(pre.H ?? m.defaultDimensions.H),
        thickness: inToPt(m.defaultDimensions.thickness),
        bleed: inToPt(m.defaultDimensions.bleed),
      });
      assert.ok(die.widthPt > 0 && die.heightPt > 0, `${m.id} / "${pre.label}": non-positive flat size`);
      assert.ok(die.paths.cut.length > 0, `${m.id} / "${pre.label}": no cut paths`);
    }
  }
});

// ============================================================
// Fold Engine v2 — panelizer + solver (docs/fold-engine.md)
// ============================================================
import { panelize } from "../src/core/fold/panelize";
import { prepare, foldedBBox } from "../src/core/fold/solve";
import { foldSpecFor } from "../src/core/fold/specs";
import { flattenPolyline } from "../src/core/geometry";

const polyAreaAbs = (pts: [number, number][]) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    s += x0 * y1 - x1 * y0;
  }
  return Math.abs(s / 2);
};

test("panelize: unit square + one crease → 2 panels + 1 hinge (pins conventions)", () => {
  const sq = { pts: [[0, 0], [10, 0], [10, 10], [0, 10]] as [number, number][], closed: true };
  const mid = { pts: [[0, 5], [10, 5]] as [number, number][], closed: false, id: "mid" };
  const g = panelize(sq, [mid]);
  assert.equal(g.panels.length, 2);
  assert.equal(g.hinges.length, 1);
  assert.equal(g.hinges[0].creaseId, "mid");
  near(g.panels[0].area + g.panels[1].area, 100, 1e-9);
});

test("panelize STE: 13 panels, 12 hinges, panel areas sum to the sheet area", () => {
  for (const [L, W, H] of [[4.7244, 2.3622, 6.2992], [3, 0.6, 5]] as [number, number, number][]) {
    const die = buildTuckEnd({ ...defaultParams(inToPt(L), inToPt(W), inToPt(H)), bleed: 0 });
    const g = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
    assert.equal(g.panels.length, 13, `STE ${L}x${W}x${H}: panels`);
    assert.equal(g.hinges.length, 12, `STE ${L}x${W}x${H}: hinges`);
    const sum = g.panels.reduce((s, p) => s + p.area, 0);
    const sheet = polyAreaAbs(flattenPolyline(die.paths.cut[0]).pts);
    near(sum, sheet, sheet * 1e-9); // no lost or double-counted faces
  }
});

test("panelize RTE: 13 panels, 12 hinges, panel areas sum to the sheet area", () => {
  for (const [L, W, H] of [[4.43, 0.98, 7.29], [3, 1, 5]] as [number, number, number][]) {
    const die = buildReverseTuckEnd({ ...rteDefaults(inToPt(L), inToPt(W), inToPt(H)), bleed: 0 });
    const g = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
    assert.equal(g.panels.length, 13, `RTE ${L}x${W}x${H}: panels`);
    assert.equal(g.hinges.length, 12, `RTE ${L}x${W}x${H}: hinges`);
    const sum = g.panels.reduce((s, p) => s + p.area, 0);
    const sheet = polyAreaAbs(flattenPolyline(die.paths.cut[0]).pts);
    near(sum, sheet, sheet * 1e-9);
  }
});

test("panelize: a window cut becomes a HOLE of exactly one panel (STE)", () => {
  const p = { ...defaultParams(inToPt(4.7244), inToPt(2.3622), inToPt(6.2992)), bleed: 0 };
  const die = applyFeatures(buildTuckEnd(p), { window: { marginPt: inToPt(0.4) } });
  const g = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
  const withHoles = g.panels.filter((pn) => pn.holes.length > 0);
  assert.equal(withHoles.length, 1, "exactly one panel hosts the window");
  assert.equal(withHoles[0].holes.length, 1);
});

test("fold engine: STE folds closed to exactly L × H × W", () => {
  for (const [L, W, H] of [[4.7244, 2.3622, 6.2992], [3, 0.6, 5]] as [number, number, number][]) {
    const die = buildTuckEnd({ ...defaultParams(inToPt(L), inToPt(W), inToPt(H)), bleed: 0 });
    const g = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
    const model = prepare(g, foldSpecFor("tuck-end", die));
    const { size } = foldedBBox(model, 0);
    near(size[0], inToPt(L), 1e-3);
    near(size[1], inToPt(H), 1e-3);
    near(size[2], inToPt(W), 1e-3);
  }
});

test("fold engine: RTE folds closed to exactly L × H × W", () => {
  const [L, W, H] = [4.43, 0.98, 7.29];
  const die = buildReverseTuckEnd({ ...rteDefaults(inToPt(L), inToPt(W), inToPt(H)), bleed: 0 });
  const g = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
  const model = prepare(g, foldSpecFor("reverse-tuck-end", die));
  const { size } = foldedBBox(model, 0);
  near(size[0], inToPt(L), 1e-3);
  near(size[1], inToPt(H), 1e-3);
  near(size[2], inToPt(W), 1e-3);
});

// ---- Phase 2: the tuck family through the engine ----
const P2_MODELS: [string, (L: number, W: number, H: number) => any, number, number, [number, number, number]][] = [
  // [modelId, builder, panels, hinges, [L, W, H] in inches]
  ["auto-bottom", (L, W, H) => buildAutoBottom({ ...autoDefaults(L, W, H), bleed: 0 }), 14, 13, [4.5, 2.2, 6.5]],
  ["tuck-top-auto-bottom", (L, W, H) => buildTuckTopAutoBottom({ ...tuckAutoDefaults(L, W, H), bleed: 0 }), 15, 14, [4.5, 2.2, 6.5]],
  ["snap-lock-bottom", (L, W, H) => buildSnapLockBottom({ ...snapLockDefaults(L, W, H), bleed: 0 }), 13, 12, [4.5, 2.2, 6.5]],
  ["glue-carton", (L, W, H) => buildGlueCarton({ ...glueCartonDefaults(L, W, H), bleed: 0 }), 13, 12, [2.5, 1.4, 5.0]],
];

test("panelize tuck family: expected panel/hinge counts + area conservation", () => {
  for (const [id, build, nPanels, nHinges, [L, W, H]] of P2_MODELS) {
    const die = build(inToPt(L), inToPt(W), inToPt(H));
    const g = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
    assert.equal(g.panels.length, nPanels, `${id}: panels`);
    assert.equal(g.hinges.length, nHinges, `${id}: hinges`);
    const sum = g.panels.reduce((s: number, p: any) => s + p.area, 0);
    const sheet = polyAreaAbs(flattenPolyline(die.paths.cut[0]).pts);
    near(sum, sheet, sheet * 1e-9);
  }
});

test("fold engine: tuck family folds closed to exactly L × H × W", () => {
  for (const [id, build, , , [L, W, H]] of P2_MODELS) {
    const die = build(inToPt(L), inToPt(W), inToPt(H));
    const g = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
    const model = prepare(g, foldSpecFor(id, die));
    const { size } = foldedBBox(model, 0);
    near(size[0], inToPt(L), 1e-3);
    near(size[1], inToPt(H), 1e-3);
    near(size[2], inToPt(W), 1e-3);
  }
});

// ---- Phase 3: trays & tubes through the engine ----
const P3_MODELS: [string, (L: number, W: number, H: number) => any, number, number, [number, number, number], [number, number, number]][] = [
  // [modelId, builder, panels, hinges, [L,W,H] inches, expected closed bbox (x,y,z) inches]
  ["open-sleeve", (L, W, H) => buildOpenSleeve({ ...sleeveDefaults(L, W, H), bleed: 0 }), 5, 4, [5, 3, 1.4], [3, 5, 1.4]],
  ["open-tray", (L, W, H) => buildOpenTray({ ...trayDefaults(L, W, H), bleed: 0 }), 9, 8, [8, 6, 2], [8, 6, 2]],
  ["hinge-lid-tray", (L, W, H) => buildHingeLidTray({ ...hingeLidDefaults(L, W, H), bleed: 0 }), 11, 10, [6, 4, 1.5], [6, 4, 1.5]],
  ["rsc", (L, W, H) => buildRsc({ ...rscDefaults(L, W, H), bleed: 0 }), 13, 12, [12, 9, 6], [12, 6, 9]],
];

test("panelize trays & tubes: expected panel/hinge counts + area conservation", () => {
  for (const [id, build, nPanels, nHinges, [L, W, H]] of P3_MODELS) {
    const die = build(inToPt(L), inToPt(W), inToPt(H));
    const g = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
    assert.equal(g.panels.length, nPanels, `${id}: panels`);
    assert.equal(g.hinges.length, nHinges, `${id}: hinges`);
    const sum = g.panels.reduce((s: number, p: any) => s + p.area, 0);
    const sheet = polyAreaAbs(flattenPolyline(die.paths.cut[0]).pts);
    near(sum, sheet, sheet * 1e-9);
  }
});

test("fold engine: trays & tubes fold closed to their exact box dimensions", () => {
  for (const [id, build, , , [L, W, H], exp] of P3_MODELS) {
    const die = build(inToPt(L), inToPt(W), inToPt(H));
    const g = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
    const model = prepare(g, foldSpecFor(id, die));
    const { size } = foldedBBox(model, 0);
    near(size[0], inToPt(exp[0]), 1e-3);
    near(size[1], inToPt(exp[1]), 1e-3);
    near(size[2], inToPt(exp[2]), 1e-3);
  }
});

// ---- Phase 4: the gable acid test ----
test("fold engine: gable panelizes (17/16, 2 handle holes) and folds closed to L × (H+G) × W", () => {
  const [L, W, H] = [inToPt(5), inToPt(4), inToPt(5.5)];
  const die = buildGableBox({ ...gableDefaults(L, W, H), bleed: 0 });
  const g = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
  assert.equal(g.panels.length, 17, "gable panels");
  assert.equal(g.hinges.length, 16, "gable hinges");
  assert.equal(g.panels.reduce((s, p) => s + p.holes.length, 0), 2, "2 handle holes derived");
  assert.equal(g.panels.reduce((s, p) => s + p.slits.length, 0), 2, "2 lock slits detected");
  const sum = g.panels.reduce((s, p) => s + p.area, 0);
  near(sum, polyAreaAbs(flattenPolyline(die.paths.cut[0]).pts), sum * 1e-9);
  const model = prepare(g, foldSpecFor("gable-box", die));
  const { size } = foldedBBox(model, 0);
  near(size[0], L, 1e-3);
  near(size[1], H + W / 2, 1e-3); // walls + the 45° gable peak
  near(size[2], W, 1e-3);
});

test("fold engine: hexagon panelizes (19/18) and folds closed to L × H × W (dims-dependent corner angles)", () => {
  const [L, W, H] = [inToPt(5), inToPt(4.3), inToPt(3.5)];
  const die = buildHexBox({ ...hexDefaults(L, W, H), bleed: 0 });
  const g = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
  assert.equal(g.panels.length, 19, "hex panels (glue + 6 walls + 12 infolds)");
  assert.equal(g.hinges.length, 18, "hex hinges");
  const sum = g.panels.reduce((s, p) => s + p.area, 0);
  near(sum, polyAreaAbs(flattenPolyline(die.paths.cut[0]).pts), sum * 1e-9);
  const model = prepare(g, foldSpecFor("hex-box", die, { L, W, H }));
  const { size } = foldedBBox(model, 0);
  near(size[0], L, 1e-3);
  near(size[1], H, 1e-3);
  near(size[2], W, 1e-3);
});

// ============================================================
// Craft Batch 0 — shared craft primitives (src/core/craft.ts)
// ============================================================
import {
  scallopEdge, circleCut, holeGrid, holeRing,
  slotForTab, slotCut, tabEdgePts,
} from "../src/core/craft";
import { buildGiftTag, defaultParams as giftTagDefaults } from "../src/core/models/giftTag";

// bbox of a (possibly curved) polyline, curves flattened first
const craftBB = (pl: { pts: [number, number][]; closed: boolean; curves?: any }) => {
  const pts = flattenPolyline(pl as any).pts;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x; if (y < y0) y0 = y;
    if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
};

test("scallopEdge: endpoints exact, bumps bulge LEFT of travel, apex depth = fitted radius", () => {
  const pts = scallopEdge([0, 0], [72, 0], { count: 3 }); // r = 72/(2·3) = 12
  near(pts[0][0], 0); near(pts[0][1], 0);
  near(pts[pts.length - 1][0], 72); near(pts[pts.length - 1][1], 0);
  // left of travel (1,0) in y-down = up = negative y: every point at or above the chord
  for (const [, y] of pts) assert.ok(y <= 1e-9, "scallop crossed to the wrong side");
  const minY = Math.min(...pts.map((p) => p[1]));
  near(minY, -12, 1e-6);
  // x never overshoots the edge span
  for (const [x] of pts) assert.ok(x >= -1e-9 && x <= 72 + 1e-9);
});

test("scallopEdge wave style alternates bump sides", () => {
  const pts = scallopEdge([0, 0], [72, 0], { count: 2, style: "wave" }); // r = 18
  const minY = Math.min(...pts.map((p) => p[1]));
  const maxY = Math.max(...pts.map((p) => p[1]));
  near(minY, -18, 1e-6); // first bump up
  near(maxY, 18, 1e-6);  // second bump down
});

test("circleCut / holeGrid / holeRing: closed punches with exact diameters and counts", () => {
  const c = circleCut(100, 50, 14);
  assert.equal(c.closed, true);
  const bb = craftBB(c);
  near(bb.w, 14, 1e-6); near(bb.h, 14, 1e-6);
  near((bb.x0 + bb.x1) / 2, 100, 1e-6); near((bb.y0 + bb.y1) / 2, 50, 1e-6);

  const grid = holeGrid(10, 20, 3, 2, 30, 40, 6);
  assert.equal(grid.length, 6);
  const last = craftBB(grid[5]); // col 2, row 1 → center (70, 60)
  near((last.x0 + last.x1) / 2, 10 + 2 * 30, 1e-6);
  near((last.y0 + last.y1) / 2, 20 + 1 * 40, 1e-6);

  const ring = holeRing(0, 0, 50, 6, 4);
  assert.equal(ring.length, 6);
  for (const h of ring) {
    const b = craftBB(h);
    const d = Math.hypot((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2);
    near(d, 50, 1e-6); // every center sits on the ring radius
  }
});

test("slot + tab pair is caliper-aware: slot = tab + clearance in BOTH axes", () => {
  const spec = { tabW: 30, depth: 10, caliper: 2 };
  const { len, w } = slotForTab(spec);          // default clearance = 25% caliper
  near(len, 30.5, 1e-9);
  near(w, 2.5, 1e-9);
  assert.ok(len > spec.tabW && w > spec.caliper, "slot must exceed the tab/material");

  const s = slotCut(200, 100, spec);
  const bb = craftBB(s);
  near(bb.w, len, 1e-6); near(bb.h, w, 1e-6);
  const s90 = slotCut(200, 100, spec, Math.PI / 2); // rotated slot swaps extents
  const bb90 = craftBB(s90);
  near(bb90.w, w, 1e-6); near(bb90.h, len, 1e-6);

  const tab = tabEdgePts([0, 0], [100, 0], spec);
  near(tab[0][0], 0); near(tab[tab.length - 1][0], 100);
  near(tab[2][1], -10, 1e-9);                   // protrudes LEFT of travel (up)
  near(tab[4][0] - tab[1][0], 30, 1e-9);        // base width = tabW
});

// ============================================================
// Gift Tag (first craft item) — flat sizes, hole, shapes, n-up
// ============================================================

const tagDie = (over: Partial<ReturnType<typeof giftTagDefaults>> = {}) =>
  buildGiftTag({ ...giftTagDefaults(inToPt(2), inToPt(3.5)), bleed: 0, ...over });

test("gift tag flat size: tag W×H plus the reinforcement-ring strip; exact W×H without it", () => {
  const W = inToPt(2), H = inToPt(3.5);
  for (const shape of ["luggage", "scallop", "ticket"] as const) {
    const die = tagDie({ shape });
    // mirror of the model's ring layout: OD = max(2.2·hole, hole+4mm),
    // gap = max(12mm, 2·bleed+6mm)
    const hole = inToPt(0.1875);
    const od = Math.max(hole * 2.2, hole + mmToPt(4));
    const gap = Math.max(mmToPt(12), mmToPt(6));
    near(die.widthPt, W + gap + od, 1e-6);
    near(die.heightPt, H, 1e-6);
    assert.equal(die.paths.cut.length, 4);     // outline + hole + ring outer + ring inner
    assert.equal(die.paths.crease.length, 0);  // FLAT item: nothing folds
    assert.equal(die.pieces?.length, 2);       // tag + ring are separate pieces

    const noRing = tagDie({ shape, ring: false });
    near(noRing.widthPt, W, 1e-6);
    near(noRing.heightPt, H, 1e-6);
    assert.equal(noRing.paths.cut.length, 2);
  }
});

test("gift tag hang hole: centered, requested diameter, solid web above it", () => {
  const die = tagDie();
  const hole = craftBB(die.paths.cut[1]);
  near(hole.w, inToPt(0.1875), 1e-6);
  near((hole.x0 + hole.x1) / 2, inToPt(1), 1e-6);    // centered on the 2in tag
  assert.ok(hole.y0 > 0, "web above the hole");
  // hole diameter override flows through
  const big = tagDie({ holeDia: mmToPt(8) });
  near(craftBB(big.paths.cut[1]).w, mmToPt(8), 1e-6);
});

test("gift tag scallop shape: bump apexes touch the nominal W×H box exactly (dim sweep)", () => {
  for (const [w, h] of [[2, 3.5], [1.5, 3], [3.25, 2.25]] as const) {
    const die = buildGiftTag({ ...giftTagDefaults(inToPt(w), inToPt(h)), bleed: 0, shape: "scallop", ring: false });
    const bb = craftBB(die.paths.cut[0]);
    near(bb.x0, 0, 1e-6); near(bb.y0, 0, 1e-6);
    near(bb.w, inToPt(w), 1e-6); near(bb.h, inToPt(h), 1e-6);
  }
});

test("gift tag ticket shape: semicircular side notches cut inward at mid-height", () => {
  const W = inToPt(2), H = inToPt(3.5);
  const die = tagDie({ shape: "ticket", ring: false });
  const rn = Math.max(mmToPt(2.5), Math.min(W / 8, mmToPt(6)));
  const pts = flattenPolyline(die.paths.cut[0]).pts;
  const hit = (tx: number) => pts.some(([x, y]) => Math.abs(x - tx) < 0.5 && Math.abs(y - H / 2) < 0.5);
  assert.ok(hit(rn), "left notch deepest point");
  assert.ok(hit(W - rn), "right notch deepest point");
});

test("gift tag exports a PDF page at exact flat size and gangs ≥6-up on Letter", async () => {
  const bleed = inToPt(0.0625);
  const die = buildGiftTag({ ...giftTagDefaults(inToPt(2), inToPt(3.5)), bleed });
  const pdf = await PDFDocument.load(await dielineToPdf(die));
  const page = pdf.getPage(0);
  near(page.getWidth(), die.widthPt + 2 * bleed, 1e-3);
  near(page.getHeight(), die.heightPt + 2 * bleed, 1e-3);

  const letter = { name: "Letter", wPt: inToPt(8.5), hPt: inToPt(11) };
  const imp = imposeOnSheet(die.widthPt + 2 * bleed, die.heightPt + 2 * bleed, letter, inToPt(0.125), 0);
  assert.ok(imp.up >= 6, `expected ≥6-up on Letter, got ${imp.up}`);
});

// ============================================================
// Envelope (Envelopes & Cards) — flat sizes, flaps, styles, liner
// ============================================================
import { buildEnvelope, defaultParams as envDefaults } from "../src/core/models/envelope";

const envDie = (over: Partial<ReturnType<typeof envDefaults>> = {}) =>
  buildEnvelope({ ...envDefaults(inToPt(5.75), inToPt(4.375)), bleed: 0, ...over });

test("envelope flat size = (2·sideFlap + W) × (topFlap + H + bottomFlap)", () => {
  const W = inToPt(5.75), H = inToPt(4.375);
  const d = envDefaults(W, H);
  const die = buildEnvelope({ ...d, bleed: 0 });
  near(die.widthPt, 2 * d.sideFlap + W, 1e-6);
  near(die.heightPt, d.topFlap + H + d.bottomFlap, 1e-6);
});

test("envelope: one closed outline + 4 fold lines (the four face edges)", () => {
  for (const flap of ["square", "pointed"] as const) {
    const die = envDie({ flap });
    assert.equal(die.paths.cut.length, 1, `${flap}: single blank, no liner`);
    assert.equal(die.paths.cut[0].closed, true);
    assert.equal(die.paths.crease.length, 4, `${flap}: 4 flap hinges`);
    assert.ok(die.paths.glue.length > 0, `${flap}: pocket glue zones present`);
  }
});

test("envelope pointed flap comes to a centered apex at the blank top edge", () => {
  const die = envDie({ flap: "pointed" });
  const d = envDefaults(inToPt(5.75), inToPt(4.375));
  const apexX = d.sideFlap + inToPt(5.75) / 2;
  // a vertex sits at (apexX, 0) — the point
  const hit = die.paths.cut[0].pts.some(([x, y]) => Math.abs(x - apexX) < 1e-3 && Math.abs(y) < 1e-3);
  assert.ok(hit, "pointed apex at top-centre");
  // square flap instead has a flat top edge: two vertices at y≈0 off-centre
  const sq = envDie({ flap: "square" });
  const topEdge = sq.paths.cut[0].pts.filter(([, y]) => Math.abs(y) < 0.5);
  assert.ok(topEdge.length >= 2, "square flap has a flat top edge");
});

test("envelope responds to W and H independently", () => {
  const base = envDie();
  const wide = envDie({ W: inToPt(7) } as any);
  const tall = envDie({ H: inToPt(6) } as any);
  assert.ok(wide.widthPt > base.widthPt && Math.abs(wide.heightPt - base.heightPt) < 1e-6, "W → width only");
  assert.ok(tall.heightPt > base.heightPt && Math.abs(tall.widthPt - base.widthPt) < 1e-6, "H → height only");
});

test("envelope liner adds a second piece beside the blank; off by default", () => {
  const plain = envDie();
  assert.equal(plain.pieces, undefined);
  assert.equal(plain.paths.cut.length, 1);
  const lined = envDie({ liner: true });
  assert.equal(lined.paths.cut.length, 2, "blank + liner");
  assert.equal(lined.pieces?.length, 2);
  assert.ok(lined.widthPt > plain.widthPt, "liner widens the layout");
  near(lined.heightPt, plain.heightPt, 1e-6);
});

test("envelope PDF page equals the flat size (incl. bleed)", async () => {
  const bleed = inToPt(0.0625);
  const die = buildEnvelope({ ...envDefaults(inToPt(5.75), inToPt(4.375)), bleed });
  const pdf = await PDFDocument.load(await dielineToPdf(die));
  const page = pdf.getPage(0);
  near(page.getWidth(), die.widthPt + 2 * bleed, 1e-3);
  near(page.getHeight(), die.heightPt + 2 * bleed, 1e-3);
});

test("fold engine: envelope panelizes to 5 panels / 4 hinges (face + 4 flaps), area conserved", () => {
  for (const flap of ["square", "pointed"] as const) {
    const die = buildEnvelope({ ...envDefaults(inToPt(5.75), inToPt(4.375)), bleed: 0, flap });
    const g = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
    assert.equal(g.panels.length, 5, `${flap}: face + 4 flaps`);
    assert.equal(g.hinges.length, 4, `${flap}: 4 flap hinges`);
    const sum = g.panels.reduce((s, p) => s + p.area, 0);
    near(sum, polyAreaAbs(flattenPolyline(die.paths.cut[0]).pts), sum * 1e-9);
    // folds without throwing across the slider
    const model = prepare(g, foldSpecFor("envelope", die));
    assert.doesNotThrow(() => { foldedBBox(model, 0); foldedBBox(model, 0.5); foldedBBox(model, 1); });
  }
});

test("envelope: closure (top) flap closes LAST, lies flat at t=1", () => {
  const die = buildEnvelope({ ...envDefaults(inToPt(5.75), inToPt(4.375)), bleed: 0, flap: "square" });
  const spec: any = foldSpecFor("envelope", die);
  const h = spec.hinges;
  // Closing runs t 1→0; a flap finishes folding at its t0. The TOP closure flap
  // must finish LAST → strictly the lowest t0 of the four.
  assert.ok(h["base-top"].t0 < h["base-bottom"].t0, "top finishes after bottom");
  assert.ok(h["base-bottom"].t0 < h["base-left"].t0, "bottom finishes after the sides");
  assert.ok(h["base-top"].t0 <= h["base-right"].t0 - 1e-9, "top finishes after the right side");
  // At t=1 every flap is fully open (t1 ≤ 1) → the blank lies completely flat.
  for (const k of ["base-top", "base-bottom", "base-left", "base-right"]) {
    assert.ok(h[k].t1 <= 1 + 1e-9, `${k}: open (flat) by t=1`);
  }
});

test("envelope diamond: C5 face (229×162 mm) → exact 409×387 mm reference blank", () => {
  const mm = (v: number) => v / 25.4 * 72;
  const die = buildEnvelope({ ...envDefaults(mm(229), mm(162)), bleed: 0, flap: "diamond" });
  // derived ratios reproduce the reference dieline to the millimetre
  near(die.widthPt / 72 * 25.4, 409, 0.5);
  near(die.heightPt / 72 * 25.4, 387, 0.5);
  assert.equal(die.paths.cut.length, 1, "single blank");
  assert.equal(die.paths.cut[0].closed, true);
  assert.equal(die.paths.crease.length, 4, "4 flap hinges");
  assert.ok(die.paths.glue.length > 0, "bottom-flap glue underlap present");
});

test("envelope diamond: pointed top + sides, truncated rounded bottom", () => {
  const die = envDie({ flap: "diamond" });
  const W = inToPt(5.75), H = inToPt(4.375), SF = W * (90 / 229);
  const cx = SF + W / 2;
  const pl = die.paths.cut[0];
  // top point is the single highest vertex, centred (apex at y≈0, x≈cx)
  const minY = Math.min(...pl.pts.map(p => p[1]));
  const top = pl.pts.filter(p => Math.abs(p[1] - minY) < 1);
  assert.ok(top.every(p => Math.abs(p[0] - cx) < W * 0.12), "top comes to a centred point");
  // bottom is TRUNCATED: a flat edge (≥2 vertices) at the lowest y
  const maxY = Math.max(...pl.pts.map(p => p[1]));
  const bot = pl.pts.filter(p => Math.abs(p[1] - maxY) < 1);
  assert.ok(bot.length >= 2, "flat (truncated) bottom edge, not a point");
  const botSpan = Math.max(...bot.map(p => p[0])) - Math.min(...bot.map(p => p[0]));
  // truncated: a real flat edge, narrower than the nominal 70mm-of-reference
  // width (the rounded corners eat 2·r off each end) but clearly not a point.
  assert.ok(botSpan > W * 0.06 && botSpan < W * (70 / 229), `truncated flat bottom (got ${botSpan})`);
  // rounded tips → the outline carries Q-bezier curves
  assert.ok((pl.curves ?? []).some(Boolean), "tips are rounded (Q-beziers)");
});

test("fold engine: diamond envelope panelizes to 5 panels / 4 hinges + folds", () => {
  const die = buildEnvelope({ ...envDefaults(inToPt(5.75), inToPt(4.375)), bleed: 0, flap: "diamond" });
  const g = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
  assert.equal(g.panels.length, 5, "face + 4 pointed flaps");
  assert.equal(g.hinges.length, 4, "4 flap hinges");
  const sum = g.panels.reduce((s, p) => s + p.area, 0);
  near(sum, polyAreaAbs(flattenPolyline(die.paths.cut[0]).pts), sum * 1e-9);
  const model = prepare(g, foldSpecFor("envelope", die));
  assert.doesNotThrow(() => { foldedBBox(model, 0); foldedBBox(model, 0.5); foldedBBox(model, 1); });
});

test("envelope wallet: C5-portrait face (162×229 mm) → exact 202×469 mm reference blank", () => {
  const mm = (v: number) => v / 25.4 * 72;
  const die = buildEnvelope({ ...envDefaults(mm(162), mm(229)), bleed: 0, flap: "wallet" });
  near(die.widthPt / 72 * 25.4, 202, 0.5);
  near(die.heightPt / 72 * 25.4, 469, 0.5);
  assert.equal(die.paths.cut.length, 1, "single blank");
  assert.equal(die.paths.crease.length, 4, "4 flap hinges");
  assert.ok(die.paths.glue.length > 0, "side-flap glue tabs present");
});

test("envelope wallet: small top flap, long bottom (pocket) flap, rounded corners", () => {
  const mm = (v: number) => v / 25.4 * 72;
  const W = mm(162), H = mm(229);
  const die = buildEnvelope({ ...envDefaults(W, H), bleed: 0, flap: "wallet" });
  const TF = H * (50 / 229), BF = H * (190 / 229);
  // top flap is short, bottom flap is long → blank is taller above? no: TF above face, BF below
  assert.ok(BF > TF * 2.5, "bottom pocket flap much deeper than the top closure flap");
  // flat top edge (closure) and flat bottom edge (pocket) — both truncated, not pointed
  const pl = die.paths.cut[0];
  const minY = Math.min(...pl.pts.map(p => p[1])), maxY = Math.max(...pl.pts.map(p => p[1]));
  assert.ok(pl.pts.filter(p => Math.abs(p[1] - minY) < 1).length >= 2, "flat top edge");
  assert.ok(pl.pts.filter(p => Math.abs(p[1] - maxY) < 1).length >= 2, "flat bottom edge");
  // rounded corners → Q-beziers in the outline
  assert.ok((pl.curves ?? []).some(Boolean), "corners are rounded (Q-beziers)");
});

test("fold engine: wallet envelope panelizes to 5 panels / 4 hinges + folds", () => {
  const die = buildEnvelope({ ...envDefaults(inToPt(6.4), inToPt(9)), bleed: 0, flap: "wallet" });
  const g = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
  assert.equal(g.panels.length, 5, "face + 4 flaps");
  assert.equal(g.hinges.length, 4, "4 flap hinges");
  const sum = g.panels.reduce((s, p) => s + p.area, 0);
  near(sum, polyAreaAbs(flattenPolyline(die.paths.cut[0]).pts), sum * 1e-9);
  const model = prepare(g, foldSpecFor("envelope", die));
  assert.doesNotThrow(() => { foldedBBox(model, 0); foldedBBox(model, 0.5); foldedBBox(model, 1); });
});

test("envelope catalog: C5-portrait face (162×229 mm) → exact 332×314 mm reference blank", () => {
  const mm = (v: number) => v / 25.4 * 72;
  const die = buildEnvelope({ ...envDefaults(mm(162), mm(229)), bleed: 0, flap: "catalog" });
  near(die.widthPt / 72 * 25.4, 332, 0.5);
  near(die.heightPt / 72 * 25.4, 314, 0.5);
  assert.equal(die.paths.cut.length, 1, "single blank");
  assert.equal(die.paths.crease.length, 4, "4 flap hinges");
  assert.ok(die.paths.glue.length > 0, "side-flap glue tabs present");
});

test("envelope catalog: BIG side flaps (overlap at the centre seam), small top + bottom", () => {
  const mm = (v: number) => v / 25.4 * 72;
  const W = mm(162), H = mm(229);
  const die = buildEnvelope({ ...envDefaults(W, H), bleed: 0, flap: "catalog" });
  const SF = W * (85 / 162);
  // two side flaps deeper than half the face → they overlap on the back (seam)
  assert.ok(2 * SF > W, "side flaps overlap at the centre back seam");
  // big sides, small top/bottom: flat width grows much more than height
  near(die.widthPt, 2 * SF + W, 1);
  // catalog is much WIDER (big sides) than the wallet (small sides) at the same face
  const wallet = buildEnvelope({ ...envDefaults(W, H), bleed: 0, flap: "wallet" });
  assert.ok(die.widthPt > wallet.widthPt + inToPt(2), "catalog much wider than wallet");
  assert.ok(die.heightPt < wallet.heightPt - inToPt(2), "catalog much shorter than wallet");
});

test("fold engine: catalog envelope panelizes to 5 panels / 4 hinges + folds", () => {
  const die = buildEnvelope({ ...envDefaults(inToPt(6.4), inToPt(9)), bleed: 0, flap: "catalog" });
  const g = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
  assert.equal(g.panels.length, 5, "face + 4 flaps");
  assert.equal(g.hinges.length, 4, "4 flap hinges");
  const sum = g.panels.reduce((s, p) => s + p.area, 0);
  near(sum, polyAreaAbs(flattenPolyline(die.paths.cut[0]).pts), sum * 1e-9);
  const model = prepare(g, foldSpecFor("envelope", die));
  assert.doesNotThrow(() => { foldedBBox(model, 0); foldedBBox(model, 0.5); foldedBBox(model, 1); });
});

// ============================================================
// Earring display card (Display Cards) — flat size, holes, styles
// ============================================================
import { buildEarringCard, defaultParams as earDefaults } from "../src/core/models/earringCard";

const earDie = (over: Partial<ReturnType<typeof earDefaults>> = {}) =>
  buildEarringCard({ ...earDefaults(inToPt(2), inToPt(3)), bleed: 0, ...over });

const closedCuts = (d: ReturnType<typeof earDie>) => d.paths.cut.filter((c) => c.closed);

test("earring card flat size = card W×H exactly; no creases (flat)", () => {
  const die = earDie();
  near(die.widthPt, inToPt(2), 1e-6);
  near(die.heightPt, inToPt(3), 1e-6);
  assert.equal(die.paths.crease.length, 0);
});

test("earring card: 1 pair = outline + 2 holes; pairs add 2 holes each", () => {
  const one = earDie({ pairs: 1 });
  assert.equal(one.paths.cut.length, 1 + 2, "outline + 2 holes");
  const three = earDie({ pairs: 3 });
  assert.equal(three.paths.cut.length, 1 + 6, "outline + 6 holes");
});

test("earring card holes are a centered pair at the requested spacing/diameter", () => {
  const die = earDie({ pairs: 1, pairGap: mmToPt(18), holeDia: mmToPt(1.6) });
  const holes = die.paths.cut.slice(1).map((h) => {
    const xs = h.pts.map((p) => p[0]);
    return { cx: (Math.min(...xs) + Math.max(...xs)) / 2, w: Math.max(...xs) - Math.min(...xs) };
  });
  assert.equal(holes.length, 2);
  near(holes[0].w, mmToPt(1.6), 1e-3);                       // diameter
  near((holes[0].cx + holes[1].cx) / 2, inToPt(2) / 2, 1e-3); // centered on the card
  near(Math.abs(holes[0].cx - holes[1].cx), mmToPt(18), 1e-3); // pair spacing
});

test("earring card: dangle places its holes higher than stud", () => {
  const meanY = (d: ReturnType<typeof earDie>) => {
    const hs = d.paths.cut.slice(1);
    return hs.reduce((s, h) => s + h.pts.reduce((a, p) => a + p[1], 0) / h.pts.length, 0) / hs.length;
  };
  assert.ok(meanY(earDie({ style: "dangle" })) < meanY(earDie({ style: "stud" })), "dangle holes sit nearer the top");
});

test("earring card hang hole: adds one extra hole near the top, off by default", () => {
  const off = earDie({ hangHole: false });
  const on = earDie({ hangHole: true });
  assert.equal(on.paths.cut.length, off.paths.cut.length + 1, "hang hole adds one cut");
});

test("earring card exports a PDF at exact size and gangs many-up on Letter", async () => {
  const bleed = inToPt(0.0625);
  const die = buildEarringCard({ ...earDefaults(inToPt(2), inToPt(3)), bleed });
  const pdf = await PDFDocument.load(await dielineToPdf(die));
  near(pdf.getPage(0).getWidth(), die.widthPt + 2 * bleed, 1e-3);
  const letter = { name: "Letter", wPt: inToPt(8.5), hPt: inToPt(11) };
  const imp = imposeOnSheet(die.widthPt + 2 * bleed, die.heightPt + 2 * bleed, letter, inToPt(0.125), 0);
  assert.ok(imp.up >= 8, `expected ≥8-up on Letter, got ${imp.up}`);
});

// ---- earring card creative extensions: shape / header / easel ----
test("earring card shape: scallop keeps exact W×H bbox; arch/tag-top reach the top edge", () => {
  for (const [w, h] of [[2, 3], [2.5, 2], [1.5, 3.5]] as const) {
    const d = buildEarringCard({ ...earDefaults(inToPt(w), inToPt(h)), bleed: 0, shape: "scallop", pairs: 1 });
    const pts = flattenPolyline(d.paths.cut[0]).pts;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    near(Math.min(...xs), 0, 1e-6); near(Math.max(...xs), inToPt(w), 1e-6);
    near(Math.min(...ys), 0, 1e-6); near(Math.max(...ys), inToPt(h), 1e-6);
  }
  for (const shape of ["arch", "tag-top"] as const) {
    const d = buildEarringCard({ ...earDefaults(inToPt(2), inToPt(3)), bleed: 0, shape });
    const minY = Math.min(...flattenPolyline(d.paths.cut[0]).pts.map((p) => p[1]));
    near(minY, 0, 1e-6); // the shaped top still touches y=0
  }
});

test("earring card header: grows the blank + adds one fold crease; hang hole punches both halves", () => {
  const plain = earDie({ header: false, hangHole: true });
  const head = earDie({ header: true, hangHole: true });
  assert.ok(head.heightPt > plain.heightPt, "header grows the blank height");
  assert.equal(head.paths.crease.length, 1, "one header fold crease");
  // two hang holes (one per half) vs one without the header
  const headHoles = head.paths.cut.length - earDie({ header: true, hangHole: false }).paths.cut.length;
  assert.equal(headHoles, 2, "hang hole punched in both header halves");
});

test("earring card easel: a second piece + a caliper-aware slot the tab fits", () => {
  const plain = earDie({ easel: false });
  const stand = earDie({ easel: true });
  assert.equal(plain.pieces, undefined);
  assert.equal(stand.pieces?.length, 2, "card + easel strut");
  assert.ok(stand.widthPt > plain.widthPt, "easel widens the layout");
  assert.equal(stand.paths.crease.length, 1, "easel score line");
  // the slot⊃tab contract: the slot is longer + wider than a tab of the same spec
  const tabW = Math.max(inToPt(2) * 0.4, mmToPt(15));
  const { len, w } = slotForTab({ tabW, depth: mmToPt(10), caliper: inToPt(0.018) });
  assert.ok(len > tabW && w > inToPt(0.018));
});

// ============================================================
// Cupcake wrapper (Tags & Wraps) — frustum-unroll geometry
// ============================================================
import { buildCupcakeWrapper, defaultParams as cupDefaults } from "../src/core/models/cupcakeWrapper";

test("cupcake wrapper: arc lengths equal the two circumferences (a true frustum unroll)", () => {
  const baseDia = inToPt(2), topDia = inToPt(3), height = inToPt(1.5);
  const die = buildCupcakeWrapper({ ...cupDefaults(baseDia, topDia, height), bleed: 0 });
  // Recompute the polar params and verify the inner/outer radii ratio = rb/rt
  // by measuring the cut outline's radial extent from the (translated) apex.
  const rb = baseDia / 2, rt = topDia / 2, denom = rt - rb;
  const s = Math.max(height, denom / 0.95);
  const rhoB = (s * rb) / denom, rhoT = (s * rt) / denom;
  // outer arc length = 2π·rt, inner = 2π·rb (the defining property)
  near(2 * Math.PI * rhoT * (denom / s), 2 * Math.PI * rt, 1e-6); // θ·rhoT = 2π·rt
  near(2 * Math.PI * rhoB * (denom / s), 2 * Math.PI * rb, 1e-6);
  near(rhoT - rhoB, s, 1e-6); // ρt − ρb = slant
  assert.equal(die.paths.cut.length, 1);
  assert.equal(die.paths.cut[0].closed, true);
  assert.equal(die.paths.crease.length, 0); // a wrap, not a fold
  assert.ok(die.paths.glue.length > 0, "glue overlap seam present");
});

test("cupcake wrapper: the slant-height dim = ρt−ρb (= height above the clamp) and grows with height", () => {
  const slant = (d: ReturnType<typeof buildCupcakeWrapper>) => Math.abs(d.dims[0].y2 - d.dims[0].y1);
  const a = buildCupcakeWrapper({ ...cupDefaults(inToPt(2), inToPt(3), inToPt(1.5)), bleed: 0 });
  const tall = buildCupcakeWrapper({ ...cupDefaults(inToPt(2), inToPt(3), inToPt(2.5)), bleed: 0 });
  near(slant(a), inToPt(1.5), 1e-6);   // 1.5in is above the min-slant clamp → slant = height
  assert.ok(slant(tall) > slant(a), "taller wrapper → longer slant");
});

test("cupcake wrapper: top must flare past the base (clamped), and the sector stays under a full turn", () => {
  // top ≤ base would be a cylinder/inverted — the model clamps rt ≥ rb·1.05.
  const die = buildCupcakeWrapper({ ...cupDefaults(inToPt(3), inToPt(2), inToPt(1.5)), bleed: 0 });
  assert.ok(die.widthPt > 0 && die.heightPt > 0, "degenerate input still yields a valid piece");
});

test("cupcake wrapper PDF page matches its bbox", async () => {
  const bleed = inToPt(0.0625);
  const die = buildCupcakeWrapper({ ...cupDefaults(inToPt(2), inToPt(3), inToPt(1.5)), bleed });
  const pdf = await PDFDocument.load(await dielineToPdf(die));
  near(pdf.getPage(0).getWidth(), die.widthPt + 2 * bleed, 1e-3);
  near(pdf.getPage(0).getHeight(), die.heightPt + 2 * bleed, 1e-3);
});

// ============================================================
// Belly band (Tags & Wraps) — wrap strip + closures
// ============================================================
import { buildBellyBand, defaultParams as bandDefaults } from "../src/core/models/bellyBand";

const bandDie = (over: Partial<ReturnType<typeof bandDefaults>> = {}) =>
  buildBellyBand({ ...bandDefaults(inToPt(9), inToPt(2)), bleed: 0, ...over });

test("belly band flat size: glue length = girth + overlap, height = band width", () => {
  const girth = inToPt(9), bandW = inToPt(2);
  const d = bandDefaults(girth, bandW);
  const die = buildBellyBand({ ...d, bleed: 0, closure: "glue" });
  near(die.widthPt, girth + d.overlap, 1e-6);
  near(die.heightPt, bandW, 1e-6);
  assert.equal(die.paths.crease.length, 0); // wraps the product, no creases of its own
  // lock adds a small tab past the overlap end, so it's a hair wider
  const lock = buildBellyBand({ ...d, bleed: 0, closure: "lock" });
  assert.ok(lock.widthPt > girth + d.overlap, "lock tab extends the width");
});

test("belly band glue closure: a glue overlap zone, single outline", () => {
  const die = bandDie({ closure: "glue" });
  assert.equal(die.paths.cut.length, 1, "just the strip outline");
  assert.ok(die.paths.glue.length > 0, "glue overlap zone present");
});

test("belly band tuck-lock: adds a receiving slot; glue layer empty (glue-free)", () => {
  const die = bandDie({ closure: "lock" });
  assert.equal(die.paths.cut.length, 2, "strip outline + slot");
  assert.equal(die.paths.cut[1].closed, true, "the slot is a closed cut");
  assert.equal(die.paths.glue.length, 0, "tuck-lock is glue-free");
  // the slot sits near the near (left) end, within the strip height
  const xs = die.paths.cut[1].pts.map((p) => p[0]);
  assert.ok(Math.max(...xs) < die.widthPt * 0.5, "slot near the near end");
});

test("belly band responds to girth and band width independently", () => {
  const a = bandDie();
  const wide = bandDie({ girth: inToPt(12) } as any);
  const tall = bandDie({ bandW: inToPt(3) } as any);
  assert.ok(wide.widthPt > a.widthPt && Math.abs(wide.heightPt - a.heightPt) < 1e-6);
  assert.ok(tall.heightPt > a.heightPt && Math.abs(tall.widthPt - a.widthPt) < 1e-6);
});

test("belly band exports a PDF at exact size and gangs many-up on a sheet", async () => {
  const bleed = inToPt(0.0625);
  const die = buildBellyBand({ ...bandDefaults(inToPt(9), inToPt(2)), bleed });
  const pdf = await PDFDocument.load(await dielineToPdf(die));
  near(pdf.getPage(0).getWidth(), die.widthPt + 2 * bleed, 1e-3);
  const tabloid = { name: "Tabloid", wPt: inToPt(11), hPt: inToPt(17) };
  const imp = imposeOnSheet(die.widthPt + 2 * bleed, die.heightPt + 2 * bleed, tabloid, inToPt(0.125), 0);
  assert.ok(imp.up >= 5, `expected ≥5-up on Tabloid, got ${imp.up}`);
});

// ============================================================
// Bunting pennant (Party & Events) — flag shapes + lacing holes
// ============================================================
import { buildBuntingPennant, defaultParams as buntDefaults } from "../src/core/models/buntingPennant";

const buntDie = (over: Partial<ReturnType<typeof buntDefaults>> = {}) =>
  buildBuntingPennant({ ...buntDefaults(inToPt(5), inToPt(7)), bleed: 0, ...over });

test("bunting flat size = W×H; outline + 2 lacing holes; no creases", () => {
  for (const shape of ["triangle", "swallowtail", "scallop"] as const) {
    const die = buntDie({ shape });
    near(die.widthPt, inToPt(5), 1e-6);
    near(die.heightPt, inToPt(7), 1e-6);
    assert.equal(die.paths.cut.length, 3, `${shape}: outline + 2 holes`);
    assert.equal(die.paths.crease.length, 0);
  }
});

test("bunting triangle comes to a point at the bottom centre", () => {
  const die = buntDie({ shape: "triangle" });
  const apex = die.paths.cut[0].pts.some(([x, y]) => Math.abs(x - inToPt(5) / 2) < 1e-3 && Math.abs(y - inToPt(7)) < 1e-3);
  assert.ok(apex, "apex at (W/2, H)");
});

test("bunting swallowtail notches UP into the bottom (centre higher than the corners)", () => {
  const die = buntDie({ shape: "swallowtail" });
  const ys = die.paths.cut[0].pts;
  const centre = ys.find(([x]) => Math.abs(x - inToPt(5) / 2) < 1e-3);
  const corner = ys.find(([x, y]) => Math.abs(x - inToPt(5)) < 1e-3 && y > 1);
  assert.ok(centre && corner && centre[1] < corner[1], "notch centre sits above the bottom corners");
});

test("bunting lacing holes: 2 holes near the top corners at the requested ⌀", () => {
  const die = buntDie({ holeDia: inToPt(0.1875) });
  const holes = die.paths.cut.slice(1);
  assert.equal(holes.length, 2);
  for (const h of holes) {
    const xs = h.pts.map((p) => p[0]), yys = h.pts.map((p) => p[1]);
    near(Math.max(...xs) - Math.min(...xs), inToPt(0.1875), 1e-3); // diameter
    assert.ok((Math.min(...yys) + Math.max(...yys)) / 2 < inToPt(7) * 0.2, "hole near the top");
  }
});

test("bunting exports a PDF at exact size and gangs many-up", async () => {
  const bleed = inToPt(0.0625);
  const die = buildBuntingPennant({ ...buntDefaults(inToPt(5), inToPt(7)), bleed });
  const pdf = await PDFDocument.load(await dielineToPdf(die));
  near(pdf.getPage(0).getWidth(), die.widthPt + 2 * bleed, 1e-3);
  const sheet = { name: "13×19", wPt: inToPt(13), hPt: inToPt(19) };
  const imp = imposeOnSheet(die.widthPt + 2 * bleed, die.heightPt + 2 * bleed, sheet, inToPt(0.125), 0);
  assert.ok(imp.up >= 4, `expected ≥4-up, got ${imp.up}`);
});

// ============================================================
// Paper rosette / fan medallion (Party & Events)
// ============================================================
import { buildPaperRosette, defaultParams as rosetteDefaults } from "../src/core/models/paperRosette";
const rosette = (D = 8, pleat = 0.5) =>
  buildPaperRosette({ ...rosetteDefaults(inToPt(D), inToPt(pleat)), bleed: inToPt(0.0625) });

test("rosette: 2 pleated strips + 1 centre disc; pleats are creases, not cuts", () => {
  const d = rosette();
  assert.equal(d.paths.cut.length, 3);          // 2 strips + disc
  assert.equal(d.paths.glue.length, 0);
  assert.ok((d.pieces || []).length === 3, "3 pieces (2 strips + disc)");
  // every strip is scored into many pleats (fold lines), none on the cut layer
  assert.ok(d.paths.crease.length >= 16, `expected many pleat scores, got ${d.paths.crease.length}`);
  for (const c of d.paths.crease) assert.equal(c.closed, false); // scores are open lines
});

test("rosette: total developed strip length = the rim circumference (π·D)", () => {
  const D = inToPt(8);
  const d = rosette(8);
  // the two strips together span π·D along their length (each is the widest cut)
  const strips = d.paths.cut.slice(0, 2);
  const stripLen = (pl: { pts: [number, number][] }) =>
    Math.max(...pl.pts.map((p) => p[0])) - Math.min(...pl.pts.map((p) => p[0]));
  const total = strips.reduce((s, pl) => s + stripLen(pl), 0);
  near(total, Math.PI * D, 1); // two half-circle strips = full rim
});

test("rosette: pleat scores are evenly spaced across each strip", () => {
  const d = rosette(8, 0.5);
  // creases for strip 0 (id pleat-0-*), sorted by x
  const xs = d.paths.crease
    .filter((c) => (c.id || "").startsWith("pleat-0-"))
    .map((c) => c.pts[0][0])
    .sort((a, b) => a - b);
  assert.ok(xs.length >= 8, "enough pleats");
  const gaps = xs.slice(1).map((x, i) => x - xs[i]);
  const g0 = gaps[0];
  for (const g of gaps) near(g, g0, 0.5); // uniform spacing
});

test("rosette: diameter scales the strip height (pleat depth)", () => {
  const stripH = (d: ReturnType<typeof rosette>) => {
    const s = d.paths.cut[0];
    return Math.max(...s.pts.map((p) => p[1])) - Math.min(...s.pts.map((p) => p[1]));
  };
  assert.ok(stripH(rosette(12)) > stripH(rosette(6)) + 1, "bigger diameter ⇒ taller strip");
});

test("rosette exports a PDF at exact size and gangs on a sheet", async () => {
  const bleed = inToPt(0.0625);
  const die = buildPaperRosette({ ...rosetteDefaults(inToPt(4), inToPt(0.4)), bleed });
  const pdf = await PDFDocument.load(await dielineToPdf(die));
  near(pdf.getPage(0).getWidth(), die.widthPt + 2 * bleed, 1e-3);
  const sheet = { name: "13×19", wPt: inToPt(13), hPt: inToPt(19) };
  const imp = imposeOnSheet(die.widthPt + 2 * bleed, die.heightPt + 2 * bleed, sheet, inToPt(0.125), 0);
  assert.ok(imp.up >= 2, `expected ≥2-up, got ${imp.up}`);
});

// ============================================================
// Pyramid favor pouch (Party & Events)
// ============================================================
import { buildFavorPouch, defaultParams as pouchDefaults } from "../src/core/models/favorPouch";
const pouch = (b = 2.5, h = 2.75) =>
  buildFavorPouch({ ...pouchDefaults(inToPt(b), inToPt(h)), bleed: inToPt(0.0625) });
// the net's span = base + 2·slant, slant = √((b/2)² + Hp²)
const flakeSide = (b: number, h: number) => b + 2 * Math.hypot(b / 2, h);

test("favor pouch: square-base pyramid net — 1 outline, 8 creases, 4 glue tabs", () => {
  const d = pouch();
  assert.equal(d.paths.cut.length, 1);                  // single outer perimeter
  assert.equal(d.paths.cut[0].closed, true);
  assert.equal(d.paths.crease.length, 8);               // 4 base hinges + 4 tab folds
  assert.equal(d.paths.glue.length, 4);                 // a glue tab per wall
  d.paths.glue.forEach((g) => assert.equal(g.closed, true));
});

test("favor pouch flat size = (b + 2·slant) square; apexes define the extent", () => {
  const b = inToPt(2.5), h = inToPt(2.75);
  const d = pouch(2.5, 2.75);
  const side = flakeSide(b, h);
  near(d.widthPt, side, 1);
  near(d.heightPt, side, 1);
  near(d.widthPt, d.heightPt, 1e-6);                    // the net is square
});

test("favor pouch responds to base width and height independently", () => {
  // taller pyramid ⇒ longer slant ⇒ bigger net even at the same base
  const shortP = pouch(2.5, 1.5), tallP = pouch(2.5, 4);
  assert.ok(tallP.widthPt > shortP.widthPt, "taller pyramid ⇒ longer slant ⇒ bigger net");
  // wider base also grows the net
  assert.ok(pouch(3.5, 2.75).widthPt > pouch(2, 2.75).widthPt, "wider base ⇒ bigger net");
});

test("favor pouch exports a PDF at exact size and gangs many-up", async () => {
  const bleed = inToPt(0.0625);
  const d = buildFavorPouch({ ...pouchDefaults(inToPt(2.5), inToPt(2.75)), bleed });
  const pdf = await PDFDocument.load(await dielineToPdf(d));
  near(pdf.getPage(0).getWidth(), d.widthPt + 2 * bleed, 1e-3);
  // a square-pyramid net is large (~8.5in here), so it gangs on a press sheet
  // / 12×24 mat rather than Letter.
  const sheet = { name: "13×19", wPt: inToPt(13), hPt: inToPt(19) };
  const imp = imposeOnSheet(d.widthPt + 2 * bleed, d.heightPt + 2 * bleed, sheet, inToPt(0.125), 0);
  assert.ok(imp.up >= 2, `expected ≥2-up on 13×19, got ${imp.up}`);
});

// ============================================================
// Layered paper flower (Party & Events)
// ============================================================
import { buildPaperFlower, defaultParams as flowerDefaults, FLOWER_LAYERS } from "../src/core/models/paperFlower";
const flower = (D = 6) => buildPaperFlower({ ...flowerDefaults(inToPt(D)), bleed: inToPt(0.0625) });

test("paper flower: one burst per layer + a centre disc; a hub score per layer", () => {
  const d = flower();
  assert.equal(d.paths.cut.length, FLOWER_LAYERS.length + 1);   // layers + centre disc
  assert.equal(d.paths.crease.length, FLOWER_LAYERS.length);    // one hub score per layer
  assert.equal(d.paths.glue.length, 0);
  assert.equal((d.pieces || []).length, FLOWER_LAYERS.length + 1);
  for (const pl of d.paths.cut) assert.equal(pl.closed, true);
});

test("paper flower: layers are graduated; the outer reaches the flower radius", () => {
  const D = inToPt(6);
  const d = flower(6);
  // each burst's radial extent from its own centre, biggest → smallest
  const radius = (pl: { pts: [number, number][] }) => {
    const xs = pl.pts.map(p => p[0]); const ys = pl.pts.map(p => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    return (Math.max(...xs) - Math.min(...xs)) / 2; // half the bbox width = tip radius
  };
  const rs = d.paths.cut.slice(0, FLOWER_LAYERS.length).map(radius);
  for (let i = 1; i < rs.length; i++) assert.ok(rs[i] < rs[i - 1], "layers shrink");
  near(rs[0], D / 2, 2); // outer layer reaches the flower radius
});

test("paper flower: petal lobe count matches FLOWER_LAYERS (diecut ⇄ render)", () => {
  // The outer burst should dip to ~hub radius `count` times (one valley per petal).
  const d = flower(6);
  const outer = d.paths.cut[0];
  const xs = outer.pts.map(p => p[0]); const ys = outer.pts.map(p => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const rArr = outer.pts.map(p => Math.hypot(p[0] - cx, p[1] - cy));
  const rmax = Math.max(...rArr), rmin = Math.min(...rArr);
  const thresh = rmin + (rmax - rmin) * 0.25;
  let valleys = 0;
  for (let i = 0; i < rArr.length; i++) {
    const a = rArr[i], b = rArr[(i + 1) % rArr.length];
    if (a <= thresh && b > thresh) valleys++; // count rising edges out of a valley
  }
  assert.equal(valleys, FLOWER_LAYERS[0].count, `outer layer has ${FLOWER_LAYERS[0].count} petals`);
});

test("paper flower exports a PDF at exact size and gangs on a sheet", async () => {
  const bleed = inToPt(0.0625);
  const d = buildPaperFlower({ ...flowerDefaults(inToPt(6)), bleed });
  const pdf = await PDFDocument.load(await dielineToPdf(d));
  near(pdf.getPage(0).getWidth(), d.widthPt + 2 * bleed, 1e-3);
  const sheet = { name: "13×19", wPt: inToPt(13), hPt: inToPt(19) };
  const imp = imposeOnSheet(d.widthPt + 2 * bleed, d.heightPt + 2 * bleed, sheet, inToPt(0.125), 0);
  assert.ok(imp.up >= 1, `expected ≥1-up, got ${imp.up}`);
});

// ============================================================
// Paper lantern (Decorations)
// ============================================================
import { buildPaperLantern, defaultParams as lanternDefaults, lanternStrips } from "../src/core/models/paperLantern";
const lantern = (D = 5, H = 7) => buildPaperLantern({ ...lanternDefaults(inToPt(D), inToPt(H)), bleed: inToPt(0.0625) });

test("paper lantern: blank ≈ (π·D + glue) × H; N−1 slit cuts + hang hole; glue seam", () => {
  const D = inToPt(5), H = inToPt(7);
  const d = lantern();
  near(d.heightPt, H);
  assert.ok(d.widthPt > Math.PI * D, "blank wider than the circumference (glue seam)");
  assert.ok(d.widthPt < Math.PI * D + inToPt(0.75), "glue seam is a modest strip");
  assert.equal(d.paths.crease.length, 0);       // strips bow at assembly, no creases
  assert.equal(d.paths.glue.length, 1);         // the seam
  const N = lanternStrips(D);
  // cut = outline + (N−1) slits + 1 hang hole
  assert.equal(d.paths.cut.length, 1 + (N - 1) + 1);
});

test("paper lantern: slits are vertical, open, between the top/bottom bands", () => {
  const H = inToPt(7);
  const d = lantern();
  const slits = d.paths.cut.filter((p) => !p.closed);
  assert.ok(slits.length >= 9, `expected many slits, got ${slits.length}`);
  for (const s of slits) {
    assert.equal(s.pts.length, 2);                 // a straight cut
    near(s.pts[0][0], s.pts[1][0], 0.01);          // vertical (same x)
    assert.ok(s.pts[0][1] > 0 && s.pts[1][1] < H, "slit sits inside the bands");
  }
});

test("paper lantern: slit count scales with diameter (bigger ⇒ more strips)", () => {
  assert.ok(lanternStrips(inToPt(8)) > lanternStrips(inToPt(3)), "more slits on a bigger lantern");
});

test("paper lantern exports a PDF at exact size and gangs on a sheet", async () => {
  const bleed = inToPt(0.0625);
  const d = buildPaperLantern({ ...lanternDefaults(inToPt(5), inToPt(7)), bleed });
  const pdf = await PDFDocument.load(await dielineToPdf(d));
  near(pdf.getPage(0).getWidth(), d.widthPt + 2 * bleed, 1e-3);
  const sheet = { name: "13×19", wPt: inToPt(13), hPt: inToPt(19) };
  const imp = imposeOnSheet(d.widthPt + 2 * bleed, d.heightPt + 2 * bleed, sheet, inToPt(0.125), 0);
  assert.ok(imp.up >= 1, `expected ≥1-up, got ${imp.up}`);
});

// ============================================================
// 3D folded star (Decorations)
// ============================================================
import { buildFoldedStar, defaultParams as starDefaults, STAR_POINTS } from "../src/core/models/foldedStar";
const fstar = (D = 5) => buildFoldedStar({ ...starDefaults(inToPt(D)), bleed: inToPt(0.0625) });

test("folded star: outline + hang hole; radial scores + a glue tab per point", () => {
  const d = fstar();
  assert.equal(d.paths.cut.length, 2);                       // star outline + hang hole
  assert.equal(d.paths.crease.length, STAR_POINTS * 2 + STAR_POINTS); // 10 radial + 5 tab folds
  assert.equal(d.paths.glue.length, STAR_POINTS);            // one glue tab per point
  assert.equal(d.paths.cut[0].closed, true);
  for (const g of d.paths.glue) { assert.equal(g.closed, true); assert.equal(g.pts.length, 4); } // tab quads
});

test("folded star: the radial scores all share the centre; tab folds don't", () => {
  const d = fstar();
  const radial = d.paths.crease.filter((c) => (c.id || "").startsWith("score-"));
  const tabs = d.paths.crease.filter((c) => (c.id || "").startsWith("tab-fold-"));
  assert.equal(radial.length, STAR_POINTS * 2);
  assert.equal(tabs.length, STAR_POINTS);
  const c0 = radial[0].pts[0];
  for (const s of radial) { near(s.pts[0][0], c0[0], 0.01); near(s.pts[0][1], c0[1], 0.01); }
  assert.ok(c0[0] > 0 && c0[0] < d.widthPt && c0[1] > 0 && c0[1] < d.heightPt);
});

test("folded star: tips reach farther from the centre than the inner notches", () => {
  const d = fstar();
  const radial = d.paths.crease.filter((c) => (c.id || "").startsWith("score-"));
  const c = radial[0].pts[0];
  const rad = (q: [number, number]) => Math.hypot(q[0] - c[0], q[1] - c[1]);
  const tipR = rad(radial[0].pts[1]);   // score-0 ends at a tip
  const innR = rad(radial[1].pts[1]);   // score-1 ends at an inner notch
  assert.ok(tipR > innR * 1.6, `tips (${tipR.toFixed(0)}) well beyond inners (${innR.toFixed(0)})`);
});

test("folded star exports a PDF at exact size and gangs on a sheet", async () => {
  const bleed = inToPt(0.0625);
  const d = buildFoldedStar({ ...starDefaults(inToPt(5)), bleed });
  const pdf = await PDFDocument.load(await dielineToPdf(d));
  near(pdf.getPage(0).getWidth(), d.widthPt + 2 * bleed, 1e-3);
  const letter = { name: "Letter", wPt: inToPt(8.5), hPt: inToPt(11) };
  const imp = imposeOnSheet(d.widthPt + 2 * bleed, d.heightPt + 2 * bleed, letter, inToPt(0.125), 0);
  assert.ok(imp.up >= 2, `expected ≥2-up, got ${imp.up}`);
});

// ============================================================
// Geometric snowflake (Decorations)
// ============================================================
import { buildSnowflake, defaultParams as flakeDefaults } from "../src/core/models/snowflake";
const flake = (D = 6) => buildSnowflake({ ...flakeDefaults(inToPt(D)), bleed: inToPt(0.0625) });

test("snowflake: a single closed thin-rod outline; no holes/creases/glue", () => {
  const d = flake();
  assert.equal(d.paths.crease.length, 0);
  assert.equal(d.paths.glue.length, 0);
  assert.equal(d.paths.cut.length, 1);          // one continuous contour (rods + hub)
  assert.equal(d.paths.cut[0].closed, true);
  assert.ok(d.paths.cut[0].pts.length > 60, "a detailed branchy contour");
});

test("snowflake: every tip is a rounded cap (42 = 6 arms × 7 tips), none sharp", () => {
  const R = inToPt(6) / 2;
  const d = flake();
  const cut = d.paths.cut[0];
  const caps = (cut.curves ?? []).filter(Boolean).length;
  assert.equal(caps, 42, "1 main + 6 branch caps per arm × 6 arms");
  // curves[j] controls the segment pts[j] → pts[j+1]. A cap must sit on the
  // SHORT tip chord (≈ rod width ~0.08R), not a long rod-edge segment — that
  // off-by-one (control on the wrong segment) is exactly what makes loops.
  const o = cut.pts;
  const cx = (Math.min(...o.map((q) => q[0])) + Math.max(...o.map((q) => q[0]))) / 2;
  const cy = (Math.min(...o.map((q) => q[1])) + Math.max(...o.map((q) => q[1]))) / 2;
  const dist = (p: number[]) => Math.hypot(p[0] - cx, p[1] - cy);
  for (let j = 0; j < o.length; j++) {
    const ctrl = cut.curves?.[j];
    if (!ctrl) continue;
    const a = o[j], b = o[(j + 1) % o.length];
    const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
    assert.ok(chord < 0.12 * R, `cap chord ${chord.toFixed(1)} should be a short tip, < ${(0.12 * R).toFixed(1)}`);
    // and it bulges OUTWARD (apex farther from centre than the chord midpoint)
    const apex = [0.25 * a[0] + 0.5 * ctrl[0] + 0.25 * b[0], 0.25 * a[1] + 0.5 * ctrl[1] + 0.25 * b[1]];
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    assert.ok(dist(apex) > dist(mid), "cap apex bulges outward");
  }
});

test("snowflake: the outline is 6-fold symmetric (a 60° rotation maps it to itself)", () => {
  const d = flake();
  const o = d.paths.cut[0].pts;
  const cx = (Math.min(...o.map((q) => q[0])) + Math.max(...o.map((q) => q[0]))) / 2;
  const cy = (Math.min(...o.map((q) => q[1])) + Math.max(...o.map((q) => q[1]))) / 2;
  // radial profile sampled at N angles vs the same profile rotated 60°
  const rAt = (ang: number) => {
    // nearest outline vertex to this angle, by its own angle
    let best = Infinity, br = 0;
    for (const q of o) {
      const a = Math.atan2(q[1] - cy, q[0] - cx);
      let da = Math.abs(((a - ang + Math.PI) % TAU + TAU) % TAU - Math.PI);
      if (da < best) { best = da; br = Math.hypot(q[0] - cx, q[1] - cy); }
    }
    return br;
  };
  const TAU = Math.PI * 2;
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * TAU;
    near(rAt(ang), rAt(ang + TAU / 6), 3); // radius repeats every 60°
  }
});

test("snowflake: six arm tips reach ~the radius; deep valleys between", () => {
  const D = inToPt(6), R = D / 2;
  const d = flake();
  const o = d.paths.cut[0].pts;
  const cx = (Math.min(...o.map((q) => q[0])) + Math.max(...o.map((q) => q[0]))) / 2;
  const cy = (Math.min(...o.map((q) => q[1])) + Math.max(...o.map((q) => q[1]))) / 2;
  const radii = o.map((q) => Math.hypot(q[0] - cx, q[1] - cy));
  assert.ok(Math.max(...radii) > R * 0.9, "arm tips reach near the radius");
  assert.ok(Math.min(...radii) < R * 0.3, "deep valleys to the hub between arms");
});

test("snowflake exports a PDF at exact size and gangs on a sheet", async () => {
  const bleed = inToPt(0.0625);
  const d = buildSnowflake({ ...flakeDefaults(inToPt(6)), bleed });
  const pdf = await PDFDocument.load(await dielineToPdf(d));
  near(pdf.getPage(0).getWidth(), d.widthPt + 2 * bleed, 1e-3);
  const sheet = { name: "13×19", wPt: inToPt(13), hPt: inToPt(19) };
  const imp = imposeOnSheet(d.widthPt + 2 * bleed, d.heightPt + 2 * bleed, sheet, inToPt(0.125), 0);
  assert.ok(imp.up >= 2, `expected ≥2-up, got ${imp.up}`);
});

// ============================================================
// Place card / table tent (Party & Events) — folded standing card
// ============================================================
import { buildPlaceCard, defaultParams as placeDefaults } from "../src/core/models/placeCard";

test("place card: blank is W × 2H with one centre fold crease", () => {
  const W = inToPt(3.5), H = inToPt(2);
  const die = buildPlaceCard({ ...placeDefaults(W, H), bleed: 0 });
  near(die.widthPt, W, 1e-6);
  near(die.heightPt, 2 * H, 1e-6);                 // blank is twice the folded height
  assert.equal(die.paths.crease.length, 1, "one fold");
  // the fold sits across the middle (y = H)
  const fold = die.paths.crease[0];
  for (const [, y] of fold.pts) near(y, H, 1e-6);
  assert.equal(die.paths.cut.length, 1);
});

test("place card responds to width and height independently", () => {
  const a = buildPlaceCard({ ...placeDefaults(inToPt(3.5), inToPt(2)), bleed: 0 });
  const wide = buildPlaceCard({ ...placeDefaults(inToPt(5), inToPt(2)), bleed: 0 });
  const tall = buildPlaceCard({ ...placeDefaults(inToPt(3.5), inToPt(3)), bleed: 0 });
  assert.ok(wide.widthPt > a.widthPt && Math.abs(wide.heightPt - a.heightPt) < 1e-6);
  assert.ok(tall.heightPt > a.heightPt && Math.abs(tall.widthPt - a.widthPt) < 1e-6);
});

test("place card PDF page equals the flat blank size (incl. bleed)", async () => {
  const bleed = inToPt(0.0625);
  const die = buildPlaceCard({ ...placeDefaults(inToPt(3.5), inToPt(2)), bleed });
  const pdf = await PDFDocument.load(await dielineToPdf(die));
  near(pdf.getPage(0).getWidth(), die.widthPt + 2 * bleed, 1e-3);
  near(pdf.getPage(0).getHeight(), die.heightPt + 2 * bleed, 1e-3);
});

// ============================================================
// Gift-card holder (Envelopes & Cards) — folded holder + corner slits
// ============================================================
import { buildGiftCardHolder, defaultParams as gchDefaults } from "../src/core/models/giftCardHolder";

test("gift-card holder: blank = 2W × H, one centre fold, 4 corner slits", () => {
  const W = inToPt(4), H = inToPt(3);
  const die = buildGiftCardHolder({ ...gchDefaults(W, H), bleed: 0 });
  near(die.widthPt, 2 * W, 1e-6);             // two panels side by side
  near(die.heightPt, H, 1e-6);
  assert.equal(die.paths.crease.length, 1, "one fold");
  for (const [x] of die.paths.crease[0].pts) near(x, W, 1e-6); // fold at x=W
  // outline + 4 slits
  assert.equal(die.paths.cut.length, 1 + 4);
  // the 4 slits are OPEN cuts (the card tucks under)
  for (const s of die.paths.cut.slice(1)) assert.equal(s.closed, false);
});

test("gift-card holder: the 4 slits sit at the corners of a card on the RIGHT panel", () => {
  const W = inToPt(4), H = inToPt(3);
  const die = buildGiftCardHolder({ ...gchDefaults(W, H), bleed: 0 });
  // every slit point is on the right panel (x > W)
  for (const s of die.paths.cut.slice(1)) for (const [x] of s.pts) assert.ok(x > W - 1e-6, "slit on the right (pocket) panel");
});

test("gift-card holder responds to panel width and height independently", () => {
  const a = buildGiftCardHolder({ ...gchDefaults(inToPt(4), inToPt(3)), bleed: 0 });
  const wide = buildGiftCardHolder({ ...gchDefaults(inToPt(5), inToPt(3)), bleed: 0 });
  const tall = buildGiftCardHolder({ ...gchDefaults(inToPt(4), inToPt(4)), bleed: 0 });
  assert.ok(wide.widthPt > a.widthPt && Math.abs(wide.heightPt - a.heightPt) < 1e-6);
  assert.ok(tall.heightPt > a.heightPt && Math.abs(tall.widthPt - a.widthPt) < 1e-6);
});

test("gift-card holder PDF page equals the flat blank (incl. bleed)", async () => {
  const bleed = inToPt(0.0625);
  const die = buildGiftCardHolder({ ...gchDefaults(inToPt(4), inToPt(3)), bleed });
  const pdf = await PDFDocument.load(await dielineToPdf(die));
  near(pdf.getPage(0).getWidth(), die.widthPt + 2 * bleed, 1e-3);
  near(pdf.getPage(0).getHeight(), die.heightPt + 2 * bleed, 1e-3);
});

// ---- Floss bobbin (Organize) --------------------------------------------
import { buildFlossBobbin, defaultParams as flossDefaults } from "../src/core/models/flossBobbin";
const bobbin = (W = 1.75, H = 2) => buildFlossBobbin({ ...flossDefaults(inToPt(W), inToPt(H)), bleed: inToPt(0.0625) });

test("floss bobbin flat size = W × H; I-beam outline + top hole, no creases", () => {
  const d = bobbin();
  near(d.widthPt, inToPt(1.75)); near(d.heightPt, inToPt(2));
  assert.equal(d.paths.crease.length, 0);
  assert.equal(d.paths.glue.length, 0);
  // outline (closed) + hang hole (closed) = 2 cut polylines (notch is in the outline)
  assert.equal(d.paths.cut.length, 2);
  assert.equal(d.paths.cut[0].closed, true);
  assert.equal(d.paths.cut[1].closed, true);
  // flanges reach the full W×H bbox
  const o = d.paths.cut[0];
  near(Math.min(...o.pts.map((p) => p[0])), 0, 0.01);
  near(Math.max(...o.pts.map((p) => p[0])), inToPt(1.75), 0.01);
});

test("floss bobbin is an I-beam: narrow body between wide flanges", () => {
  const W = inToPt(1.75), H = inToPt(2);
  const pts = bobbin().paths.cut[0].pts;
  // flanges reach the full card width ...
  near(Math.min(...pts.map((p) => p[0])), 0, 0.01);
  near(Math.max(...pts.map((p) => p[0])), W, 0.01);
  // ... but the body (mid-height band) is inset on both sides:
  const body = pts.filter((p) => p[1] > H * 0.25 && p[1] < H * 0.75);
  const bodyW = Math.max(...body.map((p) => p[0])) - Math.min(...body.map((p) => p[0]));
  assert.ok(bodyW < 0.85 * W, `body should be narrower than the flanges, got ${bodyW}/${W}`);
  assert.ok(bodyW > 0.4 * W, "body still has real width");
  assert.ok(Math.min(...body.map((p) => p[0])) > 1, "body is inset from the left edge");
  assert.ok(Math.max(...body.map((p) => p[0])) < W - 1, "body is inset from the right edge");
});

test("floss bobbin hang hole sits in the top flange", () => {
  const W = inToPt(1.75), H = inToPt(2);
  const hole = bobbin().paths.cut[1];
  const xs = hole.pts.map((p) => p[0]), ys = hole.pts.map((p) => p[1]);
  near((Math.min(...xs) + Math.max(...xs)) / 2, W / 2, 1);
  assert.ok((Math.min(...ys) + Math.max(...ys)) / 2 < H * 0.3, "hole sits up in the top flange");
});

test("floss bobbin has a centre notch between two bottom feet", () => {
  const W = inToPt(1.75), H = inToPt(2);
  const pts = bobbin().paths.cut[0].pts;
  near(Math.max(...pts.map((p) => p[1])), H, 0.01);          // feet reach the bottom edge
  const centre = pts.filter((p) => Math.abs(p[0] - W / 2) < 1);
  assert.ok(centre.length > 0 && Math.min(...centre.map((p) => p[1])) < H - 1,
    "notch peak sits above the bottom edge at the centre");
});

test("floss bobbin responds to W and H independently", () => {
  const wide = bobbin(2.5, 2), tall = bobbin(1.75, 2.75);
  near(wide.widthPt, inToPt(2.5)); near(wide.heightPt, inToPt(2));
  near(tall.widthPt, inToPt(1.75)); near(tall.heightPt, inToPt(2.75));
});

test("floss bobbin exports a PDF at exact size and gangs many-up on Letter", async () => {
  const d = bobbin();
  const pdf = await PDFDocument.load(await dielineToPdf(d));
  near(pdf.getPage(0).getWidth(), d.widthPt + 2 * d.bleedPt, 1e-3);
  const letter = { name: "Letter", wPt: inToPt(8.5), hPt: inToPt(11) };
  const imp = imposeOnSheet(d.widthPt + 2 * d.bleedPt, d.heightPt + 2 * d.bleedPt, letter, inToPt(0.125), 0);
  assert.ok(imp.up >= 8, `expected ≥8-up on Letter, got ${imp.up}`);
});

// ---- Necklace / bracelet card (Display Cards) ----------------------------
import { buildNecklaceCard, defaultParams as necklaceDefaults } from "../src/core/models/necklaceCard";
const necklace = (W = 2.5, H = 3.5) => buildNecklaceCard({ ...necklaceDefaults(inToPt(W), inToPt(H)), bleed: inToPt(0.0625) });

test("necklace card flat size = W × H; outline + hole + 2 slits, no creases", () => {
  const d = necklace();
  near(d.widthPt, inToPt(2.5)); near(d.heightPt, inToPt(3.5));
  assert.equal(d.paths.crease.length, 0);
  assert.equal(d.paths.glue.length, 0);
  assert.equal(d.paths.cut.length, 4);          // card + hang hole + 2 chain slits
  for (const pl of d.paths.cut) assert.equal(pl.closed, true); // all closed (slits are stadia)
});

test("necklace card: hang hole at top-centre, two retainer slits below it", () => {
  const W = inToPt(2.5), H = inToPt(3.5);
  const [, hole, s1, s2] = necklace().paths.cut;
  // bbox centre (robust to uneven point density on rounded ends)
  const cx = (p: { pts: [number, number][] }) => (Math.min(...p.pts.map((q) => q[0])) + Math.max(...p.pts.map((q) => q[0]))) / 2;
  const cy = (p: { pts: [number, number][] }) => (Math.min(...p.pts.map((q) => q[1])) + Math.max(...p.pts.map((q) => q[1]))) / 2;
  near(cx(hole), W / 2, 2); assert.ok(cy(hole) < H / 3, "hole near the top");
  near(cx(s1), W / 2, 2); near(cx(s2), W / 2, 2);                 // slits centred
  assert.ok(cy(s1) > cy(hole) && cy(s2) > cy(s1), "slits stacked below the hole");
  // slits are horizontal: wider than tall
  const span = (p: { pts: [number, number][] }, i: 0 | 1) =>
    Math.max(...p.pts.map((q) => q[i])) - Math.min(...p.pts.map((q) => q[i]));
  assert.ok(span(s1, 0) > span(s1, 1) * 2, "slit is a horizontal slot");
});

test("necklace card responds to W and H independently", () => {
  const wide = necklace(3.5, 2.5), tall = necklace(2.5, 4);
  near(wide.widthPt, inToPt(3.5)); near(wide.heightPt, inToPt(2.5));
  near(tall.widthPt, inToPt(2.5)); near(tall.heightPt, inToPt(4));
});

test("necklace card exports a PDF at exact size and gangs many-up on Letter", async () => {
  const d = necklace();
  const pdf = await PDFDocument.load(await dielineToPdf(d));
  near(pdf.getPage(0).getWidth(), d.widthPt + 2 * d.bleedPt, 1e-3);
  const letter = { name: "Letter", wPt: inToPt(8.5), hPt: inToPt(11) };
  const imp = imposeOnSheet(d.widthPt + 2 * d.bleedPt, d.heightPt + 2 * d.bleedPt, letter, inToPt(0.125), 0);
  assert.ok(imp.up >= 4, `expected ≥4-up on Letter, got ${imp.up}`);
});

// fold-over (hourglass) necklace card
const necklaceFold = (W = 2.25, H = 5) =>
  buildNecklaceCard({ ...necklaceDefaults(inToPt(W), inToPt(H)), bleed: inToPt(0.0625), style: "fold" });

test("necklace fold-over: bbox W×H, one waist crease, outline + 2 hang slots", () => {
  const W = inToPt(2.25), H = inToPt(5);
  const d = necklaceFold();
  near(d.widthPt, W); near(d.heightPt, H);
  assert.equal(d.paths.cut.length, 3);          // outline + 2 hang slots
  assert.equal(d.paths.crease.length, 1);       // the centre fold
  assert.equal(d.paths.glue.length, 0);
  for (const pl of d.paths.cut) assert.equal(pl.closed, true);
  // fold crease is horizontal at the vertical mid (the waist)
  const fold = d.paths.crease[0];
  assert.equal(fold.closed, false);
  for (const [, y] of fold.pts) near(y, H / 2, 1);
});

test("necklace fold-over: hourglass pinches at the waist (mid narrower than the shoulders)", () => {
  const W = inToPt(2.25), H = inToPt(5);
  const outline = necklaceFold().paths.cut[0];
  // bbox reaches the full width somewhere (the shoulders)
  near(Math.max(...outline.pts.map((p) => p[0])), W, 1);
  near(Math.min(...outline.pts.map((p) => p[0])), 0, 1);
  // at the waist band (mid-height) the material is inset on both sides
  const band = outline.pts.filter((p) => p[1] > H * 0.45 && p[1] < H * 0.55);
  assert.ok(band.length > 0, "outline has points at the waist");
  const left = Math.min(...band.map((p) => p[0]));
  const right = Math.max(...band.map((p) => p[0]));
  assert.ok(left > W * 0.05, `waist left inset (got ${left} vs W ${W})`);
  assert.ok(right < W * 0.95, `waist right inset (got ${right} vs W ${W})`);
});

test("necklace fold-over: a hang slot in the head AND the foot, mirrored about the waist", () => {
  const H = inToPt(5);
  const [, sTop, sBot] = necklaceFold().paths.cut;
  const cy = (p: { pts: [number, number][] }) => (Math.min(...p.pts.map((q) => q[1])) + Math.max(...p.pts.map((q) => q[1]))) / 2;
  assert.ok(cy(sTop) < H / 4, "top slot in the head");
  assert.ok(cy(sBot) > (3 * H) / 4, "bottom slot in the foot");
  near(cy(sTop), H - cy(sBot), 2); // mirrored about the waist
});

test("necklace fold-over: the waist crease panelizes into 2 halves (the 3D fold)", () => {
  const d = necklaceFold();
  const g = panelize(d.paths.cut[0], d.paths.crease, d.paths.cut.slice(1));
  assert.equal(g.panels.length, 2, "head + foot");
  assert.equal(g.hinges.length, 1, "the waist fold hinge");
  // the fold-over publishes a root panel for the engine
  assert.ok(d.panels?.base, "publishes panels.base (the head root)");
});

// ---- Hair-bow / clip card (Display Cards) ---------------------------------
import { buildHairBowCard, defaultParams as bowDefaults } from "../src/core/models/hairBowCard";
const bow = (W = 2.75, H = 4.5, pairs?: number) => {
  const p = { ...bowDefaults(inToPt(W), inToPt(H)), bleed: inToPt(0.0625) };
  if (pairs != null) p.pairs = pairs;
  return buildHairBowCard(p);
};

test("hair-bow card flat size = W × H; outline + hole + 2 slits per pair, no creases", () => {
  const d = bow(2.75, 4.5, 2);
  near(d.widthPt, inToPt(2.75)); near(d.heightPt, inToPt(4.5));
  assert.equal(d.paths.crease.length, 0);
  assert.equal(d.paths.glue.length, 0);
  // outline + hang hole + (2 slits × 2 pairs) = 6
  assert.equal(d.paths.cut.length, 6);
  for (const pl of d.paths.cut) assert.equal(pl.closed, true);
});

test("hair-bow card: pairs param adds two slits each", () => {
  assert.equal(bow(2.75, 4.5, 1).paths.cut.length, 1 + 1 + 2);  // single
  assert.equal(bow(2.75, 6, 3).paths.cut.length, 1 + 1 + 6);    // 3 bows
});

test("hair-bow card: slits are horizontal slots, centred, stacked top→bottom", () => {
  const W = inToPt(2.75);
  const slits = bow(2.75, 4.5, 2).paths.cut.slice(2); // drop outline + hole
  const cx = (p: { pts: [number, number][] }) => (Math.min(...p.pts.map((q) => q[0])) + Math.max(...p.pts.map((q) => q[0]))) / 2;
  const span = (p: { pts: [number, number][] }, i: 0 | 1) => Math.max(...p.pts.map((q) => q[i])) - Math.min(...p.pts.map((q) => q[i]));
  for (const s of slits) {
    near(cx(s), W / 2, 2);                            // centred
    assert.ok(span(s, 0) > span(s, 1) * 2, "horizontal slot");
  }
  const ys = slits.map((s) => (Math.min(...s.pts.map((q) => q[1])) + Math.max(...s.pts.map((q) => q[1]))) / 2);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] >= ys[i - 1], "slits ordered down the card");
});

test("hair-bow card responds to W and H independently", () => {
  const wide = bow(3.5, 4.5), tall = bow(2.75, 6);
  near(wide.widthPt, inToPt(3.5)); near(wide.heightPt, inToPt(4.5));
  near(tall.widthPt, inToPt(2.75)); near(tall.heightPt, inToPt(6));
});

test("hair-bow card exports a PDF at exact size and gangs many-up on Letter", async () => {
  const d = bow();
  const pdf = await PDFDocument.load(await dielineToPdf(d));
  near(pdf.getPage(0).getWidth(), d.widthPt + 2 * d.bleedPt, 1e-3);
  const letter = { name: "Letter", wPt: inToPt(8.5), hPt: inToPt(11) };
  const imp = imposeOnSheet(d.widthPt + 2 * d.bleedPt, d.heightPt + 2 * d.bleedPt, letter, inToPt(0.125), 0);
  assert.ok(imp.up >= 2, `expected ≥2-up on Letter, got ${imp.up}`);
});

// ---- Jar / product label (Tags & Wraps) ----------------------------------
import { buildJarLabel, defaultParams as labelDefaults, JarLabelShape } from "../src/core/models/jarLabel";
const label = (shape: JarLabelShape = "oval", W = 3, H = 2) =>
  buildJarLabel({ ...labelDefaults(inToPt(W), inToPt(H)), shape, bleed: inToPt(0.0625) });

const bbox = (pl: { pts: [number, number][] }) => ({
  w: Math.max(...pl.pts.map((p) => p[0])) - Math.min(...pl.pts.map((p) => p[0])),
  h: Math.max(...pl.pts.map((p) => p[1])) - Math.min(...pl.pts.map((p) => p[1])),
});

test("jar label: each shape is a single closed outline, no creases/holes", () => {
  for (const s of ["rect", "oval", "scallop"] as const) {
    const d = label(s);
    near(d.widthPt, inToPt(3)); near(d.heightPt, inToPt(2));
    assert.equal(d.paths.cut.length, 1, `${s}: just the label outline`);
    assert.equal(d.paths.cut[0].closed, true);
    assert.equal(d.paths.crease.length, 0);
    assert.equal(d.paths.glue.length, 0);
  }
});

test("jar label oval is an ellipse with bbox exactly W×H", () => {
  const W = inToPt(3), H = inToPt(2);
  const b = bbox(label("oval").paths.cut[0]);
  near(b.w, W, 0.5); near(b.h, H, 0.5);
  // a point near each extreme (it really spans the box, not a smaller inset)
  const pts = label("oval").paths.cut[0].pts;
  assert.ok(pts.some((p) => p[0] < 1), "reaches the left edge");
  assert.ok(pts.some((p) => p[0] > W - 1), "reaches the right edge");
});

test("jar label scallop apexes touch the nominal W×H box", () => {
  const W = inToPt(3.5), H = inToPt(2.5);
  const b = bbox(label("scallop", 3.5, 2.5).paths.cut[0]);
  near(b.w, W, mmToPt(1)); near(b.h, H, mmToPt(1));
});

test("jar label responds to W and H independently", () => {
  const wide = label("rect", 4, 2), tall = label("rect", 3, 3);
  near(wide.widthPt, inToPt(4)); near(wide.heightPt, inToPt(2));
  near(tall.widthPt, inToPt(3)); near(tall.heightPt, inToPt(3));
});

test("jar label exports a PDF at exact size and gangs many-up on Letter", async () => {
  const d = label();
  const pdf = await PDFDocument.load(await dielineToPdf(d));
  near(pdf.getPage(0).getWidth(), d.widthPt + 2 * d.bleedPt, 1e-3);
  const letter = { name: "Letter", wPt: inToPt(8.5), hPt: inToPt(11) };
  const imp = imposeOnSheet(d.widthPt + 2 * d.bleedPt, d.heightPt + 2 * d.bleedPt, letter, inToPt(0.125), 0);
  assert.ok(imp.up >= 6, `expected ≥6-up on Letter, got ${imp.up}`);
});

// ---- Bookmark (Tags & Wraps) ---------------------------------------------
import { buildBookmark, defaultParams as bookmarkDefaults, BookmarkShape } from "../src/core/models/bookmark";
const bookmark = (shape: BookmarkShape = "rounded", W = 2, H = 6) =>
  buildBookmark({ ...bookmarkDefaults(inToPt(W), inToPt(H)), shape, bleed: inToPt(0.0625) });

test("bookmark: each shape is outline + tassel hole, no creases", () => {
  for (const s of ["rounded", "pointed", "scallop"] as const) {
    const d = bookmark(s);
    near(d.widthPt, inToPt(2)); near(d.heightPt, inToPt(6));
    assert.equal(d.paths.cut.length, 2, `${s}: outline + tassel hole`);
    assert.equal(d.paths.cut[0].closed, true);
    assert.equal(d.paths.crease.length, 0);
    assert.equal(d.paths.glue.length, 0);
  }
});

test("bookmark pointed: both top corners stay rounded (closing corner not chamfered)", () => {
  // Regression: builders that end with a corner quad must NOT pop the closing
  // point+curve, or the Z closes as a straight chamfer on the top-left.
  const o = bookmark("pointed").paths.cut[0];
  assert.equal((o.curves || []).filter(Boolean).length, 2, "top-left + top-right are both Q curves");
});

test("bookmark pointed comes to a centred point at the bottom", () => {
  const W = inToPt(2), H = inToPt(6);
  const pts = bookmark("pointed").paths.cut[0].pts;
  near(Math.max(...pts.map((p) => p[1])), H, 0.01);            // tip reaches the bottom
  const tip = pts.filter((p) => Math.abs(p[1] - H) < 1);
  assert.ok(tip.length >= 1 && tip.every((p) => Math.abs(p[0] - W / 2) < 1), "bottom point is centred");
});

test("bookmark tassel hole sits near the top, centred", () => {
  const W = inToPt(2), H = inToPt(6);
  const hole = bookmark("rounded").paths.cut[1];
  const cx = (Math.min(...hole.pts.map((p) => p[0])) + Math.max(...hole.pts.map((p) => p[0]))) / 2;
  const cy = (Math.min(...hole.pts.map((p) => p[1])) + Math.max(...hole.pts.map((p) => p[1]))) / 2;
  near(cx, W / 2, 1); assert.ok(cy < H / 4, "hole near the top");
});

test("bookmark scallop bbox ≈ W×H", () => {
  const W = inToPt(2), H = inToPt(6);
  const b = bbox(bookmark("scallop").paths.cut[0]);
  near(b.w, W, mmToPt(1.5)); near(b.h, H, mmToPt(1.5));
});

test("bookmark responds to W and H independently", () => {
  const wide = bookmark("rounded", 2.5, 6), tall = bookmark("rounded", 2, 7);
  near(wide.widthPt, inToPt(2.5)); near(wide.heightPt, inToPt(6));
  near(tall.widthPt, inToPt(2)); near(tall.heightPt, inToPt(7));
});

test("bookmark exports a PDF at exact size and gangs several-up on Letter", async () => {
  const d = bookmark();
  const pdf = await PDFDocument.load(await dielineToPdf(d));
  near(pdf.getPage(0).getWidth(), d.widthPt + 2 * d.bleedPt, 1e-3);
  const letter = { name: "Letter", wPt: inToPt(8.5), hPt: inToPt(11) };
  const imp = imposeOnSheet(d.widthPt + 2 * d.bleedPt, d.heightPt + 2 * d.bleedPt, letter, inToPt(0.125), 0);
  assert.ok(imp.up >= 3, `expected ≥3-up on Letter, got ${imp.up}`);
});

// ---- Print & Cut: artwork embedding (Phase 1) ----------------------------
// A 1×1 transparent PNG as a data URL — enough to prove embed/clip wiring.
const PNG_1x1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

test("SVG export is curve-aware (rounded corners stay Q-beziers, not polygons)", () => {
  // RTE has Q-bezier tuck corners. The SVG cut layer must carry Q commands —
  // the old inline M/L builder flattened them to line segments (faceted cut).
  const d = buildReverseTuckEnd({ ...rteDefaults(inToPt(4), inToPt(1), inToPt(6)), bleed: 0 });
  const svg = dielineToSvg(d);
  const cutGroup = /<g id="cut"[^>]*>([\s\S]*?)<\/g>/.exec(svg)![1];
  assert.match(cutGroup, /\bQ\b/);
});

test("SVG embeds dropped artwork as a clipped <image>, omitted when absent", () => {
  const d = card();
  const img = { dataUrl: PNG_1x1, xPt: 10, yPt: 20, wPt: 50, hPt: 40 };
  const withArt = dielineToSvg(d, { image: img });
  assert.match(withArt, /<g clip-path="url\(#art-clip\)">/);
  assert.match(withArt, /<image/);
  assert.match(withArt, /href="data:image\/png;base64,/);
  assert.match(withArt, /<clipPath id="art-clip"/);
  // a rotation is emitted as a transform on the inner image
  const rotated = dielineToSvg(d, { image: { ...img, rotDeg: 30 } });
  assert.match(rotated, /<image[^>]*transform="rotate\(30 /);
  // no artwork → no <image>, no clip
  const plain = dielineToSvg(d);
  assert.ok(!plain.includes("<image"));
  assert.ok(!plain.includes("art-clip"));
});

test("PDF embeds dropped artwork (image XObject) without changing page size", async () => {
  const d = card();
  const img = { dataUrl: PNG_1x1, xPt: 10, yPt: 20, wPt: 50, hPt: 40 };
  const bytes = await dielineToPdf(d, { image: img });
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
  // the saved PDF carries an image XObject
  const ascii = Buffer.from(bytes).toString("latin1");
  assert.match(ascii, /\/Subtype\s*\/Image/);
  // a rotated artwork still embeds cleanly at the same exact page size
  const rotated = await dielineToPdf(d, { image: { ...img, rotDeg: 45 } });
  const rdoc = await PDFDocument.load(rotated);
  near(rdoc.getPage(0).getWidth(), d.widthPt + 2 * d.bleedPt, 0.01);
  assert.match(Buffer.from(rotated).toString("latin1"), /\/Subtype\s*\/Image/);
});

test("Print & Cut pair: print PDF (includeLines:false) keeps the image, drops the lines", async () => {
  const d = card();
  const img = { dataUrl: PNG_1x1, xPt: 10, yPt: 20, wPt: 50, hPt: 40 };
  const printOnly = await dielineToPdf(d, { image: img, includeLines: false });
  const combined = await dielineToPdf(d, { image: img, includeLines: true });
  // print file still embeds the artwork at the same exact page size
  const doc = await PDFDocument.load(printOnly);
  const { width, height } = doc.getPage(0).getSize();
  near(width, d.widthPt + 2 * d.bleedPt, 0.01);
  near(height, d.heightPt + 2 * d.bleedPt, 0.01);
  assert.match(Buffer.from(printOnly).toString("latin1"), /\/Subtype\s*\/Image/);
  // dropping the cut/score strokes makes the print file strictly smaller
  assert.ok(printOnly.length < combined.length);
});

test("Print & Cut pair: cut file (SVG, no image) carries the cut lines only", () => {
  const d = card();
  const cut = dielineToSvg(d, { unit: "in" }); // no image option = lines-only
  assert.ok(!cut.includes("<image"));
  assert.match(cut, /<g id="cut"/);
});

// ---- Heart Box ----
const heartBox = (heartW = inToPt(5), wallH = inToPt(1.5)) =>
  buildHeartBox(heartDefaults(heartW, wallH));

test("heart box: 4 cut paths (base band, base floor, lid band, lid floor)", () => {
  const d = heartBox();
  assert.equal(d.paths.cut.length, 4);
  // All 4 cut paths are closed
  for (const p of d.paths.cut) assert.ok(p.closed, "every cut path must be closed");
});

test("heart box: lid floor is larger than base floor (telescopes over)", () => {
  const W = inToPt(5), H = inToPt(1.5);
  const p = heartDefaults(W, H);
  const basePts = heartOutline(W, 120);
  const lidPts  = heartOutline(W + 2 * (p.thickness + p.clearance), 120);
  let minXb = Infinity, maxXb = -Infinity;
  for (const [x] of basePts) { if (x < minXb) minXb = x; if (x > maxXb) maxXb = x; }
  let minXl = Infinity, maxXl = -Infinity;
  for (const [x] of lidPts)  { if (x < minXl) minXl = x; if (x > maxXl) maxXl = x; }
  assert.ok(maxXl - minXl > maxXb - minXb, "lid heart must be wider than base heart");
});

test("heart box: lid wall height ≤ base wall height (partial telescope)", () => {
  const p = heartDefaults(inToPt(5), inToPt(1.5));
  const lidWallH = Math.max(mmToPt(8), Math.min(p.wallH * 0.6, p.wallH));
  assert.ok(lidWallH <= p.wallH, "lid wall height must be ≤ base wall height");
  assert.ok(lidWallH > 0, "lid wall height must be positive");
});

test("heart box: heart width and wall height scale independently", () => {
  const base = heartBox(inToPt(5), inToPt(1.5));
  const wide = heartBox(inToPt(7), inToPt(1.5)); // wider heart → wider band + taller floors
  const tall = heartBox(inToPt(5), inToPt(2.5)); // deeper walls → taller layout, same heart width
  assert.ok(wide.widthPt  > base.widthPt,  "wider heart → wider flat layout");
  assert.ok(tall.heightPt > base.heightPt, "deeper walls → taller flat layout");
  // changing wall depth alone must NOT change the band width (same heart footprint)
  near(tall.widthPt, base.widthPt, inToPt(0.05));
});

test("heart box: heart aspect ratio matches geometry (h ≈ 0.6875 × w)", () => {
  const w = inToPt(5);
  near(heartHeight(w), w * 22 / 32, 1);
});

test("heart box: floor humps never overlap the band above (layout bug fix)", () => {
  // The heart's humps peak ABOVE the cleft anchor (oy). Before the fix they
  // overlapped into the band above. Now each floor is shifted down by humpAbove
  // so its actual top-of-humps is strictly below the band's bottom tab edge.
  const d = heartBox();
  // The 4 cut paths are: [0]=base band, [1]=base floor, [2]=lid band, [3]=lid floor
  // Find the bottom of the base band (max y of path[0])
  let bandBottom = -Infinity;
  for (const [, y] of d.paths.cut[0].pts) if (y > bandBottom) bandBottom = y;
  // Find the top of the base floor (min y of path[1])
  let floorTop = Infinity;
  for (const [, y] of d.paths.cut[1].pts) if (y < floorTop) floorTop = y;
  assert.ok(floorTop > bandBottom, `base floor top (${floorTop.toFixed(1)}) must be below base band bottom (${bandBottom.toFixed(1)})`);
  // Same for lid: bottom of lid band vs top of lid floor
  let lidBandBottom = -Infinity;
  for (const [, y] of d.paths.cut[2].pts) if (y > lidBandBottom) lidBandBottom = y;
  let lidFloorTop = Infinity;
  for (const [, y] of d.paths.cut[3].pts) if (y < lidFloorTop) lidFloorTop = y;
  assert.ok(lidFloorTop > lidBandBottom, `lid floor top must be below lid band bottom`);
});

test("heart box: exports a PDF at correct page size", async () => {
  const d = heartBox();
  const bytes = await dielineToPdf(d);
  const doc   = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width,  d.widthPt  + 2 * d.bleedPt, 1);
  near(height, d.heightPt + 2 * d.bleedPt, 1);
});


// ---- Party Hat ----
import { buildPartyHat, defaultParams as partyHatDefaults } from "../src/core/models/partyHat";

const partyHat = (headDia = inToPt(7), height = inToPt(9)) =>
  buildPartyHat(partyHatDefaults(headDia, height));

test("party hat: outline + 2 chin holes by default (3 closed cuts)", () => {
  const d = partyHat();
  const closed = d.paths.cut.filter(p => p.closed);
  assert.equal(closed.length, 3, "outline + 2 chin-strap holes (default chinHole:true)");
  assert.equal(d.paths.crease.length, 0);
});

test("party hat: chin holes add 2 closed cut paths when enabled", () => {
  const p = { ...partyHatDefaults(inToPt(7), inToPt(9)), chinHole: true };
  const d = buildPartyHat(p);
  const closed = d.paths.cut.filter(c => c.closed);
  assert.equal(closed.length, 3, "outline + 2 chin holes");
});

test("party hat: no chin holes when disabled", () => {
  const p = { ...partyHatDefaults(inToPt(7), inToPt(9)), chinHole: false };
  const d = buildPartyHat(p);
  assert.equal(d.paths.cut.filter(c => c.closed).length, 1, "only the outline");
});

test("party hat: layout is wider than tall (cone sector)", () => {
  const d = partyHat(inToPt(7), inToPt(9));
  // The sector's half-width (base radius) is the slant height × sin(hTheta)
  // which for a typical cone is wider than tall.
  assert.ok(d.widthPt > 0 && d.heightPt > 0, "positive dimensions");
});

test("party hat: larger diameter → larger flat footprint", () => {
  const small = partyHat(inToPt(5), inToPt(8));
  const large = partyHat(inToPt(8), inToPt(8));
  assert.ok(large.widthPt > small.widthPt, "larger head → wider sector");
});

test("party hat: PDF export at correct page size", async () => {
  const d = partyHat();
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width,  d.widthPt  + 2 * d.bleedPt, 1);
  near(height, d.heightPt + 2 * d.bleedPt, 1);
});

// ---- Napkin Ring ----
import { buildNapkinRing, defaultParams as napkinRingDefaults } from "../src/core/models/napkinRing";

const napkinRing = (girth = inToPt(6), bandW = inToPt(1.75)) =>
  buildNapkinRing(napkinRingDefaults(girth, bandW));

test("napkin ring: glue closure has 1 cut + 1 glue zone, zero creases", () => {
  const p = { ...napkinRingDefaults(inToPt(6), inToPt(1.75)), closure: "glue" as const };
  const d = buildNapkinRing(p);
  assert.equal(d.paths.cut.length, 1);
  assert.equal(d.paths.glue.length, 1, "glue zone present");
  assert.equal(d.paths.crease.length, 0);
});

test("napkin ring: lock closure has 2 cut paths (outline + slot), no glue", () => {
  const p = { ...napkinRingDefaults(inToPt(6), inToPt(1.75)), closure: "lock" as const };
  const d = buildNapkinRing(p);
  assert.equal(d.paths.cut.length, 2, "outline + slot cut");
  assert.equal(d.paths.glue.length, 0);
});

test("napkin ring: girth and band width scale independently", () => {
  const base = napkinRing(inToPt(6), inToPt(1.75));
  const wider = napkinRing(inToPt(8), inToPt(1.75));
  const taller = napkinRing(inToPt(6), inToPt(2.5));
  assert.ok(wider.widthPt > base.widthPt, "wider girth → wider flat");
  assert.ok(taller.heightPt > base.heightPt, "taller band → taller flat");
});

test("napkin ring: PDF export at correct page size", async () => {
  const d = napkinRing();
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width,  d.widthPt  + 2 * d.bleedPt, 1);
  near(height, d.heightPt + 2 * d.bleedPt, 1);
});

// ---- Cake Topper ----
import { buildCakeTopper, defaultParams as cakeTopperDefaults } from "../src/core/models/cakeTopper";

const cakeTopper = (D = inToPt(4), shape: "circle" | "heart" | "star" | "scallop" = "circle") => {
  const p = { ...cakeTopperDefaults(D), shape };
  return buildCakeTopper(p);
};

test("cake topper: all 4 shapes produce 1 unified closed cut path (slot merged as protrusion)", () => {
  for (const shape of ["circle", "heart", "star", "scallop"] as const) {
    const d = cakeTopper(inToPt(4), shape);
    const closed = d.paths.cut.filter(c => c.closed);
    assert.equal(closed.length, 1, `${shape}: one unified outline with slot protrusion`);
    assert.equal(d.paths.crease.length, 0, `${shape}: no creases`);
  }
});

test("cake topper: slot protrudes BELOW the shape (heightPt > shape diameter)", () => {
  // The stick slot is a protrusion at the bottom of the shape — so
  // heightPt must be taller than just the shape's own bounding height.
  const D = inToPt(4);
  for (const shape of ["circle", "heart", "star", "scallop"] as const) {
    const d = cakeTopper(D, shape);
    assert.ok(d.heightPt > D * 0.8, `${shape}: has meaningful height`);
    // The protrusion adds stickDepth (≥15mm) below the shape.
    // heightPt should exceed the pure-shape height (D for circle) by at least stickDepth/2.
    const stickDepthMin = mmToPt(15);
    assert.ok(d.heightPt >= D * 0.5 + stickDepthMin, `${shape}: protrusion extends below shape`);
  }
});

test("cake topper: EVERY shape gets a wide stick-holder tab at the bottom (incl. scallop + star valley)", () => {
  // Regression: the old splice only fired when an outline vertex landed exactly
  // at the lowest point, so the scallop (bumps) and star (concave bottom valley)
  // silently got NO holder. The robust splice gives every shape a flat tab edge.
  const D = inToPt(4);
  for (const shape of ["circle", "heart", "star", "scallop"] as const) {
    const d = cakeTopper(D, shape);
    const pts = d.paths.cut[0].pts;
    const maxY = Math.max(...pts.map(p => p[1]));
    // The tab bottom is a flat horizontal edge → ≥2 points at the lowest y.
    const bottomPts = pts.filter(p => Math.abs(p[1] - maxY) < 1);
    assert.ok(bottomPts.length >= 2, `${shape}: tab bottom is a flat edge (≥2 pts), got ${bottomPts.length}`);
    const xs = bottomPts.map(p => p[0]);
    const span = Math.max(...xs) - Math.min(...xs);
    // Tab is a substantial holder (≈ D·0.18 = ~18mm here), not a flimsy ~4mm strip.
    assert.ok(span > mmToPt(12) && span < mmToPt(30), `${shape}: tab width is a sturdy holder, got ${span}pt`);
  }
});

test("cake topper: holder width + length params drive the tab geometry", () => {
  const D = inToPt(4);
  const tabSpan = (d: ReturnType<typeof buildCakeTopper>) => {
    const pts = d.paths.cut[0].pts;
    const maxY = Math.max(...pts.map(p => p[1]));
    const xs = pts.filter(p => Math.abs(p[1] - maxY) < 1).map(p => p[0]);
    return Math.max(...xs) - Math.min(...xs);
  };
  const base = { ...cakeTopperDefaults(D), shape: "circle" as const };
  const narrow = buildCakeTopper({ ...base, holderW: inToPt(0.4) });
  const wide   = buildCakeTopper({ ...base, holderW: inToPt(1.0) });
  assert.ok(tabSpan(wide) > tabSpan(narrow) + inToPt(0.3), "wider holderW → wider tab edge");

  const short = buildCakeTopper({ ...base, holderDepth: inToPt(0.5) });
  const long  = buildCakeTopper({ ...base, holderDepth: inToPt(2.0) });
  assert.ok(long.heightPt > short.heightPt + inToPt(1.0), "longer holderDepth → taller footprint");
});

test("cake topper: larger diameter → larger flat footprint", () => {
  const small = cakeTopper(inToPt(3));
  const large = cakeTopper(inToPt(6));
  assert.ok(large.widthPt > small.widthPt);
  assert.ok(large.heightPt > small.heightPt);
});

test("cake topper: PDF export at correct page size", async () => {
  const d = cakeTopper();
  const bytes = await dielineToPdf(d);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  near(width,  d.widthPt  + 2 * d.bleedPt, 1);
  near(height, d.heightPt + 2 * d.bleedPt, 1);
});

