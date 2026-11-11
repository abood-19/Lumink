/**
 * Shape assist for the pen: a hand-drawn circle, ellipse, triangle, square, rectangle, star or heart
 * becomes the clean shape the artist meant. Anything that is not clearly one of these stays as drawn.
 */
export type Pt = { x: number; y: number };

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const length = (p: Pt[]) => p.slice(1).reduce((s, q, i) => s + dist(p[i], q), 0);

function resample(p: Pt[], n: number): Pt[] {
  const L = length(p) / (n - 1); const out = [p[0]]; let acc = 0;
  const pts = p.slice();
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i]);
    if (acc + d >= L && d > 0) {
      const t = (L - acc) / d, q = { x: pts[i - 1].x + t * (pts[i].x - pts[i - 1].x), y: pts[i - 1].y + t * (pts[i].y - pts[i - 1].y) };
      out.push(q); pts.splice(i, 0, q); acc = 0;
    } else acc += d;
  }
  while (out.length < n) out.push(p[p.length - 1]);
  return out.slice(0, n);
}

function rdp(p: Pt[], eps: number): Pt[] {
  if (p.length < 3) return p;
  const a = p[0], b = p[p.length - 1], L = dist(a, b) || 1;
  let k = -1, best = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const d = Math.abs((b.x - a.x) * (a.y - p[i].y) - (a.x - p[i].x) * (b.y - a.y)) / L;
    if (d > best) { best = d; k = i; }
  }
  if (best <= eps) return [a, b];
  return [...rdp(p.slice(0, k + 1), eps).slice(0, -1), ...rdp(p.slice(k), eps)];
}

const centroid = (p: Pt[]) => ({ x: p.reduce((s, q) => s + q.x, 0) / p.length, y: p.reduce((s, q) => s + q.y, 0) / p.length });

function heartTemplate(n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    out.push({ x: 16 * Math.sin(t) ** 3, y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) });
  }
  return out;
}
function toUnitBox(p: Pt[]) {
  const xs = p.map((q) => q.x), ys = p.map((q) => q.y);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0 || 1, h = Math.max(...ys) - y0 || 1;
  return { pts: p.map((q) => ({ x: (q.x - x0) / w, y: (q.y - y0) / h })), x0, y0, w, h };
}

