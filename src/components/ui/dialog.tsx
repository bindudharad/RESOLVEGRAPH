"use client";

import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export type DialogSize = "sm" | "md" | "lg" | "panel";

const SIZES: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  panel: "max-w-3xl",
};

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Extra classes for the scrolling body region. */
  bodyClassName?: string;
  size?: DialogSize;
  /** The backdrop closes by default; disable for destructive flows. */
  dismissOnBackdrop?: boolean;
  className?: string;
}

/**
 * Accessible modal dialog: portaled to <body>, focus trapped, Escape to close,
 * body scroll locked, and focus restored to the opener on unmount.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  bodyClassName,
  size = "md",
  dismissOnBackdrop = true,
  className,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Remember the opener and give focus back when the dialog closes.
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    return () => restoreRef.current?.focus?.();
  }, [open]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Initial focus, Escape handling and Tab cycling.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const initial = panel.querySelector<HTMLElement>(FOCUSABLE);
    (initial ?? panel).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-end justify-center overflow-y-auto p-4 sm:items-center sm:p-6"
      role="presentation"
    >
      <div
        className="rg-anim-fade fixed inset-0 bg-black/65 backdrop-blur-[2px]"
        onClick={dismissOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "rg-anim-rise relative w-full rounded-xl border border-line-2 bg-surface outline-none",
          "shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85)]",
          SIZES[size],
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-[15px] font-semibold tracking-[-0.012em] text-fg"
            >
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 text-[12.5px] leading-relaxed text-subtle">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-1.5 -mt-1 shrink-0 rounded-md p-1.5 text-faint transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className={cn("px-5 py-4.5", bodyClassName)}>{children}</div>

        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 rounded-b-xl border-t border-line bg-surface-2 px-5 py-3.5">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Confirmation dialog for financial or irreversible actions (Section 5)
 * Enforces honesty grammar: states consequence, approval authority, and simulation notice.
 */
export function ActionConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  actionVerb,
  consequence,
  requiredApprover = "Human Resolution Officer",
  isFinancial = false,
  isDestructive = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  actionVerb: string;
  consequence: string;
  requiredApprover?: string;
  isFinancial?: boolean;
  isDestructive?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-[11px] text-[var(--ink-3)] font-mono">
            Demo environment
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[var(--line)] text-[13px] text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-[13px] font-medium text-white transition-opacity",
                isDestructive
                  ? "bg-[var(--danger)] hover:opacity-90"
                  : isFinancial
                  ? "bg-[var(--payment)] hover:opacity-90"
                  : "bg-[var(--accent)] hover:opacity-90"
              )}
            >
              {actionVerb} (Demo)
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3 py-1 text-[13px]">
        <div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--surface-2)]">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-[var(--ink-3)] mb-1">
            Consequence of Action
          </div>
          <p className="text-[var(--ink)] leading-relaxed">{consequence}</p>
        </div>

        <div className="flex items-center justify-between text-[12px] px-1 text-[var(--ink-3)]">
          <span>Required Authorization:</span>
          <span className="font-medium text-[var(--ink)]">{requiredApprover}</span>
        </div>

        <div className="rounded border border-dashed border-[var(--missing)] p-2 text-[11px] text-[var(--ink-3)] leading-relaxed rg-hatched-missing">
          <strong>Honesty Rule:</strong> This operation is simulated in this evaluation build. No live currency, dispute status, or external API record will be mutated.
        </div>
      </div>
    </Dialog>
  );
}
