"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  SELLER_COMMITMENTS,
  SELLER_CORE_MESSAGE,
  SELLER_WELCOME_STEPS,
} from "./seller-guidance-content";
import { WelcomeStepIllustration } from "./seller-onboarding-illustrations";

interface SellerWelcomeGuideModalProps {
  open: boolean;
  step: 1 | 2 | 3 | 4;
  saving: boolean;
  onSelectStep: (step: 1 | 2 | 3 | 4) => void;
  onSkip: () => void;
  onFinish: () => void;
}

export function SellerWelcomeGuideModal({
  open,
  step,
  saving,
  onSelectStep,
  onSkip,
  onFinish,
}: SellerWelcomeGuideModalProps) {
  const current =
    SELLER_WELCOME_STEPS.find((item) => item.stepNumber === step) ??
    SELLER_WELCOME_STEPS[0];

  const isFirst = step === 1;
  const isLast = step === 4;

  const footer = (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center justify-between gap-2 sm:justify-start">
        <button
          type="button"
          onClick={onSkip}
          disabled={saving}
          className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] disabled:opacity-50"
        >
          Skip for now
        </button>

        <Link
          href="/seller/guidelines"
          onClick={onSkip}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--accent)] hover:underline"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Seller Guidelines</span>
        </Link>
      </div>

      <div className="flex items-center justify-end gap-2">
        {!isFirst && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => onSelectStep((step - 1) as 1 | 2 | 3 | 4)}
            className="gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back</span>
          </Button>
        )}

        {!isLast ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={saving}
            onClick={() => onSelectStep((step + 1) as 1 | 2 | 3 | 4)}
            className="gap-1.5"
          >
            <span>Next</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={saving}
            onClick={onFinish}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Finish</span>
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onSkip}
      title="Seller Workspace Guide"
      description={`Step ${current.stepNumber} of ${SELLER_WELCOME_STEPS.length} — ${current.tabLabel}`}
      size="panel"
      footer={footer}
    >
      <div className="space-y-5" data-testid="seller-welcome-guide-modal">
        {/* Progress Step Pills */}
        <nav aria-label="Welcome Guide Steps" className="grid grid-cols-4 gap-2">
          {SELLER_WELCOME_STEPS.map((item) => {
            const active = item.stepNumber === step;
            const visited = item.stepNumber < step;
            return (
              <button
                key={item.stepNumber}
                type="button"
                onClick={() => onSelectStep(item.stepNumber)}
                aria-current={active ? "step" : undefined}
                className={`group flex flex-col gap-1.5 rounded-xl border p-2 text-left transition-colors ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]/50"
                    : visited
                      ? "border-emerald-300/60 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                      : "border-[var(--line)] bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)]"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      active
                        ? "text-[var(--accent)]"
                        : visited
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-[var(--ink-3)]"
                    }`}
                  >
                    Step {item.stepNumber}
                  </span>
                </div>
                <span className="truncate text-[11px] sm:text-xs font-medium text-[var(--ink)]">
                  {item.tabLabel}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Main Instructional Card */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:items-center">
          <div className="md:col-span-5 flex items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-4">
            <WelcomeStepIllustration step={step} />
          </div>

          <div className="md:col-span-7 space-y-3">
            <div>
              <h3 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-[var(--ink)]">
                {current.heading}
              </h3>
              <p className="mt-1 text-xs sm:text-sm font-medium text-[var(--accent)]">
                {current.subheading}
              </p>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed text-[var(--ink-2)]">
              {current.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}

              {current.bullets && current.bullets.length > 0 && (
                <ul className="space-y-1.5 pl-1">
                  {current.bullets.map((bullet, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                        aria-hidden="true"
                      />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}

              {current.closingNote && (
                <p className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/60 px-3 py-2 text-xs text-[var(--ink)]">
                  {current.closingNote}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Core Message Callout on Step 1 */}
        {step === 1 && (
          <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)]/35 px-4 py-3 text-xs sm:text-sm leading-relaxed text-[var(--ink)]">
            {SELLER_CORE_MESSAGE}
          </div>
        )}

        {/* Commitments Overview on Step 4 */}
        {step === 4 && (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
              <h4 className="text-xs sm:text-sm font-semibold text-[var(--ink)]">
                Our Commitments to Sellers
              </h4>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {SELLER_COMMITMENTS.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
                >
                  <p className="text-xs font-semibold text-[var(--ink)]">{item.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--ink-2)]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
