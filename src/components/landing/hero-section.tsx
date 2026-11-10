"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Network,
  Cpu,
  Layers,
} from "lucide-react";
import { TheConvergenceEngine } from "@/components/3d/the-convergence-engine";
import { HeroInvestigationDemo } from "./hero-investigation-demo";

export function HeroSection() {
  const [activeHeroView, setActiveHeroView] = useState<"3d" | "console">("3d");

  return (
    <section className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--bg)] pt-28 sm:pt-32">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-radial from-[var(--accent)]/10 via-[var(--buyer)]/5 to-transparent blur-3xl opacity-60" />

      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-7xl items-center gap-12 px-6 py-12 lg:grid-cols-12 lg:gap-14 lg:px-8 lg:py-16">
        {/* Left Column: Editorial Headline & Actions */}
        <div className="lg:col-span-6 z-10">
          {/* Subtle System Status Pill */}
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-mono text-[var(--ink-2)] shadow-xs">
            <span className="h-2 w-2 rounded-full bg-[var(--agreed)] animate-pulse" />
            <span className="font-semibold text-[var(--ink)]">THE EVIDENCE EXPERIENCE</span>
            <span className="text-[var(--ink-3)]">· v2.0 Architecture</span>
          </div>

          {/* Editorial Display Headline */}
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.05] tracking-tight text-[var(--ink)]">
            A dispute is a story told in fragments.
            <span className="block mt-2 font-display italic text-[var(--accent)] font-medium">
              We connect the evidence.
            </span>
          </h1>

          {/* Supporting Content */}
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--ink-2)] sm:text-lg">
            RESOLVEGRAPH brings buyer claims, merchant records and payment events into one source-linked investigation space—exposing contradictions before a missed deadline becomes a permanent loss.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link
              href="/overview"
              className="group inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[var(--accent)]/25 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <span>Explore the platform</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            <Link
              href="/investigation"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-5 py-3.5 text-sm font-medium text-[var(--ink)] shadow-xs transition-all hover:border-[var(--ink-3)] hover:bg-[var(--surface-2)] active:scale-[0.98]"
            >
              <Network className="h-4 w-4 text-[var(--buyer)]" />
              <span>See the investigation</span>
            </Link>

            <Link
              href="/overview"
              className="inline-flex items-center gap-2 rounded-xl border border-transparent px-4 py-3.5 text-sm font-medium text-[var(--ink-2)] transition-colors hover:text-[var(--accent)]"
            >
              <Sparkles className="h-4 w-4 text-[var(--amber)]" />
              <span>Open Workspace</span>
            </Link>
          </div>

          {/* Technical Metadata Standard Strip */}
          <div className="mt-12 grid max-w-xl grid-cols-3 gap-4 border-t border-[var(--line)] pt-6 text-xs">
            <div>
              <div className="font-mono text-[var(--ink-3)] uppercase tracking-wider text-[10px]">
                01 · Ingestion
              </div>
              <div className="mt-1.5 font-semibold text-[var(--ink)]">
                Bilateral Proof
              </div>
              <div className="text-[11px] text-[var(--ink-3)] mt-0.5">
                Buyer & merchant rails
              </div>
            </div>

            <div>
              <div className="font-mono text-[var(--ink-3)] uppercase tracking-wider text-[10px]">
                02 · Verification
              </div>
              <div className="mt-1.5 font-semibold text-[var(--ink)]">
                BERR v2 Matrix
              </div>
              <div className="text-[11px] text-[var(--ink-3)] mt-0.5">
                Explainable reasoning
              </div>
            </div>

            <div>
              <div className="font-mono text-[var(--ink-3)] uppercase tracking-wider text-[10px]">
                03 · Safeguard
              </div>
              <div className="mt-1.5 flex items-center gap-1 font-semibold text-[var(--ink)]">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--agreed)]" />
                Human Review
              </div>
              <div className="text-[11px] text-[var(--ink-3)] mt-0.5">
                Operator authorized
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 3D The Convergence Engine with View Switcher */}
        <div className="lg:col-span-6 flex flex-col z-10">
          {/* View Mode Toggle: 3D Convergence Engine vs Live Match Console */}
          <div className="mb-3 flex items-center justify-between">
            <div className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveHeroView("3d")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeHeroView === "3d"
                    ? "bg-[var(--accent)] text-white shadow-xs"
                    : "text-[var(--ink-2)] hover:text-[var(--ink)]"
                }`}
              >
                <Cpu className="h-3.5 w-3.5" />
                3D Convergence Engine
              </button>
              <button
                type="button"
                onClick={() => setActiveHeroView("console")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeHeroView === "console"
                    ? "bg-[var(--accent)] text-white shadow-xs"
                    : "text-[var(--ink-2)] hover:text-[var(--ink)]"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Live Matching Console
              </button>
            </div>

            <span className="hidden sm:inline-block text-[11px] font-mono text-[var(--ink-3)]">
              Interactive WebGL 3D
            </span>
          </div>

          {/* Active View Container */}
          {activeHeroView === "3d" ? (
            <TheConvergenceEngine />
          ) : (
            <HeroInvestigationDemo />
          )}
        </div>
      </div>
    </section>
  );
}
