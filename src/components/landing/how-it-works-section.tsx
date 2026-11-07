"use client";

import { FadeIn } from "@/components/landing/motion-primitives";
import { cn } from "@/lib/utils";
import { Upload, Brain, GitBranch, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Step {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    number: 1,
    icon: Upload,
    title: "Evidence Intake",
    description:
      "Buyers and merchants submit evidence — receipts, screenshots, communications, shipping records",
  },
  {
    number: 2,
    icon: Brain,
    title: "AI Investigation",
    description:
      "Our 14-stage BERR pipeline extracts, normalizes, and cross-references all evidence bilaterally",
  },
  {
    number: 3,
    icon: GitBranch,
    title: "Knowledge Graph",
    description:
      "Bilateral evidence graph maps relationships, detects contradictions, and traces temporal patterns",
  },
  {
    number: 4,
    icon: CheckCircle2,
    title: "Fair Resolution",
    description:
      "Human-governed AI proposes evidence-backed remedies with full transparency and audit trails",
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Heading */}
        <FadeIn>
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              <span className="bg-gradient-to-r from-[var(--color-brand-2)] via-[var(--color-brand)] to-[var(--color-info)] bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--color-muted)]">
              From evidence intake to fair resolution — a transparent,
              AI-powered pipeline you can trust.
            </p>
          </div>
        </FadeIn>

        {/* Timeline */}
        <div className="relative mt-16 lg:mt-24">
          {/* Horizontal connector line (desktop) */}
          <div className="absolute left-0 right-0 top-[3.25rem] hidden h-px bg-gradient-to-r from-transparent via-[var(--color-brand)]/30 to-transparent lg:block" />

          {/* Vertical connector line (mobile) */}
          <div className="absolute bottom-0 left-[1.6875rem] top-0 w-px bg-gradient-to-b from-[var(--color-brand)]/30 via-[var(--color-brand)]/20 to-transparent lg:hidden" />

          <div className="grid gap-12 lg:grid-cols-4 lg:gap-8">
            {steps.map((step, i) => {
              const Icon = step.icon;

              return (
                <FadeIn
                  key={step.number}
                  delay={i * 0.15}
                  direction="up"
                >
                  <div className="relative flex gap-5 lg:flex-col lg:items-center lg:gap-0 lg:text-center">
                    {/* Numbered circle with icon */}
                    <div className="relative z-10 flex-shrink-0">
                      {/* Glow behind the circle */}
                      <div className="absolute -inset-2 rounded-full bg-[var(--color-brand)]/10 blur-lg" />

                      <div
                        className={cn(
                          "relative flex h-14 w-14 items-center justify-center rounded-full",
                          "border border-[var(--color-brand)]/30 bg-[var(--color-surface)]",
                          "shadow-[0_0_24px_rgba(124,92,255,0.15)]",
                        )}
                      >
                        <Icon className="h-6 w-6 text-[var(--color-brand-2)]" />

                        {/* Step number badge */}
                        <span
                          className={cn(
                            "absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center",
                            "rounded-full bg-[var(--color-brand-solid)] text-[10px] font-bold text-white",
                          )}
                        >
                          {step.number}
                        </span>
                      </div>
                    </div>

                    {/* Text */}
                    <div className="lg:mt-6">
                      <h3 className="text-lg font-semibold text-[var(--color-fg)]">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)] lg:px-2">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
