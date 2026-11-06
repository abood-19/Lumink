/**
 * Flash library: small designs in the styles clients ask for most
 * (fine line, blackwork, cyber sigilism, script, zodiac). Each design sits in a 100×100 box.
 * Rendered as React (FlashArt) or as a standalone SVG string (flashSvg) for canvas tools.
 */

type El = { d: string; fill?: boolean; w?: number; paper?: boolean; t?: string };
type Design = { els: El[]; mirror?: boolean; text?: { s: string; y: number; size: number; font?: string } };

const TAU = Math.PI * 2;
const r2 = (n: number) => Math.round(n * 100) / 100;

function circle(cx: number, cy: number, r: number) {
  return `M${cx + r} ${cy}A${r} ${r} 0 1 1 ${cx - r} ${cy}A${r} ${r} 0 1 1 ${cx + r} ${cy}Z`;
}

function web() {
  let d = "";
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i * TAU) / n - Math.PI / 2;
    d += `M50 50L${r2(50 + 44 * Math.cos(a))} ${r2(50 + 44 * Math.sin(a))}`;
  }
  for (const r of [10, 19, 28, 38]) {
    for (let i = 0; i < n; i++) {
      const a1 = (i * TAU) / n - Math.PI / 2, a2 = ((i + 1) * TAU) / n - Math.PI / 2, am = (a1 + a2) / 2;
      const p1 = [50 + r * Math.cos(a1), 50 + r * Math.sin(a1)], p2 = [50 + r * Math.cos(a2), 50 + r * Math.sin(a2)];
      const c = [50 + r * 0.82 * Math.cos(am), 50 + r * 0.82 * Math.sin(am)];
      d += `M${r2(p1[0])} ${r2(p1[1])}Q${r2(c[0])} ${r2(c[1])} ${r2(p2[0])} ${r2(p2[1])}`;
    }
  }
  return d;
}

function sigil() {
  // Cyber sigilism: a central spine with curved thorns, mirrored.
  let thorns = "";
  const rows: [number, number, number][] = [[18, 20, 14], [32, 30, 16], [48, 36, 20], [64, 26, 14], [78, 16, 10]];
  for (const [y, len, rise] of rows) {
    thorns += `M51 ${y}C${51 + len * 0.45} ${y - 1} ${51 + len * 0.8} ${y - rise * 0.4} ${51 + len} ${y - rise}C${51 + len * 0.62} ${y - rise * 0.05} ${51 + len * 0.3} ${y + 7} 51 ${y + 10}Z`;
  }
  return thorns;
}

