import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Application shell for every workspace route.
 * Server component: page content below stays server-rendered while the chrome
 * (sidebar, drawer, top bar) handles its own local UI state.
 */
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
