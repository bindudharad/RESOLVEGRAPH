"use client";

import { Check, AlertTriangle, Clock, UploadCloud, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { TimelineMilestoneItem } from "@/server/services/buyer-tracking.service";
import { formatShortTimelineTimestamp } from "@/lib/buyer-date-grouping";

interface ComplaintInvestigationTimelineProps {
  timeline: TimelineMilestoneItem[];
  onTriggerUploadAdditional?: () => void;
}

export function ComplaintInvestigationTimeline({
  timeline,
  onTriggerUploadAdditional,
}: ComplaintInvestigationTimelineProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full" role="list" aria-label="Complaint investigation tracking timeline">
      {timeline.map((item, idx) => {
        const isLast = idx === timeline.length - 1;
        const nextItem = !isLast ? timeline[idx + 1] : null;
        const isCompleted = item.status === "COMPLETED";
        const isCurrent = item.status === "CURRENT";
        const isAttention = item.status === "ATTENTION";
        const isUpcoming = item.status === "UPCOMING";

        // Connecting vertical line color between this milestone and the next
        const lineCompleted =
          isCompleted &&
          nextItem &&
          (nextItem.status === "COMPLETED" ||
            nextItem.status === "CURRENT" ||
            nextItem.status === "ATTENTION");

        const lineClass = lineCompleted
          ? "bg-emerald-500"
          : isCurrent
          ? "bg-blue-300"
          : isAttention
          ? "bg-amber-300"
          : "bg-slate-200";

        const isReinvestigation = item.stageKey === "REINVESTIGATION_REQUIRED";
        const hasSubEvents = item.subEvents && item.subEvents.length > 0;
        const isExpanded = expandedIds[item.id] ?? (isCurrent || isAttention || isReinvestigation);

        return (
          <div key={item.id} role="listitem" className="relative flex gap-4 pb-7 last:pb-1">
            {/* Left vertical track column */}
            <div className="relative flex flex-col items-center shrink-0">
              {/* Marker Circle */}
              {isCompleted ? (
                <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                  <Check className="h-4 w-4 stroke-[2.5]" />
                </div>
              ) : isCurrent ? (
                <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm">
                  <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" />
                </div>
              ) : isAttention ? (
                <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white ring-4 ring-amber-100 shadow-sm">
                  <AlertTriangle className="h-3.5 w-3.5 stroke-[2.5]" />
                </div>
              ) : (
                <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-slate-200" />
                </div>
              )}

              {/* Connecting Vertical Line */}
              {!isLast && (
                <div
                  aria-hidden="true"
                  className={`w-[2.5px] flex-1 mt-1 rounded-full transition-colors ${lineClass}`}
                />
              )}
            </div>

            {/* Right Milestone Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              {/* Top Row: Title + Timestamp */}
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4
                    className={`text-sm font-bold leading-snug break-words ${
                      isUpcoming
                        ? "text-slate-400"
                        : isCurrent
                        ? "text-blue-700"
                        : isAttention
                        ? "text-amber-800"
                        : "text-slate-900"
                    }`}
                  >
                    {item.title}
                  </h4>

                  {isCurrent && (
                    <span className="inline-flex items-center rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                      Current Step
                    </span>
                  )}

                  {isAttention && (
                    <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                      Attention Required
                    </span>
                  )}
                </div>

                {item.timestamp ? (
                  <time
                    dateTime={item.timestamp}
                    className="text-[11px] sm:text-xs font-medium text-slate-500 sm:whitespace-nowrap shrink-0"
                  >
                    {formatShortTimelineTimestamp(item.timestamp)}
                  </time>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400 sm:whitespace-nowrap shrink-0 inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Pending
                  </span>
                )}
              </div>

              {/* Description */}
              <p
                className={`mt-1 text-xs sm:text-[13px] leading-relaxed break-words ${
                  isUpcoming ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {item.description}
              </p>

              {/* Re-investigation Details Box (only rendered when triggered) */}
              {isReinvestigation && item.reinvestigationMeta && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-amber-900">
                      Reason: {item.reinvestigationMeta.reason}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-amber-200 text-amber-800">
                      {item.reinvestigationMeta.isResolved
                        ? "Follow-up completed"
                        : item.reinvestigationMeta.receivedAt
                        ? "Evidence received · Under re-review"
                        : item.reinvestigationMeta.responsibleParty === "SELLER"
                        ? "Waiting for Seller"
                        : "Waiting for Customer"}
                    </span>
                  </div>
                  <p className="text-amber-900/90">
                    <strong>Missing details:</strong> {item.reinvestigationMeta.missingInformation}
                  </p>
                  <div className="text-[11px] text-amber-800/80 flex flex-wrap gap-3">
                    <span>
                      Requested: {formatShortTimelineTimestamp(item.reinvestigationMeta.requestedAt)}
                    </span>
                    {item.reinvestigationMeta.receivedAt && (
                      <span className="text-emerald-700 font-semibold">
                        Received: {formatShortTimelineTimestamp(item.reinvestigationMeta.receivedAt)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Contextual Action Callout */}
              {item.actionRequired && (
                <div className="mt-3">
                  {item.actionRequired.type === "UPLOAD_ADDITIONAL_EVIDENCE" ? (
                    <button
                      type="button"
                      onClick={onTriggerUploadAdditional}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>{item.actionRequired.label}</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                      <Clock className="h-3.5 w-3.5 text-blue-600" />
                      <span>{item.actionRequired.label}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Sub-events Breakdown (Flipkart-style detailed history per milestone) */}
              {hasSubEvents && (
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    <span>
                      {isExpanded ? "Hide" : "View"} activity details ({item.subEvents.length})
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>

                  {isExpanded && (
                    <ul className="mt-2 space-y-2 border-l border-slate-200 pl-3 ml-1">
                      {item.subEvents.map((sub) => (
                        <li key={sub.id} className="text-xs">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-semibold text-slate-800">{sub.title}</span>
                            <span className="text-[11px] text-slate-400">
                              {formatShortTimelineTimestamp(sub.timestamp)}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-slate-500 mt-0.5 leading-snug">
                            {sub.description}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
