"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

/** Lettering in the styles people actually get tattooed: blackletter, script, serif caps, Arabic and Cyrillic hands. */
const FONTS: { family: string; label: string; weight?: number }[] = [
  { family: "UnifrakturMaguntia", label: "Old English" },
  { family: "Pirata One", label: "Chicano" },
  { family: "Grenze Gotisch", label: "Gothic", weight: 700 },
  { family: "Great Vibes", label: "Script" },
  { family: "Mrs Saint Delafield", label: "Fine script" },
  { family: "Pinyon Script", label: "Copperplate" },
  { family: "Alex Brush", label: "Brush" },
  { family: "Sacramento", label: "Fine line" },
  { family: "Cinzel", label: "Roman caps", weight: 600 },
  { family: "Rye", label: "Western" },
  { family: "Marck Script", label: "Русский рукописный" },
  { family: "Ruslan Display", label: "Славянский" },
  { family: "Aref Ruqaa", label: "رقعة", weight: 700 },
  { family: "Reem Kufi", label: "كوفي", weight: 600 },
  { family: "Amiri", label: "نسخ", weight: 700 },
  { family: "Rakkas", label: "ديواني" },
];
const HREF = "https://fonts.googleapis.com/css2?" + FONTS.map((f) => `family=${f.family.replace(/ /g, "+")}${f.weight ? `:wght@${f.weight}` : ""}`).join("&") + "&display=swap";

/** Renders lettering to a transparent PNG and hands it back as a design. */
export function LetteringPanel({ onUse, compact = false }: { onUse: (dataUrl: string) => void; compact?: boolean }) {
  const { t, locale } = useI18n();
  const [text, setText] = useState(locale === "ar" ? "حرية" : locale === "ru" ? "Свобода" : "Memento");
  const [font, setFont] = useState(FONTS[locale === "ar" ? 12 : locale === "ru" ? 10 : 0].family);
  // the alphabet the artist writes in comes first
  const list = useMemo(() => {
    const arabic = (f: string) => ["Aref Ruqaa", "Reem Kufi", "Amiri", "Rakkas"].includes(f), cyr = (f: string) => ["Marck Script", "Ruslan Display"].includes(f);
    const first = locale === "ar" ? arabic : locale === "ru" ? cyr : () => false;
    return [...FONTS.filter((f) => first(f.family)), ...FONTS.filter((f) => !first(f.family))];
  }, [locale]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!document.querySelector(`link[data-lx-fonts]`)) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = HREF; l.dataset.lxFonts = "1"; document.head.appendChild(l);
    }
    document.fonts.ready.then(() => setReady(true));
  }, []);

  const weight = useMemo(() => FONTS.find((f) => f.family === font)?.weight ?? 400, [font]);
  const render = async () => {
    const lines = (text.trim() || " ").split("\n");
    const size = 220;
    const spec = `${weight} ${size}px "${font}"`;
    await document.fonts.load(spec, text).catch(() => undefined);
    const m = document.createElement("canvas").getContext("2d")!; m.font = spec;
    const w = Math.max(...lines.map((l) => m.measureText(l).width));
    const c = document.createElement("canvas");
    c.width = Math.ceil(w + size * 0.6); c.height = Math.ceil(lines.length * size * 1.3 + size * 0.5);
    const g = c.getContext("2d")!;
    g.font = spec; g.fillStyle = "#121214"; g.textAlign = "center"; g.textBaseline = "middle";
    g.direction = /[؀-ۿ]/.test(text) ? "rtl" : "ltr";
    lines.forEach((l, i) => g.fillText(l, c.width / 2, size * 0.25 + size * 1.3 * (i + 0.5)));
    onUse(c.toDataURL("image/png"));
  };

  return (
    <div className="flex flex-col gap-3">
      <textarea id="lx-lettering" rows={compact ? 1 : 2} value={text} onChange={(e) => setText(e.target.value)} placeholder={t.lt_placeholder}
        className="w-full resize-none rounded-xl border border-white/12 bg-black/30 px-3.5 py-3 text-[18px] text-ivory outline-none focus:border-lilac/70"
        style={{ fontFamily: `"${font}", serif`, fontWeight: weight }} />
      <div className="no-scrollbar -mx-1 flex max-h-[220px] flex-col gap-1 overflow-y-auto px-1">
        {list.map((f) => (
          <button key={f.family} type="button" aria-pressed={font === f.family} onClick={() => setFont(f.family)}
            className={`flex min-h-12 items-center justify-between gap-3 rounded-xl px-3.5 text-start transition-colors ${font === f.family ? "bg-white text-[#0a0b09]" : "bg-white/[.04] text-ivory hover:bg-white/[.08]"}`}>
            <span className="truncate text-[22px] leading-none" style={{ fontFamily: `"${f.family}", serif`, fontWeight: f.weight ?? 400, opacity: ready ? 1 : 0.4 }}>{text.split("\n")[0] || f.label}</span>
            <span className="flex-none text-[11px] opacity-60">{f.label}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={render} className="min-h-12 rounded-xl bg-lilac text-[15px] font-semibold text-[#0a0b09]">{t.lt_use}</button>
    </div>
  );
}
