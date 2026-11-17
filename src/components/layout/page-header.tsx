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
        "flex flex-col gap-4 border-b border-white/[0.09] pb-6 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[22px] font-bold tracking-tight text-[#F4F7FB] sm:text-[26px]">
            {title}
          </h1>
          {meta}
        </div>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[#A3AFBF]">
          {description}
        </p>
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>
      ) : null}
    </div>
  );
}
