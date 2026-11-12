"use client";

import { motion } from "framer-motion";

const MARQUEE_ITEMS = [
  "BILATERAL EVIDENCE GRAPH",
  "BERR v2 REASONING MATRIX",
  "ZERO-BYPASS FINANCIAL GOVERNANCE",
  "SHA-256 PROVENANCE LEDGER",
  "CROSS-MARKETPLACE INGESTION (AMAZON · FLIPKART · DIRECT)",
  "HUMAN DUAL-KEY AUTHORIZATION",
  "SOURCE-LINKED CITATIONS",
  "OBJECTIVE UNCERTAINTY SCORING",
];

export function MarketingMarquee() {
  return (
    <div className="relative overflow-hidden border-y border-[var(--line,#D9DED7)] bg-[var(--surface,#FFFEFA)] py-4 select-none">
      {/* Ambient Hairline Gradient */}
      <div className="pointer-events-none absolute left-0 inset-y-0 w-24 bg-gradient-to-r from-[var(--surface,#FFFEFA)] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 inset-y-0 w-24 bg-gradient-to-l from-[var(--surface,#FFFEFA)] to-transparent z-10" />

      <div className="flex w-max items-center">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            duration: 32,
            repeat: Infinity,
            ease: "linear",
          }}
          className="flex items-center gap-10 pr-10 whitespace-nowrap"
        >
          {/* Double items for seamless loop */}
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, index) => (
            <div key={index} className="inline-flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent,#4350E5)] shadow-[0_0_6px_var(--accent,#4350E5)]" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink-2,#414B52)] hover:text-[var(--ink,#15191C)] transition-colors">
                {item}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
