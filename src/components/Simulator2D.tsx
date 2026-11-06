"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { downloadDataUrl, fileToDataUrl, loadImage } from "@/lib/store";
import { compositeInk, drawInk, hasTransparency, knockOutWhite, type InkMode, type Placement } from "@/lib/inkComposite";

/** Key used to hand a design from the generator or stencil studio to the simulator. */
export const HANDOFF_KEY = "lumink-handoff-design";

type Tab = "photo" | "body";
type Part = "arm" | "hand" | "leg" | "foot" | "chest" | "back" | "neck" | "head";
const PARTS: Part[] = ["arm", "hand", "leg", "foot", "chest", "back", "neck", "head"];
/** Pixels per centimetre of each template render (from the 170 cm body it was rendered from). */
const PART_SCALE: Record<Part, number> = { arm: 26.74, hand: 51.6, leg: 18.74, foot: 42.02, chest: 25.21, back: 19.77, neck: 46.44, head: 31.63 };
const PART_SIZE: Record<Part, number> = { arm: 10, hand: 6, leg: 14, foot: 7, chest: 18, back: 24, neck: 7, head: 9 };
const SKIN_TONES = ["#f1cdb4", "#e2b08f", "#c98d66", "#a06a46", "#74472d", "#4a2c1d"];
const DESIGNS = [
  { id: "tribal", src: "/designs/tribal.png" },
  { id: "oni", src: "/designs/oni.png" },
  { id: "spine", src: "/designs/spine.png" },
  { id: "mask", src: "/designs/mask.png" },
  { id: "mandala", src: "/designs/mandala.png" },
  { id: "geometry", src: "/designs/geometry.png" },
  { id: "lettering", src: "/designs/lettering.png" },
  { id: "band", src: "/designs/band.png" },
];
const SAMPLE = { src: "/photos/arm-left.png", pxPerCm: 212 / 10.5 };
const STAGE_BG = "#1b1c18";
const LONG_SIDE = 1300;

type Sized = HTMLCanvasElement | HTMLImageElement;
type Opts = { sizeCm: number; rot: number; flip: boolean; bend: number; opacity: number; healed: boolean; ink: InkMode };
type Tool = "move" | "erase" | "ruler";

