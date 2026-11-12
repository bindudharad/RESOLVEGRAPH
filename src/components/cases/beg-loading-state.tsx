"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Network, FileText, Store, User, Sparkles, ShieldCheck } from "lucide-react";

const STAGES = [
  "Retrieving persisted nodes & bilateral edges...",
  "Linking buyer claims to courier delivery events...",
  "Correlating seller dispatch & serial telemetry...",
  "Calculating provenance & contradiction vectors...",
  "Finalizing Bilateral Evidence Graph layout...",
];

export function BegLoadingState({ className }: { className?: string }) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % STAGES.length);
    }, 700);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`relative min-h-[460px] w-full overflow-hidden rounded-2xl border border-[var(--line,#D9DED7)] bg-[var(--surface,#FFFEFA)] p-8 flex flex-col items-center justify-center text-center shadow-xs ${
        className || ""
      }`}
    >
      {/* Background Subtle Guides Grid */}
      <div className="guides pointer-events-none absolute inset-0 opacity-25" />

      <div className="relative z-10 max-w-lg w-full flex flex-col items-center">
        {/* Animated Bilateral Network Diagram */}
        <div className="relative w-72 h-44 mb-6">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 288 176" fill="none">
            {/* Connection Curves */}
            <motion.path
              d="M 50 88 C 100 40, 140 40, 144 88"
              stroke="var(--buyer, #4D92CC)"
              strokeWidth="2"
              strokeDasharray="4 4"
              initial={{ pathOffset: 0 }}
              animate={{ pathOffset: 1 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <motion.path
              d="M 238 88 C 188 40, 148 40, 144 88"
              stroke="var(--merchant, #278B79)"
              strokeWidth="2"
              strokeDasharray="4 4"
              initial={{ pathOffset: 0 }}
              animate={{ pathOffset: -1 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <motion.path
              d="M 144 88 L 144 148"
              stroke="var(--ai, #8B72C9)"
              strokeWidth="2"
              strokeDasharray="4 4"
              initial={{ pathOffset: 0 }}
              animate={{ pathOffset: 1 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />

            {/* Traveling Glow Pulse */}
            <motion.circle
              cx="50"
              cy="88"
              r="4"
              fill="var(--buyer, #4D92CC)"
              animate={{
                cx: [50, 100, 144],
                cy: [88, 48, 88],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.circle
              cx="238"
              cy="88"
              r="4"
              fill="var(--merchant, #278B79)"
              animate={{
                cx: [238, 188, 144],
                cy: [88, 48, 88],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
          </svg>

          {/* Node 1: Buyer Node (Left) */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: [0.95, 1.05, 0.95], opacity: 1 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
          >
            <div className="h-10 w-10 rounded-xl bg-[var(--buyer,#4D92CC)]/15 border border-[var(--buyer,#4D92CC)]/40 flex items-center justify-center shadow-xs">
              <User className="h-5 w-5 text-[var(--buyer,#4D92CC)]" />
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-2,#414B52)] font-semibold">
              Buyer Claim
            </span>
          </motion.div>

          {/* Node 2: Central Convergence Hub */}
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10"
          >
            <div className="h-12 w-12 rounded-2xl bg-[var(--surface,#FFFEFA)] border-2 border-[var(--accent,#4350E5)] flex items-center justify-center shadow-md">
              <Network className="h-6 w-6 text-[var(--accent,#4350E5)] animate-pulse" />
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink,#15191C)] font-bold">
              BEG Hub
            </span>
          </motion.div>

          {/* Node 3: Seller Node (Right) */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: [0.95, 1.05, 0.95], opacity: 1 }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
          >
            <div className="h-10 w-10 rounded-xl bg-[var(--merchant,#278B79)]/15 border border-[var(--merchant,#278B79)]/40 flex items-center justify-center shadow-xs">
              <Store className="h-5 w-5 text-[var(--merchant,#278B79)]" />
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-2,#414B52)] font-semibold">
              Seller Record
            </span>
          </motion.div>

          {/* Node 4: Provenance Ledger (Bottom) */}
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 flex flex-col items-center gap-0.5">
            <div className="h-8 w-8 rounded-lg bg-[var(--ai,#8B72C9)]/15 border border-[var(--ai,#8B72C9)]/40 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-[var(--ai,#8B72C9)]" />
            </div>
            <span className="font-mono text-[8px] uppercase tracking-wider text-[var(--ink-3,#718078)]">
              SHA-256 Vector
            </span>
          </div>
        </div>

        {/* Heading & Live Stage */}
        <h3 className="font-heading text-base font-semibold text-[var(--ink,#15191C)]">
          Reconstructing Bilateral Evidence Graph
        </h3>

        <div className="mt-2 h-6 flex items-center justify-center">
          <motion.p
            key={stageIndex}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="font-mono text-xs text-[var(--accent,#4350E5)] font-medium"
          >
            {STAGES[stageIndex]}
          </motion.p>
        </div>

        {/* Indeterminate Sub-Line */}
        <div className="mt-4 w-56 h-1 rounded-full bg-[var(--line,#D9DED7)] overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[var(--buyer,#4D92CC)] via-[var(--accent,#4350E5)] to-[var(--merchant,#278B79)]"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ width: "50%" }}
          />
        </div>

        {/* Telemetry pill */}
        <p className="mt-4 font-mono text-[10px] text-[var(--ink-3,#718078)]">
          BEG ENGINE v2.4 · 100% PERSISTED GRAPH INTEGRITY
        </p>
      </div>
    </div>
  );
}
