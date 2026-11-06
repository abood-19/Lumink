"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { downloadDataUrl, fileToDataUrl, loadImage } from "@/lib/store";
import { ColorPicker, hexToRgb } from "./ColorPicker";

/**
 * Colour + UV glow lab.
 * One paint layer, shown twice side by side: under normal light and under a UV lamp.
 * Paint is always clipped to the tattoo itself (the area enclosed by its line work), never the background.
 * The picture always fits the frame; zoom with pinch, the mouse wheel (after clicking into the frame) or +/-.
 */

const PALETTE = ["#111111", "#B3261E", "#E2572B", "#F2C434", "#2F8F4E", "#1E9C8C", "#1F6FB2", "#5B3FA8", "#D46A9F", "#39FF14", "#00F0FF", "#FF2BD6"];
const SAMPLE = "/designs/oni.png";

type Tool = "fill" | "brush" | "eraser" | "move";
const ICON: Record<Tool, string> = {
  fill: "M5 11l7-7 7 7-7 7ZM19 15c0 2 1.5 3 1.5 4.5a1.5 1.5 0 0 1-3 0C17.5 18 19 17 19 15ZM3 21h11",
  brush: "M14 4l6 6-8 8-6-6ZM6 12l-2 6 6-2M3 21c2 0 3-1 3-3",
  eraser: "M8 20h12M5 15l9-9 5 5-9 9H8Z M10 10l5 5",
  move: "M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3",
};

const canvas = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

/** Otsu threshold on luminance, kept in a sane range for line art. */
function otsu(lum: Uint8Array) {
  const hist = new Array(256).fill(0);
  for (const v of lum) hist[v]++;
  const total = lum.length;
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, thr = 160;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; thr = i; }
  }
  return Math.max(90, Math.min(200, thr + 10));
}

function dilate(m: Uint8Array, w: number, h: number, r: number) {
  if (r <= 0) return m;
  const out = new Uint8Array(m);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x])
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < w && Y < h) out[Y * w + X] = 1;
    }
  return out;
}

