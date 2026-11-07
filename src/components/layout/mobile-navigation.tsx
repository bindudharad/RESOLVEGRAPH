"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { WORKSPACE } from "@/lib/mock-data";
import { DemoBadge } from "@/components/common/demo-badge";
import {
  SidebarBrand,
  SidebarNav,
  WorkspaceSwitcher,
} from "@/components/layout/app-sidebar";
import { useSidebar } from "@/components/layout/sidebar-context";
import { cn } from "@/lib/utils";

/**
 * Mobile / tablet navigation drawer.
 * Trapped behind an overlay, dismissible with Escape or the close control.
 */
export function MobileNavigation() {
  const { mobileOpen, closeMobile } = useSidebar();

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-90 lg:hidden",
        mobileOpen ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!mobileOpen}
    >
      <div
        onClick={closeMobile}
        className={cn(
          "absolute inset-0 bg-black/65 backdrop-blur-[2px] transition-opacity duration-250",
          mobileOpen ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        tabIndex={-1}
        className={cn(
          "absolute inset-y-0 left-0 flex w-[min(19rem,85vw)] flex-col border-r border-line bg-sidebar",
          "shadow-[24px_0_60px_-24px_rgba(0,0,0,0.9)] transition-transform duration-250 ease-[var(--ease-out-soft)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="relative">
          <SidebarBrand collapsed={false} />
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close navigation menu"
            className="absolute right-3 top-4 rounded-md p-1.5 text-faint transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <WorkspaceSwitcher collapsed={false} />

        <div className="min-h-0 flex-1 overflow-y-auto px-2">
          <SidebarNav collapsed={false} onNavigate={closeMobile} />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium text-muted">
              {WORKSPACE.name}
            </p>
            <p className="truncate text-[10.5px] text-faint">
              Step 1 interface preview
            </p>
          </div>
          <DemoBadge size="xs" />
        </div>
      </div>
    </div>
  );
}
