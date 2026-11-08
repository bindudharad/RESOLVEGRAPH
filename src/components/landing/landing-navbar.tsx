"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, ShieldCheck, ChevronRight } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Overview", href: "/#overview" },
  { label: "Investigation", href: "/incidents" },
  { label: "Reconciliation", href: "/reconciliation" },
  { label: "Intake", href: "/intake" },
  { label: "Methodology", href: "/methodology" },
  { label: "Documentation", href: "/docs" },
] as const;

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Top Compliance Bar */}
      <div className="border-b border-[var(--color-line)] bg-[var(--color-shell)]/90 px-4 py-1.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-[11px] font-mono tracking-wider text-[var(--color-subtle)]">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="uppercase text-[var(--color-fg-muted)]">
              RESOLVEGRAPH V2.0+
            </span>
            <span className="hidden sm:inline text-[var(--color-line-2)]">|</span>
            <span className="hidden sm:inline">
              ONE PAYMENT. EVERY SOURCE. ONE EXPLAINABLE RESOLUTION.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-[var(--color-brand)] font-medium">
              RBI TAT DPSS.CO.PD & PAYPAL SANDBOX VERIFIED
            </span>
            <Link
              href="/admin/security"
              className="flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors"
            >
              <ShieldCheck className="h-3 w-3 text-amber-400" />
              <span>Kill Switch & Ledger</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav className="border-b border-[var(--color-line)] bg-[var(--color-app)]/85 px-6 py-3.5 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Logo & Brand Identity */}
          <Link href="/" className="group flex items-center gap-3">
            <Logo className="transition-transform duration-200 group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight text-[var(--color-fg)]">
                RESOLVEGRAPH
              </span>
              <span className="text-[10px] font-mono tracking-widest text-[var(--color-subtle)] uppercase">
                Payment & Commerce Forensics
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1 rounded-md border border-[var(--color-line)] bg-[var(--color-shell)]/70 px-2 py-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || (link.href.startsWith("/#") && pathname === "/");
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium tracking-wide transition-colors rounded",
                    isActive
                      ? "text-[var(--color-fg)] bg-[var(--color-surface)]"
                      : "text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)]/50"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/sign-in"
              className="px-3.5 py-1.5 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-300 transition-all hover:bg-amber-500/20 hover:border-amber-500/60"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[var(--color-muted)] hover:text-[var(--color-fg)] focus:outline-none"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-[var(--color-line)] bg-[var(--color-shell)] px-6 py-6 lg:hidden"
          >
            <div className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2 text-sm font-medium text-[var(--color-fg)] hover:text-amber-400"
                >
                  <span>{link.label}</span>
                  <ChevronRight className="h-4 w-4 text-[var(--color-subtle)]" />
                </Link>
              ))}
              <div className="mt-4 pt-4 border-t border-[var(--color-line)] flex flex-col gap-2">
                <Link
                  href="/sign-in"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-xs font-medium text-[var(--color-muted)] border border-[var(--color-line)] rounded bg-[var(--color-surface)]"
                >
                  Sign In
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-xs font-medium text-amber-300 border border-amber-500/30 rounded bg-amber-500/10"
                >
                  Launch Workspace
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