export function ColorLab({ startIn = "color" }: { startIn?: "color" | "glow" }) {
  const { t } = useI18n();
  const frame = useRef<HTMLDivElement>(null);
  const dayRef = useRef<HTMLCanvasElement>(null);
  const uvRef = useRef<HTMLCanvasElement>(null);

  const lines = useRef<HTMLCanvasElement | null>(null);   // the design on white
  const glowLines = useRef<HTMLCanvasElement | null>(null); // line work as light strokes for the UV view
  const paint = useRef<HTMLCanvasElement | null>(null);
  const area = useRef<HTMLCanvasElement | null>(null);    // alpha = inside the tattoo
  const ink = useRef<HTMLCanvasElement | null>(null);     // the line work as dark ink on transparent
  const lineAlpha = useRef<HTMLCanvasElement | null>(null); // alpha = line pixels
  const tmpA = useRef<HTMLCanvasElement | null>(null);
  const tmpB = useRef<HTMLCanvasElement | null>(null);
  const wall = useRef<Uint8Array | null>(null);
  const lineMask = useRef<Uint8Array | null>(null);
  const inside = useRef<Uint8Array | null>(null);
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);

  const [size, setSize] = useState<[number, number] | null>(null);
  const [tool, setTool] = useState<Tool>("fill");
  const [color, setColor] = useState(startIn === "glow" ? "#39FF14" : "#B3261E");
  const [brush, setBrush] = useState(16);
  const [moreColors, setMoreColors] = useState(false);
  const [err, setErr] = useState("");
  const [view, setView] = useState({ s: 1, x: 0, y: 0 }); // zoom relative to "fit", pan in screen px
  const [engaged, setEngaged] = useState(false);
  const [, bump] = useState(0);
  const viewRef = useRef(view); viewRef.current = view;

  // ---------- rendering ----------
  const render = useCallback((live?: HTMLCanvasElement | null) => {
    const l = lines.current, p = live ?? paint.current, gl = glowLines.current;
    const d = dayRef.current, u = uvRef.current;
    if (!l || !p || !gl || !d || !u) return;
    const w = l.width, h = l.height;
    const dc = d.getContext("2d")!;
    dc.globalCompositeOperation = "source-over"; dc.globalAlpha = 1; dc.filter = "none";
    dc.fillStyle = "#fff"; dc.fillRect(0, 0, w, h);
    dc.drawImage(p, 0, 0);
    // line work stays dark, except where it has been recoloured
    const a = tmpA.current!, ac = a.getContext("2d")!, b = tmpB.current!, bc = b.getContext("2d")!;
    bc.globalCompositeOperation = "copy"; bc.drawImage(p, 0, 0);
    bc.globalCompositeOperation = "destination-in"; bc.drawImage(lineAlpha.current!, 0, 0);
    ac.globalCompositeOperation = "copy"; ac.drawImage(ink.current!, 0, 0);
    ac.globalCompositeOperation = "destination-out"; ac.drawImage(b, 0, 0);
    ac.globalCompositeOperation = "source-over";
    dc.drawImage(a, 0, 0);
    dc.globalCompositeOperation = "source-over";

    const uc = u.getContext("2d")!;
    uc.globalCompositeOperation = "source-over"; uc.globalAlpha = 1; uc.filter = "none";
    uc.fillStyle = "#07060d"; uc.fillRect(0, 0, w, h);
    uc.globalAlpha = 0.22; uc.drawImage(gl, 0, 0); uc.globalAlpha = 1;          // faint outline so the design is readable
    uc.globalCompositeOperation = "lighter";
    uc.filter = `saturate(1.7) brightness(1.25) blur(${Math.max(4, Math.round(w / 55))}px)`; uc.globalAlpha = 0.85; uc.drawImage(p, 0, 0);
    uc.filter = `saturate(1.6) brightness(1.2) blur(${Math.max(1, Math.round(w / 350))}px)`; uc.globalAlpha = 0.9; uc.drawImage(p, 0, 0);
    uc.filter = "saturate(1.5) brightness(1.15)"; uc.globalAlpha = 1; uc.drawImage(p, 0, 0);
    uc.filter = "none"; uc.globalCompositeOperation = "source-over"; uc.globalAlpha = 0.85; uc.drawImage(a, 0, 0);
    uc.globalCompositeOperation = "source-over"; uc.globalAlpha = 1;
  }, []);

  // ---------- loading ----------
  const setup = async (src: string) => {
    setErr("");
    let img: HTMLImageElement;
    try { img = await loadImage(src); } catch { setErr(t.col_load_error); return; }
    if (!img.width || !img.height) { setErr(t.col_load_error); return; }
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
    const l = canvas(w, h), lc = l.getContext("2d", { willReadFrequently: true })!;
    lc.fillStyle = "#fff"; lc.fillRect(0, 0, w, h); lc.imageSmoothingQuality = "high"; lc.drawImage(img, 0, 0, w, h);
    const px = lc.getImageData(0, 0, w, h).data;
    const lum = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) lum[i] = Math.round(px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11);
    const thr = otsu(lum);
    const lm = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) lm[i] = lum[i] < thr ? 1 : 0;
    const wl = dilate(lm, w, h, Math.max(1, Math.round(Math.max(w, h) / 900)));

    // outside = reachable from the picture's border without crossing a line (gaps up to ~3px closed)
    const closed = dilate(lm, w, h, Math.max(2, Math.round(Math.max(w, h) / 450)));
    const out = new Uint8Array(w * h);
    const stack: number[] = [];
    const seed = (i: number) => { if (!closed[i] && !out[i]) { out[i] = 1; stack.push(i); } };
    for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
    while (stack.length) {
      const i = stack.pop()!; const x = i % w, y = (i - x) / w;
      if (x > 0) seed(i - 1); if (x < w - 1) seed(i + 1); if (y > 0) seed(i - w); if (y < h - 1) seed(i + w);
    }
    const ins = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) ins[i] = out[i] ? 0 : 1;
    // the area mask is drawn as alpha, slightly softened at the edge
    const a = canvas(w, h), ac = a.getContext("2d")!, ad = ac.createImageData(w, h);
    for (let i = 0; i < w * h; i++) if (ins[i] || lm[i]) ad.data[i * 4 + 3] = 255;
    ac.putImageData(ad, 0, 0);

    // light version of the line work for the dark UV view
    const g = canvas(w, h), gc = g.getContext("2d")!, gd = gc.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { const v = 255 - lum[i]; gd.data[i * 4] = gd.data[i * 4 + 1] = gd.data[i * 4 + 2] = 255; gd.data[i * 4 + 3] = v; }
    gc.putImageData(gd, 0, 0);

    const ik = canvas(w, h), ikc = ik.getContext("2d")!, ikd = ikc.createImageData(w, h);
    const la = canvas(w, h), lac = la.getContext("2d")!, lad = lac.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      // keep the original ink colour of the line work (usually black), alpha from how dark it is
      const al = Math.min(255, Math.max(0, (245 - lum[i]) * 1.6));
      ikd.data[i * 4] = px[i * 4]; ikd.data[i * 4 + 1] = px[i * 4 + 1]; ikd.data[i * 4 + 2] = px[i * 4 + 2]; ikd.data[i * 4 + 3] = al;
      if (lm[i]) lad.data[i * 4 + 3] = 255;
    }
    ikc.putImageData(ikd, 0, 0); lac.putImageData(lad, 0, 0);
    ink.current = ik; lineAlpha.current = la; tmpA.current = canvas(w, h); tmpB.current = canvas(w, h);
    lines.current = l; glowLines.current = g; area.current = a;
    wall.current = wl; lineMask.current = lm; inside.current = ins;
    paint.current = canvas(w, h);
    undoStack.current = []; redoStack.current = [];
    for (const c of [dayRef.current, uvRef.current]) if (c) { c.width = w; c.height = h; }
    setView({ s: 1, x: 0, y: 0 });
    setSize([w, h]);
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/") || /heic|heif/i.test(f.type)) { setErr(t.col_load_error); return; }
    setup(await fileToDataUrl(f));
  };
  useEffect(() => { if (size) render(); }, [size, render]);

  // ---------- editing ----------
  const snapshot = () => {
    const p = paint.current!; undoStack.current.push(p.getContext("2d")!.getImageData(0, 0, p.width, p.height));
    if (undoStack.current.length > 30) undoStack.current.shift();
    redoStack.current = [];
  };
  const swap = (from: ImageData[], to: ImageData[]) => {
    const d = from.pop(); if (!d) return;
    const pc = paint.current!.getContext("2d")!;
    to.push(pc.getImageData(0, 0, d.width, d.height)); pc.putImageData(d, 0, 0); render(); bump((n) => n + 1);
  };
  const clearAll = () => { const p = paint.current; if (!p) return; snapshot(); p.getContext("2d")!.clearRect(0, 0, p.width, p.height); render(); bump((n) => n + 1); };

  /** Tap: fill the enclosed shape under the finger; on a line, recolour that connected line. */
  const fillAt = (x: number, y: number) => {
    const [w, h] = size!; const wl = wall.current!, lm = lineMask.current!, ins = inside.current!;
    const i0 = y * w + x;
    const onLine = lm[i0] || (wl[i0] && !ins[i0]);
    if (!ins[i0] && !lm[i0]) return; // background: never painted
    const pass = onLine ? (i: number) => !!lm[i] : (i: number) => !wl[i] && !!ins[i];
    if (!pass(i0)) return;
    const reg = new Uint8Array(w * h); reg[i0] = 1; const st = [i0];
    while (st.length) {
      const i = st.pop()!; const xx = i % w, yy = (i - xx) / w;
      const nb = [xx > 0 ? i - 1 : -1, xx < w - 1 ? i + 1 : -1, yy > 0 ? i - w : -1, yy < h - 1 ? i + w : -1];
      for (const n of nb) if (n >= 0 && !reg[n] && pass(n)) { reg[n] = 1; st.push(n); }
    }
    const grown = onLine ? reg : dilate(reg, w, h, Math.max(2, Math.round(Math.max(w, h) / 600)));
    snapshot();
    const pc = paint.current!.getContext("2d", { willReadFrequently: true })!;
    const img = pc.getImageData(0, 0, w, h), d = img.data, [r, g, b] = hexToRgb(color);
    for (let i = 0; i < w * h; i++) if (grown[i] && (ins[i] || lm[i])) { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; }
    pc.putImageData(img, 0, 0); render(); bump((n) => n + 1);
  };

  const stroke = useRef<{ c: HTMLCanvasElement; last: [number, number] } | null>(null);
  const strokeRender = () => {
    const s = stroke.current; if (!s) return;
    const [w, h] = size!;
    const clipped = canvas(w, h), cc = clipped.getContext("2d")!;
    cc.drawImage(s.c, 0, 0); cc.globalCompositeOperation = "destination-in"; cc.drawImage(area.current!, 0, 0);
    const out = canvas(w, h), oc = out.getContext("2d")!;
    oc.drawImage(paint.current!, 0, 0);
    if (tool === "eraser") oc.globalCompositeOperation = "destination-out";
    oc.drawImage(clipped, 0, 0);
    return out;
  };
  const dab = (a: [number, number], b: [number, number]) => {
    const sc = stroke.current!.c.getContext("2d")!;
    const k = size![0] / (dayRef.current!.getBoundingClientRect().width || size![0]);
    sc.strokeStyle = tool === "eraser" ? "#000" : color; sc.lineWidth = brush * k; sc.lineCap = sc.lineJoin = "round";
    sc.beginPath(); sc.moveTo(a[0], a[1]); sc.lineTo(b[0], b[1]); sc.stroke();
  };

  // ---------- pointers: draw, pan, pinch ----------
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const pinch = useRef<{ d: number; s: number; cx: number; cy: number; vx: number; vy: number } | null>(null);

  const toImage = (e: { clientX: number; clientY: number }, el: HTMLCanvasElement) => {
    const r = el.getBoundingClientRect(), [w, h] = size!;
    return [Math.floor(((e.clientX - r.left) / r.width) * w), Math.floor(((e.clientY - r.top) / r.height) * h)] as [number, number];
  };
  const inImage = ([x, y]: [number, number]) => x >= 0 && y >= 0 && x < size![0] && y < size![1];

  /** Zoom keeping the point (px, py) — measured from the panel's centre — under the cursor. */
  const zoomAt = (factor: number, px = 0, py = 0) => {
    setView((v) => {
      const s = Math.min(8, Math.max(1, v.s * factor));
      const k = s / v.s;
      const nx = s === 1 ? 0 : px - (px - v.x) * k, ny = s === 1 ? 0 : py - (py - v.y) * k;
      return { s, x: nx, y: ny };
    });
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!size) return;
    setEngaged(true);
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      // second finger: cancel any stroke and start a pinch
      if (stroke.current) { stroke.current = null; render(); }
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), s: viewRef.current.s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, vx: viewRef.current.x, vy: viewRef.current.y };
      return;
    }
    const panning = tool === "move" || e.button === 1 || e.button === 2;
    if (panning) { pan.current = { x: e.clientX, y: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y }; return; }
    const pt = toImage(e, el);
    if (!inImage(pt)) return;
    if (tool === "fill") { fillAt(pt[0], pt[1]); return; }
    stroke.current = { c: canvas(size[0], size[1]), last: pt };
    dab(pt, pt); render(strokeRender());
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const s = Math.min(8, Math.max(1, pinch.current.s * (d / pinch.current.d)));
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      setView(s === 1 ? { s, x: 0, y: 0 } : { s, x: pinch.current.vx + (cx - pinch.current.cx), y: pinch.current.vy + (cy - pinch.current.cy) });
      return;
    }
    if (pan.current) {
      const p = pan.current;
      setView((v) => ({ ...v, x: p.vx + e.clientX - p.x, y: p.vy + e.clientY - p.y }));
      return;
    }
    if (stroke.current) {
      const pt = toImage(e, e.currentTarget);
      dab(stroke.current.last, pt); stroke.current.last = pt; render(strokeRender());
    }
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    pan.current = null;
    if (stroke.current) {
      const out = strokeRender()!;
      snapshot();
      const pc = paint.current!.getContext("2d")!;
      pc.clearRect(0, 0, out.width, out.height); pc.drawImage(out, 0, 0);
      stroke.current = null; render(); bump((n) => n + 1);
    }
  };

  // wheel: zoom only once the user is working in the frame (or on a trackpad pinch); otherwise the page scrolls
  useEffect(() => {
    const fr = frame.current; if (!fr) return;
    const onWheel = (e: WheelEvent) => {
      if (!size || (!engaged && !e.ctrlKey)) return;
      e.preventDefault();
      const box = (e.target as Element).closest("[data-panel]")?.getBoundingClientRect();
      const px = box ? e.clientX - box.left - box.width / 2 : 0, py = box ? e.clientY - box.top - box.height / 2 : 0;
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), px, py);
    };
    const leave = () => setEngaged(false);
    fr.addEventListener("wheel", onWheel, { passive: false });
    fr.addEventListener("pointerleave", leave);
    return () => { fr.removeEventListener("wheel", onWheel); fr.removeEventListener("pointerleave", leave); };
  }, [size, engaged]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportPng = () => {
    const d = dayRef.current, u = uvRef.current; if (!d || !u || !size) return;
    const [w, h] = size, gap = Math.round(w * 0.03);
    const c = canvas(w * 2 + gap, h), cc = c.getContext("2d")!;
    cc.fillStyle = "#0a0b09"; cc.fillRect(0, 0, c.width, c.height);
    cc.drawImage(d, 0, 0); cc.drawImage(u, w + gap, 0);
    downloadDataUrl(c.toDataURL("image/png"), "lumink-colors.png");
  };

  const transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
  const cursor = tool === "move" ? "cursor-grab active:cursor-grabbing" : tool === "fill" ? "cursor-pointer" : "cursor-crosshair";
  const panel = (which: "day" | "uv") => (
    <figure key={which} data-panel className={`relative m-0 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line ${which === "uv" ? "bg-[#07060d]" : "bg-white"}`}>
      <figcaption className={`absolute start-3 top-3 z-10 rounded-full px-3 py-1 text-[12px] font-medium ${which === "uv" ? "bg-[rgba(109,60,255,.25)] text-[#e3d9ff]" : "bg-[rgba(10,11,9,.08)] text-[#141416]"}`}>
        {which === "uv" ? t.col_view_uv : t.col_view_day}
      </figcaption>
      <div className="flex h-[min(58vh,560px)] min-h-[300px] items-center justify-center p-3">
        <canvas
          ref={which === "uv" ? uvRef : dayRef}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onContextMenu={(e) => e.preventDefault()}
          className={`block max-h-full max-w-full touch-none select-none ${cursor} ${size ? "" : "hidden"}`}
          style={{ transform, transformOrigin: "center", transition: pinch.current || pan.current ? "none" : "transform .08s ease-out" }}
        />
      </div>
    </figure>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* toolbar: one row, everything you need */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-2xl border border-line bg-[rgba(255,255,255,.03)] p-1" role="toolbar" aria-label="Tools">
          {(["fill", "brush", "eraser", "move"] as Tool[]).map((k) => (
            <button key={k} type="button" aria-pressed={tool === k} onClick={() => setTool(k)} title={k === "move" ? t.cl_move : k === "fill" ? t.col_t_fill : k === "brush" ? t.col_t_brush : t.col_t_erase}
              className={`flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm ${tool === k ? "bg-lilac text-[#0a0b09]" : "text-mist hover:text-white"}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={ICON[k]} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="max-sm:hidden">{k === "move" ? t.cl_move : k === "fill" ? t.col_t_fill : k === "brush" ? t.col_t_brush : t.col_t_erase}</span>
            </button>
          ))}
        </div>
        {(tool === "brush" || tool === "eraser") && (
          <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-line px-4 text-[13px] text-mist">
            {t.col_size}
            <input type="range" min={2} max={80} value={brush} onChange={(e) => setBrush(+e.target.value)} className="w-28" />
          </label>
        )}
        <div className="ms-auto flex gap-1">
          <button type="button" onClick={() => zoomAt(1 / 1.3)} disabled={!size} aria-label="−" className="lx-btn lx-btn-ghost !min-h-11 !w-11 !rounded-xl !p-0">−</button>
          <button type="button" onClick={() => setView({ s: 1, x: 0, y: 0 })} disabled={!size} className="lx-btn lx-btn-ghost !min-h-11 !rounded-xl !px-3 text-[13px]">{Math.round(view.s * 100)}%</button>
          <button type="button" onClick={() => zoomAt(1.3)} disabled={!size} aria-label="+" className="lx-btn lx-btn-ghost !min-h-11 !w-11 !rounded-xl !p-0">+</button>
          <button type="button" onClick={() => swap(undoStack.current, redoStack.current)} disabled={!undoStack.current.length} className="lx-btn lx-btn-ghost !min-h-11 !rounded-xl !px-3" aria-label={t.col_undo}>↶</button>
          <button type="button" onClick={() => swap(redoStack.current, undoStack.current)} disabled={!redoStack.current.length} className="lx-btn lx-btn-ghost !min-h-11 !rounded-xl !px-3" aria-label={t.col_redo}>↷</button>
        </div>
      </div>

      {/* palette */}
      <div className="flex flex-wrap items-center gap-2">
        {PALETTE.map((c) => (
          <button key={c} type="button" aria-label={c} aria-pressed={color === c} onClick={() => setColor(c)}
            className="h-9 w-9 rounded-full border-2 transition" style={{ background: c, borderColor: color === c ? "#f3f3f5" : "transparent", boxShadow: color === c ? "0 0 0 2px #0a0b09 inset" : undefined }} />
        ))}
        <button type="button" onClick={() => setMoreColors((v) => !v)} aria-expanded={moreColors} className="flex h-9 items-center gap-2 rounded-full border border-line px-3 text-[13px] text-mist hover:text-white">
          <span className="h-5 w-5 rounded-full border border-[rgba(255,255,255,.3)]" style={{ background: color }} />{t.cl_more}
        </button>
      </div>
      {moreColors && <div className="max-w-[340px]"><ColorPicker value={color} onChange={setColor} label={t.pc_color} /></div>}

      {/* the two views */}
      <div ref={frame} className="relative grid gap-3 md:grid-cols-2">
        {panel("day")}
        {panel("uv")}
        {!size && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-[rgba(10,11,9,.82)]">
            <label className="lx-btn lx-btn-primary relative cursor-pointer">
              {t.st_upload}
              <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            <button type="button" onClick={() => setup(SAMPLE)} className="text-sm font-medium text-mist underline underline-offset-4 hover:text-white">{t.col_sample}</button>
          </div>
        )}
      </div>
      {err && <p role="alert" className="m-0 bg-[rgba(240,149,149,.15)] px-4 py-3 text-sm text-[#ffc9cc]">{err}</p>}
      <p className="m-0 text-sm leading-relaxed text-mist">{t.cl_hint}</p>

      <div className="flex flex-wrap gap-2">
        <label className="lx-btn lx-btn-ghost relative cursor-pointer">
          {t.st_upload}
          <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <button type="button" onClick={clearAll} disabled={!size} className="lx-btn lx-btn-ghost">{t.col_reset}</button>
        <button type="button" onClick={exportPng} disabled={!size} className="lx-btn lx-btn-primary">{t.st_download}</button>
      </div>
    </div>
  );

}
