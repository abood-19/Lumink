"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Mode = "choose" | "phone" | "email";

export function LoginPanel() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/studio";
  const sb = getBrowserSupabase();
  const [mode, setMode] = useState<Mode>("choose");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const failed = params.get("error");
  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const run = async (fn: () => Promise<{ error: { message: string } | null }>, ok?: string) => {
    setBusy(true);
    setStatus(null);
    const { error } = await fn();
    setBusy(false);
    if (error) setStatus(error.message);
    else if (ok) setStatus(ok);
  };

  const ghost = "lx-btn lx-btn-ghost !rounded-[14px] w-full";
  return (
    <div className="lx-surface-strong relative w-full max-w-[440px] !rounded-[26px] px-8 pb-8 pt-10">
      <h1 className="m-0 text-[28px] font-bold tracking-tight">{t.auth_title}</h1>
      <p className="mb-6 mt-2.5 text-[15px] leading-relaxed text-ash">{t.auth_sub}</p>

      {!sb && (
        <div className="flex flex-col gap-3">
          <p className="m-0 rounded-xl bg-[rgba(210,210,220,.1)] px-4 py-3 text-sm leading-relaxed text-[#e8e8ee]">{t.auth_not_configured}</p>
          <Link href="/studio" className="lx-btn lx-btn-primary !rounded-[14px]">{t.try_demo}</Link>
          <Link href="/" className="lx-btn !min-h-12 bg-transparent text-lilac-soft">{t.guest}</Link>
        </div>
      )}

      {sb && mode === "choose" && (
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } }))}
            className="lx-btn !rounded-[14px] w-full bg-white text-[#1a0b0d]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2.1-2 3.2-4.8 3.2-8.3Z" /><path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.7H2v2.9A11 11 0 0 0 12 23Z" /><path fill="#FBBC05" d="M5.7 13.9a6.6 6.6 0 0 1 0-4.2V6.8H2a11 11 0 0 0 0 9.9l3.7-2.8Z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.3 1.7l3.2-3.2A11 11 0 0 0 2 6.8l3.7 2.9C6.6 7.3 9.1 5.4 12 5.4Z" /></svg>
            {t.google}
          </button>
          <button type="button" onClick={() => { setMode("phone"); setCodeSent(false); setCode(""); }} className={ghost}>{t.phone}</button>
          <button type="button" onClick={() => { setMode("email"); setCodeSent(false); setCode(""); }} className={ghost}>{t.email}</button>
          <div className="my-1.5 flex items-center gap-3 text-xs text-[#86868f]"><span className="h-px flex-1 bg-[rgba(196,241,53,.16)]" />{t.or}<span className="h-px flex-1 bg-[rgba(196,241,53,.16)]" /></div>
          <Link href="/" className="lx-btn !min-h-12 bg-transparent text-lilac-soft">{t.guest}</Link>
        </div>
      )}

      {sb && mode === "phone" && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!codeSent) run(async () => { const r = await sb.auth.signInWithOtp({ phone }); if (!r.error) setCodeSent(true); return r; });
            else run(async () => { const r = await sb.auth.verifyOtp({ phone, token: code, type: "sms" }); if (!r.error) { router.push(next); router.refresh(); } return r; });
          }}
        >
          <label className="flex flex-col gap-2 text-sm text-ash">{t.phone_label}<input dir="ltr" type="tel" required placeholder="+998 90 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))} className="lx-input" /></label>
          {codeSent && <label className="flex flex-col gap-2 text-sm text-ash">{t.code_label}<input dir="ltr" inputMode="numeric" required value={code} onChange={(e) => setCode(e.target.value)} className="lx-input" /></label>}
          <button type="submit" disabled={busy} className="lx-btn lx-btn-primary !rounded-[14px]">{codeSent ? t.verify : t.phone_send}</button>
          <button type="button" onClick={() => setMode("choose")} className="lx-btn !min-h-11 bg-transparent text-ash">{t.back}</button>
        </form>
      )}

      {sb && mode === "email" && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            // The email has both a link and a 6-digit code: the code works even when the link opens in another browser or app.
            if (!codeSent) run(async () => { const r = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: callback() } }); if (!r.error) setCodeSent(true); return r; }, t.email_sent);
            else run(async () => { const r = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" }); if (!r.error) { router.push(next); router.refresh(); } return r; });
          }}
        >
          <label className="flex flex-col gap-2 text-sm text-ash">{t.email_label}<input dir="ltr" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="lx-input" /></label>
          {codeSent && <label className="flex flex-col gap-2 text-sm text-ash">{t.code_label}<input dir="ltr" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} className="lx-input" /></label>}
          <button type="submit" disabled={busy} className="lx-btn lx-btn-primary !rounded-[14px]">{codeSent ? t.verify : t.email_send}</button>
          <button type="button" onClick={() => setMode("choose")} className="lx-btn !min-h-11 bg-transparent text-ash">{t.back}</button>
        </form>
      )}

      {failed && !status && <p role="alert" className="mb-0 mt-4 text-sm text-[#ffc9cc]">{t.auth_failed}</p>}
      {status && <p role="status" className="mb-0 mt-4 text-sm text-[#e8e8ee]">{status}</p>}
      <p className="mb-0 mt-5 text-center text-xs leading-relaxed text-[#86868f]">{t.terms}</p>
    </div>
  );
}
