import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
process.env.LEMONSQUEEZY_WEBHOOK_SECRET = "s3cret";
process.env.LEMONSQUEEZY_VARIANT_PRO = "111";
process.env.LEMONSQUEEZY_VARIANT_GOLD = "222";
const { verifySignature, planForVariant, grantsAccess } = await import("../src/lib/billing.ts");
const { PLANS, perMonth, canUse } = await import("../src/lib/plans.ts");

test("signature", () => {
  const body = '{"a":1}';
  const sig = crypto.createHmac("sha256", "s3cret").update(body).digest("hex");
  assert.equal(verifySignature(body, sig), true);
  assert.equal(verifySignature(body + " ", sig), false);
  assert.equal(verifySignature(body, null), false);
  assert.equal(verifySignature(body, "00"), false);
});
test("variant → plan", () => {
  assert.equal(planForVariant(111), "pro");
  assert.equal(planForVariant("222"), "gold");
  assert.equal(planForVariant(999), "free");
  assert.equal(planForVariant(null), "free");
});
test("status access", () => {
  const now = Date.parse("2026-11-03T00:00:00Z");
  assert.equal(grantsAccess("active", null, now), true);
  assert.equal(grantsAccess("cancelled", "2026-12-01T00:00:00Z", now), true);
  assert.equal(grantsAccess("cancelled", "2026-10-01T00:00:00Z", now), false);
  assert.equal(grantsAccess("expired", null, now), false);
  assert.equal(grantsAccess("unpaid", null, now), false);
});
test("plans", () => {
  assert.equal(PLANS.pro.price, 19.99);
  assert.equal(PLANS.gold.price, 199.99);
  assert.equal(perMonth("gold"), 16.66);
  assert.equal(canUse("free", "clients"), false);
  assert.equal(canUse("free", "clients", true), true);
  assert.equal(canUse("pro", "clients"), true);
  assert.equal(canUse("pro", "featured"), false);
  assert.equal(canUse("gold", "featured"), true);
});
