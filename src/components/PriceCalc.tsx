"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const KEY = "lumink-price-v2";

/** Approximate units per 1 USD, used only to convert the default price list when the currency changes. */
const CURRENCIES: { code: string; perUsd: number; step: number }[] = [
  { code: "USD", perUsd: 1, step: 5 },
  { code: "EUR", perUsd: 0.92, step: 5 },
  { code: "UZS", perUsd: 12700, step: 10000 },
  { code: "CNY", perUsd: 7.2, step: 10 },
  { code: "RUB", perUsd: 85, step: 100 },
  { code: "KZT", perUsd: 500, step: 1000 },
  { code: "TRY", perUsd: 41, step: 50 },
  { code: "GBP", perUsd: 0.78, step: 5 },
  { code: "SAR", perUsd: 3.75, step: 10 },
  { code: "AED", perUsd: 3.67, step: 10 },
  { code: "QAR", perUsd: 3.64, step: 10 },
  { code: "KWD", perUsd: 0.307, step: 1 },
  { code: "BHD", perUsd: 0.376, step: 1 },
  { code: "OMR", perUsd: 0.385, step: 1 },
  { code: "JOD", perUsd: 0.709, step: 1 },
  { code: "EGP", perUsd: 49, step: 50 },
  { code: "IQD", perUsd: 1310, step: 5000 },
  { code: "MAD", perUsd: 9.3, step: 10 },
];

/** Price by the longest side of the design, in USD. The artist edits these in their own currency. */
const DEFAULT_TIERS: [number, number][] = [[3, 35], [5, 50], [8, 80], [10, 100], [15, 160], [20, 230], [25, 300], [30, 380]];

type Settings = { currency: string; tiers: [number, number][]; min: number; fee: number; hourly: boolean; rate: number };

const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);

function convert(s: Settings, to: string): Settings {
  const from = CURRENCIES.find((c) => c.code === s.currency)!, target = CURRENCIES.find((c) => c.code === to)!;
  const k = target.perUsd / from.perUsd, r = (n: number) => (n ? roundTo(n * k, target.step) : 0);
  return { ...s, currency: to, tiers: s.tiers.map(([cm, p]) => [cm, r(p)]), min: r(s.min), fee: r(s.fee), rate: r(s.rate) };
}

function priceForSide(tiers: [number, number][], side: number) {
  const sorted = [...tiers].sort((a, b) => a[0] - b[0]);
  if (side <= sorted[0][0]) return sorted[0][1];
  for (let i = 1; i < sorted.length; i++) {
    const [c0, p0] = sorted[i - 1], [c1, p1] = sorted[i];
    if (side <= c1) return p0 + ((p1 - p0) * (side - c0)) / (c1 - c0);
  }
  const [cA, pA] = sorted[sorted.length - 2], [cB, pB] = sorted[sorted.length - 1];
  return pB + ((pB - pA) / (cB - cA)) * (side - cB); // keep the last slope past the table
}

