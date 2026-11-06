import { getT } from "@/lib/i18n/t";
import { ToolHeader } from "@/components/StudioShell";
import { SimulatorHub } from "@/components/SimulatorHub";

export default async function StudioSimulator() {
  const t = await getT();
  return (
    <>
      <ToolHeader title={t.t1} sub={t.sim_sub} />
      <SimulatorHub />
    </>
  );
}
