"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { downloadDataUrl } from "@/lib/store";
import { HANDOFF_KEY } from "./Simulator2D";
import { STENCIL_HANDOFF_KEY } from "./StencilStudio";
import { autoMode, tattooPrompt } from "@/lib/genPrompt";

/** Free fallback that works from the browser with no keys (static site, or before the server keys are set). */
const FREE_IMG = "https://image.pollinations.ai/prompt/";
const FREE_TXT = "https://text.pollinations.ai/";

async function withTimeout(url: string, ms: number) {
  const c = new AbortController(); const id = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { signal: c.signal }); } finally { clearTimeout(id); }
}

async function freeEnglish(text: string) {
  if (!/[^\x00-\x7F]/.test(text)) return text;
  try {
    const q = `Translate this tattoo idea into one short English description for an image model. Keep every detail, add nothing. Reply with the description only: ${text}`;
    const r = await withTimeout(FREE_TXT + encodeURIComponent(q) + "?referrer=lumink", 12000);
    const out = r.ok ? (await r.text()).trim() : "";
    return out && out.length < 600 ? out : text;
  } catch { return text; }
}

async function freeGenerate(text: string): Promise<string> {
  const prompt = tattooPrompt(await freeEnglish(text), autoMode(text));
  const url = `${FREE_IMG}${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&nologo=true&seed=${Math.floor(Math.random() * 1e9)}&referrer=lumink`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await withTimeout(url, 90000);
      if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 16000)); continue; } // anonymous tier: one image per ~15 s
      if (!r.ok) throw new Error(String(r.status));
      const blob = await r.blob();
      return await new Promise<string>((ok, bad) => { const fr = new FileReader(); fr.onload = () => ok(fr.result as string); fr.onerror = bad; fr.readAsDataURL(blob); });
    } catch (e) { if (attempt === 1) throw e; }
  }
  throw new Error("busy");
}

export function Generator() {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [left, setLeft] = useState<string | number | null>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = prompt.trim(); if (!text) return;
    setBusy(true);
    setError(null);
    const add = (img: string) => setResults((r) => [img, ...r].slice(0, 12));
    // 1. our server (Cloudflare / Gemini, counts the plan's tokens)
    let json: { image?: string; remaining?: string | number; error?: string } = {};
    let serverDown = false;
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: text }) });
      json = await res.json().catch(() => ({ error: "down" }));
      if (res.ok && json.image) { if (json.remaining != null) setLeft(json.remaining); add(json.image); setBusy(false); return; }
      serverDown = res.status === 404 || res.status === 405 || json.error === "not_configured" || json.error === "failed" || json.error === "down";
    } catch { serverDown = true; }
    if (!serverDown) {
      setBusy(false);
      const map: Record<string, string> = { refused: t.gen_refused, no_tokens: t.no_tokens, login: t.need_login, daily_cap: t.gen_daily_cap };
      return setError(map[json.error as string] ?? t.gen_error);
    }
    // 2. no server or no keys yet: the free generator straight from the browser
    try { add(await freeGenerate(text)); }
    catch { setError(t.gen_error); }
    setBusy(false);
  };

  const hand = (key: string, img: string) => {
    try { sessionStorage.setItem(key, img); } catch {}
  };

  return (
    <>
      <form onSubmit={run} className="lx-surface-strong mb-8 flex flex-col gap-4 p-6">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} required maxLength={600} placeholder={t.gen_placeholder} className="lx-input !min-h-[120px] text-base" />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || !prompt.trim()} className="lx-btn lx-btn-primary w-full sm:w-auto">{busy ? t.gen_working : t.gen_btn}</button>
          {left != null && <span className="text-[13px] text-mist">{left === "unlimited" ? t.gen_unlimited : `${t.gen_left}: ${left}`}</span>}
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
