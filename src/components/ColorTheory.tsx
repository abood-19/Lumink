"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

type Harmony = "complementary" | "analogous" | "triadic" | "split" | "square" | "tetradic";
const HARMONIES: Record<Harmony, number[]> = {
  complementary: [0, 180],
  analogous: [-30, 0, 30],
  triadic: [0, 120, 240],
  split: [0, 150, 210],
  square: [0, 90, 180, 270],
  tetradic: [0, 60, 180, 240],
};

const hsl = (h: number, s: number, l: number) => `hsl(${((h % 360) + 360) % 360} ${s}% ${l}%)`;
function toHex(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function Wheel({ base, marks, onPick }: { base: number; marks: number[]; onPick: (h: number) => void }) {
  const seg = 12;
  const R = 120, r = 62;
  const arc = (i: number) => {
    const a0 = ((i * 30 - 15 - 90) * Math.PI) / 180, a1 = ((i * 30 + 15 - 90) * Math.PI) / 180;
    const p = (rad: number, a: number) => `${150 + rad * Math.cos(a)} ${150 + rad * Math.sin(a)}`;
    return `M${p(R, a0)}A${R} ${R} 0 0 1 ${p(R, a1)}L${p(r, a1)}A${r} ${r} 0 0 0 ${p(r, a0)}Z`;
  };
  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-[340px]" role="img" aria-label="Color wheel">
      {Array.from({ length: seg }, (_, i) => (
        <path key={i} d={arc(i)} fill={hsl(i * 30, 85, 52)} stroke="#0a0b09" strokeWidth="3" className="cursor-pointer transition-opacity hover:opacity-80" onClick={() => onPick(i * 30)} />
      ))}
      {marks.map((m, i) => {
        const a = ((base + m - 90) * Math.PI) / 180;
        return (
          <g key={i}>
            <line x1="150" y1="150" x2={150 + 92 * Math.cos(a)} y2={150 + 92 * Math.sin(a)} stroke="#f3f3f5" strokeWidth="1.5" strokeDasharray={i ? "4 4" : undefined} />
            <circle cx={150 + 92 * Math.cos(a)} cy={150 + 92 * Math.sin(a)} r={i ? 9 : 12} fill={hsl(base + m, 85, 52)} stroke="#fff" strokeWidth="3" />
          </g>
        );
      })}
      <circle cx="150" cy="150" r="40" fill="#0f110d" />
      <text x="150" y="155" textAnchor="middle" fill="#c4f135" style={{ font: "600 13px Unbounded, sans-serif" }}>{Math.round(((base % 360) + 360) % 360)}°</text>
    </svg>
  );
}

