// 3D fold builder — the FACADE. (Phase 5: the ~1000 lines of hand-written
// per-model closures that used to live here are GONE — every rigid model now
// folds through the Fold Engine, which derives panels + hinges from the
// dieline itself. See docs/fold-engine.md and src/core/fold/.)
//
// The one bespoke closure left is the PILLOW BOX: its faces are bowed,
// non-rigid surfaces (a displaced grid), which rigid-origami deliberately
// does not model.
import * as THREE from "three";
import { ModelId } from "../../core/models/registry";
import { FeatureOptions } from "../../core/types";
import { hasFoldSpec, hasMultiFoldSpec } from "../../core/fold/specs";
import { engineFoldable, buildPrintCtx } from "./engineRenderer";
import { cupcakeUnroll, defaultParams as cupcakeDefaults } from "../../core/models/cupcakeWrapper";
import { heartBounds } from "../../core/models/heartBox";
import { lanternStrips } from "../../core/models/paperLantern";
import { starVertices } from "../../core/models/foldedStar";
import { FLOWER_LAYERS, FLOWER_HUB_FRAC, burstRadius } from "../../core/models/paperFlower";
import { mmToPt } from "../../core/units";
import { flattenPolyline } from "../../core/geometry";
import { getModel } from "../../core/models/registry";

// The bespoke renderers compute artwork UVs in the model's flat (dieline) frame,
// so they need the dieline's trim size — the same frame the editor placed the
// art rect against. (Cupcake derives its own from the unroll.)
function bespokeDieSize(opts: FoldableOpts): { w: number; h: number } {
  const die = getModel(opts.modelId).build({ L: opts.Lpt, W: opts.Wpt, H: opts.Hpt, thickness: mmToPt(0.3), bleed: 0, ...opts.buildParams });
  return { w: die.widthPt, h: die.heightPt };
}

export interface FoldableOpts {
  modelId: ModelId;
  /** Box dimensions in POINTS (param formulas need real physical units). */
  Lpt: number;
  Wpt: number;
  Hpt: number;
  /** Scene-unit scale: normalized coordinate = point * scale. */
  scale: number;
  /** Material for the outer faces / flaps. */
  material: THREE.Material;
  /** Material for interior faces (currently engine-unused; kept for polish). */
  interiorMaterial?: THREE.Material;
  /** Phase 3 overlays (e.g. window cut) — derived as panel holes. */
  features?: FeatureOptions;
  /** Extra per-model build params spread into the model's build() — e.g. the
   *  envelope's closure-flap style. Lets the 3D match an editor choice that
   *  reshapes the dieline (so the fold can't desync from the flat). NOTE: never
   *  pass params that add a SECOND piece (e.g. the envelope liner) to a
   *  single-piece foldable — the disconnected piece breaks panelization. */
  buildParams?: Record<string, unknown>;
  /** Print-&-Cut artwork to show ON the folded box (engine path only): a decoded
   *  image placed at a rect in dieline POINTS (trim coords, same as the flat
   *  preview) + rotation. Rendered as a decal on each panel's outer face via
   *  flat-sheet UVs, so it splits across panels and folds with them. */
  artwork?: { image: CanvasImageSource; xPt: number; yPt: number; wPt: number; hPt: number; rotDeg: number };
  /** Per-decoration colour overrides (the printable face), keyed by decoration
   *  id — so the 3D face matches the editor's chosen colours. */
  decorColors?: Record<string, string>;
}

