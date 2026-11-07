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
  | "subtle";

export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-brand-solid)] text-white border border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.35)] hover:bg-[var(--color-brand)] active:bg-[#5f41e0]",
  secondary:
    "bg-surface-2 text-fg border border-line-2 hover:bg-surface-3 hover:border-[#33446a]",
  outline:
    "bg-transparent text-muted border border-line-2 hover:text-fg hover:bg-surface-2 hover:border-[#33446a]",
  ghost:
    "bg-transparent text-muted border border-transparent hover:text-fg hover:bg-surface-2",
  subtle:
    "bg-surface text-muted border border-line hover:text-fg hover:bg-surface-2",
  danger:
    "bg-[#b4433f] text-white border border-transparent hover:bg-[#c9524d] active:bg-[#a13a37]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[12.5px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-md",
  lg: "h-10 px-4 text-[13.5px] gap-2 rounded-md",
  icon: "h-9 w-9 rounded-md",
  "icon-sm": "h-8 w-8 rounded-md",
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
        "inline-flex shrink-0 items-center justify-center font-medium tracking-[-0.01em]",
        "transition-[background-color,border-color,color,box-shadow] duration-150 ease-[var(--ease-out-soft)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-2)]",
        "disabled:pointer-events-none disabled:opacity-45",
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
        "inline-flex shrink-0 items-center justify-center font-medium tracking-[-0.01em] no-underline",
        "transition-[background-color,border-color,color] duration-150 ease-[var(--ease-out-soft)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-2)]",
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
