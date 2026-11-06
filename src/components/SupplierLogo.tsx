"use client";

import { useState } from "react";

/** Brand mark for a supplier: official logo when known, otherwise the site's own icon, otherwise a monogram. */
export function SupplierLogo({ name, url, logo }: { name: string; url: string; logo?: { path: string; hex: string } }) {
  const [failed, setFailed] = useState(false);
  const box = "flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-[10px] bg-white";
  if (logo)
    return (
      <span className={box}>
        <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d={logo.path} fill={`#${logo.hex}`} /></svg>
      </span>
    );
  const host = new URL(url).hostname;
  if (!failed)
    return (
      <span className={box}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=128`} alt="" width={30} height={30} onError={() => setFailed(true)} onLoad={(e) => { if ((e.target as HTMLImageElement).naturalWidth <= 16) setFailed(true); }} />
      </span>
    );
  return <span className={`${box} font-display text-sm font-semibold`} style={{ background: "#141416", color: "#f3f3f5" }}>{name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase()}</span>;
}
