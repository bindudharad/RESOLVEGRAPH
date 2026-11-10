"use client";

import { LandingNavbar } from "@/components/landing/landing-navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { ScrollStorySection } from "@/components/landing/scroll-story";
import { InteractiveEvidenceGraph } from "@/components/3d/interactive-evidence-graph";
import { PackagePassport3D } from "@/components/3d/package-passport-3d";
import { Interactive3DInspectionLab } from "@/components/3d/interactive-3d-inspection-lab";
import { BerrView } from "@/components/cases/berr-view";
import { StatsSection } from "@/components/landing/stats-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { ManifestoSection } from "@/components/landing/manifesto-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { CTASection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      {/* 01: Premium Desktop Navbar with Mega-Menus & Command Palette */}
      <LandingNavbar />

      {/* 02: Cinematic 3D Hero: The Convergence Engine & Match Console */}
      <HeroSection />

      {/* 03: Telemetry Stats Strip */}
      <StatsSection />

      {/* 04: Advanced Scroll Storytelling: 6 Pinned Investigation Chapters */}
      <ScrollStorySection />

      {/* 05: 3D Interactive Evidence Graph with 5 View Modes & Node Inspector */}
      <InteractiveEvidenceGraph />

      {/* 06: 3D Package Passport: Draggable Carton, Tamper Seal, Milestones */}
      <PackagePassport3D />

      {/* 07: Flagship Dual-Engine Telemetry & 3D Model Inspection Lab */}
      <Interactive3DInspectionLab />

      {/* 08: Real Bilateral Evidence Record (BERR v2) live case comparison */}
      <section className="border-b border-[var(--line)] bg-[var(--bg)] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1 text-xs font-mono text-[var(--ink-2)]">
              <span className="h-2 w-2 rounded-full bg-[var(--agreed)]" />
              <span>BERR v2 CLASSIFICATION ENGINE</span>
            </div>
            <h2 className="mt-4 font-heading text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[var(--ink)]">
              Inspect the reasoning
              <span className="block font-display italic text-[var(--accent)] font-medium">
                beside the physical record.
              </span>
            </h2>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-[var(--ink-2)]">
              Facts are classified into AGREED, VERIFIED, CONTESTED, and MISSING without dismissing either side. Select any row to inspect proof provenance.
            </p>
          </div>
          <div className="mt-12">
            <BerrView
              caseId="RG-2026-0412"
              customerName="Alex Morgan (Buyer Thread)"
              merchantName="Apex Tech Labs Ltd (Merchant Thread)"
            />
          </div>
        </div>
      </section>

      {/* 09: 10-Tier Forensic Feature Standards with Spotlight Cards */}
      <FeaturesSection />

      {/* 10: 5 Core Arbitration Principles */}
      <ManifestoSection />

      {/* 11: 5-Stage Life Cycle Flow */}
      <HowItWorksSection />

      {/* 12: Evidence Dossier Verification Terminal */}
      <TestimonialsSection />

      {/* 13: High-Contrast Magnetic Call To Action */}
      <CTASection />

      {/* 14: Substantial Editorial Footer with System Status */}
      <LandingFooter />
    </div>
  );
}
