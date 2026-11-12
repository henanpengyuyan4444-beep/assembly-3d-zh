import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Noto_Sans, Noto_Sans_Display } from "next/font/google";
import "./globals.css";
import "./guide.css";
import "./home.css";
import "./scan.css";
import { Analytics } from "@vercel/analytics/next";
import Offline from "@/components/Offline";
import { SITE_URL } from "@/lib/site";

const noto = Noto_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-noto",
  display: "swap",
});

const display = Noto_Sans_Display({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const description = "中文 3D 装配说明书：把客户自己的纸质说明书变成可以点的分步演示，每一步都能对照原页。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "3D 装配说明书：一步一步装起来",
  description,
  applicationName: "装配图 3D",
  appleWebApp: { capable: true, title: "装配图 3D", statusBarStyle: "default" },
  openGraph: { type: "website", siteName: "装配图 3D", title: "3D 装配说明书：一步一步装起来", description, url: "/" },
  twitter: { card: "summary_large_image", title: "3D 装配说明书：一步一步装起来", description },
};

export const viewport: Viewport = {
  themeColor: "#f5f4f0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${noto.variable} ${display.variable}`}>
      <body>
        {children}
        <Analytics />
        {/* Plausible, served through our own domain (see the rewrites in next.config.ts) so the CSP stays self-only */}
        <Script src="/pl/script.js" data-domain="usebygga.com" data-api="/pl/event" strategy="afterInteractive" />
        {/* it reads the path, which the prerendered shell doesn't know yet */}
        <Suspense fallback={null}>
          <Offline />
        </Suspense>
      </body>
    </html>
  );
}
