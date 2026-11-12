"use client";

import { useEffect, useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/layout/logo";

const STATUS_MESSAGES = [
  "CONNECTING THE EVIDENCE",
  "PREPARING YOUR WORKSPACE",
  "BRINGING BOTH SIDES TOGETHER",
];

export function BrandLoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(15);
  const titleId = useId();

  useEffect(() => {
    // Check if user already saw the loader in this session to prevent repeated delay
    const hasSeen = sessionStorage.getItem("rg_initial_loaded");
    if (hasSeen) {
      setVisible(false);
      return;
    }

    // Message rotation ticker
    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 450);

    // Progress line ramp
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + 18;
      });
    }, 120);

    // Auto-dismiss cleanly after swift initial mount
    const timer = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        sessionStorage.setItem("rg_initial_loaded", "true");
      }, 240);
    }, 950);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-labelledby={titleId}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#11191A] text-[#F4F1E8] select-none pointer-events-auto"
        >
          {/* Subtle architectural contours background */}
          <div className="contours pointer-events-none absolute inset-0 opacity-15" />

          {/* Top Thin Loading Progress Bar */}
          <div className="fixed top-0 left-0 right-0 h-[2px] bg-white/10 z-[10000]">
            <motion.div
              className="h-full bg-gradient-to-r from-[var(--buyer,#4D92CC)] via-[var(--accent,#4350E5)] to-[var(--merchant,#278B79)]"
              style={{ width: `${progress}%` }}
              transition={{ ease: "easeOut", duration: 0.2 }}
            />
          </div>

          <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center">
            {/* Bilateral Convergence Visual */}
            <div className="relative flex items-center justify-center w-64 h-24 mb-6">
              {/* Left Convergence Thread (Buyer Blue) */}
              <motion.div
                initial={{ x: -80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center"
              >
                <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-[var(--buyer,#4D92CC)] to-[var(--buyer,#4D92CC)]" />
                <span className="w-2 h-2 rounded-full bg-[var(--buyer,#4D92CC)] shadow-[0_0_8px_var(--buyer,#4D92CC)]" />
              </motion.div>

              {/* Central Convergence Logo */}
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="relative z-10 p-3 rounded-2xl bg-[#182223] border border-[#2A3636] shadow-2xl"
              >
                <Logo className="w-9 h-9" />
              </motion.div>

              {/* Right Convergence Thread (Seller Teal) */}
              <motion.div
                initial={{ x: 80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center"
              >
                <span className="w-2 h-2 rounded-full bg-[var(--merchant,#278B79)] shadow-[0_0_8px_var(--merchant,#278B79)]" />
                <div className="w-16 h-[2px] bg-gradient-to-l from-transparent via-[var(--merchant,#278B79)] to-[var(--merchant,#278B79)]" />
              </motion.div>
            </div>

            {/* Brand Title */}
            <h2 className="font-heading text-lg font-bold tracking-tight text-white mb-2">
              RESOLVEGRAPH
            </h2>

            {/* Rotating Status Stage */}
            <div className="h-6 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={messageIndex}
                  id={titleId}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="font-mono text-[10.5px] uppercase tracking-widest text-[#A6B0AC]"
                >
                  {STATUS_MESSAGES[messageIndex]}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* SHA-256 Ledger Provenance Tag */}
            <div className="mt-6 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/40 text-[9px] font-mono text-[#747D79]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#278B79] animate-pulse" />
              <span>BILATERAL VERIFICATION ENGINE · READY</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
