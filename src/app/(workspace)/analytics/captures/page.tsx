import { Suspense } from "react";
import { CaptureAnalyticsView } from "@/components/analytics/capture-analytics-view";

export const dynamic = "force-dynamic";

function CaptureAnalyticsFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <div className="h-24 rounded-2xl border border-[var(--line)] bg-[var(--surface)] animate-pulse" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="h-32 rounded-2xl border border-[var(--line)] bg-[var(--surface)] animate-pulse"
          />
        ))}
      </div>
      <div className="h-72 rounded-2xl border border-[var(--line)] bg-[var(--surface)] animate-pulse" />
      <div className="h-72 rounded-2xl border border-[var(--line)] bg-[var(--surface)] animate-pulse" />
    </div>
  );
}

export default function CaptureAnalyticsPage() {
  return (
    <Suspense fallback={<CaptureAnalyticsFallback />}>
      <CaptureAnalyticsView />
    </Suspense>
  );
}
