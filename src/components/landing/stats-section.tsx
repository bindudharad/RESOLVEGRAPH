"use client";

import { CountUp, FadeIn } from "@/components/landing/motion-primitives";
import { cn } from "@/lib/utils";

interface Stat {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
}

const stats: Stat[] = [
  { value: 300, suffix: "+", label: "Cases Benchmarked" },
  { value: 89.3, suffix: "%", label: "Accuracy Rate" },
  { value: 891, suffix: "ms", label: "Resolution Time" },
  { value: 14, label: "AI Processing Stages" },
];

export function StatsSection() {
  return (
    <section className="relative overflow-hidden border-y border-white/5">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-app)] via-[var(--color-surface)] to-[var(--color-app)]" />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 rg-grid-bg opacity-30" />

      {/* Subtle top/bottom glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-brand)]/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--color-brand)]/20 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <FadeIn>
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4 lg:gap-0">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={cn(
                  "flex flex-col items-center text-center",
                  /* Divider lines between stats (desktop only) */
                  i < stats.length - 1 &&
                    "lg:border-r lg:border-[var(--color-line)]",
                )}
              >
                <span className="rg-tabular text-4xl font-bold tracking-tight text-[var(--color-fg)] sm:text-5xl">
                  <CountUp
                    end={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    duration={2.2}
                  />
                </span>
                <span className="mt-2 text-sm font-medium text-[var(--color-muted)]">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
