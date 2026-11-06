import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { grantsAccess, planForVariant, verifySignature } from "@/lib/billing";
import { PLANS } from "@/lib/plans";

export const runtime = "nodejs";

type Event = {
  meta: { event_name: string; custom_data?: { user_id?: string } };
  data: { id: string; attributes: { status: string; variant_id: number; ends_at: string | null; renews_at: string | null; customer_id: number; urls?: { customer_portal?: string } } };
};

/**
 * Lemon Squeezy webhook. Only a correctly signed request can change a plan.
 * The plan is derived from the variant that was paid for, never from anything the browser sends.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-signature"))) return NextResponse.json({ error: "signature" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const ev = JSON.parse(raw) as Event;
  const name = ev.meta.event_name;
  if (!name.startsWith("subscription_")) return NextResponse.json({ ok: true });
  const a = ev.data.attributes;
  let userId = ev.meta.custom_data?.user_id;
  if (!userId) {
    const { data } = await admin.from("subscriptions").select("user_id").eq("provider_id", ev.data.id).maybeSingle();
    userId = data?.user_id;
  }
  if (!userId) return NextResponse.json({ error: "unknown_user" }, { status: 200 });

  const plan = grantsAccess(a.status, a.ends_at) ? planForVariant(a.variant_id) : "free";
  await admin.from("subscriptions").upsert({
    provider_id: ev.data.id, user_id: userId, provider: "lemonsqueezy", variant_id: String(a.variant_id), plan,
    status: a.status, renews_at: a.renews_at, ends_at: a.ends_at, portal_url: a.urls?.customer_portal ?? null, updated_at: new Date().toISOString(),
  }, { onConflict: "provider_id" });

  const patch: Record<string, unknown> = { plan };
  // Refill tokens when a period is paid (new subscription or renewal).
  if (name === "subscription_created" || name === "subscription_payment_success" || name === "subscription_resumed") patch.tokens = PLANS[plan].tokens;
  await admin.from("profiles").update(patch).eq("id", userId).eq("lifetime", false);
  return NextResponse.json({ ok: true });
}
