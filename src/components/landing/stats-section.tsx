import { CheckCircle2, FileSearch, Layers, ShieldCheck } from "lucide-react";

const metrics = [["321 / 321", "Automated checks passing", CheckCircle2], ["400 cases", "RECOURSE-BENCH evaluation set", FileSearch], ["10 tiers", "Deterministic matching hierarchy", Layers], ["12 stages", "Root-cause diagnostic path", ShieldCheck]] as const;

export function StatsSection() {
  return <section className="border-b border-[var(--line)] bg-[var(--surface)] py-16 sm:py-20"><div className="mx-auto max-w-7xl px-6 lg:px-8"><div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([value, label, Icon]) => <div key={label} className="bg-[var(--surface)] p-6 sm:p-7"><Icon className="h-4 w-4 text-[var(--ink-3)]" /><div className="mt-8 font-mono text-2xl font-medium tabular-nums text-[var(--ink)]">{value}</div><p className="mt-2 text-sm leading-5 text-[var(--ink-2)]">{label}</p></div>)}</div></div></section>;
}
