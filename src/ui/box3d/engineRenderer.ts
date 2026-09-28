// Fold Engine v2 — RENDERER. See docs/fold-engine.md.
//
// Renders a panelized + solved fold model with three.js. Unlike the legacy
// closures in foldable.ts (hand-built panel shapes), every panel mesh here IS
// a region of the real dieline — windows/slots arrive as holes automatically,
// and the fold kinematics come from the solver (the same math the node tests
// assert against, e.g. "closed bbox = L × H × W").
//
// Implementation: one mesh-set per panel with matrixAutoUpdate=false;
// setFold(t) writes each panel's affine transform from solver transformsAt().
// No nested group bookkeeping — the solver owns the kinematics.

import * as THREE from "three";
import { getModel } from "../../core/models/registry";
import { inToPt, mmToPt } from "../../core/units";
import { flattenPolyline } from "../../core/geometry";
import { Polyline, Decoration } from "../../core/types";
import { panelize, Panel, PanelGraph, pointInPolygon } from "../../core/fold/panelize";
import { prepare, transformsAt, foldedBBox, matApply, Mat, FoldModel } from "../../core/fold/solve";
import { foldSpecFor, hasMultiFoldSpec, multiFoldSpecFor, PieceSpec } from "../../core/fold/specs";
import { Foldable, FoldableOpts, sideBand } from "./foldable";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function engineFoldable(opts: FoldableOpts): Foldable {
  const { modelId, Lpt, Wpt, Hpt, scale, material } = opts;

  // Build the REAL dieline (no bleed — the 3D folds the trim geometry).
  // buildParams carries per-model choices that reshape the dieline (e.g. the
  // envelope's closure flap) so the fold matches the flat exactly.
  const die = getModel(modelId).build({
    L: Lpt, W: Wpt, H: Hpt,
    thickness: inToPt(0.018), bleed: 0,
    features: opts.features,
    ...opts.buildParams,
  });

  // Two-piece dielines (Dieline.pieces) assemble statically-folded pieces
  // with an inter-piece motion instead of a single fold tree.
  if (die.pieces && die.pieces.length > 1 && hasMultiFoldSpec(modelId)) {
    return multiPieceFoldable(opts, die);
  }

  const graph = panelize(die.paths.cut[0], die.paths.crease, die.paths.cut.slice(1));
  const spec = foldSpecFor(modelId, die, { L: Lpt, W: Wpt, H: Hpt });
  const model = prepare(graph, spec);

  // Board thickness in POINT space (solver/mesh space); same visual size as
  // the legacy path: clamp(mmToPt(1.1)·scale, .008, .03) scene units.
  const thicknessPt = clamp(mmToPt(1.1), 0.008 / scale, 0.03 / scale);

  const group = new THREE.Group();
  // Everything below works in point space; the root group applies the scene
  // scale and centers the CLOSED box at the origin (legacy convention).
  // Floor-rooted models (trays) lie down: base horizontal, cavity up.
  const orient = new THREE.Group();
  if (spec.floor) orient.rotation.x = Math.PI / 2; // cavity up
  group.add(orient);
  const inner = new THREE.Group();
  orient.add(inner);
  inner.scale.setScalar(scale);
  const closed = foldedBBox(model, 0);
  inner.position.set(
    (-(closed.min[0] + closed.max[0]) / 2) * scale,
    (-(closed.min[1] + closed.max[1]) / 2) * scale,
    (-(closed.min[2] + closed.max[2]) / 2) * scale,
  );

  // Stacking offset per board layer: overlapping co-planar flaps (crash-lock
  // floors, glued ends, tucked tongues) shift by spec.layer × this, where
  // layer = stacking DEPTH into the box (the outermost flap, layer 0, sits on
  // the rim). The inward direction is determined AUTOMATICALLY per panel from
  // the CLOSED pose (does the panel's normal face the box centre?) — fold
  // chains flip normals in non-obvious ways (a tongue is 180° of flap fold
  // PLUS the tube's 180°, which cancel), so no human-assigned signs.
  const layPt = thicknessPt * 1.4;
  const closedTransforms = transformsAt(model, 0);
  const centerPt = [
    (closed.min[0] + closed.max[0]) / 2,
    (closed.min[1] + closed.max[1]) / 2,
    (closed.min[2] + closed.max[2]) / 2,
  ];
  const layerOffset = (pi: number): number => {
    const hi = model.parentHinge[pi];
    if (hi == null) return 0;
    const layer = spec.hinges[graph.hinges[hi].creaseId!]?.layer ?? 0;
    if (!layer) return 0;
    const M = closedTransforms[pi];
    // world normal of the panel's local +Z, and its world centroid (closed)
    const nx = M[2], ny = M[6], nz = M[10];
    const p = graph.panels[pi];
    let cx = 0, cy = 0;
    for (const pt of p.outline) { cx += pt[0]; cy += pt[1]; }
    cx /= p.outline.length; cy /= p.outline.length;
    const [wx, wy, wz] = matApply(M, cx, -cy, 0);
    const inward = (centerPt[0] - wx) * nx + (centerPt[1] - wy) * ny + (centerPt[2] - wz) * nz;
    return (inward >= 0 ? 1 : -1) * Math.abs(layer) * layPt;
  };

  // Print-&-Cut artwork decal (covers the whole sheet via flat-sheet UVs).
  const print = opts.artwork ? buildPrintCtx(opts.artwork, die.widthPt, die.heightPt) : null;
  // Printable DECORATIONS decal (e.g. the animal face) — under any artwork.
  // Apply the editor's per-id colour overrides so the 3D face matches the 2D.
  const decos = die.decorations?.length
    ? die.decorations.map((d) => ({ ...d, color: opts.decorColors?.[d.id] ?? d.color }))
    : null;
  const decor = decos ? buildDecorCtx(decos, die.widthPt, die.heightPt) : null;

  // Outer faces white, INNER faces (pointing toward the box centre at the closed
  // pose) a light gray — so open boxes/trays/envelopes read white outside,
  // gray-lined inside. Reuses the same normal-vs-centre test as the layering.
  const intMat = opts.interiorMaterial ?? material;
  const facePlusInner = (pi: number): boolean => {
    const M = closedTransforms[pi];
    const p = graph.panels[pi];
    let cx = 0, cy = 0;
    for (const pt of p.outline) { cx += pt[0]; cy += pt[1]; }
    cx /= p.outline.length; cy /= p.outline.length;
    const [wx, wy, wz] = matApply(M, cx, -cy, 0);
    return (centerPt[0] - wx) * M[2] + (centerPt[1] - wy) * M[6] + (centerPt[2] - wz) * M[10] >= 0;
  };

  // One pivot object per panel; its matrix is written by setFold.
  const pivots: THREE.Group[] = graph.panels.map((panel) => {
    const pivot = new THREE.Group();
    pivot.matrixAutoUpdate = false;
    const zOff = layerOffset(panel.id);
    // panelGeometries → [ +Z face, −Z face, side band ]; inner face gets intMat.
    const plusInner = facePlusInner(panel.id);
    const faceMats = [plusInner ? intMat : material, plusInner ? material : intMat, material];
    panelGeometries(panel, thicknessPt, zOff).forEach((geo, gi) => {
      const mesh = new THREE.Mesh(geo, faceMats[gi] ?? material);
      mesh.castShadow = mesh.receiveShadow = true;
      pivot.add(mesh);
    });
    if (decor) { const o = panelPrintMesh(panel, thicknessPt, zOff, decor); if (o) pivot.add(o); }
    if (print) { const o = panelPrintMesh(panel, thicknessPt, zOff, print); if (o) pivot.add(o); }
    addSlitMarks(panel, pivot, thicknessPt, zOff);
    inner.add(pivot);
    return pivot;
  });

  // FOLD FILLETS — a slim cylinder (radius = half board) along every hinge
  // line, parented to the hinge's root-side panel. Flat, it hides inside the
  // sheet; folded, it fills the V-notch between the two slabs as the rounded
  // crease real cardboard shows. The hinge axis is invariant under its own
  // rotation, so the fillet is exact at every fold amount.
  graph.hinges.forEach((h, hi) => {
    // root-side panel = the one NOT having this hinge as its parent hinge
    const parentPanel = model.parentHinge[h.a] === hi ? h.b : h.a;
    const a = new THREE.Vector3(h.p0[0], -h.p0[1], 0);
    const b = new THREE.Vector3(h.p1[0], -h.p1[1], 0);
    const len = a.distanceTo(b);
    if (len < 1e-6) return;
    const geo = new THREE.CylinderGeometry(thicknessPt / 2, thicknessPt / 2, len, 10);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    pivots[parentPanel].add(mesh);
  });

  const matToThree = (M: Mat, out: THREE.Matrix4) =>
    out.set(M[0], M[1], M[2], M[3], M[4], M[5], M[6], M[7], M[8], M[9], M[10], M[11], 0, 0, 0, 1);

  const tmp = new THREE.Matrix4();
  const setFold = (t: number) => {
    const Ms = transformsAt(model, t);
    pivots.forEach((pivot, i) => {
      matToThree(Ms[i], tmp);
      pivot.matrix.copy(tmp);
      pivot.matrixWorldNeedsUpdate = true;
    });
  };
  setFold(0);
  return { group, setFold };
}

