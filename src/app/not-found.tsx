import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NotFoundView } from "@/components/NotFoundView";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main><NotFoundView /></main>
      <SiteFooter />
    </>
  );
}
