import * as THREE from "three";

/**
 * A tattoo pen machine with a glass ink chamber, lit like a product shot.
 * Drag to turn it; shake it and the ink sloshes. Mounts into `host`, returns a dispose function.
 */

// Studio environment: a dark room with three soft boxes, so metal and glass pick up long clean highlights.
function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const room = new THREE.Scene();
  room.background = new THREE.Color(0x050505);
  const panel = (w: number, h: number, color: number, intensity: number, pos: [number, number, number], look: [number, number, number] = [0, 0, 0]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(...look);
    room.add(m);
  };
  panel(2.2, 9, 0xffffff, 5, [-5, 1, 3]);    // tall strip, front left
  panel(1.4, 9, 0xffffff, 3.2, [5, 0, 2]);   // tall strip, right
  panel(8, 2, 0xffffff, 2.4, [0, 6, 0]);     // top
  panel(3, 6, 0xc4f135, 0.9, [0, -1, -6]);   // faint lime kick from behind
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(room, 0.02).texture;
  pm.dispose();
  room.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
  return tex;
}

// Fine machined ridges on a lathe profile.
function ridged(from: number, to: number, r: number, depth: number, count: number) {
  const pts: THREE.Vector2[] = [];
  const steps = count * 6;
  for (let i = 0; i <= steps; i++) {
    const y = from + ((to - from) * i) / steps;
    const k = (i % 6) / 6;
    pts.push(new THREE.Vector2(r - depth * (k < 0.5 ? 0 : 1) * Math.sin(Math.PI * (k - 0.5) * 2) ** 2, y));
  }
  return pts;
}

