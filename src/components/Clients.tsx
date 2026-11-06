"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { compressImage, uid, useCollection } from "@/lib/store";
import { SignaturePad } from "./SignaturePad";

type Session = { id: string; date: string; desc: string; inks: string; price: string };
export type Client = {
  id: string;
  created_at?: string;
  name: string;
  phone: string;
  notes: string;
  sessions: Session[];
  photos: string[];
  consent_signature: string | null;
  publish_ok: boolean;
};

export function Clients() {
  const { t } = useI18n();
  const { items, loading, add, update, remove } = useCollection<Client>("clients");
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const list = useMemo(() => items.filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase())), [items, q]);
  const current = items.find((c) => c.id === selected) ?? null;

  const create = async () => {
    const c = await add({ name: t.cl_new, phone: "", notes: "", sessions: [], photos: [], consent_signature: null, publish_ok: false });
    setSelected(c.id);
  };

  return (
    <div className="flex flex-wrap items-start gap-4">
      <aside className="lx-surface-strong flex min-w-0 flex-[1_1_280px] flex-col gap-3 p-4">
        <button type="button" onClick={create} className="lx-btn lx-btn-primary">{t.cl_new}</button>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} className="lx-input" />
        <p className="m-0 text-xs text-ash">{t.cl_private}</p>
        {loading ? <p className="text-mist">{t.loading}</p> : list.length === 0 ? <p className="text-mist">{t.empty}</p> : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {list.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setSelected(c.id)} className={`flex min-h-12 w-full flex-col items-start justify-center rounded-xl px-3 text-start ${selected === c.id ? "bg-[rgba(196,241,53,.16)]" : "hover:bg-[rgba(196,241,53,.08)]"}`}>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-ash" dir="ltr">{c.phone}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      {current && <ClientEditor key={current.id} client={current} onSave={(patch) => update(current.id, patch)} onDelete={async () => { await remove(current.id); setSelected(null); }} />}
    </div>
  );
}

function ClientEditor({ client, onSave, onDelete }: { client: Client; onSave: (p: Partial<Client>) => Promise<void>; onDelete: () => Promise<void> }) {
  const { t } = useI18n();
  const [c, setC] = useState<Client>(client);
  const [saved, setSaved] = useState(false);
  const [s, setS] = useState<Omit<Session, "id">>({ date: new Date().toISOString().slice(0, 10), desc: "", inks: "", price: "" });
  const set = (p: Partial<Client>) => { setC((x) => ({ ...x, ...p })); setSaved(false); };

  const save = async () => {
    const { id: _id, created_at: _c, ...rest } = c;
    await onSave(rest);
    setSaved(true);
  };

  return (
    <section className="lx-surface-strong flex min-w-0 flex-[999_1_520px] flex-col gap-5 p-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        <label className="flex flex-col gap-2 text-[13px] text-ash">{t.cl_name}<input value={c.name} onChange={(e) => set({ name: e.target.value })} className="lx-input" /></label>
        <label className="flex flex-col gap-2 text-[13px] text-ash">{t.cl_phone}<input dir="ltr" type="tel" value={c.phone} onChange={(e) => set({ phone: e.target.value })} className="lx-input" /></label>
      </div>
      <label className="flex flex-col gap-2 text-[13px] text-ash">{t.cl_notes}<textarea value={c.notes} onChange={(e) => set({ notes: e.target.value })} className="lx-input" /></label>

      <div>
        <h2 className="mb-3 mt-0 text-lg font-semibold">{t.cl_sessions}</h2>
        {c.sessions.length > 0 && (
          <ul className="m-0 mb-3 flex list-none flex-col gap-2 p-0">
            {c.sessions.map((x) => (
              <li key={x.id} className="rounded-xl border border-[rgba(200,200,210,0.08)] p-3 text-sm">
                <div className="flex justify-between gap-3"><span className="font-medium">{x.date}</span><span dir="ltr">{x.price}</span></div>
                {x.desc && <p className="m-0 mt-1 text-[#e2e2e8]">{x.desc}</p>}
                {x.inks && <p className="m-0 mt-1 text-xs text-ash">{x.inks}</p>}
                <button type="button" onClick={() => set({ sessions: c.sessions.filter((y) => y.id !== x.id) })} className="mt-1 text-xs text-[#ff8a92]">{t.delete}</button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5 rounded-xl border border-dashed border-[rgba(200,200,210,0.16)] p-3">
          <label className="flex flex-col gap-1.5 text-xs text-ash">{t.cl_date}<input type="date" value={s.date} onChange={(e) => setS({ ...s, date: e.target.value })} className="lx-input" /></label>
          <label className="flex flex-col gap-1.5 text-xs text-ash">{t.cl_price}<input value={s.price} onChange={(e) => setS({ ...s, price: e.target.value })} className="lx-input" /></label>
          <label className="col-span-full flex flex-col gap-1.5 text-xs text-ash">{t.cl_desc}<input value={s.desc} onChange={(e) => setS({ ...s, desc: e.target.value })} className="lx-input" /></label>
          <label className="col-span-full flex flex-col gap-1.5 text-xs text-ash">{t.cl_inks}<input value={s.inks} onChange={(e) => setS({ ...s, inks: e.target.value })} className="lx-input" /></label>
          <button type="button" onClick={() => { set({ sessions: [{ ...s, id: uid() }, ...c.sessions] }); setS({ ...s, desc: "", inks: "", price: "" }); }} className="lx-btn lx-btn-ghost col-span-full !rounded-xl">{t.cl_session_add}</button>
        </div>
      </div>

      <div>
        <h2 className="mb-3 mt-0 text-lg font-semibold">{t.cl_photos}</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5">
          {c.photos.map((p, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" className="aspect-square w-full rounded-xl object-cover" />
              <button type="button" aria-label={t.delete} onClick={() => set({ photos: c.photos.filter((_, k) => k !== i) })} className="absolute end-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(11,11,13,.8)] text-sm">×</button>
            </div>
          ))}
          <label className="relative flex aspect-square cursor-pointer items-center justify-center rounded-xl border border-dashed border-[rgba(200,200,210,0.24)] text-center text-xs text-ash">
            {t.cl_add_photo}
            <input type="file" accept="image/*" capture="environment" className="absolute inset-0 cursor-pointer opacity-0" onChange={async (e) => { const f = e.target.files?.[0]; if (f) set({ photos: [...c.photos, await compressImage(f)] }); }} />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="m-0 text-lg font-semibold">{t.cl_consent}</h2>
        <SignaturePad value={c.consent_signature} onChange={(v) => set({ consent_signature: v })} label={t.cl_sign} clearLabel={t.cl_sign_clear} />
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={c.publish_ok} onChange={(e) => set({ publish_ok: e.target.checked })} className="h-5 w-5 accent-[#c4f135]" />{t.cl_publish_ok}</label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} className="lx-btn lx-btn-primary">{t.save}</button>
        <button type="button" onClick={() => { if (confirm(`${t.delete}?`)) onDelete(); }} className="lx-btn lx-btn-ghost !text-[#ff8a92]">{t.delete}</button>
        {saved && <span role="status" className="text-sm text-[#c4f135]">{t.set_saved}</span>}
      </div>
    </section>
  );
}