export interface Foldable {
  group: THREE.Group;
  /** 0 = closed, 1 = fully open. */
  setFold: (t: number) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function buildFoldable(opts: FoldableOpts): Foldable {
  if (opts.modelId === "heart-box") return heartBoxFoldable(opts);
  if (opts.modelId === "bookmark") return bookmarkFoldable(opts);
  if (opts.modelId === "pillow-box") return pillowFoldable(opts);
  if (opts.modelId === "cupcake-wrapper") return cupcakeFoldable(opts);
  if (opts.modelId === "belly-band") return bellyBandFoldable(opts);
  if (opts.modelId === "place-card") return placeCardFoldable(opts);
  if (opts.modelId === "paper-rosette") return paperRosetteFoldable(opts);
  if (opts.modelId === "favor-pouch") return pyramidPouchFoldable(opts);
  if (opts.modelId === "paper-lantern") return paperLanternFoldable(opts);
  if (opts.modelId === "folded-star") return foldedStarFoldable(opts);
  if (opts.modelId === "paper-flower") return paperFlowerFoldable(opts);
  if (opts.modelId === "party-hat") return partyHatFoldable(opts);
  if (opts.modelId === "napkin-ring") return napkinRingFoldable(opts);
  if (hasFoldSpec(opts.modelId) || hasMultiFoldSpec(opts.modelId)) {
    return engineFoldable(opts);
  }
  // No spec (shouldn't happen for registry models) — render nothing rather
  // than crash the editor.
  console.warn(`buildFoldable: no FoldSpec for "${opts.modelId}"`);
  const group = new THREE.Group();
  return { group, setFold: () => {} };
}

// ---- Bookmark (bespoke): a thin extruded card rendered face-on. The exact cut
// outline (including the tassel hole) is derived from the real dieline so
// 3D ⇄ flat can't desync.
// THREE.Shape is in XY (face toward the camera), extruded a tiny depth in +Z.
// A gentle rotation.y tilt shows the card has real thickness.  ----
function bookmarkFoldable(opts: FoldableOpts): Foldable {
  const { Lpt, Wpt, scale, material, buildParams } = opts;

  // Build the real dieline at the current shape so 3D uses the exact outline.
  const die = getModel("bookmark").build({
    L: Lpt, W: Wpt, H: 0,
    thickness: mmToPt(0.018), bleed: 0,
    ...(buildParams ?? {}),
  });

  const cx = die.widthPt / 2;
  const cy = die.heightPt / 2;

  // Map a dieline Pt array → THREE XY plane (flip y because dieline is y-down).
  const toScene = ([x, y]: [number, number]): [number, number] =>
    [(x - cx) * scale, -(y - cy) * scale];

  const ptsToShape = (pts: [number, number][], target: THREE.Shape | THREE.Path) => {
    pts.forEach(([x, y], i) => {
      const [sx, sy] = toScene([x, y]);
      if (i === 0) target.moveTo(sx, sy);
      else target.lineTo(sx, sy);
    });
    target.closePath();
  };

  // Outer silhouette (cut[0]) — flatten so Q-bezier curves become clean polygons.
  const threeShape = new THREE.Shape();
  ptsToShape(flattenPolyline(die.paths.cut[0], 24).pts as [number, number][], threeShape);

  // Interior closed cuts (tassel hole) become holes; open cuts are skipped.
  for (let i = 1; i < die.paths.cut.length; i++) {
    const cp = die.paths.cut[i];
    if (!cp.closed) continue;
    const hole = new THREE.Path();
    ptsToShape(flattenPolyline(cp, 16).pts as [number, number][], hole);
    threeShape.holes.push(hole);
  }

  // Very thin extrusion — like a real card (≈ 0.5 mm).
  const depth = mmToPt(0.5) * scale;
  const geo = new THREE.ExtrudeGeometry(threeShape, { depth, bevelEnabled: false });
  const mat = (material as THREE.MeshStandardMaterial).clone();
  mat.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = mesh.receiveShadow = true;
  // Centre in Z so the face sits flush at z=0 facing the camera.
  mesh.position.z = -depth / 2;

  const group = new THREE.Group();
  group.add(mesh);
  // Slight rightward turn so the card edge reads as "physical" depth.
  group.rotation.y = 0.22;

  return { group, setFold: () => {} };
}

// ---- Heart box (bespoke): two extruded heart prisms (base + lid) stacked with
// the lid lifting off. Editor: L = heart width, H = wall depth.
// THREE.Shape in XY plane, extruded in local +Z. rotation.x = -π/2 maps
//   local +Z → world +Y (upward) — BOTH pieces use this.
// The heart is centred: humps at local +Y (→ world -Z, background) and
// tip at local -Y (→ world +Z, toward camera) — natural heart silhouette. ----
function heartBoxFoldable(opts: FoldableOpts): Foldable {
  const { Lpt: heartWPt, Hpt: wallHPt, scale, material } = opts;
  const fitPt = mmToPt(1.5);                                    // thickness+clearance
  const lidWPt = heartWPt + 2 * fitPt;
  const lidWallHPt = Math.max(mmToPt(8), wallHPt * 0.6);

  const wallH = wallHPt * scale;
  const lidWallH = lidWallHPt * scale;

  // Build a THREE.Shape for a heart of width `wPt`, centred at the origin.
  // Humps at local +Y, tip at local -Y. humpAbove/fullH are in POINTS already.
  const mkHeartShape = (wPt: number) => {
    const bnd = heartBounds(wPt);
    const s = (wPt / 32) * scale;
    const centerScreenY = -bnd.humpAbove + bnd.fullH / 2;
    const shape = new THREE.Shape();
    const n = 80;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2;
      const rx = 16 * Math.pow(Math.sin(t), 3);
      const ry = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const x = (rx + 16) * s - (wPt / 2) * scale;
      const y = (centerScreenY - (5 - ry) * (wPt / 32)) * scale;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    return shape;
  };

  // DoubleSide so the floor and interior walls are visible when the lid is open.
  const heartMat = (material as THREE.MeshStandardMaterial).clone();
  heartMat.side = THREE.DoubleSide;

  const group = new THREE.Group();

  // BASE: rotation.x=-π/2 maps local +Z → world +Y.
  //   front cap (z=0) at world y=0 (the floor, normal faces DOWN)
  //   back cap  (z=wallH) at world y=wallH (the rim, normal faces UP ← visible)
  //   walls run from y=0 upward to y=wallH ✓
  const baseGeo = new THREE.ExtrudeGeometry(mkHeartShape(heartWPt), { depth: wallH, bevelEnabled: false });
  const baseMesh = new THREE.Mesh(baseGeo, heartMat);
  baseMesh.castShadow = baseMesh.receiveShadow = true;
  baseMesh.rotation.x = -Math.PI / 2;
  baseMesh.position.y = 0;
  group.add(baseMesh);

  // LID: same rotation (-π/2, extrudes upward).
  //   position.y = wallH-lidWallH so the back cap (ceiling) lands at wallH = base rim.
  //   front cap at y=wallH-lidWallH (inside bottom of lid walls)
  //   back cap  at y=wallH (the visible ceiling ← largest face, facing UP ✓)
  //   walls wrap OUTSIDE the base walls (lidW > baseW) from wallH-lidWallH to wallH ✓
  const lidGeo = new THREE.ExtrudeGeometry(mkHeartShape(lidWPt), { depth: lidWallH, bevelEnabled: false });
  const lidMesh = new THREE.Mesh(lidGeo, heartMat);
  lidMesh.castShadow = lidMesh.receiveShadow = true;
  lidMesh.rotation.x = -Math.PI / 2;
  lidMesh.position.y = wallH - lidWallH;
  group.add(lidMesh);

  // Assembled span y=0 (floor) to y=wallH (rim/ceiling); centre the group.
  group.position.y = -wallH / 2;

  const setFold = (tt: number) => {
    const t = clamp(tt, 0, 1);
    // t=0: lid closed (ceiling at wallH, telescoped over the base rim)
    // t=1: lid raised high above the base
    lidMesh.position.y = (wallH - lidWallH) + t * (wallH + lidWallH) * 1.5;
  };
  setFold(0);
  return { group, setFold };
}

// ---- Pillow box (bespoke): two bowed panels meeting along the side folds,
// with curved PINCHED ends. The depth is the editor's H input (= D here);
// h = D·scale. Length l runs along X (so the 3/4 camera sees the long bowed
// body, not a flat-on sheet); width w along Z; bow along Y.
//   y(x,z) = ±amp · cos(π·z/w) · endTaper(x)
// cos across the WIDTH gives the lens cross-section (meeting at the side
// folds). endTaper keeps the bow ~constant over the body and rounds it to a
// seam only near the two ends (|x|→l/2) — that's what makes it read as a
// pillow rather than an almond. ----
function pillowFoldable(opts: FoldableOpts): Foldable {
  const { Lpt, Wpt, Hpt, scale, material } = opts;
  const l = Lpt * scale;
  const w = Wpt * scale;
  const h = Hpt * scale;
  const group = new THREE.Group();

  const segs = 36;
  const endZone = Math.min(w * 0.7, l * 0.4); // how far in the ends close
  const smooth = (e: number) => e * e * (3 - 2 * e); // smoothstep
  const endTaper = (x: number) => smooth(clamp((l / 2 - Math.abs(x)) / endZone, 0, 1));

  // Length l along X, width w along Y, the two faces facing ±Z. The bow is
  // along Z (toward the camera), so the puff is obvious from the standard 3/4
  // view instead of being foreshortened away as it is when the bow points up.
  // Bulge each END outward into an arc (sagitta = depth/2, the SAME curve the
  // dieline cuts at the tuck ends) so the assembled pillow has ARCHED ends, not
  // straight seams. Without this the model is a flat-edged sheet — the "straight
  // lines" instead of the arch the flat promises.
  const sBulge = h / 2; // end-arc sagitta (depth/2), in scaled units
  const archEnds = (geo: THREE.BufferGeometry) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const tEnd = Math.pow(clamp(Math.abs(x) / (l / 2), 0, 1), 1.6); // ramp toward the ends
      const across = 1 - (2 * y / w) ** 2;                            // 1 at centre → 0 at the side folds
      pos.setX(i, x + Math.sign(x) * sBulge * across * tEnd);
    }
    pos.needsUpdate = true;
  };
  const mkPanel = () => {
    const geo = new THREE.PlaneGeometry(l, w, segs, segs);
    archEnds(geo);
    const mesh = new THREE.Mesh(geo, material); // smooth surface, no edge lines
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return geo;
  };
  const gFront = mkPanel();
  const gBack = mkPanel();

  // Print artwork: the flat is [glue][Panel A (W)][Panel B (W)] × (L + 2·s).
  // Front panel ← Panel A's flat rect, back panel ← Panel B's, so a dropped
  // design splits across the front/back exactly as it lays on the flat.
  if (opts.artwork) {
    const { w: dieW, h: dieH } = bespokeDieSize(opts);
    const glueFlap = Math.max(0, dieW - 2 * Wpt);
    const sEnd = Math.max(0, (dieH - Lpt) / 2);
    const setUV = (g: THREE.BufferGeometry, panelX0: number) => {
      const p = g.attributes.position as THREE.BufferAttribute;
      const uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) {
        const lx = p.getX(i) / scale, ly = p.getY(i) / scale; // → points
        uv[i * 2] = (panelX0 + (ly + Wpt / 2)) / dieW;        // local y (W) → flat x
        uv[i * 2 + 1] = (sEnd + (lx + Lpt / 2)) / dieH;        // local x (L) → flat y
      }
      g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    };
    setUV(gFront, glueFlap);
    setUV(gBack, glueFlap + Wpt);
    const print = buildPrintCtx(opts.artwork, dieW, dieH, THREE.DoubleSide);
    if (print) {
      const df = new THREE.Mesh(gFront, print.mat); df.renderOrder = 2; group.add(df);
      const db = new THREE.Mesh(gBack, print.mat); db.renderOrder = 2; group.add(db);
    }
  }

  const displace = (geo: THREE.BufferGeometry, sign: number, amp: number) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, sign * amp * Math.cos((Math.PI * y) / w) * endTaper(x));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
  // Yaw the body ~90° from face-on so the camera looks more along the LENGTH
  // and sees the bowed WIDTH cross-section as the pillow's arched lens. Looking
  // nearly flat-on at the face (the old ~-28° yaw) foreshortens the puff into
  // straight-edged "sheet" lines with no visible arch; turning it a quarter
  // brings the ∩ cross-section forward so it reads as a pillow.
  group.rotation.y = -Math.PI / 6.5 + Math.PI / 2; // ≈ 62° (a ~90° turn)
  group.rotation.x = 0.26;                          // slight downward tilt
  const setFold = (t: number) => {
    // Keep most of the bow across the slider so the pillow reads as 3D, not a
    // sheet (full bow closed; still clearly bowed at the default half-fold).
    const amp = (h / 2) * (1 - 0.7 * t);
    displace(gFront, +1, amp);
    displace(gBack, -1, amp);
  };
  setFold(0);
  return { group, setFold };
}

