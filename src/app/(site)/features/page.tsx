import Link from "next/link";
import { getT } from "@/lib/i18n/t";
import { PageIntro } from "@/components/PageIntro";
import { buildTools } from "@/components/HomeBlocks";
import { ToolMenu } from "@/components/HomeClient";

export const metadata = { title: "Studio" };

export default async function FeaturesPage() {
  const t = await getT();
  return (
    <>
      <PageIntro kicker={t.s_kicker} title={t.s_title} sub={t.s_sub} />
      <section className="mx-auto max-w-[1320px] px-6 pb-16 pt-8">
        <ToolMenu tools={buildTools(t).map(({ key, title, desc, pro }) => ({ key, title, desc, pro }))} />
      </section>
      <section className="mx-auto max-w-[1320px] px-6 pb-24">
        <div className="flex justify-center">
          <Link href="/studio" className="lx-btn lx-btn-primary">{t.app_open}</Link>
        </div>
      </section>
    </>
  );
}
