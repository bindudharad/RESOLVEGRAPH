"use client";

import { Cpu, Layers, CheckCircle2, FileSearch } from "lucide-react";

export function StatsSection() {
  const metrics = [
    {
      label: "Automated Test Coverage",
      value: "321 / 321",
      detail: "61 test suites passing (100% pass rate)",
      icon: CheckCircle2,
    },
    {
      label: "RECOURSE-BENCH Dataset",
      value: "400 Cases",
      detail: "Empirical evaluation across 20 categories",
      icon: Cpu,
    },
    {
      label: "Matching Hierarchy",
      value: "10 Tiers",
      detail: "Deterministic rules with natural language reason",
      icon: Layers,
    },
    {
      label: "Diagnostic Pipeline",
      value: "12 Stages",
      detail: "Isolates acquirer, gateway, or ERP failure",
      icon: FileSearch,
    },
  ];

  return (
    <section className="relative py-16 border-b border-[var(--color-line)] bg-[var(--color-shell)]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="p-5 rounded-lg border border-[var(--color-line)] bg-[var(--color-app)] space-y-2"
              >
                <div className="flex items-center justify-between text-[var(--color-subtle)]">
                  <span className="text-xs font-mono uppercase tracking-wider">{m.label}</span>
                  <Icon className="h-4 w-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-fg)] font-mono">
                  {m.value}
                </div>
                <div className="text-xs text-[var(--color-muted)] font-normal">
                  {m.detail}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
