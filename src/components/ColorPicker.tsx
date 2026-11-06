"use client";

import { useEffect, useRef, useState } from "react";

/** Exact colour picker: saturation/value field, hue strip, HEX and RGB fields. */

export const hexToRgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as [number, number, number]; };
export const rgbToHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("").toUpperCase();

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h * 60) + 360) % 360, max ? d / max : 0, max];
}
function hsvToRgb(h: number, s: number, v: number) {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [f(5) * 255, f(3) * 255, f(1) * 255];
}

export function ColorPicker({ value, onChange, label }: { value: string; onChange: (hex: string) => void; label?: string }) {
  const [hsv, setHsv] = useState(() => rgbToHsv(...hexToRgb(value)));
  const [hexText, setHexText] = useState(value);
  const field = useRef<HTMLDivElement>(null);
  const hue = useRef<HTMLDivElement>(null);
  const last = useRef(value);

  // follow outside changes (swatches, eyedropper) without losing the hue of greys
  useEffect(() => {
    setHexText(value);
    if (value.toUpperCase() === last.current.toUpperCase()) return;
    last.current = value;
    const [h, s, v] = rgbToHsv(...hexToRgb(value));
    setHsv((p) => [s === 0 || v === 0 ? p[0] : h, s, v]);
  }, [value]);

  const emit = (h: number, s: number, v: number) => {
    setHsv([h, s, v]);
    const hex = rgbToHex(...(hsvToRgb(h, s, v) as [number, number, number]));
    last.current = hex; setHexText(hex); onChange(hex);
  };
  const drag = (fn: (x: number, y: number) => void) => (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const move = (ev: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      fn(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)));
    };
    move(e);
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  };
  const keyField = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.01;
    const [h, s, v] = hsv;
    if (e.key === "ArrowLeft") emit(h, Math.max(0, s - step), v);
    else if (e.key === "ArrowRight") emit(h, Math.min(1, s + step), v);
    else if (e.key === "ArrowUp") emit(h, s, Math.min(1, v + step));
    else if (e.key === "ArrowDown") emit(h, s, Math.max(0, v - step));
    else return;
    e.preventDefault();
  };
  const rgb = hexToRgb(value);
  const setChannel = (i: number, n: number) => { const c = [...rgb]; c[i] = Math.min(255, Math.max(0, Math.round(n) || 0)); const hex = rgbToHex(c[0], c[1], c[2]); last.current = hex; setHsv(rgbToHsv(c[0], c[1], c[2])); onChange(hex); };

  return (
    <div className="flex flex-col gap-3" dir="ltr" aria-label={label}>
      <div
        ref={field}
        role="slider" tabIndex={0} aria-label="Saturation and brightness" aria-valuetext={value}
        onPointerDown={drag((x, y) => emit(hsv[0], x, 1 - y))}
        onKeyDown={keyField}
        className="relative h-40 touch-none cursor-crosshair rounded-[6px] outline-offset-2"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv[0]} 100% 50%))` }}
      >
        <span className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.5)]" style={{ left: `${hsv[1] * 100}%`, top: `${(1 - hsv[2]) * 100}%`, background: value }} />
      </div>
      <div
        ref={hue}
        role="slider" tabIndex={0} aria-label="Hue" aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(hsv[0])}
        onPointerDown={drag((x) => emit(x * 360, hsv[1], hsv[2]))}
        onKeyDown={(e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); emit((hsv[0] + (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 10 : 1) + 360) % 360, hsv[1], hsv[2]); } }}
        className="relative h-3.5 touch-none cursor-pointer rounded-full"
        style={{ background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}
      >
        <span className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.5)]" style={{ left: `${(hsv[0] / 360) * 100}%`, background: `hsl(${hsv[0]} 100% 50%)` }} />
      </div>
      <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-1.5">
        <label className="flex flex-col gap-1 text-[11px] text-ash">HEX
          <input
            value={hexText}
            onChange={(e) => {
              let v = e.target.value.trim().toUpperCase();
              if (!v.startsWith("#")) v = "#" + v;
              setHexText(v);
              if (/^#[0-9A-F]{6}$/.test(v)) { last.current = v; setHsv(rgbToHsv(...hexToRgb(v))); onChange(v); }
              else if (/^#[0-9A-F]{3}$/.test(v)) { const f = "#" + v.slice(1).split("").map((c) => c + c).join(""); last.current = f; setHsv(rgbToHsv(...hexToRgb(f))); onChange(f); }
            }}
            onBlur={() => setHexText(value)}
            className="lx-input !min-h-9 !px-2 font-mono !text-[13px]" maxLength={7} spellCheck={false}
          />
        </label>
        {["R", "G", "B"].map((ch, i) => (
          <label key={ch} className="flex flex-col gap-1 text-[11px] text-ash">{ch}
            <input type="number" min={0} max={255} value={rgb[i]} onChange={(e) => setChannel(i, +e.target.value)} className="lx-input !min-h-9 !px-1.5 text-center font-mono !text-[13px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
          </label>
        ))}
      </div>
    </div>
  );
}
