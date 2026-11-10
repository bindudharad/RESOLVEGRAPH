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
    "bg-[var(--accent)] text-white border border-transparent shadow-[0_1px_2px_rgba(14,18,32,0.12)] hover:bg-[#3743C9] active:bg-[#2C36A8] font-medium",
  secondary:
    "bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--line)] hover:text-[var(--ink)]",
  outline:
    "bg-transparent text-[var(--ink-2)] border border-[var(--line)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]",
  ghost:
    "bg-transparent text-[var(--ink-2)] border border-transparent hover:text-[var(--ink)] hover:bg-[var(--surface-2)]",
  subtle:
    "bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--line)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]",
  financial:
    "bg-[var(--payment)] text-white border border-transparent shadow-sm hover:opacity-90 active:scale-[0.99]",
  danger:
    "bg-[var(--danger)] text-white border border-transparent hover:opacity-90 active:scale-[0.99]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-[12px] gap-1.5 rounded-lg",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-lg",
  lg: "h-10 px-4 text-[14px] gap-2 rounded-lg",
  icon: "h-9 w-9 rounded-lg",
  "icon-sm": "h-8 w-8 rounded-lg",
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
