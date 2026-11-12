"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Inbox,
  Search,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import {
  SellerStatusPill,
  formatSellerDate,
} from "@/components/seller/seller-ui-primitives";
import { SellerContextualGuide } from "@/components/seller/seller-contextual-guide";

interface SellerRequestCardItem {
  id: string;
  requestNumber: string;
  caseId: string;
  caseNumber: string;
  orderId: string;
  marketplace: string;
  productName: string;
  complaintCategory: string;
  customerComplaintTitle: string;
  requestedItemsSummary: string[];
  requestedItems: Array<{ key: string; label: string }>;
  status: string;
  statusBucket: string;
  statusLabel: string;
  hasDraft: boolean;
  createdAt: string;
  dueAt: string | null;
}

const FILTERS = [
  { id: "ALL", label: "All" },
  { id: "NEW", label: "New" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "SUBMITTED", label: "Submitted" },
  { id: "ADDITIONAL_INFO_REQUIRED", label: "Additional Information Required" },
];

function EvidenceRequestsContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status")?.toUpperCase() || "ALL";
  const validInitial = FILTERS.some((f) => f.id === initialStatus) ? initialStatus : "ALL";

  const [requests, setRequests] = useState<SellerRequestCardItem[]>([]);
  const [statusFilter, setStatusFilter] = useState(validInitial);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "ALL") qs.set("status", statusFilter);
      if (debouncedQuery) qs.set("q", debouncedQuery);
      const res = await fetch(`/api/seller/requests?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load evidence requests");
      }
      setRequests(data.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load evidence requests");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedQuery]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-8">
      {/* Page Heading */}
      <header className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 sm:px-6 sm:py-5 shadow-xs flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)]">
            Evidence Requests
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--ink-2)]">
            Review customer complaints and provide the relevant supporting information.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadRequests()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)] cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </header>

      {/* Internal Demo Safeguard Banner */}
      <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-3.5 text-xs text-sky-200 flex items-center gap-2.5">
        <Sparkles className="h-4 w-4 text-sky-400 shrink-0" />
        <span>
          <strong>Demonstration Portal Mode:</strong> Evidence requests shown in this workspace are
          internal demonstration requests delivered directly to your RESOLVEGRAPH Seller Portal
          account. No external emails or marketplace communications are dispatched.
        </span>
      </div>

      <SellerContextualGuide
        guideId="seller-requests-overview"
        title="Understanding Your Evidence Requests"
        compactLabel="How requests work"
      >
        <p>
          Each request summarizes a customer complaint associated with your store along with
          specific supporting items tailored to the complaint category. Only share records that
          actually exist for the order.
        </p>
        <p>
          <strong className="text-[var(--ink)]">Statuses:</strong>{" "}
          <span className="font-medium text-[var(--ink)]">New Request</span> awaits your review;{" "}
          <span className="font-medium text-[var(--ink)]">In Progress</span> has a saved draft;{" "}
          <span className="font-medium text-[var(--ink)]">Submitted</span> is sent for verification;{" "}
          <span className="font-medium text-[var(--ink)]">Additional Information Required</span>{" "}
          indicates follow-up clarification was requested.
        </p>
      </SellerContextualGuide>

      {/* Compact Search & Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-[var(--ink-3)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Complaint ID, Order ID, or Product name..."
            aria-label="Search evidence requests"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] pl-10 pr-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 p-4 text-xs sm:text-sm text-red-700 dark:text-red-200 flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Request Cards */}
      {loading ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--ink-3)]">
          Loading evidence requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-10 text-center space-y-1.5">
          <Inbox className="h-8 w-8 mx-auto text-[var(--ink-3)] mb-2" />
          <p className="text-sm font-bold text-[var(--ink)]">No new evidence requests</p>
          <p className="text-xs text-[var(--ink-2)]">
            {debouncedQuery || statusFilter !== "ALL"
              ? "Try clearing your search or choosing another status filter."
              : "New complaint requests from RESOLVEGRAPH will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const ctaLabel =
              req.statusBucket === "SUBMITTED"
                ? "View Request"
                : req.statusBucket === "IN_PROGRESS"
                ? "Continue Response"
                : "Respond to Request";
            const summaryItems = req.requestedItemsSummary || [];

            return (
              <article
                key={req.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5 shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-[var(--ink)]">
                      {req.caseNumber}
                    </span>
                    <span className="rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold">
                      DEMO / TEST
                    </span>
                    <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink-2)]">
                      {req.marketplace}
                    </span>
                    <span className="rounded-md border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--ink-2)]">
                      {req.complaintCategory}
                    </span>
                    <SellerStatusPill label={req.statusLabel} />
                  </div>

                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-[var(--ink)] break-words">
                      {req.productName}
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--ink-2)] mt-0.5 break-words">
                      {req.customerComplaintTitle}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ink-3)]">
                    <span>
                      Order ID:{" "}
                      <strong className="font-mono text-[var(--ink-2)]">{req.orderId}</strong>
                    </span>
                    <span>Request Date: {formatSellerDate(req.createdAt)}</span>
                  </div>

                  {summaryItems.length > 0 && (
                    <p className="text-xs text-[var(--ink-2)]">
                      <span className="font-semibold text-[var(--ink)]">Requested: </span>
                      {summaryItems.join(" · ")}
                      {req.requestedItems.length > 3
                        ? ` (+${req.requestedItems.length - 3} more)`
                        : ""}
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  <Link
                    href={`/seller/requests/${encodeURIComponent(req.id)}`}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                      req.statusBucket === "SUBMITTED"
                        ? "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)]"
                        : "bg-[var(--accent)] text-white hover:opacity-95"
                    }`}
                  >
                    <span>{ctaLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SellerEvidenceRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-sm text-[var(--ink-3)]">
          Loading evidence requests...
        </div>
      }
    >
      <EvidenceRequestsContent />
    </Suspense>
  );
}
