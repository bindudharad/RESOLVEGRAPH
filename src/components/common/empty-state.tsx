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
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)]/60 text-center",
        compact ? "px-5 py-8" : "px-6 py-12",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] shadow-xs"
      >
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-[14px] font-semibold text-[var(--ink)]">{title}</h3>
      <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-[var(--ink-2)]">
        {description}
      </p>
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
