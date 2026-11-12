"use client";

import { useState } from "react";
import { Plus, Minus, HelpCircle, ShieldCheck } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    category: "EVIDENCE VERIFICATION",
    question: "How does RESOLVEGRAPH verify invoice authenticity and unboxing videos?",
    answer:
      "Every uploaded file is immediately hashed using SHA-256 upon ingestion and registered on an immutable provenance timeline. Invoices are cross-referenced with order IDs, GST/VAT tax identifiers, and merchant catalog records. Unboxing videos and parcel photographs undergo optical timestamp analysis, EXIF metadata validation, and seal integrity inspection to detect tampering or post-delivery substitution.",
  },
  {
    category: "SELLER PARTICIPATION",
    question: "What happens if a registered seller fails or refuses to respond to an evidence request?",
    answer:
      "When a seller outreach request is dispatched, an SLA countdown timer begins (configurable per marketplace policy). If the seller fails to provide dispatch evidence, serial number logs, or package weight telemetry before the deadline expires, the case advances with a verified 'MISSING_SELLER_EVIDENCE' finding. The policy engine then evaluates the dispute in favor of the customer's corroborated claims.",
  },
  {
    category: "REASONING & INTEGRITY",
    question: "How does the BERR engine prevent AI hallucinations during dispute evaluation?",
    answer:
      "BERR v2 (Bilateral Evidence Reasoning & Resolution) does not make open-ended speculative decisions. It operates as a deterministic classification engine that maps verified BEG (Bilateral Evidence Graph) nodes to four strict categories: AGREED (both parties concur), VERIFIED (supported by objective courier/payment records), CONTESTED (claims clash with contrary evidence), and MISSING (obligations lacking evidence). Every conclusion cites specific node and edge IDs.",
  },
  {
    category: "FINANCIAL GOVERNANCE",
    question: "Can an autonomous AI or unauthorized user execute a financial refund?",
    answer:
      "No. RESOLVEGRAPH enforces a strict zero-bypass Dual-Key Authorization rule. While BERR and Policy recommend eligible remedies, any financial transfer (refund, store credit, or chargeback acquiescence) requires explicit, credentialed authorization from a verified human supervisor. API calls attempting to execute refunds without a valid supervisor approval token fail with HTTP 403 Forbidden.",
  },
  {
    category: "SANDBOX EXECUTION",
    question: "How does PayPal sandbox integration verify transaction completion without real-world capital risk?",
    answer:
      "In development and evaluation environments, RESOLVEGRAPH connects directly to PayPal's REST Sandbox API. When a refund is authorized, RESOLVEGRAPH issues an authentic POST /v2/payments/captures/{capture_id}/refund call to PayPal's sandbox gateway, captures the live PayPal refund ID (e.g. 5TY81293...), verifies transaction status 'COMPLETED', and records the exact timestamp on the dispute ledger.",
  },
  {
    category: "REPLACEMENT WORKFLOW",
    question: "How are courier replacement deliveries tracked and confirmed?",
    answer:
      "When an authorized replacement remedy is approved (such as in Case RG-1465), RESOLVEGRAPH generates an automated fulfillment dispatch request with a unique AWB tracking number. The platform monitors courier telemetry checkpoints (Dispatched, In Transit, Out for Delivery, Delivered) and requires buyer delivery OTP verification before closing the complaint as completed.",
  },
];

export function LandingFAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative border-b border-[var(--line,#D9DED7)] bg-[var(--bg,#F4F2EC)] py-20 sm:py-28">
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Editorial Heading */}
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong,#B5BEB6)] bg-[var(--surface,#FFFEFA)] px-3.5 py-1 text-xs font-mono text-[var(--ink-2,#414B52)]">
              <HelpCircle className="h-3.5 w-3.5 text-[var(--accent,#4350E5)]" />
              <span>FREQUENTLY EXAMINED QUESTIONS</span>
            </div>

            <h2 className="font-heading text-3xl sm:text-4xl font-medium tracking-tight text-[var(--ink,#15191C)] leading-[1.1]">
              Clarity on governance, evidence, and{" "}
              <span className="font-display italic text-[var(--accent,#4350E5)] font-normal">
                financial safety.
              </span>
            </h2>

            <p className="text-base text-[var(--ink-2,#414B52)] leading-relaxed">
              Dispute resolution demands absolute legal, operational, and financial transparency. Here is how RESOLVEGRAPH guarantees proof at every layer.
            </p>

            <div className="mt-8 p-4 rounded-xl border border-[var(--line,#D9DED7)] bg-[var(--surface,#FFFEFA)] space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink,#15191C)]">
                <ShieldCheck className="h-4 w-4 text-[var(--agreed,#2E8A62)]" />
                <span>Audited Architecture Standards</span>
              </div>
              <p className="text-xs text-[var(--ink-2,#414B52)] leading-relaxed">
                All 27 steps of replacement and 5 phases of refund have been end-to-end verified across the unified database schema.
              </p>
            </div>
          </div>

          {/* Right Column: Accordion List */}
          <div className="lg:col-span-7 space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? "border-[var(--line-strong,#B5BEB6)] bg-[var(--surface,#FFFEFA)] shadow-sm"
                      : "border-[var(--line,#D9DED7)] bg-[var(--surface,#FFFEFA)]/60 hover:bg-[var(--surface,#FFFEFA)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(idx)}
                    aria-expanded={isOpen}
                    className="w-full p-5 text-left flex items-start justify-between gap-4 cursor-pointer"
                  >
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-3,#718078)] font-semibold">
                        {item.category}
                      </span>
                      <h3 className="mt-0.5 font-heading text-base sm:text-lg font-semibold text-[var(--ink,#15191C)]">
                        {item.question}
                      </h3>
                    </div>

                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                        isOpen
                          ? "bg-[var(--accent,#4350E5)] text-white border-[var(--accent,#4350E5)]"
                          : "border-[var(--line-strong,#B5BEB6)] text-[var(--ink-2,#414B52)]"
                      }`}
                    >
                      {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-sm text-[var(--ink-2,#414B52)] leading-relaxed border-t border-[var(--line,#D9DED7)]/60 animate-in fade-in duration-200">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
