import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Vazirmatn } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { BASE_PATH, STORAGE_KEY } from "@/lib/env";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const vazirmatn = Vazirmatn({ variable: "--font-vazirmatn", subsets: ["arabic", "latin"] });

export const metadata: Metadata = {
  title: "DoseRelay – safe medicine handovers for family caregivers",
  description:
    "A private, bilingual (English/Persian) app that helps families who share caring duties avoid double doses and hand over clearly between shifts. No account; data stays on your device.",
  applicationName: "DoseRelay",
  appleWebApp: { capable: true, title: "DoseRelay", statusBarStyle: "default" },
  icons: {
    icon: [{ url: `${BASE_PATH}/icon.svg`, type: "image/svg+xml" }],
    apple: `${BASE_PATH}/apple-touch-icon.png`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1311" },
  ],
};

/**
 * Runs before first paint so language direction, theme and text size are
 * right immediately (no flash). Mirrors applyDocumentPrefs() in lib/store.ts.
 */
const prefsScript = `(function(){try{var d=JSON.parse(localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)})||"null");var s=(d&&d.settings)||{};var r=document.documentElement;var l=s.locale||"en";r.lang=l;r.dir=l==="fa"?"rtl":"ltr";var t=s.theme||"system";if(t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches))r.classList.add("dark");if(s.highContrast)r.classList.add("hc");if(s.textScale)r.style.fontSize=(s.textScale*100)+"%";}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${geist.variable} ${vazirmatn.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: prefsScript }} />
      </head>
      <body className="min-h-dvh">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
