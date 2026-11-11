"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Settings,
} from "lucide-react";
import { NAV_GROUPS, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { Tooltip } from "@/components/ui/primitives";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useSession, signOut } from "@/lib/auth-client";

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/overview") {
    return pathname === "/overview";
  }
  if (item.href === "/cases") {
    return pathname === "/cases" || pathname.startsWith("/cases/") || pathname === "/investigation";
  }
  if (item.href === "/resolution") {
    return pathname === "/resolution" || pathname.startsWith("/resolution/") || pathname === "/resolution-room";
  }
  if (item.href === "/organizations") {
    return (
      pathname === "/organizations" ||
      pathname.startsWith("/organizations/") ||
      pathname === "/admin/security" ||
      pathname.startsWith("/admin/security/") ||
      pathname === "/settings"
    );
  }
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
    return true;
  }
  if (item.subItems) {
    return item.subItems.some((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
  }
  return false;
}

/** Operational action badges for active workspace queues */
const ACTION_BADGES: Record<string, { count: number; label: string }> = {
  "/cases": { count: 12, label: "12 active investigations" },
  "/evidence": { count: 4, label: "4 unverified files" },
  "/payments": { count: 2, label: "2 escrow holds" },
  "/resolution": { count: 3, label: "3 remedies pending sign-off" },
};

interface SessionUserExtra {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  isPlatformAdmin?: boolean;
  organization?: string;
}

export function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  const { toggleCollapsed } = useSidebar();
  const { data: session } = useSession();
  const user = session?.user as SessionUserExtra | undefined;

  const organizationName =
    user?.organization || "Platform Workspace";

  if (collapsed) {
    return (
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-white/[0.08] bg-[#080B11]">
        <Tooltip label="RESOLVEGRAPH Workspace" side="right">
          <Link
            href="/overview"
            aria-label="RESOLVEGRAPH Workspace Overview"
            className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Logo className="h-7 w-7 shrink-0 transition-transform duration-200 hover:scale-105" />
          </Link>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.08] px-3.5 bg-[#080B11]">
      <Link
        href="/overview"
        aria-label="RESOLVEGRAPH Workspace Overview"
        className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 transition-all duration-150 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <Logo className="h-7 w-7 shrink-0 transition-transform duration-200 group-hover:scale-105" />
        <div className="min-w-0 flex flex-col">
          <span className="truncate text-[13.5px] font-bold tracking-[0.08em] text-white">
            RESOLVE<span className="text-[var(--accent)]">GRAPH</span>
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--agreed)] shrink-0" />
            <span className="truncate text-[10.5px] font-mono text-white/50 tracking-tight">
              {organizationName}
            </span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label="Collapse sidebar"
        className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        title="Collapse sidebar (Press [ )"
      >
        <PanelLeftClose className="h-4 w-4" />
      </button>
    </div>
  );
}

