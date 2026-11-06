"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { downloadDataUrl, fileToDataUrl, loadImage } from "@/lib/store";
import { HANDOFF_KEY } from "./Simulator2D";

export const STENCIL_HANDOFF_KEY = "lumink-handoff-stencil";

/** Turns any image into black line work on white (Sobel edges + dark-line keep). */
function toStencil(src: ImageData, strength: number, detail: number, outline = false): ImageData {
  const { width: w, height: h, data } = src;
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];

  // Box blur: less detail = more blur = fewer, cleaner lines.
  const r = Math.round((100 - detail) / 25);
  let b = g;
  if (r > 0) {
    const tmp = new Float32Array(w * h);
    b = new Float32Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let s = 0, n = 0;
        for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += g[y * w + xx]; n++; } }
        tmp[y * w + x] = s / n;
      }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let s = 0, n = 0;
        for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += tmp[yy * w + x]; n++; } }
        b[y * w + x] = s / n;
      }
  }

  // Keep existing dark lines only for light images (line art on paper); dark photos use edges only.
  let sum = 0;
  for (let i = 0; i < w * h; i++) sum += g[i];
  const keepDark = !outline && sum / (w * h) > 128;
  const out = new ImageData(w, h);
  const thr = 140 - strength * 1.1; // higher strength => lower threshold => more lines
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let mag = 0;
      if (x > 0 && y > 0 && x < w - 1 && y < h - 1) {
        const p = (dx: number, dy: number) => b[(y + dy) * w + (x + dx)];
        const gx = -p(-1, -1) - 2 * p(-1, 0) - p(-1, 1) + p(1, -1) + 2 * p(1, 0) + p(1, 1);
        const gy = -p(-1, -1) - 2 * p(0, -1) - p(1, -1) + p(-1, 1) + 2 * p(0, 1) + p(1, 1);
        mag = Math.sqrt(gx * gx + gy * gy) / 4;
      }
      const ink = mag > thr || (keepDark && g[i] < 45) ? 0 : 255;
      out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = ink;
      out.data[i * 4 + 3] = 255;
    }
  return out;
}

export function StencilStudio() {
  const { t } = useI18n();
  const [src, setSrc] = useState<string | null>(null);
  const [out, setOut] = useState<string | null>(null);
  const [ratio, setRatio] = useState(1);
  const [strength, setStrength] = useState(60);
  const [detail, setDetail] = useState(70);
  const [mirror, setMirror] = useState(false);
  const [cm, setCm] = useState(10);
  const [outline, setOutline] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const [err, setErr] = useState(false);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/") || /heic|heif/i.test(f.type)) { setErr(true); return; }
    setErr(false); setSrc(await fileToDataUrl(f));
  };

  useEffect(() => {
    try {
      const handed = sessionStorage.getItem(STENCIL_HANDOFF_KEY);
      if (handed) { setSrc(handed); sessionStorage.removeItem(STENCIL_HANDOFF_KEY); }
    } catch {}
  }, []);

  useEffect(() => {
    if (!src) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      let img: HTMLImageElement;
      try { img = await loadImage(src); } catch { setErr(true); setOut(null); return; }
      if (!img.width || !img.height) { setErr(true); return; }
      const k = Math.min(1, 1400 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      if (mirror) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(img, 0, 0, c.width, c.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const result = toStencil(ctx.getImageData(0, 0, c.width, c.height), strength, detail, outline);
      ctx.putImageData(result, 0, 0);
      setRatio(c.height / c.width);
      setOut(c.toDataURL("image/png"));
    }, 120);
  }, [src, strength, detail, mirror, outline]);

  const toSim = () => {
    if (!out) return;
    try { sessionStorage.setItem(HANDOFF_KEY, out); } catch {}
  };

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex min-h-[420px] min-w-0 flex-[999_1_560px] items-center justify-center overflow-hidden rounded-3xl border border-[rgba(200,200,210,0.06)] bg-white p-4">
        {out ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={out} alt="Stencil" className="max-h-[70vh] max-w-full" />
        ) : (
          <div className="flex flex-col items-center gap-3">
          <label className="lx-btn relative cursor-pointer bg-[#0b0b0d] text-white">
            {t.st_upload}
            <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <button type="button" onClick={() => { setErr(false); setSrc("/designs/oni.png"); }} className="text-sm font-medium text-[#141416] underline underline-offset-4">{t.col_sample}</button>
          </div>
        )}
      </div>
      <aside className="lx-surface-strong flex min-w-0 flex-[1_1_300px] flex-col gap-5 p-5">
        <p className="m-0 text-sm leading-relaxed text-mist">{t.st_hint}</p>
        {err && <p role="alert" className="m-0 bg-[rgba(240,149,149,.15)] px-4 py-3 text-sm text-[#ffc9cc]">{t.col_load_error}</p>}
        <label className="lx-btn lx-btn-ghost relative !rounded-xl cursor-pointer">
          {t.st_upload}
          <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <label className="flex flex-col gap-2 text-[13px] text-ash">{t.st_strength}<input type="range" min={0} max={100} value={strength} onChange={(e) => setStrength(+e.target.value)} /></label>
        <label className="flex flex-col gap-2 text-[13px] text-ash">{t.st_detail}<input type="range" min={0} max={100} value={detail} onChange={(e) => setDetail(+e.target.value)} /></label>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} className="h-5 w-5 accent-[#c4f135]" />{t.st_mirror}</label>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={outline} onChange={(e) => setOutline(e.target.checked)} className="h-5 w-5 accent-[#c4f135]" />{t.st_outline}</label>
        <label className="flex flex-col gap-2 text-[13px] text-ash">{t.st_width}<input type="number" min={2} max={40} step={0.5} value={cm} onChange={(e) => setCm(Math.max(2, Math.min(40, +e.target.value || 10)))} className="lx-input" /></label>
        <p className="m-0 text-xs text-ash" dir="ltr">{cm} × {(cm * ratio).toFixed(1)} cm</p>
        <div className="flex flex-col gap-2">
          <button type="button" disabled={!out} onClick={() => window.print()} className="lx-btn lx-btn-primary">{t.st_print}</button>
          <button type="button" disabled={!out} onClick={() => out && downloadDataUrl(out, "lumink-stencil.png")} className="lx-btn lx-btn-ghost">{t.st_download}</button>
          {out && <Link href="/studio/simulator" onClick={toSim} className="lx-btn lx-btn-ghost">{t.gen_to_sim}</Link>}
        </div>
      </aside>
      {/* Print sheet: exactly the chosen width in centimetres. */}
      {out && (
        <div className="lx-print hidden print:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={out} alt="" style={{ width: `${cm}cm`, height: "auto" }} />
        </div>
      )}
    </div>
  );
}
