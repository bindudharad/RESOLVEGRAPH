"use client";

import { useMemo } from "react";
import { Check, Clock, CircleDot } from "lucide-react";
import { CANONICAL_TIMELINE_STEPS, type TimelineStep } from "@/lib/demo-fixture";
import { cn } from "@/lib/utils";

interface ConvergenceTimelineProps {
  steps?: TimelineStep[];
  currentStepId?: string;
}

export function ConvergenceTimeline({
  steps = CANONICAL_TIMELINE_STEPS,
  currentStepId = "STEP-5",
}: ConvergenceTimelineProps) {
  const partyColorMap: Record<string, string> = {
    BUYER: "var(--buyer)",
    MERCHANT: "var(--merchant)",
    PAYMENT: "var(--payment)",
    AI: "var(--ai)",
    RESOLVEGRAPH: "var(--accent)",
  };

  return (
    <div className="rg-card p-4 sm:p-5">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <CircleDot className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-[13px] font-semibold text-fg">
            Convergence Timeline
          </h3>
          <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10.5px] uppercase font-mono text-subtle">
            Bilateral Trail
          </span>
        </div>
        <span className="text-[11.5px] font-mono text-subtle">
          Step 5 of {steps.length} active
        </span>
      </div>

      {/* Desktop Horizontal View */}
      <div className="hidden lg:block mt-5 overflow-x-auto pb-2">
        <div className="flex items-start justify-between min-w-[780px] relative">
          {/* Underlying connector line */}
          <div className="absolute top-[18px] left-[24px] right-[24px] h-[2px] bg-line z-0" />

          {steps.map((step, idx) => {
            const isCompleted = step.completed;
            const isCurrent = step.id === currentStepId || step.current;
            const partyColor = partyColorMap[step.party] || "var(--ink-3)";

            return (
              <div
                key={step.id}
                className="relative z-10 flex flex-col items-center flex-1 px-1 text-center"
              >
                {/* Node circle */}
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 bg-surface transition-all",
                    isCurrent
                      ? "border-[var(--ai)] shadow-[0_0_12px_rgba(122,90,224,0.4)] ring-4 ring-[color-mix(in_srgb,var(--ai)_20%,transparent)] animate-pulse"
                      : isCompleted
                      ? "border-line-strong text-fg"
                      : "border-dashed border-line text-subtle opacity-70",
                  )}
                  style={{
                    borderColor: isCurrent
                      ? "var(--ai)"
                      : isCompleted
                      ? partyColor
                      : undefined,
                  }}
                >
                  {isCompleted && !isCurrent ? (
                    <Check
                      className="h-4 w-4"
                      style={{ color: partyColor }}
                      strokeWidth={2.5}
                    />
                  ) : isCurrent ? (
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: "var(--ai)" }}
                    />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-subtle/50" />
                  )}
                </div>

                {/* Step Details */}
                <span className="mt-2 text-[12px] font-medium text-fg max-w-[110px] truncate" title={step.title}>
                  {step.title}
                </span>

                <span
                  className="mt-0.5 rounded px-1.5 py-0.2 text-[9.5px] font-mono uppercase tracking-wider"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${partyColor} 12%, transparent)`,
                    color: partyColor,
                  }}
                >
                  {step.party}
                </span>

                <span className="mt-1 font-mono text-[10.5px] text-subtle">
                  {step.timestamp}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Vertical View */}
      <div className="block lg:hidden mt-4 space-y-4">
        {steps.map((step, idx) => {
          const isCompleted = step.completed;
          const isCurrent = step.id === currentStepId || step.current;
          const partyColor = partyColorMap[step.party] || "var(--ink-3)";

          return (
            <div key={step.id} className="flex items-start gap-3 relative">
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[13px] top-[26px] bottom-[-16px] w-[2px]",
                    isCompleted ? "bg-line-strong" : "border-l border-dashed border-line",
                  )}
                />
              )}
              <div
                className={cn(
                  "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-surface",
                  isCurrent
                    ? "border-[var(--ai)] ring-2 ring-[var(--ai)]/30"
                    : isCompleted
                    ? "border-line-strong"
                    : "border-dashed border-line opacity-60",
                )}
                style={{
                  borderColor: isCurrent ? "var(--ai)" : isCompleted ? partyColor : undefined,
                }}
              >
                {isCompleted && !isCurrent ? (
                  <Check className="h-3.5 w-3.5" style={{ color: partyColor }} strokeWidth={2.5} />
                ) : isCurrent ? (
                  <span className="h-2 w-2 rounded-full bg-[var(--ai)]" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-subtle" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-medium text-fg">{step.title}</span>
                  <span
                    className="rounded px-1.5 py-0.2 text-[9.5px] font-mono uppercase"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${partyColor} 12%, transparent)`,
                      color: partyColor,
                    }}
                  >
                    {step.party}
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px] text-muted">{step.description}</p>
                <span className="mt-1 block font-mono text-[10.5px] text-subtle">
                  {step.timestamp}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
