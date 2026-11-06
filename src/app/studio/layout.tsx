import { StudioShell } from "@/components/StudioShell";
import { getProfile } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  const user = profile
    ? { name: profile.display_name || "Artist", plan: PLANS[profile.plan].name, tokens: profile.tokens, lifetime: profile.lifetime || profile.role === "admin", paid: profile.plan !== "free" || profile.lifetime || profile.role === "admin" }
    : null;
  return (
    <StudioShell user={user} demo={!supabaseConfigured}>
      {children}
    </StudioShell>
  );
}
