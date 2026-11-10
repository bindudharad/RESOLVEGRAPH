"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Truck,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DecryptedText } from "@/components/ui/decrypted-text";

interface Chapter {
  id: string;
  stageNumber: string;
  title: string;
  subtitle: string;
  badge: string;
  summary: string;
  buyerEvent: string;
  merchantEvent: string;
  systemAction: string;
  color: string;
  contradictionState?: "agreed" | "contested" | "missing" | "verified";
}

const CHAPTERS: Chapter[] = [
  {
    id: "complaint",
    stageNumber: "01",
    title: "The Complaint",
    subtitle: "Buyer Account Enters",
    badge: "Buyer Rail",
    summary:
      "The buyer submits a dispute claiming the delivered package was re-taped and missing its contents. Evidence includes unboxing video excerpts and doorstep weigh-in photos.",
    buyerEvent: "Claim #CLM-0412 filed: 'Delivered parcel was hollowed out, weighs 420g instead of 1,250g.'",
    merchantEvent: "Awaiting bilateral response from merchant warehouse.",
    systemAction: "Ingested via Buyer Protocol. Document hash sha256:8f4b...3a1c anchored to investigation timeline.",
    color: "var(--buyer)",
    contradictionState: "contested",
  },
  {
    id: "merchant-account",
    stageNumber: "02",
    title: "The Merchant Account",
    subtitle: "Merchant Dispatch Enters",
    badge: "Merchant Rail",
    summary:
      "Merchant submits automated warehouse fulfillment telemetry, including barcode scans, tamper seal ID, and dispatch scale weigh-in showing full hardware payload.",
    buyerEvent: "Doorstep delivery receipt logged with timestamp 14:22:08 UTC.",
    merchantEvent: "Loading dock manifest logged: 1,248g at origin terminal with intact security tape #RG-SEAL-9981.",
    systemAction: "Ingested via Merchant Protocol. Both threads kept completely isolated and untampered.",
    color: "var(--merchant)",
    contradictionState: "contested",
  },
  {
    id: "payment-correlation",
    stageNumber: "03",
    title: "Payment Correlation",
    subtitle: "Transaction Rails Synchronize",
    badge: "Settlement Rail",
    summary:
      "The payment gateway and card network transaction identifiers are matched against the buyer claim and merchant invoice, locking funds in temporary escrow.",
    buyerEvent: "Credit card charge: $1,420.00 USD on Jan 14, 2026.",
    merchantEvent: "Settlement ID #ST-8829-PAYPAL flagged for bilateral review.",
    systemAction: "Exact transaction match verified with minor-unit precision ($1,420.00 = 142000 cents). Escrow protected.",
    color: "var(--amber)",
    contradictionState: "agreed",
  },
  {
    id: "evidence-connection",
    stageNumber: "04",
    title: "Evidence Connection",
    subtitle: "Bilateral Graph Formed",
    badge: "Graph Engine",
    summary:
      "Separate evidentiary nodes connect to the central case core. Progressive relationship paths draw across buyer unboxing, carrier transit checkpoints, and merchant seals.",
    buyerEvent: "Unboxing session frame #412 attached to Serial #NVME-2TB-998.",
    merchantEvent: "Factory packaging QC video linked with tamper barcode verification.",
    systemAction: "Multi-party evidence graph compiled with 12 distinct verification nodes and 18 cryptographic edges.",
    color: "var(--ai)",
    contradictionState: "verified",
  },
  {
    id: "contradiction-gaps",
    stageNumber: "05",
    title: "Contradiction & Missing Gaps",
    subtitle: "BERR Reasoning Matrix",
    badge: "Reasoning",
    summary:
      "The contradiction engine isolates the exact inflection point: The parcel lost 828g between carrier Sorting Hub #3 and final doorstep dispatch. Missing transit weigh-in is flagged neutrally.",
    buyerEvent: "Delivery weight discrepancy: 420g verified at unboxing.",
    merchantEvent: "Origin dispatch weight: 1,248g verified at loading dock.",
    systemAction: "Inflection localized to Hub #3. Carrier intermediate weigh-in record is MISSING (neutral evidentiary gap).",
    color: "var(--copper)",
    contradictionState: "missing",
  },
  {
    id: "human-resolution",
    stageNumber: "06",
    title: "Human Resolution",
    subtitle: "Reviewer Accountability",
    badge: "Resolution",
    summary:
      "The complete auditable evidence dossier is surfaced to the human resolution manager. A balanced outcome is authorized: Buyer refunded from transit insurance, merchant paid in full.",
    buyerEvent: "Full remedy released: $1,420.00 refunded via original payment rail.",
    merchantEvent: "Merchant payout released from carrier claims indemnity escrow.",
    systemAction: "Case #RG-2026-0412 resolved with cryptographic dual-signoff audit ledger anchored.",
    color: "var(--verified)",
    contradictionState: "verified",
  },
];

