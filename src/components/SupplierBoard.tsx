"use client";

import { useState } from "react";
import { SupplierLogo } from "./SupplierLogo";
import type { Link as L } from "@/lib/suppliers";

type Group = { key: string; title: string; items: L[] };

/** Suppliers as a moving logo strip plus an index of large rows, one category at a time. */
export function SupplierBoard({ groups, open }: { groups: Group[]; open: string }) {
  const [tab, setTab] = useState(0);
  const all = groups.flatMap((g) => g.items);
  const cur = groups[tab];
  return (
    <div>
      <div dir="ltr" className="relative -mx-2 mb-10 overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="lx-tick flex w-max gap-3 [animation-duration:46s] hover:[animation-play-state:paused]">
          {[...all, ...all].map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" tabIndex={i >= all.length ? -1 : 0} aria-hidden={i >= all.length} className="flex flex-none items-center gap-3 border border-[rgba(255,255,255,.1)] bg-[#121310] py-2.5 pe-5 ps-2.5 transition-colors hover:border-lilac">
              <SupplierLogo name={s.name} url={s.url} logo={s.logo} />
              <span className="whitespace-nowrap text-[15px] font-semibold">{s.name}</span>
            </a>
          ))}
        </div>
      </div>

      <div role="tablist" className="mb-2 flex gap-6 overflow-x-auto border-b border-[rgba(255,255,255,.1)]">
        {groups.map((g, i) => (
          <button key={g.key} role="tab" type="button" aria-selected={tab === i} onClick={() => setTab(i)} className={`-mb-px flex min-h-12 flex-none items-center gap-2 border-b-2 text-[15px] font-semibold transition-colors ${tab === i ? "border-lilac text-ivory" : "border-transparent text-mist hover:text-ivory"}`}>
            {g.title}<span className="text-[13px] font-normal text-ash">{g.items.length}</span>
          </button>
        ))}
      </div>

      <ul key={cur.key} role="tabpanel" className="m-0 list-none p-0">
        {cur.items.map((s, i) => (
          <li key={s.url} className="lx-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="group relative flex min-h-[92px] items-center gap-5 overflow-hidden border-b border-[rgba(255,255,255,.08)] px-2 py-4">
              <span aria-hidden="true" className="absolute inset-0 origin-left scale-x-0 bg-lilac transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-x-100 group-focus-visible:scale-x-100 rtl:origin-right" />
              <span className="relative"><SupplierLogo name={s.name} url={s.url} logo={s.logo} /></span>
              <span className="relative min-w-0 flex-1 transition-transform duration-500 group-hover:translate-x-2 rtl:group-hover:-translate-x-2">
                <span className="block font-display text-[clamp(18px,2vw,24px)] font-semibold transition-colors group-hover:text-night">{s.name}</span>
                <span className="mt-1 block text-[14px] leading-snug text-mist transition-colors group-hover:text-[rgba(10,11,9,.7)]">{s.note}</span>
              </span>
              <span className="relative hidden text-sm font-semibold text-lilac transition-colors group-hover:text-night sm:block">{open} ↗</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
