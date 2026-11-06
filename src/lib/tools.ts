import type { Dict } from "./i18n";

export type ToolKey = "overview" | "simulator" | "stencil" | "generator" | "colors" | "glow" | "clients" | "inventory" | "price" | "suppliers" | "settings";

export const TOOL_ICONS: Record<ToolKey, string> = {
  overview: "M4 4h7v7H4ZM13 4h7v4h-7ZM13 10h7v10h-7ZM4 13h7v7H4Z",
  simulator: "M12 2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM8 21v-7L5.5 10l2.5-1.5h8L18.5 10 16 14v7M12 11.5l1.3 1.5-1.3 1.5-1.3-1.5Z",
  stencil: "M6 3h9l4 4v14H6ZM15 3v4h4M9 16c1-2.5 5-2.5 6 0M9.5 11.5h.01M12 10.5h.01M14.5 11.5h.01",
  generator: "M4 20l1-3.5 9.5-9.5 2.5 2.5-9.5 9.5ZM13 8.5l2.5 2.5M18.5 2.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7Z",
  colors: "M4 14h4.5v6H4ZM9.75 10h4.5v10h-4.5ZM15.5 14H20v6h-4.5ZM6.25 14v-2.5M12 10V6.5M17.75 14v-2.5",
  glow: "M14.5 4a8 8 0 1 0 5.5 13.5A7 7 0 0 1 14.5 4ZM19 3v3M17.5 4.5h3M20 9.5v2M19 10.5h2",
  clients: "M3 5h18v14H3ZM8 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM5.5 16.5c.6-1.5 1.5-2.2 2.5-2.2s1.9.7 2.5 2.2M13.5 10h5M13.5 13h5M13.5 16h3",
  inventory: "M10 3h4v3h-4ZM9 6h6l1.5 3v12h-9V9ZM7.5 13h9M7.5 17h9",
  price: "M3 12V4h8l10 10-8 8ZM8 7a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
  suppliers: "M4 9l1.2-5h13.6L20 9M4 9v11h16V9M4 9c0 1.7 1.8 3 4 3s4-1.3 4-3c0 1.7 1.8 3 4 3s4-1.3 4-3M10 20v-5h4v5",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM19 12l2-1-1-3-2 .2-1.4-1.4L17 4.8 14 4l-1 2h-2l-1-2-3 .8.2 2L5.8 8.2 4 8l-1 3 2 1v1l-2 1 1 3 2-.2 1.4 1.4L7 19.2l3 .8 1-2h2l1 2 3-.8-.2-2 1.4-1.4 2 .2 1-3-2-1Z",
};

/** Tools open on the Free plan. Everything else needs Pro, Pro Gold or a lifetime account. */
export const FREE_TOOLS: ToolKey[] = ["overview", "simulator", "stencil", "generator", "colors", "settings"];
export const isLocked = (key: ToolKey, paid: boolean) => !paid && !FREE_TOOLS.includes(key);

export function toolKeyFromPath(path: string): ToolKey | null {
  const seg = path.replace(/^\/studio\/?/, "").split("/")[0];
  if (!path.startsWith("/studio")) return null;
  if (seg === "" ) return "overview";
  return (["simulator", "stencil", "generator", "colors", "glow", "clients", "inventory", "price", "suppliers", "settings"] as ToolKey[]).find((k) => k === seg) ?? null;
}

export function toolNav(t: Dict): { key: ToolKey; href: string; label: string; desc?: string }[] {
  return [
    { key: "overview", href: "/studio", label: t.nav_overview },
    { key: "simulator", href: "/studio/simulator", label: t.t1, desc: t.t1d },
    { key: "stencil", href: "/studio/stencil", label: t.t2, desc: t.t2d },
    { key: "generator", href: "/studio/generator", label: t.t3, desc: t.t3d },
    { key: "colors", href: "/studio/colors", label: t.t4, desc: t.t4d },
    { key: "glow", href: "/studio/glow", label: t.t5, desc: t.t5d },
    { key: "clients", href: "/studio/clients", label: t.t6, desc: t.t6d },
    { key: "inventory", href: "/studio/inventory", label: t.t7, desc: t.t7d },
    { key: "price", href: "/studio/price", label: t.t8, desc: t.t8d },
    { key: "suppliers", href: "/studio/suppliers", label: t.nav_suppliers, desc: t.sup_title },
    { key: "settings", href: "/studio/settings", label: t.nav_settings },
  ];
}
