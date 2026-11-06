type ArtKind = "mandala" | "sun" | "geometry" | "lettering" | "moon" | "compass" | "dagger" | "serpent" | "wave" | "eye";
/**
 * Fine-line tattoo artwork drawn in code: mandalas, dotwork, sacred geometry and script lettering.
 * These are the styles most requested in studios; they stand in until real portfolio photos are added.
 */

const TAU = Math.PI * 2;
const p = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;

function petals(n: number, r0: number, r1: number, width = 0.5, rot = 0) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = rot + (i * TAU) / n;
    const w = (TAU / n) * width;
    d += `M${p(r0, a - w)}Q${p(r1 * 1.08, a - w * 0.35)} ${p(r1, a)}Q${p(r1 * 1.08, a + w * 0.35)} ${p(r0, a + w)}`;
  }
  return d;
}

function circle(r: number) {
  return `M${r} 0A${r} ${r} 0 1 1 ${-r} 0A${r} ${r} 0 1 1 ${r} 0`;
}

function dots(n: number, r: number, size: number, rot = 0) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = rot + (i * TAU) / n;
    const x = r * Math.cos(a), y = r * Math.sin(a);
    d += `M${(x + size).toFixed(2)} ${y.toFixed(2)}a${size} ${size} 0 1 0 ${(-2 * size).toFixed(2)} 0a${size} ${size} 0 1 0 ${(2 * size).toFixed(2)} 0`;
  }
  return d;
}

function rays(n: number, r0: number, r1: number, rot = 0) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = rot + (i * TAU) / n;
    d += `M${p(r0, a)}L${p(r1, a)}`;
  }
  return d;
}

/** One mandala as [linework, dotwork] path data, centred on 0,0, radius ~100. */
export function mandalaPaths(seed = 0): [string, string] {
  const k = [12, 16, 10, 14][seed % 4];
  const line =
    circle(10) + petals(8, 10, 26, 0.55) + circle(28) + petals(k, 28, 50, 0.48, Math.PI / k) + circle(52) +
    petals(k * 2, 52, 66, 0.42) + circle(70) + petals(k, 70, 92, 0.5, Math.PI / k) + petals(k, 74, 84, 0.22, Math.PI / k) + circle(96);
  const dot = dots(k * 2, 60, 0.9, Math.PI / (k * 2)) + dots(k * 3, 100, 0.8) + dots(k, 80, 1.1) + dots(8, 18, 0.9, Math.PI / 8);
  return [line, dot];
}

export function sunPaths(): [string, string] {
  const line = circle(22) + circle(30) + rays(24, 34, 70) + rays(24, 34, 52, Math.PI / 24) + circle(74);
  let dot = "";
  for (let r = 36; r < 72; r += 5) dot += dots(Math.round(r * 1.1), r, 0.55 + (72 - r) * 0.012, r);
  return [line, dot];
}

export function geometryPaths(): [string, string] {
  const hex = (r: number, rot = 0) => {
    let d = "";
    for (let i = 0; i <= 6; i++) d += (i ? "L" : "M") + p(r, rot + (i * TAU) / 6);
    return d;
  };
  let line = circle(88) + hex(88, -Math.PI / 2) + hex(88, 0) + circle(44);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 6;
    const c = p(44, a).split(" ").map(Number);
    line += `M${c[0] + 44} ${c[1]}A44 44 0 1 1 ${c[0] - 44} ${c[1]}A44 44 0 1 1 ${c[0] + 44} ${c[1]}`;
  }
  line += rays(6, 0, 88, -Math.PI / 2);
  return [line, dots(6, 88, 2.2, -Math.PI / 2) + dots(1, 0, 2.2)];
}


const f = (n: number) => n.toFixed(2);

/** Moon phases in a row, a fine-line favourite for forearms and spines. */
export function moonPaths(): [string, string] {
  let line = "M-96 0L-90 0M90 0L96 0";
  let dot = "";
  const r = 11;
  for (let i = 0; i < 7; i++) {
    const x = -78 + i * 26;
    line += `M${f(x + r)} 0A${r} ${r} 0 1 1 ${f(x - r)} 0A${r} ${r} 0 1 1 ${f(x + r)} 0`;
    if (i === 3) { dot += `M${f(x + r)} 0A${r} ${r} 0 1 1 ${f(x - r)} 0A${r} ${r} 0 1 1 ${f(x + r)} 0`; continue; }
    const k = i < 3 ? (3 - i) / 3 : (i - 3) / 3; // 1 = new moon (dark), 0 = full
    const rx = Math.max(0.01, r * Math.abs(1 - 2 * (1 - k)));
    const left = i > 3;
    const sweep = left ? 0 : 1;
    const inner = (1 - k) > 0.5 ? (left ? 1 : 0) : (left ? 0 : 1);
    if (k < 1) dot += `M${f(x)} ${-r}A${r} ${r} 0 0 ${sweep} ${f(x)} ${r}A${f(rx)} ${r} 0 0 ${inner} ${f(x)} ${-r}Z`;
  }
  dot += dots(18, 34, 0.7) + dots(9, 44, 1.1, 0.3);
  return [line, dot.replace(/M0\.00 0\.00a/, "M0 0a")];
}

