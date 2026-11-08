"use client";

import { Logo } from "@/components/layout/logo";
import Link from "next/link";

const footerColumns = [
  {
    title: "Investigation Workspaces",
    links: [
      { label: "Executive Dashboard", href: "/dashboard" },
      { label: "12-Stage Incidents", href: "/incidents" },
      { label: "Multi-Source Reconciliation", href: "/reconciliation" },
      { label: "Universal Evidence Intake", href: "/intake" },
      { label: "Vernacular Voice Assistant", href: "/multilingual" },
    ],
  },
  {
    title: "Commerce Protection",
    links: [
      { label: "All Cases Queue", href: "/cases" },
      { label: "Purchase Memory Snapshots", href: "/purchases" },
      { label: "Package Passport & Seals", href: "/packages" },
      { label: "Shared Resolution Room", href: "/resolution-room" },
      { label: "PayPal Disputes Desk", href: "/paypal/disputes" },
    ],
  },
  {
    title: "Methodology & Architecture",
    links: [
      { label: "BERR v2 Reasoning Framework", href: "/methodology" },
      { label: "RECOURSE-BENCH (400 Cases)", href: "/methodology#benchmark" },
      { label: "Technical Documentation & API", href: "/docs" },
      { label: "Interactive Guided Walkthrough", href: "/demo" },
      { label: "Analytics & Resolution Metrics", href: "/analytics" },
    ],
  },
  {
    title: "Security & Governance",
    links: [
      { label: "Emergency Kill Switch", href: "/admin/security" },
      { label: "Cryptographic Audit Ledger", href: "/admin/security" },
      { label: "RBI Statutory TAT DPSS.CO.PD", href: "/docs#rbi-tat" },
      { label: "Financial Guardrails Invariant", href: "/docs#guardrails" },
      { label: "Tenant Isolation Protocol", href: "/docs#tenant-isolation" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--color-line)] bg-[var(--color-app)] text-xs">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Brand Column */}
          <div className="lg:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo className="h-6 w-6" />
              <span className="font-semibold text-sm tracking-tight text-[var(--color-fg)]">
                RESOLVEGRAPH
              </span>
            </Link>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed font-normal">
              AI-Powered Cross-Provider Payment Investigation & Evidence-Based Resolution Platform.
            </p>
            <div className="pt-2 font-mono text-[10px] text-[var(--color-subtle)] space-y-1">
              <div>ONE PAYMENT. EVERY SOURCE.</div>
              <div className="text-amber-400">ONE EXPLAINABLE RESOLUTION.</div>
            </div>
          </div>

          {/* Nav Columns */}
          {footerColumns.map((col) => (
            <div key={col.title} className="space-y-3">
              <h4 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[var(--color-muted)] hover:text-amber-300 transition-colors inline-flex items-center gap-1 font-normal"
                    >
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        {/* Bottom Integrity Bar */}
        <div className="mt-14 pt-8 border-t border-[var(--color-line)] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-[var(--color-subtle)]">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>RESOLVEGRAPH Production Infrastructure · V2.0+</span>
          </div>
          <div className="flex items-center gap-4">
            <span>PayPal Sandbox Active (Live Disabled)</span>
            <span>·</span>
            <span>Zero Autonomous Disbursements</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