// ---- Two-piece assembly: each piece is panelized + solved to its CLOSED
// pose ONCE (static); the slider drives only the inter-piece motion (lid
// lift, drawer slide), matching how these models physically present. ----
function multiPieceFoldable(opts: FoldableOpts, die: ReturnType<ReturnType<typeof getModel>["build"]>): Foldable {
  const { modelId, Lpt, Wpt, Hpt, scale, material } = opts;
  const multi = multiFoldSpecFor(modelId, die, { L: Lpt, W: Wpt, H: Hpt });
  const thicknessPt = clamp(mmToPt(1.1), 0.008 / scale, 0.03 / scale);
  const layPt = thicknessPt * 1.4;
  // Artwork decal — mapped in the whole-die flat coords (spans both pieces).
  const print = opts.artwork ? buildPrintCtx(opts.artwork, die.widthPt, die.heightPt) : null;

  const group = new THREE.Group();
  const orient = new THREE.Group();
  if (multi.floor) orient.rotation.x = Math.PI / 2; // cavity up
  group.add(orient);
  const scaleG = new THREE.Group();
  scaleG.scale.setScalar(scale);
  orient.add(scaleG);

  // Partition the cut + crease polylines per piece by containment in the
  // piece outlines (the outlines themselves are identified by reference).
  const outlines = die.pieces!;
  const flatOutlines = outlines.map((o: Polyline) => flattenPolyline(o).pts);
  const pieceOf = (pl: Polyline): number => {
    const probe = flattenPolyline(pl).pts[0];
    for (let i = 0; i < flatOutlines.length; i++) {
      if (pointInPolygon(probe, flatOutlines[i])) return i;
    }
    // boundary-exact points can miss; retry with a segment midpoint
    const pts = flattenPolyline(pl).pts;
    const mid: [number, number] = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2 + 0.01];
    for (let i = 0; i < flatOutlines.length; i++) {
      if (pointInPolygon(mid, flatOutlines[i])) return i;
    }
    return -1;
  };

  const movers: { g: THREE.Group; motion?: PieceSpec["motion"] }[] = [];

  outlines.forEach((outline: Polyline, pi: number) => {
    const pspec = multi.pieces[pi];
    const interior = die.paths.cut.filter((c: Polyline) => !outlines.includes(c) && pieceOf(c) === pi);
    const creases = die.paths.crease.filter((c: Polyline) => pieceOf(c) === pi);
    const graph = panelize(outline, creases, interior);
    const model = prepare(graph, { root: pspec.root, hinges: pspec.hinges });
    const Ms = transformsAt(model, 0); // pieces render in their CLOSED pose
    const closed = foldedBBox(model, 0);
    const center = [
      (closed.min[0] + closed.max[0]) / 2,
      (closed.min[1] + closed.max[1]) / 2,
      (closed.min[2] + closed.max[2]) / 2,
    ];

    const pieceG = new THREE.Group();
    pieceG.position.set(-center[0], -center[1], -center[2]);
    const pivots = buildStaticPanels(graph, model, pspec.hinges, Ms, center, thicknessPt, layPt, material, pieceG, print, opts.interiorMaterial);
    addFillets(graph, model, thicknessPt, material, pivots);

    const poseG = new THREE.Group();
    if (pspec.pose) poseG.rotation.set(pspec.pose[0], pspec.pose[1], pspec.pose[2]);
    poseG.add(pieceG);
    const motionG = new THREE.Group();
    motionG.add(poseG);
    scaleG.add(motionG);
    movers.push({ g: motionG, motion: pspec.motion });
  });

  const setFold = (t: number) => {
    const e = t * t * (3 - 2 * t); // smoothstep
    for (const m of movers) {
      if (!m.motion) continue;
      m.g.position.set(
        m.motion.axis[0] * m.motion.dist * e,
        m.motion.axis[1] * m.motion.dist * e,
        m.motion.axis[2] * m.motion.dist * e,
      );
    }
  };
  setFold(0);
  return { group, setFold };
}

