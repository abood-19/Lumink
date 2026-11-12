"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/client";
import { Wordmark } from "@/components/Logo";

/* eslint-disable @next/next/no-img-element */

/**
 * Hero. Wide screens: wordmark on the left, the studio photograph feathered into the black on the right.
 * Phones: wordmark and text, then the same photograph as a sharp framed print (no fading, no overlay).
 */
type Props = { photo: string };

export function InkHero({ photo }: Props) {
  const { t } = useI18n();
  return (
    <section className="relative isolate overflow-hidden bg-[#050505] text-ivory">
      <div className="pointer-events-none absolute inset-y-0 end-0 -z-10 hidden w-[58%] md:block">
        <img src={photo} alt="" className="lx-feather h-full w-full object-cover object-[60%_35%] contrast-[1.06] rtl:-scale-x-100" />
      </div>

      <div className="relative mx-auto grid max-w-[1320px] gap-10 px-6 pb-16 pt-14 md:min-h-[max(620px,76vh)] md:grid-cols-[minmax(0,520px)_minmax(0,1fr)] md:items-center md:pb-20 md:pt-20">
        <div className="relative z-10">
          <p className="m-0 flex items-center gap-3 text-[13px] font-medium uppercase tracking-[.18em] text-mist">
            <span className="h-px w-8 bg-lilac" />{t.ih_kicker}
          </p>
          <h1 className="m-0 mt-5" aria-label="LUMINK">
            <Wordmark height={0} accent="#c4f135" className="block h-auto w-[min(100%,480px)]" />
          </h1>
          <p className="mb-0 mt-7 max-w-[440px] font-display text-[clamp(24px,2.3vw,30px)] font-semibold leading-[1.12] tracking-[-.01em]">{t.ih_title}</p>
          <p className="mb-0 mt-4 max-w-[440px] text-[16px] leading-relaxed text-mist">{t.hh_sub}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/simulator" className="lx-btn lx-btn-primary !min-h-[52px] !px-7">{t.gh_cta}</Link>
            <Link href="#tools" className="inline-flex min-h-[52px] items-center rounded-full border border-[rgba(255,255,255,.18)] bg-[rgba(5,5,5,.4)] px-7 font-semibold text-ivory transition hover:border-lilac hover:text-lilac">{t.ih_cta2}</Link>
          </div>
        </div>

        {/* phones and tablets: the photograph as a sharp print in a viewfinder */}
        <figure className="relative m-0 md:hidden">
          <div className="relative overflow-hidden rounded-[20px] bg-[#111]">
            <img src={photo} alt={t.ih_photo_alt} className="block aspect-[4/5] w-full object-cover object-[62%_40%]" fetchPriority="high" decoding="async" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[rgba(5,5,5,.7)] to-transparent" />
            <figcaption className="absolute bottom-4 start-4 flex items-center gap-2 rounded-full bg-[rgba(5,5,5,.6)] px-3 py-1.5 text-[12px] font-medium text-ivory backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-lilac shadow-[0_0_10px_#c4f135]" />{t.ih_cap}
            </figcaption>
          </div>
          {/* viewfinder corners */}
          {["top-[-8px] start-[-8px] border-t-2 border-s-2 rounded-ss-[14px]", "top-[-8px] end-[-8px] border-t-2 border-e-2 rounded-se-[14px]", "bottom-[-8px] start-[-8px] border-b-2 border-s-2 rounded-es-[14px]", "bottom-[-8px] end-[-8px] border-b-2 border-e-2 rounded-ee-[14px]"].map((c) => (
            <span key={c} aria-hidden="true" className={`pointer-events-none absolute h-8 w-8 border-lilac ${c}`} />
          ))}
        </figure>
      </div>
    </section>
  );
}

/** The glass tattoo pen, in its own calm section near the end of the page. Drag or shake it and the ink sloshes. */
export function PenShowcase() {
  const { t } = useI18n();
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let dispose: (() => void) | undefined;
    let dead = false;
    // only build the 3D pen when the section comes near the screen
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || dispose || dead) return;
      io.disconnect();
      import("@/lib/three/inkPen").then(({ mountInkPen }) => {
        if (dead) return;
        try { dispose = mountInkPen(el); } catch { el.dataset.fallback = "1"; }
      }).catch(() => { el.dataset.fallback = "1"; });
    }, { rootMargin: "300px 0px" });
    io.observe(el);
    return () => { dead = true; io.disconnect(); dispose?.(); };
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#050505] text-ivory">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[60%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(196,241,53,.12),transparent)] blur-2xl" />
      <div className="relative mx-auto flex max-w-[1320px] flex-col items-center px-6 py-16 text-center md:py-20">
        <p className="m-0 flex items-center gap-3 text-[13px] font-medium uppercase tracking-[.18em] text-mist">
          <span className="h-px w-8 bg-lilac" />{t.ih_pen}<span className="h-px w-8 bg-lilac" />
        </p>
        <div ref={host} role="img" aria-label={t.ih_pen} className="relative mt-4 h-[280px] w-full max-w-[720px] cursor-grab touch-pan-y active:cursor-grabbing data-[fallback]:hidden md:h-[340px]" />
        <p className="m-0 mt-2 text-[14px] text-ash">{t.ih_hint}</p>
      </div>
    </section>
  );
}
