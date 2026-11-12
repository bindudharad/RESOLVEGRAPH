"use client";

import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export function MarketingFooter() {
  return (
    <footer className="bg-[var(--surface)] text-[var(--ink)] border-t border-[var(--line)]">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
          {/* Col 1: Brand & Purpose */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo className="h-6 w-6" />
              <span className="font-heading text-sm font-bold tracking-tight text-[var(--ink)]">
                RESOLVEGRAPH
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-[var(--ink-2)] leading-relaxed">
              AI-assisted, evidence-grounded payment investigation and resolution platform.
              Connecting buyer, merchant, and payment records into one explainable truth.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-xs font-mono text-[var(--ink-2)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--agreed)] animate-pulse" />
              <span>PayPal Sandbox Verified</span>
            </div>
          </div>

          {/* Col 2: Platform Links */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink)]">
              Platform
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[var(--ink-2)]">
              <li>
                <Link href="/intake" className="hover:text-[var(--accent)] transition-colors">
                  Start an Investigation
                </Link>
              </li>
              <li>
                <Link href="/demo" className="hover:text-[var(--accent)] transition-colors">
                  Interactive Demo Studio
                </Link>
              </li>
              <li>
                <Link href="/cases/RG-1001" className="hover:text-[var(--accent)] transition-colors">
                  Sample Case RG-1001
                </Link>
              </li>
              <li>
                <Link href="/cases" className="hover:text-[var(--accent)] transition-colors">
                  Case Ledger
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Technology */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink)]">
              Architecture
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[var(--ink-2)]">
              <li>
                <Link href="/docs" className="hover:text-[var(--accent)] transition-colors">
                  System Documentation
                </Link>
              </li>
              <li>
                <Link href="/methodology" className="hover:text-[var(--accent)] transition-colors">
                  Arbitration Methodology
                </Link>
              </li>
              <li>
                <Link href="/reconciliation" className="hover:text-[var(--accent)] transition-colors">
                  Canonical Reconciliation
                </Link>
              </li>
              <li>
                <Link href="/admin/security" className="hover:text-[var(--accent)] transition-colors">
                  Financial Safeguards
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Hackathon Target */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink)]">
              Evaluation & Standards
            </h4>
            <p className="text-xs sm:text-sm text-[var(--ink-2)] leading-relaxed">
              Targeted for the PayPal AI Hackathon 2026.
              Built on Next.js 16 (Turbopack), React 19, Three.js, Prisma, and PayPal REST v2 APIs.
            </p>
            <div className="pt-2 text-xs font-mono text-[var(--ink-2)]">
              <span>Open-Source: MIT License</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between border-t border-[var(--line)] pt-8 text-xs text-[var(--ink-2)]">
          <p>© 2026 RESOLVEGRAPH Project. All rights reserved.</p>
          <div className="mt-4 sm:mt-0 flex items-center gap-6">
            <Link href="/help" className="hover:text-[var(--ink)] transition-colors">
              Help Center
            </Link>
            <Link href="/docs" className="hover:text-[var(--ink)] transition-colors">
              API Specs
            </Link>
            <span className="font-mono text-[11px] text-[var(--accent)] font-semibold">
              Release Candidate 2.0
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