// Static panel slabs for a solved piece (matrices written once).
function buildStaticPanels(
  graph: PanelGraph, model: FoldModel, hinges: PieceSpec["hinges"], Ms: Mat[],
  center: number[], thicknessPt: number, layPt: number,
  material: THREE.Material, parent: THREE.Object3D, print: PrintCtx | null = null,
  interiorMaterial?: THREE.Material,
): THREE.Group[] {
  const intMat = interiorMaterial ?? material;
  const inwardDot = (pi: number): number => {
    const M = Ms[pi];
    const p = graph.panels[pi];
    let cx = 0, cy = 0;
    for (const pt of p.outline) { cx += pt[0]; cy += pt[1]; }
    cx /= p.outline.length; cy /= p.outline.length;
    const [wx, wy, wz] = matApply(M, cx, -cy, 0);
    return (center[0] - wx) * M[2] + (center[1] - wy) * M[6] + (center[2] - wz) * M[10];
  };
  const layerOffset = (pi: number): number => {
    const hi = model.parentHinge[pi];
    if (hi == null) return 0;
    const layer = hinges[graph.hinges[hi].creaseId!]?.layer ?? 0;
    if (!layer) return 0;
    return (inwardDot(pi) >= 0 ? 1 : -1) * Math.abs(layer) * layPt;
  };
  const tmp = new THREE.Matrix4();
  return graph.panels.map((panel) => {
    const pivot = new THREE.Group();
    pivot.matrixAutoUpdate = false;
    const zOff = layerOffset(panel.id);
    const plusInner = inwardDot(panel.id) >= 0; // +Z face points to the centre → inner
    const faceMats = [plusInner ? intMat : material, plusInner ? material : intMat, material];
    panelGeometries(panel, thicknessPt, zOff).forEach((geo, gi) => {
      const mesh = new THREE.Mesh(geo, faceMats[gi] ?? material);
      mesh.castShadow = mesh.receiveShadow = true;
      pivot.add(mesh);
    });
    if (print) { const o = panelPrintMesh(panel, thicknessPt, zOff, print); if (o) pivot.add(o); }
    addSlitMarks(panel, pivot, thicknessPt, zOff);
    const M = Ms[panel.id];
    tmp.set(M[0], M[1], M[2], M[3], M[4], M[5], M[6], M[7], M[8], M[9], M[10], M[11], 0, 0, 0, 1);
    pivot.matrix.copy(tmp);
    parent.add(pivot);
    return pivot;
  });
}

