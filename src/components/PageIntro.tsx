import { Kicker } from "./Decor";

export function PageIntro({ kicker, title, sub, center = false }: { kicker: string; title: string; sub?: string; center?: boolean }) {
  return (
    <section className={`lx-up mx-auto max-w-[1240px] px-6 pb-8 pt-20 ${center ? "text-center" : ""}`}>
      <Kicker>{kicker}</Kicker>
      <h1 className={`m-0 max-w-[860px] text-[clamp(36px,5vw,66px)] font-bold leading-[1.04] tracking-[-.03em] ${center ? "mx-auto" : ""}`}>{title}</h1>
      {sub && <p className={`mt-5 max-w-[620px] text-[17px] leading-relaxed text-mist ${center ? "mx-auto" : ""}`}>{sub}</p>}
    </section>
  );
}
