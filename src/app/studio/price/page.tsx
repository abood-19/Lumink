import { getT } from "@/lib/i18n/t";
import { ToolHeader } from "@/components/StudioShell";
import { PriceCalc } from "@/components/PriceCalc";

export default async function StudioPrice() {
  const t = await getT();
  return (
    <>
      <ToolHeader title={t.t8} sub={t.t8d} />
      <PriceCalc />
    </>
  );
}
