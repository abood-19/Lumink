"use client";

import { createContext, useContext } from "react";

/** Full-screen state of the simulator, shared by the hub and both simulators. */
export const SimFull = createContext<{ full: boolean; sheet: boolean; setSheet: (v: boolean) => void }>({ full: false, sheet: false, setSheet: () => {} });
export const useSimFull = () => useContext(SimFull);

/** Classes for the tools panel: a normal card, or in full screen a bottom sheet on phones and a side column on wide screens. */
export function panelClass(full: boolean, sheet: boolean) {
  if (!full) return "";
  return `fixed inset-x-0 bottom-0 z-[130] max-h-[64dvh] overflow-y-auto overscroll-contain !rounded-b-none !rounded-t-3xl !border-x-0 !border-b-0 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgba(0,0,0,.6)] transition-transform duration-300 ease-out ${sheet ? "translate-y-0" : "translate-y-[105%]"} lg:static lg:z-auto lg:h-full lg:max-h-none lg:translate-y-0 lg:!rounded-2xl lg:!border lg:shadow-none`;
}

/** Grab bar and close button on top of the bottom sheet (phones and tablets only). */
export function SheetHead({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <div className="sticky -top-4 z-10 -mx-4 -mt-4 flex items-center justify-between bg-[#121311] px-4 pb-2 pt-3 sm:-mx-5 sm:-mt-5 sm:px-5 lg:hidden">
      <span className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-white/20" aria-hidden="true" />
      <span className="text-[14px] font-semibold text-ivory">{label}</span>
      <button type="button" onClick={onClose} aria-label="✕" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-ivory">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  );
}

/** Round button on the stage that opens the tools sheet (phones and tablets only). */
export function SheetButton({ label, onClick, className = "" }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`absolute z-20 flex min-h-11 items-center gap-2 rounded-full bg-[rgba(16,17,15,.9)] px-4 text-[13px] font-semibold text-ivory shadow-[0_8px_30px_rgba(0,0,0,.5)] backdrop-blur lg:hidden ${className}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      {label}
    </button>
  );
}