const SKIN = ["#F4D7C3", "#E3B591", "#C68B63", "#9C6B4A", "#6E4630", "#3F2A1F"];
const rgbOf = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lumOf = (hex: string) => { const [r, g, b] = rgbOf(hex); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
/** Healed ink seen through skin: mostly the ink, multiplied by the skin tone, with a little skin on top. */
function inkOn(ink: string, skin: string) {
  const a = rgbOf(ink), s = rgbOf(skin);
  const c = a.map((v, i) => 0.55 * v * Math.min(1.1, lumOf(skin) / 200 + 0.2) + 0.45 * (v * s[i]) / 255);
  return `rgb(${c.map((v) => Math.round(Math.min(255, v))).join(",")})`;
}

export const CT_SECTIONS = ["wheel", "value", "families", "skin", "rules"] as const;

export function ColorTheory() {
  const { t } = useI18n();
  const [base, setBase] = useState(0);
  const [harmony, setHarmony] = useState<Harmony>("complementary");
  const [sat, setSat] = useState(80);
  const [light, setLight] = useState(50);
  const marks = HARMONIES[harmony];
  const palette = useMemo(() => marks.map((m) => toHex(base + m, sat, light)), [marks, base, sat, light]);
  const copy = (hex: string) => { try { navigator.clipboard?.writeText(hex); } catch {} };

  const H = ({ id, children }: { id: string; children: React.ReactNode }) => (
    <h2 id={id} className="m-0 mb-5 scroll-mt-28 font-display text-[clamp(22px,2.4vw,30px)] font-bold tracking-[-.01em]">{children}</h2>
  );
  const row = (label: string, desc: string, colors: string[]) => (
    <div className="border border-[rgba(255,255,255,.08)] bg-[#11130f] p-5">
      <p className="m-0 font-display text-[15px] font-semibold text-lilac">{label}</p>
      <p className="m-0 mt-1 text-[13px] leading-relaxed text-mist">{desc}</p>
      <div className="mt-4 flex gap-1.5">{colors.map((c, i) => <span key={i} className="h-10 flex-1 rounded-lg" style={{ background: c }} />)}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-16">
      <section>
      <H id="wheel">{t.ct_s1}</H>
      <div className="grid items-start gap-6 border border-[rgba(255,255,255,.08)] bg-[#0f110d] p-6 md:grid-cols-[minmax(0,340px)_1fr] md:p-8">
        <div className="flex flex-col items-center gap-3">
          <Wheel base={base} marks={marks} onPick={setBase} />
          <p className="m-0 text-center text-[12px] text-ash">{t.ct_wheel_hint}</p>
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.ct_harmony}>
            {(Object.keys(HARMONIES) as Harmony[]).map((h) => (
              <button key={h} type="button" aria-pressed={harmony === h} onClick={() => setHarmony(h)} className={`min-h-10 px-4 text-[13px] font-medium ${harmony === h ? "bg-lilac text-[#0a0b09]" : "border border-[rgba(255,255,255,.12)] text-mist hover:text-white"}`}>
                {t[`ct_h_${h}` as keyof typeof t] as string}
              </button>
            ))}
          </div>
          <p className="m-0 text-[15px] leading-relaxed text-ivory">{t[`ct_hd_${harmony}` as keyof typeof t] as string}</p>
          <div className="flex gap-2">
            {palette.map((hex) => (
              <button key={hex} type="button" onClick={() => copy(hex)} className="group flex flex-1 flex-col overflow-hidden border border-[rgba(255,255,255,.08)] text-start">
                <span className="h-24" style={{ background: hex }} />
                <span className="bg-[#0a0b09] px-3 py-2 font-mono text-[12px] text-mist group-hover:text-lilac" dir="ltr">{hex}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [t.ct_hue, base, 0, 359, setBase, "°"],
              [t.ct_sat, sat, 0, 100, setSat, "%"],
              [t.ct_light, light, 10, 90, setLight, "%"],
            ].map(([label, v, min, max, fn, unit]) => (
              <label key={label as string} className="flex flex-col gap-2 text-[13px] text-ash">
                <span className="flex justify-between"><span>{label as string}</span><span className="text-ivory" dir="ltr">{v as number}{unit as string}</span></span>
                <input type="range" min={min as number} max={max as number} value={v as number} onChange={(e) => (fn as (n: number) => void)(+e.target.value)} />
              </label>
            ))}
          </div>
        </div>
      </div>

      </section>

      <section>
      <H id="value">{t.ct_s2}</H>
      <div className="grid gap-4 md:grid-cols-3">
        {row(t.ct_shade, t.ct_shade_d, [0, 1, 2, 3, 4, 5].map((i) => hsl(base, sat, light - i * 7)))}
        {row(t.ct_tint, t.ct_tint_d, [0, 1, 2, 3, 4, 5].map((i) => hsl(base, sat, light + i * 7)))}
        {row(t.ct_tone, t.ct_tone_d, [0, 1, 2, 3, 4, 5].map((i) => hsl(base, sat - i * 13, light)))}
      </div>

      </section>

      <section>
      <H id="families">{t.ct_s3}</H>
      <div className="grid gap-4 md:grid-cols-3">
        {row(t.ct_primary, t.ct_primary_d, [hsl(0, 85, 50), hsl(60, 90, 50), hsl(230, 85, 50)])}
        {row(t.ct_secondary, t.ct_secondary_d, [hsl(30, 90, 52), hsl(120, 70, 42), hsl(285, 70, 50)])}
        {row(t.ct_warmcool, t.ct_warmcool_d, [hsl(0, 85, 52), hsl(30, 90, 52), hsl(50, 90, 52), hsl(190, 80, 45), hsl(220, 80, 50), hsl(260, 70, 55)])}
      </div>

      </section>

      <section>
        <H id="skin">{t.ct_s4}</H>
        <p className="m-0 mb-5 max-w-[640px] text-[15px] leading-relaxed text-mist">{t.ct_s4_d}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {SKIN.map((sk) => (
            <div key={sk} className="p-3" style={{ background: sk }}>
              <div className="flex flex-col gap-1.5">
                {[...palette, "#141414"].map((hex, i) => (
                  <span key={i} className="h-7" style={{ background: inkOn(hex, sk) }} title={hex} />
                ))}
              </div>
              <p className="m-0 mt-2 font-mono text-[11px]" style={{ color: lumOf(sk) > 140 ? "#1a1410" : "#f3ece6" }} dir="ltr">{sk}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t-2 border-lilac pt-8">
        <H id="rules">{t.ct_s5}</H>
        <ul className="m-0 grid list-none gap-x-10 gap-y-5 p-0 md:grid-cols-2">
          {[t.ct_tip1, t.ct_tip2, t.ct_tip3, t.ct_tip4].map((tip) => (
            <li key={tip} className="flex gap-3 text-[16px] leading-relaxed text-ivory">
              <span className="mt-2.5 h-2 w-2 flex-none bg-lilac" />{tip}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
