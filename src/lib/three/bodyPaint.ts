import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { acceleratedRaycast, computeBoundsTree } from "three-mesh-bvh";
import { FACE, buildEyes, skinChunks } from "./humanize";

/**
 * LUMINK body studio engine.
 *
 * The body is split into regions (arm, hand, leg, foot, front, back, neck, head), each with its own
 * paint UVs and its own high-resolution layers (sketch + ink). Painting uses screen-space projection:
 * the brush is drawn on a 2D canvas the size of the view, and a UV-space pass writes it onto every
 * texel that is visible from the camera. What you paint is exactly what you see — no seams, no stretching.
 */

export type RegionName = "arm_l" | "arm_r" | "hand_l" | "hand_r" | "leg_l" | "leg_r" | "foot_l" | "foot_r" | "front" | "back" | "neck" | "head";
export type LayerName = "sketch" | "ink";
type UndoGroup = { region: Region; layer: LayerName; rt: THREE.WebGLRenderTarget }[];
export type BrushKind = "liner" | "sketch" | "shade" | "dots" | "eraser" | "tint";

type RegionMeta = { name: RegionName; wrap?: boolean; nv: number; ni: number; pos: number; nrm: number; uv: number; idx: number; tex: [number, number]; cm: [number, number]; bbox: [number[], number[]] };
type Region = {
  name: RegionName;
  wrap: boolean;
  mesh: THREE.Mesh;
  geo: THREE.BufferGeometry;
  tex: [number, number];
  box: THREE.Box3;
  layers: Partial<Record<LayerName, THREE.WebGLRenderTarget>>;
  cover?: THREE.WebGLRenderTarget;
  uniforms: { uInk: { value: THREE.Texture | null }; uSketch: { value: THREE.Texture | null }; uInkOn: { value: number }; uSketchOn: { value: number }; uExport: { value: number } };
};

export type Gender = "female" | "male";
export const BODY_URLS: Record<Gender, string> = { female: "/models/body-f.bin", male: "/models/body-m.bin" };
const cachedBody: Partial<Record<Gender, Promise<ArrayBuffer>>> = {};
// Data URLs are decoded in place: some hosts (sandboxed previews, strict CSP) refuse fetch() on data: URLs.
function decodeDataUrl(url: string): ArrayBuffer {
  const b64 = url.slice(url.indexOf(",") + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
async function getBody(url: string, tries = 3): Promise<ArrayBuffer> {
  if (url.startsWith("data:")) return decodeDataUrl(url);
  let err: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { cache: "force-cache" });
      if (!r.ok) throw new Error("body " + r.status);
      return await r.arrayBuffer();
    } catch (e) { err = e; await new Promise((res) => setTimeout(res, 400 * (i + 1))); }
  }
  throw err;
}
const fetchBody = (g: Gender) => {
  const p = (cachedBody[g] ??= getBody(BODY_URLS[g]));
  p.catch(() => { delete cachedBody[g]; });
  return p;
};

const SKIN_FRAG = /* glsl */ `
  #ifdef USE_UV
    vec4 lxSk = texture2D(uSketch, vUv) * uSketchOn;
    vec4 lxInk = texture2D(uInk, vUv) * uInkOn;
    vec3 lxSkC = lxSk.a > 0.0 ? lxSk.rgb / lxSk.a : vec3(0.0);
    vec3 lxInkC = lxInk.a > 0.0 ? lxInk.rgb / lxInk.a : vec3(0.0);
    lxSkC = pow(lxSkC, vec3(2.2)); lxInkC = pow(lxInkC, vec3(2.2));
    vec3 lxBase = diffuseColor.rgb;
    // ink sits under the skin: part painted colour, part multiplied by the skin tone
    vec3 lxInked = mix(lxInkC, lxInkC * lxBase * 1.6, 0.35);
    diffuseColor.rgb = mix(lxBase, lxInked, lxInk.a);
    diffuseColor.rgb = mix(diffuseColor.rgb, lxSkC, lxSk.a * 0.85);
    if (uExport > 0.5) { diffuseColor.rgb = mix(vec3(1.0), lxInkC, lxInk.a); }
  #endif
`;

const PROJ_VERT = /* glsl */ `
  uniform mat4 uViewProj;
  uniform vec3 uCam;
  uniform float uShift;
  varying vec2 vUv2;
  varying vec4 vClip;
  varying vec4 vClipM;
  varying float vFace;
  varying float vFaceM;
  void main() {
    vUv2 = uv;
    vec3 p = position;
    vec3 n = normalize(normal);
    vClip = uViewProj * vec4(p, 1.0);
    vec3 pm = vec3(-p.x, p.y, p.z);
    vec3 nm = vec3(-n.x, n.y, n.z);
    vClipM = uViewProj * vec4(pm, 1.0);
    vFace = dot(n, normalize(uCam - p));
    vFaceM = dot(nm, normalize(uCam - pm));
    gl_Position = vec4((uv + vec2(uShift, 0.0)) * 2.0 - 1.0, 0.0, 1.0);
  }
`;

/* Wrap decal: the design is laid around the body part like a sleeve (cylindrical coordinates around the
   limb's own axis), sampled straight from the design image — no camera projection, so it never smears
   where the surface turns away and it continues correctly round the side and back. */
const DECAL_VERT = /* glsl */ `
  uniform vec3 uA; uniform vec3 uU; uniform vec3 uV; uniform vec3 uW;
  uniform float uShift;
  varying vec2 vUv2;
  varying vec3 vQ;   // (along axis, toward design, sideways)
  void main() {
    vUv2 = uv;
    vec3 d = position - uA;
    vQ = vec3(dot(d, uU), dot(d, uV), dot(d, uW));
    gl_Position = vec4((uv + vec2(uShift, 0.0)) * 2.0 - 1.0, 0.0, 1.0);
  }
`;
const DECAL_FRAG = /* glsl */ `
  uniform sampler2D uBase;
  uniform sampler2D uDesign;
  uniform float uR;        // radius at the design centre
  uniform float uT0;       // along-axis position of the design centre
  uniform vec2 uSize;      // design width / height in world units
  uniform vec2 uRot;       // cos, sin
  uniform float uSpan;     // max |angle| painted
  varying vec2 vUv2;
  varying vec3 vQ;
  void main() {
    vec4 base = texture2D(uBase, vUv2);
    float rad = length(vQ.yz);
    float ang = atan(vQ.z, vQ.y);
    // only the skin of this limb (not another body part that happens to sit inside the box)
    if (abs(ang) > uSpan || abs(rad - uR) > uR * 0.6 + 0.02) { gl_FragColor = base; return; }
    vec2 l = vec2(ang * uR, vQ.x - uT0);
    vec2 d = vec2(l.x * uRot.x - l.y * uRot.y, l.x * uRot.y + l.y * uRot.x);
    vec2 uv = d / uSize + 0.5;
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) { gl_FragColor = base; return; }
    vec4 s = texture2D(uDesign, uv);            // premultiplied
    gl_FragColor = s + base * (1.0 - s.a);
  }
`;

