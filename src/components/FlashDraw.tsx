"use client";

import { useEffect, useRef } from "react";
import { FlashArt } from "./Flash";
import type { FlashName } from "@/lib/flash";

/**
 * A flash sheet that tattoos itself: each design is traced line by line as if by the machine,
 * the shading fills in, the sheet holds, then clears and starts again.
 */
const SPOTS: { n: FlashName; x: number; y: number; s: number; r: number }[] = [
  { n: "dagger", x: 2, y: 2, s: 84, r: -14 },
  { n: "heart", x: 27, y: 0, s: 66, r: 8 },
  { n: "webs", x: 0, y: 44, s: 76, r: 0 },
  { n: "flame", x: 24, y: 34, s: 62, r: -6 },
  { n: "spider", x: 43, y: 12, s: 50, r: 14 },
  { n: "star", x: 22, y: 72, s: 40, r: -10 },
  { n: "bolt", x: 44, y: 54, s: 44, r: -18 },
];
const CYCLE = 11000;

export function FlashDraw({ ink = "#0a0b09", paper = "#c4f135" }: { ink?: string; paper?: string }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current; if (!el) return;
    el.querySelectorAll("path, circle, ellipse, line, polyline, polygon, rect").forEach((p) => p.setAttribute("pathLength", "1"));
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.dataset.state = "done"; return; }
    let timer = 0, visible = false;
    const run = () => {
      el.dataset.state = "off";
      void el.offsetWidth;                      // restart the CSS animation
      el.dataset.state = "on";
      timer = window.setTimeout(() => { el.dataset.state = "fade"; timer = window.setTimeout(() => visible && run(), 700); }, CYCLE - 700);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && el.dataset.state !== "on") run();
      if (!visible) { clearTimeout(timer); el.dataset.state = "off"; }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(timer); };
  }, []);
  return (
    <div ref={host} aria-hidden="true" data-state="off" className="lx-flashdraw pointer-events-none absolute inset-x-6 top-6 h-[52%] md:inset-x-10 md:top-10">
      {SPOTS.map((p, i) => (
        <div key={p.n} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, transform: `rotate(${p.r}deg)`, ["--d" as string]: `${i * 1.05}s` }}>
          <FlashArt name={p.n} ink={ink} paper={paper} stroke={2.6} />
        </div>
      ))}
    </div>
  );
}
