import { getT } from "@/lib/i18n/t";
import { ToolHeader } from "@/components/StudioShell";
import { ColorLab } from "@/components/ColorLab";

export default async function StudioColors() {
  const t = await getT();
  return (
    <>
      <ToolHeader title={t.t4} sub={t.t4d} />
      <ColorLab />
    </>
  );
}
