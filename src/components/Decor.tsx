/** Moving waves for the very top and bottom of the site. */
export function Waves({ flip = false }: { flip?: boolean }) {
  const a = "M0 16Q150 4 300 16T600 16T900 16T1200 16T1500 16T1800 16T2100 16T2400 16V30H0Z";
  const b = "M0 20Q200 9 400 20T800 20T1200 20T1600 20T2000 20T2400 20";
  return (
    <div aria-hidden="true" className="relative h-[30px] overflow-hidden bg-[rgba(11,11,13,.9)]" style={flip ? { transform: "scaleY(-1)" } : undefined}>
      <svg className="lx-w1 absolute left-0 top-0 h-full w-[200%]" viewBox="0 0 2400 30" preserveAspectRatio="none">
        <path d={a} fill="rgba(170,170,180,.16)" />
      </svg>
      <svg className="lx-w2 absolute left-0 top-0 h-full w-[200%]" viewBox="0 0 2400 30" preserveAspectRatio="none">
        <path d={`${b}V30H0Z`} fill="rgba(238,240,255,.08)" />
        <path d={b} fill="none" stroke="rgba(238,240,255,.45)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

/** Animated hairline between sections. */
export function Divider() {
  return <div className="lx-div" aria-hidden="true" />;
}

const WORDS = ["TATTOO", "LUMINK", "STENCIL", "SIMULATOR", "FLASH", "INK", "STUDIO"];
const STYLES = ["BLACKWORK", "FINE LINE", "REALISM", "IREZUMI", "DOTWORK", "ORNAMENTAL", "LETTERING"];

export function Ticker() {
  const row1 = [...WORDS, ...WORDS];
  const row2 = [...STYLES, ...STYLES];
  return (
    <div dir="ltr" aria-hidden="true" className="flex flex-col gap-1.5 overflow-hidden bg-[rgba(11,11,13,.4)] py-7">
      <div className="lx-tick flex w-max whitespace-nowrap font-display text-[clamp(34px,6vw,76px)] font-semibold leading-[1.1]">
        {row1.map((w, i) => (
          <span key={i} className="flex items-center gap-9 pe-9" style={{ color: i % 2 ? "#c4f135" : "#f3f3f5" }}>
            {w}
            <svg width="28" height="28" viewBox="0 0 26 26"><path d="M13 2c0 6 5 11 11 11-6 0-11 5-11 11 0-6-5-11-11-11 6 0 11-5 11-11Z" fill="#a6a6b0" /></svg>
          </span>
        ))}
      </div>
      <div className="lx-tick-rev lx-outline flex w-max whitespace-nowrap font-display text-[clamp(34px,6vw,76px)] font-semibold leading-[1.1]">
        {row2.map((w, i) => (
          <span key={i} className="pe-12">{w}</span>
        ))}
      </div>
    </div>
  );
}

export function Arrow() {
  return (
    <svg className="lx-arrow" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="mb-3.5 text-[13px] uppercase tracking-[.14em] text-[#c4f135]">{children}</p>;
}

/** Hand-drawn "Leo" signature that writes itself. */
export function LeoSignature({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 120" fill="none" role="img" aria-label="Leo">
      <path
        className="lx-sig"
        d="M30 92 C44 60 58 26 72 18 C84 12 86 30 74 54 C64 74 52 94 50 102 C48 110 60 108 72 98 C82 90 90 82 98 78 C108 72 118 66 116 58 C114 50 100 56 98 68 C96 80 106 88 120 82 C130 78 138 70 146 66 C156 60 168 62 168 74 C168 86 154 90 146 84 C138 78 146 64 160 62 C176 60 190 64 214 52"
        stroke="#dff99a"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
