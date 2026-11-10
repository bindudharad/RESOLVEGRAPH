"use client";

import Link from "next/link";
import { ArrowRight, FileSearch, ShieldCheck } from "lucide-react";
import { HeroInvestigationDemo } from "./hero-investigation-demo";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--bg)] pt-28 sm:pt-32">
      <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-20">
        <div className="lg:col-span-6">
          <div className="mb-6 flex items-center gap-2 text-xs font-mono text-[var(--ink-3)]">
            <span className="h-2 w-2 rounded-full bg-[var(--agreed)]" aria-hidden="true" />
            <span>Evidence-led payment resolution</span>
          </div>
          <h1 className="max-w-3xl text-4xl font-normal leading-[1.04] tracking-tight text-[var(--ink)] sm:text-5xl lg:text-6xl">
            Resolve payment disputes from the record, not the story
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[var(--ink-2)] sm:text-lg">
            ResolveGraph traces buyer, bank, gateway, and merchant records into one auditable transaction decision—before a missed deadline becomes a customer loss.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3340C7] active:scale-[0.98]">
              Open workspace <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/methodology" className="inline-flex items-center gap-2 rounded-lg border border-[var(--line-strong)] px-5 py-3 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink-3)] hover:bg-[var(--surface)] active:scale-[0.98]">
              <FileSearch className="h-4 w-4 text-[var(--ink-2)]" /> See the method
            </Link>
          </div>
          <div className="mt-12 grid max-w-xl grid-cols-3 gap-4 border-t border-[var(--line)] pt-5 text-xs">
            <div><div className="font-mono text-[var(--ink-3)]">Record</div><div className="mt-1 font-medium text-[var(--ink)]">Cross-provider proof</div></div>
            <div><div className="font-mono text-[var(--ink-3)]">Decision</div><div className="mt-1 font-medium text-[var(--ink)]">Explainable match</div></div>
            <div><div className="font-mono text-[var(--ink-3)]">Control</div><div className="mt-1 flex items-center gap-1 font-medium text-[var(--ink)]"><ShieldCheck className="h-3.5 w-3.5 text-[var(--agreed)]" /> Human sign-off</div></div>
          </div>
        </div>
        <div className="lg:col-span-6 lg:py-8"><HeroInvestigationDemo /></div>
      </div>
    </section>
  );
}
