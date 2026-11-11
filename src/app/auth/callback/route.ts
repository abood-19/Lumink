import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/studio";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/studio";
  const sb = await getServerSupabase();
  if (sb && code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(`/login?error=1&next=${encodeURIComponent(safeNext)}`, url.origin));
  }
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
