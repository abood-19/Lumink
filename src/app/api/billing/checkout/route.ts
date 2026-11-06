import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { billingConfigured, createCheckout } from "@/lib/billing";

export const runtime = "nodejs";

/** Starts a hosted checkout for Pro (monthly) or Pro Gold (yearly). Card details never touch this server. */
export async function POST(req: Request) {
  const { plan } = (await req.json().catch(() => ({}))) as { plan?: string };
  if (plan !== "pro" && plan !== "gold") return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (!billingConfigured) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const sb = await getServerSupabase();
  if (!sb) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "login" }, { status: 401 });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  try {
    const url = await createCheckout({ plan, userId: auth.user.id, email: auth.user.email, redirectUrl: `${site}/studio/billing?paid=1` });
    return NextResponse.json({ url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
