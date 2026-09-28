// Render a folded carton in three.js, capture as a PNG data URL, cache.
// Used by gallery thumbnails so each card shows the REAL 3D box (not a
// generic stylised SVG that may have a notch the actual model doesn't).
//
// Design notes:
// - ONE shared WebGLRenderer for all snapshots (single GPU context, ~250kB
//   total memory; well under browser limits)
// - PMREM environment generated once and reused (would cost ~50ms each time
//   otherwise)
// - Results cached per (modelId, L, W, H, size) key — same box never rendered
//   twice. After the first render of each gallery card, switching to that
//   model is free.
// - `hasFrontNotch` lets each model opt in/out of the thumb-notch on the
//   front panel (STE has one, RTE doesn't, mailers don't).
//
// Total cost for the Landing page (4 built models): ~300ms on first mount,
// 0ms forever after.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { inToPt } from "../../core/units";
import { ModelId, previewFold, isAnimalBox } from "../../core/models/registry";
import { buildFoldable } from "../box3d/foldable";

export interface SnapshotOpts {
  modelId: string;       // cache key
  L: number; W: number; H: number;  // any units — only the ratios matter
  size?: number;
  hasFrontNotch?: boolean;  // STE has the thumb-notch on front; RTE/mailers don't
  buildParams?: Record<string, unknown>; // variant params (e.g. necklaceStyle) — reshape the dieline
}

const cache = new Map<string, string>();
let renderer: THREE.WebGLRenderer | null = null;
let envMap: THREE.Texture | null = null;
let currentSize = 0;

function ensureRenderer(size: number): THREE.WebGLRenderer {
  if (renderer && currentSize === size) return renderer;
  if (renderer) {
    renderer.setSize(size, size);
    currentSize = size;
    return renderer;
  }
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true, // required for toDataURL
  });
  renderer.setSize(size, size);
  // Supersample the static thumbnail (2–3×) for crisp edges, then it's cached.
  renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio, 2), 3));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // soft contact shadow
  currentSize = size;
  // Generate env once, reuse forever
  const pmrem = new THREE.PMREMGenerator(renderer);
  envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return renderer;
}

