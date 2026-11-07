"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "@/components/landing/motion-primitives";
import { Star, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Testimonial data                                                          */
/* -------------------------------------------------------------------------- */

interface Testimonial {
  quote: string;
  name: string;
  title: string;
  initials: string;
  accentColor: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "RESOLVEGRAPH transformed our dispute handling. Resolution time dropped 73% while customer satisfaction soared.",
    name: "Sarah Chen",
    title: "VP Operations, TechMart Global",
    initials: "SC",
    accentColor: "from-purple-500 to-indigo-500",
  },
  {
    quote:
      "The bilateral evidence graph is revolutionary. For the first time, we can see both sides of every dispute objectively.",
    name: "Marcus Rivera",
    title: "Head of Payments, ShopWave",
    initials: "MR",
    accentColor: "from-cyan-500 to-blue-500",
  },
  {
    quote:
      "Enterprise-grade security with AI intelligence. The human governance model gives us confidence in every resolution.",
    name: "Priya Patel",
    title: "Chief Risk Officer, PayStream",
    initials: "PP",
    accentColor: "from-emerald-500 to-teal-500",
  },
];

/* -------------------------------------------------------------------------- */
/*  TestimonialsSection                                                       */
/* -------------------------------------------------------------------------- */

export function TestimonialsSection() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      {/* Subtle background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(124,92,255,0.06),transparent_70%)] blur-3xl"
      />

      <div className="mx-auto max-w-6xl px-6">
        {/* Heading */}
        <FadeIn>
          <div className="text-center">
            <span className="rg-pill-badge mb-6 inline-flex">
              <Star className="h-3.5 w-3.5 text-amber-400" />
              Trusted by Leaders
            </span>
            <h2
              className={cn(
                "mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl",
                "bg-gradient-to-b from-white to-[var(--color-muted)] bg-clip-text text-transparent",
              )}
            >
              Trusted by Commerce Leaders
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--color-muted)]">
              See how industry leaders are transforming dispute resolution with
              RESOLVEGRAPH.
            </p>
          </div>
        </FadeIn>

        {/* Testimonial cards */}
        <StaggerContainer
          staggerDelay={0.12}
          className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3"
        >
          {testimonials.map((t) => (
            <StaggerItem key={t.name}>
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-2xl p-8",
                  "bg-[var(--color-surface)]/60 backdrop-blur-xl",
                  "border border-white/[0.06]",
                  "transition-all duration-400 ease-[var(--ease-out-soft)]",
                  "hover:border-[var(--color-brand)]/20 hover:bg-[var(--color-surface-2)]/80",
                  "hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_rgba(124,92,255,0.15)]",
                )}
              >
                {/* Quote icon */}
                <Quote className="h-8 w-8 text-[var(--color-brand)]/30 mb-4" />

                {/* Stars */}
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>

                {/* Quote text */}
                <p className="flex-1 text-[15px] leading-relaxed text-[var(--color-fg)] italic">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="mt-6 flex items-center gap-3 border-t border-white/[0.06] pt-6">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      "bg-gradient-to-br text-[12px] font-bold text-white",
                      t.accentColor,
                    )}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-fg)]">
                      {t.name}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {t.title}
                    </p>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
