import Link from "next/link";
import { getT } from "@/lib/i18n/t";
import { Arrow } from "@/components/Decor";
import { AdsStrip } from "@/components/HomeExtras";
import { CrossBands, buildTools } from "@/components/HomeBlocks";
import { DepthGallery, ToolMenu, type DepthShot } from "@/components/HomeClient";
import { InkHero, PenShowcase } from "@/components/InkHero";
import { PLANS } from "@/lib/plans";

/* eslint-disable @next/next/no-img-element */

export default async function Home() {
  const t = await getT();
  const tools = buildTools(t).map(({ key, title, desc, pro }) => ({ key, title, desc, pro }));
  // All rendered in the LUMINK 3D studio with our own designs.
  // Free-license photographs from Pexels (pexels.com/license), one per slot, no repeats.
  const shots: DepthShot[] = [
    { src: "/photos/p-20267346.jpg", alt: t.gp_1 }, { src: "/photos/p-19257754.jpg", alt: t.gp_2 }, { src: "/photos/p-12802253.jpg", alt: t.gp_3 },
    { src: "/photos/p-7005723.jpg", alt: t.gp_4 }, { src: "/photos/p-35645871.jpg", alt: t.gp_5 }, { src: "/photos/p-29616935.jpg", alt: t.gp_6 },
    { src: "/photos/p-28991534.jpg", alt: t.gp_7 }, { src: "/photos/p-7005787.jpg", alt: t.gp_8 }, { src: "/photos/p-40444269.jpg", alt: t.gp_9 },
    { src: "/photos/p-8349189.jpg", alt: t.gp_10 }, { src: "/photos/p-19474851.jpg", alt: t.gp_11 }, { src: "/photos/p-10197868.jpg", alt: t.gp_12 },
  ];

  return (
    <>
      <InkHero photo="/photos/p-13346118.jpg" />

      <CrossBands words={["Simulator", "Stencil", "Flash", "Blackwork", "Fine line", "Lettering", "Color"]} />

      {/* ABOUT */}
      <section className="lx-reveal mx-auto grid max-w-[1320px] items-center gap-10 px-6 py-28 md:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)] md:gap-16">
        <img src="/photos/p-6593449.jpg" alt="" className="aspect-[1400/935] w-full rounded-[18px] object-cover" />
        <div>
          <h2 className="m-0 font-display text-[clamp(30px,3.8vw,52px)] font-bold leading-[1.02] tracking-[-.02em]">{t.ab_title}</h2>
          <p className="mt-7 max-w-[560px] text-[clamp(19px,1.8vw,24px)] font-medium leading-snug text-ivory">{t.ab_p1}</p>
          <p className="mt-5 max-w-[560px] text-[17px] leading-relaxed text-mist">{t.ab_p2}</p>
          <dl className="mt-10 grid max-w-[560px] grid-cols-3 border-t border-[rgba(255,255,255,.1)]">
            {[["4", t.ab_s1], ["18", t.ab_s2], ["2D", t.ab_s3]].map(([n, l]) => (
              <div key={l} className="pe-4 pt-5">
                <dt className="font-display text-[34px] font-bold text-lilac" dir="ltr">{n}</dt>
                <dd className="m-0 mt-1 text-[13px] leading-snug text-mist">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* SIMULATOR — short */}
      <section className="lx-reveal mx-auto max-w-[1320px] px-6 pb-24">
        <Link href="/simulator" className="group grid items-stretch overflow-hidden rounded-[18px] bg-lilac text-night sm:h-[260px] sm:grid-cols-[minmax(0,1fr)_240px]">
          <div className="flex flex-col justify-center p-8 md:p-10">
            <h2 className="m-0 font-display text-[clamp(24px,2.8vw,36px)] font-bold leading-[1.05] tracking-[-.02em]">{t.sim2_short_t}</h2>
            <p className="mb-0 mt-3 max-w-[520px] text-[16px] text-[rgba(10,11,9,.75)]">{t.sim2_short_d}</p>
            <span className="lx-btn lx-btn-dark mt-6 !min-h-11 self-start">{t.sim3_cta} <Arrow /></span>
          </div>
          <img src="/photos/p-35554665.jpg" alt="" className="h-[220px] w-full object-cover sm:h-[260px]" />
        </Link>
      </section>

      {/* GALLERY — floating 3D gallery */}
      <DepthGallery shots={shots} title={t.gal_title} sub={t.gal_sub} />

      {/* TOOLS — printed menu */}
      <section id="tools" className="lx-reveal scroll-mt-24 mx-auto max-w-[1320px] px-6 pb-28">
        <h2 className="m-0 font-display text-[clamp(30px,3.8vw,52px)] font-bold leading-[1.02] tracking-[-.02em]">{t.tm_title}</h2>
        <p className="mb-12 mt-4 max-w-[560px] text-[17px] text-mist">{t.tm_sub}</p>
        <ToolMenu tools={tools} />
      </section>

      {/* PRICING — two fields */}
      <section className="lx-reveal mx-auto max-w-[1320px] px-6 pb-28">
        <h2 className="m-0 font-display text-[clamp(30px,3.8vw,52px)] font-bold leading-[1.02] tracking-[-.02em]">{t.pr_title}</h2>
        <p className="mb-10 mt-4 max-w-[620px] text-[17px] text-mist">{t.pr_free}</p>
        <div className="grid overflow-hidden rounded-[18px] md:grid-cols-2">
          {(["pro", "gold"] as const).map((id) => (
            <Link key={id} href={`/studio/billing?plan=${id}`} className={`group flex min-h-[300px] flex-col justify-between p-8 md:p-12 ${id === "pro" ? "bg-lilac text-night" : "bg-[#151612] text-ivory"}`}>
              <div>
                <p className="m-0 font-display text-[22px] font-semibold">{PLANS[id].name}</p>
                <p className={`m-0 mt-2 text-[15px] ${id === "pro" ? "text-[rgba(10,11,9,.7)]" : "text-mist"}`}>{id === "pro" ? t.pro_desc : t.gold_desc}</p>
              </div>
              <div>
                <p dir="ltr" className="m-0 flex items-baseline gap-2 rtl:justify-end">
                  <span className="font-display text-[clamp(48px,6vw,80px)] font-bold leading-none tracking-[-.03em]">${PLANS[id].price.toFixed(2)}</span>
                  <span className="text-[15px]">{PLANS[id].period === "year" ? t.per_year : t.per_month}</span>
                </p>
                {id === "gold" && <p className="m-0 mt-2 text-sm text-lilac">{t.gold_note}</p>}
                <span className="mt-6 inline-flex items-center gap-2 font-semibold">{id === "pro" ? t.cta_pro : t.cta_gold} <Arrow /></span>
              </div>
            </Link>
          ))}
        </div>
        <Link href="/pricing" className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-lilac hover:text-white">{t.hp_link} <Arrow /></Link>
      </section>

      <AdsStrip t={t} />

      <PenShowcase />

      {/* CTA */}
      <section className="bg-lilac text-night">
        <div className="mx-auto grid max-w-[1320px] items-center gap-10 px-6 py-20 md:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)]">
          <div>
            <h2 className="m-0 font-display text-[clamp(32px,4.4vw,64px)] font-bold leading-[1] tracking-[-.02em]">{t.cta_t}</h2>
            <p className="mt-5 max-w-[540px] text-[17px] leading-relaxed text-[rgba(10,11,9,.75)]">{t.cta_sub}</p>
            <Link href="/login" className="lx-btn lx-btn-dark mt-8 !min-h-[54px] !px-8">{t.h_cta1} <Arrow /></Link>
          </div>
          <img src="/designs/oni.png" alt="" className="mx-auto max-h-[420px] w-auto mix-blend-multiply max-md:max-h-[300px]" />
        </div>
      </section>
    </>
  );
}
