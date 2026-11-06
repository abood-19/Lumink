import { getT } from "@/lib/i18n/t";
import { ToolHeader } from "@/components/StudioShell";
import { SettingsForm } from "@/components/SettingsForm";

export default async function StudioSettings() {
  const t = await getT();
  return (
    <>
      <ToolHeader title={t.nav_settings} />
      <SettingsForm />
    </>
  );
}
