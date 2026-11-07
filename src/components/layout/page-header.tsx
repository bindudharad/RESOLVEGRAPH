import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Consistent page header used by every route below the dashboard.
 * Rendered as a server component — interactive pieces pass in as props.
 */
export function PageHeader({
  title,
  description,
  meta,
  actions,
  className,
}: {
  title: string;
  description: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[20px] font-semibold tracking-[-0.018em] text-fg sm:text-[22px]">
            {title}
          </h1>
          {meta}
        </div>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-subtle">
          {description}
        </p>
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
