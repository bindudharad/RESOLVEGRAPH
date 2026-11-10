"use client";

import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";

const FOOTER_GROUPS = [
  {
    title: "Investigation Suite",
    links: [
      { label: "Investigation Workspace", href: "/cases" },
      { label: "Bilateral Evidence Graph", href: "/investigation" },
      { label: "Bilateral Evidence Review (BERR)", href: "/overview" },
      { label: "Purchase Memory", href: "/purchases" },
      { label: "Package Passport & Telemetry", href: "/packages" },
      { label: "Resolution Room Escrow", href: "/resolution-room" },
    ],
  },
  {
    title: "Platform Infrastructure",
    links: [
      { label: "Payment Intelligence Rails", href: "/payments" },
      { label: "Evidence Vault (SHA-256)", href: "/evidence" },
      { label: "AI Copilot Investigation", href: "/copilot" },
      { label: "Reconciliation Ledger", href: "/reconciliation" },
      { label: "Incident Response", href: "/incidents" },
      { label: "Evidence Intake API", href: "/intake" },
    ],
  },
  {
    title: "Forensic Methodology",
    links: [
      { label: "10-Tier Evidentiary Standard", href: "/methodology" },
      { label: "Workspace Overview", href: "/overview" },
      { label: "API & SDK Documentation", href: "/docs" },
      { label: "Multilingual Ingestion", href: "/multilingual" },
      { label: "Dispute Analytics", href: "/analytics" },
      { label: "Operator Support Manual", href: "/help" },
    ],
  },
  {
    title: "Governance & Security",
    links: [
      { label: "Security & Zero-Knowledge Trust", href: "/admin/security" },
      { label: "Multi-Tenant Organization Scope", href: "/organizations" },
      { label: "Cryptographic Audit Ledger", href: "/reconciliation" },
      { label: "Operator Settings & Keys", href: "/settings" },
      { label: "PayPal Sandbox Dispute Console", href: "/paypal/disputes" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="relative border-t border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] overflow-hidden">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-[350px] w-[800px] rounded-full bg-radial from-[var(--accent)]/5 to-transparent blur-3xl opacity-50" />

      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 relative z-10">
        {/* Top Section: Brand Identity & Closing Manifesto */}
        <div className="pb-16 border-b border-[var(--line)] grid grid-cols-12 gap-10 items-end">
          <div className="col-span-12 lg:col-span-6">
            <Link
              href="/overview"
              className="inline-flex items-center gap-3.5 focus-visible:outline-none"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] shadow-xs">
                <Logo className="h-6 w-6" />
              </div>
              <span className="font-heading text-lg font-bold tracking-tight text-[var(--ink)]">
                RESOLVEGRAPH
              </span>
            </Link>

            <h3 className="mt-6 font-heading text-2xl sm:text-3xl lg:text-4xl font-normal tracking-tight text-[var(--ink)] max-w-lg">
              Fair commerce requires
              <span className="block font-display italic text-[var(--accent)] font-medium">
                verifiable, auditable truth.
              </span>
            </h3>

            <p className="mt-4 text-xs sm:text-sm text-[var(--ink-2)] leading-relaxed max-w-md">
              A bilateral network connecting buyers, merchants, logistics scales, and payment rails into explainable evidence graphs before human-authorized resolution.
            </p>
          </div>

          <div className="col-span-12 lg:col-span-6 flex flex-col lg:items-end justify-between gap-6">
            {/* Live Operational Status Box */}
            <div className="rounded-2xl border border-[var(--line-strong)] bg-[var(--surface-2)]/60 p-4 w-full sm:max-w-md">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-mono font-semibold text-[var(--agreed)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--agreed)] animate-pulse" />
                  SYSTEM OPERATIONAL
                </span>
                <span className="text-[10px] font-mono text-[var(--ink-3)]">
                  Consensus Engine v2.0
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--line)]">
                  <span className="text-[10px] text-[var(--ink-3)] block">Bilateral Integrity</span>
                  <span className="font-semibold text-[var(--ink)]">100% Chained</span>
                </div>
                <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--line)]">
                  <span className="text-[10px] text-[var(--ink-3)] block">Human Oversight</span>
                  <span className="font-semibold text-[var(--ink)]">Required</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:brightness-110"
              >
                Open Workspace <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/overview"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-2)]"
              >
                Workspace Overview
              </Link>
            </div>
          </div>
        </div>

        {/* Middle Section: Multi-Column Navigation */}
        <div className="py-16 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="font-mono text-xs uppercase tracking-wider text-[var(--ink-3)] font-semibold">
                {group.title}
              </h4>
              <ul className="mt-5 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-[var(--ink-2)] transition-colors hover:text-[var(--accent)] hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section: Legal, Safeguards & Copyright */}
        <div className="pt-8 border-t border-[var(--line)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[var(--ink-3)]">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} RESOLVEGRAPH Architecture.</span>
            <span>· All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[var(--ink-2)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--agreed)]" />
              Financial Action Requires Human Sign-Off
            </span>
            <span className="hidden md:inline text-[var(--ink-3)]">·</span>
            <span className="hidden md:inline">PayPal AI Hackathon 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
