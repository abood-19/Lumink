import { getT } from "@/lib/i18n/t";
import { ToolHeader } from "@/components/StudioShell";
import { Clients } from "@/components/Clients";

export default async function StudioClients() {
  const t = await getT();
  return (
    <>
      <ToolHeader title={t.t6} sub={t.t6d} />
      <Clients />
    </>
  );
}
