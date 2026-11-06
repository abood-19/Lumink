import { getT } from "@/lib/i18n/t";
import { Kicker, LeoSignature } from "@/components/Decor";

export const metadata = { title: "About" };

export default async function AboutPage() {
  const t = await getT();
  const values = [1, 2, 3].map((n) => ({ title: t[`v${n}` as "v1"], desc: t[`v${n}d` as "v1d"] }));
  return (
    <>
      <section className="lx-up mx-auto flex max-w-[1240px] flex-wrap items-end gap-14 px-6 pb-16 pt-20">
        <div className="min-w-0 flex-[1_1_560px]">
          <Kicker>{t.a_kicker}</Kicker>
          <h1 className="m-0 text-[clamp(36px,5vw,66px)] font-bold leading-[1.04] tracking-[-.03em]">{t.a_title}</h1>
          <p className="mt-7 max-w-[620px] text-lg leading-relaxed text-[#cacad2]">{t.a_p1}</p>
          <p className="mt-4 max-w-[620px] text-lg leading-relaxed text-[#cacad2]">{t.a_p2}</p>
        </div>
        <figure className="lx-surface m-0 flex-[0_1_320px] p-7">
          <LeoSignature className="w-full" />
          <figcaption className="mt-2.5 text-sm text-ash">Leo — {t.a_founder} · Tashkent</figcaption>
        </figure>
      </section>
      <section className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 px-6 pb-24">
        {values.map((v) => (
          <article key={v.title} className="lx-card-light p-8">
            <h2 className="mb-2.5 text-xl font-semibold">{v.title}</h2>
            <p className="m-0 text-[15px] leading-relaxed text-mist">{v.desc}</p>
          </article>
        ))}
      </section>
    </>
  );
}
