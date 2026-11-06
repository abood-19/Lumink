"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { downloadDataUrl, fileToDataUrl, loadImage } from "@/lib/store";
import { ColorPicker } from "./ColorPicker";
import { HANDOFF_KEY } from "./Simulator2D";
import type { BodyStudio as Engine, BrushKind, Gender, LayerName, RegionName } from "@/lib/three/bodyPaint";

/* eslint-disable @next/next/no-img-element */

type Tool = "move" | BrushKind | "design";
const REGIONS: RegionName[] = ["arm_l", "arm_r", "hand_l", "hand_r", "front", "back", "neck", "head", "leg_l", "leg_r", "foot_l", "foot_r"];
const SKINS = ["#ecebe7", "#f1cdb4", "#e2b08f", "#c98d66", "#a06a46", "#74472d", "#4a2c1d"];
const INKS = ["#111111", "#3a3a3a", "#8a8a8a", "#a3261c", "#e2572b", "#f2c434", "#2f5a2a", "#1e9c8c", "#1f3a5f", "#5b3fa8", "#d46a9f", "#f4f1ea"];
const DESIGNS = ["/designs/tribal.png", "/designs/oni.png", "/designs/mandala.png", "/designs/geometry.png", "/designs/lettering.png", "/designs/band.png", "/designs/spine.png", "/designs/mask.png"];
const TOOL_ICON: Record<Tool, string> = {
  move: "M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3",
  liner: "M4 20 18 6l2 2L6 22H4ZM15 9l2 2",
  sketch: "M3 21l3-1 12-12-2-2L4 18ZM14 6l2 2M3 21h18",
  shade: "M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11Z",
  dots: "M6 6h.01M12 6h.01M18 6h.01M9 12h.01M15 12h.01M6 18h.01M12 18h.01M18 18h.01",
  eraser: "M8 20h12M5 15l9-9 5 5-9 9H8ZM10 10l5 5",
  tint: "M5 11l7-7 7 7-7 7ZM19 15c0 2 1.5 3 1.5 4.5a1.5 1.5 0 0 1-3 0C17.5 18 19 17 19 15ZM3 21h11",
  design: "M4 4h16v16H4ZM4 15l5-5 4 4 3-3 4 4",
};

type Place = { x: number; y: number; wCm: number; rot: number; src: string; ratio: number; black: boolean };

