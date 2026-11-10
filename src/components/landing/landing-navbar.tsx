"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Menu,
  X,
  Search,
  ChevronDown,
  Layers,
  Network,
  Scale,
  ShoppingBag,
  PackageCheck,
  Building,
  CreditCard,
  ShieldCheck,
  Bot,
  FileCheck2,
  Lock,
  BookOpen,
  FileSearch,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/layout/logo";
import { CommandPalette } from "@/components/common/command-palette";

interface MegaMenuItem {
  title: string;
  description: string;
  href: string;
  icon: typeof Layers;
  badge?: string;
}

const PRODUCT_ITEMS: MegaMenuItem[] = [
  {
    title: "Investigation Workspace",
    description: "Cross-provider dispute ledger with live evidentiary audit trails.",
    href: "/cases",
    icon: Layers,
    badge: "Core",
  },
  {
    title: "Evidence Graph",
    description: "Interactive 3D relationship mapping across buyer & merchant entities.",
    href: "/investigation",
    icon: Network,
    badge: "3D",
  },
  {
    title: "Bilateral Evidence Review",
    description: "Objective fact classification separating verified from contested records.",
    href: "/overview",
    icon: Scale,
  },
  {
    title: "Purchase Memory",
    description: "Pre-dispute order baselines, catalog snapshots, and SKU forensics.",
    href: "/purchases",
    icon: ShoppingBag,
  },
  {
    title: "Package Passport",
    description: "Unboxing verification sessions, tamper seal telemetry & carrier scales.",
    href: "/packages",
    icon: PackageCheck,
  },
  {
    title: "Resolution Room",
    description: "Multi-party consensus workflow with escrow release safeguards.",
    href: "/resolution-room",
    icon: Building,
    badge: "Escrow",
  },
];

const PLATFORM_ITEMS: MegaMenuItem[] = [
  {
    title: "Payment Intelligence",
    description: "Multi-rail settlement tracing, card scheme rules, and chargeback prevention.",
    href: "/payments",
    icon: CreditCard,
  },
  {
    title: "Evidence Vault",
    description: "SHA-256 chained, immutable evidentiary repository with strict PII controls.",
    href: "/evidence",
    icon: ShieldCheck,
  },
  {
    title: "AI Investigation",
    description: "Automated discrepancy extraction, temporal analysis, and missing proof detection.",
    href: "/copilot",
    icon: Bot,
    badge: "AI",
  },
  {
    title: "Audit Ledger",
    description: "Automated transaction reconciliation and dispute life cycle reporting.",
    href: "/reconciliation",
    icon: FileCheck2,
  },
  {
    title: "Security & Trust",
    description: "Tenant isolation, cryptographic signatures, and role-based permissions.",
    href: "/admin/security",
    icon: Lock,
  },
];

const RESOURCE_ITEMS: MegaMenuItem[] = [
  {
    title: "Documentation",
    description: "API specifications, SDK documentation, and enterprise integration guides.",
    href: "/docs",
    icon: BookOpen,
  },
  {
    title: "Methodology",
    description: "The 10-tier forensic arbitration standard and non-judgmental consensus protocol.",
    href: "/methodology",
    icon: FileSearch,
  },
  {
    title: "Interactive Demo Case",
    description: "Walk through the Alex Morgan vs. Apex Tech Labs bilateral investigation.",
    href: "/demo",
    icon: Sparkles,
    badge: "Live",
  },
  {
    title: "Help & Triage Manual",
    description: "Operator support guidelines, dispute workflows, and emergency triage.",
    href: "/help",
    icon: HelpCircle,
  },
];

