import { Suspense } from "react";
import { LoginPanel } from "@/components/LoginPanel";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center px-4 py-20">
      <Suspense>
        <LoginPanel />
      </Suspense>
    </section>
  );
}
