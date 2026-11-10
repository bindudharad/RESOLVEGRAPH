import Link from "next/link";
import { ArrowRight, Clock, TriangleAlert } from "lucide-react";
import { ATTENTION_ITEMS } from "@/lib/mock-data";
import { formatDateTime, relativeAge } from "@/lib/utils";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { PriorityBadge } from "@/components/cases/priority-badge";
import { SectionHeading } from "@/components/ui/card";

const PRIORITY_BAR: Record<string, string> = {
  High: "bg-[var(--color-danger)]",
  Medium: "bg-[var(--color-warning)]",
};

/**
 * Priority queue for cases that need a human decision soon.
 * Server component — every action is a plain link to a real route.
 */
export function AttentionPanel() {
  return (
    <section className="rg-card flex h-full flex-col" aria-labelledby="attention-title">
      <div className="border-b border-line px-5 py-4">
        <SectionHeading
          title={<span id="attention-title">Needs Attention</span>}
          description="Cases closest to breaching their response window."
          actions={
            <span className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-rose-400">
              {ATTENTION_ITEMS.length} open
            </span>
          }
        />
      </div>

      <ul className="flex flex-1 flex-col divide-y divide-line">
        {ATTENTION_ITEMS.map((item) => (
          <li
            key={item.caseId}
            className="group relative flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2"
          >
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 left-0 w-[3px] ${PRIORITY_BAR[item.priority] ?? "bg-line-2"}`}
            />

            <span
              aria-hidden="true"
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-2)]"
            >
              <TriangleAlert className="h-3.5 w-3.5" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link
                  href={`/cases/${item.caseId}`}
                  className="text-[12.5px] font-semibold tabular-nums text-[var(--ink)] underline-offset-2 transition-colors hover:text-[var(--accent)] hover:underline"
                >
                  {item.caseId}
                </Link>
                <span className="truncate text-[13px] text-[var(--ink)]">{item.issue}</span>
              </div>

              <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--ink-2)]">
                {item.reason}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <PriorityBadge priority={item.priority} />
                <CaseStatusBadge status={item.status} />
                <span
                  className="inline-flex items-center gap-1.5 text-[11.5px] text-faint"
                  title={formatDateTime(item.updatedAt)}
                >
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {relativeAge(item.updatedAt)}
                </span>
              </div>
            </div>

            <Link
              href={`/cases/${item.caseId}`}
              aria-label={`View case ${item.caseId}`}
              className="mt-1 inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-line-2 px-2.5 text-[12px] font-medium text-muted transition-all hover:border-[var(--color-brand)] hover:bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] hover:text-fg"
            >
              View Case
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
