import * as THREE from "three";
import type { Gender } from "./bodyPaint";

/**
 * Makes the plain body mesh read as a person: living skin (pores, colour variation, warm scatter),
 * a face (eyes, brows, lips) and hair. Landmarks are measured from the two body meshes.
 */
export type Face = { eye: [number, number, number]; eyeR: number; mouth: [number, number]; brow: number; nose: number; skull: number };
export const FACE: Record<Gender, Face> = {
  female: { eye: [0.31, 7.0, 1.175], eyeR: 0.128, mouth: [6.42, 1.5], brow: 7.165, nose: 6.682, skull: 0.55 },
  male: { eye: [0.296, 8.2, 1.312], eyeR: 0.145, mouth: [7.57, 1.6], brow: 8.385, nose: 7.815, skull: 0.6 },
};

const NOISE = /* glsl */ `
  float lxH(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float lxN(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(lxH(i), lxH(i + vec3(1,0,0)), f.x), mix(lxH(i + vec3(0,1,0)), lxH(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(lxH(i + vec3(0,0,1)), lxH(i + vec3(1,0,1)), f.x), mix(lxH(i + vec3(0,1,1)), lxH(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;

/** Extra uniforms + GLSL spliced into the skin material. */
export function skinChunks(face: Face | null) {
  const head = face ? `#define LX_FACE\nconst vec3 lxEye = vec3(${face.eye.map((v) => v.toFixed(4)).join(",")}); const float lxEyeR = ${face.eyeR.toFixed(4)};\nconst vec2 lxMouth = vec2(${face.mouth.map((v) => v.toFixed(4)).join(",")}); const float lxBrow = ${face.brow.toFixed(4)};` : "";
  return {
    vertexPars: "varying vec3 vLxPos;",
    vertexMain: "vLxPos = position;",
    fragPars: `varying vec3 vLxPos; uniform float uReal;\n${head}\n${NOISE}`,
    // runs right after the base colour is known, before ink is laid on top
    fragColor: /* glsl */ `
      if (uReal > 0.5) {
        vec3 P = vLxPos;
        // gentle patches of redder / paler skin and a little darker towards the extremities
        float blot = lxN(P * 2.6) - 0.5;
        float fine = lxN(P * 40.0) - 0.5;
        diffuseColor.rgb *= vec3(1.0 + blot * 0.07, 1.0 - blot * 0.02, 1.0 - blot * 0.05) * (1.0 + fine * 0.035);
        #ifdef LX_FACE
          vec3 q = vec3(abs(P.x), P.y, P.z);
          // lips
          float lm = ((q.x / 0.21) * (q.x / 0.21)) + ((P.y - lxMouth.x) / 0.075) * ((P.y - lxMouth.x) / 0.075);
          float lips = smoothstep(1.0, 0.55, lm) * smoothstep(lxMouth.y - 0.22, lxMouth.y - 0.08, P.z);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.86, 0.52, 0.52), lips * 0.75);
          // soft blush on the cheeks
          vec2 ch = vec2(q.x - lxEye.x - 0.08, P.y - (lxEye.y - 0.32));
          diffuseColor.rgb *= mix(vec3(1.0), vec3(1.04, 0.95, 0.95), exp(-dot(ch, ch) / 0.035));
          // brows: a tapered arc of fine hairs above each eye
          float u = (q.x - 0.09) / 0.42;
          float by = lxBrow + 0.045 * sin(clamp(u, 0.0, 1.0) * 3.1416) - 0.02 * u;
          float th = mix(0.045, 0.016, clamp(u, 0.0, 1.0));
          float hairs = 0.7 + 0.3 * lxN(vec3(q.x * 260.0 + P.y * 120.0, P.y * 40.0, 0.0));
          float brow = step(0.0, u) * step(u, 1.0) * smoothstep(th, th * 0.1, abs(P.y - by)) * smoothstep(0.0, 0.08, u) * smoothstep(1.0, 0.8, u) * smoothstep(0.7, 1.05, P.z - lxEye.z + 1.0) * hairs;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.032, 0.022), clamp(brow * 1.1, 0.0, 0.92));
          // eyelid crease shadow
          vec2 ec = vec2(q.x - lxEye.x, (P.y - lxEye.y) * 1.6);
          diffuseColor.rgb *= 1.0 - 0.1 * exp(-dot(ec, ec) / 0.03);
        #endif
      }
    `,
  };
}

/**
 * Builds hair as a smooth cap fitted to the skull (bun for the female body, short crop for the male).
 * The skull is sampled radially, so gaps or seams in the head mesh never show through.
 */
