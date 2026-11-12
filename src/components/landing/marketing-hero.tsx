"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Scale, RefreshCw, FileText, CheckCircle2 } from "lucide-react";
import { HeroBilateralConvergence } from "./hero-bilateral-convergence";

export function MarketingHero() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--line,#D9DED7)] bg-[var(--bg,#F4F2EC)] pt-28 pb-16 sm:pt-36 sm:pb-24">
      {/* Subtle architectural contour and ambient radial wash */}
      <div className="contours pointer-events-none absolute inset-0 opacity-20" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[1100px] rounded-full bg-[radial-gradient(circle_at_center,rgba(67,80,229,0.12),transparent_70%)] blur-3xl opacity-70" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Left Column: Editorial Positioning, Staggered Headline & Actions */}
          <div className="lg:col-span-6 z-10">
            {/* Editorial Kicker Badge */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--line-strong,#B5BEB6)] bg-[var(--surface,#FFFEFA)] px-3.5 py-1.5 text-xs font-mono text-[var(--ink-2,#414B52)] shadow-xs"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--agreed,#2E8A62)] animate-pulse" />
              <span className="font-semibold text-[var(--ink,#15191C)] tracking-wide">
                THE EVIDENCE ATELIER · BILATERAL INVESTIGATION
              </span>
            </motion.div>

            {/* Staggered Line-by-Line Editorial Headline */}
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.14 },
                },
              }}
              className="font-heading text-4xl sm:text-5xl lg:text-[3.75rem] font-medium leading-[1.06] tracking-tight text-[var(--ink,#15191C)]"
            >
              <div className="overflow-hidden pb-1">
                <motion.span
                  className="block"
                  variants={{
                    hidden: { y: "110%", opacity: 0 },
                    visible: {
                      y: 0,
                      opacity: 1,
                      transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
                    },
                  }}
                >
                  Two sides of a dispute.
                </motion.span>
              </div>
              <div className="overflow-hidden pb-1">
                <motion.span
                  className="block font-display italic text-[var(--accent,#4350E5)] font-normal"
                  variants={{
                    hidden: { y: "110%", opacity: 0 },
                    visible: {
                      y: 0,
                      opacity: 1,
                      transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
                    },
                  }}
                >
                  One connected evidence record.
                </motion.span>
              </div>
            </motion.h1>

            {/* Supporting Narrative */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-6 text-base sm:text-lg leading-relaxed text-[var(--ink-2,#414B52)] max-w-xl"
            >
              RESOLVEGRAPH connects buyer and seller evidence into an immutable provenance graph, evaluates what the records establish with the BERR v2 reasoning engine, and coordinates accountable, human-authorized remedies across Amazon, Flipkart, and external commerce storefronts.
            </motion.p>

            {/* Primary & Secondary Action Cluster */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-8 flex flex-wrap items-center gap-3.5"
            >
              <Link
                href="/intake"
                className="rg-neumorph-raised group inline-flex items-center gap-2.5 rounded-xl bg-[var(--accent,#4350E5)] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[var(--accent,#4350E5)]/20 transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
              >
                <span>Lodge a Dispute →</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>

              <Link
                href="/cases/RG-1465"
                className="rg-neumorph-raised inline-flex items-center gap-2 rounded-xl border border-[var(--line-strong,#B5BEB6)] bg-[var(--surface,#FFFEFA)] px-5 py-3.5 text-sm font-medium text-[var(--ink,#15191C)] transition-all hover:border-[var(--ink-3,#718078)] hover:bg-[var(--surface-2,#EBE9E2)] active:scale-[0.98] cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-[var(--buyer,#4D92CC)]" />
                <span>Explore Case RG-1465 (Replacement)</span>
              </Link>

              <Link
                href="/cases/RG-1468"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-[var(--ink-2,#414B52)] hover:text-[var(--accent,#4350E5)] transition-colors"
              >
                <Scale className="h-3.5 w-3.5 text-[var(--merchant,#278B79)]" />
                <span>Case RG-1468 (Refund) →</span>
              </Link>
            </motion.div>

            {/* Editorial Provenance Key Signals */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.65 }}
              className="mt-12 grid grid-cols-3 gap-4 border-t border-[var(--line,#D9DED7)] pt-6 text-xs"
            >
              <div>
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--ink-3,#718078)] font-semibold">
                  01 · Ingestion
                </span>
                <p className="mt-1 font-semibold text-[var(--ink,#15191C)]">
                  Multi-Marketplace
                </p>
                <p className="text-xs text-[var(--ink-2,#414B52)] mt-0.5">
                  Amazon, Flipkart & direct invoices
                </p>
              </div>

              <div>
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--ink-3,#718078)] font-semibold">
                  02 · Reasoning
                </span>
                <p className="mt-1 font-semibold text-[var(--ink,#15191C)]">
                  BERR v2 Matrix
                </p>
                <p className="text-xs text-[var(--ink-2,#414B52)] mt-0.5">
                  AGREED, VERIFIED, CONTESTED
                </p>
              </div>

              <div>
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--ink-3,#718078)] font-semibold">
                  03 · Governance
                </span>
                <p className="mt-1 font-semibold text-[var(--ink,#15191C)]">
                  Dual-Key Approval
                </p>
                <p className="text-xs text-[var(--ink-2,#414B52)] mt-0.5">
                  Zero autonomous money movement
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Signature 3D Evidence Convergence Instrument */}
          <div className="lg:col-span-6">
            <HeroBilateralConvergence />
          </div>
        </div>
      </div>
    </section>
  );
}
