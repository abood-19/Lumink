import { getT } from "@/lib/i18n/t";
import { ToolHeader } from "@/components/StudioShell";
import { StencilStudio } from "@/components/StencilStudio";

export default async function StudioStencil() {
  const t = await getT();
  return (
    <>
      <ToolHeader title={t.t2} sub={t.t2d} />
      <StencilStudio />
    </>
  );
}
