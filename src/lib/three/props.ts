/**
 * Procedural studio props for the 3D scenes: a wrapped pen tattoo machine, an ink bottle and an ink cap.
 * Built from lathe profiles so no model files are needed. No brand names on purpose.
 */
import * as THREE from "three";

export const LIME = new THREE.Color("#c4f135");

const lathe = (pts: [number, number][], seg = 64) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

/** Cohesive-bandage texture for the grip wrap. */
function bandageTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2a2a2a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const v = 40 + Math.random() * 70;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4);
  }
  g.strokeStyle = "rgba(0,0,0,.55)"; g.lineWidth = 3;
  for (let x = -256; x < 512; x += 18) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 140, 256); g.stroke(); }
  g.strokeStyle = "rgba(255,255,255,.08)"; g.lineWidth = 1;
  for (let x = -256; x < 512; x += 18) { g.beginPath(); g.moveTo(x + 6, 0); g.lineTo(x + 146, 256); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Wraps a lathe in creased cling film: small random radial displacement. */
function crease(geo: THREE.BufferGeometry, amp: number) {
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const a = Math.atan2(z, x);
    const n = Math.sin(a * 7 + y * 9) * 0.5 + Math.sin(a * 13 - y * 23 + 1.3) * 0.35 + Math.sin(y * 41 + a * 3) * 0.25 + Math.sin(a * 29 + y * 5) * 0.2;
    const k = 1 + (n * amp) / Math.max(r, 0.05);
    p.setXYZ(i, x * k, y, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Wireless pen machine as studios use it: body in black barrier film, grip in bandage wrap. Tip at origin, points along +Y. */
export function createMachine() {
  const g = new THREE.Group();
  g.name = "machine";

  const steel = new THREE.MeshPhysicalMaterial({ color: "#d6d8d3", metalness: 1, roughness: 0.2 });
  const film = new THREE.MeshPhysicalMaterial({ color: "#0c0c0d", metalness: 0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.3 });
  const bandageMap = bandageTexture();
  const bandage = new THREE.MeshStandardMaterial({ map: bandageMap, bumpMap: bandageMap, bumpScale: 0.6, roughness: 0.95 });
  const cart = new THREE.MeshPhysicalMaterial({ color: "#7b5cf0", roughness: 0.15, transmission: 0.55, thickness: 0.2, transparent: true, opacity: 0.92, clearcoat: 1 });
  const cap = new THREE.MeshPhysicalMaterial({ color: "#efefe9", roughness: 0.55, clearcoat: 0.4 });

  // needle + cartridge
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.002, 0.2, 10), steel);
  needle.position.y = 0.1;
  g.add(needle);
  g.add(new THREE.Mesh(lathe([[0.02, 0.12], [0.05, 0.22], [0.085, 0.45], [0.1, 0.62], [0.13, 0.7], [0, 0.7]], 48), cart));
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.05, 48), steel);
  ring.position.y = 0.72;
  g.add(ring);
  // grip in bandage wrap (slightly lumpy)
  g.add(new THREE.Mesh(crease(lathe([[0.135, 0.74], [0.19, 0.8], [0.215, 1.05], [0.222, 1.35], [0.21, 1.6], [0.2, 1.66], [0, 1.66]], 96), 0.004), bandage));
  // body in creased barrier film
  g.add(new THREE.Mesh(crease(lathe([[0.2, 1.64], [0.205, 1.8], [0.212, 2.4], [0.21, 3.0], [0.2, 3.12], [0, 3.12]], 128), 0.007), film));
  // tape band where the film is closed
  const tape = new THREE.Mesh(crease(new THREE.CylinderGeometry(0.217, 0.217, 0.12, 96, 6, true), 0.003), film);
  tape.position.y = 1.72;
  g.add(tape);
  // rounded back cap (white, like the photos)
  g.add(new THREE.Mesh(lathe([[0.2, 3.1], [0.205, 3.18], [0.19, 3.3], [0.14, 3.38], [0.06, 3.42], [0, 3.43]], 64), cap));

  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // kept for the LED pulse in the flight engine; harmless when unused
  g.userData.led = { emissiveIntensity: 0 };
  return g;
}

/** Plain ink bottle (no label) with a white flip cap. Sits on y = 0. */
export function createInk() {
  const g = new THREE.Group();
  const plastic = new THREE.MeshPhysicalMaterial({ color: "#0a0a0a", roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06 });
  g.add(new THREE.Mesh(lathe([[0, 0], [0.42, 0], [0.45, 0.04], [0.45, 1.05], [0.38, 1.25], [0.16, 1.36], [0.15, 1.44], [0, 1.44]], 80), plastic));
  const capMat = new THREE.MeshPhysicalMaterial({ color: "#f1f1ec", roughness: 0.4, clearcoat: 0.6 });
  g.add(new THREE.Mesh(lathe([[0.17, 1.4], [0.19, 1.42], [0.19, 1.72], [0.12, 1.78], [0.05, 1.86], [0.03, 1.94], [0, 1.95]], 48), capMat));
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** Ink cap: the small cup artists dip the needle into. Sits on y = 0, radius ≈ 0.5. */
export function createInkCap() {
  const g = new THREE.Group();
  const cup = new THREE.MeshPhysicalMaterial({ color: "#f4f4f0", roughness: 0.35, transmission: 0.25, thickness: 0.1, clearcoat: 0.8 });
  g.add(new THREE.Mesh(lathe([[0, 0], [0.4, 0], [0.44, 0.04], [0.5, 0.55], [0.53, 0.6], [0.5, 0.6], [0.46, 0.08], [0, 0.08]], 64), cup));
  const ink = new THREE.Mesh(new THREE.CircleGeometry(0.475, 64), new THREE.MeshPhysicalMaterial({ color: "#050505", roughness: 0.05, clearcoat: 1 }));
  ink.rotation.x = -Math.PI / 2;
  ink.position.y = 0.48;
  g.add(ink);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** Renderer + studio lighting shared by the 3D scenes. */
export async function createStudio(canvas: HTMLCanvasElement) {
  const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight("#ffffff", 2.2);
  key.position.set(3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const rim = new THREE.PointLight(LIME, 18, 30);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
  const fill = new THREE.PointLight("#ffffff", 6, 30);
  fill.position.set(-3, -2, 5);
  scene.add(fill);
  return { renderer, scene };
}
