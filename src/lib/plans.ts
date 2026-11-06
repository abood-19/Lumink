export type PlanId = "free" | "pro" | "gold";

export const TOKENS_PER_GENERATION = 10;

/**
 * Plans and what each one unlocks. Prices in USD.
 * Free: no charge. Pro: billed monthly. Pro Gold: billed once a year.
 * The database enforces the same rules (see supabase/schema.sql → has_paid_plan()).
 */
export const PLANS: Record<PlanId, { name: string; price: number; period: "month" | "year" | null; tokens: number; canPost: boolean; seats: number; features: string[] }> = {
  free: { name: "Free", price: 0, period: null, tokens: 50, canPost: false, seats: 1, features: ["simulator", "stencil", "generator", "colors"] },
  pro: { name: "Pro", price: 19.99, period: "month", tokens: 600, canPost: true, seats: 1, features: ["simulator", "stencil", "generator", "colors", "glow", "clients", "inventory", "price", "suppliers", "post"] },
  gold: { name: "Pro Gold", price: 199.99, period: "year", tokens: 2000, canPost: true, seats: 5, features: ["simulator", "stencil", "generator", "colors", "glow", "clients", "inventory", "price", "suppliers", "post", "priority", "featured"] },
};

/** "$19.99", "$199.99", or "Free". */
export function formatPrice(plan: PlanId, freeLabel = "Free") {
  const p = PLANS[plan].price;
  return p ? `$${p.toFixed(2)}` : freeLabel;
}

/** Monthly equivalent of a yearly price, rounded down to the cent. */
export const perMonth = (plan: PlanId) => Math.floor((PLANS[plan].price / (PLANS[plan].period === "year" ? 12 : 1)) * 100) / 100;

export const canUse = (plan: PlanId, feature: string, lifetime = false) => lifetime || PLANS[plan].features.includes(feature);
