import type { Dict } from "@/lib/i18n";
import { FREE_TOOLS, type ToolKey } from "@/lib/tools";
import { FlashArt } from "./Flash";
import type { FlashName } from "@/lib/flash";

export function CrossBands({ words }: { words: string[] }) {
  const icons: FlashName[] = ["dagger", "flame", "bolt", "webs", "spider", "star", "heart", "sigil"];
  const row = [...icons, ...icons, ...icons];
  return (
    <div aria-hidden="true" className="relative z-10 -mt-14 mb-0 h-[170px] overflow-hidden" dir="ltr">
      <div className="absolute left-[-5%] top-[34px] z-20 w-[110%] rotate-[2.5deg] bg-[#0a0b09] py-3.5 border-y border-[rgba(196,241,53,.25)] shadow-[0_20px_40px_rgba(0,0,0,.5)]">
        <div className="lx-tick-rev flex w-max items-center gap-10 font-display text-[22px] font-semibold uppercase tracking-[.12em] text-lilac">
          {[...words, ...words, ...words, ...words].map((w, i) => <span key={i} className="flex items-center gap-10">{w}<span className="text-ivory">✦</span></span>)}
        </div>
      </div>
      <div className="absolute left-[-5%] top-[52px] z-10 w-[110%] rotate-[-2.5deg] bg-lilac py-4 shadow-[0_24px_60px_rgba(196,241,53,.25)]">
        <div className="lx-tick flex w-max items-center gap-9">
          {row.map((n, i) => (
            <span key={i} className="flex items-center gap-9">
              <FlashArt name={n} ink="#0a0b09" paper="#c4f135" size={42} stroke={3} />
              <span className="h-2 w-2 rotate-45 bg-[#0a0b09]" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

type Tool = { key: ToolKey; title: string; desc: string; chips: [string, string]; pro: boolean };

/** The eight studio tools with their card copy. */
export function buildTools(t: Dict): Tool[] {
  const defs: [number, ToolKey, string, string][] = [
    [1, "simulator", t.chip_3d, t.chip_photo],
    [2, "stencil", t.chip_print, t.chip_lines],
    [3, "generator", t.chip_ai, t.chip_lang],
    [4, "colors", t.chip_fill, t.chip_skin],
    [5, "glow", t.chip_uv, t.chip_dark],
    [6, "clients", t.chip_private, t.chip_sign],
    [7, "inventory", t.chip_stock, t.chip_expiry],
    [8, "price", t.chip_size, t.chip_fx],
  ];
  return defs.map(([n, key, c1, c2]) => ({
    key,
    title: t[`t${n}` as keyof Dict] as string,
    desc: t[`t${n}d` as keyof Dict] as string,
    chips: [c1, c2],
    pro: !FREE_TOOLS.includes(key),
  }));
}
