"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileSpreadsheet,
  RotateCw,
  Shield,
  Clock,
} from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { CreateCaseAction } from "@/components/cases/create-case-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PersonaRole = "ADMIN" | "MANAGER" | "MERCHANT" | "BUYER";

const ROLE_FOCUS_MAP: Record<PersonaRole, { title: string; scope: string; focus: string }> = {
  ADMIN: {
    title: "Platform Administrator",
    scope: "Full Platform Scope",
    focus: "System overview, integration health, cross-provider conflicts, evidence intelligence, and emergency security controls.",
  },
  MANAGER: {
    title: "Resolution Officer",
    scope: "Dispute Adjudication Scope",
    focus: "Assigned investigations, cases requiring human dual-key authorization, unverified evidence, and bilateral settlement proposals.",
  },
  MERCHANT: {
    title: "Merchant Representative",
    scope: "TechStore Global Workspace",
    focus: "Merchant orders, payment reconciliation, customer delivery claims, evidence dispatch requests, and merchant responses.",
  },
  BUYER: {
    title: "Consumer / Buyer",
    scope: "Alex Morgan Personal Scope",
    focus: "Purchases, reported delivery discrepancies, Dual-Sight CameraX unboxing sessions, Package Passports, and resolution progress.",
  },
};

interface CommandHeaderProps {
  activeRole?: PersonaRole;
  onRoleChange?: (role: PersonaRole) => void;
}

export function CommandHeader({ activeRole = "ADMIN", onRoleChange }: CommandHeaderProps) {
  const { refreshing, refresh } = useDashboard();
  const [selectedRole, setSelectedRole] = useState<PersonaRole>(activeRole);

  const handleRoleSelect = (role: PersonaRole) => {
    setSelectedRole(role);
    onRoleChange?.(role);
  };

  const roleMeta = ROLE_FOCUS_MAP[selectedRole];

  return (
    <header className="relative flex flex-col gap-4 border-b border-[var(--line)] pb-5 pt-1">
      {/* Location Breadcrumb Badge & Top Application Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] font-mono">
        <div className="flex flex-wrap items-center gap-2 text-[var(--ink-2)]">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-semibold text-[var(--ink)] uppercase tracking-wider">
            RESOLVEGRAPH V2.0+
          </span>
          <span className="text-[var(--line-strong)]">|</span>
          <span className="text-[var(--accent)] font-semibold tracking-wide uppercase">
            HOME / COMMAND CENTER
          </span>
          <span className="text-[var(--line-strong)] hidden sm:inline">|</span>
          <span className="text-[var(--ink-2)] hidden sm:inline">
            SQLITE WAL PERSISTENT
          </span>
          <span className="text-[var(--line-strong)] hidden md:inline">|</span>
          <span className="text-[var(--ink-3)] hidden md:inline">
            ZERO AUTONOMOUS DISBURSEMENT
          </span>
        </div>

        {/* Role Persona Switcher */}
        <div className="flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/80 p-1 text-[11px] shadow-xs backdrop-blur-sm">
          <span className="px-2 font-sans font-medium text-[var(--ink-3)] hidden md:inline">
            Active Persona:
          </span>
          {(["ADMIN", "MANAGER", "MERCHANT", "BUYER"] as PersonaRole[]).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => handleRoleSelect(role)}
              className={cn(
                "rounded-lg px-2.5 py-1 font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer font-mono text-[10.5px]",
                selectedRole === role
                  ? "bg-[var(--accent)] text-white shadow-sm ring-1 ring-[var(--accent)]"
                  : "text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
              )}
            >
              {role === "ADMIN" ? "Platform Admin" : role === "MANAGER" ? "Resolution Officer" : role === "MERCHANT" ? "Merchant" : "Buyer"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Command Center Header & Primary Actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl font-display">
              Your Investigation <span className="italic font-semibold text-[var(--accent)]">Command Center</span>
            </h1>
            <Badge tone="brand" className="font-mono text-[11px] bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20">
              FINANCIAL FORENSICS
            </Badge>
          </div>
          <p className="mt-1.5 text-sm text-[var(--ink-2)] leading-relaxed">
            Every transaction. Every piece of evidence. One connected investigation. Reconcile cross-provider disputes with cryptographic integrity and statutory TAT compliance.
          </p>
        </div>

        {/* Primary Functional Action Buttons with 3D Micro-Elevation */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="md"
            onClick={refresh}
            disabled={refreshing}
            className="text-xs h-9 px-3.5 shadow-xs transition-all hover:-translate-y-0.5 active:translate-y-0"
            title="Refresh database metrics"
          >
            <RotateCw className={cn("h-3.5 w-3.5 mr-1.5", refreshing && "animate-spin")} />
            Sync
          </Button>

          <Link href="/reconciliation">
            <Button variant="outline" size="md" className="text-xs h-9 px-3.5 shadow-xs transition-all hover:-translate-y-0.5 active:translate-y-0">
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
              Explore Transactions
            </Button>
          </Link>

          <Link href="/intake">
            <Button variant="outline" size="md" className="text-xs h-9 px-3.5 shadow-xs transition-all hover:-translate-y-0.5 active:translate-y-0">
              <UploadCloud className="h-3.5 w-3.5 mr-1.5 text-teal-400" />
              Import Evidence
            </Button>
          </Link>

          <CreateCaseAction
            variant="primary"
            size="md"
            label="New Investigation"
            className="text-xs h-9 px-4 font-semibold shadow-[0_6px_20px_-4px_rgba(67,80,229,0.5)] bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white transition-all hover:-translate-y-0.5 active:translate-y-0"
          />
        </div>
      </div>

      {/* Role Context & Synchronization Telemetry Banner with Plumbline Tactical Grid */}
      <div className="relative flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/60 px-4 py-2.5 text-xs paper-dark overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
          <span className="font-semibold text-[var(--ink)]">
            {roleMeta.title} ({roleMeta.scope}):
          </span>
          <span className="truncate text-[var(--ink-2)]">
            {roleMeta.focus}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--ink-3)] shrink-0">
          <Clock className="h-3 w-3 text-emerald-400" />
          <span>Synced: Live DB · WAL Mode</span>
        </div>
      </div>
    </header>
  );
}