// ---- Cupcake wrapper (bespoke): the flat scalloped annular SECTOR rolled into
// a truncated cone. We don't fold flat panels at creases (the Fold Engine's
// job) — we MAP the real flat sector onto the cone, so the scalloped flat edge
// becomes the scalloped rim automatically (no separate 3D scallop code). The
// fold slider MORPHS each vertex flat (t=1) ↔ rolled cone (t=0). ----
function cupcakeFoldable(opts: FoldableOpts): Foldable {
  const { Lpt, Wpt, Hpt, scale, material } = opts;
  const u = cupcakeUnroll({ ...cupcakeDefaults(Lpt, Wpt, Hpt), bleed: 0 });
  const { theta, rim } = u;
  const cols = rim.length;
  const nV = 18; // rows base→top

  // Per-vertex FLAT POLAR (ρ from apex, φ across the sector). The unroll is a
  // DEVELOPABLE (isometric, length-preserving) family of cones: a flat sector
  // wrapped onto a cone of half-angle α maps (ρ,φ) → (ρ·sinα·cos(φ/sinα),
  // ρ·cosα, ρ·sinα·sin(φ/sinα)) — arc lengths are preserved at every α, so the
  // paper stays rigid (no shrink/crumple). α runs from the cupcake cone
  // (sinα = θ/2π, the full wrap) at t=0 to flat (α = π/2) at t=1.
  const rho: number[] = [], phi: number[] = [];
  for (let i = 0; i < cols; i++) {
    const ph = rim[i].phi, rTop = rim[i].rho;
    for (let j = 0; j <= nV; j++) { const v = j / nV; rho.push(u.rhoB + v * (rTop - u.rhoB)); phi.push(ph); }
  }
  const N = rho.length;
  const aCone = Math.asin(Math.min(0.999, theta / (2 * Math.PI)));

  // Triangulate WITHOUT wrapping the seam: the two edge columns coincide on the
  // closed cone (azimuth ±π), so it reads closed — and a wrap-quad would stretch
  // across the whole piece as a spurious band when unrolled flat.
  const idx: number[] = [];
  const vid = (i: number, j: number) => i * (nV + 1) + j;
  for (let i = 0; i < cols - 1; i++) for (let j = 0; j < nV; j++) {
    const a = vid(i, j), b = vid(i + 1, j), c = vid(i + 1, j + 1), d = vid(i, j + 1);
    idx.push(a, b, c, a, c, d);
  }

  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, material); // DoubleSide thin shell
  mesh.castShadow = mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.add(mesh);

  // Print-&-Cut artwork: paint the dropped image onto the cone. Each vertex's
  // FLAT sector position is (ρ·sinφ, ρ·cosφ) — the same coords the dieline uses,
  // shifted to the dieline's 0-origin frame (a 1 mm margin, like buildCupcake) —
  // so the artwork wraps onto the cone exactly as placed on the flat. UVs are
  // static (fold doesn't change them); the overlay shares the cone geometry so
  // it morphs with it.
  if (opts.artwork) {
    let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
    const fx: number[] = [], fy: number[] = [];
    for (let n = 0; n < N; n++) {
      const x = rho[n] * Math.sin(phi[n]), y = rho[n] * Math.cos(phi[n]);
      fx.push(x); fy.push(y);
      if (x < mnx) mnx = x; if (y < mny) mny = y; if (x > mxx) mxx = x; if (y > mxy) mxy = y;
    }
    const mm = mmToPt(1);
    const txp = -mnx + mm, typ = -mny + mm;
    const dW = (mxx - mnx) + 2 * mm, dH = (mxy - mny) + 2 * mm;
    const uv = new Float32Array(N * 2);
    for (let n = 0; n < N; n++) { uv[n * 2] = (fx[n] + txp) / dW; uv[n * 2 + 1] = (fy[n] + typ) / dH; }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    const print = buildPrintCtx(opts.artwork, dW, dH, THREE.DoubleSide);
    if (print) { const deco = new THREE.Mesh(geo, print.mat); deco.renderOrder = 2; group.add(deco); }
  }

  const setFold = (tt: number) => {
    const t = clamp(tt, 0, 1);
    const alpha = aCone + t * (Math.PI / 2 - aCone);
    const sA = Math.max(Math.sin(alpha), 1e-4), cA = Math.cos(alpha);
    let cx = 0, cy = 0, cz = 0;
    for (let n = 0; n < N; n++) {
      const r = rho[n], a = phi[n] / sA, R = r * sA;
      const x = R * Math.cos(a), y = r * cA, z = R * Math.sin(a);
      pos[n * 3] = x; pos[n * 3 + 1] = y; pos[n * 3 + 2] = z;
      cx += x; cy += y; cz += z;
    }
    cx /= N; cy /= N; cz /= N; // recenter each frame so it doesn't drift as α opens
    for (let n = 0; n < N; n++) {
      pos[n * 3] = (pos[n * 3] - cx) * scale;
      pos[n * 3 + 1] = (pos[n * 3 + 1] - cy) * scale;
      pos[n * 3 + 2] = (pos[n * 3 + 2] - cz) * scale;
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    geo.computeVertexNormals();
  };
  setFold(0);
  return { group, setFold };
}

