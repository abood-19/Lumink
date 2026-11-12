"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { downloadDataUrl, fileToDataUrl, loadImage } from "@/lib/store";
import { compositeInkBox, type Placement } from "@/lib/inkComposite";
import { INK_COLORS, applyFills, prepareInk, type Fill } from "@/lib/inkPrep";
import { LetteringPanel } from "./LetteringPanel";
import { InkSwatches } from "./InkSwatches";
import { SheetButton, SheetHead, panelClass, useSimFull } from "./simFull";

/** Key used to hand a design from the generator or stencil studio to the simulator. */
export const HANDOFF_KEY = "lumink-handoff-design";

const DESIGNS = ["tribal", "oni", "spine", "mask", "mandala", "geometry", "lettering", "band"].map((id) => ({ id, src: `/designs/${id}.png` }));
const SAMPLE = { src: "/photos/arm-left.png", pxPerCm: 212 / 10.5 };
const BG = "#141513";
const RESULT_LONG_SIDE = 3000;
const mobile = typeof window !== "undefined" && matchMedia("(pointer: coarse)").matches;

type Photo = { img: HTMLImageElement; w: number; h: number; pxPerCm: number };
type Pose = { x: number; y: number; sizeCm: number; rot: number };

/**
 * Photo try-on.
 * Editing: the design is a GPU layer over the photo, so moving, pinching and turning it never stutters.
 * "Try on skin": a full-resolution render — the design wraps around the limb it sits on,
 * takes the skin's texture and light, and fades as the surface turns away.
 */
