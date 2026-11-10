import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

export function CTASection() {
  return <section className="border-b border-[var(--line)] bg-[var(--payment)] py-24 text-white sm:py-32"><div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-12 lg:items-end lg:px-8"><div className="lg:col-span-8"><p className="font-mono text-xs text-white/55">Resolution workspace</p><h2 className="mt-5 max-w-3xl text-3xl font-normal leading-tight tracking-tight sm:text-5xl">See the decision and every record that supports it</h2></div><div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end"><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-medium text-[var(--payment)] transition-colors hover:bg-white/90">Open workspace <ArrowRight className="h-4 w-4" /></Link><Link href="/demo" className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"><Play className="h-4 w-4" /> Guided demo</Link></div></div></section>;
}
