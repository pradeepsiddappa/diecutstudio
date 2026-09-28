// Real 3D fold preview of the carton, built from the SAME geometry the dieline
// uses (via the shared `buildFoldable` builder, so the editor preview and the
// gallery thumbnail can't disagree, and each model folds with its own flap
// shapes). Each flap is a hinge group rotated by the `fold` amount (0 = closed,
// 1 = open) so the preview matches the flat dieline by construction.
// Lazy-loaded so three.js doesn't bloat the main bundle.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ModelId, isAnimalBox, getModel } from "../core/models/registry";
import { FeatureOptions } from "../core/types";
import { buildFoldable, Foldable } from "./box3d/foldable";

interface Props {
  Lpt: number;
  Wpt: number;
  Hpt: number;
  fold: number; // 0 closed .. 1 open
  model?: ModelId;
  features?: FeatureOptions;
  /** Per-model build params that reshape the dieline (e.g. envelope flap). */
  buildParams?: Record<string, unknown>;
  /** Print-&-Cut artwork to show ON the folded box (rect in dieline POINTS). */
  artwork?: { dataUrl: string; xPt: number; yPt: number; wPt: number; hPt: number; rotDeg: number };
  /** Printable-face colour overrides (e.g. the bunny's eyes/nose), keyed by id. */
  decorColors?: Record<string, string>;
  size?: number;
}

