import Link from "next/link";
import { getT } from "@/lib/i18n/t";
import { PageIntro } from "@/components/PageIntro";
import { ColorTheory } from "@/components/ColorTheory";

export const metadata = { title: "Help" };

export default async function HelpPage() {
  const t = await getT();
  const toc: [string, string][] = [["wheel", t.ct_s1], ["value", t.ct_s2], ["families", t.ct_s3], ["skin", t.ct_s4], ["rules", t.ct_s5]];
  return (
    <>
      <PageIntro kicker={t.help_kicker} title={t.help_title} sub={t.help_sub} />
      <section className="mx-auto grid max-w-[1320px] gap-10 px-6 pb-16 pt-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
        <nav aria-label={t.ct_toc} className="lg:sticky lg:top-28 lg:self-start">
          <p className="m-0 mb-3 text-[13px] text-ash">{t.ct_toc}</p>
          <ol className="lx-hscroll m-0 flex list-none gap-5 p-0 lg:flex-col lg:gap-0">
            {toc.map(([id, label]) => (
              <li key={id} className="flex-none"><a href={`#${id}`} className="flex min-h-10 items-center border-s-2 border-[rgba(255,255,255,.1)] ps-3 text-[15px] text-mist hover:border-lilac hover:text-ivory">{label}</a></li>
            ))}
            <li className="flex-none"><Link href="/studio/colors" className="flex min-h-10 items-center border-s-2 border-transparent ps-3 text-[15px] font-semibold text-lilac">{t.nav_studio} →</Link></li>
          </ol>
        </nav>
        <ColorTheory />
      </section>
      <section className="mx-auto max-w-[1320px] px-6 pb-24">
        <div className="flex flex-wrap items-center justify-between gap-6 border border-[rgba(255,255,255,.08)] bg-[#0f110d] p-8">
          <div>
            <p className="m-0 text-xl font-semibold">{t.help_more}</p>
            <p className="m-0 mt-2 text-[15px] text-mist">{t.help_more_sub}</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/pricing#faq" className="lx-btn lx-btn-ghost">{t.faq_title}</Link>
            <Link href="/contact" className="lx-btn lx-btn-primary">{t.nav_contact}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
