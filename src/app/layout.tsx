import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const editorialSerif = Newsreader({
  variable: "--font-editorial",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "RESOLVEGRAPH — AI-Powered Cross-Provider Payment Investigation & Evidence Resolution",
    template: "%s · RESOLVEGRAPH",
  },
  description:
    "One Payment. Every Source. One Explainable Resolution. Enterprise infrastructure for multi-source payment reconciliation, 12-stage root-cause diagnostics, and evidence-first commerce resolution.",
  applicationName: "RESOLVEGRAPH",
  keywords: [
    "payment investigation",
    "cross-provider reconciliation",
    "dispute resolution",
    "evidence graph",
    "root cause analysis",
    "fintech",
    "RBI TAT compliance",
    "PayPal sandbox",
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${editorialSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--color-app)] text-[var(--color-fg)]">{children}</body>
    </html>
  );
}
