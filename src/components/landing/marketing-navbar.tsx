"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";

interface NavLink {
  label: string;
  href: string;
  badge?: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "The Problem", href: "#problem-statement" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Sample Case", href: "#investigation-showcase" },
  { label: "Core Tech", href: "#core-technologies" },
  { label: "Security & Trust", href: "#trust-safety" },
  { label: "Methodology", href: "/methodology" },
  { label: "Docs", href: "/docs" },
];

export function MarketingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 ${
        scrolled
          ? "border-b border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur-md shadow-sm"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo className="h-7 w-7" />
            <div className="flex flex-col">
              <span className="font-heading text-base font-bold tracking-tight text-[var(--ink)]">
                RESOLVEGRAPH
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--ink-2)] -mt-1 font-semibold">
                Evidence Intelligence
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Clean Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="relative px-3 py-1.5 text-xs font-medium text-[var(--ink-2)] transition-colors hover:text-[var(--ink)] rounded-md hover:bg-[var(--surface-2)]/60"
            >
              <span>{link.label}</span>
              {link.badge && (
                <span className="ml-1.5 rounded-full bg-[var(--accent)]/15 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-[var(--accent)]">
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/sign-in"
            className="px-3.5 py-1.5 text-xs font-medium text-[var(--ink-2)] transition-colors hover:text-[var(--ink)] rounded-md hover:bg-[var(--surface-2)]/60 cursor-pointer"
          >
            Sign In
          </Link>

          <Link
            href="/intake"
            className="group inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
          >
            <span>Start Investigation</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
            className="p-2 text-[var(--ink-2)] hover:text-[var(--ink)] rounded-md hover:bg-[var(--surface-2)] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[var(--line)] bg-[var(--surface)] px-6 py-4 shadow-xl">
          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-2)] cursor-pointer"
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[10px] font-mono font-semibold text-[var(--accent)]">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
            <div className="mt-3 pt-3 border-t border-[var(--line)] flex flex-col gap-2">
              <Link
                href="/sign-in"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)] cursor-pointer"
              >
                Sign In
              </Link>
              <Link
                href="/intake"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-white shadow-sm cursor-pointer"
              >
                <span>Start Investigation</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