export function PriceCalc() {
  const { t, locale } = useI18n();
  const [w, setW] = useState(8);
  const [h, setH] = useState(12);
  const [detail, setDetail] = useState(0);
  const [color, setColor] = useState(false);
  const [place, setPlace] = useState(0);
  const [cover, setCover] = useState(false);
  const [custom, setCustom] = useState(false);
  const [manual, setManual] = useState("");
  const [hoursEdit, setHoursEdit] = useState("");
  const [s, setS] = useState<Settings>({ currency: "USD", tiers: DEFAULT_TIERS, min: 40, fee: 20, hourly: false, rate: 0 });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (saved && Array.isArray(saved.tiers) && saved.tiers.length >= 2 && CURRENCIES.some((c) => c.code === saved.currency)) {
        setS((d) => ({ ...d, ...saved, tiers: saved.tiers.map(([c, p]: [number, number]) => [+c || 1, Math.max(0, +p || 0)]) }));
      }
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }, [s]);

  const cur = CURRENCIES.find((c) => c.code === s.currency)!;
  const fmt = useMemo(() => {
    const nf = new Intl.NumberFormat(locale === "ar" ? "en-US" : locale, { style: "currency", currency: s.currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return (n: number) => nf.format(n);
  }, [locale, s.currency]);

  const clampCm = (n: number) => (Number.isFinite(n) ? Math.min(200, Math.max(1, n)) : 1);
  const W = clampCm(w), Hh = clampCm(h);
  const side = Math.max(W, Hh);
  const base = Math.max(0, priceForSide(s.tiers, side));
  const mDetail = [1, 1.3, 1.7][detail], mColor = color ? 1.25 : 1, mPlace = [1, 1.15, 1.3][place], mCover = cover ? 1.4 : 1;
  const bySize = base * mDetail * mColor * mPlace * mCover + (custom ? s.fee : 0);

  // Working time: ~20 cm² an hour for simple black line work, slowed by the same factors.
  const estHours = Math.max(0.5, Math.round(((W * Hh) / 20) * mDetail * mColor * mPlace * mCover * 2) / 2);
  const hours = hoursEdit && Number.isFinite(+hoursEdit) ? Math.max(0.25, +hoursEdit) : estHours;
  const useHourly = s.hourly && s.rate > 0;
  const calculated = useHourly ? hours * s.rate + (custom ? s.fee : 0) : bySize;
  const floored = Math.max(s.min, calculated);
  const auto = roundTo(floored, cur.step);
  const final = manual && Number.isFinite(+manual) && +manual >= 0 ? +manual : auto;
  const sessions = Math.max(1, Math.ceil(hours / 5));

  const seg = (on: boolean) => `flex-1 min-h-10 rounded-full px-2 text-[13px] ${on ? "bg-ivory text-[#0b0b0d]" : "text-mist"}`;
  const Seg = ({ value, set, labels }: { value: number; set: (n: number) => void; labels: string[] }) => (
    <div className="flex gap-1 rounded-full border border-[rgba(200,200,210,0.14)] p-1">
      {labels.map((l, i) => <button key={l} type="button" aria-pressed={value === i} onClick={() => set(i)} className={seg(value === i)}>{l}</button>)}
    </div>
  );
  const Check = ({ on, set, label }: { on: boolean; set: (b: boolean) => void; label: string }) => (
    <label className="flex min-h-10 items-center gap-3 text-sm text-mist">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="h-5 w-5 accent-[#c4f135]" />
      {label}
    </label>
  );
  const Row = ({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) => (
    <div className={`flex justify-between gap-3 py-1.5 text-sm ${strong ? "border-t border-[rgba(200,200,210,0.12)] pt-3 font-semibold text-ivory" : "text-mist"}`}>
      <span>{label}</span><span className="tabular-nums">{value}</span>
    </div>
  );

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-4">
        <div className="lx-surface-strong flex flex-col gap-5 p-6">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2 text-[13px] text-ash">{t.pc_w}<input type="number" min={1} max={200} value={w} onChange={(e) => setW(+e.target.value)} className="lx-input" /></label>
            <label className="flex flex-col gap-2 text-[13px] text-ash">{t.pc_h}<input type="number" min={1} max={200} value={h} onChange={(e) => setH(+e.target.value)} className="lx-input" /></label>
          </div>
          <div className="flex flex-col gap-2 text-[13px] text-ash">{t.pc_detail}<Seg value={detail} set={setDetail} labels={[t.pc_simple, t.pc_medium, t.pc_complex]} /></div>
          <div className="flex flex-col gap-2 text-[13px] text-ash">{t.pc_color}<Seg value={color ? 1 : 0} set={(n) => setColor(n === 1)} labels={[t.pc_bw, t.pc_colored]} /></div>
          <div className="flex flex-col gap-2 text-[13px] text-ash">{t.pc_place}<Seg value={place} set={setPlace} labels={[t.pc_easy, t.pc_mid, t.pc_hard]} /></div>
          <div className="flex flex-wrap gap-x-6">
            <Check on={cover} set={setCover} label={t.pc_cover} />
            <Check on={custom} set={setCustom} label={`${t.pc_design_fee} (+${fmt(s.fee)})`} />
          </div>
        </div>

        <details className="lx-surface-strong p-6" open>
          <summary className="cursor-pointer text-[15px] font-semibold">{t.pc_settings}</summary>
          <div className="mt-5 flex flex-col gap-5">
            <label className="flex flex-col gap-2 text-[13px] text-ash">
              {t.pc_currency}
              <select value={s.currency} onChange={(e) => setS(convert(s, e.target.value))} className="lx-input">
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </label>
            <div>
              <p className="mb-2 mt-0 text-[13px] text-ash">{t.pc_tiers}</p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
                {s.tiers.map(([cm, p], i) => (
                  <label key={cm} className="flex flex-col gap-1 rounded-xl border border-[rgba(200,200,210,0.1)] p-2.5 text-[12px] text-ash">
                    {t.pc_upto} {cm} cm
                    <input type="number" min={0} value={p} onChange={(e) => setS({ ...s, tiers: s.tiers.map((x, k) => (k === i ? [x[0], +e.target.value] : x)) as [number, number][] })} className="lx-input !min-h-9 !px-2 !text-sm" />
                  </label>
                ))}
              </div>
              <p className="mb-0 mt-2 text-[12px] leading-relaxed text-ash">{t.pc_tiers_hint}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-2 text-[13px] text-ash">{t.pc_min}<input type="number" min={0} value={s.min} onChange={(e) => setS({ ...s, min: +e.target.value })} className="lx-input" /></label>
              <label className="flex flex-col gap-2 text-[13px] text-ash">{t.pc_design_fee}<input type="number" min={0} value={s.fee} onChange={(e) => setS({ ...s, fee: +e.target.value })} className="lx-input" /></label>
            </div>
            <div className="rounded-2xl border border-[rgba(200,200,210,0.1)] p-4">
              <Check on={s.hourly} set={(b) => setS({ ...s, hourly: b })} label={t.pc_hourly_on} />
              {s.hourly && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2 text-[13px] text-ash">{t.pc_rate}<input type="number" min={0} value={s.rate} onChange={(e) => setS({ ...s, rate: +e.target.value })} className="lx-input" /></label>
                  <label className="flex flex-col gap-2 text-[13px] text-ash">{t.pc_hours}<input type="number" min={0} step={0.5} placeholder={String(estHours)} value={hoursEdit} onChange={(e) => setHoursEdit(e.target.value)} className="lx-input" /></label>
                </div>
              )}
              <p className="mb-0 mt-2 text-[12px] leading-relaxed text-ash">{t.pc_hourly_hint}</p>
            </div>
          </div>
        </details>
      </div>

      <div className="lx-surface flex min-w-0 flex-[1_1_300px] flex-col gap-4 p-6 lg:sticky lg:top-24">
        <p className="m-0 text-[13px] text-ash">{t.pc_price}</p>
        <p className="m-0 text-[clamp(34px,4vw,48px)] font-bold leading-none tabular-nums">{fmt(final)}</p>
        <div>
          {useHourly ? (
            <>
              <Row label={`${hours} ${t.hours} × ${fmt(s.rate)}`} value={fmt(hours * s.rate)} />
              {custom && <Row label={t.pc_design_fee} value={`+${fmt(s.fee)}`} />}
            </>
          ) : (
            <>
              <Row label={`${t.pc_base} (${side} cm)`} value={fmt(base)} />
              {mDetail !== 1 && <Row label={t.pc_detail} value={`×${mDetail}`} />}
              {mColor !== 1 && <Row label={t.pc_colored} value={`×${mColor}`} />}
              {mPlace !== 1 && <Row label={t.pc_place} value={`×${mPlace}`} />}
              {cover && <Row label={t.pc_cover} value={`×${mCover}`} />}
              {custom && <Row label={t.pc_design_fee} value={`+${fmt(s.fee)}`} />}
            </>
          )}
          {calculated < s.min && <Row label={t.pc_min_applied} value={fmt(s.min)} />}
          <Row label={t.pc_price} value={fmt(auto)} strong />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-[rgba(200,200,210,0.1)] p-3"><p className="m-0 text-[12px] text-ash">{t.pc_hours}</p><p className="m-0 mt-1 font-semibold">{hours} {t.hours}</p></div>
          <div className="rounded-xl border border-[rgba(200,200,210,0.1)] p-3"><p className="m-0 text-[12px] text-ash">{t.pc_sessions}</p><p className="m-0 mt-1 font-semibold">{sessions}</p></div>
        </div>
        <label className="flex flex-col gap-2 text-[13px] text-ash">
          {t.pc_manual}
          <input type="number" min={0} placeholder={String(auto)} value={manual} onChange={(e) => setManual(e.target.value)} className="lx-input" />
        </label>
        <p className="m-0 text-[12px] leading-relaxed text-ash">{t.pc_note}</p>
      </div>
    </div>
  );
}
