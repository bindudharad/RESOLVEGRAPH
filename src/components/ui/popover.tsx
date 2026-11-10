"use client";

import React, { useState, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface PopoverProps {
  trigger: (props: {
    onClick: () => void;
    "aria-expanded": boolean;
    ref: React.RefObject<HTMLButtonElement | null>;
  }) => ReactNode;
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}

export function Popover({
  trigger,
  children,
  align = "left",
  className,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative inline-block">
      {trigger({
        onClick: () => setOpen((prev) => !prev),
        "aria-expanded": open,
        ref: triggerRef,
      })}

      <AnimatePresence>
        {open && (
          <motion.div
            ref={contentRef}
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute z-50 mt-1.5 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] p-3 text-[13px] text-[var(--ink)] shadow-xl",
              align === "right" && "right-0",
              align === "left" && "left-0",
              align === "center" && "left-1/2 -translate-x-1/2",
              className
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Pre-built popover specifically for Planned routes (Section 4.1) */
export function PlannedRouteNotice({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1.5 max-w-[220px]">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--contested)]" />
        <span className="font-semibold text-[12px] uppercase tracking-wider text-[var(--ink-2)]">
          Planned Route
        </span>
      </div>
      <p className="text-[12px] text-[var(--ink-3)] leading-relaxed">
        <strong>{label}</strong> is planned for future phases. It is illustrative and does not navigate in this build.
      </p>
    </div>
  );
}
