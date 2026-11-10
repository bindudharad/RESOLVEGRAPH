"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronRight,
  HelpCircle,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User,
  Sliders,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { breadcrumbsFor, titleFor } from "@/lib/navigation";
import { WORKSPACE } from "@/lib/mock-data";
import { NotificationPanel } from "@/components/common/notification-panel";
import { CommandPalette } from "@/components/common/command-palette";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useTheme } from "@/components/common/theme-provider";
import { Logo } from "@/components/layout/logo";
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { Kbd, Tooltip } from "@/components/ui/primitives";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { openMobile } = useSidebar();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { data: session } = useSession();
  const { theme, setTheme, motion, setMotion } = useTheme();

  const title = titleFor(pathname);
  const crumbs = breadcrumbsFor(pathname);

  const user = session?.user;
  const displayName = user?.name || "Authorized User";
  const displayEmail = user?.email || "";
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
    } catch (err) {
      console.error("Sign out failed:", err);
      router.push("/sign-in");
    }
  };

  // Global keyboard shortcut listener for ⌘K / Ctrl+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 h-14 border-b border-[var(--line)] bg-[var(--surface)]/90 backdrop-blur-md transition-colors">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
          {/* Mobile: drawer trigger + compact brand */}
          <button
            type="button"
            onClick={openMobile}
            aria-label="Open navigation menu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] lg:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>

          <Link
            href="/overview"
            aria-label="RESOLVEGRAPH Home"
            className="shrink-0 rounded-md transition-opacity hover:opacity-90 lg:hidden"
          >
            <Logo className="h-6 w-6" />
          </Link>

          {/* Page title + breadcrumb with chevron separators (Section 4.3 & Section 5) */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-1.5 text-[12px] leading-none truncate">
                <li className="hidden items-center gap-1.5 text-[var(--ink-3)] sm:flex shrink-0">
                  <span>{WORKSPACE.name}</span>
                </li>
                {crumbs.map((crumb, index) => (
                  <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5 min-w-0 shrink">
                    {index === 0 ? (
                      <ChevronRight className="hidden h-3 w-3 text-[var(--ink-3)] opacity-60 sm:inline shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-[var(--ink-3)] opacity-60 inline shrink-0" />
                    )}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="max-w-[14ch] sm:max-w-[20ch] truncate text-[var(--ink-2)] transition-colors hover:text-[var(--accent)] font-medium"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        aria-current="page"
                        className="max-w-[16ch] sm:max-w-[28ch] truncate text-[var(--ink)] font-semibold"
                      >
                        {crumb.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          {/* Right cluster */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Global Search trigger with Ctrl/Cmd+K hint */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden h-8 w-52 md:w-56 lg:w-68 items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 text-[12px] text-[var(--ink-3)] transition-all hover:border-[var(--accent)] hover:text-[var(--ink)] sm:flex"
              aria-label="Open universal command search"
            >
              <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                <Search className="h-3.5 w-3.5 shrink-0 text-[var(--ink-3)]" />
                <span className="truncate whitespace-nowrap">Search cases, evidence, graph…</span>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 ml-1">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </div>
            </button>

            {/* Mobile search button */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Search"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] md:hidden"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            {/* Notifications */}
            <NotificationPanel />

            {/* Theme & Motion Controls Menu (Section 2 & 4.3) */}
            <Popover
              align="right"
              trigger={({ onClick, ref }) => (
                <button
                  ref={ref}
                  type="button"
                  onClick={onClick}
                  aria-label="Theme and Motion settings"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                  title="Theme & Motion Controls"
                >
                  <Sliders className="h-3.5 w-3.5" />
                </button>
              )}
            >
              <div className="flex flex-col gap-3 min-w-[200px]">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-3)] mb-1.5">
                    Interface Theme
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(["light", "dark", "system"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setTheme(mode)}
                        className={cn(
                          "px-2 py-1 text-[11px] font-medium rounded-md capitalize transition-colors text-center",
                          theme === mode
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[var(--line)] pt-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-3)] mb-1.5 flex items-center justify-between">
                    <span>Motion Dynamics</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(["full", "reduced", "off"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setMotion(mode)}
                        className={cn(
                          "px-2 py-1 text-[11px] font-medium rounded-md capitalize transition-colors text-center",
                          motion === mode
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[10.5px] text-[var(--ink-3)] leading-tight">
                    {motion === "reduced" && "Reduces parallax & transforms to 120ms fades."}
                    {motion === "off" && "Disables all UI animations."}
                    {motion === "full" && "Standard cinematic easing and 3D canvas."}
                  </p>
                </div>
              </div>
            </Popover>

            {/* User Avatar Menu */}
            <Dropdown
              label="Account"
              width="w-60"
              trigger={(props) => (
                <button
                  type="button"
                  {...props}
                  aria-label="Account menu"
                  className="flex items-center gap-2 rounded-lg border border-[var(--line)] py-1 pl-1.5 pr-2 transition-colors hover:bg-[var(--surface-2)]"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-[11px] font-semibold text-white">
                    {initials}
                  </span>
                  <span className="hidden min-w-0 text-left sm:block">
                    <span className="block max-w-[12ch] truncate text-[12px] font-semibold leading-tight text-[var(--ink)]">
                      {displayName}
                    </span>
                  </span>
                </button>
              )}
            >
              <div className="flex items-center gap-2.5 px-3 py-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-[12px] font-semibold text-white">
                  {initials}
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-[var(--ink)]">
                    {displayName}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--ink-3)] font-mono">
                    {displayEmail}
                  </span>
                </div>
              </div>

              <DropdownSeparator />
              <DropdownLabel>Workspace & Preferences</DropdownLabel>
              <DropdownItem href="/organizations" icon={<Building2 className="h-4 w-4" />}>
                Organizations & Team
              </DropdownItem>
              <DropdownItem href="/settings" icon={<User className="h-4 w-4" />}>
                Profile & RBAC
              </DropdownItem>
              <DropdownItem href="/settings" icon={<Settings className="h-4 w-4" />}>
                Workspace settings
              </DropdownItem>
              <DropdownItem href="/help" icon={<LifeBuoy className="h-4 w-4" />}>
                Help & runbook
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon={<LogOut className="h-4 w-4 text-[var(--danger)]" />}
                onClick={handleSignOut}
              >
                Sign out
              </DropdownItem>
            </Dropdown>
          </div>
        </div>
      </header>

      {/* Global Interactive Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
}
