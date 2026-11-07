import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "info"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "accent";

const TONES: Record<BadgeTone, string> = {
  neutral:
    "bg-[color-mix(in_srgb,var(--color-fg)_7%,transparent)] text-muted border-[color-mix(in_srgb,var(--color-fg)_11%,transparent)]",
  info: "bg-[color-mix(in_srgb,var(--color-info)_13%,transparent)] text-[#5ccdf7] border-[color-mix(in_srgb,var(--color-info)_30%,transparent)]",
  brand:
    "bg-[color-mix(in_srgb,var(--color-brand)_16%,transparent)] text-[#b3a1ff] border-[color-mix(in_srgb,var(--color-brand)_36%,transparent)]",
  success:
    "bg-[color-mix(in_srgb,var(--color-success)_13%,transparent)] text-[#4fdcae] border-[color-mix(in_srgb,var(--color-success)_30%,transparent)]",
  warning:
    "bg-[color-mix(in_srgb,var(--color-warning)_13%,transparent)] text-[#f7c95c] border-[color-mix(in_srgb,var(--color-warning)_30%,transparent)]",
  danger:
    "bg-[color-mix(in_srgb,var(--color-danger)_13%,transparent)] text-[#fa8b8b] border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)]",
  accent:
    "bg-[color-mix(in_srgb,var(--color-info)_8%,transparent)] text-info border-[color-mix(in_srgb,var(--color-info)_22%,transparent)]",
};

export interface BadgeProps extends ComponentPropsWithRef<"span"> {
  tone?: BadgeTone;
  dot?: boolean;
}

export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border",
        "px-2 py-0.5 text-[11px] font-medium leading-[1.5] tracking-[0.005em]",
        TONES[tone],
        className,
      )}
      {...props}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-90"
        />
      ) : null}
      <span className="truncate">{children}</span>
    </span>
  );
}
