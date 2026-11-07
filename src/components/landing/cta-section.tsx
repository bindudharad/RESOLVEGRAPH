"use client";

import { motion } from "framer-motion";
import { FadeIn } from "@/components/landing/motion-primitives";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useId } from "react";

/* ---------------------------------------------------------------------------
   Floating particle field
   --------------------------------------------------------------------------- */

interface Particle {
  x: string;
  y: string;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

const particles: Particle[] = Array.from({ length: 28 }, (_, i) => ({
  x: `${(i * 37 + 13) % 100}%`,
  y: `${(i * 53 + 7) % 100}%`,
  size: 2 + (i % 4),
  delay: (i * 0.4) % 6,
  duration: 4 + (i % 5) * 1.2,
  opacity: 0.15 + (i % 3) * 0.1,
}));

function ParticleField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [p.opacity, p.opacity * 2.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   CTASection
   --------------------------------------------------------------------------- */

export function CTASection() {
  const gradientId = useId();

  return (
    <section className="relative isolate overflow-hidden py-32 sm:py-40">
      {/* ── Animated gradient background ── */}
      <motion.div
        className="absolute inset-0 -z-20"
        animate={{
          background: [
            "linear-gradient(135deg, #7c5cff 0%, #4f46e5 30%, #38bdf8 70%, #06b6d4 100%)",
            "linear-gradient(135deg, #6d4df7 0%, #7c5cff 30%, #06b6d4 70%, #38bdf8 100%)",
            "linear-gradient(135deg, #4f46e5 0%, #38bdf8 30%, #7c5cff 70%, #06b6d4 100%)",
            "linear-gradient(135deg, #7c5cff 0%, #4f46e5 30%, #38bdf8 70%, #06b6d4 100%)",
          ],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* ── Dark overlay for contrast ── */}
      <div className="absolute inset-0 -z-10 bg-black/30" />

      {/* ── Gradient blob behind content ── */}
      <motion.div
        className="absolute left-1/2 top-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[120px]"
        animate={{
          scale: [1, 1.2, 1],
          background: [
            "radial-gradient(circle, rgba(160,139,255,0.6) 0%, transparent 70%)",
            "radial-gradient(circle, rgba(56,189,248,0.6) 0%, transparent 70%)",
            "radial-gradient(circle, rgba(160,139,255,0.6) 0%, transparent 70%)",
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* ── Particle field ── */}
      <ParticleField />

      {/* ── Content ── */}
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <FadeIn>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            Start resolving smarter today
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Ready to Transform Your{" "}
            <span className="relative">
              Resolution Process?
              {/* Underline glow */}
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 300 12"
                fill="none"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id={gradientId}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop offset="0%" stopColor="#a08bff" stopOpacity="0" />
                    <stop offset="30%" stopColor="#a08bff" />
                    <stop offset="70%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 6 Q 75 0, 150 6 Q 225 12, 300 6"
                  stroke={`url(#${gradientId})`}
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </span>
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
            Join the next generation of fair, AI-powered commerce resolution.
          </p>
        </FadeIn>

        <FadeIn delay={0.35}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {/* Primary CTA */}
            <Link
              href="/sign-up"
              className={cn(
                "group relative inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-3.5",
                "text-base font-semibold text-[var(--color-app)]",
                "shadow-lg shadow-white/10 transition-all duration-300",
                "hover:shadow-xl hover:shadow-white/20 hover:scale-[1.03]",
              )}
            >
              {/* Hover glow ring */}
              <span className="pointer-events-none absolute inset-0 rounded-full bg-white opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-50" />
              <span className="relative z-10 flex items-center gap-2.5">
                Start Free Trial
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </Link>

            {/* Secondary CTA */}
            <Link
              href="/demo"
              className={cn(
                "group relative inline-flex items-center gap-2.5 rounded-full px-8 py-3.5",
                "text-base font-semibold text-white",
                "border border-white/30 transition-all duration-300",
                "hover:bg-white/10 hover:border-white/50",
              )}
            >
              Schedule Demo
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
