"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, ChevronDown } from "lucide-react";
import { AnimatedText, MagneticButton, FadeIn } from "@/components/landing/motion-primitives";
import { cn } from "@/lib/utils";

/* SSR-safe dynamic import for the 3D globe (heavy WebGL content) */
const HeroGlobe = dynamic(() => import("@/components/landing/hero-globe"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-48 w-48 animate-pulse rounded-full bg-[var(--color-brand)]/5 blur-xl" />
    </div>
  ),
});

/* -------------------------------------------------------------------------- */
/*  Trust logos                                                                */
/* -------------------------------------------------------------------------- */

const trustLogos = [
  "PayPal", "Stripe", "Shopify", "Square", "Klarna",
];

function TrustBar() {
  return (
    <FadeIn delay={0.8}>
      <div className="mt-16 flex flex-col items-center gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-faint)]">
          Trusted by leading commerce platforms
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {trustLogos.map((name) => (
            <span
              key={name}
              className="text-sm font-semibold tracking-wider text-[var(--color-subtle)] transition-colors hover:text-[var(--color-muted)]"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}

/* -------------------------------------------------------------------------- */
/*  HeroSection                                                               */
/* -------------------------------------------------------------------------- */

export function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* ── Background layers ── */}
      <div className="absolute inset-0 rg-mesh-bg" />
      <div className="absolute inset-0 rg-landing-grid" />

      {/* Radial fade vignette at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--color-app)] to-transparent" />

      {/* ── Main content: split layout ── */}
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center px-6 pt-32 lg:flex-row lg:gap-8 lg:pt-40">
        {/* ─── Left: Copy ─── */}
        <div className="flex-1 text-center lg:text-left">
          {/* Social proof badge */}
          <FadeIn delay={0.1}>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--color-brand)]/20 bg-[var(--color-brand)]/[0.06] px-4 py-1.5 text-[13px] font-medium text-[var(--color-brand-2)]">
              <motion.span
                className="h-2 w-2 rounded-full bg-emerald-400"
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              v2.0 — AI-Powered Resolution Engine
            </div>
          </FadeIn>

          {/* Main headline */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
            <AnimatedText
              text="Resolve Commerce"
              mode="word"
              className="text-white"
            />
            <br />
            <AnimatedText
              text="Disputes with"
              mode="word"
              className="text-white"
              delay={0.3}
            />
            <br />
            <span className="rg-gradient-text">
              <AnimatedText
                text="AI Intelligence"
                mode="word"
                delay={0.55}
              />
            </span>
          </h1>

          {/* Subtitle */}
          <FadeIn delay={0.7}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--color-muted)] lg:text-xl">
              From the first complaint to a fair resolution. Connect buyers,
              merchants, evidence, and AI-powered investigation in one
              enterprise platform.
            </p>
          </FadeIn>

          {/* CTA buttons */}
          <FadeIn delay={0.85}>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <MagneticButton strength={0.15}>
                <Link
                  href="/sign-up"
                  className={cn(
                    "group relative inline-flex items-center gap-2 overflow-hidden rounded-full",
                    "px-8 py-3.5 text-[15px] font-semibold text-white",
                    "bg-gradient-to-r from-[var(--color-brand)] via-[var(--color-brand-solid)] to-[#38bdf8]",
                    "shadow-[0_0_30px_rgba(124,92,255,0.3)]",
                    "transition-all duration-300",
                    "hover:shadow-[0_0_40px_rgba(124,92,255,0.45)] hover:scale-[1.02]",
                  )}
                >
                  {/* Shine sweep */}
                  <span
                    className={cn(
                      "absolute inset-0 -translate-x-full bg-gradient-to-r",
                      "from-transparent via-white/20 to-transparent",
                      "transition-transform duration-700 group-hover:translate-x-full",
                    )}
                  />
                  <span className="relative z-10">Start Free Trial</span>
                  <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </MagneticButton>

              <MagneticButton strength={0.15}>
                <Link
                  href="/demo"
                  className={cn(
                    "group inline-flex items-center gap-2 rounded-full",
                    "border border-white/10 px-7 py-3.5 text-[15px] font-medium text-[var(--color-muted)]",
                    "transition-all duration-300",
                    "hover:border-white/20 hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  <Play className="h-4 w-4 text-[var(--color-brand-2)]" />
                  Watch Demo
                </Link>
              </MagneticButton>
            </div>
          </FadeIn>

          {/* Trust bar */}
          <TrustBar />
        </div>

        {/* ─── Right: 3D Globe ─── */}
        <div className="relative mt-12 flex-1 lg:mt-0">
          <FadeIn delay={0.3} direction="right">
            <div className="relative mx-auto aspect-square max-w-[600px]">
              {/* Ambient glow behind globe */}
              <div
                aria-hidden
                className="absolute inset-0 -z-10 scale-110 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(124,92,255,0.12),transparent_60%)] blur-2xl"
              />
              <HeroGlobe className="h-full w-full" />
            </div>
          </FadeIn>
        </div>
      </div>

      {/* ── Scroll indicator ── */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown className="h-6 w-6 text-[var(--color-faint)]" />
      </motion.div>
    </section>
  );
}
