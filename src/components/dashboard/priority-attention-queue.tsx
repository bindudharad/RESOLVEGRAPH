"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clock,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { useDashboard, type AttentionQueueItem } from "@/components/dashboard/dashboard-context";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { PriorityBadge } from "@/components/cases/priority-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { relativeAge } from "@/lib/utils";
import type { CasePriority, CaseStatus } from "@/lib/types";

export function PriorityAttentionQueue() {
  const { summary } = useDashboard();

  const attentionList: AttentionQueueItem[] = (summary?.attentionQueue && summary.attentionQueue.length > 0)
    ? summary.attentionQueue
    : (summary?.attentionCases || []).map((c: Record<string, unknown>) => ({
        id: String(c.id || ""),
        caseNumber: String(c.caseNumber || c.id || "RG-1001"),
        title: String(c.title || "Payment Status Discrepancy"),
        category: String(c.category || "BILLING_ERROR"),
        status: String(c.status || "UNDER_ANALYSIS"),
        priority: String(c.priority || "HIGH"),
        amount: typeof c.amount === "number" ? c.amount : 64.99,
        currency: String(c.currency || "INR"),
        customer: String(c.customer || "Alex Morgan"),
        merchant: String(c.merchant || "Apex Tech Labs"),
        provider: "PayPal Sandbox",
        reason: "Bilateral evidence mismatch flagged during intake triage.",
        nextAction: "Review discrepancy assessment and draft resolution proposal.",
        lastUpdated: String(c.updatedAt || new Date().toISOString()),
      }));

  return (
    <section
      aria-labelledby="priority-attention-heading"
      className="relative rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm space-y-4 paper-dark overflow-hidden"
    >
      {/* Plumbline Architectural Grid Accent */}
      <div className="guides-dark pointer-events-none absolute inset-0 opacity-20" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)]/70 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="priority-attention-heading" className="text-base font-semibold text-[var(--ink)] flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <span>Needs Your Attention</span>
            </h2>
            <Badge tone="warning" className="text-[11px] font-mono bg-amber-500/10 text-amber-300 border-amber-500/30">
              {attentionList.length} PENDING DECISIONS
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[var(--ink-2)]">
            High-priority disputes and anomalous transactions requiring immediate investigator adjudication or counterparty verification.
          </p>
        </div>

        <Link
          href="/cases?priority=High"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline whitespace-nowrap self-start sm:self-center font-mono"
        >
          <span>View All Priority Cases</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Queue items */}
      {attentionList.length === 0 ? (
        <div className="py-8 text-center text-xs text-[var(--ink-3)] font-mono">
          No critical items currently requiring manual triage.
        </div>
      ) : (
        <div className="relative z-10 divide-y divide-[var(--line)]/50">
          {attentionList.slice(0, 4).map((item, idx) => (
            <article
              key={item.caseNumber || item.id}
              className="relative py-4 first:pt-1 last:pb-1 flex flex-col gap-3 group transition-colors rounded-xl p-2.5 -mx-2 hover:bg-[var(--surface-2)]/30"
            >
              {/* Laser Scan line on top urgent item */}
              {idx === 0 && <div className="scan-y opacity-70" />}

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                {/* Left: Case Metadata */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Link
                      href={`/cases/${item.caseNumber || item.id}`}
                      className="font-mono font-bold text-[var(--ink)] hover:text-[var(--accent)] transition-colors underline-offset-2 hover:underline"
                    >
                      {item.caseNumber || item.id}
                    </Link>
                    <span className="text-[var(--line-strong)]">&bull;</span>
                    <span className="font-semibold text-[var(--ink)] truncate max-w-md">
                      {item.title}
                    </span>
                    <span className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-[10.5px] font-mono font-medium text-[var(--ink-2)] border border-[var(--line)]">
                      {item.provider}
                    </span>
                  </div>

                  {/* Financial & Counterparty context */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ink-2)]">
                    <span className="font-mono font-bold text-[var(--ink)] text-[13px]">
                      {item.currency === "INR" ? `₹${(item.amount || 64.99).toLocaleString()}` : `$${(item.amount || 64.99).toFixed(2)} USD`}
                    </span>
                    <span className="text-[var(--ink-3)]">
                      Buyer: <strong className="text-[var(--ink)] font-normal">{item.customer}</strong>
                    </span>
                    <span className="text-[var(--ink-3)]">
                      Merchant: <strong className="text-[var(--ink)] font-normal">{item.merchant}</strong>
                    </span>
                    <span className="flex items-center gap-1 text-[var(--ink-3)] text-[11px] font-mono">
                      <Clock className="h-3 w-3" />
                      Updated {relativeAge(item.lastUpdated)}
                    </span>
                  </div>

                  {/* Reason & Recommended Next Step */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-1 text-xs">
                    <div className="rounded-xl bg-rose-500/[0.08] border border-rose-500/25 p-3">
                      <span className="font-semibold text-rose-300 block text-[10.5px] font-mono uppercase tracking-wider mb-1">
                        Trigger Reason
                      </span>
                      <p className="text-rose-200/90 text-[11.5px] leading-relaxed">
                        {item.reason}
                      </p>
                    </div>

                    <div className="rounded-xl bg-amber-500/[0.08] border border-amber-500/25 p-3">
                      <span className="font-semibold text-amber-300 block text-[10.5px] font-mono uppercase tracking-wider mb-1">
                        Recommended Next Step
                      </span>
                      <p className="text-amber-200/90 text-[11.5px] leading-relaxed">
                        {item.nextAction}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <PriorityBadge priority={item.priority as CasePriority} />
                    <CaseStatusBadge status={item.status as CaseStatus} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/cases/${item.caseNumber || item.id}?tab=evidence`}>
                      <Button variant="outline" size="sm" className="text-xs h-8 px-2.5 shadow-xs">
                        Review Evidence
                      </Button>
                    </Link>
                    <Link href={`/cases/${item.caseNumber || item.id}`}>
                      <Button variant="primary" size="sm" className="text-xs h-8 px-3.5 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white shadow-xs font-semibold">
                        <span>Open Investigation</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