// Fold fillets for a piece (same as the single-piece path).
function addFillets(graph: PanelGraph, model: FoldModel, thicknessPt: number, material: THREE.Material, pivots: THREE.Group[]) {
  graph.hinges.forEach((h, hi) => {
    const parentPanel = model.parentHinge[h.a] === hi ? h.b : h.a;
    const a = new THREE.Vector3(h.p0[0], -h.p0[1], 0);
    const b = new THREE.Vector3(h.p1[0], -h.p1[1], 0);
    const len = a.distanceTo(b);
    if (len < 1e-6) return;
    const geo = new THREE.CylinderGeometry(thicknessPt / 2, thicknessPt / 2, len, 10);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    pivots[parentPanel].add(mesh);
  });
}

// Panel mesh = thin slab in FLAT point space, plane z=0 (the solver's flat
// plane): front + back faces + the caliper side band, holes punched.
// `zOff` = stacking offset along local +Z (board layering for overlapping
// flaps) — a rigid offset, so it follows the panel through every fold.
function panelGeometries(panel: Panel, thickness: number, zOff = 0): THREE.BufferGeometry[] {
  const shape = new THREE.Shape(panel.outline.map(([x, y]) => new THREE.Vector2(x, -y)));
  for (const hole of panel.holes) {
    shape.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, -y))));
  }
  const face = new THREE.ShapeGeometry(shape);
  const half = thickness / 2;
  const out: THREE.BufferGeometry[] = [
    face.clone().translate(0, 0, zOff + half),
    face.clone().translate(0, 0, zOff - half),
  ];
  const band = sideBand(face, half);
  if (band) { band.translate(0, 0, zOff); out.push(band); }
  face.dispose();
  return out;
}

