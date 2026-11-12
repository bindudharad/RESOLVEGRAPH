"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileCheck2,
  Search,
  RefreshCw,
  ArrowRight,
  Paperclip,
  AlertTriangle,
} from "lucide-react";
import {
  SellerStatusPill,
  formatSellerDate,
  formatStanceLabel,
} from "@/components/seller/seller-ui-primitives";
import { SellerContextualGuide } from "@/components/seller/seller-contextual-guide";
import { groupComplaintsByDate } from "@/lib/buyer-date-grouping";

interface SubmittedResponseListItem {
  id: string;
  requestId: string;
  requestNumber: string;
  caseId: string;
  caseNumber: string;
  caseStatus: string;
  customerComplaintTitle: string;
  marketplace: string;
  orderId: string;
  productName: string;
  complaintCategory: string;
  stance: string;
  summary: string;
  verificationStatus: string;
  sellerStatusLabel: string;
  filesCount: number;
  responderName: string;
  organizationName: string | null;
  submittedAt: string;
  verifiedAt: string | null;
}

const RESPONSE_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "Under Verification", label: "Under Verification" },
  { id: "Verified for Investigation", label: "Verified for Investigation" },
  { id: "Additional Information Required", label: "Additional Information Required" },
  { id: "Human Review Required", label: "Human Review Required" },
];

function SubmittedResponsesContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "ALL";
  const validInitial = RESPONSE_FILTERS.some((f) => f.id === initialStatus) ? initialStatus : "ALL";

  const [responses, setResponses] = useState<SubmittedResponseListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState(validInitial);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadResponses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "ALL") qs.set("status", statusFilter);
      if (debouncedQuery) qs.set("q", debouncedQuery);
      const res = await fetch(`/api/seller/responses?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load submitted responses");
      }
      setResponses(data.responses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load submitted responses");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedQuery]);

  useEffect(() => {
    void loadResponses();
  }, [loadResponses]);

  const grouped = groupComplaintsByDate(
    responses.map((item) => ({
      ...item,
      createdAt: item.submittedAt,
    }))
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-8">
      <header className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 sm:px-6 sm:py-5 shadow-xs flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)]">
            Submitted Responses
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--ink-2)]">
            Review previously submitted responses, attached evidence files, and their current verification status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadResponses()}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)] cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </header>

      <SellerContextualGuide
        guideId="seller-responses-status-guide"
        title="Understanding Submitted Response Statuses"
        compactLabel="Status guide"
      >
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <li>
            <strong className="text-[var(--ink)]">Under Verification:</strong> Automated usability,
            extraction, and relevance checks or investigator verification are underway.
          </li>
          <li>
            <strong className="text-[var(--ink)]">Verified for Investigation:</strong> Records
            passed verification and are part of the bilateral investigation record.
          </li>
          <li>
            <strong className="text-[var(--ink)]">Additional Information Required:</strong> Follow-up
            details are requested on the open request; your previous response remains intact.
          </li>
          <li>
            <strong className="text-[var(--ink)]">Human Review Required:</strong> Verification noted
            an ambiguity or signal requiring manual investigator inspection.
          </li>
        </ul>
      </SellerContextualGuide>

      {/* Search & Status Filters */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-3)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Complaint ID, Order ID, or Product..."
            aria-label="Search submitted responses"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] pl-9 pr-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {RESPONSE_FILTERS.map((filter) => {
            const active = statusFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--line)] bg-[var(--surface-2)]/70 text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)]"
            />
          ))}
        </div>
      ) : responses.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-6 py-12 text-center shadow-xs">
          <FileCheck2 className="h-9 w-9 mx-auto text-[var(--ink-3)] mb-3" />
          <p className="text-sm font-semibold text-[var(--ink)]">
            {debouncedQuery || statusFilter !== "ALL"
              ? "No responses match your current filter"
              : "No submitted responses yet"}
          </p>
          <p className="mt-1 text-xs text-[var(--ink-2)] max-w-md mx-auto">
            {debouncedQuery || statusFilter !== "ALL"
              ? "Try clearing the search query or switching back to All responses."
              : "Submitted responses to buyer evidence requests will appear here with verification updates."}
          </p>
          {debouncedQuery || statusFilter !== "ALL" ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              className="mt-4 inline-flex items-center rounded-lg border border-[var(--line)] px-3.5 py-2 text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)] cursor-pointer"
            >
              Clear Filters
            </button>
          ) : (
            <Link
              href="/seller/requests"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
            >
              <span>View Evidence Requests</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.dateKey} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)]">
                  {group.heading}
                </h2>
                <span className="text-xs text-[var(--ink-3)]">({group.items.length})</span>
              </div>

              <div className="space-y-3">
                {group.items.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5 shadow-xs transition-colors hover:border-[var(--line-strong)]"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-[var(--ink)]">
                            {item.caseNumber}
                          </span>
                          <span className="rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold">
                            DEMO / TEST
                          </span>
                          <span className="text-[var(--ink-3)]">&middot;</span>
                          <span className="text-xs text-[var(--ink-2)]">
                            {item.marketplace}
                          </span>
                          <span className="text-[var(--ink-3)]">&middot;</span>
                          <span className="font-mono text-xs text-[var(--ink-2)]">
                            Order {item.orderId}
                          </span>
                          <SellerStatusPill label={item.sellerStatusLabel} />
                        </div>

                        <h3 className="text-sm sm:text-base font-semibold text-[var(--ink)]">
                          {item.productName || item.customerComplaintTitle}
                        </h3>

                        <p className="text-xs sm:text-sm text-[var(--ink-2)] line-clamp-2">
                          {item.summary}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-[var(--ink-3)]">
                          <span className="font-medium text-[var(--ink-2)]">
                            {formatStanceLabel(item.stance)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            <span>
                              {item.filesCount > 0
                                ? `${item.filesCount} ${item.filesCount === 1 ? "file" : "files"} attached`
                                : "Declaration & Tracking Provided"}
                            </span>
                          </span>
                          <span>Submitted {formatSellerDate(item.submittedAt)}</span>
                          <span>By {item.responderName}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center sm:pt-1">
                        <Link
                          href={`/seller/responses/${encodeURIComponent(item.id)}`}
                          className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] px-4 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-colors"
                        >
                          <span>View Response</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SellerResponsesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl space-y-4 py-6">
          <div className="h-24 animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />
          <div className="h-32 animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />
        </div>
      }
    >
      <SubmittedResponsesContent />
    </Suspense>
  );
}
