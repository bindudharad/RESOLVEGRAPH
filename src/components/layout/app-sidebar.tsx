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

function isActive(pathname: string, href: string): boolean {
  if (href === "/overview") {
    return pathname === "/overview";
  }
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Operational action badges for active workspace queues */
const ACTION_BADGES: Record<string, { count: number; label: string }> = {
  "/cases": { count: 12, label: "12 active investigations" },
  "/evidence": { count: 4, label: "4 unverified files" },
  "/payments": { count: 2, label: "2 escrow holds" },
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
    user?.organization || "Commerce Resolution";

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.08] px-3.5 bg-[#080B11]">
      <Link
        href="/overview"
        aria-label="RESOLVEGRAPH Workspace Overview"
        className={cn(
          "group flex min-w-0 items-center gap-2.5 rounded-lg p-1 transition-all duration-150",
          "hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
          collapsed ? "mx-auto justify-center" : "flex-1"
        )}
      >
        <Logo className="h-7 w-7 shrink-0 transition-transform duration-200 group-hover:scale-105" />
        {!collapsed && (
          <div className="min-w-0 flex flex-col">
            <span className="truncate text-[13.5px] font-bold tracking-[0.08em] text-white">
              RESOLVE<span className="text-[var(--accent)]">GRAPH</span>
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--agreed)]" />
              <span className="truncate text-[10.5px] font-mono text-white/50 tracking-tight">
                {organizationName}
              </span>
            </div>
          </div>
        )}
      </Link>

      {!collapsed && (
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label="Collapse sidebar"
          className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
          title="Collapse sidebar (Press [ )"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function NavItemLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const badge = ACTION_BADGES[item.href];

  const content = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-150 select-none",
        collapsed ? "w-full justify-center px-0" : "px-3",
        active
          ? "bg-white/[0.08] text-white font-semibold shadow-xs"
          : "text-white/60 hover:text-white hover:bg-white/[0.04]"
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

      {/* Expanded Label & Badge */}
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate text-left whitespace-nowrap">
            {item.label}
          </span>
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
        </>
      )}

      {collapsed && <span className="sr-only">{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip label={item.label} side="right" className="flex w-full">
        {content}
      </Tooltip>
    );
  }

  return content;
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
      className={cn("flex min-h-0 flex-1 flex-col gap-5 py-3 select-none", className)}
    >
      {NAV_GROUPS.map((group) => {
        // Enforce role-based administration visibility
        if (group.adminOnly && !isPlatformAdmin) {
          return null;
        }

        return (
          <div key={group.label} className="flex flex-col gap-1">
            {!collapsed ? (
              <div className="px-3 pb-1 text-[10.5px] font-mono uppercase tracking-[0.1em] text-white/40 font-semibold select-none">
                {group.label}
              </div>
            ) : (
              <div className="h-px w-6 mx-auto bg-white/[0.08] my-1" />
            )}

            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                if (item.adminOnly && !isPlatformAdmin) {
                  return null;
                }
                return (
                  <li key={item.href}>
                    <NavItemLink
                      item={item}
                      active={isActive(pathname, item.href)}
                      collapsed={collapsed}
                      onNavigate={onNavigate}
                    />
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
  const displayName = user?.name || "Authorized User";
  const roleLabel = user?.isPlatformAdmin || user?.role === "ADMIN"
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
      .toUpperCase() || "RG";

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
      <div className="shrink-0 border-t border-white/[0.08] p-2 flex flex-col items-center gap-2 bg-[#080B11]">
        <Tooltip label={`${displayName} (${roleLabel})`} side="right">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/20 border border-[var(--accent)]/30 font-mono text-xs font-bold text-white">
            {initials}
          </div>
        </Tooltip>

        <Tooltip label="Expand sidebar (Press [ )" side="right">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </Tooltip>

        <Tooltip label="Sign out" side="right">
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer"
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
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--agreed)]" />
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
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out of session"
            aria-label="Sign out"
            className="rounded-lg p-1.5 text-white/40 hover:bg-red-500/15 hover:text-red-300 transition-colors cursor-pointer"
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
 * - Collapsed: 72px rail, icons with accessible tooltips
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
      <SidebarNav
        collapsed={collapsed}
        className={cn("px-3", collapsed ? "overflow-visible" : "overflow-y-auto")}
      />
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}
