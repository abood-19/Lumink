import { getT } from "@/lib/i18n/t";
import { PageIntro } from "@/components/PageIntro";
import { FEATURED_ARTISTS } from "@/lib/site";

export const metadata = { title: "Artists" };

/** Booking directory: artists listed on LUMINK, each linking to their own booking page. */
export default async function ArtistsPage() {
  const t = await getT();
  return (
    <>
      <PageIntro kicker={t.fa_kicker} title={t.fa_title} sub={t.fa_sub} />
      <section className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5 px-6 pb-24 pt-6">
        {FEATURED_ARTISTS.map((a) => (
          <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" className="group flex flex-col overflow-hidden rounded-[24px] border border-[rgba(200,200,210,0.1)] bg-[#0f0f11] transition-transform duration-300 hover:-translate-y-1">
            <div className="relative aspect-[16/9] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.cover} alt={a.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,15,17,0)_50%,rgba(15,15,17,.9)_100%)]" />
            </div>
            <div className="flex flex-1 flex-col gap-4 p-6">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.photo} alt="" className="-mt-12 h-16 w-16 rounded-full border-2 border-lilac object-cover" />
                <div>
                  <p className="m-0 font-display text-xl font-semibold tracking-[.06em]">{a.name}</p>
                  <p className="m-0 mt-1 text-sm text-ash">{t.fa_city}</p>
                </div>
              </div>
              <p className="m-0 text-[15px] text-mist">{t.fa_styles}</p>
              <span className="lx-btn lx-btn-primary mt-auto">
                {t.fa_book}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </div>
          </a>
        ))}
        <a href="/contact" className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-[rgba(200,200,210,0.25)] p-8 text-center text-mist transition-colors hover:border-lilac hover:text-white">
          <span aria-hidden="true" className="text-4xl text-lilac">+</span>
          <span className="text-lg font-semibold text-ivory">{t.fa_join}</span>
          <span className="max-w-[260px] text-sm leading-relaxed">{t.fa_join_sub}</span>
        </a>
      </section>
    </>
  );
}