export function Simulator2D() {
  const { t } = useI18n();
  const view = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState<Tab>("photo");
  const [part, setPart] = useState<Part>("arm");
  const [tone, setTone] = useState(SKIN_TONES[1]);
  const [opts, setOpts] = useState<Opts>({ sizeCm: 9, rot: 0, flip: false, bend: 0.45, opacity: 0.94, healed: false, ink: "original" });
  const [designId, setDesignId] = useState("tribal");
  const [tool, setTool] = useState<Tool>("move");
  const [brush, setBrush] = useState(26);
  const [compare, setCompare] = useState(false);
  const [rulerCm, setRulerCm] = useState(8);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [knock, setKnock] = useState({ show: false, on: true });
  const [dims, setDims] = useState({ w: 3, h: 4 });
  const stage = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ w: 0, h: 0 });           // photo size in CSS px when it fits the frame
  const [zv, setZv] = useState({ s: 1, x: 0, y: 0 });       // view zoom/pan of the whole photo
  const zvRef = useRef(zv); zvRef.current = zv;
  const engaged = useRef(false);
  const [, tick] = useState(0);                              // re-render the design handles

  // Engine state lives in refs so pointer moves don't re-render React.
  const S = useRef({
    base: null as HTMLCanvasElement | null,         // skin / photo at working size, on the stage colour
    bodyAlpha: null as HTMLCanvasElement | null,    // where ink may go (template body or photo cut-out)
    skin: null as ImageData | null,
    skinBlur: null as ImageData | null,
    ink: null as CanvasRenderingContext2D | null,
    mask: null as HTMLCanvasElement | null,         // erased areas (white = erased)
    design: null as Sized | null,
    designRaw: null as HTMLImageElement | null,
    pxPerCm: 20,
    cx: 0, cy: 0,
    ruler: [0.3, 0.5, 0.7, 0.5] as [number, number, number, number],
    opts: opts,
    compare: false,
    tool: "move" as Tool,
    brush: 26,
  });
  S.current.opts = opts; S.current.compare = compare; S.current.tool = tool; S.current.brush = brush;

  /* ---------- rendering ---------- */
  const raf = useRef(0);
  const render = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const s = S.current, cv = view.current, ov = overlay.current;
      if (!s.base || !s.skin || !s.skinBlur || !cv || !ov) return;
      const g = cv.getContext("2d")!;
      const out = new ImageData(new Uint8ClampedArray(s.skin.data), s.skin.width, s.skin.height);
      const o = s.opts;
      const place: Placement = { cx: s.cx, cy: s.cy, sizePx: o.sizeCm * s.pxPerCm, rot: o.rot, flip: o.flip, bend: o.bend, opacity: o.opacity, healed: o.healed, ink: o.ink };
      let box = { x: 0, y: 0, x1: 0, y1: 0 };
      if (s.design && s.ink && !s.compare) {
        box = drawInk(s.ink, s.design, place);
        const ic = s.ink;
        ic.save();
        if (s.bodyAlpha) { ic.globalCompositeOperation = "destination-in"; ic.drawImage(s.bodyAlpha, 0, 0); }
        if (s.mask) { ic.globalCompositeOperation = "destination-out"; ic.drawImage(s.mask, 0, 0); }
        ic.restore();
        const bw = box.x1 - box.x, bh = box.y1 - box.y;
        if (bw > 0 && bh > 0) compositeInk(out, s.skin, s.skinBlur, ic.getImageData(box.x, box.y, bw, bh), box, place);
      }
      g.putImageData(out, 0, 0);

      // overlay: selection frame, ruler, brush hint — never part of the export
      const og = ov.getContext("2d")!;
      og.clearRect(0, 0, ov.width, ov.height);
      const scale = s.base.width / Math.max(1, cv.getBoundingClientRect().width);
      if (s.tool === "ruler") {
        const [ax, ay, bx, by] = s.ruler.map((v, i) => v * (i % 2 ? ov.height : ov.width));
        og.strokeStyle = "#c4f135"; og.lineWidth = 2.5 * scale; og.setLineDash([]);
        og.beginPath(); og.moveTo(ax, ay); og.lineTo(bx, by); og.stroke();
        og.fillStyle = "#c4f135";
        for (const [x, y] of [[ax, ay], [bx, by]]) { og.beginPath(); og.arc(x, y, 9 * scale, 0, Math.PI * 2); og.fill(); }
      } else if (s.design && !s.compare && box.x1 > box.x) {
        // the design's own (rotated) frame, matching the on-screen handles
        const d = s.design, k = (o.sizeCm * s.pxPerCm) / Math.max(d.width, d.height);
        og.save();
        og.translate(s.cx, s.cy); og.rotate((o.rot * Math.PI) / 180);
        og.strokeStyle = "rgba(196,241,53,.8)"; og.lineWidth = 1.5 * scale; og.setLineDash([6 * scale, 5 * scale]);
        og.strokeRect((-d.width * k) / 2, (-d.height * k) / 2, d.width * k, d.height * k);
        og.restore();
      }
    });
  }, []);

  /** Sets the stage image (photo or tinted template) and rebuilds the skin buffers. */
  const setBase = useCallback((src: Sized, alpha: boolean, pxPerCmAtSrc: number, tint?: string) => {
    const s = S.current;
    const k = Math.min(2.2, LONG_SIDE / Math.max(src.width, src.height));
    const W = Math.round(src.width * k), H = Math.round(src.height * k);
    const make = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };

    // the subject alone
    const subj = make(), sg = subj.getContext("2d")!;
    sg.imageSmoothingQuality = "high";
    if (tint) sg.filter = "brightness(1.18) contrast(1.04)";
    sg.drawImage(src, 0, 0, W, H);
    sg.filter = "none";
    if (tint) {
      sg.globalCompositeOperation = "multiply"; sg.fillStyle = tint; sg.fillRect(0, 0, W, H);
      sg.globalCompositeOperation = "destination-in"; sg.drawImage(src, 0, 0, W, H);
    }
    const base = make(), bg = base.getContext("2d", { willReadFrequently: true })!;
    bg.fillStyle = STAGE_BG; bg.fillRect(0, 0, W, H); bg.drawImage(subj, 0, 0);

    const blur = make(), blg = blur.getContext("2d", { willReadFrequently: true })!;
    blg.filter = `blur(${Math.max(4, Math.round(W / 140))}px)`; blg.drawImage(base, 0, 0);

    s.base = base;
    s.skin = bg.getImageData(0, 0, W, H);
    s.skinBlur = blg.getImageData(0, 0, W, H);
    s.bodyAlpha = alpha ? subj : null;
    s.pxPerCm = pxPerCmAtSrc * k;
    const ink = make(); s.ink = ink.getContext("2d", { willReadFrequently: true });
    s.mask = make();
    s.cx = W / 2; s.cy = H * 0.5;
    for (const c of [view.current, overlay.current]) if (c) { c.width = W; c.height = H; }
    setDims({ w: W, h: H });
    render();
  }, [render]);

  const setDesignImage = useCallback((img: HTMLImageElement, knockOut: boolean) => {
    S.current.designRaw = img;
    S.current.design = knockOut ? knockOutWhite(img) : img;
    render();
  }, [render]);

  /* ---------- loading ---------- */
  const loadPhoto = useCallback(async (src: string, pxPerCm?: number) => {
    setBusy(true); setError("");
    try {
      const img = await loadImage(src);
      const alpha = hasTransparency(img);
      setBase(img, alpha, pxPerCm ?? img.width / 30);
      if (pxPerCm == null) setTool("ruler");
    } catch { setError(t.sim3_error); }
    setBusy(false);
  }, [setBase, t.sim3_error]);

  const loadPart = useCallback(async (p: Part, skin: string) => {
    setBusy(true); setError("");
    try {
      const img = await loadImage(`/body/${p}.png`);
      setBase(img, true, PART_SCALE[p], skin);
    } catch { setError(t.sim3_error); }
    setBusy(false);
  }, [setBase, t.sim3_error]);

  useEffect(() => {
    (async () => {
      let handed: string | null = null;
      try { handed = sessionStorage.getItem(HANDOFF_KEY); sessionStorage.removeItem(HANDOFF_KEY); } catch {}
      const d = await loadImage(handed ?? DESIGNS[0].src).catch(() => null);
      if (d) {
        const opaque = !hasTransparency(d);
        setKnock({ show: opaque, on: true });
        setDesignImage(d, opaque);
        if (handed) setDesignId("custom");
      }
      await loadPhoto(SAMPLE.src, SAMPLE.pxPerCm);
    })();
    return () => cancelAnimationFrame(raf.current);
  }, [loadPhoto, setDesignImage]);

  useEffect(() => { render(); }, [opts, compare, tool, render]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setTool("move");
    if (next === "body") { setOpts((o) => ({ ...o, sizeCm: PART_SIZE[part] })); loadPart(part, tone); }
    else loadPhoto(SAMPLE.src, SAMPLE.pxPerCm);
  };
  const pickPart = (p: Part) => { setPart(p); setOpts((o) => ({ ...o, sizeCm: PART_SIZE[p] })); loadPart(p, tone); };
  const pickTone = (c: string) => { setTone(c); loadPart(part, c); };
  const pickDesign = async (id: string, src: string) => {
    setDesignId(id);
    const img = await loadImage(src);
    setKnock({ show: false, on: true });
    setDesignImage(img, false);
  };

  // the whole photo always fits inside the frame, whatever its size or orientation
  useEffect(() => {
    const el = stage.current; if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const k = Math.min((r.width - 24) / dims.w, (r.height - 24) / dims.h);
      setFit({ w: Math.max(1, Math.floor(dims.w * k)), h: Math.max(1, Math.floor(dims.h * k)) });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, [dims]);
  useEffect(() => { setZv({ s: 1, x: 0, y: 0 }); }, [dims]);

  const zoomView = (factor: number, px = 0, py = 0) => setZv((v) => {
    const s2 = clamp(v.s * factor, 1, 6), k = s2 / v.s;
    return s2 === 1 ? { s: 1, x: 0, y: 0 } : { s: s2, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
  });
  // wheel: zooms the photo once you have clicked into it (or on a trackpad pinch); otherwise the page scrolls
  useEffect(() => {
    const el = stage.current; if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!engaged.current && !e.ctrlKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomView(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    };
    const leave = () => { engaged.current = false; };
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("wheel", wheel); el.removeEventListener("pointerleave", leave); };
  }, []);

  /** Design frame in image pixels: centre, half sizes, rotation. */
  const designBox = () => {
    const s2 = S.current, d = s2.design; if (!d) return null;
    const k = (s2.opts.sizeCm * s2.pxPerCm) / Math.max(d.width, d.height);
    return { cx: s2.cx, cy: s2.cy, hw: (d.width * k) / 2, hh: (d.height * k) / 2, rot: (s2.opts.rot * Math.PI) / 180 };
  };
  const onDesign = (x: number, y: number) => {
    const b = designBox(); if (!b) return false;
    const dx = x - b.cx, dy = y - b.cy, c = Math.cos(-b.rot), sn = Math.sin(-b.rot);
    const lx = dx * c - dy * sn, ly = dx * sn + dy * c;
    return Math.abs(lx) <= b.hw * 1.05 && Math.abs(ly) <= b.hh * 1.05;
  };
  const panView = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  /** Corner handle: drag to scale; rotate handle: drag to turn. */
  const handleDrag = (mode: "scale" | "rotate") => (ev: React.PointerEvent) => {
    ev.stopPropagation(); ev.preventDefault();
    (ev.target as Element).setPointerCapture(ev.pointerId);
    const s2 = S.current, cv = view.current!;
    const r = cv.getBoundingClientRect();
    const cx = r.left + (s2.cx / cv.width) * r.width, cy = r.top + (s2.cy / cv.height) * r.height;
    const d0 = Math.max(4, Math.hypot(ev.clientX - cx, ev.clientY - cy)), a0 = Math.atan2(ev.clientY - cy, ev.clientX - cx);
    const o0 = { ...s2.opts };
    const move = (e2: PointerEvent) => {
      if (mode === "scale") {
        const d = Math.hypot(e2.clientX - cx, e2.clientY - cy);
        setOpts((o) => ({ ...o, sizeCm: clamp(+(o0.sizeCm * (d / d0)).toFixed(1), 1, 80) }));
      } else {
        const a = Math.atan2(e2.clientY - cy, e2.clientX - cx);
        let deg = Math.round(wrapDeg(o0.rot + ((a - a0) * 180) / Math.PI));
        if (Math.abs(deg % 45) < 3) deg = Math.round(deg / 45) * 45; // gentle snap to 0/45/90°
        setOpts((o) => ({ ...o, rot: deg }));
      }
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  /* ---------- pointer input ---------- */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; ang: number; size: number; rot: number } | null>(null);
  const dragRuler = useRef<number>(-1);

  const toImage = (e: { clientX: number; clientY: number }) => {
    const cv = view.current!, r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * cv.width, y: ((e.clientY - r.top) / r.height) * cv.height };
  };
  const paint = (x: number, y: number) => {
    const s = S.current; if (!s.mask) return;
    const g = s.mask.getContext("2d")!;
    const scale = s.base!.width / view.current!.getBoundingClientRect().width;
    g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, s.brush * scale, 0, Math.PI * 2); g.fill();
  };

  const onDown = (e: React.PointerEvent) => {
    engaged.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = toImage(e);
    pointers.current.set(e.pointerId, p);
    const s = S.current;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { dist: Math.hypot(b.x - a.x, b.y - a.y), ang: Math.atan2(b.y - a.y, b.x - a.x), size: s.opts.sizeCm, rot: s.opts.rot };
      return;
    }
    if (s.tool === "ruler") {
      const cv = view.current!;
      const pts = [[s.ruler[0] * cv.width, s.ruler[1] * cv.height], [s.ruler[2] * cv.width, s.ruler[3] * cv.height]];
      dragRuler.current = Math.hypot(pts[0][0] - p.x, pts[0][1] - p.y) < Math.hypot(pts[1][0] - p.x, pts[1][1] - p.y) ? 0 : 1;
    } else if (s.tool === "erase") { paint(p.x, p.y); render(); }
    else if (!onDesign(p.x, p.y) && zvRef.current.s > 1) panView.current = { x: e.clientX, y: e.clientY, vx: zvRef.current.x, vy: zvRef.current.y };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId)!;
    const p = toImage(e);
    pointers.current.set(e.pointerId, p);
    const s = S.current, cv = view.current!;
    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      const g = gesture.current;
      setOpts((o) => ({ ...o, sizeCm: clamp(+(g.size * (d / g.dist)).toFixed(1), 1, 80), rot: Math.round(wrapDeg(g.rot + ((ang - g.ang) * 180) / Math.PI)) }));
      return;
    }
    if (s.tool === "ruler" && dragRuler.current >= 0) {
      const i = dragRuler.current * 2;
      s.ruler[i] = clamp(p.x / cv.width, 0, 1); s.ruler[i + 1] = clamp(p.y / cv.height, 0, 1);
      render();
    } else if (s.tool === "erase") { paint(p.x, p.y); render(); }
    else if (panView.current) { const pv = panView.current; setZv((v) => ({ ...v, x: pv.vx + e.clientX - pv.x, y: pv.vy + e.clientY - pv.y })); }
    else { s.cx = clamp(s.cx + p.x - prev.x, 0, cv.width); s.cy = clamp(s.cy + p.y - prev.y, 0, cv.height); render(); tick((n) => n + 1); }
  };
  const onUp = (e: React.PointerEvent) => { pointers.current.delete(e.pointerId); if (pointers.current.size < 2) gesture.current = null; dragRuler.current = -1; panView.current = null; };
  // arrow keys nudge the design; +/- resize; [ ] rotate
  const onKey = (e: React.KeyboardEvent) => {
    const s2 = S.current, step = e.shiftKey ? 10 : 2;
    const mv: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (mv[e.key]) { e.preventDefault(); s2.cx += mv[e.key][0]; s2.cy += mv[e.key][1]; render(); tick((n) => n + 1); }
    else if (e.key === "+" || e.key === "=") setOpts((o) => ({ ...o, sizeCm: clamp(+(o.sizeCm * 1.04).toFixed(1), 1, 80) }));
    else if (e.key === "-") setOpts((o) => ({ ...o, sizeCm: clamp(+(o.sizeCm / 1.04).toFixed(1), 1, 80) }));
    else if (e.key === "]") setOpts((o) => ({ ...o, rot: Math.round(wrapDeg(o.rot + 2)) }));
    else if (e.key === "[") setOpts((o) => ({ ...o, rot: Math.round(wrapDeg(o.rot - 2)) }));
  };

  const applyRuler = () => {
    const s = S.current, cv = view.current!;
    const len = Math.hypot((s.ruler[2] - s.ruler[0]) * cv.width, (s.ruler[3] - s.ruler[1]) * cv.height);
    if (len > 10 && rulerCm > 0) s.pxPerCm = len / rulerCm;
    setTool("move");
  };
  const clearMask = () => { const m = S.current.mask; m?.getContext("2d")!.clearRect(0, 0, m.width, m.height); render(); };
  const save = () => {
    const cv = view.current; if (!cv) return;
    downloadDataUrl(cv.toDataURL("image/png"), "lumink-tattoo.png");
  };

  const set = (o: Partial<Opts>) => setOpts((p) => ({ ...p, ...o }));
  const fileBtn = (label: string, onFile: (f: File) => void, opt?: { capture?: boolean; primary?: boolean }) => (
    <label className={`lx-btn relative !min-h-11 min-w-[140px] flex-1 cursor-pointer !px-3 text-sm ${opt?.primary ? "lx-btn-primary" : "lx-btn-ghost"}`}>
      {label}
      <input type="file" accept="image/*" {...(opt?.capture ? { capture: "environment" } : {})} className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </label>
  );
  const parts: string[] = t.sx_parts;

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="min-w-0 flex-[999_1_560px]">

        {tab === "body" && (
          <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
            {PARTS.map((p, i) => (
              <button key={p} type="button" aria-pressed={part === p} onClick={() => pickPart(p)} className={`min-h-10 flex-none border px-4 text-sm ${part === p ? "border-lilac bg-lilac font-semibold text-night" : "border-[rgba(255,255,255,.14)] text-mist hover:text-ivory"}`}>{parts[i]}</button>
            ))}
          </div>
        )}
        <div className="relative overflow-hidden rounded-[18px] border border-[rgba(255,255,255,.08)]" style={{ background: STAGE_BG }}>
          <div ref={stage} className="relative flex h-[68vh] min-h-[440px] items-center justify-center overflow-hidden" tabIndex={0} onKeyDown={onKey} aria-label={t.sim_title}>
            <div className="relative flex-none" style={{ width: fit.w, height: fit.h, transform: `translate(${zv.x}px, ${zv.y}px) scale(${zv.s})`, transition: panView.current ? "none" : "transform .08s ease-out" }}>
              <canvas
                ref={view}
                aria-label={t.sim_title}
                className={`absolute inset-0 h-full w-full touch-none ${tool === "erase" ? "cursor-crosshair" : tool === "ruler" ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                onContextMenu={(e) => e.preventDefault()}
              />
              <canvas ref={overlay} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
              {tool === "move" && !compare && (() => {
                const b = designBox(); if (!b || !fit.w) return null;
                const f = fit.w / dims.w, inv = 1 / zv.s;
                const hs = 30 * inv;
                return (
                  <div className="pointer-events-none absolute left-0 top-0" style={{ width: b.hw * 2 * f, height: b.hh * 2 * f, transform: `translate(${b.cx * f}px, ${b.cy * f}px) translate(-50%, -50%) rotate(${b.rot}rad)` }}>
                    <span onPointerDown={handleDrag("scale")} title={t.m_size} className="pointer-events-auto absolute flex cursor-nwse-resize items-center justify-center rounded-full border-2 border-night bg-lilac touch-none" style={{ width: hs, height: hs, right: -hs / 2, bottom: -hs / 2 }}>
                      <svg width={14 * inv} height={14 * inv} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17 17 7M10 7h7v7M7 10v7h7" stroke="#0a0b09" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                    <span onPointerDown={handleDrag("rotate")} title={t.m_rot} className="pointer-events-auto absolute left-1/2 flex cursor-grab items-center justify-center rounded-full border-2 border-night bg-ivory touch-none" style={{ width: hs, height: hs, top: -hs * 1.6, marginLeft: -hs / 2 }}>
                      <svg width={14 * inv} height={14 * inv} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 12a8 8 0 1 1-3-6.2M20 4v5h-5" stroke="#0a0b09" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                    <span className="absolute left-1/2 w-px bg-ivory" style={{ top: -hs * 0.6, height: hs * 0.6 }} />
                  </div>
                );
              })()}
            </div>
            <div className="absolute end-3 top-3 flex gap-1 bg-[rgba(10,11,9,.8)] p-1">
              <button type="button" onClick={() => zoomView(1 / 1.3)} aria-label="−" className="h-9 w-9 text-ivory">−</button>
              <button type="button" onClick={() => setZv({ s: 1, x: 0, y: 0 })} className="h-9 min-w-12 px-2 text-[12px] text-ivory">{Math.round(zv.s * 100)}%</button>
              <button type="button" onClick={() => zoomView(1.3)} aria-label="+" className="h-9 w-9 text-ivory">+</button>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 p-3">
            <span className="bg-[rgba(10,11,9,.75)] px-3 py-1.5 text-[12px] text-mist">{t.sx_hint}</span>
            <button
              type="button"
              onPointerDown={() => setCompare(true)} onPointerUp={() => setCompare(false)} onPointerLeave={() => setCompare(false)}
              onKeyDown={(e) => e.key === " " && setCompare(true)} onKeyUp={() => setCompare(false)}
              className="pointer-events-auto min-h-10 border border-[rgba(255,255,255,.18)] bg-[rgba(10,11,9,.8)] px-4 text-[13px] text-ivory hover:border-lilac"
            >{t.sx_compare}</button>
          </div>
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-[rgba(10,11,9,.5)]">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-lilac border-t-transparent" />
            </div>
          )}
          {error && <p role="alert" className="absolute inset-x-4 top-4 m-0 bg-[rgba(240,149,149,.15)] px-4 py-3 text-sm text-[#ffc9cc]">{error}</p>}
          {tool === "ruler" && (
            <div className="absolute inset-x-3 top-3 flex flex-wrap items-end gap-3 bg-[rgba(10,11,9,.9)] p-4">
              <p className="m-0 min-w-[200px] flex-1 text-[13px] leading-relaxed text-mist">{t.sx_scale_hint}</p>
              <label className="flex flex-col gap-1 text-[12px] text-ash">{t.sx_scale_cm}
                <input type="number" min={1} max={200} step={0.5} value={rulerCm} onChange={(e) => setRulerCm(+e.target.value)} className="lx-input !min-h-10 w-24" />
              </label>
              <button type="button" onClick={applyRuler} className="lx-btn lx-btn-primary !min-h-10">{t.sx_done}</button>
            </div>
          )}
        </div>
      </div>

      <aside className="lx-surface-strong flex min-w-0 flex-[1_1_300px] flex-col gap-6 p-5">
        {tab === "photo" ? (
          <section className="flex flex-col gap-2.5">
            <p className="m-0 text-[13px] font-semibold text-lilac">{t.sim_step1}</p>
            <div className="flex flex-wrap gap-2">
              {fileBtn(t.sim_take, async (f) => loadPhoto(await fileToDataUrl(f)), { capture: true, primary: true })}
              {fileBtn(t.sim_upload, async (f) => loadPhoto(await fileToDataUrl(f)))}
            </div>
            <div className="flex gap-4 text-[13px]">
              <button type="button" onClick={() => loadPhoto(SAMPLE.src, SAMPLE.pxPerCm)} className="text-mist underline underline-offset-4 hover:text-ivory">{t.sim3_sample}</button>
              <button type="button" onClick={() => setTool("ruler")} className="text-mist underline underline-offset-4 hover:text-ivory">{t.sx_scale}</button>
            </div>
            <p className="m-0 text-[12px] leading-relaxed text-ash">{t.sim3_photo_tip}</p>
          </section>
        ) : (
          <section className="flex flex-col gap-2.5">
            <p className="m-0 text-[13px] font-semibold text-lilac">{t.sx_tone}</p>
            <div className="flex gap-2">
              {SKIN_TONES.map((c) => <button key={c} type="button" aria-label={c} aria-pressed={tone === c} onClick={() => pickTone(c)} className="h-9 flex-1 border-2" style={{ background: c, borderColor: tone === c ? "#c4f135" : "transparent" }} />)}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2.5">
          <p className="m-0 text-[13px] font-semibold text-lilac">{t.sim_step2}</p>
          <div className="grid grid-cols-4 gap-1.5">
            {DESIGNS.map((d) => (
              <button key={d.id} type="button" aria-pressed={designId === d.id} onClick={() => pickDesign(d.id, d.src)} className={`flex aspect-square items-center justify-center border-2 bg-[#efece4] p-1.5 ${designId === d.id ? "border-lilac" : "border-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.src} alt={d.id} className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
          {fileBtn(t.sim_design, async (f) => {
            const img = await loadImage(await fileToDataUrl(f));
            const opaque = !hasTransparency(img);
            setDesignId("custom"); setKnock({ show: opaque, on: true }); setDesignImage(img, opaque);
          })}
          {knock.show && (
            <label className="flex min-h-9 items-center gap-2.5 text-[13px] text-mist">
              <input type="checkbox" checked={knock.on} onChange={(e) => { setKnock({ show: true, on: e.target.checked }); if (S.current.designRaw) setDesignImage(S.current.designRaw, e.target.checked); }} className="h-5 w-5 accent-[#c4f135]" />
              {t.sx_bg}
            </label>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <p className="m-0 text-[13px] font-semibold text-lilac">{t.sim_step3}</p>
          <div className="grid grid-cols-3 border border-[rgba(255,255,255,.12)]">
            {(["move", "erase"] as Tool[]).map((k) => (
              <button key={k} type="button" aria-pressed={tool === k} onClick={() => setTool(k)} className={`min-h-10 text-[13px] ${tool === k ? "bg-ivory font-semibold text-night" : "text-mist"}`}>{k === "move" ? t.sx_move : t.sx_erase}</button>
            ))}
            <button type="button" onClick={() => set({ flip: !opts.flip })} aria-pressed={opts.flip} className={`min-h-10 text-[13px] ${opts.flip ? "bg-ivory font-semibold text-night" : "text-mist"}`}>{t.sim_flip}</button>
          </div>
          {tool === "erase" && (
            <div className="flex flex-col gap-2">
              <Range label={t.sx_brush} value={brush} min={6} max={70} unit="" onChange={setBrush} />
              <button type="button" onClick={clearMask} className="self-start text-[13px] text-mist underline underline-offset-4 hover:text-ivory">{t.sx_restore}</button>
            </div>
          )}
          <Range label={t.m_size} value={opts.sizeCm} min={1} max={60} step={0.5} unit=" cm" onChange={(n) => set({ sizeCm: n })} />
          <Range label={t.m_rot} value={opts.rot} min={-180} max={180} unit="°" onChange={(n) => set({ rot: n })} />
          <Range label={t.sx_bend} value={Math.round(opts.bend * 100)} min={0} max={100} unit="%" onChange={(n) => set({ bend: n / 100 })} />
          <Range label={t.m_depth} value={Math.round(opts.opacity * 100)} min={30} max={100} unit="%" onChange={(n) => set({ opacity: n / 100 })} />
          <div className="grid grid-cols-2 border border-[rgba(255,255,255,.12)]">
            {(["original", "black"] as InkMode[]).map((k) => (
              <button key={k} type="button" aria-pressed={opts.ink === k} onClick={() => set({ ink: k })} className={`min-h-10 text-[13px] ${opts.ink === k ? "bg-ivory font-semibold text-night" : "text-mist"}`}>{k === "original" ? t.sx_ink_orig : t.sx_ink_black}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 border border-[rgba(255,255,255,.12)]">
            {[false, true].map((h) => (
              <button key={String(h)} type="button" aria-pressed={opts.healed === h} onClick={() => set({ healed: h })} className={`min-h-10 text-[13px] ${opts.healed === h ? "bg-ivory font-semibold text-night" : "text-mist"}`}>{h ? t.m_healed : t.m_fresh}</button>
            ))}
          </div>
        </section>

        <button type="button" onClick={save} className="lx-btn lx-btn-primary">{t.sim_save}</button>
      </aside>
    </div>
  );
}

function Range({ label, value, min, max, unit, onChange, step = 1 }: { label: string; value: number; min: number; max: number; unit: string; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="flex flex-col gap-2 text-[13px] text-ash">
      <span className="flex justify-between"><span>{label}</span><span className="text-ivory" dir="ltr">{value}{unit}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const wrapDeg = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