export function mountInkPen(host: HTMLElement, opts: { horizontal?: boolean } = {}): () => void {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.cssText = "width:100%;height:100%;display:block";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const env = studioEnvironment(renderer);
  scene.environment = env;

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 60);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-3, 5, 6);
  const back = new THREE.DirectionalLight(0xc4f135, 1.1);
  back.position.set(3, -1, -5);
  scene.add(key, back);

  const V = (r: number, y: number) => new THREE.Vector2(r, y);
  const pen = new THREE.Group();
  scene.add(pen);

  // ---- materials ------------------------------------------------------------------------------
  const anodized = new THREE.MeshPhysicalMaterial({ color: 0x111214, metalness: 0.9, roughness: 0.36, clearcoat: 0.4, clearcoatRoughness: 0.3 });
  const grip = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0d, metalness: 0.2, roughness: 0.62, sheen: 0.4, sheenRoughness: 0.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe8eaec, metalness: 1, roughness: 0.12 });
  const lime = new THREE.MeshPhysicalMaterial({ color: 0xb6e42c, metalness: 0.75, roughness: 0.3, clearcoat: 0.6 });
  const cartridge = new THREE.MeshPhysicalMaterial({
    color: 0xd9e2e8, metalness: 0, roughness: 0.25, transparent: true, opacity: 0.38, clearcoat: 1, depthWrite: false,
  });

  // glass: reflections + fresnel only (reads as clear glass on a black page), drawn on both walls
  const glassReflect = (side: THREE.Side) => new THREE.MeshPhysicalMaterial({
    color: 0x070807, metalness: 0, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.01, envMapIntensity: 2.6,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side,
  });
  const fresnel = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0);
        gl_FragColor = vec4(vec3(0.86,0.93,0.84) * f * 0.7, 1.0); }`,
  });

  // ---- body -----------------------------------------------------------------------------------
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, order = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = order;
    pen.add(m);
    return m;
  };
  const lathe = (pts: THREE.Vector2[], seg = 96) => new THREE.LatheGeometry(pts, seg);

  // needle + cartridge tip
  add(lathe([V(0, -2.32), V(0.003, -2.3), V(0.007, -2.18), V(0.009, -2.02), V(0, -2.02)], 24), chrome);
  add(lathe([V(0.012, -2.03), V(0.03, -2.0), V(0.07, -1.86), V(0.11, -1.68), V(0.128, -1.6), V(0.128, -1.12), V(0.15, -1.1), V(0.15, -1.06), V(0, -1.06)], 64), cartridge, 4);
  // cartridge inner membrane with a touch of ink in it
  add(lathe([V(0, -1.95), V(0.02, -1.94), V(0.05, -1.8), V(0.05, -1.3), V(0, -1.3)], 32), new THREE.MeshStandardMaterial({ color: 0x5d7d12, roughness: 0.4 }));

  // knurled grip
  add(lathe([V(0, -1.08), V(0.17, -1.08), ...ridged(-1.04, -0.28, 0.2, 0.012, 26), V(0.2, -0.24), V(0, -0.24)]), grip);
  // chrome collar + lime ring
  add(lathe([V(0, -0.26), V(0.212, -0.26), V(0.228, -0.24), V(0.228, -0.14), V(0.212, -0.12), V(0, -0.12)]), chrome);

  // glass ink chamber
  const chamberOuter = [V(0.2, -0.12), V(0.226, -0.1), V(0.228, 0.0), V(0.228, 0.92), V(0.226, 1.02), V(0.2, 1.04)];
  const chamberInner = chamberOuter.map((p) => V(p.x * 0.86, p.y));
  const outerGeo = lathe(chamberOuter, 112);
  const innerGeo = lathe(chamberInner, 96);
  add(innerGeo, glassReflect(THREE.BackSide), 5);
  add(outerGeo, glassReflect(THREE.FrontSide), 6);
  add(outerGeo, fresnel, 7);

  // rear housing: chrome collar, anodised body with machined rings, lime ring, cable socket
  add(lathe([V(0, 1.02), V(0.212, 1.02), V(0.228, 1.04), V(0.228, 1.14), V(0, 1.14)]), chrome);
  add(lathe([V(0, 1.14), V(0.226, 1.14), ...ridged(1.16, 1.32, 0.226, 0.008, 6), V(0.226, 1.34), V(0.226, 1.9), V(0.21, 1.98), V(0.17, 2.03), V(0, 2.04)]), anodized);
  const ring = add(new THREE.TorusGeometry(0.228, 0.011, 14, 96), lime);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.52;
  add(lathe([V(0, 2.02), V(0.07, 2.02), V(0.075, 2.06), V(0.06, 2.2), V(0.052, 2.24), V(0, 2.24)], 48), chrome);

  // ---- ink --------------------------------------------------------------------------------------
  const uniforms = {
    uCenter: { value: new THREE.Vector3() },
    uWob: { value: new THREE.Vector2() },
    uFill: { value: 0.06 },
    uTime: { value: 0 },
    uSurface: { value: new THREE.Color(0xd8ff5a) },
  };
  const inkMat = new THREE.MeshPhysicalMaterial({
    color: 0x6f9c08, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05,
    sheen: 0.6, sheenColor: new THREE.Color(0xc4f135), side: THREE.DoubleSide, envMapIntensity: 1.2,
  });
  inkMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vWPos; uniform vec3 uCenter; uniform vec2 uWob; uniform float uFill; uniform float uTime; uniform vec3 uSurface;",
      )
      .replace(
        "void main() {",
        `void main() {
          vec3 d = vWPos - uCenter;
          float ripple = 0.01 * sin(d.x * 11.0 + uTime * 3.4) * cos(d.z * 9.0 - uTime * 2.6) * (0.25 + length(uWob));
          float h = d.y + uWob.x * d.x + uWob.y * d.z + ripple;
          if (h > uFill) discard;`,
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
          // deeper colour away from the surface, a bright meniscus line right at it
          float depth = clamp((uFill - h) * 2.2, 0.0, 1.0);
          gl_FragColor.rgb *= mix(1.35, 0.55, depth);
          gl_FragColor.rgb += uSurface * smoothstep(0.03, 0.0, uFill - h) * 0.35;
          if (!gl_FrontFacing) {
            float sheen = 0.7 + 0.3 * sin(vWPos.x * 7.0 + uTime * 1.9);
            gl_FragColor = vec4(uSurface * 0.55 * sheen, 1.0);
          }`,
      );
  };
  const inkGeo = lathe(chamberInner.map((p) => V(p.x * 0.97, THREE.MathUtils.clamp(p.y, -0.08, 1.0))), 80);
  add(inkGeo, inkMat, 1);

  // ---- pose + physics -------------------------------------------------------------------------
  pen.position.y = -0.0;
  let REST = { x: 0.22, z: -0.52 };
  const rot = { x: REST.x, y: 0.6, z: REST.z };
  const vel = { x: 0, y: 0, z: 0 };
  const wob = { x: 0, y: 0, vx: 0, vy: 0 };
  const center = new THREE.Vector3();
  const prevCenter = new THREE.Vector3();
  const centerVel = new THREE.Vector3();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = opts.horizontal ?? w > h * 1.2;
    REST = wide ? { x: 0.25, z: -1.32 } : { x: 0.22, z: -0.5 };
    const t = Math.tan(THREE.MathUtils.degToRad(13));
    const needH = wide ? 2.4 : 4.9;
    const needW = wide ? 5.0 : 2.8;
    const dist = Math.max(needH / (2 * t), needW / (2 * t * camera.aspect));
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();
  rot.x = REST.x; rot.z = REST.z;

  // ---- input ----------------------------------------------------------------------------------
  let drag: { id: number; x: number; y: number; t: number } | null = null;
  const el = renderer.domElement;
  const down = (e: PointerEvent) => {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
    el.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const now = performance.now();
    const dt = Math.max(8, now - drag.t) / 1000;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
    const s = 0.027 / Math.max(dt * 60, 0.5);
    vel.z += -dx * s;
    vel.x += dy * s;
    vel.y += dx * s * 0.5;
  };
  const up = (e: PointerEvent) => { if (drag && e.pointerId === drag.id) drag = null; };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);

  // ---- loop -----------------------------------------------------------------------------------
  let visible = true;
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  io.observe(host);

  let raf = 0;
  let last = performance.now();
  let time = 0;
  let first = true;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;

    const k = drag ? 4 : 13;
    const damp = drag ? 2.5 : 4;
    vel.x += (-(rot.x - REST.x) * k - vel.x * damp) * dt;
    vel.z += (-(rot.z - REST.z) * k - vel.z * damp) * dt;
    vel.y += -vel.y * 1.4 * dt;
    const pvx = vel.x, pvz = vel.z;
    rot.x += vel.x * dt;
    rot.z += vel.z * dt;
    rot.y += (vel.y + (reduce ? 0 : 0.16)) * dt;

    pen.rotation.set(rot.x, rot.y, rot.z, "XZY");
    pen.position.y = reduce ? 0 : Math.sin(time * 1.05) * 0.05;
    pen.updateMatrixWorld();

    pen.localToWorld(center.set(0, 0.46, 0));
    if (first) { prevCenter.copy(center); first = false; }
    const cv = center.clone().sub(prevCenter).divideScalar(Math.max(dt, 1e-3));
    const acc = cv.clone().sub(centerVel);
    centerVel.copy(cv);
    prevCenter.copy(center);
    wob.vx += acc.x * 0.05 + pvz * 7 * dt;
    wob.vy += acc.z * 0.05 - pvx * 7 * dt;
    wob.vx += (-wob.x * 70 - wob.vx * 3) * dt;
    wob.vy += (-wob.y * 70 - wob.vy * 3) * dt;
    wob.x = THREE.MathUtils.clamp(wob.x + wob.vx * dt, -1.3, 1.3);
    wob.y = THREE.MathUtils.clamp(wob.y + wob.vy * dt, -1.3, 1.3);

    uniforms.uCenter.value.copy(center);
    uniforms.uWob.value.set(wob.x, wob.y);
    uniforms.uTime.value = time;
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);
  if (!reduce) setTimeout(() => { vel.z += 1.5; }, 700);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
    env.dispose();
    renderer.dispose();
    el.remove();
  };
}
