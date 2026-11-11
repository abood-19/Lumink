"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { Simulator2D } from "./Simulator2D";

const BodyStudio = dynamic(() => import("./BodyStudio").then((m) => m.BodyStudio), { ssr: false });

/** One simulator: the 3D body you can draw on, or a real photo of the client. */
export function SimulatorHub() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"3d" | "photo">("3d");
  return (
    <div>
      <div role="tablist" className="mb-4 inline-flex rounded-xl bg-white/5 p-1">
        {(["3d", "photo"] as const).map((k) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-10 rounded-lg px-5 text-[14px] font-semibold ${tab === k ? "bg-white text-[#0a0b09]" : "text-mist hover:text-ivory"}`}>
            {k === "3d" ? t.sim_tab_3d : t.sim_tab_photo}
          </button>
        ))}
      </div>
      {tab === "3d" ? <BodyStudio /> : <Simulator2D />}
    </div>
  );
}
