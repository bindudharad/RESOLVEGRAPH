import React from "react";
import { Skeleton } from "@/components/ui/primitives";
import { Scan, ShieldCheck, Sparkles } from "lucide-react";

/** Forensic Holographic Loading Animation representing ResolveGraph */
export function ForensicLoadingAnimation({
  label = "Decrypting Evidentiary Hashes...",
  sublabel = "BERR v2 Mathematical Engine · Zero Drift Verification",
}: {
  label?: string;
  sublabel?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#090b10] p-8 text-center text-white shadow-2xl paper-dark">
      {/* Laser scan line traversing container */}
      <div className="scan-y pointer-events-none absolute inset-x-0 h-12 bg-gradient-to-b from-cyan-400/25 via-cyan-500/10 to-transparent" />
      <div className="guides-dark pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
        {/* Dual Orbital Spinner */}
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-emerald-500/30 border-b-emerald-400 animate-spin [animation-direction:reverse]" />
          <ShieldCheck className="h-6 w-6 text-cyan-400 animate-pulse" />
        </div>

        <div className="space-y-1">
          <div className="font-mono text-sm font-bold tracking-wide text-white flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span>{label}</span>
          </div>
          <div className="font-mono text-xs text-slate-400">
            {sublabel}
          </div>
        </div>

        {/* Telemetry hash ticker */}
        <div className="rounded-lg border border-white/10 bg-black/60 px-3 py-1 font-mono text-[10px] text-cyan-300/80">
          SHA-256 :: 9a2f7c38...e3b0c442 :: STATE LOCKED
        </div>
      </div>
    </div>
  );
}

/** Skeleton mirroring the KPI card layout with tactile elevation. */
export function MetricCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0e1017]/80 px-5 py-5 paper-dark">
      <div className="scan-y pointer-events-none absolute inset-x-0 h-6 bg-gradient-to-b from-cyan-400/15 to-transparent" />
      <div className="flex items-start justify-between">
        <Skeleton className="h-3.5 w-24 bg-white/10" />
        <Skeleton className="h-8 w-8 rounded-lg bg-white/10" />
      </div>
      <Skeleton className="mt-4 h-8 w-28 bg-white/15" />
      <Skeleton className="mt-3 h-3 w-36 bg-white/10" />
    </div>
  );
}

/** Skeleton mirroring a data table with `rows` rows. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0e1017]/80 paper-dark">
      <div className="scan-y pointer-events-none absolute inset-x-0 h-8 bg-gradient-to-b from-cyan-400/15 to-transparent" />
      <div className="flex gap-4 border-b border-white/10 bg-white/5 px-4 py-3">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-3.5 flex-1 bg-white/10" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 border-b border-white/5 px-4 py-3.5 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={
                colIndex === 0 ? "h-3.5 w-20 flex-1 bg-white/15" : "h-3 w-16 flex-1 bg-white/10"
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Skeleton mirroring the chart card. */
export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0e1017]/80 p-5 paper-dark">
      <div className="scan-y pointer-events-none absolute inset-x-0 h-8 bg-gradient-to-b from-cyan-400/15 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-44 bg-white/15" />
          <Skeleton className="h-3 w-64 bg-white/10" />
        </div>
        <Skeleton className="h-8 w-36 rounded-lg bg-white/10" />
      </div>
      <Skeleton className="mt-5 w-full rounded-xl bg-white/5" style={{ height }} />
      <div className="mt-4 flex flex-wrap gap-5">
        {[36, 44, 40].map((width, index) => (
          <div key={index} className="flex items-center gap-2">
            <Skeleton className="h-2.5 w-2.5 rounded-full bg-cyan-400/40" />
            <Skeleton className="h-3 bg-white/10" style={{ width }} />
          </div>
        ))}
      </div>
    </div>
  );
}
