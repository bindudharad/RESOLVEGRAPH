"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Check,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  HelpCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { NAV_GROUPS, type NavItem } from "@/lib/navigation";
import { WORKSPACE, CURRENT_USER } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { Dropdown, DropdownLabel, DropdownSeparator } from "@/components/ui/dropdown";
import { Tooltip, Kbd } from "@/components/ui/primitives";
import { useSidebar } from "@/components/layout/sidebar-context";
import { Popover, PlannedRouteNotice } from "@/components/ui/popover";
import { useState } from "react";

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Demonstration action badges (Section 4.1) */
const ACTION_BADGES: Record<string, { count: number; label: string }> = {
  "/cases": { count: 14, label: "14 requiring review" },
  "/evidence": { count: 3, label: "3 unverified" },
  "/paypal/disputes": { count: 2, label: "2 pending response" },
};

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

  return (
    <nav
      aria-label="Primary"
      className={cn("flex min-h-0 flex-1 flex-col gap-4 py-3 select-none", className)}
    >
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <div
            className={cn(
              "px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--nav-ink)] opacity-50",
              collapsed && "px-0 text-center"
            )}
          >
            {collapsed ? <span className="sr-only">{group.label}</span> : group.label}
          </div>

          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <NavItemLink
                  item={item}
                  active={isActive(pathname, item.href)}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
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
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;
  const isPlanned = item.availability === "preview";
  const badge = ACTION_BADGES[item.href];

  // If planned: display popover on click instead of navigating
  if (isPlanned) {
    return (
      <Popover
        align={collapsed ? "left" : "right"}
        trigger={({ onClick, ref }) => (
          <button
            ref={ref}
            type="button"
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={cn(
              "group relative flex h-9 w-full items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors",
              collapsed ? "justify-center px-0" : "px-3",
              "text-[var(--nav-ink)] opacity-50 hover:opacity-85 hover:bg-white/[0.04]"
            )}
            title={`${item.label} (Planned)`}
          >
            <div className="relative flex items-center justify-center">
              <Icon className="h-4 w-4 shrink-0 border border-dashed border-[var(--nav-ink)] rounded p-0.5" />
            </div>

            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 truncate text-left italic">{item.label}</span>
                <span className="rounded bg-white/[0.08] px-1.5 py-0.2 text-[10px] font-mono uppercase tracking-wider text-[var(--nav-ink)] opacity-70">
                  Planned
                </span>
              </>
            )}
          </button>
        )}
      >
        <PlannedRouteNotice label={item.label} />
      </Popover>
    );
  }

  const linkContent = (
    <Link
      href={item.href}
      onClick={onNavigate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors",
        collapsed ? "w-full justify-center px-0" : "px-3",
        active
          ? "text-white font-semibold"
          : "text-[var(--nav-ink)] hover:text-white hover:bg-white/[0.04]"
      )}
    >
      {/* Sliding highlight pill (shared layout animation) */}
      {active && (
        <motion.div
          layoutId="sidebar-active-pill"
          className="absolute inset-0 rounded-lg bg-white/[0.09]"
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        />
      )}

      {/* 2px leading indicator */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-[var(--accent)] transition-opacity",
          active ? "opacity-100" : "opacity-0"
        )}
      />

      <Icon
        className={cn(
          "relative z-10 h-4 w-4 shrink-0 transition-colors",
          active ? "text-[var(--accent)]" : "text-[var(--nav-ink)] group-hover:text-white"
        )}
        aria-hidden="true"
      />

      {!collapsed && (
        <>
          <span className="relative z-10 min-w-0 flex-1 truncate">{item.label}</span>
          {badge && (
            <span
              className={cn(
                "relative z-10 rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums",
                active
                  ? "bg-[var(--accent)] text-white"
                  : "bg-white/[0.08] text-[var(--nav-ink)]"
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
        {linkContent}
      </Tooltip>
    );
  }

  return linkContent;
}

/** Brand lockup + convergence motif. Clickable logo returning to Home (/dashboard). */
export function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-14 shrink-0 items-center border-b border-white/[0.08] px-4">
      <Link
        href="/dashboard"
        aria-label="RESOLVEGRAPH Home — Investigation Command Center"
        className={cn(
          "group flex min-w-0 items-center gap-2.5 rounded-lg p-1 -m-1 transition-all duration-150",
          "hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
          collapsed && "mx-auto"
        )}
      >
        <Logo className="h-7 w-7 shrink-0 transition-transform duration-200 group-hover:scale-105" />
        {!collapsed ? (
          <div className="min-w-0 flex flex-col">
            <span className="truncate text-[13px] font-bold tracking-[0.1em] text-white group-hover:text-[var(--ink-0,#FFF)]">
              RESOLVE<span className="text-[var(--accent)]">GRAPH</span>
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--agreed)]" />
              <span className="truncate text-[10.5px] text-[var(--nav-ink)] opacity-70 group-hover:opacity-90">
                Convergence Ledger
              </span>
            </div>
          </div>
        ) : (
          <span className="sr-only">RESOLVEGRAPH Home — Investigation Command Center</span>
        )}
      </Link>
    </div>
  );
}