/** Compass star: four main points, eight minor points, tick ring. */
export function compassPaths(): [string, string] {
  const star = (n: number, R: number, w: number, rot: number) => {
    let d = "";
    for (let i = 0; i < n; i++) {
      const a = rot + (i * TAU) / n;
      d += `M0 0L${p(w, a - Math.PI / 2)}L${p(R, a)}L${p(w, a + Math.PI / 2)}ZM0 0L${p(R, a)}`;
    }
    return d;
  };
  const line = circle(92) + circle(84) + rays(72, 84, 88) + rays(8, 80, 92, Math.PI / 8) + circle(30) +
    star(8, 58, 7, -Math.PI / 2 + Math.PI / 8) + star(4, 96, 12, -Math.PI / 2);
  return [line, dots(16, 72, 1.2, Math.PI / 16) + dots(1, 0, 2.4)];
}

/** Dagger with a serpent wound around the blade. */
export function daggerPaths(): [string, string] {
  let line = "M0 -14L8 -10L6 70L0 92L-6 70L-8 -10ZM0 -10L0 84" +
    "M-34 -16Q0 -8 34 -16L36 -22Q0 -14 -36 -22ZM-36 -22l-6 -2l2 6zM36 -22l6 -2l-2 6z" +
    "M-5 -22L-5 -66L5 -66L5 -22" + circle(0);
  for (let y = -60; y < -22; y += 6) line += `M-5 ${y}L5 ${y + 4}`;
  line += "M7 -76A7 7 0 1 1 -7 -76A7 7 0 1 1 7 -76";
  // serpent body as a double line winding down the blade
  const pts: [number, number][] = [];
  for (let t = 0; t <= 1; t += 0.02) pts.push([Math.sin(t * Math.PI * 3.2) * 26 * (1 - t * 0.35), -2 + t * 82]);
  const edge = (o: number) => pts.map(([x, y], i) => `${i ? "L" : "M"}${f(x + o)} ${f(y)}`).join("");
  line += edge(-3.4) + edge(3.4);
  const [hx, hy] = pts[0];
  line += `M${f(hx - 3.4)} ${f(hy)}Q${f(hx - 14)} ${f(hy - 10)} ${f(hx - 6)} ${f(hy - 16)}Q${f(hx + 2)} ${f(hy - 12)} ${f(hx + 3.4)} ${f(hy)}`;
  line += `M${f(hx - 9)} ${f(hy - 14)}l-6 -3m6 3l-5 2`;
  let dot = "";
  pts.forEach(([x, y], i) => { if (i % 2 === 0 && i > 2) dot += `M${f(x + 1)} ${f(y)}a1 1 0 1 0 -2 0a1 1 0 1 0 2 0`; });
  return [line, dot + `M${f(hx - 4)} ${f(hy - 9)}a1.2 1.2 0 1 0 -2.4 0a1.2 1.2 0 1 0 2.4 0`];
}

