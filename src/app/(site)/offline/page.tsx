import { NotFoundView } from "@/components/NotFoundView";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return <NotFoundView offline />;
}
