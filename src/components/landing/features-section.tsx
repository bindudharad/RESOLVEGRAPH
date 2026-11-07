"use client";

import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  GlowCard,
} from "@/components/landing/motion-primitives";
import { cn } from "@/lib/utils";
import {
  Shield,
  Brain,
  Zap,
  GitBranch,
  BarChart3,
  Lock,
  Layers,
  Eye,
  Bot,
  type LucideIcon,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Feature data                                                              */
/* -------------------------------------------------------------------------- */

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Brain,
    title: "AI Evidence Analysis",
    description:
      "Multimodal AI extraction with vision and text analysis across 14 processing stages",
  },
  {
    icon: GitBranch,
    title: "Bilateral Knowledge Graph",
    description:
      "Interactive evidence graphs connecting buyer and seller perspectives bilaterally",
  },
  {
    icon: Zap,
    title: "Real-Time Resolution",
    description:
      "Sub-second dispute processing with deterministic fallbacks and zero-dependency parsing",
  },
  {
    icon: Shield,
    title: "PayPal Integration",
    description:
      "Native PayPal Orders V2, disputes, webhooks, and automated ledger reconciliation",
  },
  {
    icon: Bot,
    title: "Human-AI Governance",
    description:
      "Multi-agent orchestration with human authorization gates and SHA-256 verification",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description:
      "Comprehensive analytics with RECOURSE-BENCH 300-case empirical benchmarking",
  },
  {
    icon: Lock,
    title: "Multi-Tenant Security",
    description:
      "Enterprise RBAC, organization isolation, and FIPS 140-2 compliant storage",
  },
  {
    icon: Layers,
    title: "Temporal Intelligence",
    description:
      "Temporal sequencing with counterfactual replay and semantic drift detection",
  },
  {
    icon: Eye,
    title: "Transparency Engine",
    description:
      "Complete audit trails with structured JSON logging and credential redaction",
  },
];

/* -------------------------------------------------------------------------- */
/*  Feature card                                                              */
/* -------------------------------------------------------------------------- */

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;

  return (
    <GlowCard>
      <div className="flex flex-col gap-4 p-6 sm:p-8">
        {/* Icon */}
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            "bg-[var(--color-brand,#3b82f6)]/10",
            "transition-transform duration-300 group-hover:scale-110",
          )}
        >
          <Icon className="h-6 w-6 text-[var(--color-brand,#3b82f6)]" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-white">{feature.title}</h3>

        {/* Description */}
        <p className="text-sm leading-relaxed text-[var(--color-muted,#94a3b8)]">
          {feature.description}
        </p>
      </div>
    </GlowCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  FeaturesSection                                                           */
/* -------------------------------------------------------------------------- */

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8"
    >
      {/* ---- Header ---- */}
      <div className="mx-auto max-w-3xl text-center">
        <FadeIn>
          {/* Pill badge */}
          <span
            className={cn(
              "mb-6 inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase",
              "bg-gradient-to-r from-[var(--color-brand,#3b82f6)]/20 to-[var(--color-brand-light,#60a5fa)]/20",
              "text-[var(--color-brand-light,#60a5fa)]",
              "ring-1 ring-[var(--color-brand,#3b82f6)]/25",
            )}
          >
            Powerful Features
          </span>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2
            className={cn(
              "mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl",
              "bg-gradient-to-b from-white to-[var(--color-muted,#94a3b8)] bg-clip-text text-transparent",
            )}
          >
            Everything you need to resolve disputes
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[var(--color-muted,#94a3b8)] sm:text-lg">
            A comprehensive platform combining AI-powered evidence analysis,
            bilateral knowledge graphs, and enterprise-grade security to
            transform how disputes are understood and resolved.
          </p>
        </FadeIn>
      </div>

      {/* ---- Feature grid ---- */}
      <StaggerContainer
        staggerDelay={0.08}
        className="mx-auto mt-20 grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {features.map((feature) => (
          <StaggerItem key={feature.title}>
            <FeatureCard feature={feature} />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}