// ---- Belly band (bespoke): the flat strip WRAPPED around a product. We bend
// the strip around a rounded-rect cross-section (perimeter = girth) — a
// developable wrap (paper stays rigid). A faint product slab sits inside so it
// reads as "wrapped around something." The fold slider peels the seam end up
// (closed = wrapped, open = the end lifted). ----
function bellyBandFoldable(opts: FoldableOpts): Foldable {
  const { Lpt: girth, Wpt: bandW, scale, material } = opts;
  const overlap = girth * 0.1;
  const length = girth + overlap;
  const thick = girth * 0.02;             // band stands off the product so it reads as a wrap

  // Rounded-rect cross-section (flat product), CCW, perimeter scaled to girth.
  const aspect = 3.2, baseT = 100, baseW = aspect * baseT, rc = baseT * 0.45;
  const hw = baseW / 2, ht = baseT / 2;
  const arc = (cx: number, cz: number, a0: number, a1: number): [number, number][] => {
    const o: [number, number][] = [];
    for (let i = 0; i <= 6; i++) { const a = a0 + (a1 - a0) * i / 6; o.push([cx + rc * Math.cos(a), cz + rc * Math.sin(a)]); }
    return o;
  };
  let path: [number, number][] = [
    ...arc(hw - rc, -(ht - rc), -Math.PI / 2, 0),
    ...arc(hw - rc, ht - rc, 0, Math.PI / 2),
    ...arc(-(hw - rc), ht - rc, Math.PI / 2, Math.PI),
    ...arc(-(hw - rc), -(ht - rc), Math.PI, 3 * Math.PI / 2),
  ];
  // perimeter + scale so it equals `girth`
  let perim = 0;
  for (let i = 0; i < path.length; i++) { const a = path[i], b = path[(i + 1) % path.length]; perim += Math.hypot(b[0] - a[0], b[1] - a[1]); }
  const sc = girth / perim;
  path = path.map(([x, z]): [number, number] => [x * sc, z * sc]);
  // cumulative arc length around the closed path
  const cum: number[] = [0];
  for (let i = 0; i < path.length; i++) { const a = path[i], b = path[(i + 1) % path.length]; cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const total = cum[path.length]; // == girth
  // point + unit tangent + outward normal at arc-length u (mod girth)
  const at = (u: number) => {
    let s = ((u % total) + total) % total;
    let i = 0; while (i < path.length && cum[i + 1] < s) i++;
    const a = path[i], b = path[(i + 1) % path.length];
    const segLen = cum[i + 1] - cum[i] || 1;
    const f = (s - cum[i]) / segLen;
    const x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f;
    let tx = b[0] - a[0], tz = b[1] - a[1]; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    return { x, z, tx, tz, nx: tz, nz: -tx }; // outward normal = right of CCW tangent
  };

  // No product shown — just the band wrapped into its loop shape (the user only
  // wants to see how the strip wraps, not a physical product inside).
  const group = new THREE.Group();

  // Band mesh: cols along the length × 2 rows (top/bottom of the band width).
  const cols = 160;
  const sAt: number[] = [];
  for (let c = 0; c <= cols; c++) sAt.push((length * c) / cols);
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array((cols + 1) * 2 * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const idx: number[] = [];
  for (let c = 0; c < cols; c++) {
    const a = c * 2, b = (c + 1) * 2;
    idx.push(a, b, b + 1, a, b + 1, a + 1);
  }
  geo.setIndex(idx);
  const band = new THREE.Mesh(geo, material);
  band.castShadow = band.receiveShadow = true;
  band.scale.setScalar(scale);
  group.add(band);

  // Print artwork: map u along the band length (s / dieW), v across the band
  // width (bottom→top). The overlay shares the geometry (morphs with the wrap)
  // and the same scale.
  if (opts.artwork) {
    const { w: dieW, h: dieH } = bespokeDieSize(opts);
    const uv = new Float32Array((cols + 1) * 2 * 2);
    for (let c = 0; c <= cols; c++) {
      const u = Math.min(1, sAt[c] / dieW);
      uv[c * 4] = u; uv[c * 4 + 1] = 0;
      uv[c * 4 + 2] = u; uv[c * 4 + 3] = 1;
    }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    const print = buildPrintCtx(opts.artwork, dieW, dieH, THREE.DoubleSide);
    if (print) { const deco = new THREE.Mesh(geo, print.mat); deco.scale.setScalar(scale); deco.renderOrder = 2; group.add(deco); }
  }

  const setFold = (tt: number) => {
    const t = clamp(tt, 0, 1);
    const wrapLen = length * (1 - 0.35 * t); // peel up to 35% of the end as t→1
    for (let c = 0; c <= cols; c++) {
      const s = sAt[c];
      let bx: number, bz: number;
      if (s <= wrapLen) {
        const p = at(s);
        const off = s > girth ? thick : thick * 0.15; // the overlap laps OVER layer 1
        bx = p.x + p.nx * off; bz = p.z + p.nz * off;
      } else {
        const p = at(wrapLen);
        const d = s - wrapLen;
        bx = p.x + p.nx * thick + p.tx * d; bz = p.z + p.nz * thick + p.tz * d; // straight tangent tail
      }
      const i0 = c * 2 * 3, i1 = i0 + 3;
      pos[i0] = bx; pos[i0 + 1] = -bandW / 2; pos[i0 + 2] = bz;
      pos[i1] = bx; pos[i1 + 1] = bandW / 2; pos[i1 + 2] = bz;
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    geo.computeVertexNormals();
  };
  setFold(0);
  return { group, setFold };
}

// ---- Place card / table tent (bespoke): two panels (W × H) hinged at a top
// ridge, splaying down to the table like an inverted V. The fold slider opens
// the splay (closed = a standing tent, open = the two panels flat). Symmetric,
// so it reads as a real tent (the Fold Engine roots a single panel, which can't
// give a symmetric tent). ----
function placeCardFoldable(opts: FoldableOpts): Foldable {
  const { Lpt: W, Wpt: H, scale, material } = opts;
  const group = new THREE.Group();
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(8 * 3); // 4 verts × 2 panels
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  const mesh = new THREE.Mesh(geo, material); // DoubleSide thin card
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);

  // Print artwork: the flat card is W × 2H (fold at the middle). Top half → panel
  // A, bottom half → panel B, so a dropped design wraps over the ridge. v uses
  // flipY=false (flat y / dieH); the fold line (y=H) is v=0.5.
  if (opts.artwork) {
    const dieW = W, dieH = 2 * H;
    geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([
      0, 0.5, 1, 0.5, 1, 0, 0, 0,   // A: ridge(y=H) → base(y=0)
      0, 0.5, 1, 0.5, 1, 1, 0, 1,   // B: ridge(y=H) → base(y=2H)
    ]), 2));
    const print = buildPrintCtx(opts.artwork, dieW, dieH, THREE.DoubleSide);
    if (print) { const deco = new THREE.Mesh(geo, print.mat); deco.renderOrder = 2; group.add(deco); }
  }

  const setFold = (tt: number) => {
    const t = clamp(tt, 0, 1);
    const phi = (20 * Math.PI / 180) + t * (Math.PI / 2 - 20 * Math.PI / 180); // splay from ~20° to flat
    const Hc = H * Math.cos(phi), Hs = H * Math.sin(phi);
    const hw = W / 2, cy = Hc / 2; // centre the tent vertically
    const s = scale;
    const set = (i: number, x: number, y: number, z: number) => { pos[i * 3] = x * s; pos[i * 3 + 1] = (y - cy) * s; pos[i * 3 + 2] = z * s; };
    // panel A (leans +Z): ridge (top, z=0) → base (+Hs)
    set(0, -hw, Hc, 0); set(1, hw, Hc, 0); set(2, hw, 0, Hs); set(3, -hw, 0, Hs);
    // panel B (leans −Z)
    set(4, -hw, Hc, 0); set(5, hw, Hc, 0); set(6, hw, 0, -Hs); set(7, -hw, 0, -Hs);
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    geo.computeVertexNormals();
  };
  setFold(0);
  return { group, setFold };
}

