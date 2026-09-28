// Static 3D folded carton, lid open, no animation, no orbit controls.
// Used as the "after" side of the landing's compare slider.
// Body = 5 panels (top genuinely open so the interior shows), front face built
// with thumb-notch arcs (matches the dieline), back lid hinged at the back-top
// edge with the chamfered tongue on top.
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Props {
  L?: number;
  W?: number;
  H?: number;
  className?: string;
}

export default function Box3DOpenStatic({ L = 1.4, W = 0.8, H = 1.95, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current!;
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 100);
    camera.position.set(3.5, 2.3, 4.4);
    camera.lookAt(0, 0.05, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 5, 4); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-3, 2, -4); scene.add(fill);

    // Materials — clean near-white paperboard with deep-ink edges
    const mat = new THREE.MeshStandardMaterial({ color: 0xf7f8fb, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
    const interiorMat = new THREE.MeshStandardMaterial({ color: 0xedeff2, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x1d1b1a });

    const group = new THREE.Group();
    scene.add(group);

    const addPanel = (
      geom: THREE.BufferGeometry,
      position: THREE.Vector3,
      rotation: THREE.Euler,
      material: THREE.Material = mat,
      parent: THREE.Object3D = group
    ) => {
      const m = new THREE.Mesh(geom, material);
      m.position.copy(position); m.rotation.copy(rotation);
      parent.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geom), edgeMat);
      e.position.copy(position); e.rotation.copy(rotation);
      parent.add(e);
    };
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const E = (x: number, y: number, z: number) => new THREE.Euler(x, y, z);

    // Front face shape with top + bottom thumb notches (matches the dieline)
    const rN = Math.min(L * 0.16, W * 0.45);
    const frontShape = new THREE.Shape();
    const hx = L / 2, hy = H / 2;
    frontShape.moveTo(-hx, -hy);
    frontShape.lineTo(-rN, -hy);
    frontShape.absarc(0, -hy, rN, Math.PI, 0, true);  // bottom notch bulges up
    frontShape.lineTo(hx, -hy);
    frontShape.lineTo(hx, hy);
    frontShape.lineTo(rN, hy);
    frontShape.absarc(0, hy, rN, 0, Math.PI, true);   // top notch dips down
    frontShape.lineTo(-hx, hy);
    frontShape.lineTo(-hx, -hy);

    // Body — 5 sides (top OPEN). The bottom uses interior material so the eye
    // reads "we're looking into an open box."
    addPanel(new THREE.ShapeGeometry(frontShape),         V(0, 0, W / 2),  E(0, 0, 0));
    addPanel(new THREE.PlaneGeometry(L, H),               V(0, 0, -W / 2), E(0, 0, 0));
    addPanel(new THREE.PlaneGeometry(W, H),               V(-L / 2, 0, 0), E(0, Math.PI / 2, 0));
    addPanel(new THREE.PlaneGeometry(W, H),               V(L / 2, 0, 0),  E(0, Math.PI / 2, 0));
    addPanel(new THREE.PlaneGeometry(L, W),               V(0, -H / 2, 0), E(Math.PI / 2, 0, 0), interiorMat);

    // Lid hinged at back-top edge, raised ~70° back
    const lid = new THREE.Group();
    lid.position.set(0, H / 2, -W / 2);
    lid.rotation.x = -1.22;
    group.add(lid);
    const lidGeo = new THREE.PlaneGeometry(L, W); lidGeo.translate(0, W / 2, 0);
    addPanel(lidGeo, V(0, 0, 0), E(0, 0, 0), mat, lid);

    // Tongue trapezoid on the lid (chamfered)
    const tShape = new THREE.Shape();
    const tH = W * 0.55, tc = L * 0.16;
    tShape.moveTo(-L / 2, 0); tShape.lineTo(L / 2, 0);
    tShape.lineTo(L / 2 - tc, tH); tShape.lineTo(-L / 2 + tc, tH); tShape.lineTo(-L / 2, 0);
    const tongueGeo = new THREE.ShapeGeometry(tShape); tongueGeo.translate(0, W, 0);
    addPanel(tongueGeo, V(0, 0, 0), E(0, 0, 0), mat, lid);

    // Pose: 3/4 view from front-right
    group.rotation.y = -0.55;
    group.rotation.x = 0.05;

    renderer.render(scene, camera);

    const ro = new ResizeObserver(() => {
      const nw = el.clientWidth, nh = el.clientHeight;
      if (!nw || !nh) return;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh; camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
      scene.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); });
    };
  }, [L, W, H]);

  return <div ref={mountRef} className={className} style={{ width: "100%", height: "100%" }} />;
}
