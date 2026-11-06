"use client";

import { useEffect, useRef, useState } from "react";
import { LANGUAGE_NAMES, LOCALES } from "@/lib/i18n";
import { useI18n, useSetLocale } from "@/lib/i18n/client";
import { Flag } from "./Flag";

export function LangSwitcher() {
  const { locale } = useI18n();
  const setLocale = useSetLocale();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
        className="flex min-h-10 items-center gap-2 rounded-full border border-[rgba(200,200,210,0.20)] bg-[rgba(24,24,28,.8)] px-3 text-[13px]"
      >
        <Flag locale={locale} />
        <span>{locale.toUpperCase()}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" stroke="#a6a6b0" strokeWidth="1.4" fill="none" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <ul role="listbox" className="absolute end-0 top-12 z-40 min-w-[200px] rounded-2xl border border-[rgba(200,200,210,0.20)] bg-[#151518] p-1.5">
          {LOCALES.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === locale}
                onClick={() => {
                  setOpen(false);
                  setLocale(l);
                }}
                className={`flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-start text-sm hover:bg-[rgba(196,241,53,.14)] ${l === locale ? "bg-[rgba(196,241,53,.16)]" : ""}`}
              >
                <Flag locale={l} size={24} />
                {LANGUAGE_NAMES[l]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
