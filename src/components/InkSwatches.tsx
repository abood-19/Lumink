"use client";

import { useI18n } from "@/lib/i18n/client";
import { INK_COLORS } from "@/lib/inkPrep";

/** One ink for the whole design: its own colours, black, or a colour. */
export function InkSwatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const { t } = useI18n();
  const custom = !(INK_COLORS as readonly string[]).includes(value);
  return (
    <div>
      <p className="mb-2 mt-0 text-[13px] text-ash">{t.ink_color}</p>
      <div className="flex flex-wrap gap-2">
        {INK_COLORS.map((c) => (
          <button key={c} type="button" title={c === "original" ? t.ink_original : c} aria-label={c === "original" ? t.ink_original : c} aria-pressed={value === c} onClick={() => onChange(c)}
            className={`h-9 w-9 rounded-full ${value === c ? "ring-2 ring-lilac ring-offset-2 ring-offset-[#121311]" : ""}`}
            style={{ background: c === "original" ? "conic-gradient(#121214 0 25%, #9e1b24 0 50%, #1c3f8f 0 75%, #d9a21b 0)" : c }} />
        ))}
        <label title={t.ink_custom} className={`relative h-9 w-9 cursor-pointer rounded-full border border-dashed border-white/35 ${custom ? "ring-2 ring-lilac ring-offset-2 ring-offset-[#121311]" : ""}`} style={{ background: custom ? value : undefined }}>
          <span className="sr-only">{t.ink_custom}</span>
          <input type="color" value={custom ? value : "#ff4d6d"} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
      </div>
    </div>
  );
}
