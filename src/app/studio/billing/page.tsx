import Link from "next/link";
import { getT } from "@/lib/i18n/t";
import { ToolHeader } from "@/components/StudioShell";
import { CheckoutButton } from "@/components/CheckoutButton";
import { getProfile } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/plans";

/** Upgrade page. Payment runs on Lemon Squeezy; the signed webhook (/api/billing/webhook) is the only thing that changes a plan. */
export default async function StudioBilling({ searchParams }: { searchParams: Promise<{ plan?: string; paid?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const profile = await getProfile();
  const wanted = (sp.plan === "gold" ? "gold" : "pro") as Exclude<PlanId, "free">;
  const plan = PLANS[wanted];
  const subscribed = profile && profile.plan !== "free" && !profile.lifetime;
  return (
    <>
      <ToolHeader title={t.upgrade} />
      <div className="lx-surface-strong flex max-w-[560px] flex-col gap-5 p-7">
        {sp.paid && <p role="status" className="m-0 rounded-xl bg-[rgba(196,241,53,.14)] px-4 py-3 text-sm text-lilac-soft">{t.pay_ok}</p>}
        {profile && (
          <p className="m-0 text-sm text-ash">
            {t.plan}: <span className="text-ivory">{profile.lifetime ? "Lifetime" : PLANS[profile.plan].name}</span> · {t.tokens}: <span className="text-ivory">{profile.lifetime || profile.plan !== "free" ? "∞" : profile.tokens}</span>
          </p>
        )}
        <div className="flex gap-2" role="tablist">
          {(["pro", "gold"] as const).map((id) => (
            <Link key={id} href={`?plan=${id}`} role="tab" aria-selected={id === wanted} className={`rounded-lg px-3.5 py-2 text-sm ${id === wanted ? "bg-lilac font-semibold text-night" : "bg-[rgba(210,210,220,.08)] text-mist"}`}>{PLANS[id].name}</Link>
          ))}
        </div>
        <div>
          <p className="m-0 mt-1 text-4xl font-bold" dir="ltr">${plan.price.toFixed(2)} <span className="text-base font-normal text-ash">{plan.period === "year" ? t.per_year : t.per_month}</span></p>
          <p className="m-0 mt-2 text-sm text-ash">{plan.price ? "∞" : plan.tokens} {t.tokens}</p>
        </div>
        <p className="m-0 text-sm leading-relaxed text-[#e8e8ee]">{t.checkout_soon}</p>
        {profile?.lifetime ? null : subscribed ? (
          <a href="/api/billing/portal" className="lx-btn lx-btn-primary">{t.pay_manage}</a>
        ) : (
          <CheckoutButton plan={wanted} />
        )}
        <p className="m-0 text-xs text-ash">{t.pay_cancel_note}</p>
      </div>
    </>
  );
}
