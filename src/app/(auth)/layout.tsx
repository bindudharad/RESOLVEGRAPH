import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, Lock } from "lucide-react";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dark relative flex min-h-[100dvh] flex-col justify-between bg-[#070A12] text-[#EDEEF4] selection:bg-[var(--accent)] selection:text-white overflow-x-hidden overflow-y-auto">
      {/* Plumbline Architectural Contours & Precision Grid */}
      <div className="contours pointer-events-none fixed inset-0 opacity-25" />
      <div className="guides-dark pointer-events-none fixed inset-0 opacity-50" />

      {/* Atmospheric Ambient Radial Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-[radial-gradient(circle_at_center,rgba(67,80,229,0.18),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 right-10 h-[400px] w-[500px] rounded-full bg-[radial-gradient(circle_at_center,rgba(18,179,161,0.12),transparent_70%)] blur-3xl" />
        <div className="absolute top-1/3 left-10 h-[300px] w-[400px] rounded-full bg-[radial-gradient(circle_at_center,rgba(122,90,224,0.1),transparent_70%)] blur-3xl" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 flex h-13 sm:h-14 shrink-0 items-center justify-between border-b border-white/[0.08] px-4 sm:px-8 bg-[#070A12]/80 backdrop-blur-md">
        <Link
          href="/"
          aria-label="RESOLVEGRAPH Homepage"
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg p-1 -m-1"
        >
          <Logo className="h-7 w-7 sm:h-8 sm:w-8 transition-transform duration-200 group-hover:scale-105" />
          <div className="flex flex-col">
            <span className="text-[14px] sm:text-[15px] font-bold tracking-tight text-white leading-tight">
              RESOLVE<span className="text-[var(--accent)]">GRAPH</span>
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/50 font-mono">
              Commerce Resolution
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] text-white/70 backdrop-blur-sm">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-mono">Enterprise Tenant Isolation</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-2 sm:py-3 md:py-4 w-full">
        <div className="w-full flex items-center justify-center">{children}</div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 shrink-0 border-t border-white/[0.06] py-2.5 sm:py-3 text-center text-[10.5px] sm:text-[11px] text-white/50 bg-[#070A12]/80 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4">
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-white/40 shrink-0" />
            <span>AES-256 Encrypted Storage</span>
          </span>
          <span className="hidden sm:inline">&bull;</span>
          <span>Role-Based Access Control</span>
          <span className="hidden sm:inline">&bull;</span>
          <span>Audit-Verified Session Tokens</span>
        </div>
      </footer>
    </div>
  );
}
