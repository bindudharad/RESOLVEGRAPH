"use client";

import { MarketingNavbar } from "./marketing-navbar";
import { MarketingHero } from "./marketing-hero";
import { ProblemStatementSection } from "./problem-statement";
import { HowItWorksFlowSection } from "./how-it-works-flow";
import { ProductDifferentiatorsSection } from "./product-differentiators";
import { LiveInvestigationShowcase } from "./live-investigation-showcase";
import { TrustSafetySection } from "./trust-safety-section";
import { MarketingCTA } from "./marketing-cta";
import { MarketingFooter } from "./marketing-footer";

export function MarketingHomePage() {
  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--ink)] antialiased">
      {/* 01: Clean, Premium Marketing Navigation */}
      <MarketingNavbar />

      {/* 02: High-Impact First Impression Hero with 5-Stream Convergence */}
      <MarketingHero />

      {/* 03: Meaningful Problem Statement: 5 Fragmented Silos vs Unified Resolution */}
      <ProblemStatementSection />

      {/* 04: Connected 4-Stage Architectural Flow (Connect -> Normalize -> Compare -> Resolve) */}
      <HowItWorksFlowSection />

      {/* 05: Core Differentiators Showcase (BEG, BERR Matrix, AI Agent, Canonical Rails) */}
      <ProductDifferentiatorsSection />

      {/* 06: Compact Interactive Investigation Walkthrough of Case #RG-2026-0412 */}
      <LiveInvestigationShowcase />

      {/* 07: Trust, Safety & Transparency (SHA-256 integrity, 10-point safeguard, PayPal Sandbox) */}
      <TrustSafetySection />

      {/* 08: Conversion CTA to Demo and Documentation */}
      <MarketingCTA />

      {/* 09: Streamlined Fintech Editorial Footer */}
      <MarketingFooter />
    </div>
  );
}
