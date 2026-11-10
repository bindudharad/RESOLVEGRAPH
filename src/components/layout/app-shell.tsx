"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { Topbar } from "@/components/layout/topbar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { ToastProvider } from "@/components/common/toast";
import { CasesProvider } from "@/hooks/use-demo-cases";

/**
 * Workspace chrome (Section 4):
 * - Fixed/rail desktop sidebar (264px / 68px)
 * - 56px Topbar with breadcrumbs & global command palette trigger
 * - 1440px max fluid content area with 24px rhythm
 * - Mobile bottom tab bar & drawer navigation
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <CasesProvider>
        <ToastProvider>
          <a
            href="#main-content"
            className="sr-only z-200 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Skip to content
          </a>

          <div className="flex min-h-screen w-full bg-[var(--bg)] text-[var(--ink)]">
            <AppSidebar />

            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar />
              <main id="main-content" className="min-w-0 flex-1 pb-16 lg:pb-6">
                <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
                  {children}
                </div>
              </main>
            </div>

            <MobileNavigation />
          </div>
        </ToastProvider>
      </CasesProvider>
    </SidebarProvider>
  );
}
