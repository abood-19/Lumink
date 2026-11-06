import "server-only";
import crypto from "node:crypto";
import type { PlanId } from "./plans";

/**
 * Payments run through Lemon Squeezy (merchant of record: it charges cards, Apple Pay, Google Pay and PayPal,
 * handles sales tax/VAT, and pays out to banks in Uzbekistan). Configure in .env:
 *   LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_WEBHOOK_SECRET,
 *   LEMONSQUEEZY_VARIANT_PRO (monthly), LEMONSQUEEZY_VARIANT_GOLD (yearly)
 */
const API = "https://api.lemonsqueezy.com/v1";
export const billingConfigured = Boolean(process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID && process.env.LEMONSQUEEZY_VARIANT_PRO && process.env.LEMONSQUEEZY_VARIANT_GOLD);

export function variantFor(plan: Exclude<PlanId, "free">) {
  return plan === "pro" ? process.env.LEMONSQUEEZY_VARIANT_PRO! : process.env.LEMONSQUEEZY_VARIANT_GOLD!;
}

/** Plan for a Lemon Squeezy variant id (unknown variants never grant access). */
export function planForVariant(variantId: string | number | null | undefined, env = process.env): PlanId {
  const v = String(variantId ?? "");
  if (v && v === env.LEMONSQUEEZY_VARIANT_GOLD) return "gold";
  if (v && v === env.LEMONSQUEEZY_VARIANT_PRO) return "pro";
  return "free";
}

/** Subscription statuses that keep paid access (a cancelled plan stays active until the period ends). */
export function grantsAccess(status: string, endsAt?: string | null, now = Date.now()) {
  if (status === "active" || status === "on_trial" || status === "past_due") return true;
  if (status === "cancelled") return Boolean(endsAt && Date.parse(endsAt) > now);
  return false; // paused, unpaid, expired
}

/** Constant-time check of the X-Signature header (HMAC-SHA256 of the raw body). */
export function verifySignature(rawBody: string, signature: string | null, secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "") {
  if (!signature || !secret) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(digest, "utf8"), b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function createCheckout(opts: { plan: Exclude<PlanId, "free">; userId: string; email?: string | null; redirectUrl: string }) {
  const res = await fetch(`${API}/checkouts`, {
    method: "POST",
    headers: { Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json", Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}` },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: { email: opts.email ?? undefined, custom: { user_id: opts.userId } },
          product_options: { redirect_url: opts.redirectUrl },
        },
        relationships: {
          store: { data: { type: "stores", id: String(process.env.LEMONSQUEEZY_STORE_ID) } },
          variant: { data: { type: "variants", id: String(variantFor(opts.plan)) } },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`checkout ${res.status}`);
  const json = (await res.json()) as { data: { attributes: { url: string } } };
  return json.data.attributes.url;
}
