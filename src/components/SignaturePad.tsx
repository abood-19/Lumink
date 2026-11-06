"use client";

import { useEffect, useRef } from "react";

/** Finger/mouse signature. Calls onChange with a PNG data URL (or null when cleared). */
export function SignaturePad({ value, onChange, clearLabel, label }: { value: string | null; onChange: (v: string | null) => void; clearLabel: string; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height);
      img.src = value;
    }
    // Only on mount / when switching records.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: React.PointerEvent) => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height];
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] text-ash">{label}</span>
      <canvas
        ref={ref}
        width={600}
        height={200}
        aria-label={label}
        className="h-[150px] w-full touch-none rounded-xl bg-white"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          drawing.current = true;
          const ctx = ref.current!.getContext("2d")!;
          const [x, y] = pos(e);
          ctx.beginPath();
          ctx.moveTo(x, y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = ref.current!.getContext("2d")!;
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.strokeStyle = "#0b0b0d";
          const [x, y] = pos(e);
          ctx.lineTo(x, y);
          ctx.stroke();
        }}
        onPointerUp={() => {
          if (!drawing.current) return;
          drawing.current = false;
          onChange(ref.current!.toDataURL("image/png"));
        }}
      />
      <button
        type="button"
        onClick={() => {
          const c = ref.current!;
          const ctx = c.getContext("2d")!;
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, c.width, c.height);
          onChange(null);
        }}
        className="self-start text-[13px] text-ash underline-offset-4 hover:text-white hover:underline"
      >
        {clearLabel}
      </button>
    </div>
  );
}
