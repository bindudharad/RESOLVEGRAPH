"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";

const NAV_LINKS = [
  { label: "Overview", href: "/overview" },
  { label: "Investigation", href: "/incidents" },
  { label: "Reconciliation", href: "/reconciliation" },
  { label: "Methodology", href: "/methodology" },
] as const;

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] backdrop-blur-md">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href="/overview" aria-label="ResolveGraph overview" className="flex items-center gap-3 rounded-md"><Logo /><span className="text-sm font-medium tracking-tight text-[var(--ink)]">RESOLVEGRAPH</span></Link>
        <div className="hidden items-center gap-6 lg:flex">{NAV_LINKS.map((link) => <Link key={link.label} href={link.href} className="text-sm text-[var(--ink-2)] transition-colors hover:text-[var(--ink)]">{link.label}</Link>)}</div>
        <div className="hidden items-center gap-5 sm:flex"><Link href="/sign-in" className="text-sm text-[var(--ink-2)] transition-colors hover:text-[var(--ink)]">Sign in</Link><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-[var(--ink)] px-4 py-2.5 text-sm font-medium text-[var(--bg)] transition-colors hover:bg-[var(--payment)]">Open workspace <ArrowRight className="h-4 w-4" /></Link></div>
        <button onClick={() => setMobileMenuOpen((open) => !open)} className="rounded-md p-2 text-[var(--ink)] lg:hidden" aria-label="Toggle navigation" aria-expanded={mobileMenuOpen}>{mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </nav>
      {mobileMenuOpen && <div className="border-t border-[var(--line)] bg-[var(--bg)] px-6 py-5 lg:hidden"><div className="mx-auto flex max-w-7xl flex-col gap-1">{NAV_LINKS.map((link) => <Link key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)} className="rounded-md px-3 py-3 text-sm text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]">{link.label}</Link>)}<Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="mt-3 rounded-lg bg-[var(--ink)] px-4 py-3 text-center text-sm font-medium text-[var(--bg)]">Open workspace</Link></div></div>}
    </header>
  );
}