export function Simulator2D() {
  const { t } = useI18n();
  const { full, sheet, setSheet } = useSimFull();
  const stage = useRef<HTMLDivElement>(null);
  const photoCv = useRef<HTMLCanvasElement>(null);
  const designCv = useRef<HTMLCanvasElement>(null);
  const resultCv = useRef<HTMLCanvasElement>(null);

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [designImg, setDesignImg] = useState<HTMLImageElement | null>(null);
  const [color, setColor] = useState<string>(INK_COLORS[1]);
  const [fills, setFills] = useState<Fill[]>([]);
  const [paint, setPaint] = useState<"whole" | "parts">("whole");
  const [fillColor, setFillColor] = useState<string>(INK_COLORS[2]);
  const [lettering, setLettering] = useState(false);
  const [look, setLook] = useState({ strength: 0.7, sharp: 0.75, depth: 0.45 });
  // preview ink (light enough to move at 60 fps); the result is rebuilt at full resolution
  const design = useMemo(() => (designImg ? applyFills(prepareInk(designImg, color, 900), fills) : null), [designImg, color, fills]);
  const [designId, setDesignId] = useState("tribal");
  const [pose, setPose] = useState<Pose>({ x: 0, y: 0, sizeCm: 8, rot: 0 });
  const [mode, setMode] = useState<"edit" | "rendering" | "result">("edit");
  const [fit, setFit] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState({ s: 1, x: 0, y: 0 });
  const [error, setError] = useState("");
  const hiRes = useRef<{ key: string; base: HTMLCanvasElement; skin: ImageData; blur: ImageData; probe: ImageData; probeK: number; k: number } | null>(null);

  /* ---------- loading ---------- */
  const loadPhoto = useCallback(async (src: string, pxPerCm?: number) => {
    setError("");
    try {
      const img = await loadImage(src);
      const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      // unknown scale: assume the photo frames about 30 cm across its short side
      setPhoto({ img, w, h, pxPerCm: pxPerCm ?? Math.min(w, h) / 30 });
      setPose((p) => ({ ...p, x: w / 2, y: h / 2, rot: 0 }));
      hiRes.current = null;
      setMode("edit"); setZoom({ s: 1, x: 0, y: 0 });
    } catch { setError(t.sim3_error); }
  }, [t.sim3_error]);

  const pickDesign = useCallback(async (src: string, id: string) => {
    const img = await loadImage(src).catch(() => null);
    if (!img) return;
    setDesignImg(img); setFills([]);
    setDesignId(id); setMode("edit");
  }, []);

  useEffect(() => {
    let handed: string | null = null;
    try { handed = sessionStorage.getItem(HANDOFF_KEY); sessionStorage.removeItem(HANDOFF_KEY); } catch {}
    pickDesign(handed ?? DESIGNS[0].src, handed ? "custom" : DESIGNS[0].id);
    loadPhoto(SAMPLE.src, SAMPLE.pxPerCm);
  }, [loadPhoto, pickDesign]);

  // the photo is drawn once; everything else moves on top of it
  useEffect(() => {
    const cv = photoCv.current; if (!cv || !photo) return;
    const k = Math.min(1, 1600 / Math.max(photo.w, photo.h));
    cv.width = Math.round(photo.w * k); cv.height = Math.round(photo.h * k);
    const g = cv.getContext("2d")!;
    g.fillStyle = BG; g.fillRect(0, 0, cv.width, cv.height);
    g.imageSmoothingQuality = "high";
    g.drawImage(photo.img, 0, 0, cv.width, cv.height);
  }, [photo]);

  useEffect(() => {
    const cv = designCv.current; if (!cv || !design) return;
    cv.width = design.width; cv.height = design.height;
    const g = cv.getContext("2d")!; g.clearRect(0, 0, cv.width, cv.height); g.drawImage(design, 0, 0);
  }, [design, fit.w > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // fit the photo into the stage
  useEffect(() => {
    const el = stage.current; if (!el || !photo) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const k = Math.min(r.width / photo.w, r.height / photo.h);
      setFit({ w: Math.floor(photo.w * k), h: Math.floor(photo.h * k) });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, [photo]);

  const f = photo && fit.w ? fit.w / photo.w : 0;            // natural px → screen px
  const longPx = photo ? pose.sizeCm * photo.pxPerCm : 0;     // design's longest side in natural px
  const dW = design ? (longPx * design.width) / Math.max(design.width, design.height) : 0;
  const dH = design ? (longPx * design.height) / Math.max(design.width, design.height) : 0;

  /* ---------- gestures (edit) ---------- */
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; a: number; size: number; rot: number } | null>(null);
  const poseRef = useRef(pose); poseRef.current = pose;

  const tapAt = useRef<{ x: number; y: number } | null>(null);
  const fillAt = (cx: number, cy: number) => {
    const el = stage.current?.querySelector("[data-design]"); if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2), a = (-pose.rot * Math.PI) / 180;
    const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    const u = lx / (dW * f) + 0.5, v = ly / (dH * f) + 0.5;
    if (u < 0 || v < 0 || u > 1 || v > 1) return;
    setFills((fs) => [...fs, { u, v, color: fillColor }]);
  };
  const onDown = (e: React.PointerEvent) => {
    if (mode !== "edit") return onZoomDown(e);
    if (paint === "parts") { tapAt.current = { x: e.clientX, y: e.clientY }; return; }
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()], p = poseRef.current;
      pinch.current = { d: Math.hypot(b.x - a.x, b.y - a.y), a: Math.atan2(b.y - a.y, b.x - a.x), size: p.sizeCm, rot: p.rot };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (mode !== "edit") return onZoomMove(e);
    const prev = ptrs.current.get(e.pointerId); if (!prev || !photo || !f) return;
    const cur = { x: e.clientX, y: e.clientY };
    ptrs.current.set(e.pointerId, cur);
    if (ptrs.current.size === 2 && pinch.current) {
      const [a, b] = [...ptrs.current.values()], g = pinch.current;
      const d = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      setPose((p) => ({ ...p, sizeCm: clamp(+(g.size * (d / g.d)).toFixed(1), 1, 60), rot: Math.round(wrapDeg(g.rot + ((ang - g.a) * 180) / Math.PI)) }));
      return;
    }
    if (ptrs.current.size === 1) setPose((p) => ({ ...p, x: clamp(p.x + (cur.x - prev.x) / f, 0, photo.w), y: clamp(p.y + (cur.y - prev.y) / f, 0, photo.h) }));
  };
  const onUp = (e: React.PointerEvent) => {
    if (paint === "parts" && mode === "edit" && tapAt.current) {
      if (Math.hypot(e.clientX - tapAt.current.x, e.clientY - tapAt.current.y) < 8) fillAt(e.clientX, e.clientY);
      tapAt.current = null; return;
    }
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) pinch.current = null;
    zoomDrag.current = null;
  };

  // two handles: the arrows resize, the knob above turns
  const onHandle = (kind: "size" | "turn") => (ev: React.PointerEvent) => {
    ev.stopPropagation(); ev.preventDefault();
    const box = stage.current!.querySelector("[data-design]")!.getBoundingClientRect();
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    const d0 = Math.max(6, Math.hypot(ev.clientX - cx, ev.clientY - cy)), a0 = Math.atan2(ev.clientY - cy, ev.clientX - cx);
    const p0 = { ...poseRef.current };
    const move = (e2: PointerEvent) => {
      if (kind === "size") {
        const d = Math.hypot(e2.clientX - cx, e2.clientY - cy);
        setPose((p) => ({ ...p, sizeCm: clamp(+(p0.sizeCm * (d / d0)).toFixed(1), 1, 60) }));
      } else {
        const a = Math.atan2(e2.clientY - cy, e2.clientX - cx);
        let deg = Math.round(wrapDeg(p0.rot + ((a - a0) * 180) / Math.PI));
        if (Math.abs(deg % 45) < 4) deg = Math.round(deg / 45) * 45;
        setPose((p) => ({ ...p, rot: deg }));
      }
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  // wheel: resize in edit, zoom in the result
  useEffect(() => {
    const el = stage.current; if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const m = Math.exp(-e.deltaY * 0.0015);
      if (modeRef.current === "result") setZoom((z) => ({ ...z, s: clamp(z.s * m, 1, 5) }));
      else setPose((p) => ({ ...p, sizeCm: clamp(+(p.sizeCm * m).toFixed(1), 1, 60) }));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  const modeRef = useRef(mode); modeRef.current = mode;

  /* ---------- result zoom ---------- */
  const zoomDrag = useRef<{ x: number; y: number; zx: number; zy: number; d?: number; s?: number } | null>(null);
  const lastTap = useRef(0);
  const onZoomDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      zoomDrag.current = { x: 0, y: 0, zx: zoom.x, zy: zoom.y, d: Math.hypot(b.x - a.x, b.y - a.y), s: zoom.s };
      return;
    }
    const now = performance.now();
    if (now - lastTap.current < 300) setZoom((z) => (z.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 }));
    lastTap.current = now;
    zoomDrag.current = { x: e.clientX, y: e.clientY, zx: zoom.x, zy: zoom.y };
  };
  const onZoomMove = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const z = zoomDrag.current; if (!z) return;
    if (ptrs.current.size === 2 && z.d) {
      const [a, b] = [...ptrs.current.values()];
      setZoom((q) => { const s2 = clamp(z.s! * (Math.hypot(b.x - a.x, b.y - a.y) / z.d!), 1, 5); return s2 <= 1.01 ? { s: 1, x: 0, y: 0 } : { ...q, s: s2 }; });
    } else if (ptrs.current.size === 1) setZoom((q) => {
      if (q.s <= 1.01) return { s: 1, x: 0, y: 0 };          // not zoomed: the photo stays put
      const mx = (fit.w * (q.s - 1)) / 2, my = (fit.h * (q.s - 1)) / 2;
      return { ...q, x: clamp(z.zx + e.clientX - z.x, -mx, mx), y: clamp(z.zy + e.clientY - z.y, -my, my) };
    });
  };

  /* ---------- the realistic render ---------- */
  const tryOn = async () => {
    if (!photo || !design || !designImg) return;
    setMode("rendering");
    await new Promise((r) => setTimeout(r, 30)); // let the spinner paint
    try {
      const key = photo.img.src;
      if (hiRes.current?.key !== key) hiRes.current = { key, ...prepareSkin(photo) };
      const H = hiRes.current, k = H.k;
      const out = resultCv.current!;
      out.width = H.base.width; out.height = H.base.height;
      const g = out.getContext("2d", { willReadFrequently: true })!;
      g.drawImage(H.base, 0, 0);
      const ink = document.createElement("canvas"); ink.width = out.width; ink.height = out.height;
      const ic = ink.getContext("2d", { willReadFrequently: true })!;
      const P = { x: pose.x * k, y: pose.y * k }, w = dW * k, h = dH * k, rot = (pose.rot * Math.PI) / 180;
      // where the bare skin is (clothing, hair and background will cover the ink)
      const pk = H.probeK, half = Math.hypot(w, h) / 2;
      const mask = skinMask(H.probe, pk, { x: (P.x - half) * pk, y: (P.y - half) * pk, x1: (P.x + half) * pk, y1: (P.y + half) * pk });
      const maskData = mask ? mask.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, mask.width, mask.height) : null;
      const limb = findLimb(H.probe, pk, P, rot, w, maskData);
      const ink2 = applyFills(prepareInk(designImg!, color, mobile ? 1600 : 2048), fills);
      const box = wrapOnto(ic, ink2, P, w, h, rot, limb, (1 - look.sharp) * 1.1);
      if (mask) { ic.save(); ic.globalCompositeOperation = "destination-in"; ic.imageSmoothingQuality = "high"; ic.drawImage(mask, 0, 0, ink.width, ink.height); ic.restore(); }
      const bw = box.x1 - box.x, bh = box.y1 - box.y;
      if (bw > 0 && bh > 0) {
        const place: Placement = { cx: P.x, cy: P.y, sizePx: Math.max(w, h), rot: pose.rot, flip: false, bend: 0, opacity: 0.95, healed: false, ink: "original", strength: look.strength, depth: look.depth };
        const region = g.getImageData(box.x, box.y, bw, bh);
        compositeInkBox(region, H.skin, H.blur, ic.getImageData(box.x, box.y, bw, bh), box, place);
        g.putImageData(region, box.x, box.y);
      }
      if (modeRef.current !== "result") setZoom({ s: 1, x: 0, y: 0 });
      setMode("result");
    } catch (e) {
      console.error(e); setError(t.sim3_error); setMode("edit");
    }
  };

  const lookKey = JSON.stringify(look);
  useEffect(() => {
    if (modeRef.current !== "result") return;
    const id = setTimeout(() => { tryOn(); }, 220);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookKey]);

  const save = () => { const cv = resultCv.current; if (cv) downloadDataUrl(cv.toDataURL("image/jpeg", 0.93), "lumink-tattoo.jpg"); };

  const fileInput = (onFile: (file: File) => void) => (
    <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) onFile(file); }} />
  );

  const editing = mode === "edit";
  return (
    <div className={`grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] ${full ? "h-full min-h-0 grid-rows-[minmax(0,1fr)] lg:gap-3" : ""}`}>
      {/* stage */}
      <div className="relative min-h-0 min-w-0 overflow-hidden rounded-2xl border border-white/10" style={{ background: BG }}>
        <div
          ref={stage}
          className={`relative flex touch-none select-none items-center justify-center overflow-hidden ${full ? "h-full min-h-0" : "h-[60vh] min-h-[360px] sm:h-[68vh]"} ${editing ? (paint === "parts" ? "cursor-cell" : "cursor-grab active:cursor-grabbing") : "cursor-zoom-in"}`}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="relative flex-none" style={{ width: fit.w, height: fit.h }}>
            <canvas ref={photoCv} className={`absolute inset-0 h-full w-full ${mode === "result" ? "invisible" : ""}`} />
            <canvas
              ref={resultCv}
              className={`absolute max-w-none origin-center transition-opacity duration-300 ${mode === "result" ? "opacity-100" : "pointer-events-none opacity-0"}`}
              style={{ width: fit.w * zoom.s, height: fit.h * zoom.s, left: (fit.w - fit.w * zoom.s) / 2 + zoom.x, top: (fit.h - fit.h * zoom.s) / 2 + zoom.y }}
            />
            {design && f > 0 && (
              <div
                data-design
                className={`absolute left-0 top-0 will-change-transform ${mode === "result" ? "invisible" : ""}`}
                style={{ width: dW * f, height: dH * f, transform: `translate(${pose.x * f}px, ${pose.y * f}px) translate(-50%, -50%) rotate(${pose.rot}deg)` }}
              >
                <canvas ref={designCv} className="pointer-events-none h-full w-full" style={{ mixBlendMode: "multiply", opacity: 0.9 }} />
                {editing && (
                  <>
                    <span className="pointer-events-none absolute -inset-1 rounded-md border border-white/60 shadow-[0_0_0_1px_rgba(0,0,0,.25)]" />
                    <span onPointerDown={onHandle("turn")} aria-label={t.m_rot} className="absolute -top-14 left-1/2 flex h-10 w-10 -translate-x-1/2 cursor-grab touch-none items-center justify-center rounded-full bg-white text-[#0a0b09] shadow-[0_4px_16px_rgba(0,0,0,.5)]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 12a8 8 0 1 1-3-6.2M20 4v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                    <span className="pointer-events-none absolute -top-4 left-1/2 h-4 w-px -translate-x-1/2 bg-white/60" />
                    <span onPointerDown={onHandle("size")} aria-label={t.m_size} className="absolute -bottom-5 -right-5 flex h-10 w-10 cursor-nwse-resize touch-none items-center justify-center rounded-full bg-lilac text-[#0a0b09] shadow-[0_4px_16px_rgba(0,0,0,.5)]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5l14 14M5 5h6M5 5v6M19 19h-6M19 19v-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {editing && design && f > 0 && (
          <span className="pointer-events-none absolute left-3 top-3 rounded-lg bg-[#0a0b09] px-2.5 py-1.5 text-[13px] font-semibold tabular-nums leading-none text-white shadow-[0_2px_10px_rgba(0,0,0,.5)]" dir="ltr">
            {(dW / (photo?.pxPerCm || 1)).toFixed(1)} × {(dH / (photo?.pxPerCm || 1)).toFixed(1)} cm
          </span>
        )}
        {/* one action on the photo */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-2 p-4">
          {mode === "result" ? (
            <>
              <button type="button" onClick={() => setMode("edit")} className="pointer-events-auto min-h-12 rounded-xl bg-[rgba(10,11,9,.82)] px-5 text-[15px] font-medium text-ivory backdrop-blur">{t.sim_edit}</button>
              <button type="button" onClick={save} className="pointer-events-auto min-h-12 rounded-xl bg-white px-5 text-[15px] font-semibold text-[#0a0b09]">{t.sim_save}</button>
            </>
          ) : (
            <button type="button" disabled={mode === "rendering" || !photo} onClick={tryOn} className="pointer-events-auto flex min-h-12 items-center gap-2 rounded-xl bg-lilac px-6 text-[15px] font-semibold text-[#0a0b09] shadow-[0_10px_30px_rgba(0,0,0,.45)] disabled:opacity-80">
              {mode === "rendering" && <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0a0b09] border-t-transparent" />}
              {t.sim_apply}
            </button>
          )}
        </div>
        {mode === "result" && zoom.s === 1 && <p className="pointer-events-none absolute inset-x-0 top-3 m-0 text-center text-[12px] text-white/70">{t.sim_zoom_hint}</p>}
        {full && !sheet && <SheetButton label={t.sim_tools} onClick={() => setSheet(true)} className="right-3 top-3" />}
        {error && <p role="alert" className="absolute inset-x-4 top-4 m-0 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-[#ffc9cc]">{error}</p>}
      </div>

      {/* controls */}
      <aside className={`flex min-w-0 flex-col gap-5 rounded-2xl border border-white/10 bg-[#121311] p-4 sm:p-5 ${full ? "lg:overflow-y-auto" : ""} ${panelClass(full, sheet)}`}>
        {full && <SheetHead label={t.sim_tools} onClose={() => setSheet(false)} />}
        <label className="relative flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white text-[15px] font-semibold text-[#0a0b09]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.8" /></svg>
          {t.sim_client_photo}
          {fileInput(async (file) => loadPhoto(await fileToDataUrl(file)))}
        </label>

        <section>
          <p className="mb-2 mt-0 text-[13px] text-ash">{t.sim_step2}</p>
          <div className="lx-hscroll -mx-1 flex gap-2 px-1 pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible">
            <label aria-label={t.sim_design} title={t.sim_design} className={`relative flex h-16 w-16 flex-none cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/25 text-ivory lg:aspect-square lg:h-auto lg:w-auto ${designId === "custom" ? "outline outline-2 outline-offset-2 outline-lilac" : ""}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              {fileInput(async (file) => pickDesign(await fileToDataUrl(file), "custom"))}
            </label>
            <button type="button" aria-pressed={lettering} title={t.lt_title} onClick={() => setLettering((v) => !v)} className={`flex h-16 w-16 flex-none items-center justify-center rounded-xl border border-white/15 text-[22px] text-ivory outline-offset-2 lg:aspect-square lg:h-auto lg:w-auto ${lettering || designId === "text" ? "outline outline-2 outline-lilac" : ""}`} style={{ fontFamily: '"UnifrakturMaguntia", serif' }}>Aa</button>
            {DESIGNS.map((d) => (
              <button key={d.id} type="button" aria-pressed={designId === d.id} onClick={() => pickDesign(d.src, d.id)} className={`flex h-16 w-16 flex-none items-center justify-center rounded-xl bg-[#efece4] p-1.5 outline-offset-2 lg:aspect-square lg:h-auto lg:w-auto ${designId === d.id ? "outline outline-2 outline-lilac" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.src} alt="" className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
        </section>

        {lettering && (
          <section className="flex flex-col gap-2 border-t border-white/10 pt-4">
            <p className="m-0 text-[13px] text-ash">{t.lt_title}</p>
            <LetteringPanel onUse={(url) => { pickDesign(url, "text"); }} />
          </section>
        )}

        <section className="flex flex-col gap-3 border-t border-white/10 pt-4">
          <div role="tablist" className="grid grid-cols-2 rounded-xl bg-white/5 p-1">
            {(["whole", "parts"] as const).map((k) => (
              <button key={k} role="tab" type="button" aria-selected={paint === k} onClick={() => { setPaint(k); setMode("edit"); }} className={`min-h-9 rounded-lg text-[13px] ${paint === k ? "bg-white font-semibold text-[#0a0b09]" : "text-mist"}`}>{k === "whole" ? t.fill_whole : t.fill_parts}</button>
            ))}
          </div>
          {paint === "whole" ? (
            <InkSwatches value={color} onChange={(c) => { setColor(c); setMode("edit"); }} />
          ) : (
            <>
              <InkSwatches value={fillColor} onChange={setFillColor} />
              <p className="m-0 text-[12px] leading-relaxed text-ash">{t.fill_hint}</p>
              <div className="flex gap-4 text-[13px]">
                <button type="button" disabled={!fills.length} onClick={() => setFills((fs) => fs.slice(0, -1))} className="text-ivory underline-offset-4 hover:underline disabled:opacity-35">{t.fill_undo}</button>
                <button type="button" disabled={!fills.length} onClick={() => setFills([])} className="text-mist underline-offset-4 hover:underline disabled:opacity-35">{t.fill_clear}</button>
              </div>
            </>
          )}
        </section>
        <section className="flex flex-col gap-4 border-t border-white/10 pt-4">
          <p className="m-0 text-[13px] text-ash">{t.ink_look}</p>
          <Range label={t.ink_strength} value={Math.round(look.strength * 100)} min={0} max={100} unit="%" onChange={(n) => setLook((l) => ({ ...l, strength: n / 100 }))} />
          <Range label={t.ink_sharp} value={Math.round(look.sharp * 100)} min={0} max={100} unit="%" onChange={(n) => setLook((l) => ({ ...l, sharp: n / 100 }))} />
          <Range label={t.ink_depth} value={Math.round(look.depth * 100)} min={0} max={100} unit="%" onChange={(n) => setLook((l) => ({ ...l, depth: n / 100 }))} />
        </section>
        <p className="m-0 text-[12px] leading-relaxed text-ash">{t.sim_gesture_hint}</p>
      </aside>
    </div>
  );
}

/* ---------------- rendering helpers ---------------- */

/** Full-resolution skin buffers for the compositor, plus a small blurred copy to read the body's shape from. */
function prepareSkin(photo: Photo) {
  const k = Math.min(3, (mobile ? 2200 : RESULT_LONG_SIDE) / Math.max(photo.w, photo.h));
  const W = Math.round(photo.w * k), H = Math.round(photo.h * k);
  const base = document.createElement("canvas"); base.width = W; base.height = H;
  const bg = base.getContext("2d", { willReadFrequently: true })!;
  bg.fillStyle = BG; bg.fillRect(0, 0, W, H);
  bg.imageSmoothingQuality = "high";
  bg.drawImage(photo.img, 0, 0, W, H);
  const blurC = document.createElement("canvas"); blurC.width = W; blurC.height = H;
  const blg = blurC.getContext("2d", { willReadFrequently: true })!;
  blg.filter = `blur(${Math.max(4, Math.round(W / 140))}px)`; blg.drawImage(base, 0, 0);
  const probeK = Math.min(1, 520 / Math.max(W, H));
  const pc = document.createElement("canvas"); pc.width = Math.round(W * probeK); pc.height = Math.round(H * probeK);
  const pg = pc.getContext("2d", { willReadFrequently: true })!;
  pg.filter = "blur(1.5px)"; pg.drawImage(base, 0, 0, pc.width, pc.height);
  return { base, skin: bg.getImageData(0, 0, W, H), blur: blg.getImageData(0, 0, W, H), probe: pg.getImageData(0, 0, pc.width, pc.height), probeK, k };
}

type Limb = { c: number; r: number } | null;

/**
 * Finds the limb under the design: walks across it (along the design's horizontal axis) from the centre
 * until the colour breaks away from the skin. Returns the limb's centre offset and radius, or null on a flat area.
 */
function findLimb(probe: ImageData, pk: number, P: { x: number; y: number }, rot: number, designW: number, mask: ImageData | null = null): Limb {
  const { width: W, height: H, data } = probe;
  const px = P.x * pk, py = P.y * pk, dx = Math.cos(rot), dy = Math.sin(rot);
  const at = (x: number, y: number) => {
    const xi = Math.round(x), yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= W || yi >= H) return null;
    const i = (yi * W + xi) * 4; return [data[i], data[i + 1], data[i + 2]];
  };
  let cr = 0, cg = 0, cb = 0, n = 0;
  for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const c = at(px + i, py + j); if (c) { cr += c[0]; cg += c[1]; cb += c[2]; n++; } }
  if (!n) return null;
  const C = [cr / n, cg / n, cb / n];
  const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const max = Math.hypot(W, H);
  const skinAt = (x: number, y: number) => {
    const xi = Math.round(x), yi = Math.round(y);
    if (!mask || xi < 0 || yi < 0 || xi >= W || yi >= H) return -1;
    return mask.data[(yi * W + xi) * 4 + 3];
  };
  const walk = (s: number) => {
    if (mask && skinAt(px, py) > 140) {
      // follow the bare skin to its edge: robust on busy phone photos
      let off = 0;
      for (let t = 1; t < max; t++) {
        const v = skinAt(px + dx * t * s, py + dy * t * s);
        if (v < 0) return { t, open: true };
        off = v < 90 ? off + 1 : 0;
        if (off >= 3) return { t: t - 2, open: false };
      }
      return { t: max, open: true };
    }
    const hist: number[][] = [];
    for (let t = 1; t < max; t++) {
      const c = at(px + dx * t * s, py + dy * t * s);
      if (!c) return { t, open: true };
      const back = hist.length >= 3 ? hist[hist.length - 3] : C;
      const dc = dist(c, C), jump = dist(c, back);
      if (dc > 95 || (jump > 26 && dc > 42)) return { t, open: false };
      hist.push(c);
    }
    return { t: max, open: true };
  };
  const a = walk(1), b = walk(-1);
  const width = (a.t + b.t) / pk;
  const across = Math.abs(dx) * W + Math.abs(dy) * H;
  // nothing to wrap around: an edge wasn't found, or the "limb" fills the photo (back, chest)
  if ((a.open && b.open) || (a.t + b.t) > across * 0.8 || width < designW * 0.55) return null;
  return { c: (a.t - b.t) / 2 / pk, r: width / 2 };
}

/** Draws the design into `ink`, wrapped around the limb cylinder (exact per-pixel mapping, no seams). Returns the touched box. */
function wrapOnto(ink: CanvasRenderingContext2D, design: CanvasImageSource & { width: number; height: number }, P: { x: number; y: number }, w: number, h: number, rot: number, limb: Limb, blurPx: number) {
  const W = ink.canvas.width, H = ink.canvas.height;
  const dx = Math.cos(rot), dy = Math.sin(rot);
  // the design at its final size, flat
  const fw = Math.max(1, Math.round(w)), fh = Math.max(1, Math.round(h));
  const flat = document.createElement("canvas"); flat.width = fw; flat.height = fh;
  const fg = flat.getContext("2d", { willReadFrequently: true })!; fg.imageSmoothingQuality = "high"; fg.drawImage(design, 0, 0, fw, fh);
  let local: HTMLCanvasElement = flat, ox = fw / 2, cx = P.x, cy = P.y;
  if (limb) {
    const r = limb.r, u0 = -limb.c;
    const s0 = r * Math.asin(clamp(u0 / r, -0.999, 0.999));      // design centre as an arc length on the skin
    const lw = Math.ceil(2 * r) + 4;
    local = document.createElement("canvas"); local.width = lw; local.height = fh;
    const lg = local.getContext("2d")!;
    const src = fg.getImageData(0, 0, fw, fh), out = lg.createImageData(lw, fh), S = src.data, O = out.data;
    // for each output column: which design column lands there, and how much the skin has turned away
    const xs = new Float32Array(lw), fade = new Float32Array(lw);
    for (let x = 0; x < lw; x++) {
      const u = x + 0.5 - (r + 2);
      if (Math.abs(u) >= r) { xs[x] = -1; continue; }
      const ang = Math.asin(u / r);
      xs[x] = r * ang - s0 + fw / 2 - 0.5;
      fade[x] = Math.pow(Math.cos(ang), 0.3);
    }
    for (let x = 0; x < lw; x++) {
      const sx = xs[x]; if (sx < -0.5 || sx > fw - 0.5) continue;
      const x0 = Math.max(0, Math.floor(sx)), x1 = Math.min(fw - 1, x0 + 1), t = Math.min(1, Math.max(0, sx - x0)), f = fade[x];
      for (let y = 0; y < fh; y++) {
        const a = (y * fw + x0) * 4, b = (y * fw + x1) * 4, o = (y * lw + x) * 4;
        const aa = S[a + 3] * (1 - t), ba = S[b + 3] * t, al = aa + ba;
        if (al <= 0) continue;
        O[o] = (S[a] * aa + S[b] * ba) / al; O[o + 1] = (S[a + 1] * aa + S[b + 1] * ba) / al; O[o + 2] = (S[a + 2] * aa + S[b + 2] * ba) / al;
        O[o + 3] = al * f;
      }
    }
    lg.putImageData(out, 0, 0);
    ox = r + 2; cx = P.x + dx * limb.c; cy = P.y + dy * limb.c;
  }
  ink.save();
  ink.filter = `blur(${blurPx.toFixed(2)}px)`;                      // needles never leave a vector-sharp edge
  ink.translate(cx, cy); ink.rotate(rot);
  ink.drawImage(local, -ox, -local.height / 2);
  ink.restore();
  const pts = [[-ox, -local.height / 2], [local.width - ox, -local.height / 2], [-ox, local.height / 2], [local.width - ox, local.height / 2]]
    .map(([x, y]) => [cx + x * dx - y * dy, cy + x * dy + y * dx]);
  const X = pts.map((p) => p[0]), Y = pts.map((p) => p[1]);
  return { x: Math.max(0, Math.floor(Math.min(...X) - 3)), y: Math.max(0, Math.floor(Math.min(...Y) - 3)), x1: Math.min(W, Math.ceil(Math.max(...X) + 3)), y1: Math.min(H, Math.ceil(Math.max(...Y) + 3)) };
}

/**
 * Where the skin is: a soft mask (white = bare skin) over the whole photo at probe resolution.
 * Learns this person's skin colour from the area around the tattoo, so clothing, hair, beard and background
 * hide the ink the way they would in real life. Returns null when no skin can be found (then nothing is hidden).
 */
function skinMask(probe: ImageData, _pk: number, near: { x: number; y: number; x1: number; y1: number }) {
  void _pk;
  const { width: W, height: H, data } = probe;
  const ycc = (i: number) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return [0.299 * r + 0.587 * g + 0.114 * b, 128 - 0.168736 * r - 0.331264 * g + 0.5 * b, 128 + 0.5 * r - 0.418688 * g - 0.081312 * b];
  };
  // 1. a broad skin rule, sampled around the design (a bit wider than it)
  const pad = Math.max(near.x1 - near.x, near.y1 - near.y) * 0.6;
  const x0 = Math.max(0, Math.floor(near.x - pad)), y0 = Math.max(0, Math.floor(near.y - pad)), x1 = Math.min(W, Math.ceil(near.x1 + pad)), y1 = Math.min(H, Math.ceil(near.y1 + pad));
  let n = 0, mb = 0, mr = 0, bb = 0, rr = 0, br = 0, total = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const [Y, cb, cr] = ycc((y * W + x) * 4); total++;
    if (Y < 35 || cb < 77 || cb > 135 || cr < 133 || cr > 180) continue;
    n++; mb += cb; mr += cr; bb += cb * cb; rr += cr * cr; br += cb * cr;
  }
  if (n < Math.max(30, total * 0.04)) return null;
  mb /= n; mr /= n;
  let vb = bb / n - mb * mb + 9, vr = rr / n - mr * mr + 9; const cv = br / n - mb * mr;
  const det = vb * vr - cv * cv; if (det <= 0) return null;
  const ib = vr / det, ir = vb / det, ic = -cv / det;
  // 2. this person's skin colour model over the whole photo
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  const out = g.createImageData(W, H), O = out.data;
  for (let i = 0, p = 0; p < W * H; p++, i += 4) {
    const [Y, cb, cr] = ycc(i);
    const db = cb - mb, dr = cr - mr;
    const m2 = db * db * ib + dr * dr * ir + 2 * db * dr * ic;   // squared Mahalanobis distance
    let a = 1 - Math.min(1, Math.max(0, (Math.sqrt(m2) - 2.6) / 1.4));
    if (Y < 28) a = 0;
    O[i] = O[i + 1] = O[i + 2] = 255; O[i + 3] = a * 255;
  }
  g.putImageData(out, 0, 0);
  // 3. close pores and freckles, soften the edge of the clothing
  const s = document.createElement("canvas"); s.width = W; s.height = H;
  const sg = s.getContext("2d")!;
  sg.filter = "blur(1.6px)"; sg.drawImage(c, 0, 0);
  const sd = sg.getImageData(0, 0, W, H), D = sd.data;
  for (let i = 3; i < D.length; i += 4) D[i] = Math.min(255, Math.max(0, (D[i] - 70) * 1.9));
  sg.putImageData(sd, 0, 0);
  return s;
}

function Range({ label, value, min, max, unit, onChange, step = 1 }: { label: string; value: number; min: number; max: number; unit: string; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="flex flex-col gap-2 text-[13px] text-ash">
      <span className="flex justify-between"><span>{label}</span><span className="tabular-nums text-ivory" dir="ltr">{value}{unit}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const wrapDeg = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
