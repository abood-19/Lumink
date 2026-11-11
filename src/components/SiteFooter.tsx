"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { SOCIALS } from "@/lib/site";
import { usePathname } from "next/navigation";
import { Arrow } from "./Decor";
import { InkMachineMark, Wordmark } from "./Logo";
import { FlashDraw } from "./FlashDraw";

export function SocialIcon({ d, color = "#f3f3f5", size = 18 }: { d: string; color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill={color} />
    </svg>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  const path = usePathname();
  const link = "flex min-h-9 items-center text-[15px] text-[#cacad2] hover:text-lilac";
  return (
    <>
      {path !== "/" && (
        <section className="mx-auto max-w-[1320px] px-6 pb-20">
          <div className="flex flex-wrap items-center justify-between gap-7 bg-lilac px-8 py-12 text-night md:px-12">
            <div className="min-w-0 flex-[1_1_460px]">
              <h2 className="m-0 font-display text-[clamp(26px,3.2vw,42px)] font-bold leading-tight tracking-[-.02em]">{t.band_title}</h2>
              <p className="mt-3 text-base text-[rgba(10,11,9,.75)]">{t.band_sub}</p>
            </div>
            <Link href="/login" className="lx-btn lx-btn-dark">{t.band_cta} <Arrow /></Link>
          </div>
        </section>
      )}
      <footer className="grid border-t border-[rgba(255,255,255,.08)] bg-night md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
        <div className="relative flex min-h-[420px] items-end justify-center overflow-hidden bg-lilac p-8 md:p-12" dir="ltr">
          <FlashDraw />
          <div className="relative w-full max-w-[420px]"><InkMachineMark className="lx-machine-buzz h-auto w-full" /></div>
        </div>
        <div className="flex flex-col gap-10 px-6 py-14 md:px-14">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div dir="ltr" className="inline-block"><Wordmark height={34} /></div>
              <p className="mb-0 mt-4 max-w-[340px] text-sm leading-relaxed text-ash">{t.foot_tag}</p>
            </div>
            <div className="flex gap-2">
              {SOCIALS.map((s) => (
                <a key={s.name} href={s.href} aria-label={s.name} className="flex h-11 w-11 items-center justify-center border border-[rgba(200,200,210,0.18)] hover:border-lilac">
                  <SocialIcon d={s.icon} color={s.color} />
                </a>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div className="flex flex-col">
              <p className="mb-2 mt-0 text-[13px] text-ash">{t.foot_product}</p>
              <Link href="/simulator" className={link}>{t.nav_sim}</Link>
              <Link href="/features" className={link}>{t.nav_studio}</Link>
              <Link href="/community" className={link}>{t.nav_community}</Link>
              <Link href="/artists" className={link}>{t.nav_artists}</Link>
              <Link href="/pricing" className={link}>{t.nav_pricing}</Link>
            </div>
            <div className="flex flex-col">
              <p className="mb-2 mt-0 text-[13px] text-ash">{t.foot_company}</p>
              <Link href="/about" className={link}>{t.nav_about}</Link>
              <Link href="/help" className={link}>{t.nav_help}</Link>
              <Link href="/contact" className={link}>{t.nav_contact}</Link>
            </div>
            <div className="flex flex-col">
              <p className="mb-2 mt-0 text-[13px] text-ash">{t.foot_legal}</p>
              <Link href="/privacy" className={link}>{t.privacy}</Link>
              <Link href="/terms" className={link}>{t.terms_link}</Link>
            </div>
          </div>
          <p className="m-0 border-t border-[rgba(200,200,210,0.08)] pt-5 text-[13px] text-ash">{t.rights}</p>
        </div>
      </footer>
    </>
  );
}
