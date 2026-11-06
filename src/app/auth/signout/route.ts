import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const sb = await getServerSupabase();
  if (sb) await sb.auth.signOut();
  const next = new URL(request.url).searchParams.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(new URL(target, request.url), { status: 303 });
}
