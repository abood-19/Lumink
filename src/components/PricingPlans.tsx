"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { PLANS, type PlanId } from "@/lib/plans";

export function PricingPlans() {
  const { t } = useI18n();
  const [faq, setFaq] = useState(-1);
  const rows: { id: PlanId; desc: string; tokens: string; features: string[]; cta: string }[] = [
    { id: "free", desc: t.free_desc, tokens: t.tok_free, features: t.free_f, cta: t.cta_free },
    { id: "pro", desc: t.pro_desc, tokens: t.tok_pro, features: t.pro_f, cta: t.cta_pro },
    { id: "gold", desc: t.gold_desc, tokens: t.tok_gold, features: t.gold_f, cta: t.cta_gold },
  ];

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] items-stretch gap-4">
        {rows.map((p) => {
          const plan = PLANS[p.id];
          const featured = p.id === "pro";
          return (
            <article key={p.id} className={`relative flex flex-col gap-5 rounded-3xl p-8 ${featured ? "border border-lilac bg-[rgba(20,26,9,.85)]" : "lx-surface"}`}>
              {featured && <span className="absolute -top-3 start-8 rounded-full bg-lilac px-3 py-1 text-xs font-semibold text-[#0b0b0d]">{t.popular}</span>}
              <div>
                <h2 className="m-0 font-display text-[22px] font-medium">{plan.name}</h2>
                <p className="mt-2 text-sm text-ash">{p.desc}</p>
              </div>
              <div>
                <p dir="ltr" className="m-0 flex items-baseline gap-2 rtl:justify-end">
                  <span className="text-[52px] font-bold leading-none tracking-tight">{plan.price ? `$${plan.price.toFixed(2)}` : t.price_free}</span>
                  {plan.period && <span className="text-sm text-ash">{plan.period === "year" ? t.per_year : t.per_month}</span>}
                </p>
                {p.id === "gold" && <p className="m-0 mt-2 text-sm text-lilac-soft">{t.gold_note}</p>}
              </div>
              <p className="m-0 rounded-xl bg-[rgba(210,210,220,.08)] px-3.5 py-3 text-sm text-[#e8e8ee]">{p.tokens}</p>
              <ul className="m-0 flex flex-1 list-none flex-col gap-3 p-0">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[15px] leading-snug text-[#e2e2e8]">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="mt-0.5 flex-none"><path d="M4 9.5l3 3 7-7" stroke="#c4f135" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={p.id === "free" ? "/login" : `/studio/billing?plan=${p.id}`} className={`lx-btn ${featured ? "lx-btn-primary" : "lx-btn-ghost"}`}>
                {p.cta}
              </Link>
            </article>
          );
        })}
      </div>
      <section id="faq" className="mx-auto mt-20 max-w-[820px] scroll-mt-28">
        <h2 className="mb-5 text-[28px] font-bold">{t.faq_title}</h2>
        {t.faq.map(([q, a], k) => (
          <div key={q} className="border-t border-[rgba(200,200,210,0.10)]">
            <button type="button" aria-expanded={faq === k} onClick={() => setFaq(faq === k ? -1 : k)} className="flex min-h-16 w-full items-center justify-between gap-4 text-start text-[17px] font-medium">
              {q}
              <span aria-hidden="true" className="text-2xl text-lilac">{faq === k ? "−" : "+"}</span>
            </button>
            {faq === k && <p className="mb-5 mt-0 text-[15px] leading-relaxed text-mist">{a}</p>}
          </div>
        ))}
      </section>
    </>
  );
}