export function snapshotBox(opts: SnapshotOpts): string {
  const size = opts.size ?? 280;
  const bpKey = opts.buildParams ? JSON.stringify(opts.buildParams) : "";
  const cacheKey = `${opts.modelId}:${opts.L.toFixed(2)}:${opts.W.toFixed(2)}:${opts.H.toFixed(2)}:${size}:${opts.hasFrontNotch ? "n" : "p"}:${bpKey}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const r = ensureRenderer(size);
  const scene = new THREE.Scene();
  if (envMap) scene.environment = envMap;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(3.5, 2.3, 4.4);

  // Two-tone studio lighting: a NEUTRAL key + a COOL fill so the paperboard faces
  // pick up gentle tonal variation (clean top, faintly cool shadows) instead of
  // reading as flat dead grey. A soft rim adds a bright top edge.
  scene.add(new THREE.AmbientLight(0xfdfeff, 0.5));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.55); // neutral key (also the shadow caster)
  keyLight.position.set(3.5, 5, 3.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.radius = 4;
  keyLight.shadow.bias = -0.0009;
  scene.add(keyLight);
  scene.add(keyLight.target);
  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.5);      // cool fill
  fill.position.set(-4, 1.5, -3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.45);      // top rim
  rim.position.set(-1.5, 4, 5);
  scene.add(rim);

  // Normalise so the largest dim = ~2.5 scene units; the box stays well-framed
  // regardless of actual L/W/H magnitude (so 12in mailers and 1in cards both
  // render nicely). The builder works in points, so derive the scale from the
  // point dimensions (scene unit = point * scale).
  const maxPt = Math.max(inToPt(opts.L), inToPt(opts.W), inToPt(opts.H));
  const scale = 2.5 / maxPt;

  const mat = new THREE.MeshStandardMaterial({
    color: 0xf7f8fb,   // clean premium near-white paperboard
    roughness: 0.82,
    metalness: 0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.85,
  });
  const interiorMat = new THREE.MeshStandardMaterial({
    color: 0xe0e4ea,   // light gray interior (white outside, gray-lined inside)
    roughness: 0.82,
    metalness: 0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.7,
  });
  // Build the folded box via the SHARED builder (same geometry the editor's
  // interactive preview uses), so the thumbnail and the editor can't disagree.
  // No wire edge-outlines — the board's real thickness + a contact shadow define
  // the form. Render it partly open (fold ≈ 0.55) so the flaps are visible.
  const foldable = buildFoldable({
    modelId: opts.modelId as ModelId,
    Lpt: inToPt(opts.L),
    Wpt: inToPt(opts.W),
    Hpt: inToPt(opts.H),
    scale,
    material: mat,
    interiorMaterial: interiorMat,
    buildParams: opts.buildParams,
  });
  // Most models read best partly-open (flaps visible); some read best nearly
  // closed (gable peak, a wrapped book). Shared per-model fold (registry) so the
  // thumbnail and the editor preview always agree.
  // Envelopes read as identical flat rectangles when closed (the flaps are on the
  // back), so the THUMBNAIL shows them part-open — pocket formed, closure flap
  // raised — so the flap shape tells the type apart. (The editor still defaults
  // to closed-flat via previewFold; the thumbnail is a marketing pose.)
  foldable.setFold(opts.modelId === "envelope" ? 0.16 : previewFold(opts.modelId));
  const group = foldable.group;
  scene.add(group);

  // 3/4 view for boxes. Flat/face-oriented craft items read edge-on under the
  // box turn, so they get their own poses (matching their editor orientation).
  if (opts.modelId === "paper-rosette") {
    group.rotation.y = -0.12;            // medallion self-orients to the camera
    group.rotation.x = 0.05;
  } else if (opts.modelId === "paper-flower") {
    group.rotation.x = 1.0;              // tip the bloom face toward the camera
    group.rotation.y = 0.2;
  } else if (opts.modelId === "folded-star") {
    group.rotation.x = 1.05;             // tip the star face toward the camera
    group.rotation.y = 0.15;
  } else if (opts.modelId === "favor-pouch") {
    group.rotation.y = -0.5;             // 3/4 square pyramid — match the editor
    group.rotation.x = 0;                // (pyramidPouchFoldable sets the same pose)
  } else if (opts.modelId === "pillow-box") {
    group.rotation.y = -Math.PI / 6.5 + Math.PI / 2; // arched ends forward — match the editor
    group.rotation.x = 0.26;             // (pillowFoldable sets the same pose)
  } else if (opts.modelId === "bookmark") {
    group.rotation.y = 0.22;             // match bookmarkFoldable — card face toward camera with slight depth tilt
    group.rotation.x = 0.08;            // gentle downward tilt so top edge is visible
  } else if (opts.modelId === "party-hat") {
    group.rotation.y = -0.3;             // slight 3/4 angle so the cone body is visible
    group.rotation.x = 0.1;             // gentle forward tilt
  } else if (opts.modelId === "napkin-ring") {
    group.rotation.y = 0.3;             // slight turn
    group.rotation.x = 0.45;            // the renderer already tilts 0.45 — this leaves it as-is
  } else if (opts.modelId === "envelope") {
    // Show the OPENING / pocket side with the flap open at the top. YXZ order so
    // the y turn is a clean left-right turntable (applied before the x tilt) —
    // otherwise turning a tilted card reads as an upside-down (vertical) flip.
    group.rotation.order = "YXZ";
    group.rotation.x = -1.2;
    group.rotation.y = Math.PI;
  } else if (isAnimalBox(opts.modelId)) {
    group.rotation.y = 0.34;             // 3/4 turn toward the left → reads clearly as 3D (side wall shows)
    group.rotation.x = 0;                // upright; the low camera (below) does the bottom-up tilt
  } else {
    group.rotation.y = -0.55;
    group.rotation.x = 0.05;
  }

  // Frame camera to the box's bounding sphere
  group.updateMatrixWorld(true);
  const sphere = new THREE.Box3()
    .setFromObject(group)
    .getBoundingSphere(new THREE.Sphere());
  // Animal boxes get a LOW, near-front camera → we look slightly UP at the box
  // (bottom-to-up), so the printed face reads straight-on (not from above).
  const dir = (isAnimalBox(opts.modelId)
    ? new THREE.Vector3(0.7, -0.25, 4.6)
    : camera.position.clone()).normalize();
  const fov = (camera.fov * Math.PI) / 180;
  // 0.94: tighter than the bounding sphere — safe here because the snapshot
  // camera angle is FIXED (the sphere circumscribes the box, so the actual
  // geometry stays inside the frame; verified across the gallery).
  const dist = (sphere.radius / Math.sin(fov / 2)) * 0.94;
  camera.position.copy(sphere.center).addScaledVector(dir, dist);
  camera.lookAt(sphere.center);

  // Size the shadow camera to the box + drop a soft contact-shadow ground plane
  // just under its lowest point (ShadowMaterial = transparent except the shadow,
  // so it composites over the card's colour).
  const R = sphere.radius;
  keyLight.target.position.copy(sphere.center);
  const sc = keyLight.shadow.camera as THREE.OrthographicCamera;
  sc.left = -R * 1.6; sc.right = R * 1.6; sc.top = R * 1.6; sc.bottom = -R * 1.6;
  sc.near = 0.1; sc.far = R * 12; sc.updateProjectionMatrix();
  const box = new THREE.Box3().setFromObject(group);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 12, R * 12),
    new THREE.ShadowMaterial({ opacity: 0.18 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(sphere.center.x, box.min.y - R * 0.02, sphere.center.z);
  ground.receiveShadow = true;
  scene.add(ground);

  r.render(scene, camera);
  const dataURL = r.domElement.toDataURL("image/png");
  cache.set(cacheKey, dataURL);

  // Clean up scene geometries (materials are reused — keep them)
  scene.traverse((o: any) => {
    if (o.geometry) o.geometry.dispose();
  });

  return dataURL;
}
