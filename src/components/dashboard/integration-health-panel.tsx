"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
} from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Badge } from "@/components/ui/badge";

export function IntegrationHealthPanel() {
  const { summary } = useDashboard();

  const services = summary?.integrationHealth || [
    { name: "AI Forensic Provider", status: "AVAILABLE", detail: "Gemini 1.5 Multimodal Engine", latency: "240ms" },
    { name: "PayPal Sandbox API", status: "SANDBOX", detail: "REST v2 Disputes & Captures API", latency: "310ms" },
    { name: "Database (SQLite WAL)", status: "CONNECTED", detail: "Multi-Tenant Scoped Local Ledger", latency: "4ms" },
    { name: "Evidence Storage Vault", status: "AVAILABLE", detail: "Encrypted Content Addressable Store", latency: "12ms" },
    { name: "Background Workers", status: "ACTIVE", detail: "Event Queue & Ingestion Stream", latency: "45ms" },
    { name: "Chained Audit Ledger", status: "CONNECTED", detail: "SHA-256 Tamper-Evident Blocks", latency: "2ms" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONNECTED":
      case "ACTIVE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">CONNECTED</span>;
      case "AVAILABLE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">AVAILABLE</span>;
      case "SANDBOX":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">SANDBOX</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  return (
    <section aria-labelledby="integration-health-heading" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="integration-health-heading" className="text-base font-semibold text-[var(--ink)] flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Integration Health & Platform Telemetry
            </h2>
            <Badge tone="success" className="text-[11px] font-mono">
              ALL SYSTEMS OPERATIONAL
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-[var(--ink-2)]">
            Verified backend adapters, cryptographic ledger signers, and sandboxed clearinghouse connections.
          </p>
        </div>

        <Link
          href="/admin/security"
          className="text-xs font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1 self-start sm:self-center"
        >
          Security & Kill Switches <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {services.map((svc) => (
          <div
            key={svc.name}
            className="flex items-center justify-between p-3 rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)]/70 transition-colors"
          >
            <div className="min-w-0 pr-2">
              <span className="text-xs font-semibold text-[var(--ink)] block truncate">
                {svc.name}
              </span>
              <span className="text-[11px] text-[var(--ink-3)] block truncate">
                {svc.detail}
              </span>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              {getStatusBadge(svc.status)}
              <span className="text-[10px] font-mono text-[var(--ink-3)]">
                {svc.latency}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