// ---- Paper rosette / fan medallion (bespoke): the accordion-pleated strip
// fanned into a full circle. We build a pleated annulus (inner radius = centre
// hole, outer = rim) of M radial creases whose z alternates ±amp (peaks &
// valleys); the facets between them are the accordion pleats. The fold slider
// FANS it: t=0 = the finished full-circle medallion, t→1 = a folded hand-fan
// wedge (the angular span shrinks). A centre disc covers the hole at full fan.
// Like the cupcake/pillow, this is a roll/fan the Fold Engine can't make. ----
function paperRosetteFoldable(opts: FoldableOpts): Foldable {
  const { Lpt: D, Wpt: pleat, scale, material } = opts;
  const dCenter = clamp(D * 0.36, mmToPt(22), D * 0.7); // matches the model's centre disc
  const rOut = (D / 2) * scale;
  const rIn = (dCenter / 2) * scale;
  let M = Math.round((Math.PI * D) / Math.max(pleat, mmToPt(2))); // creases around the full circle
  M = Math.max(16, Math.min(160, M));
  if (M % 2 !== 0) M += 1; // even ⇒ clean peak/valley alternation + closed seam
  const arcOut = (2 * Math.PI * rOut) / M;
  const amp = clamp(arcOut * 0.5, rOut * 0.04, rOut * 0.16); // pleat half-depth in z

  const group = new THREE.Group();

  // Thin double-sided shell so both faces of the pleats render.
  const shellMat = (material as THREE.MeshStandardMaterial).clone();
  shellMat.side = THREE.DoubleSide;

  // Pleated fan: (M+1) creases × (inner, outer) vertices.
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array((M + 1) * 2 * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const inner = (k: number) => k * 2;
  const outer = (k: number) => k * 2 + 1;
  const idx: number[] = [];
  for (let k = 0; k < M; k++) {
    const i0 = inner(k), o0 = outer(k), i1 = inner(k + 1), o1 = outer(k + 1);
    idx.push(i0, o0, o1, i0, o1, i1);
  }
  geo.setIndex(idx);
  const fan = new THREE.Mesh(geo, shellMat);
  fan.castShadow = fan.receiveShadow = true;
  group.add(fan);

  // Centre medallion disc (covers the hole) — only meaningful at near-full fan.
  const disc = new THREE.Mesh(new THREE.CircleGeometry(rIn * 1.14, 48), shellMat);
  disc.castShadow = true;
  group.add(disc);

  const setFold = (tt: number) => {
    const t = clamp(tt, 0, 1);
    // t=1 = fanned OPEN (full circle, the finished medallion = the largest
    // extent, which is what Box3D frames its sphere on); t=0 = folded hand-fan.
    const span = 2 * Math.PI * (0.15 + 0.85 * t);
    for (let k = 0; k <= M; k++) {
      const th = (k / M) * span;
      const z = k % 2 === 0 ? amp : -amp;
      const ct = Math.cos(th), st = Math.sin(th);
      const ci = inner(k) * 3, co = outer(k) * 3;
      pos[ci] = rIn * ct; pos[ci + 1] = rIn * st; pos[ci + 2] = z;
      pos[co] = rOut * ct; pos[co + 1] = rOut * st; pos[co + 2] = z;
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    geo.computeVertexNormals();
    disc.position.set(0, 0, amp + rOut * 0.012); // sit just proud of the front peaks
    disc.visible = span > 1.6 * Math.PI; // hide once it's clearly a folded fan, not a disc
  };
  setFold(1);
  // Built in XY with z = pleat depth (normal +z). The camera sits low (~24°
  // elevation) at +x/+y/+z, so we keep the medallion roughly FACING it (a wall
  // medallion) — only ~41° off its normal, so the full circle reads — with a
  // gentle tilt/turn so the radial pleats catch the light and show depth.
  group.rotation.x = -0.32;
  group.rotation.y = 0.28;
  return { group, setFold };
}

// ---- Pyramid favor pouch (bespoke): the rolled-tube blank pinched into a
// tetrahedron — the bottom seam (an edge) and the top seam (an edge) are
// PERPENDICULAR, which is what makes the 4 triangular faces. The fold slider
// puffs it: t=1 = full pyramid (the largest extent, what Box3D frames on), t=0 =
// the flat collapsed blank (top edge swung parallel to the bottom). Non-indexed
// (each face its own verts) for crisp faceted shading. ----
function pyramidPouchFoldable(opts: FoldableOpts): Foldable {
  const { Lpt: bPt, Wpt: hPt, scale, material } = opts;
  const b = Math.max(bPt, mmToPt(20)) * scale;  // base side (guard a 0 dim → NaN geometry)
  const Hp = Math.max(hPt, mmToPt(10)) * scale; // pyramid height
  const slant = Math.hypot(b / 2, Hp);          // face (triangle) height
  const group = new THREE.Group();

  const mat = (material as THREE.MeshStandardMaterial).clone();
  mat.side = THREE.DoubleSide;

  // square base (y=0) + 4 triangular walls whose apex moves with the fold.
  // 18 verts: base = 2 tris (6) + 4 walls × 3 (12).
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(18 * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);

  type V = [number, number, number];
  const hb = b / 2;
  const c0: V = [-hb, 0, -hb], c1: V = [hb, 0, -hb], c2: V = [hb, 0, hb], c3: V = [-hb, 0, hb];
  // each wall hinges on one base edge and folds up + inward toward the apex
  const walls: { s: V; e: V; ox: number; oz: number }[] = [
    { s: c0, e: c1, ox: 0, oz: -1 },
    { s: c1, e: c2, ox: 1, oz: 0 },
    { s: c2, e: c3, ox: 0, oz: 1 },
    { s: c3, e: c0, ox: -1, oz: 0 },
  ];
  // fold angle so the apex lands at (0, Hp, 0): leans in past vertical (obtuse).
  const phiEnd = Math.atan2(Hp, -hb);

  const setFold = (tt: number) => {
    const t = clamp(tt, 0, 1);
    const phi = t * phiEnd;
    const cos = Math.cos(phi) * slant, sin = Math.sin(phi) * slant;
    let i = 0;
    const put = (v: V) => { pos[i++] = v[0]; pos[i++] = v[1]; pos[i++] = v[2]; };
    put(c0); put(c1); put(c2);                 // base (2 tris)
    put(c0); put(c2); put(c3);
    for (const w of walls) {
      const mx = (w.s[0] + w.e[0]) / 2, mz = (w.s[2] + w.e[2]) / 2;
      const apex: V = [mx + w.ox * cos, sin, mz + w.oz * cos]; // up + inward
      put(w.s); put(w.e); put(apex);
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    geo.computeVertexNormals();
  };
  setFold(1);
  group.rotation.y = -0.5; // 3/4 view: a base corner toward the camera
  return { group, setFold };
}

// ---- Layered paper flower (bespoke) ----
// A cupped flower-burst LAYER: the SAME lobed polygon as the diecut
// (`burstRadius`), triangle-fanned from the hub, with each rim vertex LIFTED in
// +Y by the fold (petals curl up, hub stays flat). Returns the geometry + an
// updater so the fold slider re-cups it in place.
function flowerLayerGeo(count: number, R: number, rHub: number, cup: number) {
  const M = Math.max(72, count * 24);
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array((M + 2) * 3); // hub centre + M rim + closing dup
  const idx: number[] = [];
  for (let i = 1; i <= M; i++) idx.push(0, i, i + 1);
  geo.setIndex(idx);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const update = (t: number) => {
    pos[0] = 0; pos[1] = 0; pos[2] = 0;                 // hub centre, flat
    for (let i = 0; i <= M; i++) {
      const a = (i / M) * Math.PI * 2;
      const r = burstRadius(count, R, rHub, a);
      const lobe = (r - rHub) / Math.max(R - rHub, 1e-6); // 0 at hub … 1 at tip
      const k = (i + 1) * 3;
      pos[k] = r * Math.cos(a);
      pos[k + 1] = t * cup * lobe;                       // petal tips lift most
      pos[k + 2] = r * Math.sin(a);
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    geo.computeVertexNormals();
  };
  update(1);
  return { geo, update };
}

function paperFlowerFoldable(opts: FoldableOpts): Foldable {
  const { Lpt: D, scale, material } = opts;
  const R0 = (Math.max(D, mmToPt(20)) / 2) * scale; // outer radius (guard a 0 dim)

  const group = new THREE.Group();
  const mat = (material as THREE.MeshStandardMaterial).clone();
  mat.side = THREE.DoubleSide;
  mat.polygonOffset = true; mat.polygonOffsetFactor = -1; // reduce z-fight between stacked layers

  // The SAME graduated layers as the diecut (FLOWER_LAYERS): biggest at the back
  // (lowest), smallest in front (highest). Each layer cups GENTLY (a shallow
  // dome, not a steep funnel) — inner tiers a touch more — so they nest into a
  // clean layered bloom rather than splaying like a splat.
  const updaters: ((t: number) => void)[] = [];
  const layerGap = R0 * 0.04;
  FLOWER_LAYERS.forEach((L, i) => {
    const R = R0 * L.s;
    const rHub = R * FLOWER_HUB_FRAC;
    const cup = R0 * (0.07 + 0.05 * i);              // gentle dome; inner tiers cup a bit more
    const { geo, update } = flowerLayerGeo(L.count, R, rHub, cup);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = m.receiveShadow = true;
    m.position.y = i * layerGap;                     // stack the tiers
    m.rotation.y = i * 0.4;                           // stagger petals into the gaps
    group.add(m);
    updaters.push(update);
  });
  // flat centre disc (a disc — NOT a sphere) seated on the CENTRE of the top
  // (inner) layer's hub, on the flower axis (x=z=0) so it caps the middle.
  const innerHubY = (FLOWER_LAYERS.length - 1) * layerGap;
  const rc = R0 * 0.22;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(rc, 40), mat);
  disc.rotation.x = -Math.PI / 2;                    // lie flat (face up)
  disc.position.set(0, innerHubY + R0 * 0.015, 0);   // tiny bit proud of the hub
  disc.castShadow = true;
  group.add(disc);

  const setFold = (tt: number) => {
    const t = clamp(tt, 0, 1);
    for (const u of updaters) u(t);                  // bloom flat (t=0) → domed (t=1)
  };
  setFold(1);
  // The flower faces UP (+Y); the Box3D camera sits low (~24°), so tip it forward
  // (face toward the camera) — otherwise it reads edge-on. The gallery snapshot
  // mirrors this pose so the thumbnail matches the editor.
  group.rotation.x = 1.0;
  group.rotation.y = 0.2;
  return { group, setFold };
}

// ---- Paper lantern (bespoke): the slit-cylinder rolled into a tube, then the
// two solid bands pushed together so the strips between the slits BOW OUT into a
// barrel. N curved strips (matching the diecut's slit count) between a top and
// bottom band; the fold slider squishes it from a straight cylinder (t=0) to the
// bowed lantern (t=1 = the largest extent, what Box3D frames on). ----
function paperLanternFoldable(opts: FoldableOpts): Foldable {
  const { Lpt: D, Wpt: Hpt, scale, material } = opts;
  const r = (D / 2) * scale;
  const h = Hpt * scale;
  const N = lanternStrips(D);
  const bandH = clamp(Hpt * 0.13, mmToPt(8), Hpt * 0.3) * scale;
  const fieldH0 = h - 2 * bandH;
  const rows = 8;
  const halfW = (Math.PI / N) * 0.82; // strip angular half-width (gaps = the slits)

  const group = new THREE.Group();
  const shellMat = (material as THREE.MeshStandardMaterial).clone();
  shellMat.side = THREE.DoubleSide;

  // All N strips in one geometry: per strip (rows+1) × 2 columns.
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * (rows + 1) * 2 * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const vid = (s: number, j: number, c: number) => ((s * (rows + 1) + j) * 2 + c);
  const idx: number[] = [];
  for (let s = 0; s < N; s++) for (let j = 0; j < rows; j++) {
    const a = vid(s, j, 0), b = vid(s, j, 1), c = vid(s, j + 1, 1), d = vid(s, j + 1, 0);
    idx.push(a, b, c, a, c, d);
  }
  geo.setIndex(idx);
  const strips = new THREE.Mesh(geo, shellMat);
  strips.castShadow = strips.receiveShadow = true;
  group.add(strips);

  // Top & bottom solid bands (open cylinders, radius r) — they only move toward
  // each other as the lantern squishes.
  const mkBand = () => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, bandH, Math.max(24, N * 2), 1, true), shellMat);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    return m;
  };
  const bandTop = mkBand(), bandBot = mkBand();

  const setFold = (tt: number) => {
    const t = clamp(tt, 0, 1);
    const squish = 0.45 * t;             // field compresses vertically
    const bow = 0.42 * t;                // strips bow outward
    const fieldH = fieldH0 * (1 - squish);
    const total = fieldH + 2 * bandH;
    const yFieldBot = -total / 2 + bandH;
    for (let s = 0; s < N; s++) {
      const a0 = s * (2 * Math.PI / N) - halfW, a1 = s * (2 * Math.PI / N) + halfW;
      for (let j = 0; j <= rows; j++) {
        const v = j / rows;
        const R = r * (1 + bow * Math.sin(Math.PI * v));
        const y = yFieldBot + v * fieldH;
        const i0 = vid(s, j, 0) * 3, i1 = vid(s, j, 1) * 3;
        pos[i0] = R * Math.cos(a0); pos[i0 + 1] = y; pos[i0 + 2] = R * Math.sin(a0);
        pos[i1] = R * Math.cos(a1); pos[i1 + 1] = y; pos[i1 + 2] = R * Math.sin(a1);
      }
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    geo.computeVertexNormals();
    bandTop.position.y = total / 2 - bandH / 2;
    bandBot.position.y = -total / 2 + bandH / 2;
  };
  setFold(1);
  return { group, setFold };
}

// ---- 3D folded star (bespoke): the flat star scored centre→every vertex,
// folded so the TIPS lift into raised ridges. The facets all meet at the centre
// (a closed fan = a cycle), which the Fold Engine can't do — so it's a hand-built
// fan of triangles whose tip vertices rise with the fold. The slider puffs it
// flat (t=0) → dimensional (t=1 = the largest extent, framed). ----
function foldedStarFoldable(opts: FoldableOpts): Foldable {
  const { Lpt: D, scale, material } = opts;
  const R = (Math.max(D, mmToPt(20)) / 2) * scale; // guard: a 0 diameter would NaN the geometry
  const v = starVertices(R); // centre-origin (x,y); laid in XZ, apex along Y
  const n = v.length;

  const group = new THREE.Group();
  const shellMat = (material as THREE.MeshStandardMaterial).clone();
  shellMat.side = THREE.DoubleSide;

  // TWO halves (front apex +Y, back apex −Y) joined at the rim — the real
  // construction (cut two, glue back-to-back) → a full closed 3D star.
  const mkHalf = () => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3 * 3); // n triangles (fan from centre)
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mesh = new THREE.Mesh(geo, shellMat); // non-indexed → crisp faceted ridges
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return { geo, pos };
  };
  const front = mkHalf(), back = mkHalf();

  const setFold = (tt: number) => {
    const t = clamp(tt, 0, 1);
    // The two halves glue together along their WHOLE perimeter (the star
    // outline), so the perimeter is the shared plane (y = 0) and each half
    // bulges out from its own centre APEX → a star BIPYRAMID whose point edges
    // meet (not splayed open). Front apex +Y, back apex −Y.
    const apex = R * 0.5 * t;
    const fill = (h: { geo: THREE.BufferGeometry; pos: Float32Array }, sign: number) => {
      let k = 0;
      const put = (x: number, y: number, z: number) => { h.pos[k++] = x; h.pos[k++] = y; h.pos[k++] = z; };
      for (let i = 0; i < n; i++) {
        const a = v[i], b = v[(i + 1) % n];
        put(0, apex * sign, 0);                   // centre apex (front +, back −)
        put(a.x, 0, a.y);                          // perimeter vertex — on the shared glue plane
        put(b.x, 0, b.y);
      }
      (h.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      h.geo.computeVertexNormals();
    };
    fill(front, +1);
    fill(back, -1);
  };
  setFold(0.7);
  // Lies in XZ (faces ±Y); tip the front face toward the low Box3D camera so the
  // 5-point shape + raised ridges read (else we'd see it edge-on).
  group.rotation.x = 1.05;
  group.rotation.y = 0.15;
  return { group, setFold };
}