const PROJ_FRAG = /* glsl */ `
  uniform sampler2D uBase;
  uniform sampler2D uStroke;
  uniform sampler2D uDepth;
  uniform float uNear;
  uniform float uFar;
  uniform float uOpacity;
  uniform float uErase;
  uniform vec3 uTint;
  uniform float uMirror;
  varying vec2 vUv2;
  varying vec4 vClip;
  varying vec4 vClipM;
  varying float vFace;
  varying float vFaceM;
  float lin(float d) { float z = d * 2.0 - 1.0; return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }
  vec4 take(vec4 clip, float face) {
    if (clip.w <= 0.0) return vec4(0.0);
    vec3 ndc = clip.xyz / clip.w;
    if (any(greaterThan(abs(ndc.xy), vec2(1.0)))) return vec4(0.0);
    vec2 s = ndc.xy * 0.5 + 0.5;
    float scene = texture2D(uDepth, s).r;
    float vis = step(lin(ndc.z * 0.5 + 0.5) - lin(scene), 0.035);
    float w = vis * smoothstep(0.02, 0.22, face);
    return texture2D(uStroke, s) * w;
  }
  void main() {
    vec4 base = texture2D(uBase, vUv2);
    vec4 s = take(vClip, vFace) * uOpacity;
    vec4 sm = uMirror > 0.5 ? take(vClipM, vFaceM) : vec4(0.0);
    if (s.a <= 0.0 && sm.a <= 0.0) discard;
    // uErase: 0 paint, 1 erase, 2 tint (recolour existing ink only; never adds ink on bare skin)
    vec4 o = uErase > 1.5 ? vec4(mix(base.rgb, uTint, s.a * step(0.001, base.a)), base.a)
           : uErase > 0.5 ? base * (1.0 - s.a) : s + base * (1.0 - s.a);
    if (uMirror > 0.5) {
      vec4 m = take(vClipM, vFaceM) * uOpacity;
      o = uErase > 1.5 ? vec4(mix(o.rgb, uTint, m.a * step(0.001, o.a)), o.a)
        : uErase > 0.5 ? o * (1.0 - m.a) : m + o * (1.0 - m.a);
    }
    gl_FragColor = o;
  }
`;

const QUAD_VERT = /* glsl */ `varying vec2 vUv2; void main(){ vUv2 = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const DILATE_FRAG = /* glsl */ `
  uniform sampler2D uSrc; uniform sampler2D uCover; uniform vec2 uTexel; varying vec2 vUv2;
  void main(){
    vec4 c = texture2D(uSrc, vUv2);
    if (texture2D(uCover, vUv2).r > 0.5 || c.a > 0.0) { gl_FragColor = c; return; }
    vec4 best = vec4(0.0);
    for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) {
      vec4 n = texture2D(uSrc, vUv2 + vec2(float(x), float(y)) * uTexel);
      if (n.a > best.a) best = n;
    }
    gl_FragColor = best;
  }