const DESIGNS: Record<string, Design> = {
  heart: { els: [{ d: "M50 82C24 64 14 47 20 32C26 18 43 18 50 33C57 18 74 18 80 32C86 47 76 64 50 82Z" }, { d: "M50 74C32 61 25 49 29 38", w: 0.8 }] },
  sparkle: { els: [{ d: "M50 12C53 40 60 47 88 50C60 53 53 60 50 88C47 60 40 53 12 50C40 47 47 40 50 12Z", fill: true }, { d: circle(80, 22, 3), fill: true }, { d: circle(22, 78, 2), fill: true }] },
  flame: { els: [{ d: "M50 90C30 90 21 74 27 59C31 49 40 44 38 28C48 34 53 43 51 52C57 46 59 37 57 26C72 38 80 55 74 70C69 83 61 90 50 90Z" }, { d: "M50 90C43 88 40 79 44 72C46 68 50 66 50 59C56 65 60 73 57 81C55 87 52 90 50 90Z", fill: true }] },
  moon: { els: [{ d: "M60 14A37 37 0 1 0 86 68A29 29 0 1 1 60 14Z" }, { d: "M72 30C73 36 75 38 81 39C75 40 73 42 72 48C71 42 69 40 63 39C69 38 71 36 72 30Z", fill: true }, { d: circle(84, 52, 1.6), fill: true }] },
  butterfly: {
    mirror: true,
    els: [
      { d: "M50 44C42 24 22 14 15 24C8 35 22 48 48 50" },
      { d: "M48 53C32 55 22 66 27 75C32 84 45 72 50 58" },
      { d: "M44 44C36 32 26 27 21 29", w: 0.8 },
      { d: "M50 36C47 28 43 24 39 22", w: 1 },
      { d: circle(38.5, 21.5, 1.4), fill: true },
      { d: "M50 38C51.6 38 52 42 52 50C52 60 51 70 50 72", w: 2.2 },
    ],
  },
  bolt: { els: [{ d: "M58 8L26 54H47L38 92L74 40H53L64 8Z", fill: true }] },
  cross: { els: [{ d: "M44 10H56V30H76V42H56V90H44V42H24V30H44Z" }, { d: "M50 16V84M30 36H70", w: 0.8 }] },
  dagger: {
    els: [
      { d: "M50 94L43.5 46H56.5Z" },
      { d: "M50 50V86", w: 0.8 },
      { d: "M28 40Q50 46 72 40L72 45Q50 51 28 45Z", fill: true },
      { d: "M46 40V19H54V40Z" },
      { d: "M46 24L54 28M46 30L54 34M46 36L54 40", w: 0.8 },
      { d: circle(50, 14, 4.5) },
    ],
  },
  snake: {
    els: [
      { d: "M24 88C62 86 78 70 60 60C40 50 22 46 34 32C42 22 60 24 62 16", w: 7.5 },
      { d: "M24 88C62 86 78 70 60 60C40 50 22 46 34 32C42 22 60 24 62 16", w: 4.6, paper: true },
      { d: "M62 16C66 8 78 8 78 14C78 20 68 22 62 18Z", fill: true },
      { d: "M78 13L86 11M86 11L89 8M86 11L89 14", w: 0.9 },
    ],
  },
  eye: {
    els: [
      { d: "M12 50C30 26 70 26 88 50C70 74 30 74 12 50Z" },
      { d: circle(50, 50, 13) },
      { d: circle(50, 50, 6), fill: true },
      { d: "M24 38L19 31M36 32L34 24M50 30V22M64 32L66 24M76 38L81 31", w: 1 },
    ],
  },
  cherry: {
    els: [
      { d: circle(36, 72, 11.5), fill: true },
      { d: circle(63, 76, 11.5), fill: true },
      { d: "M36 61C40 42 48 29 60 20M63 64C61 46 60 33 60 20" },
      { d: "M60 20C67 11 79 12 85 17C77 24 68 25 60 20Z" },
      { d: "M32 68C33 66 35 65 37 65", w: 1.6, paper: true },
    ],
  },
  bow: {
    mirror: true,
    els: [
      { d: "M50 44C40 28 18 28 19 42C20 56 40 54 50 46" },
      { d: "M47 50C43 62 37 74 32 86L39 83L41 90C45 76 49 62 50 52" },
      { d: "M44 42C36 36 28 36 26 40", w: 0.8 },
      { d: circle(50, 46, 4.5), fill: true },
    ],
  },
  saturn: {
    els: [
      { d: circle(50, 50, 17) },
      { d: "M14 58A37 10 -18 1 0 86 42", t: "" },
      { d: "M33 47C40 43 56 41 66 43", w: 0.8 },
      { d: circle(18, 22, 1.6), fill: true },
      { d: circle(84, 80, 2), fill: true },
      { d: "M80 18C81 22 82 23 86 24C82 25 81 26 80 30C79 26 78 25 74 24C78 23 79 22 80 18Z", fill: true },
    ],
  },
  webs: { els: [{ d: web(), w: 1 }, { d: "M50 6V0", w: 1 }] },
  anchor: {
    els: [
      { d: circle(50, 16, 6) },
      { d: "M50 22V88M34 32H66" },
      { d: "M18 62C22 82 38 90 50 90C62 90 78 82 82 62" },
      { d: "M18 62L13 70M18 62L26 66M82 62L87 70M82 62L74 66" },
    ],
  },
  infinity: { els: [{ d: "M50 50C40 35 20 35 20 50C20 65 40 65 50 50C60 35 80 35 80 50C80 65 60 65 50 50Z" }, { d: "M84 46L90 40M86 50H93M84 54L90 60", w: 0.9 }] },
  ghost: {
    els: [
      { d: "M28 86V44C28 22 72 22 72 44V86L64.7 79L57.3 86L50 79L42.7 86L35.3 79Z" },
      { d: "M42 46C42 41 46 41 46 46C46 51 42 51 42 46Z", fill: true },
      { d: "M54 46C54 41 58 41 58 46C58 51 54 51 54 46Z", fill: true },
      { d: "M45 60C48 63 52 63 55 60", w: 1.2 },
    ],
  },
  mushroom: {
    els: [
      { d: "M14 54C14 26 86 26 86 54Z" },
      { d: "M40 54C38 68 38 80 35 88H65C62 80 62 68 60 54" },
      { d: circle(32, 42, 4.5) + circle(50, 34, 3.5) + circle(68, 44, 5) + circle(48, 47, 2.5), fill: true },
      { d: "M42 62H58", w: 0.8 },
    ],
  },
  paw: {
    els: [
      { d: "M50 52C38 52 28 64 30 74C32 84 44 82 50 80C56 82 68 84 70 74C72 64 62 52 50 52Z", fill: true },
      { d: circle(28, 46, 7), fill: true },
      { d: circle(41, 32, 7.5), fill: true },
      { d: circle(59, 32, 7.5), fill: true },
      { d: circle(72, 46, 7), fill: true },
    ],
  },
  arrow: { els: [{ d: "M10 50H84M72 41L86 50L72 59M10 50L4 43M10 50L4 57M17 50L11 43M17 50L11 57M24 50L18 43M24 50L18 57" }] },
  note: { els: [{ d: "M38 76V24L76 16V68" }, { d: "M38 30L76 22", w: 4 }, { d: "M24 76A8.5 6.5 -20 1 0 41 76A8.5 6.5 -20 1 0 24 76Z", fill: true }, { d: "M62 68A8.5 6.5 -20 1 0 79 68A8.5 6.5 -20 1 0 62 68Z", fill: true }] },
  rune: { els: [{ d: "M50 8V92M50 26L68 14M50 26L32 14M50 74L68 86M50 74L32 86M50 44L66 54L50 64M34 50H50", w: 3 }] },
  sigil: { mirror: true, els: [{ d: sigil(), fill: true }, { d: "M50 6C52 30 52.5 64 50 96", w: 4.2 }, { d: "M50 6L47 14H53Z M50 96L47 88H53Z", fill: true }] },
  sun: { els: [{ d: circle(50, 50, 13) }, { d: Array.from({ length: 16 }, (_, i) => { const a = (i * TAU) / 16; const r1 = 19, r2_ = i % 2 ? 30 : 38; return `M${r2(50 + r1 * Math.cos(a))} ${r2(50 + r1 * Math.sin(a))}L${r2(50 + r2_ * Math.cos(a))} ${r2(50 + r2_ * Math.sin(a))}`; }).join("") }, { d: circle(50, 50, 4), fill: true }] },
  star: { els: [{ d: Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * TAU) / 10; const r = i % 2 ? 16 : 38; return `${i ? "L" : "M"}${r2(50 + r * Math.cos(a))} ${r2(52 + r * Math.sin(a))}`; }).join("") + "Z" }] },
  leo: {
    els: [
      { d: "M18 60L30 44L46 40L58 50L62 70L80 76M30 44L26 28L36 18", w: 0.9 },
      { d: [[18, 60], [30, 44], [46, 40], [58, 50], [62, 70], [80, 76], [26, 28], [36, 18]].map(([x, y]) => circle(x, y, 2.4)).join(""), fill: true },
    ],
    text: { s: "Leo", y: 94, size: 15 },
  },
  scorpio: {
    els: [
      { d: "M12 30L24 34L34 40L40 52L44 66L54 76L68 78L78 70L80 60M80 60L74 56M80 60L84 54", w: 0.9 },
      { d: [[12, 30], [24, 34], [34, 40], [40, 52], [44, 66], [54, 76], [68, 78], [78, 70], [80, 60]].map(([x, y]) => circle(x, y, 2.2)).join(""), fill: true },
    ],
    text: { s: "Scorpio", y: 96, size: 14 },
  },
  aries: {
    els: [{ d: "M16 48L44 36L64 40L74 50", w: 0.9 }, { d: [[16, 48], [44, 36], [64, 40], [74, 50]].map(([x, y]) => circle(x, y, 2.6)).join(""), fill: true }, { d: "M30 80C30 66 40 62 50 72C60 62 70 66 70 80M50 72V92", w: 1.8 }],
  },
  lucky: { els: [{ d: "M20 66Q50 74 80 66", w: 0.8 }], text: { s: "lucky", y: 58, size: 30 } },
  born: { els: [], text: { s: "born to die", y: 56, size: 20, font: "'Unbounded', 'Onest', sans-serif" } },
  fati: { els: [{ d: "M18 64Q50 74 82 64M30 70Q50 76 70 70", w: 0.8 }], text: { s: "Amor fati", y: 56, size: 22 } },
  waves: {
    els: [
      { d: "M10 66C20 66 22 50 34 46C46 42 56 50 52 58C49 64 42 62 43 56" },
      { d: "M10 66H90M18 74H82M28 82H72", w: 1 },
      { d: "M52 58C60 56 66 48 76 48C84 48 90 56 90 66", w: 1.4 },
    ],
  },
  alien: {
    els: [
      { d: "M50 12C26 12 16 30 18 48C20 66 38 84 50 90C62 84 80 66 82 48C84 30 74 12 50 12Z" },
      { d: "M28 46C30 38 40 38 44 50C46 58 38 60 32 56C29 54 27 50 28 46Z", fill: true },
      { d: "M72 46C70 38 60 38 56 50C54 58 62 60 68 56C71 54 73 50 72 46Z", fill: true },
      { d: "M46 74H54", w: 1.6 },
    ],
  },
  spider: {
    els: [
      { d: "M50 4V30", w: 1 },
      { d: "M50 36A7 7 0 1 1 49.9 36Z", fill: true },
      { d: "M50 49C59 49 63 56 63 64C63 74 57 82 50 82C43 82 37 74 37 64C37 56 41 49 50 49Z", fill: true },
      { d: "M44 56L28 44L20 52M44 62L24 60L16 70M44 68L26 76L22 88M45 74L34 86L34 96M56 56L72 44L80 52M56 62L76 60L84 70M56 68L74 76L78 88M55 74L66 86L66 96", w: 1.8 },
    ],
  },
  smiley: {
    els: [
      { d: "M50 12A38 38 0 1 1 49.9 12Z" },
      { d: "M33 38L43 48M43 38L33 48M57 38L67 48M67 38L57 48", w: 2.4 },
      { d: "M30 62C38 74 62 74 70 62", w: 2.4 },
      { d: "M66 70C67 78 66 84 63 88C60 84 61 78 62 72", fill: true },
    ],
  },
  mandala: { els: [] }, // drawn by TattooArt; listed so galleries can reference it
};