// ---- Party hat (bespoke): a full cone. Isometric developable unroll — the
// same math as the cupcake wrapper but with ρb = 0 (a pointed hat, no inner
// circle). t=0 = flat sector in XZ plane; t=1 = assembled cone tip-up.
// Box3D frames the t=1 bounding sphere so the assembled hat fills the view. ----
function partyHatFoldable(opts: FoldableOpts): Foldable {
  const { Lpt: headDia, Wpt: hatHeight, scale, material } = opts;
  const r = Math.max(headDia / 2, mmToPt(25));    // base radius
  const h = Math.max(hatHeight, mmToPt(50));        // hat height
  const s = Math.sqrt(r * r + h * h);               // slant height
  const theta = 2 * Math.PI * r / s;                // full sector angle
  const aCone = Math.asin(Math.min(0.999, r / s));  // cone half-angle

  const cols = 48, rows = 24;
  const phiArr: number[] = [], rhoArr: number[] = [];
  for (let i = 0; i <= cols; i++) {
    const phi = -theta / 2 + (i / cols) * theta;
    for (let j = 0; j <= rows; j++) {
      phiArr.push(phi);
      rhoArr.push((j / rows) * s);
    }
  }
  const N = rhoArr.length;

  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

  const vid = (i: number, j: number) => i * (rows + 1) + j;
  const idx: number[] = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (j === 0) {
        // tip row: both column-0 verts are the apex — one valid triangle only
        idx.push(vid(i, 0), vid(i + 1, 1), vid(i, 1));
      } else {
        const a = vid(i, j), b = vid(i + 1, j), c = vid(i + 1, j + 1), d = vid(i, j + 1);
        idx.push(a, b, c, a, c, d);
      }
    }
  }
  geo.setIndex(idx);

  const shellMat = (material as THREE.MeshStandardMaterial).clone();
  shellMat.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geo, shellMat);
  mesh.castShadow = mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.add(mesh);

  // t=0 → flat sector (α = π/2); t=1 → assembled hat (α = aCone).
  const setFold = (tt: number) => {
    const t = clamp(tt, 0, 1);
    const alpha = Math.PI / 2 - t * (Math.PI / 2 - aCone);
    const sA = Math.max(Math.sin(alpha), 1e-4), cA = Math.cos(alpha);
    let cx = 0, cy = 0, cz = 0;
    for (let n = 0; n < N; n++) {
      const rho = rhoArr[n], phi = phiArr[n];
      const az = phi / sA;              // azimuth on the cone
      const R = rho * sA;              // radial distance from axis
      // tip-up: y = (s−ρ)·cosA → tip (ρ=0) at y = s·cA ≈ h, base at y = 0.
      const x = R * Math.cos(az), y = (s - rho) * cA, z = R * Math.sin(az);
      pos[n * 3] = x; pos[n * 3 + 1] = y; pos[n * 3 + 2] = z;
      cx += x; cy += y; cz += z;
    }
    cx /= N; cy /= N; cz /= N; // recenter each frame so it stays in view as α opens
    for (let n = 0; n < N; n++) {
      pos[n * 3]     = (pos[n * 3]     - cx) * scale;
      pos[n * 3 + 1] = (pos[n * 3 + 1] - cy) * scale;
      pos[n * 3 + 2] = (pos[n * 3 + 2] - cz) * scale;
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    geo.computeVertexNormals();
  };
  setFold(1); // start at assembled cone
  return { group, setFold };
}