export function ScrollStorySection() {
  const [activeStage, setActiveStage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const chapter = CHAPTERS[activeStage];

  return (
    <section
      id="how-it-works"
      ref={containerRef}
      className="relative border-b border-[var(--line)] bg-[var(--surface-2)]/30 py-24 sm:py-32 overflow-hidden"
    >
      {/* Decorative background grid */}
      <div className="pointer-events-none absolute inset-0 opacity-10 [background-image:linear-gradient(to_right,var(--line)_1px,transparent_1px),linear-gradient(to_bottom,var(--line)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1 text-xs font-mono text-[var(--ink-2)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>PINNED INVESTIGATION CHOREOGRAPHY</span>
            <span className="text-[var(--ink-3)]">· 6 Chapters</span>
          </div>

          <h2 className="mt-4 font-heading text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[var(--ink)]">
            A dispute becomes an accountable case,
            <span className="block font-display italic text-[var(--accent)] font-medium">
              one source-linked record at a time.
            </span>
          </h2>

          <p className="mt-4 text-sm sm:text-base leading-relaxed text-[var(--ink-2)]">
            Witness how conflicting buyer statements and merchant records move from fragmented discord into verified bilateral consensus without dismissing either side.
          </p>
        </div>

        {/* Chapter Scrubbing Timeline Navigation Bar */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {CHAPTERS.map((c, index) => {
            const isActive = activeStage === index;
            return (
              <button
                key={c.id}
                onClick={() => setActiveStage(index)}
                className={`relative flex flex-col gap-1 rounded-xl border p-3 text-left transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "border-[var(--line-strong)] bg-[var(--surface)] shadow-md"
                    : "border-transparent bg-[var(--surface)]/40 hover:bg-[var(--surface)]/70 text-[var(--ink-3)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold" style={{ color: isActive ? c.color : "var(--ink-3)" }}>
                    {c.stageNumber}
                  </span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full animate-ping" style={{ backgroundColor: c.color }} />
                  )}
                </div>
                <span className={`text-xs font-semibold truncate ${isActive ? "text-[var(--ink)]" : "text-[var(--ink-2)]"}`}>
                  {c.title}
                </span>
                <span className="text-[10px] text-[var(--ink-3)] truncate">
                  {c.badge}
                </span>

                {/* Progress highlight line at bottom */}
                {isActive && (
                  <motion.div
                    layoutId="active-chapter-bar"
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Pinned Chapter Inspection Card */}
        <div className="mt-8 grid gap-8 lg:grid-cols-12 items-stretch">
          {/* Left Column: Chapter Dossier & Reasoning */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl border border-[var(--line-strong)] bg-[var(--surface)] p-6 sm:p-8 shadow-xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={chapter.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full justify-between"
              >
                <div>
                  {/* Top Badge & Number */}
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--ink-3)]">
                        Chapter {chapter.stageNumber} of 06
                      </span>
                      <span className="text-[var(--ink-3)]">/</span>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${chapter.color} 15%, transparent)`,
                          color: chapter.color,
                        }}
                      >
                        {chapter.badge}
                      </span>
                    </div>

                    <div className="font-mono text-xs text-[var(--ink-3)]">
                      Case #RG-2026-0412
                    </div>
                  </div>

                  {/* Chapter Heading */}
                  <div className="mt-6">
                    <h3 className="font-heading text-2xl sm:text-3xl font-semibold text-[var(--ink)]">
                      {chapter.title}
                    </h3>
                    <p className="mt-1 font-mono text-xs text-[var(--ink-3)] uppercase tracking-wider">
                      {chapter.subtitle}
                    </p>
                  </div>

                  {/* Summary Narrative */}
                  <p className="mt-4 text-sm sm:text-base leading-relaxed text-[var(--ink-2)]">
                    {chapter.summary}
                  </p>

                  {/* Bilateral Comparison Feed */}
                  <div className="mt-6 space-y-3">
                    {/* Buyer Side Record */}
                    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-3.5 flex items-start gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--buyer)]/15 text-[var(--buyer)]">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <div className="text-xs">
                        <span className="font-mono font-semibold text-[var(--buyer)] uppercase text-[10px]">
                          Buyer Telemetry
                        </span>
                        <p className="mt-0.5 text-[var(--ink)] font-medium">
                          {chapter.buyerEvent}
                        </p>
                      </div>
                    </div>

                    {/* Merchant Side Record */}
                    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-3.5 flex items-start gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--merchant)]/15 text-[var(--merchant)]">
                        <Truck className="h-3.5 w-3.5" />
                      </div>
                      <div className="text-xs">
                        <span className="font-mono font-semibold text-[var(--merchant)] uppercase text-[10px]">
                          Merchant Dispatch Telemetry
                        </span>
                        <p className="mt-0.5 text-[var(--ink)] font-medium">
                          {chapter.merchantEvent}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom System Action & Controls */}
                <div className="mt-8 pt-5 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-4">
                  <div className="text-xs text-[var(--ink-3)] font-mono max-w-sm">
                    <span className="text-[var(--ink)] font-semibold">Engine Action: </span>
                    {chapter.systemAction}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={activeStage === 0}
                      onClick={() => setActiveStage((prev) => Math.max(0, prev - 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      aria-label="Previous chapter"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      disabled={activeStage === CHAPTERS.length - 1}
                      onClick={() => setActiveStage((prev) => Math.min(CHAPTERS.length - 1, prev + 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      aria-label="Next chapter"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Column: Progressive SVG Drawing & Visual Verification State */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-[var(--line-strong)] bg-[var(--surface)]/90 p-6 sm:p-8 shadow-xl">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--ink-3)] uppercase tracking-wider">
                  Visual Investigation State
                </span>
                <span className="font-mono text-xs font-semibold text-[var(--accent)]">
                  Live Evidence Schema
                </span>
              </div>

              {/* Dynamic SVG Schematic Representation */}
              <div className="mt-6 relative h-64 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/60 flex items-center justify-center overflow-hidden p-4">
                <svg className="w-full h-full" viewBox="0 0 320 200" fill="none">
                  {/* Connecting Arc Lines */}
                  <motion.path
                    d="M 40 100 Q 160 40 280 100"
                    stroke="var(--buyer)"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    fill="none"
                    initial={{ pathLength: 0.2 }}
                    animate={{ pathLength: (activeStage + 1) / 6 }}
                    transition={{ duration: 0.4 }}
                  />
                  <motion.path
                    d="M 40 100 Q 160 160 280 100"
                    stroke="var(--merchant)"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    fill="none"
                    initial={{ pathLength: 0.2 }}
                    animate={{ pathLength: (activeStage + 1) / 6 }}
                    transition={{ duration: 0.4 }}
                  />

                  {/* Left Node: Buyer Claim */}
                  <circle cx="40" cy="100" r="20" fill="var(--surface)" stroke="var(--buyer)" strokeWidth="2.5" />
                  <text x="40" y="104" textAnchor="middle" fill="var(--ink)" fontSize="9" fontFamily="monospace" fontWeight="bold">
                    BUYER
                  </text>

                  {/* Right Node: Merchant Dispatch */}
                  <circle cx="280" cy="100" r="20" fill="var(--surface)" stroke="var(--merchant)" strokeWidth="2.5" />
                  <text x="280" y="104" textAnchor="middle" fill="var(--ink)" fontSize="9" fontFamily="monospace" fontWeight="bold">
                    SELLER
                  </text>

                  {/* Center Node: Consensus Gem */}
                  <circle cx="160" cy="100" r="28" fill="var(--surface)" stroke={chapter.color} strokeWidth="3" />
                  <text x="160" y="98" textAnchor="middle" fill="var(--ink)" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                    BERR v2
                  </text>
                  <text x="160" y="112" textAnchor="middle" fill={chapter.color} fontSize="8" fontFamily="monospace">
                    STAGE {chapter.stageNumber}
                  </text>
                </svg>

                {/* Laser Scanning Line Indicator */}
                <motion.div
                  className="absolute inset-y-0 w-0.5 bg-gradient-to-b from-transparent via-[var(--accent)] to-transparent pointer-events-none"
                  animate={{
                    left: ["10%", "90%", "10%"],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>

              {/* Real Data Cryptographic Status Stream */}
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--ink-3)] font-mono">Bilateral Discrepancy:</span>
                  <span className="font-mono font-semibold text-[var(--amber)]">
                    <DecryptedText text="828g Variance Localized" speed={25} />
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--ink-3)] font-mono">Transit Checkpoints:</span>
                  <span className="font-mono text-[var(--ink)]">4 Scanned · 1 Gap</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--ink-3)] font-mono">Cryptographic State:</span>
                  <span className="font-mono font-semibold text-[var(--verified)]">
                    SHA-256 Chained OK
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--line)]">
              <Link
                href="/cases"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] py-2.5 text-xs font-semibold text-[var(--ink)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--surface)]"
              >
                <span>Inspect full case dossier in workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
