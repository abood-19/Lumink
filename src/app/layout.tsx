import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getDict, dirOf } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { RegisterSW } from "@/components/RegisterSW";
import { SmokeBackground } from "@/components/SmokeBackground";

export const metadata: Metadata = {
  title: { default: "LUMINK — Tattoo studio platform", template: "%s · LUMINK" },
  description: "On-skin simulation, stencils, sketches and color for tattoo artists. Russian, English, Uzbek and Arabic.",
  icons: { icon: "/icon.svg", apple: "/logo-mark.png" },
};

export const viewport: Viewport = { themeColor: "#0b0b0d", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = getDict(locale);
  return (
    <html lang={locale} dir={dirOf(locale)}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=Unbounded:wght@500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Pinyon+Script&display=swap"
        />
      </head>
      <body>
        <I18nProvider t={t} locale={locale}>
          <SmokeBackground />
          <RegisterSW />
          <div className="relative z-[1]">{children}</div>
        </I18nProvider>
      </body>
    </html>
  );
}
