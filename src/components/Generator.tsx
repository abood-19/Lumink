"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { downloadDataUrl } from "@/lib/store";
import { HANDOFF_KEY } from "./Simulator2D";
import { STENCIL_HANDOFF_KEY } from "./StencilStudio";
import { FlashArt } from "./Flash";
import type { FlashName } from "@/lib/flash";

const STYLES: { id: string; name: string; art: FlashName }[] = [
  { id: "fineline", name: "Fine line", art: "sparkle" },
  { id: "blackwork", name: "Blackwork", art: "bolt" },
  { id: "traditional", name: "Traditional", art: "anchor" },
  { id: "neotrad", name: "Neo-traditional", art: "dagger" },
  { id: "realism", name: "Realism", art: "eye" },
  { id: "irezumi", name: "Irezumi", art: "waves" },
  { id: "dotwork", name: "Dotwork", art: "sun" },
  { id: "geometric", name: "Geometric", art: "star" },
  { id: "minimal", name: "Minimal", art: "heart" },
  { id: "script", name: "Script", art: "lucky" },
  { id: "sigil", name: "Cyber sigilism", art: "sigil" },
  { id: "ornamental", name: "Ornamental", art: "webs" },
];

export function Generator() {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(STYLES[0].name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    let res: Response;
    try {
      res = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: prompt.trim(), style }) });
    } catch {
      setBusy(false);
      return setError(t.gen_error);
    }
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && json.image) return setResults((r) => [json.image, ...r].slice(0, 12));
    const map: Record<string, string> = { refused: t.gen_refused, not_configured: t.gen_not_configured, no_tokens: t.no_tokens, login: t.need_login };
    setError(map[json.error as string] ?? t.gen_error);
  };

  const hand = (key: string, img: string) => {
    try { sessionStorage.setItem(key, img); } catch {}
  };

  return (
    <>
      <form onSubmit={run} className="lx-surface-strong mb-8 flex flex-col gap-4 p-6">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} required maxLength={600} placeholder={t.gen_placeholder} className="lx-input !min-h-[120px] text-base" />
        <div className="flex flex-wrap items-end gap-3">
          <fieldset className="m-0 w-full min-w-0 border-0 p-0">
            <legend className="mb-1 text-[13px] text-ash">{t.gen_style}</legend>
            <p className="mb-3 mt-0 text-[12px] text-ash">{t.gen_style_hint}</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
              {STYLES.map((st) => (
                <button key={st.id} type="button" aria-pressed={style === st.name} onClick={() => setStyle(st.name)} className={`flex items-start gap-3 rounded-xl border p-3 text-start ${style === st.name ? "border-lilac bg-[rgba(196,241,53,.14)]" : "border-[rgba(200,200,210,0.12)] hover:border-[rgba(200,200,210,0.3)]"}`}>
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-[#f3f0ea]"><FlashArt name={st.art} size={34} /></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ivory">{st.name}</span>
                    <span className="block text-[12px] leading-snug text-mist">{t[`gst_${st.id}` as keyof typeof t] as string}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
          <button type="submit" disabled={busy || !prompt.trim()} className="lx-btn lx-btn-primary">{busy ? t.gen_working : t.gen_btn}</button>
        </div>
        {error && <p role="alert" className="m-0 rounded-xl bg-[rgba(240,149,149,.1)] px-4 py-3 text-sm text-[#ffc9cc]">{error}</p>}
      </form>
      {results.length === 0 ? (
        <p className="text-mist">{t.empty}</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {results.map((img, i) => (
            <figure key={i} className="lx-surface m-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={prompt} className="block aspect-square w-full bg-white object-contain" />
              <figcaption className="flex flex-col gap-2 p-3">
                <Link href="/studio/stencil" onClick={() => hand(STENCIL_HANDOFF_KEY, img)} className="lx-btn lx-btn-ghost lx-btn-sm">{t.gen_to_stencil}</Link>
                <Link href="/studio/simulator" onClick={() => hand(HANDOFF_KEY, img)} className="lx-btn lx-btn-ghost lx-btn-sm">{t.gen_to_sim}</Link>
                <button type="button" onClick={() => downloadDataUrl(img, `lumink-sketch-${i + 1}.png`)} className="lx-btn lx-btn-ghost lx-btn-sm">{t.st_download}</button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </>
  );
}