// ---- Print-&-Cut artwork DECAL ----------------------------------------------
// The artwork is composited onto an offscreen canvas the size of the dieline's
// trim bbox (in points), at its exact rect + rotation — the same placement as
// the flat 2D preview. That canvas becomes ONE texture; every panel's outer
// face samples it via flat-sheet UVs (u = x/W, v = y/H), so the print splits
// across panels and folds with them. Outside the artwork rect the canvas is
// transparent, so the paperboard shows through.
export interface PrintCtx { mat: THREE.Material; W: number; H: number; }

// `side` lets a bespoke renderer (e.g. the cupcake cone, a thin shell) paint the
// decal on both faces; the engine panels use the default FrontSide.
export function buildPrintCtx(art: NonNullable<FoldableOpts["artwork"]>, sheetWpt: number, sheetHpt: number, side: THREE.Side = THREE.FrontSide): PrintCtx | null {
  if (sheetWpt <= 0 || sheetHpt <= 0) return null;
  const maxDim = 1400; // cap canvas resolution
  const k = Math.min(maxDim / sheetWpt, maxDim / sheetHpt);
  const cw = Math.max(1, Math.round(sheetWpt * k));
  const ch = Math.max(1, Math.round(sheetHpt * k));
  const cnv = document.createElement("canvas");
  cnv.width = cw; cnv.height = ch;
  const ctx = cnv.getContext("2d");
  if (!ctx) return null;
  ctx.save();
  const cx = (art.xPt + art.wPt / 2) * k, cy = (art.yPt + art.hPt / 2) * k;
  ctx.translate(cx, cy);
  ctx.rotate(((art.rotDeg || 0) * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  try { ctx.drawImage(art.image, art.xPt * k, art.yPt * k, art.wPt * k, art.hPt * k); } catch { /* tainted/empty */ }
  ctx.restore();
  const tex = new THREE.CanvasTexture(cnv);
  tex.flipY = false; // canvas row 0 = dieline top (y=0) → v=0
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  // Lit like the board (ink on a paper surface), transparent outside the art,
  // floated just proud of the face via polygon offset so it never z-fights.
  const mat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, roughness: 0.7, metalness: 0,
    side, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  return { mat, W: sheetWpt, H: sheetHpt };
}

// Printable DECORATIONS decal (e.g. an animal box's face). Rasterizes the
// decoration shapes (fills + the stroked mouth) onto a canvas the size of the
// dieline trim, in their exact dieline positions/colours — so the SAME
// flat-sheet UV mapping that the artwork uses places the face on the right
// panels (front wall) and the inner-ears on the ears. Returns a PrintCtx.
export function buildDecorCtx(decorations: Decoration[], sheetWpt: number, sheetHpt: number, side: THREE.Side = THREE.FrontSide): PrintCtx | null {
  if (sheetWpt <= 0 || sheetHpt <= 0 || !decorations.length) return null;
  if (typeof document === "undefined") return null; // node (tests) — no canvas; skip the decal
  const maxDim = 1400;
  const k = Math.min(maxDim / sheetWpt, maxDim / sheetHpt);
  const cw = Math.max(1, Math.round(sheetWpt * k));
  const ch = Math.max(1, Math.round(sheetHpt * k));
  const cnv = document.createElement("canvas");
  cnv.width = cw; cnv.height = ch;
  const ctx = cnv.getContext("2d");
  if (!ctx) return null;
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  const trace = (pl: Polyline) => {
    ctx.beginPath();
    pl.pts.forEach((p, i) => {
      const x = p[0] * k, y = p[1] * k;
      if (i === 0) { ctx.moveTo(x, y); return; }
      const c = pl.curves?.[i - 1];
      if (c) ctx.quadraticCurveTo(c[0] * k, c[1] * k, x, y); else ctx.lineTo(x, y);
    });
    if (pl.closed) ctx.closePath();
  };
  for (const d of decorations) {
    for (const pl of d.shapes) {
      trace(pl);
      if (d.stroke) { ctx.strokeStyle = d.color; ctx.lineWidth = Math.max(1, (d.strokeWidth ?? 1.2) * k); ctx.stroke(); }
      else { ctx.fillStyle = d.color; ctx.fill(); }
    }
  }
  const tex = new THREE.CanvasTexture(cnv);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, roughness: 0.7, metalness: 0,
    side, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });
  return { mat, W: sheetWpt, H: sheetHpt };
}