export function BodyStudio() {
  const { t } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const eng = useRef<Engine | null>(null);
  const [ready, setReady] = useState(false);
  const [fail, setFail] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tool, setTool] = useState<Tool>("move");
  const [sizeMm, setSizeMm] = useState(1.2);
  const [opacity, setOpacity] = useState(100);
  const [color, setColor] = useState("#111111");
  const [sketchColor, setSketchColor] = useState("#e0412b");
  const [eraseLayer, setEraseLayer] = useState<LayerName>("ink");
  const [show, setShow] = useState({ sketch: true, ink: true });
  const [skin, setSkin] = useState(SKINS[0]);
  const [mirror, setMirror] = useState(false);
  const [region, setRegion] = useState<RegionName | null>(null);
  const [, bump] = useState(0);
  const [panel, setPanel] = useState<"brush" | "layers" | "skin">("brush");
  const [place, setPlace] = useState<Place | null>(null);
  const [cssPxPerCm, setCssPxPerCm] = useState(10);
  const [stencil, setStencil] = useState<{ url: string; w: number; h: number; mirrored: boolean } | null>(null);
  const [hint, setHint] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [swapping, setSwapping] = useState(false);
  const [locked, setLocked] = useState(false);
  const engaged = useRef(false);
  const lockedRef = useRef(false);
  lockedRef.current = locked;

  // live values for the pointer handlers
  const live = useRef({ tool, sizeMm, opacity, color, sketchColor, eraseLayer });
  live.current = { tool, sizeMm, opacity, color, sketchColor, eraseLayer };

  useEffect(() => {
    let disposed = false;
    setFail(false);
    (async () => {
      try {
        const { BodyStudio: E } = await import("@/lib/three/bodyPaint");
        if (disposed || !host.current) return;
        const e = new E(host.current, { onRegion: setRegion, onChange: () => bump((n) => n + 1), onScale: setCssPxPerCm });
        eng.current = e;
        if (location.search.includes("lxrender")) (window as unknown as { __lxStudio?: unknown }).__lxStudio = e;
        await e.load();
        if (disposed) return;
        e.setSkin(SKINS[0], true);
        setReady(true);
        let handed: string | null = null;
        try { handed = sessionStorage.getItem(HANDOFF_KEY); sessionStorage.removeItem(HANDOFF_KEY); } catch {}
        if (handed) startPlace(handed);
      } catch (err) { console.error(err); setFail(true); }
    })();
    return () => { disposed = true; eng.current?.dispose(); eng.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  useEffect(() => { eng.current?.setNavigate(tool === "move" || tool === "design"); }, [tool, ready]);
  useEffect(() => { eng.current?.setLocked(locked); }, [locked, ready]);

  // The page keeps scrolling with the mouse wheel / trackpad until you click into the 3D view;
  // after that the wheel zooms. A trackpad pinch (ctrl+wheel) always zooms.
  useEffect(() => {
    const h = host.current; if (!h) return;
    const wheel = (ev: WheelEvent) => { const e = eng.current; if (e) e.controls.enableZoom = engaged.current || ev.ctrlKey; };
    const leave = () => { engaged.current = false; };
    h.addEventListener("wheel", wheel, { capture: true, passive: true });
    h.addEventListener("pointerleave", leave);
    return () => { h.removeEventListener("wheel", wheel, { capture: true }); h.removeEventListener("pointerleave", leave); };
  }, [ready]);
  useEffect(() => { if (eng.current) eng.current.mirror = mirror; }, [mirror]);

  /* ---------- drawing ---------- */
  const st = useRef({
    pointers: new Map<number, { x: number; y: number; t: number; type: string }>(),
    penSeen: false,
    pending: null as null | { id: number; x: number; y: number; t: number; pressure: number },
    drawing: false,
    last: null as null | { x: number; y: number; p: number },
    smooth: null as null | { x: number; y: number },
    radius: 4,
    raf: 0,
    tap: null as null | { x: number; y: number; t: number },
    lastTap: 0,
    lastProbe: null as null | { x: number; y: number },
  });

  const brushLayer = (tl: Tool): LayerName => (tl === "sketch" ? "sketch" : tl === "eraser" ? live.current.eraseLayer : "ink");

  const touchAround = (cx: number, cy: number, r: number) => {
    const e = eng.current!, dpr = e.strokeScale, s = st.current;
    // ray tests are the expensive part: only when the brush has moved a radius or more
    if (s.lastProbe && Math.hypot(cx - s.lastProbe.x, cy - s.lastProbe.y) < Math.max(6, r / dpr)) return;
    s.lastProbe = { x: cx, y: cy };
    const rect = e.canvas.getBoundingClientRect();
    const pts = [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]];
    for (const [dx, dy] of pts) {
      const h = e.pick(rect.left + cx + dx / dpr, rect.top + cy + dy / dpr);
      if (h) { e.touch(h.region); if (e.mirror) e.touchMirror(h.region); }
    }
  };

  const schedule = () => {
    const s = st.current;
    if (s.raf) return;
    s.raf = requestAnimationFrame(() => { s.raf = 0; eng.current?.update(); });
  };

  const dab = (x: number, y: number, p: number) => {
    const e = eng.current!, s = st.current, ctx = e.strokeContext, L = live.current;
    const dpr = e.strokeScale;
    const bx = x * dpr, by = y * dpr;
    // light smoothing so hand jitter doesn't show
    const sm = s.smooth ? { x: s.smooth.x + (bx - s.smooth.x) * 0.55, y: s.smooth.y + (by - s.smooth.y) * 0.55 } : { x: bx, y: by };
    const prev = s.last ?? { x: sm.x, y: sm.y, p };
    const r = s.radius;
    const kind = L.tool as BrushKind;
    const col = kind === "sketch" ? L.sketchColor : kind === "eraser" || kind === "tint" ? "#000" : L.color;
    ctx.globalCompositeOperation = "source-over";
    if (kind === "liner" || kind === "sketch" || kind === "eraser" || kind === "tint") {
      const w = Math.max(0.6, 2 * r * (kind === "eraser" || kind === "tint" ? 1 : 0.3 + 0.7 * p));
      ctx.strokeStyle = col; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = w;
      ctx.globalAlpha = kind === "sketch" ? 0.9 : 1;
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(sm.x, sm.y); ctx.stroke();
    } else {
      const d = Math.hypot(sm.x - prev.x, sm.y - prev.y);
      const step = Math.max(1, r * (kind === "shade" ? 0.25 : 0.7));
      const n = Math.max(1, Math.ceil(d / step));
      for (let i = 1; i <= n; i++) {
        const px = prev.x + ((sm.x - prev.x) * i) / n, py = prev.y + ((sm.y - prev.y) * i) / n;
        if (kind === "shade") {
          const g = ctx.createRadialGradient(px, py, 0, px, py, r);
          g.addColorStop(0, col); g.addColorStop(1, col + "00");
          ctx.globalAlpha = 0.07 * (0.4 + 0.6 * p);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.globalAlpha = 1; ctx.fillStyle = col;
          const dots = Math.max(1, Math.round(3 * p));
          const dotR = Math.max(0.7, (cssPxPerCmRef.current * dpr) * 0.012);
          for (let k = 0; k < dots; k++) {
            const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * r;
            ctx.beginPath(); ctx.arc(px + Math.cos(a) * rr, py + Math.sin(a) * rr, dotR, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    }
    ctx.globalAlpha = 1;
    s.smooth = sm; s.last = { x: sm.x, y: sm.y, p };
    touchAround(x, y, r);
    schedule();
  };
  const cssPxPerCmRef = useRef(cssPxPerCm);
  cssPxPerCmRef.current = cssPxPerCm;

  const startStroke = (x: number, y: number, p: number) => {
    const e = eng.current; if (!e) return false;
    const rect = e.canvas.getBoundingClientRect();
    const h = e.pick(rect.left + x, rect.top + y);
    // a stroke may start off the body and run onto it; size it at the focus depth then
    const L = live.current, kind = L.tool as BrushKind;
    const pxPerCm = e.pxPerCmAt(h ? h.distance : e.camera.position.distanceTo(e.controls.target));
    const s = st.current;
    // supersample when zoomed out so thin lines keep ~100 px/cm in the texture
    const ss = Math.min(3, Math.max(1, 100 / (pxPerCm || 1)));
    e.begin(brushLayer(kind), kind, kind === "eraser" ? 1 : L.opacity / 100, ss, L.color);
    s.radius = Math.max(0.6, ((L.sizeMm / 10) * pxPerCm * e.strokeScale / e.bufferScale) / 2) * (kind === "shade" ? 3 : kind === "dots" ? 2.5 : kind === "tint" ? 4 : 1);
    s.drawing = true; s.last = null; s.smooth = null; s.lastProbe = null;
    dab(x, y, p);
    return true;
  };
  const endStroke = () => {
    const s = st.current; if (!s.drawing) return;
    s.drawing = false;
    cancelAnimationFrame(s.raf); s.raf = 0;
    eng.current?.update();
    eng.current?.end();
  };

  const local = (ev: { clientX: number; clientY: number }) => {
    const r = host.current!.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  };
  const pressureOf = (ev: PointerEvent | React.PointerEvent) => (ev.pointerType === "pen" ? Math.max(0.05, ev.pressure || 0.5) : 1);

  const onDown = (ev: React.PointerEvent) => {
    const s = st.current, L = live.current;
    engaged.current = true;
    const p = local(ev);
    s.pointers.set(ev.pointerId, { ...p, t: performance.now(), type: ev.pointerType });
    if (ev.pointerType === "pen") s.penSeen = true;
    if (s.pointers.size > 1) {
      // second finger: this is a camera gesture, not a stroke
      if (s.drawing) { s.drawing = false; eng.current?.cancel(); }
      s.pending = null; s.tap = null;
      return;
    }
    s.tap = { ...p, t: performance.now() };
    const drawTool = L.tool !== "move" && L.tool !== "design";
    if (!drawTool || ev.button !== 0) return;
    if (ev.pointerType === "touch" && s.penSeen) return; // palm rejection when a pen is in use
    if (ev.pointerType === "touch") { s.pending = { id: ev.pointerId, ...p, t: performance.now(), pressure: 1 }; return; }
    if (startStroke(p.x, p.y, pressureOf(ev))) (ev.target as Element).setPointerCapture?.(ev.pointerId);
  };
  const onMove = (ev: React.PointerEvent) => {
    const s = st.current;
    if (!s.pointers.has(ev.pointerId)) return;
    const p = local(ev);
    s.pointers.set(ev.pointerId, { ...p, t: performance.now(), type: ev.pointerType });
    if (s.pending && s.pending.id === ev.pointerId && s.pointers.size === 1) {
      if (Math.hypot(p.x - s.pending.x, p.y - s.pending.y) > 4 || performance.now() - s.pending.t > 90) {
        const pd = s.pending; s.pending = null;
        if (startStroke(pd.x, pd.y, 1)) dab(p.x, p.y, 1);
      }
      return;
    }
    if (!s.drawing) return;
    const evs = (ev.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [ev.nativeEvent];
    for (const ce of evs) { const q = local(ce); dab(q.x, q.y, pressureOf(ce)); }
  };
  const onUp = (ev: React.PointerEvent) => {
    const s = st.current;
    const p = local(ev);
    s.pointers.delete(ev.pointerId);
    if (s.pending && s.pending.id === ev.pointerId) {
      // a quick tap with a brush still leaves a dot
      const pd = s.pending; s.pending = null;
      if (startStroke(pd.x, pd.y, 1)) endStroke();
      return;
    }
    if (s.drawing) { endStroke(); return; }
    // taps: move tool focuses the region; double-tap focuses in any tool
    if (s.tap && Math.hypot(p.x - s.tap.x, p.y - s.tap.y) < 6 && performance.now() - s.tap.t < 320) {
      const now = performance.now();
      const dbl = now - s.lastTap < 320;
      s.lastTap = now;
      if (!lockedRef.current && (live.current.tool === "move" || dbl)) {
        const e = eng.current; if (!e) return;
        const rect = e.canvas.getBoundingClientRect();
        const h = e.pick(rect.left + p.x, rect.top + p.y);
        if (h) e.focusRegion(h.region.name);
      }
    }
    s.tap = null;
  };

  /* ---------- design placement ---------- */
  const startPlace = useCallback(async (src: string) => {
    const img = await loadImage(src).catch(() => null);
    if (!img || !host.current) return;
    const r = host.current.getBoundingClientRect();
    setPlace({ x: r.width / 2, y: r.height / 2, wCm: 8, rot: 0, src, ratio: img.height / img.width, black: false });
    setTool("design");
  }, []);

  const placeScale = useCallback(() => {
    // px per cm where the design sits
    const e = eng.current; if (!e || !place || !host.current) return cssPxPerCm;
    const rect = e.canvas.getBoundingClientRect();
    const h = e.pick(rect.left + place.x, rect.top + place.y);
    return h ? e.pxPerCmAt(h.distance) / e.bufferScale : cssPxPerCm;
  }, [place, cssPxPerCm]);
  const pxCm = place ? placeScale() : cssPxPerCm;

  const applyPlace = async () => {
    const e = eng.current; if (!e || !place) return;
    const img = await loadImage(place.src);
    // render the design into the projection at ~120 px/cm so it stays crisp on the skin and in the stencil
    e.begin("ink", "liner", 1, Math.min(6, Math.max(1, 120 / (pxCm * e.bufferScale))));
    const dpr = e.strokeScale;
    const w = place.wCm * pxCm * dpr, h = w * place.ratio;
    // design on its own canvas, optionally as solid black ink, light paper knocked out
    const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    const g = c.getContext("2d")!;
    g.drawImage(img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) {
      const l = 0.2126 * d.data[i] + 0.7152 * d.data[i + 1] + 0.0722 * d.data[i + 2];
      const a = (d.data[i + 3] / 255) * Math.min(1, Math.max(0, (240 - l) / 140));
      d.data[i + 3] = Math.round(a * 255);
      if (place.black) { d.data[i] = 17; d.data[i + 1] = 17; d.data[i + 2] = 17; }
    }
    g.putImageData(d, 0, 0);
    const ctx = e.strokeContext;
    ctx.save();
    ctx.translate(place.x * dpr, place.y * dpr);
    ctx.rotate((place.rot * Math.PI) / 180);
    ctx.drawImage(c, -w / 2, -h / 2, w, h);
    ctx.restore();
    // every region the design covers
    const rect = e.canvas.getBoundingClientRect();
    const cos = Math.cos((place.rot * Math.PI) / 180), sin = Math.sin((place.rot * Math.PI) / 180);
    for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) {
      const lx = (i / 6 - 0.5) * place.wCm * pxCm, ly = (j / 6 - 0.5) * place.wCm * place.ratio * pxCm;
      const hit = e.pick(rect.left + place.x + lx * cos - ly * sin, rect.top + place.y + lx * sin + ly * cos);
      if (hit) { e.touch(hit.region); if (e.mirror) e.touchMirror(hit.region); }
    }
    e.update(); e.end();
    setPlace(null); setTool("liner");
  };

  const dragPlace = (mode: "move" | "scale") => (ev: React.PointerEvent) => {
    if (!place) return;
    ev.stopPropagation();
    (ev.target as Element).setPointerCapture(ev.pointerId);
    const start = local(ev), p0 = { ...place };
    const move = (e2: PointerEvent) => {
      const q = local(e2);
      if (mode === "move") setPlace((p) => p && { ...p, x: p0.x + q.x - start.x, y: p0.y + q.y - start.y });
      else {
        const v0 = Math.hypot(start.x - p0.x, start.y - p0.y), v1 = Math.hypot(q.x - p0.x, q.y - p0.y);
        const a0 = Math.atan2(start.y - p0.y, start.x - p0.x), a1 = Math.atan2(q.y - p0.y, q.x - p0.x);
        setPlace((p) => p && { ...p, wCm: Math.min(60, Math.max(1, +(p0.wCm * (v1 / Math.max(1, v0))).toFixed(1))), rot: Math.round(p0.rot + ((a1 - a0) * 180) / Math.PI) });
      }
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  /* ---------- outputs ---------- */
  const makeStencil = () => {
    const e = eng.current; if (!e) return;
    const out = e.stencil(300);
    if (!out) { setHint(t.bs_no_ink); setTimeout(() => setHint(""), 2500); return; }
    setStencil({ url: out.url, w: out.widthCm, h: out.heightCm, mirrored: false });
  };
  const mirrorStencil = async () => {
    if (!stencil) return;
    const img = await loadImage(stencil.url);
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const g = c.getContext("2d")!; g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(img, 0, 0);
    setStencil({ ...stencil, url: c.toDataURL("image/png"), mirrored: !stencil.mirrored });
  };
  const printStencil = () => {
    if (!stencil) return;
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<!doctype html><title>LUMINK stencil</title><style>@page{margin:10mm}body{margin:0}img{width:${stencil.w.toFixed(2)}cm;height:${stencil.h.toFixed(2)}cm;display:block}</style><img src="${stencil.url}" onload="setTimeout(()=>print(),200)">`);
    w.document.close();
  };

  // each body keeps its own tattoo; switching back brings it back exactly as it was
  const pickGender = async (g: Gender) => {
    const e = eng.current; if (!e || g === gender) return;
    setSwapping(true);
    try { await e.load(g); setGender(g); } finally { setSwapping(false); }
  };
  const removeTattoo = () => {
    const e = eng.current; if (!e || !e.hasInk()) return;
    if (!window.confirm(t.bs_remove_confirm)) return;
    e.clearLayer("ink"); e.clearLayer("sketch");
  };
  const pickSkin = (c: string) => { setSkin(c); eng.current?.setSkin(c, c === SKINS[0]); };
  const toggleLayer = (l: LayerName) => { const v = !show[l]; setShow({ ...show, [l]: v }); eng.current?.setLayerVisible(l, v); };

  const tools: [Tool, string][] = [["move", t.bs_move], ["liner", t.bs_liner], ["sketch", t.bs_sketch], ["shade", t.bs_shade], ["dots", t.bs_dots], ["tint", t.bs_tint], ["eraser", t.bs_eraser], ["design", t.bs_design]];
  const regionNames: string[] = t.bs_regions;
  const e = eng.current;

  return (
    <div className="flex flex-col gap-3">
      {/* body + regions */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        <div className="flex flex-none border border-[rgba(255,255,255,.14)]" role="group" aria-label={t.bs_body}>
          {(["female", "male"] as Gender[]).map((g) => (
            <button key={g} type="button" aria-pressed={gender === g} disabled={swapping} onClick={() => pickGender(g)} className={`min-h-10 px-3.5 text-[13px] ${gender === g ? "bg-ivory font-semibold text-night" : "text-mist hover:text-ivory"}`}>{g === "female" ? t.bs_body_f : t.bs_body_m}</button>
          ))}
        </div>
        <button type="button" onClick={() => e?.frameAll()} aria-pressed={region === null} className={`min-h-10 flex-none border px-3.5 text-[13px] ${region === null ? "border-lilac bg-lilac font-semibold text-night" : "border-[rgba(255,255,255,.14)] text-mist hover:text-ivory"}`}>{t.bs_full}</button>
        {REGIONS.map((r, i) => (
          <button key={r} type="button" onClick={() => e?.focusRegion(r)} aria-pressed={region === r} className={`min-h-10 flex-none border px-3.5 text-[13px] ${region === r ? "border-lilac bg-lilac font-semibold text-night" : "border-[rgba(255,255,255,.14)] text-mist hover:text-ivory"}`}>{regionNames[i]}</button>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        {/* stage */}
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-[16px] border border-[rgba(255,255,255,.08)]" style={{ background: "radial-gradient(120% 90% at 50% 18%, #2b2c27 0%, #121310 55%, #0a0b09 100%)" }}>
          <div
            ref={host}
            className={`relative h-[68vh] min-h-[460px] w-full select-none ${tool === "move" || tool === "design" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"}`}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            onContextMenu={(ev) => ev.preventDefault()}
          >
            {place && (
              <div
                className="absolute left-0 top-0 touch-none"
                style={{ width: place.wCm * pxCm, height: place.wCm * pxCm * place.ratio, transform: `translate(${place.x}px, ${place.y}px) translate(-50%, -50%) rotate(${place.rot}deg)` }}
                onPointerDown={dragPlace("move")}
              >
                <img src={place.src} alt="" draggable={false} className="pointer-events-none h-full w-full select-none" style={{ mixBlendMode: "multiply", opacity: 0.92, filter: place.black ? "grayscale(1) contrast(2) brightness(.4)" : undefined }} />
                <span className="pointer-events-none absolute inset-0 border border-dashed border-lilac" />
                <span onPointerDown={dragPlace("scale")} className="absolute -bottom-3 -end-3 h-7 w-7 cursor-nwse-resize rounded-full border-2 border-night bg-lilac" aria-label={t.m_size} />
              </div>
            )}
          </div>

          {/* tool rail */}
          <div className="absolute start-3 top-3 flex flex-col gap-1 bg-[rgba(10,11,9,.82)] p-1" role="toolbar" aria-label={t.bs_tools}>
            {tools.map(([k, label]) => (
              <button key={k} type="button" title={label} aria-label={label} aria-pressed={tool === k} onClick={() => (k === "design" && !place ? startPlace(DESIGNS[0]) : setTool(k))} className={`flex h-11 w-11 items-center justify-center ${tool === k ? "bg-lilac text-night" : "text-mist hover:text-ivory"}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={TOOL_ICON[k]} stroke="currentColor" strokeWidth={k === "dots" ? 3 : 1.6} strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            ))}
          </div>

          {/* top-right quick actions */}
          <div className="absolute end-3 top-3 flex gap-1 bg-[rgba(10,11,9,.82)] p-1">
            <button type="button" title={t.col_undo} aria-label={t.col_undo} disabled={!e?.canUndo()} onClick={() => e?.undoStep()} className="flex h-10 w-10 items-center justify-center text-ivory disabled:opacity-30"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
            <button type="button" title={t.col_redo} aria-label={t.col_redo} disabled={!e?.canRedo()} onClick={() => e?.redoStep()} className="flex h-10 w-10 items-center justify-center text-ivory disabled:opacity-30"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
            <button type="button" title={locked ? t.bs_unlock : t.bs_lock} aria-label={locked ? t.bs_unlock : t.bs_lock} aria-pressed={locked} onClick={() => setLocked((v) => !v)} className={`flex h-10 w-10 items-center justify-center ${locked ? "bg-lilac text-night" : "text-ivory"}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d={locked ? "M8 11V8a4 4 0 0 1 8 0v3" : "M8 11V8a4 4 0 0 1 7.5-2"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button>
            <button type="button" title={t.bs_mirror} aria-label={t.bs_mirror} aria-pressed={mirror} onClick={() => setMirror((m) => !m)} className={`flex h-10 w-10 items-center justify-center ${mirror ? "bg-lilac text-night" : "text-ivory"}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v18M9 7 4 12l5 5ZM15 7l5 5-5 5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg></button>
          </div>

          <p className="pointer-events-none absolute inset-x-0 bottom-0 m-0 bg-[rgba(10,11,9,.7)] px-3 py-2 text-center text-[12px] text-mist">{hint || (locked ? t.bs_hint_locked : tool === "move" ? t.bs_hint_move : tool === "design" ? t.bs_hint_design : tool === "tint" ? t.bs_hint_tint : t.bs_hint_draw)}</p>

          {(!ready || swapping) && !fail && <div className="absolute inset-0 flex items-center justify-center"><span className="h-7 w-7 animate-spin rounded-full border-2 border-lilac border-t-transparent" /></div>}
          {fail && (
            <div role="alert" className="absolute inset-x-4 top-1/2 m-0 flex -translate-y-1/2 flex-col items-center gap-3 rounded-[10px] border border-line bg-[rgba(10,11,9,.92)] px-4 py-5 text-center text-sm text-ivory">
              <p className="m-0">{t.bs_fail}</p>
              <button type="button" onClick={() => setAttempt((n) => n + 1)} className="lx-btn lx-btn-primary !min-h-[40px] !px-5 text-sm">{t.bs_retry}</button>
            </div>
          )}
        </div>

        {/* side panel */}
        <aside className="lx-surface-strong flex w-full flex-col gap-5 p-5 lg:w-[320px]">
          {place ? (
            <section className="flex flex-col gap-4">
              <p className="m-0 text-[13px] font-semibold text-lilac">{t.bs_design}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {DESIGNS.map((d) => (
                  <button key={d} type="button" aria-pressed={place.src === d} onClick={() => startPlace(d).then(() => undefined)} className={`aspect-square border-2 bg-[#efece4] p-1 ${place.src === d ? "border-lilac" : "border-transparent"}`}><img src={d} alt="" className="h-full w-full object-contain" /></button>
                ))}
              </div>
              <label className="lx-btn lx-btn-ghost relative !min-h-11 cursor-pointer text-sm">
                {t.sim_design}
                <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={async (ev) => { const f = ev.target.files?.[0]; ev.target.value = ""; if (f) startPlace(await fileToDataUrl(f)); }} />
              </label>
              <Range label={t.m_size} value={place.wCm} min={1} max={60} step={0.5} unit=" cm" onChange={(n) => setPlace({ ...place, wCm: n })} />
              <Range label={t.m_rot} value={place.rot} min={-180} max={180} unit="°" onChange={(n) => setPlace({ ...place, rot: n })} />
              <p className="m-0 text-[12px] text-ash" dir="ltr">{place.wCm.toFixed(1)} × {(place.wCm * place.ratio).toFixed(1)} cm</p>
              <Seg value={place.black ? 1 : 0} onChange={(i) => setPlace({ ...place, black: i === 1 })} labels={[t.sx_ink_orig, t.sx_ink_black]} />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setPlace(null); setTool("move"); }} className="lx-btn lx-btn-ghost !min-h-11">{t.bs_cancel}</button>
                <button type="button" onClick={applyPlace} className="lx-btn lx-btn-primary !min-h-11">{t.bs_apply}</button>
              </div>
            </section>
          ) : (
            <>
              <div role="tablist" className="grid grid-cols-3 border border-[rgba(255,255,255,.12)]">
                {(["brush", "layers", "skin"] as const).map((k) => (
                  <button key={k} role="tab" type="button" aria-selected={panel === k} onClick={() => setPanel(k)} className={`min-h-10 text-[13px] ${panel === k ? "bg-ivory font-semibold text-night" : "text-mist"}`}>{k === "brush" ? t.bs_tab_brush : k === "layers" ? t.bs_tab_layers : t.bs_tab_skin}</button>
                ))}
              </div>
              {panel === "brush" && (
                <section className="flex flex-col gap-4">
                  <Range label={t.bs_size} value={sizeMm} min={0.2} max={20} step={0.1} unit=" mm" onChange={setSizeMm} />
                  {tool !== "eraser" && <Range label={tool === "dots" ? t.bs_density : t.col_opacity} value={opacity} min={5} max={100} unit="%" onChange={setOpacity} />}
                  {tool === "eraser" ? (
                    <Seg value={eraseLayer === "ink" ? 0 : 1} onChange={(i) => setEraseLayer(i ? "sketch" : "ink")} labels={[t.bs_layer_ink, t.bs_layer_sketch]} />
                  ) : tool === "sketch" ? (
                    <ColorPicker value={sketchColor} onChange={setSketchColor} />
                  ) : (
                    <>
                      <ColorPicker value={color} onChange={setColor} />
                      <div className="grid grid-cols-8 gap-1.5">{INKS.map((c) => <button key={c} type="button" aria-label={c} aria-pressed={color === c} onClick={() => setColor(c)} className="aspect-square border-2" style={{ background: c, borderColor: color === c ? "#c4f135" : "rgba(255,255,255,.1)" }} />)}</div>
                    </>
                  )}
                </section>
              )}
              {panel === "layers" && (
                <section className="flex flex-col gap-2">
                  {(["ink", "sketch"] as LayerName[]).map((l) => (
                    <div key={l} className="flex items-center gap-3 border border-[rgba(255,255,255,.1)] px-3 py-2.5">
                      <button type="button" aria-pressed={show[l]} onClick={() => toggleLayer(l)} aria-label={show[l] ? t.bs_hide : t.bs_show} className={`flex h-8 w-8 items-center justify-center ${show[l] ? "text-lilac" : "text-ash"}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">{show[l] ? <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.6" /> : <path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.1 6.1C3.6 7.8 2 12 2 12s4 7 10 7a9.8 9.8 0 0 0 5-1.4" stroke="currentColor" strokeWidth="1.6" />}</svg>
                      </button>
                      <span className="flex-1 text-sm">{l === "ink" ? t.bs_layer_ink : t.bs_layer_sketch}</span>
                      <button type="button" onClick={() => e?.clearLayer(l)} className="text-[13px] text-mist underline underline-offset-4 hover:text-ivory">{t.bs_clear}</button>
                    </div>
                  ))}
                  <p className="m-0 mt-1 text-[12px] leading-relaxed text-ash">{t.bs_layers_hint}</p>
                </section>
              )}
              {panel === "skin" && (
                <section className="flex flex-col gap-3">
                  <div className="grid grid-cols-7 gap-1.5">
                    {SKINS.map((c, i) => <button key={c} type="button" aria-label={i === 0 ? t.bs_clay : c} aria-pressed={skin === c} onClick={() => pickSkin(c)} className="aspect-square border-2" style={{ background: c, borderColor: skin === c ? "#c4f135" : "transparent" }} />)}
                  </div>
                  <p className="m-0 text-[12px] text-ash">{t.bs_skin_hint}</p>
                </section>
              )}
              <div className="mt-auto flex flex-col gap-2">
                <button type="button" disabled={!ready || !e?.hasInk()} onClick={removeTattoo} className="lx-btn lx-btn-ghost !min-h-11 !text-[#ffb4b4]">{t.bs_remove}</button>
                <button type="button" disabled={!ready} onClick={makeStencil} className="lx-btn lx-btn-primary !min-h-11">{t.bs_stencil}</button>
                <button type="button" disabled={!ready} onClick={() => e && downloadDataUrl(e.snapshot(), "lumink-body.png")} className="lx-btn lx-btn-ghost !min-h-11">{t.sim_save}</button>
              </div>
            </>
          )}
        </aside>
      </div>

      {stencil && (
        <div role="dialog" aria-modal="true" aria-label={t.bs_stencil} className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.7)] p-4" onClick={() => setStencil(null)}>
          <div className="flex max-h-[92vh] w-full max-w-[720px] flex-col gap-4 bg-[#121310] p-5" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <p className="m-0 font-display text-lg font-semibold">{t.bs_stencil}</p>
              <p className="m-0 text-sm text-mist" dir="ltr">{stencil.w.toFixed(1)} × {stencil.h.toFixed(1)} cm</p>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-white p-3"><img src={stencil.url} alt="" className="max-h-[60vh] max-w-full" /></div>
            <p className="m-0 text-[12px] leading-relaxed text-ash">{t.bs_stencil_hint}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button type="button" onClick={mirrorStencil} aria-pressed={stencil.mirrored} className={`lx-btn !min-h-11 ${stencil.mirrored ? "lx-btn-primary" : "lx-btn-ghost"}`}>{t.sim_flip}</button>
              <button type="button" onClick={() => downloadDataUrl(stencil.url, "lumink-stencil.png")} className="lx-btn lx-btn-ghost !min-h-11">{t.st_download}</button>
              <button type="button" onClick={printStencil} className="lx-btn lx-btn-primary !min-h-11">{t.st_print}</button>
              <button type="button" onClick={() => setStencil(null)} className="lx-btn lx-btn-ghost !min-h-11">{t.bs_close}</button>
            </div>
          </div>
        </div>
      )}
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
function Seg({ value, onChange, labels }: { value: number; onChange: (i: number) => void; labels: string[] }) {
  return (
    <div className="grid border border-[rgba(255,255,255,.12)]" style={{ gridTemplateColumns: `repeat(${labels.length}, 1fr)` }}>
      {labels.map((l, i) => <button key={l} type="button" aria-pressed={value === i} onClick={() => onChange(i)} className={`min-h-10 text-[13px] ${value === i ? "bg-ivory font-semibold text-night" : "text-mist"}`}>{l}</button>)}
    </div>
  );
}
