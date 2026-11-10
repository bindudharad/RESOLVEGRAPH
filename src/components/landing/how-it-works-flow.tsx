"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  GitCompare,
  Network,
  Cpu,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface WorkflowStep {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof FileText;
  color: string;
  architectureDetails: {
    engine: string;
    inputs: string[];
    guarantee: string;
  };
}

const STEPS: WorkflowStep[] = [
  {
    number: "01",
    title: "Connect Evidence",
    subtitle: "Multi-Source Intake & Ingestion",
    description:
      "Collect supported payment records, receipts, invoices, unboxing media, bank records, and merchant warehouse evidence into an immutable SHA-256 evidence vault.",
    icon: FileText,
    color: "var(--buyer)",
    architectureDetails: {
      engine: "Evidence Vault & Intake API",
      inputs: [
        "Buyer 4K unboxing recording & scale photos",
        "Merchant ERP dispatch manifests & serial scans",
        "PayPal payment captures & dispute webhooks",
        "Banking 3D Secure v2 settlement tokens",
      ],
      guarantee: "Deterministic SHA-256 byte immutability",
    },
  },
  {
    number: "02",
    title: "Normalize and Match",
    subtitle: "Canonical Transaction Reconciliation",
    description:
      "The Canonical Transaction Engine standardizes disparate currencies, ISO timestamps, and identifiers across PayPal, Stripe, cards, and UPI to identify cross-source matches.",
    icon: GitCompare,
    color: "var(--amber)",
    architectureDetails: {
      engine: "Canonical Transaction Engine",
      inputs: [
        "Currency & minor-unit conversion",
        "Fuzzy & exact temporal window reconciliation",
        "Cryptographic argument hashing",
        "Cross-provider transaction graph indexing",
      ],
      guarantee: "10-Tier deterministic matching hierarchy",
    },
  },
  {
    number: "03",
    title: "Compare Both Sides",
    subtitle: "Bilateral Evidence Graph Assembly",
    description:
      "The Bilateral Evidence Graph (BEG) links buyer claims, merchant proofs, and payment events into an interconnected graph, exposing contradictions and missing records.",
    icon: Network,
    color: "var(--ai)",
    architectureDetails: {
      engine: "Bilateral Evidence Graph (BEG v2)",
      inputs: [
        "Entity relationship topology (Buyer ↔ Merchant ↔ Payment)",
        "Transit checkpoint timeline projection",
        "Contradiction detection across weight & seals",
        "Missing proof detection & evidentiary gaps",
      ],
      guarantee: "Bilateral fairness — zero unilateral bias",
    },
  },
  {
    number: "04",
    title: "Explain and Resolve",
    subtitle: "BERR Reasoning & Safeguarded Remedy",
    description:
      "The BERR reasoning engine classifies facts into AGREED, VERIFIED, CONTESTED, and MISSING. The AI agent generates an explainable finding, subject to strict human sign-off.",
    icon: Cpu,
    color: "var(--agreed)",
    architectureDetails: {
      engine: "BERR v2 & 10-Point Safeguard Gate",
      inputs: [
        "Deterministic fact-matrix classification",
        "Root cause localization (e.g. Carrier Hub #3)",
        "Policy-grounded resolution proposals",
        "Cryptographic human approval sign-off requirement",
      ],
      guarantee: "Zero autonomous financial payouts — Human Gate",
    },
  },
];

export function HowItWorksFlowSection() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const currentStep = STEPS[activeStepIndex];

  return (
    <section id="how-it-works" className="border-b border-[var(--line)] bg-[var(--bg)] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1 text-xs font-mono text-[var(--ink-2)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>HOW IT WORKS</span>
          </div>

          <h2 className="mt-4 font-heading text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[var(--ink)]">
            From fragmented dispute to{" "}
            <span className="font-display italic text-[var(--accent)] font-medium">
              an explainable resolution.
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg leading-relaxed text-[var(--ink-2)]">
            RESOLVEGRAPH connects four automated, cryptographically grounded
            stages. The system synthesizes evidence and proposes remedies; an
            authorized human operator always gives final approval.
          </p>
        </div>

        {/* 4 Connected Stages Stepper Cards */}
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, idx) => {
            const isSelected = activeStepIndex === idx;
            const Icon = step.icon;
            return (
              <button
                key={step.number}
                type="button"
                onClick={() => setActiveStepIndex(idx)}
                className={`relative flex flex-col justify-between rounded-2xl border p-6 text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--surface)] shadow-lg shadow-[var(--accent)]/5 ring-1 ring-[var(--accent)]"
                    : "border-[var(--line)] bg-[var(--surface-2)]/50 hover:border-[var(--line-strong)] hover:bg-[var(--surface)]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[var(--ink-3)]">
                      {step.number}
                    </span>
                    <div
                      className="rounded-lg p-2"
                      style={{
                        backgroundColor: `${step.color}15`,
                        color: step.color,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>

                  <h3 className="mt-5 text-base font-semibold text-[var(--ink)]">
                    {step.title}
                  </h3>

                  <p className="mt-1 font-mono text-[11px] text-[var(--ink-3)]">
                    {step.subtitle}
                  </p>

                  <p className="mt-3 text-xs leading-relaxed text-[var(--ink-2)] line-clamp-3">
                    {step.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--line)] flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[var(--ink-3)]">Click to inspect</span>
                  <span
                    className={`font-semibold ${
                      isSelected ? "text-[var(--accent)]" : "text-[var(--ink-3)]"
                    }`}
                  >
                    Stage {step.number} →
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Stage Deep Architecture Inspector */}
        <div className="mt-8 rounded-3xl border border-[var(--line-strong)] bg-[var(--surface)] p-6 sm:p-8 shadow-xl">
          <div className="grid gap-8 lg:grid-cols-12 items-center">
            {/* Left: Stage Summary */}
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-2 rounded-md bg-[var(--surface-2)] px-2.5 py-1 text-xs font-mono text-[var(--ink-2)]">
                <span className="font-semibold text-[var(--ink)]">
                  ARCHITECTURE DETAIL · STAGE {currentStep.number}
                </span>
              </div>

              <h4 className="mt-3 font-heading text-2xl font-semibold text-[var(--ink)]">
                {currentStep.title}: {currentStep.subtitle}
              </h4>

              <p className="mt-3 text-sm leading-relaxed text-[var(--ink-2)]">
                {currentStep.description}
              </p>

              <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/60 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
                  <ShieldCheck className="h-4 w-4 text-[var(--agreed)]" />
                  <span>Platform System Guarantee</span>
                </div>
                <p className="mt-1 text-xs font-mono text-[var(--ink-2)]">
                  {currentStep.architectureDetails.guarantee}
                </p>
              </div>
            </div>

            {/* Right: Technical Inputs & Engine */}
            <div className="lg:col-span-7 rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-5">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <span className="font-mono text-xs text-[var(--ink-3)] uppercase tracking-wider">
                  Internal Engine
                </span>
                <span className="font-mono text-xs font-semibold text-[var(--accent)]">
                  {currentStep.architectureDetails.engine}
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
                  Live Operations & Invariants:
                </span>
                {currentStep.architectureDetails.inputs.map((input, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-mono text-[var(--ink)]"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--agreed)] shrink-0" />
                    <span>{input}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-8 flex items-center justify-between border-t border-[var(--line)] pt-6 text-xs text-[var(--ink-2)]">
          <span>Supported payment channels: PayPal, Stripe, SEPA, Visa, Mastercard, and India UPI.</span>
          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 font-semibold text-[var(--accent)] hover:text-[var(--ink)] transition-colors"
          >
            <span>See live flow in demo</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
