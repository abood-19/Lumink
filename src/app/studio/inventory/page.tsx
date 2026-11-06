import { getT } from "@/lib/i18n/t";
import { ToolHeader } from "@/components/StudioShell";
import { Inventory } from "@/components/Inventory";

export default async function StudioInventory() {
  const t = await getT();
  return (
    <>
      <ToolHeader title={t.t7} sub={t.t7d} />
      <Inventory />
    </>
  );
}
