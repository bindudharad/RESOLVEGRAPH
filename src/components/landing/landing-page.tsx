"use client";

import { LandingNavbar } from "@/components/landing/landing-navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { ConvergenceHeroScene } from "@/components/landing/convergence-hero-scene";
import { ScrollStorySection } from "@/components/landing/scroll-story";
import { BerrView } from "@/components/cases/berr-view";
import { ManifestoSection } from "@/components/landing/manifesto-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { StatsSection } from "@/components/landing/stats-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { CTASection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <LandingNavbar />
      <HeroSection />
      <section className="border-b border-[var(--line)] bg-[var(--surface-2)] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-xs text-[var(--ink-3)]">Bilateral evidence</p>
            <h2 className="mt-4 text-3xl font-normal tracking-tight text-[var(--ink)] sm:text-4xl">Two records can disagree without either side being dismissed</h2>
            <p className="mt-4 text-sm leading-6 text-[var(--ink-2)]">Buyer and merchant evidence are independently preserved, then assessed against the same transaction record.</p>
          </div>
          <div className="mt-10">
          <ConvergenceHeroScene />
          </div>
        </div>
      </section>
      <StatsSection />
      <ScrollStorySection />
      <section className="border-b border-[var(--line)] bg-[var(--bg)] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl"><p className="font-mono text-xs text-[var(--ink-3)]">BERR v2</p><h2 className="mt-4 text-3xl font-normal tracking-tight text-[var(--ink)] sm:text-4xl">Inspect the reasoning beside the record</h2><p className="mt-4 text-sm leading-6 text-[var(--ink-2)]">Select a row to compare evidence and review its classification.</p></div>
          <div className="mt-10">
          <BerrView
            caseId="RG-2026-0412"
            customerName="Alex Morgan (Buyer Thread)"
            merchantName="Apex Tech Labs Ltd (Merchant Thread)"
          />
          </div>
        </div>
      </section>
      <FeaturesSection />
      <ManifestoSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