export function buildHair(head: THREE.BufferGeometry, gender: Gender): THREE.Object3D {
  const f = FACE[gender];
  const pos = head.getAttribute("position") as THREE.BufferAttribute;
  const female = gender === "female";
  const cz = f.skull;
  const c = new THREE.Vector3(0, f.eye[1] + 0.25, cz);
  const front = f.brow + (female ? 0.42 : 0.3), back = f.nose - (female ? 0.45 : 0.22), side = f.eye[1] + (female ? 0.12 : 0.28);
  const hairline = (x: number, z: number) => {
    const a = Math.atan2(Math.abs(x), z - cz), t = (1 - Math.cos(a)) / 2;
    let line = t < 0.5 ? front + (side - front) * Math.pow(t / 0.5, 0.7) : side + (back - side) * Math.pow((t - 0.5) / 0.5, 0.9);
    return { line, t };
  };

  // radial skull map: max distance from the centre per direction
  const NA = 96, NP = 64;
  const R = new Float32Array(NA * NP).fill(-1);
  const v = new THREE.Vector3();
  const bin = (d: THREE.Vector3) => {
    const a = (Math.atan2(d.x, d.z) / (2 * Math.PI) + 1) % 1, ph = Math.acos(Math.max(-1, Math.min(1, d.y))) / Math.PI;
    return [a * NA, ph * NP] as const;
  };
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (Math.abs(v.x) > 0.6 && v.y < f.eye[1] + 0.35) continue; // ears
    const d = v.clone().sub(c), r = d.length(); d.divideScalar(r);
    const [ba, bp] = bin(d);
    const k = (Math.min(NP - 1, Math.floor(bp)) * NA) + (Math.floor(ba) % NA);
    if (r > R[k]) R[k] = r;
  }
  // fill empty bins from neighbours, then smooth
  for (let it = 0; it < 40; it++) {
    let empty = 0;
    const nx = R.slice();
    for (let y = 0; y < NP; y++) for (let x = 0; x < NA; x++) {
      const k = y * NA + x; if (R[k] >= 0) continue;
      let m = -1; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const yy = y + dy; if (yy < 0 || yy >= NP) continue; m = Math.max(m, R[yy * NA + ((x + dx + NA) % NA)]); }
      nx[k] = m; if (m < 0) empty++;
    }
    R.set(nx); if (!empty) break;
  }
  for (let it = 0; it < 3; it++) {
    const nx = R.slice();
    for (let y = 1; y < NP - 1; y++) for (let x = 0; x < NA; x++) {
      let sum = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += R[(y + dy) * NA + ((x + dx + NA) % NA)];
      nx[y * NA + x] = Math.max(R[y * NA + x], sum / 9);
    }
    R.set(nx);
  }
  const radiusAt = (d: THREE.Vector3) => {
    const [ba, bp] = bin(d);
    const x0 = Math.floor(ba - 0.5), y0 = Math.max(0, Math.min(NP - 2, Math.floor(bp - 0.5)));
    const fx = ba - 0.5 - x0, fy = Math.max(0, Math.min(1, bp - 0.5 - y0));
    const g = (x: number, y: number) => R[y * NA + ((x % NA) + NA) % NA];
    return (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy;
  };

  const geo = new THREE.SphereGeometry(1, 160, 120);
  const gp = geo.getAttribute("position") as THREE.BufferAttribute;
  const w = new Float32Array(gp.count);
  const d = new THREE.Vector3();
  for (let i = 0; i < gp.count; i++) {
    d.fromBufferAttribute(gp, i).normalize();
    const r = radiusAt(d);
    const skin = c.clone().addScaledVector(d, r);
    const { line, t } = hairline(skin.x, skin.z);
    const k = Math.min(1, Math.max(0, (skin.y - line + 0.04) / 0.16));
    w[i] = k;
    const top = Math.min(1, Math.max(0, (skin.y - f.eye[1]) / 1.0));
    const thick = female ? 0.035 + 0.06 * top + 0.03 * t : 0.02 + 0.02 * top;
    const p = c.clone().addScaledVector(d, r + thick * (0.15 + 0.85 * Math.sqrt(k)));
    gp.setXYZ(i, p.x, p.y, p.z);
  }
  const idx = geo.getIndex()!, keep: number[] = [];
  for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i), b = idx.getX(i + 1), cc = idx.getX(i + 2); if (w[a] > 0 || w[b] > 0 || w[cc] > 0) keep.push(a, b, cc); }
  geo.setIndex(keep);
  geo.setAttribute("lxW", new THREE.BufferAttribute(w, 1));
  geo.computeVertexNormals();

  const mat = hairMaterial(female);
  const group = new THREE.Group();
  group.name = "hair";
  group.add(new THREE.Mesh(geo, mat));
  if (female) {
    const bunG = new THREE.SphereGeometry(0.3, 48, 32);
    bunG.setAttribute("lxW", new THREE.BufferAttribute(new Float32Array(bunG.getAttribute("position").count).fill(1), 1));
    const bun = new THREE.Mesh(bunG, mat);
    bun.scale.set(1, 0.82, 0.78);
    const backD = new THREE.Vector3(0, -0.15, -1).normalize();
    bun.position.copy(c).addScaledVector(backD, radiusAt(backD) + 0.17);
    group.add(bun);
  }
  return group;
}

