"use client";

import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import type { CustomerComplaintStatus } from "@/server/services/buyer-tracking.service";

export function CustomerStatusBadge({
  status,
  size = "sm",
}: {
  status: CustomerComplaintStatus | string;
  size?: "sm" | "md";
}) {
  const s = status.toLowerCase();

  let badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
  let dotColor = "bg-blue-600";
  let mode: "done" | "warn" | "active" | "muted" = "active";

  if (s === "resolved") {
    badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
    dotColor = "bg-emerald-600";
    mode = "done";
  } else if (s === "closed") {
    badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
    dotColor = "bg-slate-500";
    mode = "muted";
  } else if (
    s === "additional information required" ||
    s === "re-investigation" ||
    s === "escalated"
  ) {
    badgeStyle =
      s === "escalated"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-amber-50 text-amber-800 border-amber-200";
    dotColor = s === "escalated" ? "bg-rose-600" : "bg-amber-500";
    mode = "warn";
  } else if (s === "waiting for seller" || s === "reviewing evidence") {
    badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
    dotColor = "bg-amber-500";
  } else if (s === "decision ready" || s === "awaiting approval") {
    badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-200";
    dotColor = "bg-indigo-600";
  } else if (s === "under investigation") {
    badgeStyle = "bg-purple-50 text-purple-700 border-purple-200";
    dotColor = "bg-purple-600";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap ${badgeStyle} ${
        size === "md" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-[11px]"
      }`}
    >
      {mode === "done" ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
      ) : mode === "warn" ? (
        <AlertTriangle className="h-3 w-3 shrink-0" />
      ) : mode === "muted" ? (
        <Clock className="h-3 w-3 shrink-0 text-slate-500" />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor} shrink-0`} />
      )}
      <span>{status}</span>
    </span>
  );
}
