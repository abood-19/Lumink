/**
 * Realistic 2D tattoo compositing on a photo or template.
 * Ink is multiplied into the skin (so skin texture and shading stay visible) and the skin's own
 * highlights are added back on top, the way a real tattoo still catches the light.
 */

export type InkMode = "original" | "black";

export type Placement = {
  cx: number; cy: number;      // centre in image pixels
  sizePx: number;              // longest side of the design in image pixels
  rot: number;                 // degrees
  flip: boolean;
  bend: number;                // 0..1 — wrap around a cylinder, horizontal in image space
  opacity: number;             // 0..1
  healed: boolean;
  ink: InkMode;
};

/** Scales a design so its longest side is `sizePx`. */
export function designSize(img: { width: number; height: number }, sizePx: number) {
  const k = sizePx / Math.max(img.width, img.height);
  return { w: img.width * k, h: img.height * k };
}

/** Draws the placed (rotated, mirrored, wrapped) design into `ink`. Returns the touched bounding box. */
export function drawInk(ink: CanvasRenderingContext2D, design: CanvasImageSource & { width: number; height: number }, p: Placement) {
  const W = ink.canvas.width, H = ink.canvas.height;
  ink.clearRect(0, 0, W, H);
  const { w, h } = designSize(design, p.sizePx);
  const diag = Math.ceil(Math.hypot(w, h)) + 4;

  // 1. rotate/mirror into a square buffer
  const rot = document.createElement("canvas");
  rot.width = rot.height = diag;
  const r = rot.getContext("2d")!;
  r.translate(diag / 2, diag / 2);
  r.rotate((p.rot * Math.PI) / 180);
  if (p.flip) r.scale(-1, 1);
  r.imageSmoothingQuality = "high";
  r.drawImage(design, -w / 2, -h / 2, w, h);

  // 2. wrap horizontally: x' = R·sin(x/R), narrowing toward the edges like a limb
  ink.save();
  // needles spread ink a hair into the skin: never a razor-sharp vector edge
  ink.filter = p.healed ? "blur(0.9px)" : "blur(0.45px)";
  const theta = p.bend * 1.15;
  const N = theta < 0.01 ? 1 : 64;
  const half = diag / 2, R = theta < 0.01 ? Infinity : half / theta;
  const map = (s: number) => (R === Infinity ? s : R * Math.sin(s / R));
  for (let i = 0; i < N; i++) {
    const s0 = -half + (i * diag) / N, s1 = -half + ((i + 1) * diag) / N;
    const x0 = map(s0), x1 = map(s1);
    ink.drawImage(rot, (i * diag) / N, 0, diag / N, diag, p.cx + x0, p.cy - half, Math.max(0.5, x1 - x0) + (N > 1 ? 0.6 : 0), diag);
  }
  ink.restore();
  const ext = map(half);
  return { x: Math.max(0, Math.floor(p.cx - ext - 2)), y: Math.max(0, Math.floor(p.cy - half - 2)), x1: Math.min(W, Math.ceil(p.cx + ext + 2)), y1: Math.min(H, Math.ceil(p.cy + half + 2)) };
}

const lum = (d: Uint8ClampedArray, i: number) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];

/**
 * Composites ink pixels over skin pixels inside `box`.
 * skin / skinBlur: full-frame ImageData of the base and of a blurred copy (for the highlight pass).
 * inkData: the ink canvas pixels for the same box.
 */
