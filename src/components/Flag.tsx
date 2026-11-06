import type { Locale } from "@/lib/i18n";

const FLAGS: Record<Locale, [string, string][]> = {
  ru: [["M0 0h30v6.67H0Z", "#FFFFFF"], ["M0 6.67h30v6.66H0Z", "#1C57A7"], ["M0 13.33h30V20H0Z", "#D52B1E"]],
  en: [
    ["M0 0h30v20H0Z", "#012169"],
    ["M0 0h3.5L30 17.7V20h-3.5L0 2.3ZM30 0v2.3L3.5 20H0v-2.3L26.5 0Z", "#FFFFFF"],
    ["M12 0h6v20h-6ZM0 7h30v6H0Z", "#FFFFFF"],
    ["M13.2 0h3.6v20h-3.6ZM0 8.2h30v3.6H0Z", "#C8102E"],
  ],
  uz: [
    ["M0 0h30v6.4H0Z", "#0099B5"],
    ["M0 6.4h30v.7H0ZM0 12.9h30v.7H0Z", "#CE1126"],
    ["M0 7.1h30v5.8H0Z", "#FFFFFF"],
    ["M0 13.6h30V20H0Z", "#1EB53A"],
    ["M5.6 1.1a2.1 2.1 0 1 0 0 4.2 1.7 1.7 0 1 1 0-4.2Z", "#FFFFFF"],
  ],
  ar: [["M0 0h8v20H0Z", "#EF3340"], ["M8 0h22v6.67H8Z", "#00843D"], ["M8 6.67h22v6.66H8Z", "#FFFFFF"], ["M8 13.33h22V20H8Z", "#111111"]],
};

export function Flag({ locale, size = 22 }: { locale: Locale; size?: number }) {
  return (
    <span className="flex flex-none overflow-hidden rounded-[3px]" style={{ width: size, height: (size * 2) / 3 }}>
      <svg width={size} height={(size * 2) / 3} viewBox="0 0 30 20" aria-hidden="true">
        {FLAGS[locale].map(([d, fill], i) => (
          <path key={i} d={d} fill={fill} />
        ))}
      </svg>
    </span>
  );
}
