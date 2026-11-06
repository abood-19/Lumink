"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LANGUAGE_NAMES, LOCALES } from "@/lib/i18n";
import { useI18n, useSetLocale } from "@/lib/i18n/client";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { PLANS, type PlanId } from "@/lib/plans";
import { Flag } from "./Flag";

const KEY = "lumink-demo-profile";

type Profile = { display_name: string; username: string; city: string; phone: string };

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="lx-surface-strong flex flex-col gap-4 p-6">
      <div>
        <h2 className="m-0 text-lg font-semibold">{title}</h2>
        {sub && <p className="m-0 mt-1 text-sm leading-relaxed text-mist">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-[13px] text-ash">
      <span className="text-[14px] text-ivory">{label}</span>
      {children}
      {hint && <span className="text-[12px] leading-relaxed">{hint}</span>}
    </label>
  );
}

export function SettingsForm() {
  const { t, locale } = useI18n();
  const setLocale = useSetLocale();
  const [p, setP] = useState<Profile>({ display_name: "", username: "", city: "", phone: "" });
  const [email, setEmail] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [plan, setPlan] = useState<{ id: PlanId; tokens: number; lifetime: boolean }>({ id: "free", tokens: 50, lifetime: false });
  const [status, setStatus] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      const user = sb ? (await sb.auth.getUser()).data.user : null;
      if (sb && user) {
        setSignedIn(true);
        setEmail(user.email ?? null);
        const { data } = await sb.from("profiles").select("display_name, username, city, phone, plan, tokens, lifetime, role").eq("id", user.id).single();
        if (data) {
          setP({ display_name: data.display_name ?? "", username: data.username ?? "", city: data.city ?? "", phone: data.phone ?? "" });
          setPlan({ id: data.plan, tokens: data.tokens, lifetime: data.lifetime || data.role === "admin" });
        }
      } else {
        try { setP({ ...p, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }); } catch {}
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => { setP({ ...p, [k]: k === "username" ? e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "") : e.target.value }); setStatus(null); };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getBrowserSupabase();
    const user = sb ? (await sb.auth.getUser()).data.user : null;
    if (sb && user) {
      const { error } = await sb.from("profiles").update(p).eq("id", user.id);
      setStatus(error ? (error.code === "23505" ? t.set_username_taken : t.gen_error) : t.set_saved);
    } else {
      try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
      setStatus(t.set_saved);
    }
  };

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getBrowserSupabase();
    if (!sb || !signedIn) return setStatus(t.auth_not_configured);
    const { error } = await sb.auth.updateUser({ email: newEmail });
    setStatus(error ? t.gen_error : t.set_email_sent);
  };

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <form onSubmit={saveProfile}>
        <Section title={t.set_profile} sub={t.set_profile_sub}>
          <Field label={t.set_name} hint={t.set_name_hint}><input value={p.display_name} onChange={set("display_name")} maxLength={60} className="lx-input" /></Field>
          <Field label={t.set_username} hint={t.set_username_hint}>
            <span className="flex items-center gap-2"><span className="text-mist">@</span><input value={p.username} onChange={set("username")} maxLength={30} className="lx-input w-full" dir="ltr" /></span>
          </Field>
          <Field label={t.set_city} hint={t.set_city_hint}><input value={p.city} onChange={set("city")} maxLength={60} className="lx-input" /></Field>
          <Field label={t.phone_label} hint={t.set_phone_hint}><input type="tel" value={p.phone} onChange={set("phone")} maxLength={24} className="lx-input" dir="ltr" /></Field>
          <div className="flex items-center gap-3">
            <button type="submit" className="lx-btn lx-btn-primary">{t.save}</button>
            {status && <span role="status" className="text-sm text-[#ff8a93]">{status}</span>}
          </div>
        </Section>
      </form>

      <Section title={t.set_language} sub={t.set_language_sub}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LOCALES.map((l) => (
            <button key={l} type="button" aria-pressed={locale === l} onClick={() => setLocale(l)} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm ${locale === l ? "border-lilac bg-[rgba(196,241,53,.16)] text-white" : "border-[rgba(200,200,210,0.14)] text-mist hover:text-white"}`}>
              <Flag locale={l} /> {LANGUAGE_NAMES[l]}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t.set_plan} sub={plan.lifetime ? t.set_plan_lifetime : `${PLANS[plan.id].name} · ${plan.tokens} ${t.tokens_left}`}>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/pricing" className="lx-btn lx-btn-primary">{plan.id === "free" ? t.upgrade : t.set_plan_change}</Link>
          <Link href="/studio/billing" className="lx-btn lx-btn-ghost">{t.set_billing}</Link>
        </div>
      </Section>

      <Section title={t.set_account} sub={email ? `${t.set_signed_in_as} ${email}` : t.set_account_sub}>
        {signedIn && (
          <form onSubmit={changeEmail} className="flex flex-wrap items-end gap-2.5">
            <Field label={t.set_email_change} hint={t.set_email_hint}>
              <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="lx-input min-w-[240px]" dir="ltr" />
            </Field>
            <button type="submit" className="lx-btn lx-btn-ghost">{t.save}</button>
          </form>
        )}
        <div className="flex flex-wrap gap-2.5">
          <form action="/auth/signout" method="post"><button type="submit" className="lx-btn lx-btn-ghost">{t.signout}</button></form>
          <form action="/auth/signout?next=/login" method="post"><button type="submit" className="lx-btn lx-btn-ghost">{t.set_new_account}</button></form>
        </div>
      </Section>
    </div>
  );
}
