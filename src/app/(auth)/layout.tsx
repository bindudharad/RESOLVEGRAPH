import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, Lock } from "lucide-react";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#030712] text-fg selection:bg-[var(--color-brand)] selection:text-white">
      {/* Background ambient gradients — richer mesh */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-[radial-gradient(circle_at_center,rgba(124,92,255,0.14),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 right-10 h-[400px] w-[500px] rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08),transparent_70%)] blur-3xl" />
        <div className="absolute top-1/3 left-10 h-[300px] w-[400px] rounded-full bg-[radial-gradient(circle_at_center,rgba(124,92,255,0.06),transparent_70%)] blur-3xl" />
        {/* Subtle grid */}
        <div className="absolute inset-0 rg-landing-grid opacity-40" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 flex h-16 items-center justify-between border-b border-white/[0.06] px-6 sm:px-10 backdrop-blur-sm">
        <Link
          href="/"
          className="flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <Logo className="h-8 w-8" />
          <div className="flex flex-col">
            <span className="text-[15px] font-bold tracking-tight text-fg">
              RESOLVE<span className="text-[var(--color-brand)]">GRAPH</span>
            </span>
            <span className="text-[10px] uppercase tracking-wider text-faint">
              Commerce Resolution
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11.5px] text-muted backdrop-blur-sm">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Enterprise Tenant Isolation</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] py-4 text-center text-[11px] text-faint">
        <div className="flex items-center justify-center gap-4">
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-faint" />
            <span>FIPS 140-2 Compliant Storage</span>
          </span>
          <span>•</span>
          <span>Role-Based Access Control</span>
          <span>•</span>
          <span>Audit-Verified Session Tokens</span>
        </div>
      </footer>
    </div>
  );
}
