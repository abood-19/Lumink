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
      <div role="tablist" className="mb-4 flex gap-6 border-b border-[rgba(255,255,255,.1)]">
        {(["3d", "photo"] as const).map((k) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px min-h-12 border-b-2 text-[15px] font-semibold ${tab === k ? "border-lilac text-ivory" : "border-transparent text-mist hover:text-ivory"}`}>
            {k === "3d" ? t.sim_tab_3d : t.sim_tab_photo}
          </button>
        ))}
      </div>
      {tab === "3d" ? <BodyStudio /> : <Simulator2D />}
    </div>
  );
}
