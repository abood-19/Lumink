import { TattooArt } from "./Ornament";
import { FlashArt, FlashSheet, PAPER } from "./Flash";
import type { Art } from "@/lib/site";

/** Artwork tile: a real photo when given, otherwise a flash design drawn in code. */
export function ArtTile({ art, src, className = "" }: { art: Art; src?: string; className?: string }) {
  return (
    <figure className={`m-0 ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`${art.style}, ${art.city}`} className="aspect-[4/5] w-full rounded-[14px] object-cover" />
      ) : art.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art.photo} alt={art.style} className="aspect-[4/5] w-full rounded-[14px] object-cover grayscale-[.2]" />
      ) : art.design ? (
        <div className="flex aspect-[4/5] items-center justify-center rounded-[14px] p-[12%] shadow-[0_30px_60px_-20px_rgba(0,0,0,.7)]" style={{ background: PAPER }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={art.design} alt={art.style} className="max-h-full max-w-full object-contain" />
        </div>
      ) : art.ornament ? (
        <div className="flex aspect-[4/5] items-center justify-center rounded-[14px] bg-[#141416]">
          <TattooArt kind="mandala" seed={2} ink="#f3f3f5" size="74%" />
        </div>
      ) : art.sheet ? (
        <FlashSheet names={art.sheet} cols={art.sheet.length > 4 ? 3 : 2} className="flex aspect-[4/5] items-center !rounded-[14px]" />
      ) : (
        <div className="flex aspect-[4/5] items-center justify-center rounded-[14px] shadow-[0_30px_60px_-20px_rgba(0,0,0,.7)]" style={{ background: PAPER }}>
          {art.single && <FlashArt name={art.single} size="66%" stroke={1.8} />}
        </div>
      )}
      <figcaption className="mt-2.5 flex justify-between gap-2 text-[13px] text-ash">
        <span>{art.style}</span>
        <span>{art.city}</span>
      </figcaption>
    </figure>
  );
}
