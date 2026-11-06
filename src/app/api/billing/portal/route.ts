import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Sends the subscriber to the provider's customer portal (change card, cancel, invoices). */
export async function GET(req: Request) {
  const sb = await getServerSupabase();
  if (!sb) return NextResponse.redirect(new URL("/pricing", req.url));
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/login", req.url));
  const { data } = await sb.from("subscriptions").select("portal_url").eq("user_id", auth.user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  return NextResponse.redirect(data?.portal_url ?? new URL("/pricing", req.url));
}
