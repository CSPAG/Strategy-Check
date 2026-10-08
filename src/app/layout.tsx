import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { DemoBanner } from "@/components/DemoBanner";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "CSP Strategie-Check",
  description: "Team-Selbsteinschätzung zur CSPstrategie 2026+",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de-CH" className={manrope.variable}>
      <body>
        {/* Ohne JavaScript: Titel sofort sichtbar statt Welle */}
        <noscript>
          <style>{`.cw .ch{opacity:1!important;animation:none!important}`}</style>
        </noscript>
        <DemoBanner />
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">{children}</main>
        <footer className="no-print mx-auto flex max-w-6xl items-center gap-3 px-4 pb-10 sm:px-6 lg:px-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/signet-punkte.svg" alt="" width={21} height={12} />
          <span className="nebentext">CSP AG · Strategie-Zyklus 2026–2028</span>
        </footer>
      </body>
    </html>
  );
}