// One outer-face overlay (same outline + holes as the panel front face) with
// flat-sheet UVs, floated just above the front face. Returns null if degenerate.
function panelPrintMesh(panel: Panel, thickness: number, zOff: number, print: PrintCtx): THREE.Mesh | null {
  const shape = new THREE.Shape(panel.outline.map(([x, y]) => new THREE.Vector2(x, -y)));
  for (const hole of panel.holes) shape.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, -y))));
  const geo = new THREE.ShapeGeometry(shape);
  const pos = geo.attributes.position;
  if (!pos || pos.count < 3) { geo.dispose(); return null; }
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const X = pos.getX(i), Y = pos.getY(i); // X = x, Y = -y (dieline pt)
    uv[i * 2] = X / print.W;       // u = x / sheetW
    uv[i * 2 + 1] = -Y / print.H;  // v = y / sheetH  (flipY=false)
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.translate(0, 0, zOff + thickness / 2 + thickness * 0.03);
  const mesh = new THREE.Mesh(geo, print.mat);
  mesh.renderOrder = 2; // draw after the opaque board
  return mesh;
}

// Dark SLIT marks (open interior cuts — e.g. the gable-end lock slits): a
// slim dark box embedded along each slit segment so the cut reads as a slot.
const SLIT_MAT = new THREE.MeshBasicMaterial({ color: 0x1b2027 });
function addSlitMarks(panel: Panel, parent: THREE.Object3D, thickness: number, zOff: number) {
  for (const slit of panel.slits) {
    for (let i = 0; i + 1 < slit.length; i++) {
      const ax = slit[i][0], ay = -slit[i][1];
      const bx = slit[i + 1][0], by = -slit[i + 1][1];
      const len = Math.hypot(bx - ax, by - ay);
      if (len < 1e-6) continue;
      const geo = new THREE.BoxGeometry(len, mmToPt(1.2), thickness * 1.15);
      const mesh = new THREE.Mesh(geo, SLIT_MAT);
      mesh.position.set((ax + bx) / 2, (ay + by) / 2, zOff);
      mesh.rotation.z = Math.atan2(by - ay, bx - ax);
      parent.add(mesh);
    }
  }
}
