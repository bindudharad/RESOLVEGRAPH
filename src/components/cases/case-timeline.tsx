import { CheckCircle2, Clock, Dot, History } from "lucide-react";
import { FEATURED_TIMELINE } from "@/lib/mock-data";
import { formatDateTime } from "@/lib/utils";

interface CaseTimelineProps {
  caseId: string;
}

export function CaseTimeline({ caseId }: CaseTimelineProps) {
  const events = FEATURED_TIMELINE;

  return (
    <div className="rg-card flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h3 className="text-[14px] font-semibold text-fg">Dispute Progression Timeline</h3>
          <p className="mt-0.5 text-[12.5px] text-subtle">
            Logged chronological actions and state transitions for case {caseId}.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-faint">
          <History className="h-3.5 w-3.5" />
          <span>{events.length} milestones</span>
        </div>
      </div>

      <div className="relative pl-6">
        {/* Continuous vertical timeline connector line */}
        <div
          aria-hidden="true"
          className="absolute bottom-3 left-2.5 top-3 w-0.5 bg-line-2"
        />

        <ul className="flex flex-col gap-5">
          {events.map((event, idx) => {
            const isDone = event.state === "done";
            const isCurrent = event.state === "current";

            return (
              <li key={idx} className="relative flex items-start gap-3.5">
                {/* Node icon */}
                <div
                  className={`absolute -left-6 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                    isDone
                      ? "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_20%,var(--color-app))] text-[#34d399]"
                      : isCurrent
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-solid)] text-white shadow-[0_0_8px_rgba(124,92,255,0.6)]"
                        : "border-line-2 bg-surface-2 text-faint"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : isCurrent ? (
                    <Clock className="h-3 w-3" />
                  ) : (
                    <Dot className="h-3 w-3" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <h4
                      className={`text-[13px] font-semibold ${
                        isCurrent ? "text-amber-400" : "text-fg"
                      }`}
                    >
                      {event.label}
                    </h4>
                    <span className="text-[11.5px] font-mono text-faint">
                      {formatDateTime(event.timestamp)}
                    </span>
                  </div>

                  <p className="mt-0.5 text-[12px] text-subtle">{event.detail}</p>

                  <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-faint">
                    <span className="font-medium text-muted">{event.actor}</span>
                    <span>·</span>
                    <span className="capitalize">{event.state}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
