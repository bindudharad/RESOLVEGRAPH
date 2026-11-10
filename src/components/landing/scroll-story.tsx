"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const chapters = [
  ["Purchase record", "The order, payment reference, and stated product terms enter the case file."],
  ["Buyer evidence", "Receipts and delivery evidence are stored separately from merchant records."],
  ["Contradiction", "The system marks the exact fields that cannot both be true."],
  ["Evidence graph", "Connected records make provenance and missing handoffs visible."],
  ["Consensus", "Verified facts and unresolved points are separated before a remedy is proposed."],
  ["Authorized remedy", "A human operator approves the outcome with the full trail preserved."],
] as const;

export function ScrollStorySection() {
  const [active, setActive] = useState(0); const [title, summary] = chapters[active];
  return <section className="border-b border-[var(--line)] bg-[var(--surface-2)] py-24 sm:py-32"><div className="mx-auto max-w-7xl px-6 lg:px-8"><div className="max-w-2xl"><p className="font-mono text-xs text-[var(--ink-3)]">Case walkthrough</p><h2 className="mt-4 text-3xl font-normal tracking-tight text-[var(--ink)] sm:text-4xl">A dispute becomes a structured case, one record at a time</h2></div><div className="mt-12 grid gap-8 lg:grid-cols-12"><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:col-span-5 lg:grid-cols-1">{chapters.map(([name], index) => <button key={name} onClick={() => setActive(index)} className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${active === index ? "border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)]" : "border-transparent text-[var(--ink-2)] hover:bg-[var(--surface)]"}`}><span className="mr-3 font-mono text-xs text-[var(--ink-3)]">0{index + 1}</span>{name}</button>)}</div><div className="rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] p-6 sm:p-8 lg:col-span-7"><p className="font-mono text-xs text-[var(--ink-3)]">Stage 0{active + 1} of 06</p><h3 className="mt-12 text-2xl font-normal text-[var(--ink)]">{title}</h3><p className="mt-4 max-w-lg text-sm leading-7 text-[var(--ink-2)]">{summary}</p><div className="mt-16 flex gap-2"><button disabled={active === 0} onClick={() => setActive(active - 1)} className="rounded-lg border border-[var(--line)] p-2 text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-35" aria-label="Previous chapter"><ChevronLeft className="h-4 w-4" /></button><button disabled={active === chapters.length - 1} onClick={() => setActive(active + 1)} className="rounded-lg border border-[var(--line)] p-2 text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-35" aria-label="Next chapter"><ChevronRight className="h-4 w-4" /></button></div></div></div></div></section>;
}
