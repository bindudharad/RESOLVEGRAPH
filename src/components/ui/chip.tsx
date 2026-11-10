import React, { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Check, ShieldCheck, ArrowLeftRight, HelpCircle, Sparkles, Clock } from "lucide-react";

export type ChipVariant =
  | "buyer"
  | "merchant"
  | "ai"
  | "agreed"
  | "contested"
  | "missing"
  | "verified"
  | "payment"
  | "danger"
  | "planned"
  | "neutral";

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  icon?: ReactNode;
  children: ReactNode;
}

export function Chip({
  variant = "neutral",
  icon,
  children,
  className,
  ...props
}: ChipProps) {
  // Calibrated 12% tint fills with darker ink variant for text (Section 2)
  const variantStyles: Record<ChipVariant, string> = {
    buyer:
      "bg-[color-mix(in_srgb,var(--buyer)_12%,transparent)] text-[var(--buyer)] border border-[color-mix(in_srgb,var(--buyer)_30%,transparent)]",
    merchant:
      "bg-[color-mix(in_srgb,var(--merchant)_12%,transparent)] text-[var(--merchant)] border border-[color-mix(in_srgb,var(--merchant)_30%,transparent)]",
    ai:
      "bg-[color-mix(in_srgb,var(--ai)_12%,transparent)] text-[var(--ai)] border border-dashed border-[var(--ai)]",
    agreed:
      "bg-[color-mix(in_srgb,var(--agreed)_12%,transparent)] text-[var(--agreed)] border border-[color-mix(in_srgb,var(--agreed)_30%,transparent)]",
    contested:
      "bg-[color-mix(in_srgb,var(--contested)_12%,transparent)] text-[var(--contested)] border border-[color-mix(in_srgb,var(--contested)_30%,transparent)]",
    missing:
      "rg-hatched-missing border border-dashed border-[var(--missing)] text-[var(--ink-2)]",
    verified:
      "bg-[color-mix(in_srgb,var(--verified)_12%,transparent)] text-[var(--verified)] border border-[color-mix(in_srgb,var(--verified)_35%,transparent)] font-medium",
    payment:
      "bg-[color-mix(in_srgb,var(--payment)_15%,transparent)] text-[var(--ink)] border border-[var(--line-strong)]",
    danger:
      "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)]",
    planned:
      "bg-[var(--surface-2)] text-[var(--ink-3)] border border-dashed border-[var(--line-strong)] italic",
    neutral:
      "bg-[var(--surface-2)] text-[var(--ink-2)] border border-[var(--line)]",
  };

  const defaultIcons: Partial<Record<ChipVariant, ReactNode>> = {
    agreed: <Check className="h-3 w-3" strokeWidth={2} />,
    contested: <ArrowLeftRight className="h-3 w-3" strokeWidth={2} />,
    missing: <HelpCircle className="h-3 w-3" strokeWidth={1.5} />,
    verified: <ShieldCheck className="h-3 w-3 text-[var(--verified)]" strokeWidth={2} />,
    ai: <Sparkles className="h-3 w-3" strokeWidth={1.5} />,
    planned: <Clock className="h-3 w-3" strokeWidth={1.5} />,
  };

  const displayIcon = icon ?? defaultIcons[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium tracking-tight whitespace-nowrap select-none",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {displayIcon}
      <span>{children}</span>
    </span>
  );
}