`;
const COPY_FRAG = /* glsl */ `uniform sampler2D uSrc; varying vec2 vUv2; void main(){ gl_FragColor = texture2D(uSrc, vUv2); }`;

export type StudioOptions = {
  onRegion?: (r: RegionName | null) => void;
  onChange?: () => void;
  onScale?: (pxPerCm: number) => void;
  /** The browser took the GPU context away (memory pressure on phones): the host rebuilds the engine. */
  onLost?: () => void;
};

export class BodyStudio {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);
  controls: OrbitControls;
  regions: Region[] = [];
  cmPerUnit = 10.2;
  material = { tone: new THREE.Color("#e9e6e1"), roughness: 0.72 };
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  mirror = false;
  focus: RegionName | null = null;

  private stroke: HTMLCanvasElement;
  private sctx: CanvasRenderingContext2D;
  private strokeTex: THREE.CanvasTexture;
  private depthRT: THREE.WebGLRenderTarget;
  private projMat: THREE.ShaderMaterial;
  private quad: THREE.Mesh;
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private dilateMat: THREE.ShaderMaterial;
  private copyMat: THREE.ShaderMaterial;
  private coverMat = new THREE.ShaderMaterial({ uniforms: { uShift: { value: 0 } }, vertexShader: `uniform float uShift; void main(){ gl_Position = vec4((uv+vec2(uShift,0.0))*2.0-1.0,0.0,1.0); }`, fragmentShader: `void main(){ gl_FragColor = vec4(1.0); }`, side: THREE.DoubleSide });
  private projScene = new THREE.Scene();
  private projMeshes = new Map<Region, THREE.Mesh>();
  private undo: UndoGroup[] = [];
  private redo: UndoGroup[] = [];
  private maxUndo: number;
  private raf = 0;
  private dirty = true;
  private active: { layer: LayerName; brush: BrushKind; touched: Map<Region, THREE.WebGLRenderTarget>; opacity: number; tint: THREE.Color } | null = null;
  private ro: ResizeObserver;
  private ray = new THREE.Raycaster();
  private disposed = false;
  private fly: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; t0: number } | null = null;
  readonly mobile: boolean;

  constructor(host: HTMLElement, private opts: StudioOptions = {}) {
    this.host = host;
    this.mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && !/Windows/.test(navigator.userAgent));
    this.maxUndo = this.mobile ? 5 : 12;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.mobile ? 1.5 : 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.canvas = this.renderer.domElement;
    this.canvas.style.touchAction = "none";
    // let the browser give the GPU context back after it drops it (sleep, tab switch, GPU reset on phones)
    this.canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); if (!this.disposed) setTimeout(() => this.opts.onLost?.(), 300); });
    this.canvas.addEventListener("webglcontextrestored", () => { this.dirty = true; });
    this.canvas.style.display = "block";
    host.appendChild(this.canvas);

    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    const key = new THREE.DirectionalLight(0xfff4ea, 2.1); key.position.set(-6, 10, 12); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xdfe8ff, 1.1); rim.position.set(8, 6, -10); this.scene.add(rim);
    const fill = new THREE.HemisphereLight(0xffffff, 0x3a3630, 0.5); this.scene.add(fill);

    this.camera.position.set(0, 0.5, 46);
    this.controls = new OrbitControls(this.camera, this.canvas);
    // smooth turntable: eases out, never flips upside down
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.14;
    this.controls.rotateSpeed = this.mobile ? 0.75 : 0.6;
    this.controls.zoomSpeed = 0.9;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = Math.PI - 0.25;
    this.controls.zoomToCursor = true;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 70;
    this.controls.target.set(0, 0, 0);
    this.controls.addEventListener("change", () => { this.dirty = true; });
    this.controls.addEventListener("end", () => this.emitScale());
    this.setNavigate(true);

    this.stroke = document.createElement("canvas");
    this.sctx = this.stroke.getContext("2d", { willReadFrequently: false })!;
    this.strokeTex = new THREE.CanvasTexture(this.stroke);
    this.strokeTex.colorSpace = THREE.NoColorSpace;
    this.strokeTex.premultiplyAlpha = true;
    // sampled 1:1 from UV space — mipmaps would blur fine lines
    this.strokeTex.generateMipmaps = false;
    this.strokeTex.minFilter = THREE.LinearFilter;
    this.strokeTex.magFilter = THREE.LinearFilter;
    this.depthRT = new THREE.WebGLRenderTarget(2, 2, { depthTexture: new THREE.DepthTexture(2, 2) });

    this.projMat = new THREE.ShaderMaterial({
      vertexShader: PROJ_VERT,
      fragmentShader: PROJ_FRAG,
      uniforms: {
        uViewProj: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() },
        uBase: { value: null }, uStroke: { value: this.strokeTex }, uDepth: { value: this.depthRT.depthTexture },
        uShift: { value: 0 }, uNear: { value: 0.5 }, uFar: { value: 200 }, uOpacity: { value: 1 }, uErase: { value: 0 }, uTint: { value: new THREE.Color() }, uMirror: { value: 0 },
      },
      side: THREE.DoubleSide, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    });
    this.dilateMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: DILATE_FRAG, uniforms: { uSrc: { value: null }, uCover: { value: null }, uTexel: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false, blending: THREE.NoBlending });
    this.copyMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: COPY_FRAG, uniforms: { uSrc: { value: null } }, depthTest: false, depthWrite: false, blending: THREE.NoBlending });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.copyMat);
    this.quadScene.add(this.quad);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
    this.loop();
  }

  /* ---------------- loading ---------------- */
  gender: Gender = "female";
  /** Loads (or swaps to) a body. Swapping clears the drawing, so ask the user first. */
  private stash = new Map<Gender, { regions: Region[]; undo: UndoGroup[]; redo: UndoGroup[] }>();
  /** Loads or switches body. Each body keeps its own tattoo and undo history while you switch back and forth. */
  async load(gender: Gender = this.gender) {
    if (this.regions.length && gender === this.gender) return;
    const buf = this.stash.has(gender) ? null : await fetchBody(gender);
    if (this.regions.length) {
      for (const r of this.regions) this.scene.remove(r.mesh);
      this.stash.set(this.gender, { regions: this.regions, undo: this.undo, redo: this.redo });
      this.regions = []; this.undo = []; this.redo = [];
    }
    this.gender = gender;
    const kept = this.stash.get(gender);
    if (kept) {
      this.stash.delete(gender);
      this.regions = kept.regions; this.undo = kept.undo; this.redo = kept.redo;
      for (const r of this.regions) this.scene.add(r.mesh);
      this.setSkin("#" + this.material.tone.getHexString(), this.clay);
      this.syncHair();
      if (this.focus) this.focusRegion(this.focus); else this.frameAll(false);
      this.dirty = true;
      this.opts.onChange?.();
      return;
    }
    if (!buf) return;
    const hl = new DataView(buf).getUint32(0, true);
    const meta = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl))) as { cmPerUnit: number; regions: RegionMeta[] };
    const base = 4 + hl;
    this.cmPerUnit = meta.cmPerUnit;
    for (const r of meta.regions) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(buf.slice(base + r.pos, base + r.pos + r.nv * 12)), 3));
      geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(buf.slice(base + r.nrm, base + r.nrm + r.nv * 12)), 3));
      geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(buf.slice(base + r.uv, base + r.uv + r.nv * 8)), 2));
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(buf.slice(base + r.idx, base + r.idx + r.ni * 4)), 1));
      geo.computeBoundingSphere();
      (geo as THREE.BufferGeometry & { computeBoundsTree: typeof computeBoundsTree }).computeBoundsTree = computeBoundsTree;
      (geo as unknown as { computeBoundsTree: () => void }).computeBoundsTree();
      const uniforms = { uInk: { value: null as THREE.Texture | null }, uSketch: { value: null as THREE.Texture | null }, uInkOn: { value: 1 }, uSketchOn: { value: 1 }, uExport: { value: 0 } };
      const mat = this.makeSkin(uniforms, r.name);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.raycast = acceleratedRaycast;
      mesh.name = r.name;
      this.scene.add(mesh);
      const scale = 1;
      // keep every paint texture inside what this GPU can hold (phones are often capped at 4096)
      const cap = Math.min(this.renderer.capabilities.maxTextureSize || 4096, this.mobile ? 2048 : 4096);
      const fit = Math.min(1, cap / Math.max(r.tex[0] * scale, r.tex[1] * scale));
      const tex: [number, number] = [Math.max(256, Math.round(r.tex[0] * scale * fit)), Math.max(256, Math.round(r.tex[1] * scale * fit))];
      this.regions.push({ name: r.name, wrap: !!r.wrap, mesh, geo, tex, box: new THREE.Box3(new THREE.Vector3(...r.bbox[0]), new THREE.Vector3(...r.bbox[1])), layers: {}, uniforms });
      if (r.name === "head" && !this.hair.has(gender)) this.hair.set(gender, buildEyes(gender));
    }
    this.setSkin("#" + this.material.tone.getHexString(), this.clay);
    this.syncHair();
    if (this.focus) this.focusRegion(this.focus); else this.frameAll(false);
    this.dirty = true;
    this.opts.onChange?.();
  }

  private syncHair() {
    for (const [g, h] of this.hair) { if (g === this.gender && this.hairOn && !this.clay) this.scene.add(h); else this.scene.remove(h); }
    this.dirty = true;
  }
  setHair(on: boolean) { this.hairOn = on; this.syncHair(); }

  private clearAll() {
    for (const k of this.stash.values()) {
      for (const r of k.regions) { Object.values(r.layers).forEach((t) => t?.dispose()); r.cover?.dispose(); r.geo.dispose(); (r.mesh.material as THREE.Material).dispose(); }
      [...k.undo, ...k.redo].forEach((g) => g.forEach((e) => e.rt.dispose()));
    }
    this.stash.clear();
    for (const r of this.regions) {
      Object.values(r.layers).forEach((t) => t?.dispose()); r.cover?.dispose(); r.geo.dispose();
      (r.mesh.material as THREE.Material).dispose(); this.scene.remove(r.mesh);
    }
    [...this.undo, ...this.redo].forEach((g) => g.forEach((e) => e.rt.dispose()));
    this.undo = []; this.redo = []; this.regions = []; this.projMeshes.clear();
  }

  private blank: THREE.DataTexture = (() => { const t = new THREE.DataTexture(new Uint8Array(4), 1, 1); t.needsUpdate = true; return t; })();

  realU = { value: 1 };
  private hair = new Map<Gender, THREE.Object3D>();
  hairOn = true;
  private makeSkin(uniforms: Region["uniforms"], name?: RegionName) {
    const ch = skinChunks(name === "head" ? FACE[this.gender] : null);
    const m = new THREE.MeshPhysicalMaterial({ color: this.material.tone, roughness: this.material.roughness, sheen: 0.25, sheenRoughness: 0.7, sheenColor: new THREE.Color("#ffe7dc"), clearcoat: 0.04 });
    m.defines = { ...(m.defines ?? {}), USE_UV: "" };
    const key = name === "head" ? `lx-head-${this.gender}` : "lx-body";
    m.customProgramCacheKey = () => key;
    m.onBeforeCompile = (sh) => {
      uniforms.uInk.value ??= this.blank;
      uniforms.uSketch.value ??= this.blank;
      Object.assign(sh.uniforms, uniforms, { uReal: this.realU });
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\n" + ch.vertexPars)
        .replace("#include <begin_vertex>", "#include <begin_vertex>\n" + ch.vertexMain);
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform sampler2D uInk; uniform sampler2D uSketch; uniform float uInkOn; uniform float uSketchOn; uniform float uExport;\n" + ch.fragPars)
        .replace("#include <map_fragment>", "#include <map_fragment>\n" + ch.fragColor + SKIN_FRAG);
    };
    return m;
  }

  private clay = true;
  setSkin(hex: string, clay = false) {
    this.material.tone.set(hex);
    this.clay = clay;
    this.realU.value = clay ? 0 : 1;
    this.syncHair();
    for (const r of this.regions) {
      const m = r.mesh.material as THREE.MeshPhysicalMaterial;
      m.color.set(hex);
      m.roughness = clay ? 0.78 : 0.5;
      m.sheen = clay ? 0.1 : 0.55;
      m.sheenColor.set(clay ? "#ffe7dc" : "#ff9c84");
      m.sheenRoughness = clay ? 0.7 : 0.45;
    }
    this.dirty = true;
  }
  setLayerVisible(layer: LayerName, on: boolean) {
    for (const r of this.regions) (layer === "ink" ? r.uniforms.uInkOn : r.uniforms.uSketchOn).value = on ? 1 : 0;
    this.dirty = true;
  }

  /* ---------------- view ---------------- */
  resize() {
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    if (this.active) return; // never change the view under a stroke
    if (w === this.lastSize[0] && h === this.lastSize[1]) return;
    this.lastSize = [w, h];
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // the brush canvas and depth buffer are sized per stroke in begin()
    this.dirty = true;
    this.emitScale();
  }

  /** Mouse: left draws (or rotates in move mode), right rotates, middle/wheel zooms. Touch: two fingers move the camera. */
  /** Lock: the camera stays exactly where it is (no rotate, pan or zoom) while you work. */
  setLocked(lock: boolean) { this.controls.enabled = !lock; }
  setNavigate(nav: boolean) {
    this.controls.mouseButtons = { LEFT: nav ? THREE.MOUSE.ROTATE : (null as unknown as THREE.MOUSE), MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    this.controls.touches = { ONE: nav ? THREE.TOUCH.ROTATE : (null as unknown as THREE.TOUCH), TWO: THREE.TOUCH.DOLLY_PAN };
    this.controls.enablePan = true;
  }

  private animateTo(target: THREE.Vector3, pos: THREE.Vector3) {
    this.fly = { from: this.camera.position.clone(), to: pos, tFrom: this.controls.target.clone(), tTo: target, t0: performance.now() };
  }
  frameAll(animate = true) {
    const t = new THREE.Vector3(0, 0, 0), p = new THREE.Vector3(0, 0.6, this.camera.aspect < 0.8 ? 62 : 44);
    this.focus = null;
    this.opts.onRegion?.(null);
    if (animate) this.animateTo(t, p); else { this.controls.target.copy(t); this.camera.position.copy(p); this.controls.update(); }
  }
  focusRegion(name: RegionName) {
    const r = this.regions.find((x) => x.name === name); if (!r) return;
    const c = r.box.getCenter(new THREE.Vector3()), s = r.box.getSize(new THREE.Vector3());
    const rad = s.length() * 0.5;
    const vf = (this.camera.fov * Math.PI) / 360, hf = Math.atan(Math.tan(vf) * this.camera.aspect);
    const dist = (rad * 1.12) / Math.tan(Math.min(vf, hf)) + rad * 0.3;
    void s;
    let dir = new THREE.Vector3(0, 0.05, 1);
    if (name === "back") dir = new THREE.Vector3(0, 0.05, -1);
    else if (name.endsWith("_l") && (name.startsWith("arm") || name.startsWith("hand"))) dir = new THREE.Vector3(0.35, 0.05, 1);
    else if (name.endsWith("_r") && (name.startsWith("arm") || name.startsWith("hand"))) dir = new THREE.Vector3(-0.35, 0.05, 1);
    else if (name === "head") dir = new THREE.Vector3(0.9, 0.1, 0.45);
    else if (name.startsWith("foot")) dir = new THREE.Vector3(0, 0.75, 1);
    this.focus = name;
    this.opts.onRegion?.(name);
    this.animateTo(c, c.clone().add(dir.normalize().multiplyScalar(dist)));
  }

  /** Region under a screen point (client coords), or null. */
  pick(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    (this.ray as THREE.Raycaster & { firstHitOnly?: boolean }).firstHitOnly = true;
    const hit = this.ray.intersectObjects(this.regions.map((r) => r.mesh), false)[0];
    if (!hit) return null;
    return { region: this.regions.find((r) => r.mesh === hit.object)!, point: hit.point, distance: hit.distance };
  }

  /** Screen pixels (drawing buffer) per centimetre at a given distance from the camera. */
  pxPerCmAt(distance: number) {
    const worldPerPx = (2 * distance * Math.tan((this.camera.fov * Math.PI) / 360)) / this.canvas.height;
    return 1 / (worldPerPx * this.cmPerUnit);
  }
  private emitScale() {
    if (!this.opts.onScale) return;
    const d = this.camera.position.distanceTo(this.controls.target);
    this.opts.onScale(this.pxPerCmAt(d) / this.renderer.getPixelRatio());
  }

  /* ---------------- painting ---------------- */
  private rt(r: Region, layer: LayerName) {
    let t = r.layers[layer];
    if (!t) {
      t = new THREE.WebGLRenderTarget(r.tex[0], r.tex[1], { depthBuffer: false, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, wrapS: r.wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping });
      t.texture.colorSpace = THREE.NoColorSpace;
      this.clearRT(t);
      r.layers[layer] = t;
      (layer === "ink" ? r.uniforms.uInk : r.uniforms.uSketch).value = t.texture;
      if (!r.cover) {
        r.cover = new THREE.WebGLRenderTarget(r.tex[0], r.tex[1], { depthBuffer: false });
        const m = new THREE.Mesh(r.geo, this.coverMat);
        m.frustumCulled = false;
        this.projScene.add(m);
        this.renderer.setRenderTarget(r.cover);
        this.renderer.setClearColor(0x000000, 0); this.renderer.clear();
        this.renderer.autoClear = false;
        for (const sh of r.wrap ? [0, -1] : [0]) { this.coverMat.uniforms.uShift.value = sh; this.renderer.render(this.projScene, this.quadCam); }
        this.renderer.autoClear = true;
        this.coverMat.uniforms.uShift.value = 0;
        this.projScene.remove(m);
        this.renderer.setRenderTarget(null);
      }
    }
    return t;
  }
  private clearRT(t: THREE.WebGLRenderTarget) {
    const prev = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(t);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear(true, false, false);
    this.renderer.setRenderTarget(prev);
  }
  private copy(src: THREE.Texture, dst: THREE.WebGLRenderTarget) {
    this.copyMat.uniforms.uSrc.value = src;
    this.quad.material = this.copyMat;
    this.renderer.setRenderTarget(dst);
    this.renderer.render(this.quadScene, this.quadCam);
    this.renderer.setRenderTarget(null);
  }
  private cloneRT(src: THREE.WebGLRenderTarget) {
    const t = new THREE.WebGLRenderTarget(src.width, src.height, { depthBuffer: false, wrapS: src.texture.wrapS });
    t.texture.colorSpace = THREE.NoColorSpace;
    this.copy(src.texture, t);
    return t;
  }

  /** Starts a stroke: freezes the camera's depth so hidden surfaces are never painted. */
  /** ss = supersampling of the brush canvas (placed designs use more so fine detail survives). */
  begin(layer: LayerName, brush: BrushKind, opacity: number, ss = 1, tint = "#000000") {
    this.camera.updateMatrixWorld();
    const dw = this.renderer.domElement.width, dh = this.renderer.domElement.height;
    const k = Math.max(1, Math.min(ss, 8192 / Math.max(dw, dh)));
    this.ss = k;
    const W = Math.round(dw * k), H = Math.round(dh * k);
    if (this.stroke.width !== W || this.stroke.height !== H) { this.stroke.width = W; this.stroke.height = H; this.strokeTex.dispose(); }
    if (this.depthRT.width !== W || this.depthRT.height !== H) this.depthRT.setSize(W, H);
    for (const r of this.regions) r.mesh.visible = true;
    this.renderer.setRenderTarget(this.depthRT);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear();
    const bg = this.scene.background; this.scene.background = null;
    this.renderer.render(this.scene, this.camera);
    this.scene.background = bg;
    this.renderer.setRenderTarget(null);
    this.sctx.setTransform(1, 0, 0, 1, 0, 0);
    this.sctx.clearRect(0, 0, this.stroke.width, this.stroke.height);
    this.active = { layer, brush, touched: new Map(), opacity, tint: new THREE.Color(tint) };
  }
  get strokeContext() { return this.sctx; }
  get drawing() { return !!this.active; }
  get bufferScale() { return this.renderer.getPixelRatio(); }
  /** Stroke-canvas pixels per CSS pixel for the current stroke. */
  get strokeScale() { return this.renderer.getPixelRatio() * this.ss; }
  private ss = 1;
  private lastSize = [0, 0];

  /** Marks a region as part of the current stroke (snapshotting it for undo). */
  touch(r: Region) {
    const a = this.active; if (!a || a.touched.has(r)) return;
    const layer = this.rt(r, a.layer);
    a.touched.set(r, this.cloneRT(layer));
  }
  touchMirror(r: Region) {
    const twin = this.twin(r.name);
    const t = twin && this.regions.find((x) => x.name === twin);
    if (t) this.touch(t);
  }
  private twin(n: RegionName): RegionName | null {
    if (n.endsWith("_l")) return n.replace(/_l$/, "_r") as RegionName;
    if (n.endsWith("_r")) return n.replace(/_r$/, "_l") as RegionName;
    return n;
  }

  /** Re-projects the whole stroke canvas onto every touched region. Call after drawing into strokeContext. */
  update() {
    const a = this.active; if (!a) return;
    this.strokeTex.needsUpdate = true;
    const vp = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    const u = this.projMat.uniforms;
    u.uViewProj.value.copy(vp); u.uCam.value.copy(this.camera.position);
    u.uNear.value = this.camera.near; u.uFar.value = this.camera.far;
    u.uOpacity.value = a.brush === "eraser" ? 1 : a.opacity;
    u.uErase.value = a.brush === "eraser" ? 1 : a.brush === "tint" ? 2 : 0;
    (u.uTint.value as THREE.Color).copy(a.tint);
    u.uMirror.value = this.mirror ? 1 : 0;
    for (const [r, base] of a.touched) {
      u.uBase.value = base.texture;
      const m = (this.projMeshes.get(r) ?? this.projMeshes.set(r, Object.assign(new THREE.Mesh(r.geo, this.projMat), { frustumCulled: false })).get(r))!;
      this.projScene.add(m);
      this.renderer.setRenderTarget(r.layers[a.layer]!);
      this.renderer.autoClear = false;
      for (const sh of r.wrap ? [0, -1] : [0]) { u.uShift.value = sh; this.renderer.render(this.projScene, this.quadCam); }
      this.renderer.autoClear = true;
      u.uShift.value = 0;
      this.projScene.remove(m);
    }
    this.renderer.setRenderTarget(null);
    this.dirty = true;
  }


  /* ---------------- wrap decal ---------------- */
  private axisCache = new Map<Region, THREE.Vector3>();
  private regionAxis(r: Region) {
    let ax = this.axisCache.get(r);
    if (ax) return ax;
    if (["front", "back", "neck", "head"].includes(r.name)) ax = new THREE.Vector3(0, 1, 0);
    else {
      // principal axis of the body part (PCA of its vertices)
      const pos = r.geo.getAttribute("position") as THREE.BufferAttribute;
      const m = new THREE.Vector3(); const n = pos.count;
      for (let i = 0; i < n; i++) m.add(new THREE.Vector3().fromBufferAttribute(pos, i));
      m.divideScalar(n);
      const C = [0, 0, 0, 0, 0, 0]; const v = new THREE.Vector3();
      for (let i = 0; i < n; i++) { v.fromBufferAttribute(pos, i).sub(m); C[0] += v.x * v.x; C[1] += v.x * v.y; C[2] += v.x * v.z; C[3] += v.y * v.y; C[4] += v.y * v.z; C[5] += v.z * v.z; }
      ax = new THREE.Vector3(1, 1, 1).normalize();
      for (let it = 0; it < 40; it++) {
        const x = C[0] * ax.x + C[1] * ax.y + C[2] * ax.z, y = C[1] * ax.x + C[3] * ax.y + C[4] * ax.z, z = C[2] * ax.x + C[4] * ax.y + C[5] * ax.z;
        ax.set(x, y, z).normalize();
      }
    }
    this.axisCache.set(r, ax);
    return ax;
  }

  /** Fits the cross-section circle of a body part around point P (in the plane across axis U). */
  private crossSection(r: Region, P: THREE.Vector3, U: THREE.Vector3, slab: number) {
    const pos = r.geo.getAttribute("position") as THREE.BufferAttribute;
    const e1 = new THREE.Vector3().crossVectors(U, Math.abs(U.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
    const e2 = new THREE.Vector3().crossVectors(U, e1);
    let pts: [number, number][] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).sub(P);
      if (Math.abs(v.dot(U)) > slab) continue;
      pts.push([v.dot(e1), v.dot(e2)]);
    }
    const fit = (q: [number, number][]) => {
      // Kåsa least-squares circle: x² + y² + Dx + Ey + F = 0
      let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sz = 0, sxz = 0, syz = 0; const n = q.length;
      for (const [x, y] of q) { const z = x * x + y * y; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sz += z; sxz += x * z; syz += y * z; }
      const M = new THREE.Matrix3().set(sxx, sxy, sx, sxy, syy, sy, sx, sy, n);
      const b = new THREE.Vector3(-sxz, -syz, -sz).applyMatrix3(M.invert());
      const cx = -b.x / 2, cy = -b.y / 2;
      return { cx, cy, r: Math.sqrt(Math.max(1e-6, cx * cx + cy * cy - b.z)) };
    };
    if (pts.length < 8) return null;
    let c = fit(pts);
    for (let k = 0; k < 2; k++) {   // drop points that belong to something else (the other leg, an arm)
      const keep = pts.filter(([x, y]) => Math.abs(Math.hypot(x - c.cx, y - c.cy) - c.r) < c.r * 0.35);
      if (keep.length < 8) break;
      pts = keep; c = fit(pts);
    }
    return P.clone().addScaledVector(e1, c.cx).addScaledVector(e2, c.cy);
  }

  /**
   * Lays a design onto the body around the point under (clientX, clientY), wrapping with the body part.
   * design: premultiplied-ready canvas (transparent background). Returns false when nothing was hit.
   */
  applyDesign(o: { clientX: number; clientY: number; wCm: number; ratio: number; rot: number; design: HTMLCanvasElement }) {
    const hit = this.pick(o.clientX, o.clientY); if (!hit) return false;
    const r = hit.region, P = hit.point.clone();
    const wW = o.wCm / this.cmPerUnit, hW = (o.wCm * o.ratio) / this.cmPerUnit;
    const U = this.regionAxis(r).clone();
    this.camera.updateMatrixWorld();
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    if (U.dot(camUp) < 0) U.negate();
    const A = this.crossSection(r, P, U, Math.max(0.6 / this.cmPerUnit, Math.min(hW * 0.15, 3 / this.cmPerUnit)));
    let V: THREE.Vector3, R: number, Ax: THREE.Vector3;
    if (A) {
      Ax = A; V = P.clone().sub(A); V.addScaledVector(U, -V.dot(U)); R = V.length(); V.normalize();
    } else { // flat fallback: a huge cylinder is a plane
      V = this.camera.position.clone().sub(P).normalize(); V.addScaledVector(U, -V.dot(U)).normalize(); R = 1000; Ax = P.clone().addScaledVector(V, -R);
    }
    if (R > 1000) R = 1000;
    const W = new THREE.Vector3().crossVectors(U, V).normalize();
    let flip = 1; if (W.dot(camRight) < 0) { W.negate(); flip = -1; }
    void flip;
    // the design texture
    const tex = new THREE.CanvasTexture(o.design);
    tex.colorSpace = THREE.NoColorSpace; tex.premultiplyAlpha = true; tex.anisotropy = 8;
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
    const rot = (o.rot * Math.PI) / 180;
    const mat = this.decalMat ??= new THREE.ShaderMaterial({
      vertexShader: DECAL_VERT, fragmentShader: DECAL_FRAG,
      uniforms: { uA: { value: new THREE.Vector3() }, uU: { value: new THREE.Vector3() }, uV: { value: new THREE.Vector3() }, uW: { value: new THREE.Vector3() }, uShift: { value: 0 }, uBase: { value: null }, uDesign: { value: null }, uR: { value: 1 }, uT0: { value: 0 }, uSize: { value: new THREE.Vector2() }, uRot: { value: new THREE.Vector2() }, uSpan: { value: Math.PI } },
      side: THREE.DoubleSide, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    });
    const u = mat.uniforms;
    u.uA.value.copy(Ax); u.uU.value.copy(U); u.uV.value.copy(V); u.uW.value.copy(W);
    u.uDesign.value = tex; u.uR.value = R; u.uT0.value = P.clone().sub(Ax).dot(U);
    u.uSize.value.set(wW, hW);
    // screen rotation is clockwise; in the (around, along) frame that is a negative turn
    u.uRot.value.set(Math.cos(-rot), Math.sin(-rot));
    u.uSpan.value = Math.min(Math.PI * 0.999, (Math.hypot(wW, hW) / 2) / Math.max(R, 1e-3) + 0.05);

    // every body part the design can reach
    const reach = Math.hypot(wW, hW) * 0.55;
    const sphere = new THREE.Sphere(P, reach);
    const regions = this.regions.filter((x) => x === r || x.box.intersectsSphere(sphere));
    this.begin("ink", "liner", 1);
    for (const x of regions) this.touch(x);
    const a = this.active!;
    for (const [x, base] of a.touched) {
      u.uBase.value = base.texture;
      const m = new THREE.Mesh(x.geo, mat); m.frustumCulled = false;
      this.projScene.add(m);
      this.renderer.setRenderTarget(x.layers.ink!);
      this.renderer.autoClear = false;
      for (const sh of x.wrap ? [0, -1] : [0]) { u.uShift.value = sh; this.renderer.render(this.projScene, this.quadCam); }
      this.renderer.autoClear = true; u.uShift.value = 0;
      this.projScene.remove(m);
    }
    this.renderer.setRenderTarget(null);
    tex.dispose();
    this.end();
    this.dirty = true;
    return true;
  }
  private decalMat: THREE.ShaderMaterial | null = null;

  /** Ends the stroke: closes UV seams and records undo. */
  end() {
    const a = this.active; if (!a) return;
    this.active = null;
    if (!a.touched.size) return;
    const entry: { region: Region; layer: LayerName; rt: THREE.WebGLRenderTarget }[] = [];
    for (const [r, before] of a.touched) {
      this.dilate(r, a.layer);
      entry.push({ region: r, layer: a.layer, rt: before });
    }
    this.undo.push(entry);
    while (this.undo.length > this.maxUndo) this.undo.shift()!.forEach((e) => e.rt.dispose());
    this.redo.forEach((g) => g.forEach((e) => e.rt.dispose()));
    this.redo = [];
    this.dirty = true;
    this.resize();
    this.opts.onChange?.();
  }
  cancel() {
    const a = this.active; if (!a) return;
    for (const [r, before] of a.touched) { this.copy(before.texture, r.layers[a.layer]!); before.dispose(); }
    this.active = null;
    this.dirty = true;
  }

  private dilate(r: Region, layer: LayerName) {
    const t = r.layers[layer]; if (!t || !r.cover) return;
    const tmp = this.cloneRT(t);
    this.dilateMat.uniforms.uSrc.value = tmp.texture;
    this.dilateMat.uniforms.uCover.value = r.cover.texture;
    this.dilateMat.uniforms.uTexel.value.set(1 / t.width, 1 / t.height);
    this.quad.material = this.dilateMat;
    this.renderer.setRenderTarget(t);
    this.renderer.render(this.quadScene, this.quadCam);
    this.renderer.setRenderTarget(null);
    tmp.dispose();
  }

  /** Puts an image on the skin as seen from the camera: centre (css px), width (css px), rotation (deg). */
  stamp(img: CanvasImageSource & { width: number; height: number }, cx: number, cy: number, wCss: number, rotDeg = 0, ss = 2) {
    this.begin("ink", "liner", 1, ss);
    const k = this.strokeScale, w = wCss * k, h = (w * img.height) / img.width;
    const ctx = this.sctx;
    ctx.save(); ctx.translate(cx * k, cy * k); ctx.rotate((rotDeg * Math.PI) / 180); ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore();
    const rect = this.canvas.getBoundingClientRect();
    const c = Math.cos((rotDeg * Math.PI) / 180), sn = Math.sin((rotDeg * Math.PI) / 180);
    for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) {
      const lx = (i / 8 - 0.5) * wCss, ly = (j / 8 - 0.5) * (wCss * img.height) / img.width;
      const hit = this.pick(rect.left + cx + lx * c - ly * sn, rect.top + cy + lx * sn + ly * c);
      if (hit) { this.touch(hit.region); if (this.mirror) this.touchMirror(hit.region); }
    }
    this.update(); this.end();
  }

  canUndo() { return this.undo.length > 0; }
  canRedo() { return this.redo.length > 0; }
  undoStep() { this.swapStep(this.undo, this.redo); }
  redoStep() { this.swapStep(this.redo, this.undo); }
  private swapStep(from: typeof this.undo, to: typeof this.undo) {
    const g = from.pop(); if (!g) return;
    const back = g.map((e) => {
      const cur = e.region.layers[e.layer]!;
      e.region.layers[e.layer] = e.rt;
      (e.layer === "ink" ? e.region.uniforms.uInk : e.region.uniforms.uSketch).value = e.rt.texture;
      return { region: e.region, layer: e.layer, rt: cur };
    });
    to.push(back);
    this.dirty = true;
    this.opts.onChange?.();
  }
  clearLayer(layer: LayerName) {
    const entry: { region: Region; layer: LayerName; rt: THREE.WebGLRenderTarget }[] = [];
    for (const r of this.regions) {
      const t = r.layers[layer]; if (!t) continue;
      entry.push({ region: r, layer, rt: this.cloneRT(t) });
      this.clearRT(t);
    }
    if (entry.length) { this.undo.push(entry); this.redo = []; }
    this.dirty = true;
    this.opts.onChange?.();
  }
  hasInk() { return this.regions.some((r) => r.layers.ink); }

  /* ---------------- output ---------------- */
  /** What the camera sees, as a PNG data URL. */
  snapshot() { this.render(); return this.canvas.toDataURL("image/png"); }

  /**
   * Flat stencil exactly as the design looks from the current view, at true size.
   * Orthographic, so nothing is stretched or foreshortened by perspective. Returns PNG + size in cm.
   */
  stencil(dpi = 300): { url: string; widthCm: number; heightCm: number } | null {
    const pxPerCm = dpi / 2.54;
    const target = this.controls.target.clone();
    const dir = this.camera.position.clone().sub(target).normalize();
    // frame what is on screen at the target's depth
    const dist = this.camera.position.distanceTo(target);
    const viewH = 2 * dist * Math.tan((this.camera.fov * Math.PI) / 360);
    const viewW = viewH * this.camera.aspect;
    const wCm = viewW * this.cmPerUnit, hCm = viewH * this.cmPerUnit;
    let W = Math.round(wCm * pxPerCm), H = Math.round(hCm * pxPerCm);
    const k = Math.min(1, 5000 / Math.max(W, H)); W = Math.round(W * k); H = Math.round(H * k);
    const cam = new THREE.OrthographicCamera(-viewW / 2, viewW / 2, viewH / 2, -viewH / 2, 0.1, 400);
    cam.position.copy(target).addScaledVector(dir, 100);
    cam.up.copy(this.camera.up);
    cam.quaternion.copy(this.camera.quaternion);
    cam.updateMatrixWorld();
    const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    for (const r of this.regions) r.uniforms.uExport.value = 1;
    const env = this.scene.environment, bg = this.scene.background, tm = this.renderer.toneMapping;
    this.scene.environment = null; this.scene.background = new THREE.Color(1, 1, 1); this.renderer.toneMapping = THREE.NoToneMapping;
    const lights = this.scene.children.filter((c) => (c as THREE.Light).isLight);
    lights.forEach((l) => (l.visible = false));
    const hairShown = [...this.hair.values()].filter((h) => h.parent);
    hairShown.forEach((h) => (h.visible = false));
    const realWas = this.realU.value; this.realU.value = 0;
    const amb = new THREE.AmbientLight(0xffffff, Math.PI); this.scene.add(amb);
    const mats = this.regions.map((r) => r.mesh.material as THREE.MeshPhysicalMaterial);
    const saved = mats.map((m) => [m.color.clone(), m.sheen, m.clearcoat] as const);
    mats.forEach((m) => { m.color.set(1, 1, 1); m.sheen = 0; m.clearcoat = 0; m.roughness = 1; });
    this.renderer.setRenderTarget(rt);
    this.renderer.render(this.scene, cam);
    const px = new Uint8Array(W * H * 4);
    this.renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
    this.renderer.setRenderTarget(null);
    mats.forEach((m, i) => { m.color.copy(saved[i][0]); m.sheen = saved[i][1]; m.clearcoat = saved[i][2]; m.roughness = this.material.roughness; });
    this.scene.remove(amb); lights.forEach((l) => (l.visible = true));
    hairShown.forEach((h) => (h.visible = true)); this.realU.value = realWas;
    this.scene.environment = env; this.scene.background = bg; this.renderer.toneMapping = tm;
    for (const r of this.regions) r.uniforms.uExport.value = 0;
    rt.dispose();
    // crop to the ink and flip (GL rows are bottom-up)
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (px[i] < 235 || px[i + 1] < 235 || px[i + 2] < 235) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return null;
    const m = Math.round(pxPerCm * 0.4 * k);
    x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(W - 1, x1 + m); y1 = Math.min(H - 1, y1 + m);
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const c = document.createElement("canvas"); c.width = cw; c.height = ch;
    const g = c.getContext("2d")!;
    const img = g.createImageData(cw, ch);
    for (let y = 0; y < ch; y++) {
      const sy = y1 - y;
      img.data.set(px.subarray((sy * W + x0) * 4, (sy * W + x0 + cw) * 4), y * cw * 4);
    }
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
    g.putImageData(img, 0, 0);
    const realPxPerCm = pxPerCm * k;
    return { url: c.toDataURL("image/png"), widthCm: cw / realPxPerCm, heightCm: ch / realPxPerCm };
  }

  /* ---------------- loop ---------------- */
  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (this.fly) {
      const t = Math.min(1, (performance.now() - this.fly.t0) / 650), e = 1 - Math.pow(1 - t, 3);
      this.camera.position.lerpVectors(this.fly.from, this.fly.to, e);
      this.controls.target.lerpVectors(this.fly.tFrom, this.fly.tTo, e);
      if (t >= 1) { this.fly = null; this.emitScale(); }
      this.dirty = true;
    }
    if (!this.fly) this.controls.update();
    if (this.dirty) this.render();
  };
  render() {
    this.dirty = false;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.controls.dispose();
    this.clearAll();
    this.depthRT.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss(); // give the GPU context back now, or a few re-opens exhaust the browser's limit
    this.canvas.remove();
  }

  regionByName(n: RegionName) { return this.regions.find((r) => r.name === n) ?? null; }
}

export type { Region };
