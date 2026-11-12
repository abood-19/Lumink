"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { Logo } from "./Logo";
import { LangSwitcher } from "./LangSwitcher";
import { Waves } from "./Decor";

export function useSiteNav() {
  const { t } = useI18n();
  return [
    { href: "/", label: t.nav_home },
    { href: "/simulator", label: t.nav_sim },
    { href: "/features", label: t.nav_studio },
    { href: "/community", label: t.nav_community },
    { href: "/artists", label: t.nav_artists, accent: true },
    { href: "/pricing", label: t.nav_pricing },
    { href: "/help", label: t.nav_help },
    { href: "/contact", label: t.nav_contact },
  ];
}

export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();
  const nav = useSiteNav();
  const path = usePathname();
  useEffect(() => {
    // Bring the current tab into view in the swipeable row on phones.
    document.querySelectorAll<HTMLElement>('.lx-hscroll [aria-current="page"]').forEach((el) => {
      const row = el.parentElement!;
      row.scrollLeft += el.getBoundingClientRect().left - row.getBoundingClientRect().left - (row.clientWidth - el.offsetWidth) / 2;
    });
  }, [path]);
  const [menu, setMenu] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const onHero = path === "/" && !scrolled && !menu;

  return (
    <>
      {path !== "/" && <Waves />}
      <header className={`sticky top-0 z-30 transition-colors duration-300 ${onHero ? "border-b border-transparent bg-transparent" : "border-b border-[rgba(255,255,255,0.08)] bg-night"}`}>
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-2 px-3 sm:gap-6 sm:px-6">
          <span className="min-w-0 shrink [&_svg]:max-w-full max-[400px]:[&_svg]:h-[22px] max-[400px]:[&_svg]:w-auto"><Logo /></span>
          <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active(n.href) ? "page" : undefined}
                className={`relative flex min-h-9 items-center text-[14px] font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0.5 after:h-[2px] after:bg-lilac after:transition-transform ${active(n.href) ? "text-white after:scale-x-100" : n.accent ? "text-lilac after:scale-x-0 hover:text-white" : "text-mist after:scale-x-0 hover:text-white"}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-none items-center gap-1.5 sm:gap-2.5">
            <LangSwitcher />
            <Link href={signedIn ? "/studio" : "/login"} className="lx-btn lx-btn-sm lx-btn-primary whitespace-nowrap max-[400px]:!px-3 max-[400px]:text-[13px]">
              {signedIn ? t.app_open : t.signin}
            </Link>
            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              aria-label={t.menu}
              className="flex h-11 w-11 items-center justify-center border border-[rgba(255,255,255,0.14)] lg:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
        <nav aria-label="Sections" className="lx-hscroll flex gap-4 px-4 pb-3 lg:hidden">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n.href) ? "page" : undefined}
              className={`flex min-h-[38px] flex-none items-center whitespace-nowrap border-b-2 px-1.5 text-[13px] ${active(n.href) ? "border-lilac text-white" : "border-transparent text-mist"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        {menu && (
          <nav aria-label="Mobile" className="flex flex-col border-t border-[rgba(200,200,210,0.10)] px-4 pb-4 pt-2 lg:hidden">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMenu(false)} className="flex min-h-12 items-center rounded-xl px-3 text-base text-mist hover:text-white">
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
    </>
  );
}
