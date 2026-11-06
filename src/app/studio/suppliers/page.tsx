import { getT } from "@/lib/i18n/t";
import { ToolHeader } from "@/components/StudioShell";
import { SupplierBoard } from "@/components/SupplierBoard";
import { IDEAS, LOCAL, ONLINE } from "@/lib/suppliers";

export default async function StudioSuppliers() {
  const t = await getT();
  return (
    <>
      <ToolHeader title={t.sup_title} sub={t.sup_verify} />
      <SupplierBoard
        open={t.sup_open}
        groups={[
          { key: "local", title: t.sup_local, items: LOCAL },
          { key: "online", title: t.sup_online, items: ONLINE },
          { key: "ideas", title: t.sup_ideas, items: IDEAS },
        ]}
      />
    </>
  );
}