export function SidebarNav({
  collapsed = false,
  onNavigate,
  className,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as SessionUserExtra | undefined;
  const isPlatformAdmin = Boolean(user?.isPlatformAdmin || user?.role === "ADMIN");

  return (
    <nav
      aria-label="Sidebar Navigation"
      className={cn(
        "flex min-h-0 flex-1 flex-col py-3 select-none",
        collapsed
          ? "items-center gap-2 px-2 overflow-visible"
          : "gap-1 px-3 overflow-y-auto",
        className
      )}
    >
      {NAV_GROUPS.map((group) => {
        // Enforce role-based administration visibility
        if (group.adminOnly && !isPlatformAdmin) {
          return null;
        }

        const visibleItems = group.items.filter((item) => {
          if (item.adminOnly && !isPlatformAdmin) return false;
          if (item.hideForPlatformAdmin && isPlatformAdmin) return false;
          return true;
        });

        if (visibleItems.length === 0) return null;

        if (collapsed) {
          return (
            <div key={group.label} className="flex flex-col items-center gap-2 w-full">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(pathname, item);

                return (
                  <Tooltip key={item.href} label={item.label} side="right">
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      aria-label={item.label}
                      className={cn(
                        "group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 select-none",
                        active
                          ? "bg-white/[0.1] text-white shadow-xs"
                          : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                      )}
                    >
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[var(--accent)]"
                        />
                      )}
                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-colors",
                          active
                            ? "text-[var(--accent)]"
                            : "text-white/60 group-hover:text-white"
                        )}
                        aria-hidden="true"
                      />
                    </Link>
                  </Tooltip>
                );
              })}
            </div>
          );
        }

        // Expanded view
        return (
          <div key={group.label} className="flex flex-col gap-1 w-full">
            {group.label !== "Platform" && (
              <div className="px-3 pt-2 pb-1 text-[10.5px] font-mono uppercase tracking-[0.1em] text-white/40 font-semibold select-none">
                {group.label}
              </div>
            )}

            <ul className="flex flex-col gap-1">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(pathname, item);
                const badge = ACTION_BADGES[item.href];
                const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);

                return (
                  <li key={item.href} className="flex flex-col">
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all duration-150 select-none",
                        active
                          ? "bg-white/[0.08] text-white font-semibold shadow-xs"
                          : "text-white/70 hover:text-white hover:bg-white/[0.04]"
                      )}
                    >
                      {/* Active Left Indicator Bar */}
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[var(--accent)]"
                        />
                      )}

                      {/* Item Icon */}
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-colors",
                          active ? "text-[var(--accent)]" : "text-white/50 group-hover:text-white"
                        )}
                        aria-hidden="true"
                      />

                      {/* Label */}
                      <span className="min-w-0 flex-1 truncate text-left whitespace-nowrap">
                        {item.label}
                      </span>

                      {/* Action Badge */}
                      {badge && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-mono text-[10px] tabular-nums shrink-0",
                            active
                              ? "bg-[var(--accent)]/30 text-white font-semibold"
                              : "bg-white/[0.08] text-white/60 group-hover:text-white"
                          )}
                          title={badge.label}
                        >
                          {badge.count}
                        </span>
                      )}
                    </Link>

                    {/* Clean Sub-navigation for items with subpages */}
                    {hasSubItems && active && (
                      <div className="relative ml-6 pl-3 border-l border-white/[0.08] my-1 flex flex-col gap-0.5">
                        {item.subItems!.map((sub) => {
                          const isSubActive =
                            pathname === sub.href ||
                            (sub.href === "/cases" && pathname.startsWith("/cases/"));
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={onNavigate}
                              className={cn(
                                "flex h-7 items-center gap-2 rounded-lg px-2 text-[12px] font-medium transition-colors select-none",
                                isSubActive
                                  ? "text-white font-semibold bg-white/[0.06]"
                                  : "text-white/50 hover:text-white hover:bg-white/[0.03]"
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full shrink-0 transition-colors",
                                  isSubActive ? "bg-[var(--accent)]" : "bg-white/30"
                                )}
                              />
                              <span className="truncate">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { toggleCollapsed } = useSidebar();

  const user = session?.user as SessionUserExtra | undefined;
  const displayName = user?.name || "Priya Raghavan";
  const roleLabel =
    user?.isPlatformAdmin || user?.role === "ADMIN"
      ? "Platform Admin"
      : user?.role === "MERCHANT"
      ? "Merchant Agent"
      : "Consumer";

  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PR";

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/sign-in");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
      router.push("/sign-in");
    }
  };

  if (collapsed) {
    return (
      <div className="shrink-0 border-t border-white/[0.08] py-3 px-2 flex flex-col items-center gap-2.5 bg-[#080B11]">
        <Tooltip label={`${displayName} (${roleLabel})`} side="right">
          <div
            tabIndex={0}
            role="button"
            aria-label={`${displayName} (${roleLabel})`}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/20 border border-[var(--accent)]/30 font-mono text-xs font-bold text-white shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {initials}
          </div>
        </Tooltip>

        <div className="h-px w-6 bg-white/[0.08] my-0.5" />

        <Tooltip label="Expand sidebar (Press [ )" side="right">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/50 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </Tooltip>

        <Tooltip label="Sign out" side="right">
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/50 hover:bg-red-500/15 hover:text-red-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-white/[0.08] p-3 bg-[#080B11]">
      <div className="flex items-center justify-between gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/20 border border-[var(--accent)]/30 font-mono text-xs font-bold text-white shadow-xs">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-white">
              {displayName}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--agreed)] shrink-0" />
              <span className="truncate text-[10.5px] font-mono text-white/50">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/settings"
            title="Account Settings"
            aria-label="Settings"
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out of session"
            aria-label="Sign out"
            className="rounded-lg p-1.5 text-white/40 hover:bg-red-500/15 hover:text-red-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Enterprise Redesigned Desktop Left Rail:
 * - Expanded: 260px fixed width, no label wrapping
 * - Collapsed: 72px rail, icons only with accessible tooltips, centered horizontally
 * - Dark enterprise charcoal palette (#0A0D14)
 */
export function AppSidebar() {
  const { collapsed } = useSidebar();

  return (
    <aside
      id="app-sidebar"
      aria-label="Global Workspace Navigation"
      className={cn(
        "sticky top-0 z-50 hidden h-screen shrink-0 flex-col bg-[#0A0D14] text-white/90 lg:flex border-r border-white/[0.08]",
        "transition-[width] duration-200 ease-out select-none",
        collapsed ? "w-[72px] min-w-[72px]" : "w-[260px] min-w-[260px]"
      )}
    >
      <SidebarBrand collapsed={collapsed} />
      <SidebarNav collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}
