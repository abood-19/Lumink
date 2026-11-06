"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import type { ToolKey } from "@/lib/tools";

/* eslint-disable @next/next/no-img-element */

export type MenuTool = { key: ToolKey; title: string; desc: string; pro: boolean };

const SPINE = "/designs/spine.png";
const INKS = [["#0a0b09", "Black"], ["#8e1b1b", "Blood red"], ["#1f3a5f", "Navy"], ["#3f5f2a", "Moss"], ["#c8962d", "Ochre"], ["#f2efe8", "White"]];

/** A real example for each tool — the user's own designs and studio photos, no clip art. */
export function ToolExample({ k }: { k: ToolKey }) {
  switch (k) {
    case "simulator":
      return <img src="/photos/p-34155039.jpg" alt="" className="h-full w-full object-cover" />;
    case "stencil":
      return <img src="/photos/stencil.jpg" alt="" className="h-full w-full object-cover" />;
    case "generator":
      return (
        <div className="flex h-full items-center justify-center bg-[#efece4] p-6">
          <img src="/designs/oni.png" alt="" className="h-full w-auto object-contain" />
        </div>
      );
    case "colors":
      return <img src="/photos/p-23349907.jpg" alt="" className="h-full w-full object-cover" />;
    case "glow":
      return (
        <div className="flex h-full items-center justify-center bg-[#050605] p-6">
          <span className="block h-full w-full max-w-[260px]" style={{ background: "#c4f135", WebkitMask: `url(${SPINE}) center/contain no-repeat`, mask: `url(${SPINE}) center/contain no-repeat`, filter: "drop-shadow(0 0 6px rgba(196,241,53,.8))" }} />
        </div>
      );
    case "clients":
      return (
        <div className="flex h-full items-center justify-center bg-[#efece4] p-6 text-[#151511]">
          <div dir="ltr" className="w-full max-w-[280px] font-mono text-[12px] leading-6">
            <p className="m-0 border-b border-dashed border-[#8b8a80] pb-2 font-sans text-[15px] font-semibold">Aziza R. · +998 90 ••• 41 07</p>
            <p className="m-0 mt-2 flex justify-between"><span>Placement</span><span>Forearm, inner</span></p>
            <p className="m-0 flex justify-between"><span>Size</span><span>9 × 22 cm</span></p>
            <p className="m-0 flex justify-between"><span>Session</span><span>2 of 3</span></p>
            <p className="m-0 flex justify-between"><span>Consent</span><span>signed ✓</span></p>
            <svg viewBox="0 0 160 30" className="mt-2 w-28" aria-hidden="true"><path d="M4 22C14 4 20 28 30 14S44 6 50 18 70 26 80 10 100 20 116 12" fill="none" stroke="#151511" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </div>
        </div>
      );
    case "inventory":
      return (
        <div className="flex h-full items-center justify-center bg-[#efece4] p-6 text-[#151511]">
          <div dir="ltr" className="w-full max-w-[300px] text-[13px]">
            {[["Black lining ink, 240 ml", 72], ["Grey wash set, 4 × 30 ml", 40], ["Cartridges 1209RL, box", 15], ["Cartridges 1207RM, box", 64], ["Barrier film, roll", 88]].map(([n, v]) => (
              <div key={n as string} className="border-b border-dashed border-[#a9a79d] py-2.5">
                <div className="flex justify-between gap-3"><span>{n}</span><span className={`font-mono ${(v as number) < 20 ? "font-bold text-[#a3261c]" : ""}`}>{v}%</span></div>
                <div className="mt-1.5 h-1 bg-[#d8d5cb]"><div className={`h-full ${(v as number) < 20 ? "bg-[#a3261c]" : "bg-[#151511]"}`} style={{ width: `${v}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      );
    case "price":
      return (
        <div className="flex h-full items-center justify-center bg-[#efece4] p-6 text-[#151511]">
          <div dir="ltr" className="w-full max-w-[260px] font-mono text-[12px] leading-6">
            <p className="m-0 flex justify-between"><span>Base, 22 cm</span><span>$258</span></p>
            <p className="m-0 flex justify-between"><span>Detail ×1.3</span><span>$335</span></p>
            <p className="m-0 flex justify-between"><span>Placement ×1.15</span><span>$386</span></p>
            <p className="m-0 flex justify-between"><span>Design</span><span>+$20</span></p>
            <p className="m-0 mt-2 flex justify-between border-t border-dashed border-[#8b8a80] pt-2 text-[18px] font-bold"><span>Total</span><span>$405</span></p>
            <p className="m-0 mt-1 text-[#6b6a62]">≈ 5 140 000 UZS · 3 sessions</p>
          </div>
        </div>
      );
    default:
      return null;
  }
}

/** Tools as a printed menu: tap a row to see its example; the button opens the tool. */
export function ToolMenu({ tools }: { tools: MenuTool[] }) {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const cur = tools[active];
  const href = (k: ToolKey) => (k === "simulator" ? "/simulator" : `/studio/${k}`);
  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,.9fr)] md:gap-16">
      <ol className="m-0 list-none p-0">
        {tools.map((tl, i) => (
          <li key={tl.key} className="border-b border-[rgba(255,255,255,.09)]">
            <button type="button" aria-expanded={i === active} onClick={() => setActive(i)} onMouseEnter={() => setActive(i)} className="block w-full py-5 text-start">
              <span className="flex items-baseline gap-3">
                <span className={`font-display text-[clamp(20px,2.2vw,28px)] font-semibold tracking-[-.01em] transition-colors ${i === active ? "text-lilac" : "text-ivory"}`}>{tl.title}</span>
                <span aria-hidden="true" className="mb-1.5 flex-1 border-b border-dotted border-[rgba(255,255,255,.22)]" />
                <span className={`text-[13px] font-semibold ${tl.pro ? "text-lilac" : "text-mist"}`}>{tl.pro ? "Pro" : "Free"}</span>
              </span>
              <span className={`block overflow-hidden text-[15px] leading-relaxed text-mist transition-all duration-500 ${i === active ? "mt-2 max-h-28 opacity-100" : "max-h-0 opacity-0"}`}>{tl.desc}</span>
            </button>
            {i === active && (
              <div className="pb-5 md:hidden">
                <span className="block aspect-[4/3] overflow-hidden rounded-[14px]"><ToolExample k={tl.key} /></span>
                <Link href={href(tl.key)} className="lx-btn lx-btn-primary mt-4 !min-h-11">{t.app_open} · {tl.title}</Link>
              </div>
            )}
          </li>
        ))}
      </ol>
      <div className="relative hidden md:block">
        <div className="sticky top-28">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[18px]">
            {tools.map((tl, i) => (
              <div key={tl.key} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: i === active ? 1 : 0 }} aria-hidden={i !== active}>
                <ToolExample k={tl.key} />
              </div>
            ))}
          </div>
          <Link href={href(cur.key)} className="lx-btn lx-btn-primary mt-4 !min-h-11">{t.app_open} · {cur.title}</Link>
        </div>
      </div>
    </div>
  );
}

export type Shot = { src: string; alt: string };

/** Moving strip of tattoo photography, two rows in opposite directions. Pauses on hover; a photo that fails to load is dropped. */
export function WorkStrip({ shots }: { shots: Shot[] }) {
  const [broken, setBroken] = useState<string[]>([]);
  const list = shots.filter((s) => !broken.includes(s.src));
  const half = Math.ceil(list.length / 2);
  const rows = [list.slice(0, half), list.slice(half)];
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, r) => row.length > 0 && (
        <div key={r} dir="ltr" className="overflow-hidden">
          <div className={`${r ? "lx-tick-rev" : "lx-tick"} flex w-max gap-3 [animation-duration:90s] hover:[animation-play-state:paused]`}>
            {[...row, ...row, ...row].map((s, i) => (
              <div key={i} aria-hidden={i >= row.length} className="group h-[260px] w-[200px] flex-none overflow-hidden bg-[#151612] sm:h-[400px] sm:w-[300px]">
                <img
                  src={s.src}
                  alt={i < row.length ? s.alt : ""}
                  loading="lazy"
                  onError={() => setBroken((b) => (b.includes(s.src) ? b : [...b, s.src]))}
                  className="h-full w-full object-cover grayscale-[35%] transition-[transform,filter] duration-700 group-hover:scale-[1.04] group-hover:grayscale-0"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export type DepthShot = { src: string; alt: string };

/** Photos float at different depths and glide past the viewer as you scroll. */
export function DepthGallery({ shots, title, sub }: { shots: DepthShot[]; title: string; sub: string }) {
  const half = Math.ceil(shots.length / 2);
  const rows = [shots.slice(0, half), shots.slice(half)];
  return (
    <section aria-label={title} className="relative overflow-hidden bg-[#080808] py-24 md:py-32">
      <div className="mx-auto mb-12 grid max-w-[1320px] gap-6 px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,.8fr)] md:items-end">
        <h2 className="m-0 font-display text-[clamp(32px,4.6vw,64px)] font-bold uppercase leading-[.98] tracking-[-0.01em] text-[#E1E5E5]">{title}</h2>
        <p className="m-0 max-w-[460px] text-[17px] leading-relaxed text-[#C0C4C6] md:justify-self-end">{sub}</p>
      </div>
      <div className="flex flex-col gap-4" dir="ltr">
        {rows.map((row, r) => (
          <div key={r} className="group/row overflow-hidden">
            <div className={`${r ? "lx-tick-rev" : "lx-tick"} flex w-max gap-4 group-hover/row:[animation-play-state:paused]`} style={{ animationDuration: r ? "90s" : "75s" }}>
              {[...row, ...row].map((s, i) => (
                <figure key={i} className="group relative m-0 h-[clamp(260px,34vw,440px)] shrink-0 overflow-hidden rounded-[4px] bg-[#111]" style={{ aspectRatio: i % 3 === 1 ? "4 / 3" : "4 / 5" }} aria-hidden={i >= row.length || undefined}>
                  <img src={s.src} alt={i < row.length ? s.alt : ""} loading="lazy" className="h-full w-full object-cover grayscale-[.5] transition duration-700 group-hover:scale-[1.04] group-hover:grayscale-0" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(0,0,0,.75)] to-transparent px-4 pb-3 pt-10 text-[12px] uppercase tracking-[.12em] text-[rgba(255,255,255,.75)] opacity-0 transition group-hover:opacity-100">{s.alt}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