export function LandingNavbar() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor scroll for compact glass transition
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard escape listener to close mega menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveMenu(null);
        setMobileMenuOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleMouseEnter = (menuName: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setActiveMenu(menuName);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur-xl shadow-lg shadow-black/10 py-2.5"
            : "border-b border-transparent bg-transparent py-4"
        }`}
      >
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 lg:px-8">
          {/* Brand Mark & Wordmark */}
          <Link
            href="/overview"
            aria-label="RESOLVEGRAPH overview"
            className="group flex items-center gap-3.5 focus-visible:outline-none"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)]/80 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Logo className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-base font-bold tracking-tight text-[var(--ink)]">
                RESOLVEGRAPH
              </span>
              <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--ink-3)] -mt-1">
                Evidence Engine
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links with Mega-Menu Triggers */}
          <div className="hidden lg:flex items-center gap-1.5" onMouseLeave={handleMouseLeave}>
            {/* PRODUCT */}
            <div className="relative" onMouseEnter={() => handleMouseEnter("product")}>
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === "product" ? null : "product")}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium tracking-wide uppercase transition-colors rounded-lg ${
                  activeMenu === "product"
                    ? "bg-[var(--surface-2)] text-[var(--ink)]"
                    : "text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]/50"
                }`}
                aria-expanded={activeMenu === "product"}
              >
                Product <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${activeMenu === "product" ? "rotate-180 text-[var(--accent)]" : ""}`} />
              </button>
            </div>

            {/* PLATFORM */}
            <div className="relative" onMouseEnter={() => handleMouseEnter("platform")}>
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === "platform" ? null : "platform")}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium tracking-wide uppercase transition-colors rounded-lg ${
                  activeMenu === "platform"
                    ? "bg-[var(--surface-2)] text-[var(--ink)]"
                    : "text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]/50"
                }`}
                aria-expanded={activeMenu === "platform"}
              >
                Platform <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${activeMenu === "platform" ? "rotate-180 text-[var(--accent)]" : ""}`} />
              </button>
            </div>

            {/* HOW IT WORKS */}
            <Link
              href="#how-it-works"
              className="px-3.5 py-2 text-xs font-medium tracking-wide uppercase text-[var(--ink-2)] transition-colors rounded-lg hover:text-[var(--ink)] hover:bg-[var(--surface-2)]/50"
            >
              How it works
            </Link>

            {/* RESOURCES */}
            <div className="relative" onMouseEnter={() => handleMouseEnter("resources")}>
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === "resources" ? null : "resources")}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium tracking-wide uppercase transition-colors rounded-lg ${
                  activeMenu === "resources"
                    ? "bg-[var(--surface-2)] text-[var(--ink)]"
                    : "text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]/50"
                }`}
                aria-expanded={activeMenu === "resources"}
              >
                Resources <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${activeMenu === "resources" ? "rotate-180 text-[var(--accent)]" : ""}`} />
              </button>
            </div>

            {/* METHODOLOGY */}
            <Link
              href="/methodology"
              className="px-3.5 py-2 text-xs font-medium tracking-wide uppercase text-[var(--ink-2)] transition-colors rounded-lg hover:text-[var(--ink)] hover:bg-[var(--surface-2)]/50"
            >
              Methodology
            </Link>
          </div>

          {/* Right Action Stack: Search Command + Sign In + Primary CTA */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--ink-2)] transition-all hover:border-[var(--line-strong)] hover:text-[var(--ink)] shadow-xs"
              title="Search commands (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 text-[var(--ink-3)]" />
              <span className="hidden md:inline">Search records</span>
              <kbd className="hidden md:inline rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--ink-3)] border border-[var(--line)]">
                ⌘K
              </kbd>
            </button>

            <Link
              href="/sign-in"
              className="text-xs font-medium text-[var(--ink-2)] transition-colors hover:text-[var(--ink)] px-2 py-1.5"
            >
              Sign in
            </Link>

            <Link
              href="/dashboard"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <span>Open workspace</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* Desktop Mega-Menu Overlay Panels */}
        <AnimatePresence>
          {activeMenu && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onMouseEnter={() => {
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
              }}
              onMouseLeave={handleMouseLeave}
              className="absolute inset-x-0 top-full border-b border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-2xl shadow-2xl py-6"
            >
              <div className="mx-auto max-w-7xl px-6 lg:px-8">
                {activeMenu === "product" && (
                  <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-8 grid grid-cols-2 gap-4">
                      {PRODUCT_ITEMS.map((item) => (
                        <Link
                          key={item.title}
                          href={item.href}
                          onClick={() => setActiveMenu(null)}
                          className="group flex items-start gap-3.5 rounded-xl border border-transparent p-3.5 transition-all hover:border-[var(--line)] hover:bg-[var(--surface-2)]"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--ink-2)] transition-colors group-hover:border-[var(--accent)]/40 group-hover:text-[var(--accent)]">
                            <item.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--accent)]">
                                {item.title}
                              </span>
                              {item.badge && (
                                <span className="rounded bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-[var(--accent)] border border-[var(--accent)]/20">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-[var(--ink-3)] group-hover:text-[var(--ink-2)]">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="col-span-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-[var(--accent)]">
                          <span className="h-2 w-2 rounded-full bg-[var(--agreed)] animate-pulse" />
                          Evidence Architecture
                        </div>
                        <h4 className="mt-2 text-sm font-semibold text-[var(--ink)]">
                          Bilateral Ledger Standard
                        </h4>
                        <p className="mt-2 text-xs text-[var(--ink-2)] leading-relaxed">
                          ResolveGraph maintains separate buyer and merchant evidence graphs before compiling them into an explainable bilateral consensus matrix.
                        </p>
                      </div>
                      <Link
                        href="/demo"
                        onClick={() => setActiveMenu(null)}
                        className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] hover:underline"
                      >
                        Launch interactive demo case <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                )}

                {activeMenu === "platform" && (
                  <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-8 grid grid-cols-2 gap-4">
                      {PLATFORM_ITEMS.map((item) => (
                        <Link
                          key={item.title}
                          href={item.href}
                          onClick={() => setActiveMenu(null)}
                          className="group flex items-start gap-3.5 rounded-xl border border-transparent p-3.5 transition-all hover:border-[var(--line)] hover:bg-[var(--surface-2)]"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--ink-2)] transition-colors group-hover:border-[var(--accent)]/40 group-hover:text-[var(--accent)]">
                            <item.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--accent)]">
                                {item.title}
                              </span>
                              {item.badge && (
                                <span className="rounded bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-[var(--accent)] border border-[var(--accent)]/20">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-[var(--ink-3)] group-hover:text-[var(--ink-2)]">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="col-span-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-[var(--buyer)]">
                          <ShieldCheck className="h-4 w-4" />
                          Cryptographic Assurance
                        </div>
                        <h4 className="mt-2 text-sm font-semibold text-[var(--ink)]">
                          SHA-256 Chained Integrity
                        </h4>
                        <p className="mt-2 text-xs text-[var(--ink-2)] leading-relaxed">
                          Every document, tracking payload, and AI extraction event is hashed and chained into an immutable audit trail readable by banks and schemes.
                        </p>
                      </div>
                      <Link
                        href="/reconciliation"
                        onClick={() => setActiveMenu(null)}
                        className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[var(--buyer)] hover:underline"
                      >
                        Inspect reconciliation ledger <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                )}

                {activeMenu === "resources" && (
                  <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-8 grid grid-cols-2 gap-4">
                      {RESOURCE_ITEMS.map((item) => (
                        <Link
                          key={item.title}
                          href={item.href}
                          onClick={() => setActiveMenu(null)}
                          className="group flex items-start gap-3.5 rounded-xl border border-transparent p-3.5 transition-all hover:border-[var(--line)] hover:bg-[var(--surface-2)]"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--ink-2)] transition-colors group-hover:border-[var(--accent)]/40 group-hover:text-[var(--accent)]">
                            <item.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--accent)]">
                                {item.title}
                              </span>
                              {item.badge && (
                                <span className="rounded bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-[var(--accent)] border border-[var(--accent)]/20">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-[var(--ink-3)] group-hover:text-[var(--ink-2)]">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="col-span-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-[var(--merchant)]">
                          <FileSearch className="h-4 w-4" />
                          10-Tier Forensic Standard
                        </div>
                        <h4 className="mt-2 text-sm font-semibold text-[var(--ink)]">
                          Auditable Decision Trees
                        </h4>
                        <p className="mt-2 text-xs text-[var(--ink-2)] leading-relaxed">
                          Review how ResolveGraph evaluates carrier tracking, digital weigh-ins, device serials, and unboxing video timestamps.
                        </p>
                      </div>
                      <Link
                        href="/methodology"
                        onClick={() => setActiveMenu(null)}
                        className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[var(--merchant)] hover:underline"
                      >
                        Read the full methodology <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full-screen Mobile Overlay Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 top-16 z-40 bg-[var(--bg)] px-6 py-8 overflow-y-auto lg:hidden"
            >
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
                  <span className="font-mono text-xs text-[var(--ink-3)] uppercase tracking-wider">
                    Navigation Menu
                  </span>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setCommandPaletteOpen(true);
                    }}
                    className="flex items-center gap-1.5 text-xs text-[var(--accent)] font-medium"
                  >
                    <Search className="h-3.5 w-3.5" /> Quick Search
                  </button>
                </div>

                {/* Mobile Section 1: Product */}
                <div>
                  <h4 className="font-mono text-xs uppercase tracking-wider text-[var(--ink-3)] mb-3">
                    Product Suite
                  </h4>
                  <div className="flex flex-col gap-2">
                    {PRODUCT_ITEMS.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between rounded-lg p-2.5 text-sm text-[var(--ink)] hover:bg-[var(--surface-2)]"
                      >
                        <span className="flex items-center gap-3">
                          <item.icon className="h-4 w-4 text-[var(--accent)]" />
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="rounded bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-mono text-[var(--accent)]">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Mobile Section 2: Platform */}
                <div>
                  <h4 className="font-mono text-xs uppercase tracking-wider text-[var(--ink-3)] mb-3">
                    Platform
                  </h4>
                  <div className="flex flex-col gap-2">
                    {PLATFORM_ITEMS.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between rounded-lg p-2.5 text-sm text-[var(--ink)] hover:bg-[var(--surface-2)]"
                      >
                        <span className="flex items-center gap-3">
                          <item.icon className="h-4 w-4 text-[var(--buyer)]" />
                          {item.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Mobile Section 3: Resources & Actions */}
                <div className="pt-4 border-t border-[var(--line)] flex flex-col gap-3">
                  <Link
                    href="/methodology"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-medium text-[var(--ink)] py-2"
                  >
                    Methodology Specification
                  </Link>
                  <Link
                    href="/demo"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-medium text-[var(--accent)] py-2"
                  >
                    Interactive Demo Case
                  </Link>
                  <Link
                    href="/sign-in"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-medium text-[var(--ink-2)] py-2"
                  >
                    Sign in to Account
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white shadow-md"
                  >
                    Open Workspace <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Global Command Palette */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </>
  );
}
