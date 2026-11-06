"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

/** Asks the server for a hosted checkout link and goes there. The plan is re-validated on the server. */
export function CheckoutButton({ plan }: { plan: "pro" | "gold" }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const go = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
      if (j.url) { window.location.href = j.url; return; }
      setMsg(j.error === "login" ? t.pay_login : j.error === "not_configured" ? t.pay_off : t.pay_fail);
    } catch { setMsg(t.pay_fail); }
    setBusy(false);
  };
  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={go} disabled={busy} className="lx-btn lx-btn-primary disabled:opacity-60">{busy ? "…" : t.pay_now}</button>
      {msg && <p role="status" className="m-0 text-sm text-mist">{msg}</p>}
    </div>
  );
}
