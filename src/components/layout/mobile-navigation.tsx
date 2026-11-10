"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  Home,
  FolderOpen,
  Library,
  GitBranch,
  Menu,
} from "lucide-react";
import { useEffect } from "react";
import { WORKSPACE } from "@/lib/mock-data";
import {
  SidebarBrand,
  SidebarNav,
  WorkspaceSwitcher,
} from "@/components/layout/app-sidebar";
import { useSidebar } from "@/components/layout/sidebar-context";
import { cn } from "@/lib/utils";

/**
 * Mobile navigation:
 * - Persistent bottom tab bar on mobile screens (< 768px): Dashboard, Cases, Evidence, Graph, More (Section 4.4)
 * - Full-height drawer for all nested system routes
 */
export function MobileNavigation() {
  const pathname = usePathname();
  const { mobileOpen, openMobile, closeMobile } = useSidebar();

  // Lock background scroll while drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const mobileTabs = [
    { label: "Home", href: "/dashboard", icon: Home },
    { label: "Cases", href: "/cases", icon: FolderOpen },
    { label: "Evidence", href: "/evidence", icon: Library },
    { label: "Graph", href: "/cases/RG-1001", icon: GitBranch },
  ];

  return (
    <>
      {/* Bottom Tab Bar (Section 4.4: below 768px) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-40 flex h-14 items-center justify-around border-t border-[var(--line)] bg-[var(--surface)]/95 px-2 backdrop-blur-md lg:hidden"
      >
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const active =
            tab.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "text-[var(--accent)] font-semibold"
                  : "text-[var(--ink-3)] hover:text-[var(--ink)]"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={openMobile}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
            mobileOpen ? "text-[var(--accent)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]"
          )}
        >
          <Menu className="h-4 w-4" />
          <span>More</span>
        </button>
      </nav>

      {/* Full-Height Drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={closeMobile}
          className={cn(
            "absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          tabIndex={-1}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(19rem,85vw)] flex-col bg-[var(--nav-bg)] text-[var(--nav-ink)]",
            "shadow-2xl transition-transform duration-250 ease-[var(--ease-out)]",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="relative">
            <SidebarBrand collapsed={false} />
            <button
              type="button"
              onClick={closeMobile}
              aria-label="Close navigation menu"
              className="absolute right-3 top-3.5 rounded-lg p-1.5 text-[var(--nav-ink)] opacity-70 hover:opacity-100 hover:bg-white/[0.08]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <WorkspaceSwitcher collapsed={false} />

          <div className="min-h-0 flex-1 overflow-y-auto px-2">
            <SidebarNav collapsed={false} onNavigate={closeMobile} />
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.08] px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-white">
                {WORKSPACE.name}
              </p>
              <p className="truncate text-[10px] text-[var(--nav-ink)] opacity-60">
                Evaluation Environment
              </p>
            </div>
            <span className="rounded bg-white/[0.08] px-2 py-0.5 text-[10px] font-mono uppercase text-white">
              Demo
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
