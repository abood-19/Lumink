import { getT } from "@/lib/i18n/t";
import { PageIntro } from "@/components/PageIntro";

export const metadata = { title: "Terms" };

// The legal text must be written (or reviewed) by a lawyer before launch.
export default async function TermsPage() {
  const t = await getT();
  return (
    <>
      <PageIntro kicker={t.foot_legal} title={t.terms_link} />
      <section className="mx-auto max-w-[820px] px-6 pb-24 text-[15px] leading-relaxed text-mist">
        <p>[Terms of service text — to be provided before launch.]</p>
      </section>
    </>
  );
}
