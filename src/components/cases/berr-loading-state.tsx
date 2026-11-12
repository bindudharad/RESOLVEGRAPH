"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Brain, CheckCircle2, AlertTriangle, HelpCircle, ShieldCheck } from "lucide-react";

const BERR_STAGES = [
  { label: "Reviewing submitted evidence", detail: "Hashing invoices, dispatch slips, and inspection media" },
  { label: "Comparing buyer and seller statements", detail: "Extracting claimed defect vs seller testing logs" },
  { label: "Identifying agreed information", detail: "Corroborating purchase amount, order timestamps, and serial tags" },
  { label: "Checking contested information", detail: "Isolating delivery condition discrepancy and missing accessories" },
  { label: "Identifying missing information", detail: "Flagging unboxing video or seller RMA verification gaps" },
  { label: "Preparing the assessment", detail: "Formulating policy-grounded remedy proposal" },
];

export function BerrLoadingState({ className }: { className?: string }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % BERR_STAGES.length);
    }, 850);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`relative min-h-[460px] w-full overflow-hidden rounded-2xl border border-[var(--ai,#8B72C9)]/30 bg-[var(--surface,#FFFEFA)] p-8 flex flex-col items-center justify-center text-center shadow-md ${
        className || ""
      }`}
    >
      {/* Ambient Violet Glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-56 w-96 rounded-full bg-[radial-gradient(circle_at_center,rgba(139,114,201,0.18),transparent_70%)] blur-2xl" />

      <div className="relative z-10 max-w-lg w-full flex flex-col items-center">
        {/* Core AI Violet Icon with Dual Rings */}
        <div className="relative flex h-16 w-16 items-center justify-center mb-5">
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-[var(--ai,#8B72C9)]/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-1.5 rounded-xl border border-[var(--accent,#4350E5)]/30"
            animate={{ rotate: -360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <div className="h-10 w-10 rounded-xl bg-[var(--ai,#8B72C9)]/15 flex items-center justify-center shadow-xs">
            <Brain className="h-5 w-5 text-[var(--ai,#8B72C9)] animate-pulse" />
          </div>
        </div>

        {/* Heading */}
        <h3 className="font-heading text-lg font-semibold text-[var(--ink,#15191C)] flex items-center gap-2">
          <span>BERR v2 Mathematical Reasoning Engine</span>
          <span className="rounded-full bg-[var(--ai,#8B72C9)]/15 px-2 py-0.5 font-mono text-[10px] text-[var(--ai,#8B72C9)] font-semibold">
            ACTIVE
          </span>
        </h3>

        {/* Current Stage Headline */}
        <div className="mt-3 min-h-[48px] flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="space-y-0.5"
            >
              <p className="font-semibold text-sm text-[var(--ink,#15191C)]">
                Stage {currentStep + 1} of 6: {BERR_STAGES[currentStep].label}
              </p>
              <p className="text-xs text-[var(--ink-2,#414B52)] font-mono">
                {BERR_STAGES[currentStep].detail}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 6 Step Progress Indicators */}
        <div className="mt-6 flex items-center gap-1.5 w-full max-w-xs">
          {BERR_STAGES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < currentStep
                  ? "bg-[var(--agreed,#2E8A62)]"
                  : i === currentStep
                  ? "bg-[var(--ai,#8B72C9)] shadow-[0_0_8px_var(--ai,#8B72C9)]"
                  : "bg-[var(--line,#D9DED7)]"
              }`}
            />
          ))}
        </div>

        {/* Fact Classification Matrix Preview Chips */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--agreed,#2E8A62)]/10 text-[var(--agreed,#2E8A62)] border border-[var(--agreed,#2E8A62)]/30">
            <CheckCircle2 className="h-3 w-3" />
            AGREED
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--buyer,#4D92CC)]/10 text-[var(--buyer,#4D92CC)] border border-[var(--buyer,#4D92CC)]/30">
            <ShieldCheck className="h-3 w-3" />
            VERIFIED
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--contested,#CA8B2B)]/10 text-[var(--contested,#CA8B2B)] border border-[var(--contested,#CA8B2B)]/30">
            <AlertTriangle className="h-3 w-3" />
            CONTESTED
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--missing,#718078)]/10 text-[var(--missing,#718078)] border border-[var(--missing,#718078)]/30">
            <HelpCircle className="h-3 w-3" />
            MISSING
          </span>
        </div>

        {/* Audit Guarantee */}
        <p className="mt-5 font-mono text-[10px] text-[var(--ink-3,#718078)]">
          DETERMINISTIC EVALUATION · SOURCE-LINKED CITATIONS · NO HALLUCINATIONS
        </p>
      </div>
    </div>
  );
}