/** Workspace selector showing Demo workspace pill (Section 4.1) */
export function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="px-2 pb-1 pt-2.5">
        <Tooltip label={`${WORKSPACE.name} (Demo)`} side="right" className="flex w-full">
          <button
            type="button"
            className="flex h-9 w-full items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-[var(--nav-ink)] hover:bg-white/[0.06] hover:text-white"
          >
            <Building2 className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{WORKSPACE.name}</span>
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="px-3 pb-1 pt-3">
      <Dropdown
        label="Workspace"
        width="w-[min(16rem,calc(100vw-2rem))]"
        trigger={(props) => (
          <button
            type="button"
            {...props}
            className="flex w-full items-center gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-left transition-colors hover:border-white/[0.15] hover:bg-white/[0.06]"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-white">
              <Building2 className="h-3 w-3" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 truncate text-[12px] font-semibold text-white">
                <span>{WORKSPACE.name}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-white/[0.08] px-1 py-0.2 text-[9.5px] font-mono uppercase tracking-wider text-[var(--nav-ink)]">
                  Demo Workspace
                </span>
              </div>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[var(--nav-ink)] opacity-60" />
          </button>
        )}
      >
        <DropdownLabel>Workspaces</DropdownLabel>
        <div className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--ink)]">
          <Building2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />
          <span className="min-w-0 flex-1 truncate">{WORKSPACE.name}</span>
          <Check className="h-3.5 w-3.5 shrink-0 text-[var(--agreed)]" />
        </div>
        <DropdownSeparator />
        <div className="px-3 py-1.5 text-[11px] text-[var(--ink-3)] leading-relaxed">
          Demo workspace: operations and figures are simulated.
        </div>
      </Dropdown>
    </div>
  );
}

export function SidebarCollapseToggle() {
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <div className="shrink-0 border-t border-white/[0.08] px-3 py-2.5 flex items-center justify-between">
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        aria-controls="app-sidebar"
        className={cn(
          "flex h-8 items-center rounded-lg text-[var(--nav-ink)] transition-colors hover:bg-white/[0.05] hover:text-white",
          collapsed ? "w-full justify-center px-0" : "gap-2 px-2"
        )}
        title="Toggle sidebar (press [ key)"
      >
        {collapsed ? (
          <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
        ) : (
          <>
            <PanelLeftClose className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="text-[12px]">Collapse</span>
            <Kbd className="ml-auto text-[10px] bg-white/[0.06] border-white/[0.1] text-[var(--nav-ink)]">
              [
            </Kbd>
          </>
        )}
      </button>

      {!collapsed && (
        <Link
          href="/help"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--nav-ink)] hover:bg-white/[0.05] hover:text-white"
          title="Help & runbook"
        >
          <HelpCircle className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

/** Fixed desktop rail: 264px expanded, 68px rail (Section 4.1) */
export function AppSidebar() {
  const { collapsed } = useSidebar();

  return (
    <aside
      id="app-sidebar"
      className={cn(
        "sticky top-0 z-50 hidden h-screen shrink-0 flex-col bg-[var(--nav-bg)] text-[var(--nav-ink)] lg:flex border-r border-black/20",
        "transition-[width] duration-280 ease-[var(--ease-out)]",
        collapsed ? "w-[68px]" : "w-[264px]"
      )}
    >
      <SidebarBrand collapsed={collapsed} />
      <WorkspaceSwitcher collapsed={collapsed} />
      <SidebarNav
        collapsed={collapsed}
        className={cn("px-2", collapsed ? "overflow-visible" : "overflow-y-auto")}
      />
      <SidebarCollapseToggle />
    </aside>
  );
}
