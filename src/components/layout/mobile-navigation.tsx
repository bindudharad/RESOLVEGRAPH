"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  LayoutDashboard,
  FolderOpen,
  Library,
  CreditCard,
  Menu,
} from "lucide-react";
import { useEffect } from "react";
import {
  SidebarBrand,
  SidebarNav,
  SidebarFooter,
} from "@/components/layout/app-sidebar";
import { useSidebar } from "@/components/layout/sidebar-context";
import { cn } from "@/lib/utils";

/**
 * Enterprise Mobile navigation:
 * - Persistent bottom tab bar on mobile screens (< 1024px): Overview, Cases, Evidence, Payments, More
 * - Full-height slide-out drawer with dark backdrop
 */
export function MobileNavigation() {
  const pathname = usePathname();
  const { mobileOpen, openMobile, closeMobile } = useSidebar();

  // Lock background scroll while drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const mobileTabs = [
    { label: "Overview", href: "/overview", icon: LayoutDashboard },
    { label: "Cases", href: "/cases", icon: FolderOpen },
    { label: "Evidence", href: "/evidence", icon: Library },
    { label: "Payments", href: "/payments", icon: CreditCard },
  ];

  return (
    <>
      {/* Bottom Tab Bar (below 1024px) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-40 flex h-14 items-center justify-around border-t border-[var(--line)] bg-[#0A0D14]/95 px-2 backdrop-blur-md lg:hidden"
      >
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const active =
            tab.href === "/overview"
              ? pathname === "/overview"
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors select-none",
                active
                  ? "text-[var(--accent)] font-semibold"
                  : "text-white/50 hover:text-white"
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
          aria-label="Open full workspace navigation"
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors select-none cursor-pointer",
            mobileOpen ? "text-[var(--accent)]" : "text-white/50 hover:text-white"
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
            "absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
          tabIndex={-1}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-[#0A0D14] text-white border-r border-white/[0.08]",
            "shadow-2xl transition-transform duration-250 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="relative">
            <SidebarBrand collapsed={false} />
            <button
              type="button"
              onClick={closeMobile}
              aria-label="Close navigation drawer"
              className="absolute right-3.5 top-4 rounded-lg p-1.5 text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            <SidebarNav collapsed={false} onNavigate={closeMobile} />
          </div>

          <SidebarFooter collapsed={false} />
        </div>
      </div>
    </>
  );
}