export type FlashName = keyof typeof DESIGNS;
export const FLASH_NAMES = Object.keys(DESIGNS).filter((k) => k !== "mandala") as FlashName[];

function elsFor(name: FlashName) {
  const d = DESIGNS[name];
  const out: { el: El; mirrored: boolean }[] = d.els.map((el) => ({ el, mirrored: false }));
  if (d.mirror) d.els.forEach((el) => out.push({ el, mirrored: true }));
  // paper strokes must sit after their ink partner; keep order but draw mirrored copies before paper strokes
  return out;
}

/** SVG markup for one design, positioned in a 100×100 box. */
export function flashMarkup(name: FlashName, ink: string, paper: string, stroke = 2) {
  const d = DESIGNS[name];
  const parts = elsFor(name).map(({ el, mirrored }) => {
    const tr = mirrored ? ' transform="translate(100 0) scale(-1 1)"' : "";
    const color = el.paper ? paper : ink;
    return el.fill
      ? `<path d="${el.d}" fill="${color}"${tr}/>`
      : `<path d="${el.d}" fill="none" stroke="${color}" stroke-width="${el.w ?? stroke}" stroke-linecap="round" stroke-linejoin="round"${tr}/>`;
  });
  if (d.text) {
    const font = d.text.font ?? "'Pinyon Script', 'Great Vibes', cursive";
    parts.push(`<text x="50" y="${d.text.y}" text-anchor="middle" fill="${ink}" style="font: 400 ${d.text.size}px ${font.replace(/"/g, "'")}">${d.text.s}</text>`);
  }
  return parts.join("");
}

/** Standalone SVG document (for data URLs and canvas tools). */
export function flashSvg(name: FlashName, ink = "#111", paper = "#fff", size = 600, background = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 112 112" width="${size}" height="${size}">${background ? `<rect x="-6" y="-6" width="112" height="112" fill="${paper}"/>` : ""}${flashMarkup(name, ink, paper)}</svg>`;
}

export const flashDataUrl = (name: FlashName, ink = "#111", paper = "#fff", size = 600) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(flashSvg(name, ink, paper, size))}`;
