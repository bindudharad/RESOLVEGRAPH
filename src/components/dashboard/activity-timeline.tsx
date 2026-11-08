import {
  Activity,
  CheckCircle2,
  Plus,
  ReceiptText,
  Sparkles,
  Store,
  TriangleAlert,
  Upload,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { RECENT_ACTIVITY } from "@/lib/mock-data";
import { formatDateTime, relativeLabel } from "@/lib/utils";
import { SectionHeading } from "@/components/ui/card";
import type { ActivityKind } from "@/lib/types";

const KIND_STYLE: Record<ActivityKind, { icon: LucideIcon; stroke: string; ring: string }> = {
  created: {
    icon: Plus,
    stroke: "text-sky-400",
    ring: "border-sky-500/30",
  },
  "buyer-submission": {
    icon: Upload,
    stroke: "text-sky-400",
    ring: "border-sky-500/30",
  },
  "merchant-response": {
    icon: Store,
    stroke: "text-amber-400",
    ring: "border-amber-500/30",
  },
  evidence: {
    icon: Upload,
    stroke: "text-amber-400",
    ring: "border-amber-500/30",
  },
  "ai-analysis": {
    icon: Sparkles,
    stroke: "text-amber-400",
    ring: "border-amber-500/30",
  },
  refund: {
    icon: ReceiptText,
    stroke: "text-emerald-400",
    ring: "border-emerald-500/30",
  },
  resolved: {
    icon: CheckCircle2,
    stroke: "text-emerald-400",
    ring: "border-emerald-500/30",
  },
  escalated: {
    icon: TriangleAlert,
    stroke: "text-rose-400",
    ring: "border-rose-500/30",
  },
  status: {
    icon: Activity,
    stroke: "text-muted",
    ring: "border-line-2",
  },
};

/** Compact workspace activity feed. Server component — static demo data. */
export function ActivityTimeline() {
  return (
    <section className="rg-card flex h-full flex-col" aria-labelledby="activity-title">
      <div className="border-b border-line px-5 py-4">
        <SectionHeading
          title={<span id="activity-title">Recent Activity</span>}
          description="Latest events across the demo workspace."
        />
      </div>

      <ol className="flex-1 px-5 py-2">
        {RECENT_ACTIVITY.map((event, index) => {
          const style = KIND_STYLE[event.kind];
          const Icon = style.icon;
          const isLast = index === RECENT_ACTIVITY.length - 1;

          return (
            <li key={event.id} className="relative flex gap-3 pb-3.5 pt-3 last:pb-4">
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-[38px] bottom-0 w-px bg-line"
                />
              ) : null}

              <span
                aria-hidden="true"
                className={`z-10 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full border bg-[#0B0F17] ${style.ring} ${style.stroke}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] leading-snug text-fg">{event.description}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-faint">
                  <span className="font-medium text-subtle">{event.actor}</span>
                  <span aria-hidden="true" className="h-2.5 w-px bg-line-2" />
                  <time dateTime={event.timestamp} title={formatDateTime(event.timestamp)}>
                    {relativeLabel(event.timestamp)} ·{" "}
                    {formatDateTime(event.timestamp).split(", ")[1]}
                  </time>
                  {event.caseId ? (
                    <>
                      <span aria-hidden="true" className="h-2.5 w-px bg-line-2" />
                      <Link
                        href={`/cases/${event.caseId}`}
                        className="tabular-nums underline-offset-2 transition-colors hover:text-amber-400 hover:underline"
                      >
                        {event.caseId}
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-line px-5 py-3">
        <p className="text-[11px] leading-relaxed text-faint">
          Events marked <span className="text-subtle">(demo event)</span> are illustrative
          and do not represent completed financial operations.
        </p>
      </div>
    </section>
  );
}
