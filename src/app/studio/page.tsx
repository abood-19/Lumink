import Link from "next/link";
import { getT } from "@/lib/i18n/t";
import { ToolGrid, ToolHeader } from "@/components/StudioShell";
import { getProfile } from "@/lib/supabase/server";

export default async function StudioHome() {
  const t = await getT();
  const profile = await getProfile();
  return (
    <>
      <ToolHeader title={profile?.display_name ? `${t.dash_title}, ${profile.display_name}` : t.dash_title} sub={t.dash_sub} />
      {profile && !profile.lifetime && (
        <div className="lx-surface mb-8 flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="m-0 text-lg">
            <span className="text-3xl font-bold">{profile.tokens}</span> <span className="text-mist">{t.tokens_left}</span>
          </p>
          <Link href="/pricing" className="lx-btn lx-btn-ghost lx-btn-sm">{t.upgrade}</Link>
        </div>
      )}
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[.12em] text-[#c4f135]">{t.dash_quick}</h2>
      <ToolGrid />
    </>
  );
}
