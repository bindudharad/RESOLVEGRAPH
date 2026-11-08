"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  HelpCircle,
  LifeBuoy,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { breadcrumbsFor, titleFor } from "@/lib/navigation";
import { CURRENT_USER, WORKSPACE } from "@/lib/mock-data";
import { DemoBadge } from "@/components/common/demo-badge";
import { NotificationPanel } from "@/components/common/notification-panel";
import { CommandPalette } from "@/components/common/command-palette";
import { useSidebar } from "@/components/layout/sidebar-context";
import { Logo } from "@/components/layout/logo";
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { Kbd, Tooltip } from "@/components/ui/primitives";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { openMobile } = useSidebar();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { data: session } = useSession();

  const title = titleFor(pathname);
  const crumbs = breadcrumbsFor(pathname);

  const user = session?.user;
  const displayName = user?.name || CURRENT_USER.name;
  const displayEmail = user?.email || CURRENT_USER.email;
  const initials = displayName
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
      <header className="sticky top-0 z-40 border-b border-line bg-shell/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          {/* Mobile: drawer trigger + compact brand */}
          <button
            type="button"
            onClick={openMobile}
            aria-label="Open navigation menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line text-muted transition-colors hover:bg-surface-2 hover:text-fg lg:hidden"
          >
            <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>

          <Link
            href="/dashboard"
            aria-label="RESOLVEGRAPH dashboard"
            className="shrink-0 rounded-md transition-opacity hover:opacity-90 lg:hidden"
          >
            <Logo className="h-7 w-7" />
          </Link>

          {/* Page title + breadcrumb */}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="truncate text-[15px] font-semibold tracking-[-0.012em] text-fg sm:text-[16px]">
                {title}
              </h1>
              <span className="hidden xl:inline-flex">
                <DemoBadge size="xs" />
              </span>
            </div>

            <nav aria-label="Breadcrumb" className="hidden sm:block">
              <ol className="mt-0.5 flex items-center gap-1.5 text-[11.5px] leading-none text-faint">
                <li className="flex items-center gap-1.5">
                  <span className="text-subtle">{WORKSPACE.name}</span>
                </li>
                {crumbs.map((crumb, index) => (
                  <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="text-faint/70">
                      /
                    </span>
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="max-w-[16ch] truncate transition-colors hover:text-muted"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        aria-current="page"
                        className="max-w-[24ch] truncate text-muted"
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
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="hidden items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 xl:flex">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
              <span className="text-[11.5px] font-medium text-muted">
                Workspace active
              </span>
            </span>

            {/* Global Search trigger for desktop */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden h-9 w-64 items-center justify-between rounded-md border border-line bg-[#0B0F17] px-3 text-[13px] text-faint transition-all hover:border-amber-500/50 hover:text-muted md:flex lg:w-72 xl:w-80"
              aria-label="Open universal command search"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-faint" />
                <span>Search cases, evidence, actions…</span>
              </div>
              <div className="flex items-center gap-0.5">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </div>
            </button>

            {/* Search trigger for mobile */}
            <Tooltip label="Universal search" side="bottom" className="md:hidden">
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                aria-label="Search cases and navigation"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted transition-colors hover:border-line hover:bg-surface-2 hover:text-fg"
              >
                <Search className="h-[17px] w-[17px]" aria-hidden="true" />
              </button>
            </Tooltip>

            <NotificationPanel />

            <Tooltip label="Help & support" side="bottom">
              <Link
                href="/help"
                aria-label="Help and support"
                className="hidden h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted transition-colors hover:border-line hover:bg-surface-2 hover:text-fg sm:flex"
              >
                <HelpCircle className="h-[17px] w-[17px]" aria-hidden="true" />
              </Link>
            </Tooltip>

            <Dropdown
              label="Account"
              width="w-64"
              trigger={(props) => (
                <button
                  type="button"
                  {...props}
                  aria-label="Account menu"
                  className="flex items-center gap-2 rounded-md border border-transparent py-1 pl-1 pr-1.5 transition-colors hover:border-line hover:bg-surface-2 sm:gap-2.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-[11.5px] font-semibold text-amber-300">
                    {initials}
                  </span>
                  <span className="hidden min-w-0 text-left sm:block">
                    <span className="block max-w-[12ch] truncate text-[12.5px] font-medium leading-tight text-fg">
                      {displayName}
                    </span>
                    <span className="block max-w-[14ch] truncate text-[10.5px] leading-tight text-faint">
                      {WORKSPACE.name}
                    </span>
                  </span>
                </button>
              )}
            >
              <div className="flex items-center gap-3 px-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-[12px] font-semibold text-amber-300">
                  {initials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-fg">
                    {displayName}
                  </span>
                  <span className="block truncate text-[11.5px] text-faint">
                    {displayEmail}
                  </span>
                  <span className="mt-1 block text-[10.5px] uppercase tracking-[0.07em] text-subtle">
                    {user ? "AUTHENTICATED" : "DEMO USER"}
                  </span>
                </span>
              </div>

              <DropdownSeparator />
              <DropdownLabel>Workspace & Account</DropdownLabel>
              <DropdownItem href="/organizations" icon={<Building2 className="h-4 w-4" />}>
                Organizations & Team
              </DropdownItem>
              <DropdownItem href="/settings" icon={<User className="h-4 w-4" />}>
                Profile
              </DropdownItem>
              <DropdownItem href="/settings" icon={<Settings className="h-4 w-4" />}>
                Workspace settings
              </DropdownItem>
              <DropdownItem href="/help" icon={<LifeBuoy className="h-4 w-4" />}>
                Help & support
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon={<LogOut className="h-4 w-4" />}
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
