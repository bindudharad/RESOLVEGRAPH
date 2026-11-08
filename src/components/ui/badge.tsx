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
  info: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  brand: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  danger: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  accent: "bg-sky-500/10 text-sky-300 border-sky-500/25",
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
