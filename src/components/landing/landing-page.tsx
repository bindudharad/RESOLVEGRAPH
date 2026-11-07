"use client";

import { LandingNavbar } from "@/components/landing/landing-navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { StatsSection } from "@/components/landing/stats-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { CTASection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";

/**
 * Full landing page composition.
 * Each section is a standalone component with its own scroll animations.
 */
export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[var(--color-app)] text-[var(--color-fg)]">
      {/* Floating glassmorphic navbar */}
      <LandingNavbar />

      {/* Hero with 3D globe */}
      <HeroSection />

      {/* Statistics bar */}
      <StatsSection />

      {/* Feature grid */}
      <FeaturesSection />

      {/* How it works timeline */}
      <HowItWorksSection />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Call-to-action */}
      <CTASection />

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