/** Returns the clean closed outline, or null when the stroke should stay freehand. */
export function recognize(raw: Pt[]): Pt[] | null {
  if (raw.length < 8) return null;
  const L = length(raw);
  const xs = raw.map((q) => q.x), ys = raw.map((q) => q.y);
  const diag = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  if (L < 70 || diag < 30) return null;
  if (dist(raw[0], raw[raw.length - 1]) > Math.max(28, 0.2 * L)) return null;      // not closed
  const N = 72;
  const p = resample([...raw, raw[0]], N + 1).slice(0, N);
  const c = centroid(p);

  // heart (checked first: it would otherwise pass as a rough polygon)
  {
    const ub = toUnitBox(p), tpl = toUnitBox(heartTemplate(N)).pts;
    let best = Infinity;
    for (const dir of [1, -1]) for (let s = 0; s < N; s += 2) {
      let e = 0;
      for (let i = 0; i < N; i++) { const q = ub.pts[(s + dir * i + N * 2) % N], r = tpl[i]; e += Math.hypot(q.x - r.x, q.y - r.y); }
      best = Math.min(best, e / N);
    }
    if (best < 0.1) return heartTemplate(96).map((q) => q).map(((t) => (q) => ({ x: ub.x0 + ((q.x - t.x0) / t.w) * ub.w, y: ub.y0 + ((q.y - t.y0) / t.h) * ub.h }))(toUnitBox(heartTemplate(96))));
  }

  // ellipse / circle
  {
    let sxx = 0, syy = 0, sxy = 0;
    for (const q of p) { const dx = q.x - c.x, dy = q.y - c.y; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    sxx /= N; syy /= N; sxy /= N;
    const tr = sxx + syy, det = sxx * syy - sxy * sxy, l1 = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - det)), l2 = tr - l1;
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const a = Math.sqrt(2 * l1), b = Math.sqrt(2 * Math.max(l2, 1e-6));
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const rs = p.map((q) => { const dx = q.x - c.x, dy = q.y - c.y, u = dx * ca + dy * sa, v = -dx * sa + dy * ca; return Math.hypot(u / a, v / b); });
    const m = rs.reduce((s, r) => s + r, 0) / N, sd = Math.sqrt(rs.reduce((s, r) => s + (r - m) ** 2, 0) / N);
    if (sd / m < 0.075) {
      const out: Pt[] = [];
      const round = b / a > 0.86, A = round ? (a + b) / 2 * m : a * m, B = round ? A : b * m;
      for (let i = 0; i <= 96; i++) { const t = (i / 96) * Math.PI * 2, u = A * Math.cos(t), v = B * Math.sin(t); out.push({ x: c.x + u * ca - v * sa, y: c.y + u * sa + v * ca }); }
      return out;
    }
  }

  // polygons: find the corners
  const start = p.reduce((bi, q, i) => (dist(q, c) > dist(p[bi], c) ? i : bi), 0);   // begin at a far point (a corner)
  const loop = [...p.slice(start), ...p.slice(0, start), p[start]];
  // a closed loop: split it at the point farthest from the start, simplify both halves
  const far = loop.reduce((bi, q, i) => (dist(q, loop[0]) > dist(loop[bi], loop[0]) ? i : bi), 0);
  let corners = [...rdp(loop.slice(0, far + 1), 0.06 * diag).slice(0, -1), ...rdp(loop.slice(far), 0.06 * diag).slice(0, -1)];
  // drop nearly straight joints
  const angleAt = (i: number, cs: Pt[]) => {
    const a = cs[(i - 1 + cs.length) % cs.length], b = cs[i], d = cs[(i + 1) % cs.length];
    const v1 = { x: a.x - b.x, y: a.y - b.y }, v2 = { x: d.x - b.x, y: d.y - b.y };
    return (Math.acos(Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / ((Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)) || 1)))) * 180) / Math.PI;
  };
  for (let changed = true; changed && corners.length > 3;) {
    changed = false;
    for (let i = 0; i < corners.length; i++) if (angleAt(i, corners) > 158) { corners.splice(i, 1); changed = true; break; }
  }
  const n = corners.length;
  const close = (cs: Pt[]) => [...cs, cs[0]];

  // five-pointed star: ten corners, tips and notches alternating
  if (n === 10) {
    const d = corners.map((q) => dist(q, c));
    const even = d.filter((_, i) => i % 2 === 0), odd = d.filter((_, i) => i % 2 === 1);
    const me = even.reduce((s, x) => s + x, 0) / 5, mo = odd.reduce((s, x) => s + x, 0) / 5;
    const R = Math.max(me, mo), r = Math.min(me, mo);
    if (r / R < 0.72) {
      const tip = corners[me > mo ? 0 : 1], a0 = Math.atan2(tip.y - c.y, tip.x - c.x);
      const ri = r / R < 0.3 ? R * 0.38 : r;
      return close(Array.from({ length: 10 }, (_, i) => { const rr = i % 2 ? ri : R, a = a0 + (i * Math.PI) / 5; return { x: c.x + rr * Math.cos(a), y: c.y + rr * Math.sin(a) }; }));
    }
  }
  if (n === 3) return close(corners);
  if (n === 4) {
    const angles = corners.map((_, i) => angleAt(i, corners));
    if (angles.every((a) => Math.abs(a - 90) < 20)) {
      // rectangle: square up its edges, keep its tilt (snap the tilt when almost level)
      let th = Math.atan2(corners[1].y - corners[0].y, corners[1].x - corners[0].x);
      const snap = Math.round(th / (Math.PI / 2)) * (Math.PI / 2); if (Math.abs(th - snap) < 0.12) th = snap;
      const w = (dist(corners[0], corners[1]) + dist(corners[2], corners[3])) / 2;
      let h = (dist(corners[1], corners[2]) + dist(corners[3], corners[0])) / 2;
      let ww = w; if (Math.abs(w - h) / Math.max(w, h) < 0.14) { ww = h = (w + h) / 2; }
      const ca = Math.cos(th), sa = Math.sin(th);
      return close([[-ww / 2, -h / 2], [ww / 2, -h / 2], [ww / 2, h / 2], [-ww / 2, h / 2]].map(([u, v]) => ({ x: c.x + u * ca - v * sa, y: c.y + u * sa + v * ca })));
    }
    return close(corners);
  }
  if (n === 5 || n === 6) return close(corners);
  return null;
}
