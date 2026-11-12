"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/utils";

export interface DropdownProps {
  /** Render prop for the trigger — receives open state and toggle props. */
  trigger: (props: {
    ref: Ref<HTMLButtonElement>;
    onClick: () => void;
    "aria-expanded": boolean;
    "aria-haspopup": "menu";
  }) => ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  /** Width of the panel; "trigger" matches the trigger width. */
  width?: string;
  className?: string;
  label?: string;
}

/**
 * Lightweight menu: click-outside + Escape dismissal, focus return,
 * and keyboard-friendly links/items.
 */
export function Dropdown({
  trigger,
  children,
  align = "end",
  width = "w-64",
  className,
  label = "Menu",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [shiftX, setShiftX] = useState(0);
  const [maxMenuHeight, setMaxMenuHeight] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const adjustPosition = () => {
      const el = menuRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 12;

      let nextShift = 0;
      if (rect.left < margin) {
        nextShift = margin - rect.left;
      } else if (rect.right > vw - margin) {
        nextShift = vw - margin - rect.right;
      }
      setShiftX((prev) => (prev === Math.round(nextShift) ? prev : Math.round(nextShift)));

      const availableBottom = vh - rect.top - margin;
      if (availableBottom > 180 && rect.height > availableBottom) {
        setMaxMenuHeight(Math.floor(availableBottom));
      } else {
        setMaxMenuHeight(null);
      }
    };

    const rafId = window.requestAnimationFrame(adjustPosition);

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setShiftX(0);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setShiftX(0);
        triggerRef.current?.focus();
      }
    };
    const onResize = () => {
      setOpen(false);
      setShiftX(0);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setShiftX(0);
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      {trigger({
        ref: triggerRef,
        onClick: () => {
          setOpen((v) => {
            if (v) setShiftX(0);
            return !v;
          });
        },
        "aria-expanded": open,
        "aria-haspopup": "menu",
      })}

      {open ? (
        <div
          ref={menuRef}
          style={{ transform: shiftX !== 0 ? `translateX(${shiftX}px)` : undefined }}
          className={cn(
            "absolute top-[calc(100%+7px)] z-80 max-w-[calc(100vw-24px)]",
            align === "end" ? "right-0" : "left-0",
            width,
          )}
        >
          <div
            role="menu"
            aria-label={label}
            style={
              maxMenuHeight !== null
                ? { maxHeight: `${maxMenuHeight}px`, overflowY: "auto" }
                : undefined
            }
            className="rg-anim-pop w-full overflow-hidden rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] py-1.5 shadow-xl text-[var(--ink)]"
            onClick={close}
          >
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DropdownItem({
  href,
  onClick,
  icon,
  children,
  danger = false,
  disabled = false,
}: {
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  const className = cn(
    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors",
    danger
      ? "text-[var(--danger)] hover:bg-[var(--danger)]/10"
      : "text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
    disabled && "pointer-events-none opacity-45",
  );

  const inner = (
    <>
      {icon ? (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-current opacity-80">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className} role="menuitem">
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" role="menuitem" onClick={onClick} disabled={disabled} className={className}>
      {inner}
    </button>
  );
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 pb-1.5 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-3)]">
      {children}
    </div>
  );
}

export function DropdownSeparator() {
  return <div className="my-1.5 h-px bg-[var(--line)]" role="separator" />;
}
