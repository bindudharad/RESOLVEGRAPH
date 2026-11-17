"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Building2,
  ChevronRight,
  LifeBuoy,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  User,
  Sliders,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { breadcrumbsFor } from "@/lib/navigation";
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
import { Kbd } from "@/components/ui/primitives";
import { Popover } from "@/components/ui/popover";
import { useSellerOnboarding } from "@/components/seller/seller-onboarding-provider";
import { cn } from "@/lib/utils";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { openMobile } = useSidebar();
  const { openWelcomeGuide } = useSellerOnboarding();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { data: session, isPending: sessionPending } = useSession();
  const { theme, setTheme, motion, setMotion } = useTheme();

  const crumbs = breadcrumbsFor(pathname);

  const user = session?.user as {
    name?: string;
    email?: string;
    role?: string;
    isPlatformAdmin?: boolean;
    organization?: string | null;
  } | undefined;
  const isPlatformAdmin = Boolean(user?.isPlatformAdmin || user?.role === "ADMIN");
  const isBuyer = Boolean(user?.role === "BUYER" && !isPlatformAdmin);
  const isMerchant = Boolean(user?.role === "MERCHANT" && !isPlatformAdmin);
  const displayName = user?.name || "Authorized User";
  const displayEmail = user?.email || "";
  const businessName = user?.organization || (isMerchant ? "Verified Seller" : WORKSPACE.name);
  const portalCrumbs = isBuyer
    ? pathname === "/overview"
      ? [{ label: "Submit Complaint" }]
      : pathname === "/cases"
      ? [{ label: "Submit Complaint", href: "/overview" }, { label: "My Complaints" }]
      : pathname.startsWith("/cases/")
      ? [
          { label: "Submit Complaint", href: "/overview" },
          { label: "My Complaints", href: "/cases" },
          { label: decodeURIComponent(pathname.split("/")[2] || "Complaint") },
        ]
      : pathname === "/settings"
      ? [{ label: "Submit Complaint", href: "/overview" }, { label: "Profile & Settings" }]
      : crumbs
    : isMerchant
    ? pathname === "/seller"
      ? [{ label: "Seller Dashboard" }]
      : pathname === "/seller/requests"
      ? [{ label: "Seller Dashboard", href: "/seller" }, { label: "Evidence Requests" }]
      : pathname.startsWith("/seller/requests/")
      ? [
          { label: "Seller Dashboard", href: "/seller" },
          { label: "Evidence Requests", href: "/seller/requests" },
          { label: "Request Details" },
        ]
      : pathname === "/seller/responses"
      ? [{ label: "Seller Dashboard", href: "/seller" }, { label: "Submitted Responses" }]
      : pathname.startsWith("/seller/responses/")
      ? [
          { label: "Seller Dashboard", href: "/seller" },
          { label: "Submitted Responses", href: "/seller/responses" },
          { label: "Response Details" },
        ]
      : pathname === "/seller/profile"
      ? [{ label: "Seller Dashboard", href: "/seller" }, { label: "Business Profile" }]
      : pathname === "/seller/guidelines"
      ? [{ label: "Seller Dashboard", href: "/seller" }, { label: "Seller Guidelines" }]
      : pathname === "/settings"
      ? [{ label: "Seller Dashboard", href: "/seller" }, { label: "Account Settings" }]
      : crumbs
    : crumbs;
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

  // Global keyboard shortcut listener for ⌘K / Ctrl+K (Platform & Admin only)
  useEffect(() => {
    if (isBuyer || isMerchant) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isBuyer, isMerchant]);

  return (
    <>
      <header className="sticky top-0 z-40 h-14 border-b border-white/[0.08] bg-[#090D13]/82 backdrop-blur-2xl transition-colors shadow-[0_2px_16px_rgba(0,0,0,0.25)]">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
          {/* Mobile: drawer trigger + compact brand */}
          <button
            type="button"
            onClick={openMobile}
            aria-label="Open navigation menu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#A7B2C2] transition-colors hover:bg-white/[0.06] hover:text-[#F5F7FA] lg:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>

          <Link
            href={isMerchant ? "/seller" : "/overview"}
            aria-label="RESOLVEGRAPH Home"
            className="shrink-0 rounded-md transition-opacity hover:opacity-90 lg:hidden"
          >
            <Logo className="h-6 w-6" />
          </Link>

          {/* Page title + breadcrumb with chevron separators */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-1.5 text-[12px] leading-none truncate">
                <li className="hidden items-center gap-1.5 text-[#748195] sm:flex shrink-0">
                  <span>{isBuyer ? "Customer Portal" : isMerchant ? businessName : WORKSPACE.name}</span>
                </li>
                {portalCrumbs.map((crumb, index) => (
                  <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5 min-w-0 shrink">
                    {index === 0 ? (
                      <ChevronRight className="hidden h-3 w-3 text-[#748195] opacity-60 sm:inline shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-[#748195] opacity-60 inline shrink-0" />
                    )}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="max-w-[14ch] sm:max-w-[20ch] truncate text-[#A7B2C2] transition-colors hover:text-[#3B82F6] font-medium"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        aria-current="page"
                        className="max-w-[16ch] sm:max-w-[28ch] truncate text-[#F5F7FA] font-semibold"
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
            {/* Global Search trigger with Ctrl/Cmd+K hint (Platform & Admin only) */}
            {!isBuyer && !isMerchant && (
              <>
                <button
                  type="button"
                  onClick={() => setCommandPaletteOpen(true)}
                  className="hidden h-8.5 w-52 md:w-56 lg:w-68 items-center justify-between rounded-xl border border-white/[0.08] bg-[#151F2B]/65 backdrop-blur-md px-3 text-[12px] text-[#748195] transition-all hover:border-[#3B82F6]/50 hover:text-[#F5F7FA] hover:bg-[#1B2634]/70 sm:flex shadow-xs"
                  aria-label="Open universal command search"
                >
                  <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                    <Search className="h-3.5 w-3.5 shrink-0 text-[#748195]" />
                    <span className="truncate whitespace-nowrap">Search cases, evidence, graph…</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 ml-1">
                    <Kbd className="bg-white/[0.08] text-[10px] text-[#A7B2C2] border border-white/[0.1] rounded px-1">⌘</Kbd>
                    <Kbd className="bg-white/[0.08] text-[10px] text-[#A7B2C2] border border-white/[0.1] rounded px-1">K</Kbd>
                  </div>
                </button>

                {/* Mobile search button */}
                <button
                  type="button"
                  onClick={() => setCommandPaletteOpen(true)}
                  aria-label="Search"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#A7B2C2] transition-colors hover:bg-white/[0.06] hover:text-[#F5F7FA] md:hidden"
                >
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </>
            )}

            {/* Help & Docs Icon */}
            <Link
              href="/help"
              title="Help & Documentation"
              aria-label="Help & Documentation"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#A7B2C2] transition-colors hover:bg-white/[0.06] hover:text-[#F5F7FA]"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
            </Link>

            {/* Notifications */}
            {!(isBuyer && pathname === "/cases") && <NotificationPanel />}

            {/* Theme & Motion Controls Menu */}
            {!isMerchant && (
              <Popover
                align="right"
                trigger={({ onClick, ref }) => (
                  <button
                    ref={ref}
                    type="button"
                    onClick={onClick}
                    aria-label="Theme and Motion settings"
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.03] text-[#A3AFBF] transition-colors hover:bg-white/[0.06] hover:text-[#F4F7FB]"
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
            )}

            {/* User Avatar Menu */}
            {!(isBuyer && pathname === "/cases") && (
              <Dropdown
                label="Account"
                width="w-60"
                trigger={(props) => (
                  <button
                    type="button"
                    {...props}
                    aria-label="Account menu"
                    className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#151F2B]/65 backdrop-blur-md py-1 pl-1.5 pr-2.5 transition-colors hover:bg-[#1B2634] hover:border-white/[0.14] shadow-xs cursor-pointer"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#3B82F6]/20 border border-[#3B82F6]/35 text-[11px] font-semibold text-[#F5F7FA]">
                      {initials}
                    </span>
                    <span className="hidden min-w-0 text-left sm:block">
                      <span className="block max-w-[14ch] truncate text-[12px] font-semibold leading-tight text-[#F5F7FA]">
                        {isMerchant ? businessName : displayName}
                      </span>
                    </span>
                  </button>
                )}
              >
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/35 text-[12px] font-semibold text-[#F5F7FA]">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-[#F5F7FA]">
                      {isMerchant ? businessName : displayName}
                    </span>
                    <span className="block truncate text-[11px] text-[#748195] font-mono">
                      {displayEmail}
                    </span>
                  </div>
                </div>

                <DropdownSeparator />
                {sessionPending ? (
                  <div className="px-3 py-2 text-xs text-[var(--ink-3)]">
                    Loading account menu...
                  </div>
                ) : isBuyer ? (
                  <>
                    <DropdownItem href="/settings" icon={<User className="h-4 w-4" />}>
                      My Profile
                    </DropdownItem>
                    <DropdownItem href="/settings" icon={<Settings className="h-4 w-4" />}>
                      Account Settings
                    </DropdownItem>
                  </>
                ) : isMerchant ? (
                  <>
                    <DropdownItem href="/seller/profile" icon={<Building2 className="h-4 w-4" />}>
                      Business Profile
                    </DropdownItem>
                    <DropdownItem
                      onClick={() => openWelcomeGuide(1)}
                      icon={<Sparkles className="h-4 w-4" />}
                    >
                      Getting Started
                    </DropdownItem>
                    <DropdownItem href="/seller/guidelines" icon={<BookOpen className="h-4 w-4" />}>
                      Seller Guidelines
                    </DropdownItem>
                    <DropdownItem href="/settings" icon={<Settings className="h-4 w-4" />}>
                      Account Settings
                    </DropdownItem>
                  </>
                ) : user ? (
                  <>
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
                  </>
                ) : null}
                <DropdownSeparator />
                <DropdownItem
                  icon={<LogOut className="h-4 w-4 text-[var(--danger)]" />}
                  onClick={handleSignOut}
                >
                  {isBuyer || isMerchant ? "Logout" : "Sign out"}
                </DropdownItem>
              </Dropdown>
            )}
          </div>
        </div>
      </header>

      {/* Global Interactive Command Palette */}
      {!isBuyer && !isMerchant && (
        <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
        />
      )}
    </>
  );
}
