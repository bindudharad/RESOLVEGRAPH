import Link from "next/link";
import { ArrowRight } from "lucide-react";

const stages = ["Receive independent records", "Normalize identity, time, and amount", "Match and expose contradictions", "Diagnose the failed handoff", "Prepare a human-approved remedy"];

export function HowItWorksSection() {
  return <section className="border-b border-[var(--line)] bg-[var(--surface)] py-24 sm:py-32"><div className="mx-auto max-w-7xl px-6 lg:px-8"><div className="max-w-2xl"><p className="font-mono text-xs text-[var(--ink-3)]">Investigation lifecycle</p><h2 className="mt-4 text-3xl font-normal tracking-tight text-[var(--ink)] sm:text-4xl">From conflicting records to an explainable remedy</h2></div><ol className="mt-14 grid gap-0 border-t border-[var(--line)] md:grid-cols-5">{stages.map((stage, index) => <li key={stage} className="border-b border-[var(--line)] py-6 md:border-b-0 md:border-r md:px-5 md:first:pl-0 md:last:border-r-0"><span className="font-mono text-xs text-[var(--ink-3)]">0{index + 1}</span><p className="mt-8 text-sm font-medium leading-6 text-[var(--ink)]">{stage}</p></li>)}</ol><div className="mt-10 flex items-center justify-between border-t border-[var(--line)] pt-6"><p className="text-sm text-[var(--ink-2)]">The system proposes; an authorized operator decides</p><Link href="/reconciliation" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] transition-colors hover:text-[var(--ink)]">Open reconciliation <ArrowRight className="h-4 w-4" /></Link></div></div></section>;
}
