import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, Lock } from "lucide-react";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dark relative flex min-h-screen flex-col bg-[#070A12] text-[#EDEEF4] selection:bg-[var(--accent)] selection:text-white overflow-hidden">
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
      <header className="relative z-10 flex h-16 items-center justify-between border-b border-white/[0.08] px-6 sm:px-10 bg-[#070A12]/80 backdrop-blur-md">
        <Link
          href="/overview"
          aria-label="RESOLVEGRAPH Platform Overview"
          className="group flex items-center gap-3 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg p-1 -m-1"
        >
          <Logo className="h-8 w-8 transition-transform duration-200 group-hover:scale-105" />
          <div className="flex flex-col">
            <span className="text-[15px] font-bold tracking-tight text-white">
              RESOLVE<span className="text-[var(--accent)]">GRAPH</span>
            </span>
            <span className="text-[10px] uppercase tracking-wider text-white/50 font-mono">
              Commerce Resolution
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-[11.5px] text-white/70 backdrop-blur-sm">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-mono">Enterprise Tenant Isolation</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-lg">{children}</div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-4 text-center text-[11px] text-white/50 bg-[#070A12]/80 backdrop-blur-md">
        <div className="flex items-center justify-center gap-4">
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-white/40" />
            <span>FIPS 140-2 Compliant Storage</span>
          </span>
          <span>&bull;</span>
          <span>Role-Based Access Control</span>
          <span>&bull;</span>
          <span>Audit-Verified Session Tokens</span>
        </div>
      </footer>
    </div>
  );
}
