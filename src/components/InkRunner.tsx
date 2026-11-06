"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

/**
 * Small waiting game: a tattoo machine hops over ink bottles and ink caps.
 * Space / ↑ / tap to jump. Best score is kept on this device.
 */
export function InkRunner() {
  const { t } = useI18n();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [state, setState] = useState<"ready" | "run" | "over">("ready");
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try { setBest(Number(localStorage.getItem("lumink-runner-best") ?? 0)); } catch {}
  }, []);

  useEffect(() => {
    const c = canvas.current!;
    const g = c.getContext("2d")!;
    let W = 0, H = 0, ground = 0;
    const resize = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = r.width * dpr; c.height = r.height * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      W = r.width; H = r.height; ground = H - 46;
    };
    resize();
    window.addEventListener("resize", resize);

    let y = 0, vy = 0, speed = 6, dist = 0, raf = 0, last = performance.now();
    let obstacles: { x: number; w: number; h: number; kind: number }[] = [];
    let drops: { x: number; y: number; v: number }[] = [];
    let nextGap = 340;
    const reset = () => { y = 0; vy = 0; speed = 6; dist = 0; obstacles = []; nextGap = 340; setScore(0); };

    const jump = () => {
      if (stateRef.current === "ready" || stateRef.current === "over") { reset(); setState("run"); stateRef.current = "run"; return; }
      if (y === 0) vy = 13.5;
    };
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); } };
    window.addEventListener("keydown", onKey);
    c.addEventListener("pointerdown", jump);

    const drawMachine = (x: number, yy: number, tilt: number) => {
      g.save();
      g.translate(x, yy);
      g.rotate(tilt);
      // body in black film, white back cap, bandage grip, needle
      g.fillStyle = "#151515"; g.beginPath(); g.roundRect(-9, -64, 18, 40, 7); g.fill();
      g.fillStyle = "#efefe9"; g.beginPath(); g.roundRect(-8, -72, 16, 12, 6); g.fill();
      g.fillStyle = "#3a3a3a"; g.beginPath(); g.roundRect(-10, -27, 20, 20, 5); g.fill();
      g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 1;
      for (let i = -24; i < -8; i += 4) { g.beginPath(); g.moveTo(-10, i); g.lineTo(10, i + 3); g.stroke(); }
      g.fillStyle = "#8a6cf2"; g.beginPath(); g.moveTo(-6, -7); g.lineTo(6, -7); g.lineTo(1.5, 4); g.lineTo(-1.5, 4); g.closePath(); g.fill();
      g.strokeStyle = "#c4f135"; g.lineWidth = 2; g.beginPath(); g.moveTo(-9, -50); g.lineTo(-9, -32); g.stroke();
      g.restore();
    };
    const drawBottle = (x: number, w: number, h: number, kind: number) => {
      if (kind === 0) {
        g.fillStyle = "#0b0b0b"; g.strokeStyle = "#c4f135"; g.lineWidth = 1.5;
        g.beginPath(); g.roundRect(x, ground - h, w, h, 5); g.fill(); g.stroke();
        g.fillStyle = "#efefe9"; g.beginPath(); g.moveTo(x + w * 0.3, ground - h); g.lineTo(x + w * 0.7, ground - h); g.lineTo(x + w * 0.55, ground - h - 14); g.lineTo(x + w * 0.45, ground - h - 14); g.closePath(); g.fill();
      } else {
        g.fillStyle = "#efefe9"; g.beginPath(); g.moveTo(x, ground - h); g.lineTo(x + w, ground - h); g.lineTo(x + w - 4, ground); g.lineTo(x + 4, ground); g.closePath(); g.fill();
        g.fillStyle = "#0b0b0b"; g.beginPath(); g.ellipse(x + w / 2, ground - h + 2, w / 2 - 2, 3, 0, 0, Math.PI * 2); g.fill();
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(2, (now - last) / 16.67);
      last = now;
      g.clearRect(0, 0, W, H);
      // ground
      g.strokeStyle = "rgba(196,241,53,.6)"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, ground); g.lineTo(W, ground); g.stroke();
      g.fillStyle = "rgba(196,241,53,.25)";
      for (let i = 0; i < 30; i++) { const gx = ((i * 97 - dist * 0.9) % W + W) % W; g.fillRect(gx, ground + 10 + (i % 3) * 8, 14, 2); }
      // falling ink drops in the background
      if (Math.random() < 0.06 * dt) drops.push({ x: Math.random() * W, y: -10, v: 2 + Math.random() * 3 });
      g.fillStyle = "rgba(196,241,53,.18)";
      drops = drops.filter((d) => (d.y += d.v * dt) < ground);
      for (const d of drops) { g.beginPath(); g.arc(d.x, d.y, 2.2, 0, Math.PI * 2); g.fill(); }

      const running = stateRef.current === "run";
      if (running) {
        speed += 0.0025 * dt;
        dist += speed * dt;
        vy -= 0.75 * dt;
        y = Math.max(0, y + vy * dt);
        if (y === 0) vy = 0;
        nextGap -= speed * dt;
        if (nextGap <= 0) {
          const kind = Math.random() < 0.6 ? 0 : 1;
          obstacles.push({ x: W + 20, w: kind ? 30 : 22, h: kind ? 22 : 34 + Math.random() * 22, kind });
          nextGap = 260 + Math.random() * 300 + speed * 12;
        }
        obstacles.forEach((o) => (o.x -= speed * dt));
        obstacles = obstacles.filter((o) => o.x > -60);
        setScore(Math.floor(dist / 12));
      }
      for (const o of obstacles) drawBottle(o.x, o.w, o.h, o.kind);
      const mx = 90, my = ground - y;
      drawMachine(mx, my, running ? -0.15 + Math.max(-0.3, Math.min(0.3, vy * 0.02)) : -0.15);
      // collision (machine box ≈ 22 × 76 around the needle tip)
      if (running) {
        for (const o of obstacles) {
          if (mx + 9 > o.x + 3 && mx - 9 < o.x + o.w - 3 && my > ground - o.h + 4) {
            setState("over");
            stateRef.current = "over";
            const s = Math.floor(dist / 12);
            setBest((b) => { const nb = Math.max(b, s); try { localStorage.setItem("lumink-runner-best", String(nb)); } catch {} return nb; });
          }
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); window.removeEventListener("keydown", onKey); c.removeEventListener("pointerdown", jump); };
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-[24px] border border-[rgba(196,241,53,.25)] bg-[#0b0d09]">
      <div className="flex items-center justify-between px-5 pt-4 font-display text-[13px] text-mist" dir="ltr">
        <span>INK RUNNER</span>
        <span><span className="text-lilac">{String(score).padStart(5, "0")}</span> · HI {String(best).padStart(5, "0")}</span>
      </div>
      <canvas ref={canvas} className="block h-[220px] w-full cursor-pointer touch-none" aria-label={t.game_label} />
      {state !== "run" && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[rgba(10,11,9,.45)]">
          <p className="m-0 font-display text-lg font-semibold text-ivory">{state === "over" ? t.game_over : t.game_title}</p>
          <p className="m-0 text-[13px] text-mist">{t.game_hint}</p>
        </div>
      )}
    </div>
  );
}