/** Two serpents intertwined around a vertical axis. */
export function serpentPaths(): [string, string] {
  let line = "M0 -96L0 96";
  let dot = "";
  for (const ph of [0, Math.PI]) {
    const pts: [number, number][] = [];
    for (let t = 0; t <= 1.0001; t += 0.015) pts.push([Math.sin(t * Math.PI * 4 + ph) * 34 * (0.55 + t * 0.45), -78 + t * 168]);
    for (const o of [-3.6, 3.6]) line += pts.map(([x, y], i) => `${i ? "L" : "M"}${f(x + o)} ${f(y)}`).join("");
    pts.forEach(([x, y], i) => { if (i % 3 === 0 && i > 2 && i < pts.length - 3) dot += `M${f(x + 0.9)} ${f(y)}a0.9 0.9 0 1 0 -1.8 0a0.9 0.9 0 1 0 1.8 0`; });
    const [hx, hy] = pts[0];
    const dir = ph === 0 ? -1 : 1;
    line += `M${f(hx - 3.6)} ${f(hy)}Q${f(hx + dir * 12)} ${f(hy - 6)} ${f(hx + dir * 14)} ${f(hy - 16)}Q${f(hx + dir * 4)} ${f(hy - 18)} ${f(hx + 3.6)} ${f(hy)}`;
    line += `M${f(hx + dir * 15)} ${f(hy - 17)}l${dir * 7} -4m${-dir * 7} 4l${dir * 6} 3`;
    pts.slice(-6).forEach(() => undefined);
    const [tx, ty] = pts[pts.length - 1];
    line += `M${f(tx - 3.6)} ${f(ty)}Q${f(tx)} ${f(ty + 10)} ${f(tx + 3.6)} ${f(ty)}`;
  }
  line += "M-14 -96L14 -96M-8 -102L8 -102";
  return [line, dot];
}

/** Japanese seigaiha waves inside a circle. */
export function wavePaths(): [string, string] {
  let line = circle(94);
  const R = 22;
  for (let row = -4; row <= 5; row++) {
    for (let col = -5; col <= 5; col++) {
      const cx = col * R * 2 + (row % 2 ? R : 0), cy = row * R * 0.9;
      if (Math.hypot(cx, cy) > 70) continue;
      for (const r of [R, R * 0.72, R * 0.44]) line += `M${f(cx - r)} ${f(cy)}A${f(r)} ${f(r)} 0 0 1 ${f(cx + r)} ${f(cy)}`;
    }
  }
  return [line, dots(48, 88, 0.9)];
}

/** Eye inside a triangle with rays. */
export function eyePaths(): [string, string] {
  const tri = (r: number) => `M${p(r, -Math.PI / 2)}L${p(r, Math.PI / 6)}L${p(r, (5 * Math.PI) / 6)}Z`;
  let line = tri(84) + tri(74) + "M-34 18Q0 -12 34 18Q0 42 -34 18Z" + "M12 18A12 12 0 1 1 -12 18A12 12 0 1 1 12 18" + "M-26 6Q0 -14 26 6";
  for (let i = 0; i < 17; i++) {
    const a = -Math.PI / 2 + ((i - 8) * Math.PI) / 11;
    line += `M${p(92, a)}L${p(i % 2 ? 100 : 106, a)}`;
  }
  const dot = "M5 18a5 5 0 1 0 -10 0a5 5 0 1 0 10 0" + dots(30, 79, 0.7, 0.1);
  return [line, dot];
}

const PATHS: Record<string, (seed: number) => [string, string]> = {
  mandala: mandalaPaths, sun: sunPaths, geometry: geometryPaths, moon: moonPaths, compass: compassPaths,
  dagger: daggerPaths, serpent: serpentPaths, wave: wavePaths, eye: eyePaths,
};

/** Square tattoo artwork. `kind`: mandala | sun | geometry | lettering. */
export function TattooArt({ kind, seed = 0, ink = "currentColor", size = "100%", text = "Memento mori", draw = false, className = "" }: { kind: ArtKind; seed?: number; ink?: string; size?: number | string; text?: string; draw?: boolean; className?: string }) {
  if (kind === "lettering") {
    return (
      <svg viewBox="-110 -110 220 220" width={size} height={size} className={className} aria-hidden="true">
        <g fill="none" stroke={ink} strokeWidth="0.8">
          <path d="M-70 26 Q0 46 70 26" />
          <path d="M-46 34 Q0 44 46 34" />
        </g>
        <text x="0" y="6" textAnchor="middle" fill={ink} style={{ font: "400 34px 'Pinyon Script', 'Great Vibes', cursive" }}>{text}</text>
        <g fill={ink}>{[-76, 76].map((x) => <circle key={x} cx={x} cy={24} r="1.6" />)}</g>
      </svg>
    );
  }
  const [line, dot] = PATHS[kind]?.(seed) ?? mandalaPaths(seed);
  return (
    <svg viewBox="-110 -110 220 220" width={size} height={size} className={className} aria-hidden="true">
      <g transform={kind === "dagger" || kind === "serpent" ? "scale(1.18)" : undefined}>
      <path d={line} fill="none" stroke={ink} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" pathLength={draw ? 1 : undefined} className={draw ? "lx-draw-art" : undefined} />
      <path d={dot} fill={ink} stroke="none" className={draw ? "lx-fade-art" : undefined} />
      </g>
    </svg>
  );
}
