import { getT } from "@/lib/i18n/t";
import { ToolHeader } from "@/components/StudioShell";
import { ColorLab } from "@/components/ColorLab";

/** Glow (UV) design: the colour lab opened on its UV ink layer. */
export default async function StudioGlow() {
  const t = await getT();
  return (
    <>
      <ToolHeader title={t.t5} sub={t.col_glow_page} />
      <ColorLab startIn="glow" />
    </>
  );
}
