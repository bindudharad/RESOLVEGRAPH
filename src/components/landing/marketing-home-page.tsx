"use client";

import { MarketingNavbar } from "./marketing-navbar";
import { MarketingHero } from "./marketing-hero";
import { MarketingMarquee } from "./marketing-marquee";
import { ProblemStatementSection } from "./problem-statement";
import { HowItWorksFlowSection } from "./how-it-works-flow";
import { LiveInvestigationShowcase } from "./live-investigation-showcase";
import { EvidenceArchitectureGallery } from "./evidence-architecture-gallery";
import { ProductDifferentiatorsSection } from "./product-differentiators";
import { TrustSafetySection } from "./trust-safety-section";
import { LandingFAQSection } from "./landing-faq-section";
import { MarketingCTA } from "./marketing-cta";
import { MarketingFooter } from "./marketing-footer";

export function MarketingHomePage() {
  return (
    <div className="relative min-h-screen bg-[var(--bg,#F4F2EC)] text-[var(--ink,#15191C)] antialiased selection:bg-[var(--accent,#4350E5)] selection:text-white">
      {/* 01: Floating Pill Navigation with Scroll Progress & Explore Mega Menu */}
      <MarketingNavbar />

      {/* 02: Hero Section — Editorial Text-Led Typography & Bilateral Convergence Engine */}
      <MarketingHero />

      {/* 03: Horizontal Scrolling Marquee Strip */}
      <MarketingMarquee />

      {/* 04: The Payment Problem — 5 Disconnected Silos vs Unified Bilateral Resolution */}
      <ProblemStatementSection />

      {/* 05: How RESOLVEGRAPH Works — 4-Stage Architectural Flow */}
      <HowItWorksFlowSection />

      {/* 06: Visual Storytelling Gallery — 4 Pillars with Local Imagery & Overlays */}
      <EvidenceArchitectureGallery />

      {/* 07: Interactive Investigation Demonstration — Sample Case #RG-2026-0412 Walkthrough */}
      <LiveInvestigationShowcase />

      {/* 08: Core Technologies — Matching, BEG, BERR Engine & EvidenceGuard */}
      <ProductDifferentiatorsSection />

      {/* 09: Security, Trust & Integration Transparency Matrix */}
      <TrustSafetySection />

      {/* 10: Frequently Examined Questions (Interactive Accordion) */}
      <LandingFAQSection />

      {/* 11: Final Call to Action — Every transaction has a story */}
      <MarketingCTA />

      {/* 12: Platform Footer with Transparent Status & System Specs */}
      <MarketingFooter />
    </div>
  );
}
