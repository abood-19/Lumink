"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { Simulator2D } from "./Simulator2D";
import { SimFull } from "./simFull";

const BodyStudio = dynamic(() => import("./BodyStudio").then((m) => m.BodyStudio), { ssr: false });

/** One simulator: the 3D body you can draw on, or a real photo of the client. Can open full screen. */
export function SimulatorHub() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"3d" | "photo">("3d");
  const [full, setFull] = useState(false);
  const [sheet, setSheet] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const enter = useCallback(() => {
    setFull(true);
    setSheet(false);
    // Real full screen where the browser allows it (laptops, Android, iPad); iPhone keeps the fixed overlay.
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    try {
      const p = el.requestFullscreen?.({ navigationUI: "hide" });
      if (p) p.catch(() => {});
      else el.webkitRequestFullscreen?.();
    } catch {}
  }, []);
  const exit = useCallback(() => {
    setFull(false);
    setSheet(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    if (!full) return;
    const html = document.documentElement, body = document.body;
    const prev = [html.style.overflow, body.style.overflow, body.style.overscrollBehavior];
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.fullscreenElement) exit(); };
    const fs = () => { if (!document.fullscreenElement) setFull(false); };
    window.addEventListener("keydown", key);
    document.addEventListener("fullscreenchange", fs);
    return () => {
      [html.style.overflow, body.style.overflow, body.style.overscrollBehavior] = prev;
      window.removeEventListener("keydown", key);
      document.removeEventListener("fullscreenchange", fs);
    };
  }, [full, exit]);

  const tabs = (
    <div role="tablist" className="inline-flex flex-none rounded-xl bg-white/5 p-1">
      {(["3d", "photo"] as const).map((k) => (
        <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => { setTab(k); setSheet(false); }} className={`min-h-10 rounded-lg px-4 text-[14px] font-semibold sm:px-5 ${tab === k ? "bg-white text-[#0a0b09]" : "text-mist hover:text-ivory"}`}>
          {k === "3d" ? t.sim_tab_3d : t.sim_tab_photo}
        </button>
      ))}
    </div>
  );

  return (
    <SimFull.Provider value={{ full, sheet, setSheet }}>
      <div
        ref={box}
        className={full ? "fixed inset-0 z-[110] flex flex-col gap-2 bg-[#0a0b09] px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-[max(8px,env(safe-area-inset-top))] ps-[max(8px,env(safe-area-inset-left))] pe-[max(8px,env(safe-area-inset-right))] sm:px-3 lg:px-4" : ""}
      >
        <div className={`flex flex-wrap items-center justify-between gap-2 ${full ? "" : "mb-4"}`}>
          {tabs}
          {full ? (
            <button type="button" onClick={exit} className="flex min-h-11 flex-none items-center gap-2 rounded-xl bg-white/10 px-4 text-[14px] font-semibold text-ivory hover:bg-white/15">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {t.sim_full_exit}
            </button>
          ) : (
            <button type="button" onClick={enter} className="flex min-h-11 flex-none items-center gap-2 rounded-xl bg-lilac px-4 text-[14px] font-semibold text-[#0a0b09]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {t.sim_full}
            </button>
          )}
        </div>
        <div className={full ? "min-h-0 flex-1" : ""}>
          {tab === "3d" ? <BodyStudio /> : <Simulator2D />}
        </div>
      </div>
    </SimFull.Provider>
  );
}
