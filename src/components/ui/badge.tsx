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
    "bg-white/[0.06] text-[#A3AFBF] border-white/[0.09]",
  info:
    "bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30",
  brand:
    "bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30",
  success:
    "bg-[#22C55E]/15 text-[#4ADE80] border-[#22C55E]/30",
  warning:
    "bg-[#F59E0B]/15 text-[#FCD34D] border-[#F59E0B]/30",
  danger:
    "bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30",
  accent:
    "bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30",
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
