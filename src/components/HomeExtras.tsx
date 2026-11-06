import Link from "next/link";
import type { Dict } from "@/lib/i18n";
import { Arrow } from "./Decor";

/** Ad space on the home page. The owner edits these slots. */
export function AdsStrip({ t }: { t: Dict }) {
  const ads = [
    { title: t.ad1_t, desc: t.ad1_d, cta: t.ad1_cta, href: "/pricing" },
    { title: t.ad3_t, desc: t.ad3_d, cta: t.ad3_cta, href: "/studio/generator" },
    { title: t.ad2_t, desc: t.ad2_d, cta: t.ad2_cta, href: "/contact" },
  ];
  return (
    <section aria-label={t.ad_title} className="lx-reveal mx-auto max-w-[1320px] px-6 pb-16">
      <div className="grid border-y border-[rgba(255,255,255,.1)] md:grid-cols-3">
        {ads.map((ad, i) => (
          <Link key={ad.title} href={ad.href} className={`group flex flex-col gap-3 py-8 md:px-8 ${i ? "border-[rgba(255,255,255,.1)] max-md:border-t md:border-s" : "md:ps-0"}`}>
            <span className="text-[13px] text-ash">{t.ad_tag}</span>
            <h3 className="m-0 text-xl font-semibold group-hover:text-lilac">{ad.title}</h3>
            <p className="m-0 text-[15px] leading-relaxed text-mist">{ad.desc}</p>
            <span className="mt-auto inline-flex items-center gap-2 pt-2 text-sm font-semibold text-lilac">{ad.cta} <Arrow /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
