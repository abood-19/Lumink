import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Divider } from "@/components/Decor";
import { getProfile } from "@/lib/supabase/server";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  return (
    <>
      <SiteHeader signedIn={!!profile} />
      <main>{children}</main>
      <Divider />
      <SiteFooter />
    </>
  );
}
