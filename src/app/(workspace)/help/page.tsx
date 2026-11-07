"use client";

import {
  CheckCircle2,
  HelpCircle,
  Keyboard,
  Layers,
} from "lucide-react";
import { DemoBadge } from "@/components/common/demo-badge";
import { Kbd } from "@/components/ui/primitives";

const SHORTCUTS = [
  { keys: ["⌘", "K"], description: "Global Search & Quick Commands" },
  { keys: ["C"], description: "Open Create Case dialog" },
  { keys: ["Esc"], description: "Dismiss active modal or drawer" },
  { keys: ["G", "D"], description: "Jump to Dashboard" },
  { keys: ["G", "C"], description: "Jump to Case Management" },
  { keys: ["G", "E"], description: "Jump to Evidence Library" },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Complaint Registration",
    desc: "Buyer logs transaction details, expected vs received goods, and uploads preliminary proofs (invoices, receipts, unboxing captures).",
  },
  {
    step: "02",
    title: "Merchant Reconciliation",
    desc: "Merchant is notified with a 48-hour response window to supply dispatch waybills, warehouse packing scans, or confirm replacement dispatch.",
  },
  {
    step: "03",
    title: "Evidence Graph Audit",
    desc: "Discrepancy engine cross-references serial numbers, declared dimensions, and timestamps to isolate point-of-failure without subjective bias.",
  },
  {
    step: "04",
    title: "Remedy Coordination",
    desc: "Parties select mutually agreeable outcomes: direct replacement unit, transaction refund, or price differential offset.",
  },
  {
    step: "05",
    title: "Arbitration Packaging",
    desc: "Unresolved claims are automatically compiled into standardized legal dossiers ready for PayPal, Visa, or Mastercard chargeback filings.",
  },
];

const FAQS = [
  {
    q: "What is RESOLVEGRAPH?",
    a: "RESOLVEGRAPH is an AI-powered commerce resolution platform designed to connect buyers, merchants, payment records, and evidence to resolve e-commerce disputes fairly and rapidly before they escalate into costly bank chargebacks.",
  },
  {
    q: "How does RESOLVEGRAPH connect to PayPal and AI?",
    a: "RESOLVEGRAPH integrates with PayPal Sandbox APIs (Orders v2, server-side capture, partial refunds, and disputes synchronization). Multimodal AI and the BERR engine extract facts from uploaded documentation, build a bilateral evidence graph, and draft policy-compliant remedies that human managers authorize before funds are disbursed.",
  },
  {
    q: "Are the cases and monetary amounts real?",
    a: "No. All cases, merchant names, amounts, and activity timeline events shown are purely fictional demonstration records created for architectural evaluation.",
  },
  {
    q: "How does case creation and management work?",
    a: "The case creation flow validates buyer and transaction inputs, generates a persistent CaseRecord in the SQLite database via Prisma, assigns audit logs, and redirects to the newly created case dossier with full evidence and resolution workflows.",
  },
];

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[23px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">
              Help & Support
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-[13.5px] text-subtle">
            Architecture guide, keyboard shortcuts and resolution workflow reference.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-line bg-surface-2 px-3 py-1 text-[12px] text-muted">
            Knowledge Base v0.1
          </span>
        </div>
      </section>

      {/* Keyboard Shortcuts & Quick Reference */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Workflow Lifecycle */}
        <div className="rg-card flex flex-col gap-5 p-6">
          <div className="flex items-center gap-2.5 border-b border-line pb-4">
            <Layers className="h-5 w-5 text-[#a08bff]" />
            <div>
              <h2 className="text-[15px] font-semibold text-fg">
                Commerce Dispute Resolution Lifecycle
              </h2>
              <p className="text-[12px] text-subtle">
                How RESOLVEGRAPH coordinates multi-party claim settlement.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {WORKFLOW_STEPS.map((ws) => (
              <div
                key={ws.step}
                className="flex flex-col justify-between rounded-lg border border-line bg-surface-2 p-3.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-[#b3a1ff]">
                      STAGE {ws.step}
                    </span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-faint" />
                  </div>
                  <h3 className="mt-2 text-[13px] font-semibold text-fg">{ws.title}</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">{ws.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="rg-card flex flex-col gap-4 p-6">
          <div className="flex items-center gap-2.5 border-b border-line pb-4">
            <Keyboard className="h-5 w-5 text-[#38bdf8]" />
            <div>
              <h2 className="text-[15px] font-semibold text-fg">Keyboard Shortcuts</h2>
              <p className="text-[12px] text-subtle">Power navigation across RESOLVEGRAPH.</p>
            </div>
          </div>

          <ul className="flex flex-col divide-y divide-line">
            {SHORTCUTS.map((sc, i) => (
              <li key={i} className="flex items-center justify-between py-2.5 text-[12.5px]">
                <span className="text-muted">{sc.description}</span>
                <div className="flex items-center gap-1">
                  {sc.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-auto rounded-md border border-line bg-surface-2 p-3 text-[11.5px] text-faint">
            <p>Shortcuts are active across the application shell.</p>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="rg-card flex flex-col gap-5 p-6">
        <div className="flex items-center gap-2.5 border-b border-line pb-4">
          <HelpCircle className="h-5 w-5 text-[#34d399]" />
          <div>
            <h2 className="text-[15px] font-semibold text-fg">Frequently Asked Questions</h2>
            <p className="text-[12px] text-subtle">
              Key concepts behind the RESOLVEGRAPH architecture.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="rounded-lg border border-line bg-surface-2 p-4">
              <h3 className="text-[13.5px] font-semibold text-fg">{faq.q}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
