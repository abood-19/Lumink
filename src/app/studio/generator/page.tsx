import { getT } from "@/lib/i18n/t";
import { ToolHeader } from "@/components/StudioShell";
import { Generator } from "@/components/Generator";

export default async function StudioGenerator() {
  const t = await getT();
  return (
    <>
      <ToolHeader title={t.t3} sub={t.t3d} />
      <Generator />
    </>
  );
}
