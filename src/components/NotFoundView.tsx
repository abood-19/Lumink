"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { InkRunner } from "./InkRunner";
import { FlashArt } from "./Flash";
import type { FlashName } from "@/lib/flash";

/** Shared view for 404 and offline: a moody stage, a way home, and a game to pass the time. */
export function NotFoundView({ offline = false }: { offline?: boolean }) {
  const { t } = useI18n();
  const floats: { n: FlashName; x: string; y: string; s: number; d: string }[] = [
    { n: "moon", x: "8%", y: "18%", s: 64, d: "0s" },
    { n: "dagger", x: "84%", y: "12%", s: 70, d: "-3s" },
    { n: "spider", x: "78%", y: "62%", s: 56, d: "-6s" },
    { n: "sparkle", x: "14%", y: "70%", s: 48, d: "-2s" },
    { n: "flame", x: "50%", y: "8%", s: 44, d: "-5s" },
  ];
  return (
    <section className="relative mx-auto flex min-h-[calc(100vh-72px)] max-w-[1240px] flex-col items-center justify-center gap-10 overflow-hidden px-6 py-20 text-center">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {floats.map((f) => (
          <span key={f.n} className="lx-float absolute opacity-25" style={{ left: f.x, top: f.y, animationDelay: f.d }}>
            <FlashArt name={f.n} ink="#c4f135" paper="#0a0b09" size={f.s} stroke={1.6} />
          </span>
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className="lx-drip absolute top-0 w-[3px] rounded-b-full bg-lilac" style={{ left: `${(i * 7.3 + 4) % 100}%`, height: `${40 + ((i * 37) % 90)}px`, animationDelay: `${-i * 0.7}s`, opacity: 0.25 + (i % 4) * 0.12 }} />
        ))}
      </div>
      <div className="relative">
        <p className="m-0 font-display font-bold leading-none text-transparent" dir="ltr" style={{ fontSize: "clamp(110px, 22vw, 260px)", WebkitTextStroke: "2px #c4f135" }}>
          {offline ? "OFF" : "404"}
        </p>
        <p className="m-0 -mt-4 font-display text-[13px] uppercase tracking-[.4em] text-lilac" dir="ltr">{offline ? "no connection" : "page not found"}</p>
      </div>
      <div className="relative max-w-[560px]">
        <h1 className="m-0 text-[clamp(26px,3.4vw,40px)] font-bold">{offline ? t.off_title : t.nf_title}</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-mist">{offline ? t.off_sub : t.nf_sub}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className="lx-btn lx-btn-primary">{t.nf_home}</Link>
          <Link href="/help" className="lx-btn lx-btn-ghost">{t.nav_help}</Link>
        </div>
      </div>
      <div className="relative w-full max-w-[760px]">
        <InkRunner />
      </div>
    </section>
  );
}