export default function Box3D({ Lpt, Wpt, Hpt, fold, model = "tuck-end", features, buildParams, artwork, decorColors, size = 240 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const boxRef = useRef<THREE.Group | null>(null);
  const foldableRef = useRef<Foldable | null>(null);
  const modelRef = useRef<ModelId>(model);
  modelRef.current = model;
  const featuresRef = useRef(features);
  featuresRef.current = features;
  const buildParamsRef = useRef(buildParams);
  buildParamsRef.current = buildParams;
  const artworkRef = useRef(artwork);
  artworkRef.current = artwork;
  const decorColorsRef = useRef(decorColors);
  decorColorsRef.current = decorColors;
  // Decoded-image cache (by data URL) so artwork rebuilds (e.g. drag) draw the
  // texture synchronously — only the first load of a given image is async.
  const imgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const keyRef = useRef<THREE.DirectionalLight | null>(null);
  const sunRef = useRef<THREE.DirectionalLight | null>(null);
  const groundRef = useRef<THREE.Mesh | null>(null);
  const foldRef = useRef(fold);
  foldRef.current = fold;
  const dimsRef = useRef({ Lpt, Wpt, Hpt });
  dimsRef.current = { Lpt, Wpt, Hpt };

  // one-time scene setup + render loop
  useEffect(() => {
    const mount = mountRef.current!;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    // Initial view angle. The pillow box's bowed faces point along ±Z and it's a
    // low/flat form, so it gets a more side-on 3/4 that shows the puff + a
    // rounded end; everything else uses the standard 3/4. buildBox preserves
    // whatever angle the user orbits to on later dimension changes.
    if (modelRef.current === "pillow-box") camera.position.set(1.7, 1.15, 2.7);
    // Envelope lies flat (floor); a lower, more side-on 3/4 shows the folded
    // flaps' depth + seams instead of foreshortening them to a flat diamond.
    else if (modelRef.current === "envelope") camera.position.set(2.0, 1.5, 3.6);
    else camera.position.set(2.4, 1.9, 3.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    // Supersample (≥2×) so panel edges + the caliper read crisp, even on 1× displays.
    renderer.setPixelRatio(Math.max(2, Math.min(window.devicePixelRatio, 2)));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // soft contact shadow
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 2.4;
    controls.maxDistance = 8;
    controls.target.set(0, 0, 0);

    // soft studio environment → gentle face-to-face gradients (the "white box" look)
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // headlight: a key light that tracks the camera each frame (see animate),
    // so the face you're looking at is always the lit one — no matter the angle.
    scene.add(new THREE.AmbientLight(0xfdfeff, 0.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.0); // neutral headlight (tracks camera)
    scene.add(key);
    scene.add(key.target);
    keyRef.current = key;
    // Fixed COOL fill from the lower-back so shadowed faces read cool, not dead
    // grey — gives the white box gentle tonal variation instead of flat grey.
    const fill = new THREE.DirectionalLight(0xdfe9ff, 0.55);
    fill.position.set(-4, -1, -3);
    scene.add(fill);
    // Overhead SUN — the only shadow-caster, so the box drops a soft contact
    // shadow and reads as grounded (the headlight stays shadowless). Its shadow
    // camera + position are sized to the box in buildBox().
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.radius = 10; // softer penumbra (was 5)
    sun.shadow.bias = -0.0009;
    scene.add(sun);
    scene.add(sun.target);
    sunRef.current = sun;

    sceneRef.current = { scene, camera, renderer, controls };
    buildBox();

    let raf = 0;
    const animate = () => {
      applyFold();
      controls.update();
      // headlight follows the camera: light shines from the viewer toward the
      // box, so the visible faces are always the lit ones at any angle.
      if (keyRef.current) {
        keyRef.current.position.copy(camera.position);
        keyRef.current.target.position.copy(controls.target);
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  // rebuild geometry when dimensions, model, features, or build params change
  // (buildParams is keyed by value so an inline object doesn't loop)
  // A lightweight artwork signature (rect + rotation + image size) so the 3D
  // rebuilds when the artwork changes, without stringifying the whole base64.
  const artSig = artwork
    ? `${artwork.xPt}|${artwork.yPt}|${artwork.wPt}|${artwork.hPt}|${artwork.rotDeg}|${artwork.dataUrl.length}`
    : "";
  useEffect(() => {
    if (sceneRef.current) buildBox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Lpt, Wpt, Hpt, model, features, JSON.stringify(buildParams), artSig, JSON.stringify(decorColors)]);

  function applyFold() {
    if (foldableRef.current) foldableRef.current.setFold(foldRef.current);
  }

  function buildBox() {
    const { scene } = sceneRef.current;
    const { Lpt: L, Wpt: W, Hpt: H } = dimsRef.current;
    // Guard transient/degenerate dimensions. H=0 is intentional for flat-dimensioned
    // bespoke renderers (party-hat, napkin-ring, etc.) where H is hidden. Those never
    // call panelize, so H=0 is fine. Only block H≤0 for models that use H (dimLabels.H !== null).
    const mid = modelRef.current;
    const mEntry = getModel(mid);
    if (!(L > 0 && W > 0)) return;
    if (H <= 0 && mEntry?.dimLabels?.H !== null) return;
    const scale = 1.5 / Math.max(L, H > 0 ? H : 0, W);

    // white paperboard: soft, near-matte, lit mostly by the environment so
    // each face reads a slightly different brightness (top bright, sides darker)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf7f8fb,   // clean premium near-white paperboard (OUTER faces)
      roughness: 0.62,
      metalness: 0.0,
      side: THREE.DoubleSide,
      envMapIntensity: 0.8,
    });
    // INNER faces (toward the box cavity) a touch grayer, so open boxes/trays/
    // envelopes read white-outside, light-gray-lined-inside.
    const interiorMat = new THREE.MeshStandardMaterial({
      color: 0xe0e4ea,
      roughness: 0.72,
      metalness: 0.0,
      side: THREE.DoubleSide,
      envMapIntensity: 0.7,
    });
    // No wire edge-outlines: the board now has real thickness (a lit caliper at
    // every edge) + a contact shadow, so facets read from form, not hard lines.
    // Resolve the artwork to a DECODED image (sync if cached); kick off an async
    // load + rebuild the first time a given image is seen.
    let art: { image: HTMLImageElement; xPt: number; yPt: number; wPt: number; hPt: number; rotDeg: number } | undefined;
    const a = artworkRef.current;
    if (a) {
      const cache = imgCacheRef.current;
      const cached = cache.get(a.dataUrl);
      if (cached && cached.complete && cached.naturalWidth) {
        art = { image: cached, xPt: a.xPt, yPt: a.yPt, wPt: a.wPt, hPt: a.hPt, rotDeg: a.rotDeg };
      } else if (!cached) {
        const img = new Image();
        cache.set(a.dataUrl, img);
        img.onload = () => { if (sceneRef.current) buildBox(); };
        img.src = a.dataUrl;
      }
    }

    let foldable: ReturnType<typeof buildFoldable>;
    try {
      foldable = buildFoldable({
        modelId: modelRef.current,
        Lpt: L, Wpt: W, Hpt: H,
        scale,
        material: mat,
        interiorMaterial: interiorMat,
        features: featuresRef.current,
        buildParams: buildParamsRef.current,
        artwork: art,
        decorColors: decorColorsRef.current,
      });
    } catch (err) {
      // Some dimension/feature combos can't fold (degenerate flaps → the
      // panelizer's hinge graph isn't a tree). Keep the last good 3D; the flat
      // dieline + exports are unaffected.
      console.warn("Box3D: 3D preview unavailable for these dimensions.", err);
      return;
    }
    // success — swap the old box out for the new one
    if (boxRef.current) {
      scene.remove(boxRef.current);
      disposeGroup(boxRef.current);
    }
    foldableRef.current = foldable;
    const g = foldable.group;
    scene.add(g);
    boxRef.current = g;
    applyFold();

    // Frame the camera to the FULLY-OPEN (fold=1) bounding sphere so nothing
    // crops at any fold amount or rotation (a sphere is rotation-invariant).
    // EXCEPTION: the bunny's fold=1 is the big flat die-cut SHEET — framing that
    // shrinks the assembled box to a third of the view. Frame its assembled
    // (open-box) extent instead; only the near-flat end overflows (scroll-zoom).
    // The envelope's fold=1 is the big flat splayed dieline; its default pose is
    // CLOSED (sealed, lying flat). Frame the closed extent so it fills the view
    // (the flat-open end overflows slightly — scroll-zoom).
    const frameFold = isAnimalBox(modelRef.current) ? 0.1
      : modelRef.current === "envelope" ? 0
      : 1;
    foldable.setFold(frameFold);
    g.updateMatrixWorld(true);
    const sphere = new THREE.Box3().setFromObject(g).getBoundingSphere(new THREE.Sphere());
    applyFold(); // restore current fold pose
    const { camera, controls } = sceneRef.current;
    // Preserve the current view direction (the initial per-model angle is set in
    // the setup effect; the user's orbit is kept across dimension changes).
    const dir = camera.position.clone().sub(controls.target).normalize();
    controls.target.copy(sphere.center);
    const fov = (camera.fov * Math.PI) / 180;
    // 1.04: near-tight fit to the (rotation-invariant) open bounding sphere —
    // fills the stage while still never cropping at any fold/orbit angle.
    const dist = (sphere.radius / Math.sin(fov / 2)) * 1.04;
    camera.position.copy(sphere.center).addScaledVector(dir, dist);
    controls.minDistance = dist * 0.5;
    controls.maxDistance = dist * 2.5;
    controls.update();

    // Position the sun + its shadow camera to the box, and drop a soft
    // contact-shadow ground plane just under the (open) box's lowest point.
    const R = sphere.radius;
    const sun = sunRef.current;
    if (sun) {
      sun.position.copy(sphere.center).add(new THREE.Vector3(R * 0.8, R * 2.4, R * 1.0));
      sun.target.position.copy(sphere.center);
      const sc = sun.shadow.camera as THREE.OrthographicCamera;
      sc.left = -R * 1.5; sc.right = R * 1.5; sc.top = R * 1.5; sc.bottom = -R * 1.5;
      sc.near = 0.1; sc.far = R * 8; sc.updateProjectionMatrix();
    }
    const box = new THREE.Box3().setFromObject(g);
    if (groundRef.current) { scene.remove(groundRef.current); (groundRef.current.geometry as THREE.BufferGeometry).dispose(); }
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(R * 10, R * 10),
      new THREE.ShadowMaterial({ opacity: 0.1 }) // lighter contact shadow (was 0.2)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(sphere.center.x, box.min.y - R * 0.02, sphere.center.z);
    ground.receiveShadow = true;
    scene.add(ground);
    groundRef.current = ground;
  }

  return (
    <div
      ref={mountRef}
      style={{
        width: size,
        height: size,
        background: "transparent", // parent (.dock3d / .box3d-modal) supplies the backdrop
        borderRadius: 8,
      }}
    />
  );
}

function disposeGroup(group: THREE.Object3D) {
  group.traverse((o: any) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach((mm: any) => mm.dispose());
      else o.material.dispose();
    }
  });
}
