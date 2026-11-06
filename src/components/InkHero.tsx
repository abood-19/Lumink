"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/client";
import { Wordmark } from "@/components/Logo";

/* eslint-disable @next/next/no-img-element */

/**
 * Hero: LUMINK wordmark on the left, a large studio photograph that fades into the black on the right,
 * and a glass tattoo pen in its own column between them. Drag or shake the pen and the ink sloshes.
 */

type Props = { photo: string };

export function InkHero({ photo }: Props) {
  const { t } = useI18n();
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let dispose: (() => void) | undefined;
    let dead = false;
    import("@/lib/three/inkPen").then(({ mountInkPen }) => {
      if (dead) return;
      try { dispose = mountInkPen(el); } catch { el.dataset.fallback = "1"; }
    }).catch(() => { el.dataset.fallback = "1"; });
    return () => { dead = true; dispose?.(); };
  }, []);

  return (
    <section className="relative isolate overflow-hidden bg-[#050505] text-ivory">
      {/* photograph: large, feathered into the page so only the work itself stays sharp */}
      <div className="pointer-events-none absolute inset-y-0 end-0 -z-10 w-full md:w-[56%]">
        <img
          src={photo}
          alt={t.ih_photo_alt}
          className="lx-feather h-full w-full object-cover object-[60%_35%] opacity-90 rtl:-scale-x-100 contrast-[1.08] grayscale-[.25]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_45%,transparent_35%,rgba(5,5,5,.55)_75%)]" />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#050505] via-transparent to-[#050505] opacity-60 md:hidden" />

      <div className="relative mx-auto grid min-h-[max(600px,74vh)] max-w-[1320px] grid-rows-[auto_1fr] px-6 pb-24 pt-24 md:grid-cols-[minmax(0,500px)_minmax(0,1fr)] md:grid-rows-1 md:pb-20 md:pt-20">
        <div className="relative z-10 self-start md:pt-6">
          <p className="m-0 flex items-center gap-3 text-[13px] font-medium uppercase tracking-[.18em] text-mist">
            <span className="h-px w-8 bg-lilac" />{t.ih_kicker}
          </p>
          <h1 className="m-0 mt-5" aria-label="LUMINK">
            <Wordmark height={0} accent="#c4f135" className="block h-auto w-[min(100%,480px)]" />
          </h1>
          <p className="mb-0 mt-8 max-w-[440px] font-display text-[clamp(22px,2.2vw,30px)] font-semibold leading-[1.12] tracking-[-.01em]">{t.ih_title}</p>
          <p className="mb-0 mt-4 max-w-[440px] text-[16px] leading-relaxed text-mist">{t.hh_sub}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/simulator" className="lx-btn lx-btn-primary !min-h-[52px] !px-7">{t.gh_cta}</Link>
            <Link href="#tools" className="inline-flex min-h-[52px] items-center rounded-full border border-[rgba(255,255,255,.18)] bg-[rgba(5,5,5,.4)] px-7 font-semibold text-ivory backdrop-blur transition hover:border-lilac hover:text-lilac">{t.ih_cta2}</Link>
          </div>
        </div>

        {/* the pen gets its own column, over the dark feathered edge of the photo */}
        <div className="relative min-h-[300px] md:min-h-0">
          <div className="pointer-events-none absolute start-[20%] top-[150px] h-10 w-[60%] md:bottom-[8%] md:top-auto rounded-[50%] bg-[radial-gradient(closest-side,rgba(196,241,53,.18),transparent)] blur-md md:start-[4%] md:w-[24%]" />
          <div
            ref={host}
            role="img"
            aria-label={t.ih_pen}
            className="absolute inset-x-0 top-0 h-[200px] cursor-grab touch-none active:cursor-grabbing data-[fallback]:hidden md:inset-x-auto md:inset-y-0 md:start-0 md:h-auto md:w-[24%]"
          />
        </div>
      </div>
    </section>
  );
}
