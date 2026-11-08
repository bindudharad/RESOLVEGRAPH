"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Check,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from "lucide-react";
import { NAV_GROUPS, type NavItem } from "@/lib/navigation";
import { WORKSPACE } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { Dropdown, DropdownLabel, DropdownSeparator } from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/primitives";
import { useSidebar } from "@/components/layout/sidebar-context";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Shared navigation list — rendered by both the desktop rail and the mobile
 * drawer so active states can never drift apart.
 */
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
      className={cn("flex min-h-0 flex-1 flex-col gap-5 py-4", className)}
    >
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <div
            className={cn(
              "px-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-faint",
              collapsed && "px-0 text-center",
            )}
          >
            {collapsed ? <span className="sr-only">{group.label}</span> : group.label}
          </div>

          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <NavLink
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

function NavLink({
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

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-md text-[13px] font-medium",
        "transition-[background-color,color] duration-150 ease-[var(--ease-out-soft)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-2)]",
        collapsed ? "w-full justify-center px-0" : "px-3",
        active
          ? "bg-[color-mix(in_srgb,var(--color-brand)_15%,transparent)] text-fg"
          : "text-muted hover:bg-surface-2 hover:text-fg",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-[var(--color-brand)] transition-opacity duration-200",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors duration-150",
          active ? "text-amber-400" : "text-subtle group-hover:text-muted",
        )}
        aria-hidden="true"
      />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.availability === "preview" ? (
            <span
              aria-label="Preview"
              title="Preview — not implemented in Step 1"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand)] opacity-70"
            />
          ) : null}
        </>
      ) : null}
      {collapsed ? <span className="sr-only">{item.label}</span> : null}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip label={item.label} side="right" className="flex w-full">
        {link}
      </Tooltip>
    );
  }

  return link;
}

/** Brand lockup + workspace switcher. */
export function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-16 shrink-0 items-center border-b border-line px-4">
      <Link
        href="/dashboard"
        className={cn(
          "flex min-w-0 items-center gap-2.5 rounded-md transition-opacity hover:opacity-90",
          collapsed && "mx-auto",
        )}
      >
        <Logo className="h-8 w-8 shrink-0" />
        {!collapsed ? (
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-semibold tracking-[0.13em] text-fg">
              RESOLVEGRAPH
            </span>
            <span className="block truncate text-[10.5px] font-medium tracking-[0.03em] text-faint">
              {WORKSPACE.descriptor}
            </span>
          </span>
        ) : (
          <span className="sr-only">RESOLVEGRAPH — {WORKSPACE.descriptor}</span>
        )}
      </Link>
    </div>
  );
}

/** Workspace selector — display-only in Step 1. */
export function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="px-3 pb-1 pt-3">
        <Tooltip label={WORKSPACE.name} side="right" className="flex w-full">
          <button
            type="button"
            className="flex h-10 w-full items-center justify-center rounded-md border border-line bg-[#0B0F17] text-subtle transition-colors hover:border-line-2 hover:text-fg"
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
        width="w-[min(17rem,calc(100vw-2rem))]"
        trigger={(props) => (
          <button
            type="button"
            {...props}
            className="flex w-full items-center gap-2.5 rounded-md border border-line bg-[#0B0F17] px-2.5 py-2 text-left transition-colors hover:border-line-2 hover:bg-surface-2"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium text-fg">
                {WORKSPACE.name}
              </span>
              <span className="block truncate text-[10.5px] text-faint">
                {WORKSPACE.seats} seats · {WORKSPACE.planLabel}
              </span>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden="true" />
          </button>
        )}
      >
        <DropdownLabel>Workspaces</DropdownLabel>
        <div className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-fg">
          <Building2 className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{WORKSPACE.name}</span>
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
        </div>
        <DropdownSeparator />
        <div className="flex items-start gap-2 px-3 py-2 text-[11.5px] leading-relaxed text-faint">
          <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Switching and creating workspaces arrives with the multi-tenant phase.
        </div>
      </Dropdown>
    </div>
  );
}

export function SidebarCollapseToggle() {
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <div className="shrink-0 border-t border-line px-3 py-3">
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        aria-controls="app-sidebar"
        className={cn(
          "flex h-8 w-full items-center rounded-md border border-transparent text-faint transition-colors",
          "hover:border-line hover:bg-surface-2 hover:text-fg",
          collapsed ? "justify-center" : "gap-2.5 px-2.5",
        )}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
        ) : (
          <>
            <PanelLeftClose className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="text-[12.5px] font-medium">Collapse</span>
          </>
        )}
        <span className="sr-only">
          {collapsed ? "Expand sidebar" : "Collapse sidebar"}
        </span>
      </button>
    </div>
  );
}

/** Fixed desktop rail. Hidden below the `lg` breakpoint — mobile uses the drawer. */
export function AppSidebar() {
  const { collapsed } = useSidebar();

  return (
    <aside
      id="app-sidebar"
      className={cn(
        "sticky top-0 z-50 hidden h-screen shrink-0 flex-col border-r border-line bg-sidebar lg:flex",
        "transition-[width] duration-300 ease-[var(--ease-out-expo)]",
        "shadow-[1px_0_24px_rgba(0,0,0,0.5)] border-r border-[#182030]",
        collapsed ? "w-[76px]" : "w-[264px]",
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
