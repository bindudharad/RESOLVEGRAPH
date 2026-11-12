import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, Instrument_Serif, IBM_Plex_Mono, Hanken_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/common/theme-provider";
import { BrandLoadingScreen } from "@/components/common/brand-loading-screen";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  fallback: ["system-ui", "-apple-system", "sans-serif"],
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  fallback: ["Georgia", "Cambria", "Times New Roman", "serif"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
});

export const metadata: Metadata = {
  title: {
    default: "RESOLVEGRAPH — AI-Powered Cross-Provider Payment Investigation & Evidence Resolution",
    template: "%s · RESOLVEGRAPH",
  },
  description:
    "A dispute is a story told in fragments. We connect the evidence. RESOLVEGRAPH brings buyer claims, merchant records and payment events into one source-linked investigation space.",
  applicationName: "RESOLVEGRAPH",
  keywords: [
    "payment investigation",
    "cross-provider reconciliation",
    "dispute resolution",
    "evidence graph",
    "root cause analysis",
    "fintech",
    "PayPal sandbox",
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${spaceGrotesk.variable} ${hankenGrotesk.variable} ${instrumentSerif.variable} ${ibmPlexMono.variable} h-full antialiased`}
      data-theme="dark"
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[var(--bg)] text-[var(--ink)] font-sans antialiased selection:bg-[var(--accent)] selection:text-white">
        <ThemeProvider>
          <BrandLoadingScreen />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
