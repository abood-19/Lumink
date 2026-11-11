/**
 * Turns any design image (white or transparent background) into clean tattoo ink:
 * paper becomes fully transparent and lines become fully solid — no pale fringes or white streaks.
 * color: "original" keeps the artwork's own colours, any hex paints the whole design in that ink.
 */
export const INK_COLORS = ["original", "#121214", "#9e1b24", "#1c3f8f", "#1d6b3a", "#d9a21b", "#55257e"] as const;

export function prepareInk(img: CanvasImageSource & { width: number; height: number }, color: string, cap = 2048) {
  const k = Math.min(1, cap / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.imageSmoothingQuality = "high";
  g.drawImage(img, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  const solid = color !== "original";
  const tr = solid ? parseInt(color.slice(1, 3), 16) : 0, tg = solid ? parseInt(color.slice(3, 5), 16) : 0, tb = solid ? parseInt(color.slice(5, 7), 16) : 0;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], gg = p[i + 1], b = p[i + 2], a0 = p[i + 3] / 255;
    // how far from paper-white this pixel is (works for black line art and for coloured flash)
    const ink = Math.max(255 - r, 255 - gg, 255 - b);
    let a = a0 * smooth((ink - 28) / 120);
    if (solid) { p[i] = tr; p[i + 1] = tg; p[i + 2] = tb; a = a0 * smooth((ink - 30) / 95); }
    else if (a > 0) {
      // un-mix the white paper out of the edge pixels so lines stay dark right to their edge
      const k2 = 1 / Math.max(a, 0.05);
      p[i] = clamp255(255 - (255 - r) * k2); p[i + 1] = clamp255(255 - (255 - gg) * k2); p[i + 2] = clamp255(255 - (255 - b) * k2);
    }
    p[i + 3] = Math.round(a * 255);
  }
  g.putImageData(d, 0, 0);
  return c;
}

const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const clamp255 = (n: number) => (n < 0 ? 0 : n > 255 ? 255 : n);

export type Fill = { u: number; v: number; color: string };

/**
 * Paint-bucket colouring of a prepared ink canvas.
 * Tapping inside a shape fills it (under the linework, so outlines stay crisp);
 * tapping on a line recolours that line. Taps outside the design are ignored.
 */
export function applyFills(ink: HTMLCanvasElement, fills: Fill[]) {
  if (!fills.length) return ink;
  const W = ink.width, H = ink.height;
  const g = ink.getContext("2d", { willReadFrequently: true })!;
  const img = g.getImageData(0, 0, W, H), P = img.data;
  const under = document.createElement("canvas"); under.width = W; under.height = H;
  const ug = under.getContext("2d")!;
  const U = ug.createImageData(W, H), Q = U.data;
  const seen = new Uint8Array(W * H);
  for (const f of fills) {
    const sx = Math.round(f.u * (W - 1)), sy = Math.round(f.v * (H - 1));
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
    const onLine = P[(sy * W + sx) * 4 + 3] >= 110;
    const inside = (i: number) => (onLine ? P[i * 4 + 3] >= 60 : P[i * 4 + 3] < 110);
    seen.fill(0);
    const stack = [sy * W + sx]; const region: number[] = []; let open = false;
    seen[sy * W + sx] = 1;
    while (stack.length) {
      const i = stack.pop()!; region.push(i);
      const x = i % W, y = (i - x) / W;
      if (!onLine && (x === 0 || y === 0 || x === W - 1 || y === H - 1)) { open = true; break; }
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (j < 0 || j >= W * H || seen[j]) continue;
        if ((j === i - 1 && x === 0) || (j === i + 1 && x === W - 1)) continue;
        seen[j] = 1; if (inside(j)) stack.push(j);
      }
    }
    if (open) continue;   // the tap was on the background, not inside a shape
    const r = parseInt(f.color.slice(1, 3), 16), gg = parseInt(f.color.slice(3, 5), 16), b = parseInt(f.color.slice(5, 7), 16);
    if (onLine) {
      for (const i of region) { P[i * 4] = r; P[i * 4 + 1] = gg; P[i * 4 + 2] = b; }
    } else {
      // grow 2 px so the colour runs under the anti-aliased edge of the line
      const grow = 2;
      for (const i of region) {
        const x = i % W, y = (i - x) / W;
        for (let dy = -grow; dy <= grow; dy++) for (let dx = -grow; dx <= grow; dx++) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const k = (yy * W + xx) * 4; Q[k] = r; Q[k + 1] = gg; Q[k + 2] = b; Q[k + 3] = 255;
        }
      }
    }
  }
  g.putImageData(img, 0, 0);
  ug.putImageData(U, 0, 0);
  ug.drawImage(ink, 0, 0);          // linework on top of the colour
  return under;
}
