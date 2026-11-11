"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { createContext, useContext, useEffect, useState } from "react";
import { TOOL_ICONS, isLocked, toolKeyFromPath, toolNav } from "@/lib/tools";
import { Logo } from "./Logo";
import { LangSwitcher } from "./LangSwitcher";
import { Divider, Waves } from "./Decor";

export type ShellUser = { name: string; plan: string; tokens: number | null; lifetime: boolean; paid: boolean } | null;

const AccessContext = createContext(false);
/** True when the signed-in artist has Pro, Pro Gold or a lifetime account. */
export const usePaidAccess = () => useContext(AccessContext);

const DEMO_KEY = "lumink-demo-plan";

export function ToolIcon({ k, size = 20, color = "currentColor" }: { k: keyof typeof TOOL_ICONS; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={TOOL_ICONS[k]} stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockNotice() {
  const { t } = useI18n();
  return (
    <div className="lx-surface mx-auto mt-10 flex max-w-[560px] flex-col items-center gap-4 p-10 text-center">
      <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(196,241,53,.14)]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 11h12v10H6ZM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 15v2" stroke="#dff99a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <h1 className="m-0 text-2xl font-bold">{t.lock_title}</h1>
      <p className="m-0 text-[15px] leading-relaxed text-mist">{t.lock_sub}</p>
      <Link href="/pricing" className="lx-btn lx-btn-primary mt-2">{t.lock_cta}</Link>
    </div>
  );
}

export function StudioShell({ user, demo, children }: { user: ShellUser; demo: boolean; children: React.ReactNode }) {
  const { t } = useI18n();
  const path = usePathname();
  const [demoPaid, setDemoPaid] = useState(false);
  useEffect(() => {
    try { setDemoPaid(localStorage.getItem(DEMO_KEY) === "pro"); } catch {}
  }, []);
  const switchDemo = (pro: boolean) => {
    setDemoPaid(pro);
    try { localStorage.setItem(DEMO_KEY, pro ? "pro" : "free"); } catch {}
  };
  const paid = user ? user.paid : demo && demoPaid; // the device toggle only exists in demo mode
  const nav = toolNav(t).filter((n) => !isLocked(n.key, paid));
  const current = toolKeyFromPath(path);
  const locked = current ? isLocked(current, paid) : false;
  const isActive = (href: string) => (href === "/studio" ? path === "/studio" : path.startsWith(href));

  return (
    <div className="min-h-screen">
      <Waves />
      <header className="sticky top-0 z-30 border-b border-[rgba(200,200,210,0.08)] bg-[rgba(11,11,13,.8)] backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-4 px-5">
          <Logo size={34} href="/" />
          <div className="flex items-center gap-2.5">
            {user && user.tokens !== null && (
              <Link href="/studio/billing" className="flex min-h-10 items-center gap-2 rounded-full border border-[rgba(200,200,210,0.16)] px-3.5 text-[13px]">
                <span className="text-ash">{t.tokens}</span>
                <span className="font-semibold">{user.lifetime || user.paid ? "∞" : user.tokens}</span>
              </Link>
            )}
            <LangSwitcher />
            {user && (
              <form action="/auth/signout" method="post">
                <button type="submit" className="lx-btn lx-btn-ghost lx-btn-sm">{t.signout}</button>
              </form>
            )}
          </div>
        </div>
        <nav aria-label="Tools" className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-3 lg:hidden">
          {nav.map((n) => (
            <Link key={n.key} href={n.href} className={`flex min-h-[38px] flex-none items-center whitespace-nowrap rounded-full border border-[rgba(200,200,210,0.13)] px-3.5 text-[13px] ${isActive(n.href) ? "bg-[rgba(196,241,53,.18)] text-white" : "text-mist"}`}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      {demo && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-b border-[rgba(210,210,220,.15)] bg-[rgba(210,210,220,.08)] px-5 py-2.5 text-center text-[13px] text-[#e8e8ee]">
          <span>{t.demo_banner}</span>
          <span className="inline-flex rounded-full border border-[rgba(200,200,210,0.2)] p-0.5" role="group" aria-label="Plan preview">
            {[false, true].map((pro) => (
              <button key={String(pro)} type="button" onClick={() => switchDemo(pro)} aria-pressed={paid === pro} className={`min-h-8 rounded-full px-3 ${paid === pro ? "bg-lilac text-[#0a0b09]" : "text-mist"}`}>
                {pro ? "Pro" : "Free"}
              </button>
            ))}
          </span>
        </div>
      )}
      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-[248px] flex-none flex-col gap-1 overflow-y-auto border-e border-[rgba(200,200,210,0.06)] bg-[rgba(11,11,13,.5)] p-3 lg:flex">
          {nav.map((n) => (
            <Link key={n.key} href={n.href} aria-current={isActive(n.href) ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${isActive(n.href) ? "bg-[rgba(196,241,53,.16)] text-white" : "text-mist hover:text-white"}`}>
              <ToolIcon k={n.key} size={18} />
              {n.label}
            </Link>
          ))}
          {!paid && (
            <Link href="/pricing" className="mt-3 flex min-h-11 items-center gap-3 rounded-xl border border-dashed border-[rgba(196,241,53,.4)] px-3 text-sm text-lilac-soft hover:text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 11h12v10H6ZM8.5 11V8a3.5 3.5 0 0 1 7 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {t.lock_title}
            </Link>
          )}
          {user && (
            <div className="mt-auto rounded-xl border border-[rgba(200,200,210,0.08)] p-3 text-[13px]">
              <p className="m-0 truncate font-medium">{user.name}</p>
              <p className="m-0 mt-1 text-ash">{t.plan}: {user.lifetime ? "Lifetime" : user.plan}</p>
            </div>
          )}
        </aside>
        <main className="min-w-0 flex-1 px-5 pb-20 pt-8 lg:px-10">
          <AccessContext.Provider value={paid}>{locked ? <LockNotice /> : children}</AccessContext.Provider>
        </main>
      </div>
      <Divider />
      <Waves flip />
    </div>
  );
}

export function ToolHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-8">
      <h1 className="m-0 text-[clamp(28px,3.4vw,42px)] font-bold tracking-tight">{title}</h1>
      {sub && <p className="mt-2.5 max-w-[640px] text-base leading-relaxed text-mist">{sub}</p>}
    </div>
  );
}

/** Tool cards on the studio overview, filtered by the artist's plan. */
export function ToolGrid() {
  const { t } = useI18n();
  const paid = usePaidAccess();
  const tools = toolNav(t).filter((n) => n.key !== "overview" && n.key !== "settings" && !isLocked(n.key, paid));
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
      {tools.map((n) => (
        <Link key={n.key} href={n.href} className="lx-card-light flex min-h-[170px] flex-col gap-3 p-6 transition-colors hover:border-[rgba(200,200,210,0.24)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(196,241,53,.14)]"><ToolIcon k={n.key} color="#dff99a" /></span>
          <span className="mt-auto text-lg font-semibold">{n.label}</span>
          {n.desc && <span className="line-clamp-2 text-sm leading-snug text-mist">{n.desc}</span>}
        </Link>
      ))}
      {!paid && (
        <Link href="/pricing" className="lx-card-light flex min-h-[170px] flex-col gap-3 border-dashed p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(196,241,53,.14)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 11h12v10H6ZM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 15v2" stroke="#dff99a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="mt-auto text-lg font-semibold">{t.lock_title}</span>
          <span className="line-clamp-3 text-sm leading-snug text-mist">{t.lock_sub}</span>
        </Link>
      )}
    </div>
  );
}
