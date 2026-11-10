"use client";

import Link from "next/link";
import {
  FileSearch,
  UploadCloud,
  Layers,
  ShoppingCart,
  Package,
  MessageSquare,
  ShieldAlert,
  Bot,
  Languages,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WorkspaceCard {
  title: string;
  category: string;
  description: string;
  href: string;
  icon: typeof FileSearch;
  badge: string;
  badgeTone: "brand" | "info" | "success" | "warning" | "neutral";
  stats?: string;
}

const WORKSPACE_CARDS: WorkspaceCard[] = [
  {
    title: "Payment Incidents & Forensics",
    category: "Investigation",
    description: "12-stage root-cause pipeline, statutory TAT audit tracking, and NPCI U30 timeout diagnosis.",
    href: "/incidents",
    icon: FileSearch,
    badge: "12 Stages",
    badgeTone: "brand",
    stats: "Statutory TAT T+1",
  },
  {
    title: "Universal Evidence Intake",
    category: "Ingestion & Vault",
    description: "Extract, validate, and verify multi-source payment evidence with bitwise SHA-256 integrity.",
    href: "/intake",
    icon: UploadCloud,
    badge: "Vault Active",
    badgeTone: "info",
    stats: "Magic-Byte Gated",
  },
  {
    title: "Cross-Platform Reconciliation",
    category: "Matching Engine",
    description: "10-tier deterministic correlation linking bank statements, UPI apps, and merchant ERP ledgers.",
    href: "/reconciliation",
    icon: Layers,
    badge: "10 Tiers",
    badgeTone: "success",
    stats: "URN/RRN Match",
  },
  {
    title: "Preventive Purchase Memory",
    category: "Commerce Protection",
    description: "Cryptographically seal checkout specifications and detect specification drift before dispute escalation.",
    href: "/purchases",
    icon: ShoppingCart,
    badge: "Immutable Hash",
    badgeTone: "brand",
    stats: "Pre-Dispute Baseline",
  },
  {
    title: "Package Passports & Seals",
    category: "Fulfillment Tracking",
    description: "Track parcel dispatch, tamper-evident physical tape serials, and privacy-safe public QR verification.",
    href: "/packages",
    icon: Package,
    badge: "Passport QR",
    badgeTone: "info",
    stats: "Seal Hash Verified",
  },
  {
    title: "Shared Resolution Room",
    category: "Bilateral Negotiation",
    description: "Collaborative buyer-merchant room with manager note shielding and dual-key financial sign-off.",
    href: "/resolution-room",
    icon: MessageSquare,
    badge: "Bilateral",
    badgeTone: "success",
    stats: "Dual-Key Gated",
  },
  {
    title: "PayPal Disputes & Captures",
    category: "Gateway Integration",
    description: "Sandbox dispute sync, evidence submission, webhook processing, and automated partial refund execution.",
    href: "/paypal/disputes",
    icon: ShieldAlert,
    badge: "Sandbox Live",
    badgeTone: "warning",
    stats: "Air-Gapped Safe",
  },
  {
    title: "AI Multi-Agent Copilot",
    category: "Agentic AI",
    description: "Specialist subagents for triage, evidence analysis, policy drafting, and adversarial citation auditing.",
    href: "/copilot",
    icon: Bot,
    badge: "8 Subagents",
    badgeTone: "brand",
    stats: "Zero Hallucination",
  },
  {
    title: "Multilingual Voice Intake",
    category: "Accessibility",
    description: "Voice-assisted and conversational complaint registration supporting English, Kannada, and Hindi.",
    href: "/multilingual",
    icon: Languages,
    badge: "EN · KN · HI",
    badgeTone: "neutral",
    stats: "Web Speech API",
  },
  {
    title: "Security & Kill Switch",
    category: "Admin & Governance",
    description: "Emergency circuit breakers, prompt injection defense, and cryptographic hash-chained audit ledger.",
    href: "/admin/security",
    icon: ShieldCheck,
    badge: "Chained Audit",
    badgeTone: "brand",
    stats: "SHA-256 Chain",
  },
];

export function InvestigationWorkspaces() {
  return (
    <section className="rg-card p-5" aria-labelledby="workspaces-heading">
      <div className="border-b border-line pb-4">
        <SectionHeading
          title={<span id="workspaces-heading">Core Investigation Workspaces &amp; Subsystems</span>}
          description="Direct access to all 16 connected commerce protection, cross-provider matching, and forensic investigation engines."
          actions={
            <div className="flex items-center gap-2">
              <Link
                href="/cases"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent)] hover:underline"
              >
                <span>View All Cases</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {WORKSPACE_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group relative flex flex-col justify-between rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-[0_4px_16px_-4px_rgba(14,18,32,0.08)]"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] text-[var(--accent)] transition-colors group-hover:border-[var(--accent)]/30 group-hover:bg-[var(--accent)]/10">
                    <Icon className="h-4 w-4" />
                  </span>
                  <Badge tone={card.badgeTone}>{card.badge}</Badge>
                </div>

                <h3 className="mt-3 text-[13.5px] font-semibold tracking-[-0.01em] text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                  {card.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-[var(--ink-2)]">
                  {card.description}
                </p>
              </div>

              <div className="mt-3.5 flex items-center justify-between border-t border-[var(--line)] pt-2.5 text-[11px]">
                <span className="font-mono text-[var(--ink-3)]">{card.stats}</span>
                <span className="inline-flex items-center gap-0.5 font-medium text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100">
                  <span>Open</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
