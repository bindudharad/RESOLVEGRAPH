"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "@/components/landing/motion-primitives";
import { ShieldCheck, Network, Cpu, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Pillar data (Core Architectural Capabilities)                             */
/* -------------------------------------------------------------------------- */

interface Pillar {
  title: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  accentColor: string;
}

const pillars: Pillar[] = [
  {
    title: "Bilateral Evidence Graph",
    tagline: "Cryptographic Provenance",
    description:
      "Ingests shipping telematics, buyer submissions, and merchant records into an immutable event graph with strict SHA-256 hashing.",
    icon: Network,
    badge: "Deterministic Audit Trail",
    accentColor: "from-purple-500 to-indigo-500",
  },
  {
    title: "BERR AI Reasoning",
    tagline: "Rule-Based & Specialist Models",
    description:
      "Five specialist personas analyze policy alignment, fact consistency, and missing elements with transparent reasoning chains and zero hallucinated facts.",
    icon: Cpu,
    badge: "5 Specialist Agents",
    accentColor: "from-cyan-500 to-blue-500",
  },
  {
    title: "Human Governance & PayPal Integration",
    tagline: "Fail-Safe Financial Controls",
    description:
      "Preserves mandatory human approvals for every financial transaction. Direct PayPal Sandbox capture and refund flows with real two-phase verification.",
    icon: Lock,
    badge: "Mandatory Human-in-the-Loop",
    accentColor: "from-emerald-500 to-teal-500",
  },
];

/* -------------------------------------------------------------------------- */
/*  TestimonialsSection (Refactored to Core Resolution Capabilities)          */
/* -------------------------------------------------------------------------- */

export function TestimonialsSection() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      {/* Subtle background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(124,92,255,0.06),transparent_70%)] blur-3xl"
      />

      <div className="mx-auto max-w-6xl px-6">
        {/* Heading */}
        <FadeIn>
          <div className="text-center">
            <span className="rg-pill-badge mb-6 inline-flex">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-brand)]" />
              Verified Architecture
            </span>
            <h2
              className={cn(
                "mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl",
                "bg-gradient-to-b from-white to-[var(--color-muted)] bg-clip-text text-transparent",
              )}
            >
              Core Dispute Resolution Capabilities
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--color-muted)]">
              Enterprise-grade infrastructure designed for rigorous evidence verification,
              explainable dispute analysis, and fail-safe financial execution.
            </p>
          </div>
        </FadeIn>

        {/* Capability cards */}
        <StaggerContainer
          staggerDelay={0.12}
          className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3"
        >
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <StaggerItem key={p.title}>
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-2xl p-8",
                    "bg-[var(--color-surface)]/60 backdrop-blur-xl",
                    "border border-white/[0.06]",
                    "transition-all duration-400 ease-[var(--ease-out-soft)]",
                    "hover:border-[var(--color-brand)]/20 hover:bg-[var(--color-surface-2)]/80",
                    "hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_rgba(124,92,255,0.15)]",
                  )}
                >
                  {/* Badge & Icon */}
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl",
                        "bg-gradient-to-br text-white shadow-lg",
                        p.accentColor,
                      )}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-[11px] font-mono tracking-wider text-[var(--color-muted)] uppercase border border-white/10 rounded-full px-2.5 py-0.5">
                      {p.badge}
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-xl font-bold text-[var(--color-fg)]">
                    {p.title}
                  </h3>
                  <p className="text-xs font-medium text-[var(--color-brand)] mt-1 mb-4">
                    {p.tagline}
                  </p>

                  {/* Description */}
                  <p className="flex-1 text-[14px] leading-relaxed text-[var(--color-muted)]">
                    {p.description}
                  </p>

                  {/* Verification indicator */}
                  <div className="mt-6 flex items-center gap-2 border-t border-white/[0.06] pt-4 text-xs text-emerald-400/90 font-mono">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    Audited Implementation
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
