"use client";

import { motion } from "framer-motion";
import { FadeIn } from "@/components/landing/motion-primitives";
import { Logo } from "@/components/layout/logo";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  GitBranch as GithubIcon,
  MessageCircle as TwitterIcon,
  Briefcase as LinkedinIcon,
  Mail,
  ArrowUpRight,
} from "lucide-react";
import { useState } from "react";

/* -------------------------------------------------------------------------- */
/*  Footer link columns                                                       */
/* -------------------------------------------------------------------------- */

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const columns: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Cases", href: "/cases" },
      { label: "Evidence Library", href: "/evidence" },
      { label: "Resolution Center", href: "/resolution" },
      { label: "AI Copilot", href: "/copilot" },
      { label: "Analytics", href: "/analytics" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#about" },
      { label: "Careers", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Press", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#" },
      { label: "API Reference", href: "#" },
      { label: "Changelog", href: "#" },
      { label: "Status", href: "#", external: true },
      { label: "Community", href: "#", external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Cookie Policy", href: "#" },
      { label: "Security", href: "#" },
      { label: "Compliance", href: "#" },
    ],
  },
];

const socials = [
  { icon: GithubIcon, href: "#", label: "GitHub" },
  { icon: TwitterIcon, href: "#", label: "X (Twitter)" },
  { icon: LinkedinIcon, href: "#", label: "LinkedIn" },
];

/* -------------------------------------------------------------------------- */
/*  LandingFooter                                                             */
/* -------------------------------------------------------------------------- */

export function LandingFooter() {
  const [email, setEmail] = useState("");

  return (
    <footer className="relative border-t border-white/[0.05] bg-[#030712]">
      {/* Ambient glow at top */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[var(--color-brand)]/30 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -top-32 -translate-x-1/2 h-64 w-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(124,92,255,0.06),transparent_70%)] blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-6 pt-16 pb-10 lg:pt-20">
        {/* ── Top section: logo/tagline + newsletter ── */}
        <FadeIn>
          <div className="flex flex-col gap-8 border-b border-white/[0.06] pb-12 lg:flex-row lg:items-start lg:justify-between">
            {/* Logo + tagline */}
            <div className="max-w-md">
              <Link href="/" className="inline-flex items-center gap-2.5">
                <Logo className="h-9 w-9" />
                <span className="text-[17px] font-bold tracking-tight">
                  <span className="text-white">RESOLVE</span>
                  <span className="text-[var(--color-brand)]">GRAPH</span>
                </span>
              </Link>
              <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
                From the first complaint to a fair resolution. AI-powered
                commerce resolution infrastructure connecting buyers, merchants,
                and evidence in one platform.
              </p>
            </div>

            {/* Newsletter */}
            <div className="w-full max-w-sm">
              <p className="text-sm font-semibold text-[var(--color-fg)] mb-3">
                Stay updated
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setEmail("");
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-faint)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className={cn(
                      "h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-10 pr-3",
                      "text-sm text-[var(--color-fg)] placeholder:text-[var(--color-faint)]",
                      "outline-none transition-colors",
                      "focus:border-[var(--color-brand)]/40 focus:ring-1 focus:ring-[var(--color-brand)]/20",
                    )}
                  />
                </div>
                <button
                  type="submit"
                  className={cn(
                    "h-10 shrink-0 rounded-lg px-5 text-sm font-semibold text-white",
                    "bg-[var(--color-brand-solid)] transition-all",
                    "hover:bg-[var(--color-brand)] hover:shadow-[0_0_20px_rgba(124,92,255,0.25)]",
                  )}
                >
                  Subscribe
                </button>
              </form>
              <p className="mt-2 text-[11px] text-[var(--color-faint)]">
                No spam. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </FadeIn>

        {/* ── Link columns ── */}
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4 lg:gap-12">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-subtle)]">
                  {col.title}
                </p>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className={cn(
                          "group inline-flex items-center gap-1 text-sm text-[var(--color-muted)]",
                          "transition-colors hover:text-[var(--color-fg)]",
                        )}
                      >
                        {link.label}
                        {link.external && (
                          <ArrowUpRight className="h-3 w-3 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* ── Bottom bar ── */}
        <FadeIn delay={0.2}>
          <div className="flex flex-col gap-4 border-t border-white/[0.06] pt-8 sm:flex-row sm:items-center sm:justify-between">
            {/* Copyright + social */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <p className="text-xs text-[var(--color-faint)]">
                © 2026 RESOLVEGRAPH. All rights reserved.
              </p>
              <div className="flex items-center gap-3">
                {socials.map((s) => {
                  const Icon = s.icon;
                  return (
                    <Link
                      key={s.label}
                      href={s.href}
                      aria-label={s.label}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        "text-[var(--color-faint)] transition-all",
                        "hover:bg-white/[0.06] hover:text-[var(--color-fg)]",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-[var(--color-faint)]">
                Built with ❤️ for fair commerce
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-[11px] text-[var(--color-muted)]">
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                All systems operational
              </span>
            </div>
          </div>
        </FadeIn>
      </div>
    </footer>
  );
}
