import { getT } from "@/lib/i18n/t";
import { PageIntro } from "@/components/PageIntro";
import { PricingPlans } from "@/components/PricingPlans";

export const metadata = { title: "Pricing" };

export default async function PricingPage() {
  const t = await getT();
  return (
    <>
      <PageIntro kicker={t.hp_kicker} title={t.pr_title} sub={t.pr_sub} center />
      <section className="mx-auto max-w-[1240px] px-6 pb-24 pt-6">
        <PricingPlans />
      </section>
    </>
  );
}
