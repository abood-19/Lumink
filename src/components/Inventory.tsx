"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { useCollection } from "@/lib/store";

type Item = { id: string; created_at?: string; name: string; category: string; qty: number; min_qty: number; expiry: string | null };
const CATS = ["inks", "needles", "hygiene", "aftercare", "other"] as const;

export function Inventory() {
  const { t } = useI18n();
  const { items, add, update, remove } = useCollection<Item>("inventory_items");
  const [form, setForm] = useState({ name: "", category: "inks", qty: 1, min_qty: 2, expiry: "" });
  const soon = (d: string | null) => !!d && new Date(d).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 45;
  const cat = (c: string) => t[`cat_${c}` as "cat_inks"] ?? c;

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await add({ name: form.name, category: form.category, qty: form.qty, min_qty: form.min_qty, expiry: form.expiry || null });
          setForm({ ...form, name: "", qty: 1, expiry: "" });
        }}
        className="lx-surface-strong grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] items-end gap-3 p-5"
      >
        <label className="flex flex-col gap-2 text-[13px] text-ash">{t.inv_name}<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="lx-input" /></label>
        <label className="flex flex-col gap-2 text-[13px] text-ash">{t.inv_cat}
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="lx-input">
            {CATS.map((c) => <option key={c} value={c}>{cat(c)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-[13px] text-ash">{t.inv_qty}<input type="number" min={0} value={form.qty} onChange={(e) => setForm({ ...form, qty: +e.target.value })} className="lx-input" /></label>
        <label className="flex flex-col gap-2 text-[13px] text-ash">{t.inv_min}<input type="number" min={0} value={form.min_qty} onChange={(e) => setForm({ ...form, min_qty: +e.target.value })} className="lx-input" /></label>
        <label className="flex flex-col gap-2 text-[13px] text-ash">{t.inv_expiry}<input type="date" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} className="lx-input" /></label>
        <button type="submit" className="lx-btn lx-btn-primary">{t.inv_add}</button>
      </form>

      {items.length === 0 ? <p className="text-mist">{t.empty}</p> : (
        <div className="lx-surface overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="text-start text-xs text-ash">
                <th className="p-3 text-start font-medium">{t.inv_name}</th>
                <th className="p-3 text-start font-medium">{t.inv_cat}</th>
                <th className="p-3 text-start font-medium">{t.inv_qty}</th>
                <th className="p-3 text-start font-medium">{t.inv_expiry}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-[rgba(200,200,210,0.06)]">
                  <td className="p-3 font-medium">
                    {it.name}
                    <div className="mt-1 flex gap-1.5">
                      {it.qty <= it.min_qty && <span className="rounded-full bg-[rgba(240,149,149,.15)] px-2 py-0.5 text-[11px] text-[#ffc9cc]">{t.inv_low}</span>}
                      {soon(it.expiry) && <span className="rounded-full bg-[rgba(242,177,52,.15)] px-2 py-0.5 text-[11px] text-[#FAC775]">{t.inv_expiring}</span>}
                    </div>
                  </td>
                  <td className="p-3 text-mist">{cat(it.category)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button type="button" aria-label="−" onClick={() => update(it.id, { qty: Math.max(0, it.qty - 1) })} className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(200,200,210,0.20)]">−</button>
                      <span className="w-8 text-center font-semibold">{it.qty}</span>
                      <button type="button" aria-label="+" onClick={() => update(it.id, { qty: it.qty + 1 })} className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(200,200,210,0.20)]">+</button>
                    </div>
                  </td>
                  <td className="p-3 text-mist" dir="ltr">{it.expiry ?? "—"}</td>
                  <td className="p-3 text-end"><button type="button" onClick={() => remove(it.id)} className="text-xs text-[#ff8a92]">{t.delete}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
