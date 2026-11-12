"use client";

import { MarketingNavbar } from "./marketing-navbar";
import { MarketingHero } from "./marketing-hero";
import { ProblemStatementSection } from "./problem-statement";
import { HowItWorksFlowSection } from "./how-it-works-flow";
import { LiveInvestigationShowcase } from "./live-investigation-showcase";
import { ProductDifferentiatorsSection } from "./product-differentiators";
import { TrustSafetySection } from "./trust-safety-section";
import { MarketingCTA } from "./marketing-cta";
import { MarketingFooter } from "./marketing-footer";

export function MarketingHomePage() {
  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--ink)] antialiased selection:bg-[var(--accent)] selection:text-white">
      {/* 01: Top Navigation with Verified Route Anchors */}
      <MarketingNavbar />

      {/* 01: Hero Section — Improved Messaging & 4-Stage Convergence Storytelling */}
      <MarketingHero />

      {/* 02: The Payment Problem — 5 Disconnected Silos vs Unified Bilateral Resolution */}
      <ProblemStatementSection />

      {/* 03: How RESOLVEGRAPH Works — 4-Stage Architectural Flow */}
      <HowItWorksFlowSection />

      {/* 04: Interactive Investigation Demonstration — Sample Case #RG-2026-0412 Walkthrough */}
      <LiveInvestigationShowcase />

      {/* 05: Core Technologies — Matching, BEG, BERR Engine & EvidenceGuard */}
      <ProductDifferentiatorsSection />

      {/* 06: Security, Trust & Integration Transparency Matrix */}
      <TrustSafetySection />

      {/* 07: Final Call to Action — Every transaction has a story */}
      <MarketingCTA />

      {/* 08: Platform Footer with Transparent Status & System Specs */}
      <MarketingFooter />
    </div>
  );
}
