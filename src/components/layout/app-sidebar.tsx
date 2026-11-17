"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Settings,
  PlusCircle,
  FolderOpen,
  LayoutDashboard,
  Inbox,
  FileCheck2,
  CreditCard,
} from "lucide-react";
import { NAV_GROUPS, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { Tooltip } from "@/components/ui/primitives";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useSession, signOut } from "@/lib/auth-client";

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.label === "Dashboard") {
    return pathname === "/overview" || pathname === "/dashboard";
  }
  if (item.label === "BERR Analysis") {
    return pathname === "/investigation" || pathname.startsWith("/investigation");
  }
  if (item.label === "Seller Outreach") {
    return pathname === "/seller/requests" || pathname.startsWith("/seller/requests");
  }
  if (item.label === "Activity & Audit") {
    return pathname.startsWith("/admin/security") || pathname === "/audit";
  }
  if (item.label === "Administration") {
    return pathname.startsWith("/admin/security");
  }
  if (item.label === "Settings") {
    return pathname === "/settings" || pathname.startsWith("/settings/");
  }
  if (item.href === "/overview") {
    return pathname === "/overview";
  }
  if (item.href === "/seller") {
    return pathname === "/seller";
  }
  if (item.href === "/cases") {
    return (pathname === "/cases" || pathname.startsWith("/cases/")) && !pathname.includes("investigation");
  }
  if (item.href === "/evidence") {
    return pathname === "/evidence" || pathname.startsWith("/evidence/");
  }
  if (item.href === "/resolution") {
    return pathname === "/resolution" || pathname.startsWith("/resolution/") || pathname === "/resolution-room";
  }
  if (item.href === "/payments") {
    return pathname === "/payments" || pathname.startsWith("/payments/") || pathname === "/analytics/captures" || pathname.startsWith("/analytics/captures/");
  }
  if (item.href === "/organizations") {
    return pathname === "/organizations" || pathname.startsWith("/organizations/") || pathname.startsWith("/seller/directory");
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

  const isPlatformAdmin = Boolean(user?.isPlatformAdmin || user?.role === "ADMIN");
  const isBuyer = Boolean(user?.role === "BUYER" && !isPlatformAdmin);
  const isMerchant = Boolean(user?.role === "MERCHANT" && !isPlatformAdmin);

  const organizationName = isBuyer
    ? "Customer Resolution Portal"
    : isMerchant
    ? user?.organization || "Seller Portal"
    : user?.organization || "Platform Workspace";

  const brandHref = isMerchant ? "/seller" : "/overview";

  if (collapsed) {
    return (
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-white/[0.09] bg-transparent">
        <Tooltip label="RESOLVEGRAPH Workspace" side="right">
          <Link
            href={brandHref}
            aria-label="RESOLVEGRAPH Workspace Overview"
            className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
          >
            <Logo className="h-7 w-7 shrink-0 transition-transform duration-200 hover:scale-105" />
          </Link>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.09] px-3.5 bg-transparent">
      <Link
        href={brandHref}
        aria-label="RESOLVEGRAPH Workspace Overview"
        className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 transition-all duration-150 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
      >
        <Logo className="h-7 w-7 shrink-0 transition-transform duration-200 group-hover:scale-105" />
        <div className="min-w-0 flex flex-col">
          <span className="truncate text-[13.5px] font-bold tracking-[0.08em] text-[#F4F7FB]">
            RESOLVE<span className="text-[#3B82F6]">GRAPH</span>
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] shrink-0" />
            <span className="truncate text-[10.5px] font-mono text-[#A3AFBF] tracking-tight">
              {organizationName}
            </span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label="Collapse sidebar"
        className="rounded-lg p-1.5 text-[#718096] hover:bg-white/[0.06] hover:text-[#F4F7FB] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
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
  const { data: session, isPending } = useSession();
  const user = session?.user as SessionUserExtra | undefined;
  const isPlatformAdmin = Boolean(user?.isPlatformAdmin || user?.role === "ADMIN");
  const isBuyer = Boolean(user?.role === "BUYER" && !isPlatformAdmin);
  const isMerchant = Boolean(user?.role === "MERCHANT" && !isPlatformAdmin);

  if (isPending && !user) {
    return (
      <nav aria-label="Loading navigation" className={cn("flex flex-1 flex-col gap-2 px-3 py-4", className)}>
        <div className="h-9 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="h-9 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="h-9 animate-pulse rounded-xl bg-white/[0.06]" />
      </nav>
    );
  }

  if (isBuyer || isMerchant) {
    const portalLabel = isMerchant ? "Seller Portal" : "Customer Portal";
    const navAriaLabel = isMerchant ? "Seller Navigation" : "Buyer Navigation";
    const portalItems = isMerchant
      ? [
          {
            label: "Dashboard",
            href: "/seller",
            icon: LayoutDashboard,
            active: pathname === "/seller",
          },
          {
            label: "Evidence Requests",
            href: "/seller/requests",
            icon: Inbox,
            active: pathname === "/seller/requests" || pathname.startsWith("/seller/requests/"),
          },
          {
            label: "Submitted Responses",
            href: "/seller/responses",
            icon: FileCheck2,
            active:
              pathname === "/seller/responses" || pathname.startsWith("/seller/responses/"),
          },
          {
            label: "Capture Analytics",
            href: "/analytics/captures",
            icon: CreditCard,
            active:
              pathname === "/analytics/captures" || pathname.startsWith("/analytics/captures/"),
          },
        ]
      : [
          {
            label: "Submit Complaint",
            href: "/overview",
            icon: PlusCircle,
            active: pathname === "/overview",
          },
          {
            label: "My Complaints",
            href: "/cases",
            icon: FolderOpen,
            active: pathname === "/cases" || pathname.startsWith("/cases/"),
          },
          {
            label: "Profile & Settings",
            href: "/settings",
            icon: Settings,
            active: pathname === "/settings" || pathname.startsWith("/settings/"),
          },
        ];

    if (collapsed) {
      return (
        <nav
          aria-label={navAriaLabel}
          className={cn(
            "flex min-h-0 flex-1 flex-col py-3 select-none items-center gap-2 px-2 overflow-visible",
            className
          )}
        >
          {portalItems.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip key={item.href} label={item.label} side="right">
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={item.active ? "page" : undefined}
                  aria-label={item.label}
                  className={cn(
                    "group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 select-none",
                    item.active
                      ? "bg-white/[0.1] text-white shadow-xs"
                      : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                  )}
                >
                  {item.active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[var(--accent)]"
                    />
                  )}
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      item.active
                        ? "text-[var(--accent)]"
                        : "text-white/60 group-hover:text-white"
                    )}
                    aria-hidden="true"
                  />
                </Link>
              </Tooltip>
            );
          })}
        </nav>
      );
    }

    return (
      <nav
        aria-label={navAriaLabel}
        className={cn(
          "flex min-h-0 flex-1 flex-col py-3 select-none gap-1 px-3 overflow-y-auto",
          className
        )}
      >
        <div className="px-3 pt-2 pb-1 text-[10.5px] font-mono uppercase tracking-[0.1em] text-white/40 font-semibold select-none">
          {portalLabel}
        </div>
        <ul className="flex flex-col gap-1">
          {portalItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex flex-col">
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={item.active ? "page" : undefined}
                  className={cn(
                    "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all duration-150 select-none",
                    item.active
                      ? "bg-white/[0.08] text-white font-semibold shadow-xs"
                      : "text-white/70 hover:text-white hover:bg-white/[0.04]"
                  )}
                >
                  {item.active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[var(--accent)]"
                    />
                  )}
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      item.active ? "text-[var(--accent)]" : "text-white/50 group-hover:text-white"
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-left whitespace-nowrap">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

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
                  <Tooltip key={`${group.label}-${item.label}-${item.href}`} label={item.label} side="right">
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
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                        />
                      )}
                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-colors",
                          active
                            ? "text-[#3B82F6]"
                            : "text-[#748195] group-hover:text-white"
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
            <div className="px-3 pt-3 pb-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[#748195] font-semibold select-none">
              {group.label}
            </div>

            <ul className="flex flex-col gap-1">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(pathname, item);
                const badge = ACTION_BADGES[item.href];
                const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);

                return (
                  <li key={`${group.label}-${item.label}-${item.href}`} className="flex flex-col">
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex h-9.5 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all duration-150 select-none",
                        active
                          ? "bg-[#3B82F6]/12 border border-[#3B82F6]/25 text-[#F5F7FA] font-semibold shadow-[0_2px_10px_rgba(59,130,246,0.12)]"
                          : "border border-transparent text-[#A7B2C2] hover:text-[#F5F7FA] hover:bg-white/[0.04]"
                      )}
                    >
                      {/* Active Left Indicator Bar */}
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-4.5 w-[3px] rounded-r-full bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                        />
                      )}

                      {/* Item Icon */}
                      <Icon
                        className={cn(
                          "h-[17px] w-[17px] shrink-0 transition-colors",
                          active ? "text-[#3B82F6]" : "text-[#748195] group-hover:text-[#F5F7FA]"
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
                              ? "bg-[#3B82F6]/25 text-white font-semibold"
                              : "bg-white/[0.08] text-[#A7B2C2] group-hover:text-white"
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
      <div className="shrink-0 border-t border-white/[0.09] py-3 px-2 flex flex-col items-center gap-2 bg-transparent">
        <Tooltip label={`${displayName} (${roleLabel})`} side="right">
          <div
            tabIndex={0}
            role="button"
            aria-label={`${displayName} (${roleLabel})`}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/35 font-mono text-xs font-bold text-[#F4F7FB] shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
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
            className="flex h-8.5 w-8.5 items-center justify-center rounded-xl text-[#718096] hover:bg-white/[0.06] hover:text-[#F4F7FB] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </Tooltip>

        <Tooltip label="Sign out" side="right">
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="flex h-8.5 w-8.5 items-center justify-center rounded-xl text-[#718096] hover:bg-red-500/15 hover:text-red-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-white/[0.09] p-3 bg-transparent">
      <div className="flex items-center justify-between gap-2.5 rounded-xl border border-white/[0.08] bg-[#151D28]/60 backdrop-blur-md p-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/35 font-mono text-xs font-bold text-[#F4F7FB] shadow-xs">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-[#F4F7FB]">
              {displayName}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] shrink-0" />
              <span className="truncate text-[10px] font-mono text-[#718096]">
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
            className="rounded-lg p-1.5 text-[#718096] hover:bg-white/[0.06] hover:text-[#F4F7FB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
          >
            <Settings className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out of session"
            aria-label="Sign out"
            className="rounded-lg p-1.5 text-[#718096] hover:bg-red-500/15 hover:text-red-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Apple-Inspired Dark Glassmorphism Left Rail:
 * - Expanded: 250px fixed width, elegant hierarchy
 * - Collapsed: 68px rail with accessible tooltips
 * - Dark charcoal/slate palette with subtle border and blur
 */
export function AppSidebar() {
  const { collapsed } = useSidebar();

  return (
    <aside
      id="app-sidebar"
      aria-label="Global Workspace Navigation"
      className={cn(
        "sticky top-0 z-50 hidden h-screen shrink-0 flex-col bg-[#0E141D]/95 backdrop-blur-2xl text-[#F5F7FA] lg:flex border-r border-white/[0.08]",
        "transition-[width] duration-200 ease-out select-none shadow-[4px_0_24px_rgba(0,0,0,0.3)]",
        collapsed ? "w-[68px] min-w-[68px]" : "w-[250px] min-w-[250px]"
      )}
    >
      <SidebarBrand collapsed={collapsed} />
      <SidebarNav collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}
