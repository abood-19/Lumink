import { flashMarkup, type FlashName } from "@/lib/flash";

export const PAPER = "#f3f0ea";
export const INK = "#141414";

/** One flash design as inline SVG. */
export function FlashArt({ name, ink = INK, paper = PAPER, size = "100%", stroke = 2, className = "" }: { name: FlashName; ink?: string; paper?: string; size?: number | string; stroke?: number; className?: string }) {
  return (
    <svg viewBox="-6 -6 112 112" width={size} height={size} className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: flashMarkup(name, ink, paper, stroke) }} />
  );
}

/** A printed flash sheet: several designs on paper, the way studios show them. */
export function FlashSheet({ names, cols = 3, className = "", label }: { names: FlashName[]; cols?: number; className?: string; label?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[6px] shadow-[0_30px_60px_-20px_rgba(0,0,0,.7)] ${className}`} style={{ background: `${PAPER} radial-gradient(120% 90% at 30% 10%, #fbf9f5 0%, ${PAPER} 55%, #e6e1d8 100%)` }}>
      <div className="grid gap-[6%] p-[9%]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {names.map((n, i) => (
          <div key={i} style={{ transform: `rotate(${((i * 37) % 11) - 5}deg)` }}>
            <FlashArt name={n} stroke={2.2} />
          </div>
        ))}
      </div>
      {label && <p className="absolute bottom-[3%] end-[6%] m-0 font-display text-[10px] uppercase tracking-[.2em] text-[#8a847a]">{label}</p>}
    </div>
  );
}
