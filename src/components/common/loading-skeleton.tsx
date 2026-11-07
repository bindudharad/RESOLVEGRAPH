import { Skeleton } from "@/components/ui/primitives";

/** Skeleton mirroring the KPI card layout. */
export function MetricCardSkeleton() {
  return (
    <div className="rg-card px-5 py-4.5">
      <div className="flex items-start justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <Skeleton className="mt-4 h-8 w-28" />
      <Skeleton className="mt-3 h-3 w-36" />
    </div>
  );
}

/** Skeleton mirroring a data table with `rows` rows. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="flex gap-4 border-b border-line bg-[#0a1120] px-4 py-3">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-3 flex-1 opacity-60" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={
                colIndex === 0 ? "h-3.5 w-20 flex-1" : "h-3 w-16 flex-1"
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
    <div className="rg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
      <Skeleton className="mt-5 w-full rounded-md" style={{ height }} />
      <div className="mt-4 flex flex-wrap gap-5">
        {[36, 44, 40].map((width, index) => (
          <div key={index} className="flex items-center gap-2">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-3" style={{ width }} />
          </div>
        ))}
      </div>
    </div>
  );
}
