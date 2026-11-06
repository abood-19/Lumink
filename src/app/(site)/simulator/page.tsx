import { getT } from "@/lib/i18n/t";
import { PageIntro } from "@/components/PageIntro";
import { SimulatorHub } from "@/components/SimulatorHub";

export const metadata = { title: "Simulator" };

export default async function SimulatorPage() {
  const t = await getT();
  return (
    <>
      <PageIntro kicker={t.sim_kicker} title={t.sim_title} sub={t.sim_sub} />
      <section className="mx-auto max-w-[1320px] px-6 pb-24 pt-4">
        <SimulatorHub />
      </section>
    </>
  );
}
