"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X, ChevronDown, ExternalLink, ShieldCheck, Scale, RefreshCw, Network, Brain } from "lucide-react";
import { Logo } from "@/components/layout/logo";

interface NavLink {
  label: string;
  href: string;
  badge?: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "The Problem", href: "#problem-statement" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Investigation Showcase", href: "#investigation-showcase" },
  { label: "Core Technologies", href: "#core-technologies" },
  { label: "Security & Trust", href: "#trust-safety" },
];

export function MarketingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setScrollProgress((window.scrollY / docHeight) * 100);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mega menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (megaMenuRef.current && !megaMenuRef.current.contains(event.target as Node)) {
        setMegaMenuOpen(false);
      }
    }
    if (megaMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [megaMenuOpen]);

  return (
    <>
      {/* Top Thin Page Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-[2.5px] bg-white/10 z-[250] pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-[var(--buyer,#4D92CC)] via-[var(--accent,#4350E5)] to-[var(--merchant,#278B79)] transition-all duration-75 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Floating Centered Pill Navigation Shell */}
      <header className="fixed top-4 inset-x-0 z-[200] flex justify-center px-4 pointer-events-none">
        <div
          className={`pointer-events-auto relative w-full max-w-6xl transition-all duration-300 ${
            scrolled ? "translate-y-[-2px]" : ""
          }`}
          ref={megaMenuRef}
        >
          <nav
            aria-label="Main Navigation"
            className={`flex items-center justify-between rounded-full border px-4 py-2 transition-all duration-200 ${
              scrolled
                ? "border-[var(--line-strong,#B5BEB6)]/60 bg-[var(--surface,#FFFEFA)]/90 backdrop-blur-xl shadow-lg shadow-black/5"
                : "border-[var(--line,#D9DED7)]/80 bg-[var(--surface,#FFFEFA)]/75 backdrop-blur-md shadow-sm"
            }`}
          >
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="relative flex items-center justify-center p-1 rounded-lg bg-[var(--accent,#4350E5)]/10 text-[var(--accent,#4350E5)] group-hover:scale-105 transition-transform">
                  <Logo className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <span className="font-heading text-sm font-bold tracking-tight text-[var(--ink,#15191C)]">
                    RESOLVEGRAPH
                  </span>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-[var(--ink-2,#414B52)] -mt-0.5 font-semibold">
                    Evidence Atelier
                  </span>
                </div>
              </Link>
            </div>

            {/* Center: Desktop Navigation Links + Mega Menu Trigger */}
            <div className="hidden lg:flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMegaMenuOpen(!megaMenuOpen)}
                aria-expanded={megaMenuOpen}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  megaMenuOpen
                    ? "bg-[var(--accent,#4350E5)] text-white shadow-xs"
                    : "text-[var(--ink-2,#414B52)] hover:text-[var(--ink,#15191C)] hover:bg-[var(--surface-2,#EBE9E2)]"
                }`}
              >
                <span>Explore Architecture</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    megaMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-[var(--ink-2,#414B52)] transition-colors hover:text-[var(--ink,#15191C)] hover:bg-[var(--surface-2,#EBE9E2)]"
                >
                  {link.label}
                </Link>
              ))}

              <Link
                href="/methodology"
                className="rounded-full px-3 py-1.5 text-xs font-medium text-[var(--ink-2,#414B52)] transition-colors hover:text-[var(--ink,#15191C)] hover:bg-[var(--surface-2,#EBE9E2)]"
              >
                Methodology
              </Link>
              <Link
                href="/docs"
                className="rounded-full px-3 py-1.5 text-xs font-medium text-[var(--ink-2,#414B52)] transition-colors hover:text-[var(--ink,#15191C)] hover:bg-[var(--surface-2,#EBE9E2)]"
              >
                Docs
              </Link>
            </div>

            {/* Right: Actions */}
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/sign-in"
                className="rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--ink-2,#414B52)] transition-colors hover:text-[var(--ink,#15191C)] hover:bg-[var(--surface-2,#EBE9E2)] cursor-pointer"
              >
                Sign In
              </Link>

              <Link
                href="/intake"
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent,#4350E5)] px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
              >
                <span>Lodge Dispute</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle Navigation Menu"
                className="p-1.5 text-[var(--ink-2,#414B52)] hover:text-[var(--ink,#15191C)] rounded-full hover:bg-[var(--surface-2,#EBE9E2)] cursor-pointer"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </nav>

          {/* Mega Menu Dropdown Window */}
          {megaMenuOpen && (
            <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-[220] rounded-3xl border border-[var(--line-strong,#B5BEB6)] bg-[var(--surface,#FFFEFA)]/95 backdrop-blur-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Column 1: Workspaces */}
                <div className="space-y-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-3,#718078)] font-bold">
                    01 · Workspaces
                  </span>
                  <ul className="space-y-2 text-xs">
                    <li>
                      <Link
                        href="/dashboard"
                        onClick={() => setMegaMenuOpen(false)}
                        className="font-medium text-[var(--ink,#15191C)] hover:text-[var(--accent,#4350E5)] flex items-center justify-between group"
                      >
                        <span>Customer Workspace</span>
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <p className="text-[11px] text-[var(--ink-2,#414B52)]">Dispute creation & tracking</p>
                    </li>
                    <li>
                      <Link
                        href="/cases"
                        onClick={() => setMegaMenuOpen(false)}
                        className="font-medium text-[var(--ink,#15191C)] hover:text-[var(--accent,#4350E5)] flex items-center justify-between group"
                      >
                        <span>Platform Workspace</span>
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <p className="text-[11px] text-[var(--ink-2,#414B52)]">Case roster & BEG audit</p>
                    </li>
                    <li>
                      <Link
                        href="/seller/requests"
                        onClick={() => setMegaMenuOpen(false)}
                        className="font-medium text-[var(--ink,#15191C)] hover:text-[var(--merchant,#278B79)] flex items-center justify-between group"
                      >
                        <span>Seller Workspace</span>
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <p className="text-[11px] text-[var(--ink-2,#414B52)]">Evidence requests & responses</p>
                    </li>
                  </ul>
                </div>

                {/* Column 2: Verified E2E Proofs */}
                <div className="space-y-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-3,#718078)] font-bold">
                    02 · Live E2E Cases
                  </span>
                  <ul className="space-y-2 text-xs">
                    <li>
                      <Link
                        href="/cases/RG-1465"
                        onClick={() => setMegaMenuOpen(false)}
                        className="font-medium text-[var(--ink,#15191C)] hover:text-[var(--buyer,#4D92CC)] flex items-center justify-between group"
                      >
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="h-3 w-3 text-[var(--buyer,#4D92CC)]" />
                          <span>RG-1465 Replacement</span>
                        </span>
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <p className="text-[11px] text-[var(--ink-2,#414B52)]">Single-case 27-step audit</p>
                    </li>
                    <li>
                      <Link
                        href="/cases/RG-1468"
                        onClick={() => setMegaMenuOpen(false)}
                        className="font-medium text-[var(--ink,#15191C)] hover:text-[var(--merchant,#278B79)] flex items-center justify-between group"
                      >
                        <span className="flex items-center gap-1.5">
                          <Scale className="h-3 w-3 text-[var(--merchant,#278B79)]" />
                          <span>RG-1468 Sandbox Refund</span>
                        </span>
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <p className="text-[11px] text-[var(--ink-2,#414B52)]">Dual-key authorized refund</p>
                    </li>
                    <li>
                      <Link
                        href="/cases/RG-1001"
                        onClick={() => setMegaMenuOpen(false)}
                        className="font-medium text-[var(--ink,#15191C)] hover:text-[var(--accent,#4350E5)] flex items-center justify-between group"
                      >
                        <span>RG-1001 Samsung SSD</span>
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <p className="text-[11px] text-[var(--ink-2,#414B52)]">29 bilateral evidence items</p>
                    </li>
                  </ul>
                </div>

                {/* Column 3: Core Technology Engines */}
                <div className="space-y-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-3,#718078)] font-bold">
                    03 · Architectural Engines
                  </span>
                  <ul className="space-y-2 text-xs">
                    <li className="p-2 rounded-lg bg-[var(--surface-2,#EBE9E2)]/60">
                      <div className="flex items-center gap-1.5 font-medium text-[var(--ink,#15191C)]">
                        <Network className="h-3.5 w-3.5 text-[var(--accent,#4350E5)]" />
                        <span>BEG Graph Builder</span>
                      </div>
                      <p className="text-[10px] text-[var(--ink-2,#414B52)] mt-0.5">
                        Persisted node/edge relationships with SHA-256 integrity.
                      </p>
                    </li>
                    <li className="p-2 rounded-lg bg-[var(--surface-2,#EBE9E2)]/60">
                      <div className="flex items-center gap-1.5 font-medium text-[var(--ink,#15191C)]">
                        <Brain className="h-3.5 w-3.5 text-[var(--ai,#8B72C9)]" />
                        <span>BERR v2 Matrix</span>
                      </div>
                      <p className="text-[10px] text-[var(--ink-2,#414B52)] mt-0.5">
                        Objective fact classification into AGREED, VERIFIED, CONTESTED.
                      </p>
                    </li>
                  </ul>
                </div>

                {/* Column 4: Architectural Feature Card */}
                <div className="rounded-2xl border border-[var(--line,#D9DED7)] bg-gradient-to-br from-[#182223] to-[#11191A] p-4 text-white flex flex-col justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#278B79]/20 text-[#A1DFC5] font-mono text-[9px] uppercase tracking-wider font-semibold">
                      <ShieldCheck className="h-3 w-3" />
                      Zero Autonomous Transfers
                    </span>
                    <h3 className="font-heading text-sm font-bold mt-2">
                      Dual-Key Governance
                    </h3>
                    <p className="text-[11px] text-[#A6B0AC] mt-1 leading-relaxed">
                      Remedies are proposed by policy, but require authorized human credentials before any payment or replacement dispatch.
                    </p>
                  </div>

                  <Link
                    href="/overview"
                    onClick={() => setMegaMenuOpen(false)}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#A1DFC5] hover:underline"
                  >
                    <span>View System Overview</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Full-Screen / Modal Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[300] flex flex-col justify-between bg-[var(--surface,#FFFEFA)]/98 backdrop-blur-2xl p-6 lg:hidden animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[var(--line,#D9DED7)] pb-4">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2"
            >
              <Logo className="h-7 w-7" />
              <span className="font-heading text-base font-bold text-[var(--ink,#15191C)]">
                RESOLVEGRAPH
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-full bg-[var(--surface-2,#EBE9E2)] text-[var(--ink,#15191C)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col gap-3 py-6 overflow-y-auto">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-3,#718078)] font-bold">
              Navigation
            </span>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-heading font-semibold text-[var(--ink,#15191C)] hover:text-[var(--accent,#4350E5)] py-1"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/methodology"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-heading font-semibold text-[var(--ink,#15191C)] hover:text-[var(--accent,#4350E5)] py-1"
            >
              Methodology
            </Link>
            <Link
              href="/docs"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-heading font-semibold text-[var(--ink,#15191C)] hover:text-[var(--accent,#4350E5)] py-1"
            >
              Documentation
            </Link>

            <div className="mt-4 pt-4 border-t border-[var(--line,#D9DED7)] space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-3,#718078)] font-bold">
                Direct Workspaces
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-xl border border-[var(--line,#D9DED7)] bg-[var(--surface-2,#EBE9E2)] text-center text-[var(--ink,#15191C)]"
                >
                  Customer App
                </Link>
                <Link
                  href="/cases"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-xl border border-[var(--line,#D9DED7)] bg-[var(--surface-2,#EBE9E2)] text-center text-[var(--ink,#15191C)]"
                >
                  Platform
                </Link>
                <Link
                  href="/seller/requests"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-xl border border-[var(--line,#D9DED7)] bg-[var(--surface-2,#EBE9E2)] text-center text-[var(--ink,#15191C)]"
                >
                  Seller Portal
                </Link>
                <Link
                  href="/cases/RG-1465"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-xl border border-[var(--buyer,#4D92CC)]/30 bg-[var(--buyer,#4D92CC)]/10 text-center text-[var(--buyer,#4D92CC)] font-semibold"
                >
                  Case RG-1465
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--line,#D9DED7)] flex flex-col gap-2">
            <Link
              href="/sign-in"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3 text-center text-sm font-semibold text-[var(--ink,#15191C)] rounded-xl border border-[var(--line,#D9DED7)]"
            >
              Sign In
            </Link>
            <Link
              href="/intake"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3 text-center text-sm font-semibold text-white bg-[var(--accent,#4350E5)] rounded-xl shadow-md"
            >
              Lodge a Dispute →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
