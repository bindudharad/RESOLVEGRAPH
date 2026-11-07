import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shimmer block — used to build loading skeletons. */
export function Skeleton({
  className,
  ...props
}: ComponentPropsWithRef<"div">) {
  return <div aria-hidden="true" className={cn("rg-skeleton", className)} {...props} />;
}

/** Kbd-style key cap used for shortcut hints. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-2 bg-surface-2 px-1.5 " +
          "font-sans text-[10.5px] font-medium text-subtle shadow-[inset_0_-1px_0_rgba(0,0,0,0.4)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** Toggle switch used in settings. */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 ease-[var(--ease-out-soft)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-2)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-[var(--color-brand-solid)] bg-[var(--color-brand-solid)]"
          : "border-line-2 bg-surface-2 hover:border-[#33446a]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "ml-[3px] block h-[16px] w-[16px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-[var(--ease-out-soft)]",
          checked ? "translate-x-[16px]" : "translate-x-0",
        )}
      />
    </button>
  );
}

/** CSS-driven tooltip. Never receives pointer events, so it cannot trap focus. */
export function Tooltip({
  label,
  children,
  side = "bottom",
  className,
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  const position =
    side === "top"
      ? "bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2"
      : side === "bottom"
        ? "top-[calc(100%+8px)] left-1/2 -translate-x-1/2"
        : side === "left"
          ? "right-[calc(100%+8px)] top-1/2 -translate-y-1/2"
          : "left-[calc(100%+8px)] top-1/2 -translate-y-1/2";

  return (
    <div className={cn("rg-tooltip-host relative", className)}>
      {children}
      <span role="tooltip" className={cn("rg-tooltip", position)}>
        {label}
      </span>
    </div>
  );
}