// ---- Napkin ring (bespoke): flat strip → wrapped circle. t=0 = flat strip,
// t=1 = closed ring. The fold slider wraps/unwraps the band (simple linear
// lerp between the flat strip positions and the circular ring positions). ----
function napkinRingFoldable(opts: FoldableOpts): Foldable {
  const { Lpt: girth, Wpt: bandW, scale, material } = opts;
  const g = Math.max(girth, mmToPt(80));
  const bw = Math.max(bandW, mmToPt(20));
  const overlap = Math.min(mmToPt(22), g * 0.2);
  const length = g + overlap;
  const R = g / (2 * Math.PI);         // ring radius
  const thick = R * 0.04;              // outward offset for the overlap layer

  const cols = 72;
  const N = (cols + 1) * 2;            // top + bottom ring vertices

  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

  const idx: number[] = [];
  for (let c = 0; c < cols; c++) {
    const a = c * 2, b = (c + 1) * 2;
    idx.push(a, b, b + 1, a, b + 1, a + 1);
  }
  geo.setIndex(idx);

  const shellMat = (material as THREE.MeshStandardMaterial).clone();
  shellMat.side = THREE.DoubleSide;
  const ring = new THREE.Mesh(geo, shellMat);
  ring.castShadow = ring.receiveShadow = true;
  const group = new THREE.Group();
  group.add(ring);
  group.rotation.x = 0.45; // tilt to show the ring's 3D profile

  const setFold = (tt: number) => {
    const t = clamp(tt, 0, 1);
    for (let c = 0; c <= cols; c++) {
      const sl = (c / cols) * length;
      // ring position at arc length sl
      const a = (Math.min(sl, g) / g) * 2 * Math.PI;
      const r = sl > g ? R + thick : R;
      const rx = r * Math.cos(a), rz = r * Math.sin(a);
      // flat position (strip centred on x-axis)
      const fx = sl - length / 2;
      // lerp
      const bx = (fx + (rx - fx) * t) * scale;
      const bz = rz * t * scale;
      const i0 = c * 2 * 3;
      pos[i0]     = bx;  pos[i0 + 1] = -bw / 2 * scale;  pos[i0 + 2] = bz;
      pos[i0 + 3] = bx;  pos[i0 + 4] = +bw / 2 * scale;  pos[i0 + 5] = bz;
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    geo.computeVertexNormals();
  };
  setFold(1); // start at the closed ring
  return { group, setFold };
}

// Build the side "band" of a flat panel — a strip of quads around every
// boundary edge (outer outline + any holes), spanning ±half in local Z, so an
// extruded panel shows its board caliper at the edges. The panel geometry is
// assumed flat in its local XY plane (z≈0); EdgesGeometry gives the boundary
// edges (coplanar interior triangulation is excluded). Returns null if empty.
// (Used by the Fold Engine renderer.)
export function sideBand(geo: THREE.BufferGeometry, half: number): THREE.BufferGeometry | null {
  const eg = new THREE.EdgesGeometry(geo);
  const p = eg.attributes.position;
  if (!p || p.count < 2) { eg.dispose(); return null; }
  const v: number[] = [];
  for (let i = 0; i < p.count; i += 2) {
    const ax = p.getX(i), ay = p.getY(i);
    const bx = p.getX(i + 1), by = p.getY(i + 1);
    // two triangles forming the quad [a+,b+,b-,a-]
    v.push(ax, ay, half, bx, by, half, bx, by, -half);
    v.push(ax, ay, half, bx, by, -half, ax, ay, -half);
  }
  eg.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}
