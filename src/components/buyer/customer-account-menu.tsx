"use client";

import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown";

export function CustomerAccountMenu({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as { name?: string; email?: string } | undefined;

  const displayName = user?.name || "Customer";
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
    } catch {
      router.push("/sign-in");
    }
  };

  return (
    <Dropdown
      label="Customer Account Menu"
      width="w-56"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label="Customer profile menu"
          className="flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 text-[var(--ink)] transition-colors hover:bg-[var(--surface-2)]"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-semibold text-white">
            {initials}
          </span>
          {!compact && (
            <span className="hidden max-w-[11ch] truncate text-[12.5px] font-medium sm:inline">
              {displayName}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-[var(--ink-3)]" />
        </button>
      )}
    >
      <div className="flex items-center gap-2.5 px-3 py-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[12px] font-semibold text-white">
          {initials}
        </span>
        <div className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-[var(--ink)]">
            {displayName}
          </span>
          {displayEmail && (
            <span className="block truncate text-[11px] text-[var(--ink-3)]">
              {displayEmail}
            </span>
          )}
        </div>
      </div>

      <DropdownSeparator />

      <DropdownItem href="/settings" icon={<User className="h-4 w-4" />}>
        My Profile
      </DropdownItem>
      <DropdownItem href="/settings" icon={<Settings className="h-4 w-4" />}>
        Account Settings
      </DropdownItem>

      <DropdownSeparator />

      <DropdownItem
        icon={<LogOut className="h-4 w-4 text-[var(--danger)]" />}
        onClick={handleSignOut}
      >
        Logout
      </DropdownItem>
    </Dropdown>
  );
}
