"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { Topbar } from "@/components/layout/topbar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { ToastProvider } from "@/components/common/toast";
import { CasesProvider } from "@/hooks/use-demo-cases";

/**
 * Workspace chrome. Kept as a client component because the sidebar rail,
 * drawer and top bar all respond to local UI state; page content passed as
 * `children` keeps rendering on the server.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <CasesProvider>
      <ToastProvider>
        <a
          href="#main-content"
          className="sr-only z-200 rounded-md bg-[var(--color-brand-solid)] px-4 py-2.5 text-[13px] font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>

        <div className="flex min-h-screen w-full bg-app">
          <AppSidebar />

          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main id="main-content" className="min-w-0 flex-1">
              <div className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
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
