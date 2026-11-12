"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  FileCheck2,
  Inbox,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  SELLER_COMMITMENTS,
  SELLER_CORE_MESSAGE,
  SELLER_GUIDELINES,
} from "@/components/seller/seller-guidance-content";
import { useSellerOnboarding } from "@/components/seller/seller-onboarding-provider";

export default function SellerGuidelinesPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const { isAuthorizedSeller, loading: onboardingLoading, openWelcomeGuide } =
    useSellerOnboarding();

  const user = session?.user as
    | { id?: string; role?: string; isPlatformAdmin?: boolean }
    | undefined;

  const checkingAccess = sessionLoading || onboardingLoading;
  const isBlockedNonSeller =
    !checkingAccess &&
    (!user?.id ||
      user.isPlatformAdmin ||
      user.role !== "MERCHANT" ||
      !isAuthorizedSeller);

  if (checkingAccess) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 pb-8">
        <div className="h-32 animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="h-40 animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />
          <div className="h-40 animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />
        </div>
      </div>
    );
  }

  if (isBlockedNonSeller) {
    return (
      <div className="mx-auto w-full max-w-2xl py-10">
        <section
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10 p-6 space-y-3 text-center"
        >
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-lg font-bold text-[var(--ink)]">
            Seller Workspace Access Required
          </h1>
          <p className="text-xs sm:text-sm text-[var(--ink-2)]">
            Seller Guidelines are available exclusively to authenticated users with an
            active merchant organization membership.
          </p>
          <div className="pt-2">
            <Link
              href={user?.id ? "/overview" : "/sign-in"}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
            >
              <span>{user?.id ? "Return to Overview" : "Sign In"}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-8">
      {/* Header */}
      <header className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-5 sm:px-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Link
              href="/seller"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink-2)] hover:text-[var(--accent)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Seller Dashboard</span>
            </Link>
            <div className="flex items-center gap-2 pt-1">
              <BookOpen className="h-5 w-5 text-[var(--accent)] shrink-0" aria-hidden="true" />
              <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)]">
                Seller Guidelines &amp; Investigation Overview
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[var(--ink-2)] max-w-3xl">
              {SELLER_CORE_MESSAGE}
            </p>
          </div>

          <div className="shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => openWelcomeGuide(1)}
              className="gap-1.5 w-full sm:w-auto"
            >
              <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
              <span>Reopen Welcome Guide</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 8 Seller Guidelines */}
      <section aria-label="Seller Guidelines" className="space-y-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[var(--ink)]">
            Seller Guidelines
          </h2>
          <p className="text-xs text-[var(--ink-2)]">
            Practical practices that help investigation teams review your response accurately.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SELLER_GUIDELINES.map((item) => (
            <article
              key={item.number}
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5 shadow-xs space-y-2"
            >
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                  {item.number}
                </span>
                <h3 className="text-sm font-semibold text-[var(--ink)]">
                  {item.title}
                </h3>
              </div>
              <p className="text-xs sm:text-[13px] leading-relaxed text-[var(--ink-2)]">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Our Commitments to Sellers */}
      <section
        aria-label="Our Commitments to Sellers"
        className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--accent)] mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[var(--ink)]">
              Our Commitments to Sellers
            </h2>
            <p className="text-xs text-[var(--ink-2)]">
              How RESOLVEGRAPH handles seller participation, evidence verification, and case status visibility.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SELLER_COMMITMENTS.map((commitment) => (
            <div
              key={commitment.id}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-4 space-y-1.5"
            >
              <h3 className="text-xs sm:text-sm font-semibold text-[var(--ink)]">
                {commitment.title}
              </h3>
              <p className="text-xs leading-relaxed text-[var(--ink-2)]">
                {commitment.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section
        aria-label="Workspace Shortcuts"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <Link
          href="/seller/requests"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)]/50"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Inbox className="h-4 w-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
            <span className="truncate text-xs sm:text-sm font-semibold text-[var(--ink)]">
              Evidence Requests
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--ink-3)] group-hover:text-[var(--accent)] shrink-0" />
        </Link>

        <Link
          href="/seller/responses"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)]/50"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <FileCheck2 className="h-4 w-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
            <span className="truncate text-xs sm:text-sm font-semibold text-[var(--ink)]">
              Submitted Responses
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--ink-3)] group-hover:text-[var(--accent)] shrink-0" />
        </Link>

        <Link
          href="/seller/profile"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)]/50"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Building2 className="h-4 w-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
            <span className="truncate text-xs sm:text-sm font-semibold text-[var(--ink)]">
              Business Profile
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--ink-3)] group-hover:text-[var(--accent)] shrink-0" />
        </Link>
      </section>
    </div>
  );
}
