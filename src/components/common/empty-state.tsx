import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-line-2 bg-[#0B0F17] text-center",
        compact ? "px-5 py-8" : "rg-grid-bg px-6 py-14",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-lg border border-line-2 bg-surface-2 text-subtle"
      >
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-[14px] font-semibold text-fg">{title}</h3>
      <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-subtle">
        {description}
      </p>
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
