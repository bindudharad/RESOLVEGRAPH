import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "financial"
  | "subtle";

export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[#3B82F6] text-white border border-[#3B82F6]/30 shadow-[0_2px_12px_rgba(59,130,246,0.30)] hover:bg-[#60A5FA] active:bg-[#2563EB] font-semibold",
  secondary:
    "bg-[#151D28]/80 text-[#F4F7FB] border border-white/[0.09] hover:bg-[#1B2532] hover:border-white/[0.16] shadow-xs",
  outline:
    "bg-transparent text-[#A3AFBF] border border-white/[0.09] hover:text-[#F4F7FB] hover:bg-white/[0.04] hover:border-white/[0.16]",
  ghost:
    "bg-transparent text-[#A3AFBF] border border-transparent hover:text-[#F4F7FB] hover:bg-white/[0.04]",
  subtle:
    "bg-[#151D28]/60 text-[#A3AFBF] border border-white/[0.08] hover:text-[#F4F7FB] hover:bg-[#1B2532]/70",
  financial:
    "bg-[#3B82F6] text-white border border-[#3B82F6]/40 shadow-[0_2px_12px_rgba(59,130,246,0.30)] hover:bg-[#60A5FA] active:scale-[0.99]",
  danger:
    "bg-[#EF4444] text-white border border-[#EF4444]/40 hover:bg-[#DC2626] active:scale-[0.99] shadow-[0_2px_12px_rgba(239,68,68,0.25)]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[12px] gap-1.5 rounded-xl",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-xl",
  lg: "h-10 px-4.5 text-[14px] gap-2 rounded-xl font-medium",
  icon: "h-9 w-9 rounded-xl",
  "icon-sm": "h-8 w-8 rounded-xl",
};

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-medium tracking-tight",
        "transition-all duration-150 ease-[var(--ease-out)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
        "disabled:pointer-events-none disabled:opacity-40 select-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

export interface ButtonLinkProps extends ComponentPropsWithRef<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

/** Same visual language as Button, but navigates. */
export function ButtonLink({
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-medium tracking-tight no-underline",
        "transition-all duration-150 ease-[var(--ease-out)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </Link>
  );
}