function hairMaterial(female: boolean) {
  const m = new THREE.MeshPhysicalMaterial({
    color: female ? new THREE.Color("#2a1a12") : new THREE.Color("#1a1410"),
    roughness: 0.62, specularIntensity: 0.35, sheen: 0.7, sheenRoughness: 0.5, sheenColor: new THREE.Color("#5a3d2c"), transparent: true, depthWrite: true,
  });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float lxW; varying float vLxW; varying vec3 vLxPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLxW = lxW; vLxPos = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying float vLxW; varying vec3 vLxPos;\n${NOISE}`)
      .replace("#include <map_fragment>", /* glsl */ `#include <map_fragment>
        // strands combed back from the hairline
        float az = atan(vLxPos.x, vLxPos.z - 0.5);
        float s = lxN(vec3(az * 46.0, vLxPos.y * 3.0, 0.0)) * 0.6 + lxN(vec3(az * 140.0, vLxPos.y * 6.0, 1.0)) * 0.4;
        diffuseColor.rgb *= 0.5 + 0.95 * s * s;
        // the hairline thins out instead of ending in a hard edge
        diffuseColor.a *= smoothstep(0.02, 0.8, vLxW) * clamp(0.35 + 0.8 * s + 0.6 * vLxW, 0.0, 1.0);`);
  };
  return m;
}

/** Eyeballs: wet spheres with iris and pupil, sitting in the sockets of the head mesh (visible from every angle). */
export function buildEyes(gender: Gender): THREE.Object3D {
  const f = FACE[gender];
  const c = document.createElement("canvas"); c.width = 1024; c.height = 512;
  const g = c.getContext("2d")!;
  // sclera: warm off-white, a little darker and pinker toward the corners
  const sg = g.createLinearGradient(0, 0, 1024, 0);
  sg.addColorStop(0, "#d9c7bd"); sg.addColorStop(0.25, "#f2ece6"); sg.addColorStop(0.5, "#d9c7bd"); sg.addColorStop(1, "#d9c7bd");
  g.fillStyle = sg; g.fillRect(0, 0, 1024, 512);
  const cx = 256, cy = 256, R = 74;                       // iris faces +z (u = 0.25)
  const ig = g.createRadialGradient(cx, cy, 8, cx, cy, R);
  ig.addColorStop(0, "#6b4a2b"); ig.addColorStop(0.45, "#4a2f19"); ig.addColorStop(0.85, "#2e1c0f"); ig.addColorStop(1, "#140c07");
  g.fillStyle = ig; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 0.35;                                    // iris fibres
  for (let k = 0; k < 140; k++) {
    const a = (k / 140) * Math.PI * 2 + Math.random() * 0.03;
    g.strokeStyle = k % 3 ? "#8a6340" : "#1c1108"; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26); g.lineTo(cx + Math.cos(a) * (R - 6), cy + Math.sin(a) * (R - 6)); g.stroke();
  }
  g.globalAlpha = 1;
  g.fillStyle = "#050404"; g.beginPath(); g.arc(cx, cy, 27, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(10,6,4,.85)"; g.lineWidth = 7; g.beginPath(); g.arc(cx, cy, R - 2, 0, Math.PI * 2); g.stroke();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 });
  const geo = new THREE.SphereGeometry(f.eyeR * 0.97, 48, 32);
  const group = new THREE.Group(); group.name = "eyes";
  for (const side of [-1, 1]) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(side * f.eye[0], f.eye[1], f.eye[2]);
    m.rotation.y = side * 0.06;                            // a natural, slightly converged gaze
    group.add(m);
  }
  return group;
}