export function compositeInk(out: ImageData, skin: ImageData, skinBlur: ImageData, inkData: ImageData, box: { x: number; y: number }, p: Placement) {
  const o = out.data, s = skin.data, sb = skinBlur.data, k = inkData.data;
  const W = out.width, bw = inkData.width, bh = inkData.height;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const ki = (y * bw + x) * 4;
      let a = k[ki + 3] / 255;
      if (a <= 0.003) continue;
      a *= p.opacity * (p.healed ? 0.9 : 1);
      const si = ((y + box.y) * W + (x + box.x)) * 4;
      if (s[si + 3] === 0) continue;
      let ir: number, ig: number, ib: number;
      if (p.ink === "black") { ir = p.healed ? 38 : 22; ig = p.healed ? 44 : 24; ib = p.healed ? 52 : 28; }
      else { ir = k[ki]; ig = k[ki + 1]; ib = k[ki + 2]; if (p.healed) { const m = (ir + ig + ib) / 3; ir = ir * 0.85 + m * 0.15; ig = ig * 0.85 + m * 0.15; ib = ib * 0.85 + m * 0.15 + 4; } }
      const sr = s[si], sg = s[si + 1], sbv = s[si + 2];
      // ink density varies a little from needle pass to needle pass
      const px = x + box.x, py = y + box.y;
      const n = Math.sin(px * 12.9898 + py * 78.233) * 43758.5453;
      a *= 0.9 + 0.1 * (n - Math.floor(n));
      // Ink sits under a thin translucent layer of skin: part painted colour lit by the limb's own
      // form lighting (from the blurred skin), part multiplied so the skin tone shows through.
      const shade = Math.min(1.25, Math.max(0.3, lum(sb, si) / 185));
      const mixN = 0.42;
      let r = sr * (1 - a) + a * (mixN * ir * shade + (1 - mixN) * ((sr * ir) / 255));
      let g = sg * (1 - a) + a * (mixN * ig * shade + (1 - mixN) * ((sg * ig) / 255));
      let b = sbv * (1 - a) + a * (mixN * ib * shade + (1 - mixN) * ((sbv * ib) / 255));
      // keep the pores and fine texture of the skin inside the ink
      const tex = (lum(s, si) - lum(sb, si)) * 0.5 * a;
      r += tex; g += tex; b += tex;
      // the skin's own specular detail stays on top of the ink
      const hl = Math.max(0, lum(s, si) - lum(sb, si) - 6) * 1.1 * a;
      r += hl; g += hl; b += hl;
      o[si] = r; o[si + 1] = g; o[si + 2] = b;
    }
  }
}

/** Turns a design with an opaque light background into ink with transparency. */
export function knockOutWhite(img: HTMLImageElement | HTMLCanvasElement, maxSide = 1400) {
  const k = Math.min(1, maxSide / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height);
  const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    const l = lum(px, i);
    const a = Math.min(1, Math.max(0, (238 - l) / 150)); // paper → 0, line work → 1
    px[i + 3] = Math.round(px[i + 3] * a);
    if (a > 0) { const t = Math.min(1, l / 255); px[i] = Math.max(0, (px[i] - 255 * t * (1 - a)) / Math.max(a, 0.2)); px[i + 1] = Math.max(0, (px[i + 1] - 255 * t * (1 - a)) / Math.max(a, 0.2)); px[i + 2] = Math.max(0, (px[i + 2] - 255 * t * (1 - a)) / Math.max(a, 0.2)); }
  }
  g.putImageData(d, 0, 0);
  return c;
}

/** True when the image has meaningful transparency. */
export function hasTransparency(img: CanvasImageSource & { width: number; height: number }) {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, 64, 64);
  const d = g.getImageData(0, 0, 64, 64).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 200) n++;
  return n > 64 * 64 * 0.02;
}

/** Same as compositeInk, but `out` holds only the box (much cheaper than rewriting the whole frame). */
export function compositeInkBox(out: ImageData, skin: ImageData, skinBlur: ImageData, inkData: ImageData, box: { x: number; y: number }, p: Placement) {
  const full = new ImageData(out.width, out.height);
  const W = skin.width, o = out.data, f = full.data, s = skin.data, sb = skinBlur.data;
  // a box-sized view of the skin so the shared routine can run unchanged
  const sk = new ImageData(out.width, out.height), skb = new ImageData(out.width, out.height);
  for (let y = 0; y < out.height; y++) {
    const src = ((y + box.y) * W + box.x) * 4, dst = y * out.width * 4, n = out.width * 4;
    sk.data.set(s.subarray(src, src + n), dst); skb.data.set(sb.subarray(src, src + n), dst);
  }
  f.set(o);
  compositeInk(full, sk, skb, inkData, { x: 0, y: 0 }, p);
  o.set(f);
}
