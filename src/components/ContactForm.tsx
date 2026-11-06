"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function ContactForm() {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="lx-surface-strong flex min-w-0 flex-[1_1_420px] flex-col gap-4 p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
        setBusy(true);
        const sb = getBrowserSupabase();
        if (sb) await sb.from("contact_messages").insert({ name: data.name, email: data.email, message: data.message });
        setBusy(false);
        setSent(true);
        form.reset();
      }}
    >
      {sent && <p role="status" className="m-0 rounded-xl bg-[rgba(210,210,220,.12)] px-4 py-3.5 text-[15px] text-[#e8e8ee]">{t.contact_saved}</p>}
      <label className="flex flex-col gap-2 text-sm text-ash">{t.f_name}<input name="name" required className="lx-input" /></label>
      <label className="flex flex-col gap-2 text-sm text-ash">{t.f_email}<input name="email" type="email" required className="lx-input" /></label>
      <label className="flex flex-col gap-2 text-sm text-ash">{t.f_msg}<textarea name="message" rows={5} required className="lx-input" /></label>
      <button type="submit" disabled={busy} className="lx-btn lx-btn-primary">{t.f_send}</button>
    </form>
  );
}
