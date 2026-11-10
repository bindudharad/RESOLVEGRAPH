"use client";

import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  Plus,
  ReceiptText,
  Sparkles,
  Store,
  TriangleAlert,
  Upload,
  Play,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { RECENT_ACTIVITY } from "@/lib/mock-data";
import { formatDateTime, relativeLabel } from "@/lib/utils";
import { SectionHeading } from "@/components/ui/card";
import { useToast } from "@/components/common/toast";
import type { ActivityKind, ActivityEvent } from "@/lib/types";

const KIND_STYLE: Record<ActivityKind, { icon: LucideIcon; stroke: string; bg: string }> = {
  created: {
    icon: Plus,
    stroke: "text-[var(--accent)]",
    bg: "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]",
  },
  "buyer-submission": {
    icon: Upload,
    stroke: "text-[var(--buyer)]",
    bg: "bg-[color-mix(in_srgb,var(--buyer)_12%,transparent)]",
  },
  "merchant-response": {
    icon: Store,
    stroke: "text-[var(--merchant)]",
    bg: "bg-[color-mix(in_srgb,var(--merchant)_12%,transparent)]",
  },
  evidence: {
    icon: Upload,
    stroke: "text-[var(--buyer)]",
    bg: "bg-[color-mix(in_srgb,var(--buyer)_12%,transparent)]",
  },
  "ai-analysis": {
    icon: Sparkles,
    stroke: "text-[var(--ai)]",
    bg: "bg-[color-mix(in_srgb,var(--ai)_12%,transparent)]",
  },
  refund: {
    icon: ReceiptText,
    stroke: "text-[var(--agreed)]",
    bg: "bg-[color-mix(in_srgb,var(--agreed)_12%,transparent)]",
  },
  resolved: {
    icon: CheckCircle2,
    stroke: "text-[var(--agreed)]",
    bg: "bg-[color-mix(in_srgb,var(--agreed)_12%,transparent)]",
  },
  escalated: {
    icon: TriangleAlert,
    stroke: "text-[var(--contested)]",
    bg: "bg-[color-mix(in_srgb,var(--contested)_12%,transparent)]",
  },
  status: {
    icon: Activity,
    stroke: "text-[var(--ink-2)]",
    bg: "bg-[var(--surface-2)]",
  },
};

/**
 * Workspace activity feed (Section 7):
 * Prepend events only when user clicks "Simulate event (demo)".
 * Never auto-generates silent fake events.
 */
export function ActivityTimeline() {
  const [events, setEvents] = useState<ActivityEvent[]>(RECENT_ACTIVITY);
  const { toast } = useToast();

  const handleSimulateEvent = () => {
    const newSimEvent: ActivityEvent = {
      id: `sim-${Date.now()}`,
      kind: "ai-analysis",
      actor: "BERR Pipeline (Demo)",
      description: "AI extraction verified SSD capacity discrepancy for Case RG-2026-0412",
      timestamp: new Date().toISOString(),
      caseId: "RG-2026-0412",
    };

    setEvents((prev) => [newSimEvent, ...prev]);
    toast({
      title: "Event Simulated (Demo)",
      description: "Prepend AI analysis verification event to timeline.",
      tone: "info",
      isDemo: true,
    });
  };

  return (
    <section className="rg-card flex h-full flex-col" aria-labelledby="activity-title">
      <div className="border-b border-[var(--line)] px-5 py-3.5 flex items-center justify-between">
        <SectionHeading
          title={<span id="activity-title">Recent Activity</span>}
          description="Audited events across bilateral disputes."
        />
        <button
          type="button"
          onClick={handleSimulateEvent}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--ink-2)] hover:border-[var(--line-strong)] hover:text-[var(--ink)] transition-colors select-none"
        >
          <Play className="h-3 w-3 text-[var(--accent)]" />
          <span>Simulate event (demo)</span>
        </button>
      </div>

      <ol className="flex-1 px-5 py-3 divide-y divide-[var(--line)] overflow-y-auto max-h-[380px]">
        {events.map((event, index) => {
          const style = KIND_STYLE[event.kind] || KIND_STYLE.status;
          const Icon = style.icon;

          return (
            <li key={event.id} className="flex gap-3 py-3 first:pt-1 last:pb-1">
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] ${style.bg} ${style.stroke}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug text-[var(--ink)] font-medium">
                  {event.description}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-[var(--ink-3)]">
                  <span className="font-medium text-[var(--ink-2)]">{event.actor}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={event.timestamp}>
                    {relativeLabel(event.timestamp)} · {formatDateTime(event.timestamp).split(", ")[1]}
                  </time>
                  {event.caseId ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <Link
                        href={`/cases/${event.caseId}`}
                        className="font-mono text-[var(--accent)] hover:underline"
                      >
                        {event.caseId}
                      </Link>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-[var(--line)] px-5 py-2.5 bg-[var(--surface-2)] rounded-b-[10px]">
        <p className="text-[11px] text-[var(--ink-3)] font-mono">
          Honesty Rule: Timeline shows explicit recorded events. No synthetic live activity generated without user trigger.
        </p>
      </div>
    </section>
  );
}
