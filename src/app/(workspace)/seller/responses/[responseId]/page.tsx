"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  Package,
  RefreshCw,
  Truck,
} from "lucide-react";
import {
  SellerStatusPill,
  EvidenceVerificationChecksGrid,
  formatSellerDate,
  formatSellerMoney,
  formatStanceLabel,
} from "@/components/seller/seller-ui-primitives";
import { SellerContextualGuide } from "@/components/seller/seller-contextual-guide";

interface SubmittedResponseDetail {
  id: string;
  requestId: string;
  requestNumber: string;
  requestStatus: string;
  caseId: string;
  caseNumber: string;
  caseStatus: string;
  customerComplaintTitle: string;
  marketplace: string;
  orderId: string;
  productName: string;
  complaintCategory: string;
  amountMinor: number;
  currency: string;
  organizationName: string | null;
  responderName: string;
  stance: string;
  summary: string;
  additionalRemarks: string | null;
  structuredDetails: {
    productAndPacking?: Record<string, string | number | boolean | null | undefined>;
    dispatchAndSettlement?: Record<string, string | number | boolean | null | undefined>;
  } | null;
  itemResponses: Array<{ key: string; status: string; note?: string }>;
  verificationStatus: string;
  sellerStatusLabel: string;
  verificationSummary: Record<string, unknown> | null;
  submittedAt: string;
  verifiedAt: string | null;
  requestedItems: Array<{
    key: string;
    label: string;
    description: string;
    mandatory?: boolean;
    status?: string;
  }>;
  evidenceItems: Array<{
    id: string;
    evidenceId: string;
    requestedItemKey: string | null;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    previewUrl: string;
    verificationStatus: string;
    humanReviewRequired: boolean;
    fileUsability: { usable: boolean; notes?: string[]; scanStatus?: string } | null;
    documentExtraction: {
      performed: boolean;
      method: string;
      extractedTextLength: number;
      isScanned: boolean;
    } | null;
    evidenceRelevance: { relevant: boolean; score: number; reason: string } | null;
    informationConsistency: {
      consistent: boolean;
      orderIdMatched: boolean;
      productMatched?: boolean;
      notes?: string[];
    } | null;
    suspiciousSignals: Array<{ code: string; severity: string; detail: string }>;
  }>;
  threadResponses: Array<{
    id: string;
    stance: string;
    summary: string;
    verificationStatus: string;
    sellerStatusLabel: string;
    responderName: string;
    submittedAt: string;
  }>;
}

const FIELD_LABELS: Record<string, string> = {
  productName: "Product Name",
  sku: "SKU / Identifier",
  productModel: "Model / Version",
  quantityPacked: "Quantity Packed",
  packingProcessInfo: "Packing & Verification Notes",
  productConditionBeforePacking: "Condition Before Packing",
  qualityInspectionCompleted: "Quality Inspection Completed",
  productSpecifications: "Product Specifications",
  logisticsProvider: "Logistics Provider",
  dispatchReference: "Dispatch Reference",
  trackingId: "Tracking ID / AWB",
  dispatchDate: "Dispatch Date",
  packageWeight: "Recorded Package Weight",
  shipmentStatus: "Shipment Status",
  merchantPaymentRef: "Merchant Order-Payment Reference",
  transactionReference: "Gateway / UTR Transaction Reference",
  paymentConfirmationStatus: "Merchant Payment Confirmation Status",
  paymentVerificationNotes: "Payment Verification Notes",
  settlementReference: "Settlement / Payout Batch ID",
  settlementDate: "Settlement Date",
  originalPaymentRef: "Original Payment Reference",
  refundRequestRef: "Refund Request / Credit Note ID",
  refundInitiationStatus: "Refund Initiation Status",
  refundProcessingNotes: "Refund Processing Notes",
  providerConfirmationRef: "Provider ARN / UTR Confirmation",
};

function formatFieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAvailabilityLabel(status: string): string {
  switch ((status || "").toUpperCase()) {
    case "PROVIDED":
      return "Provided";
    case "NOT_AVAILABLE":
      return "Not available";
    case "NOT_APPLICABLE":
      return "Not applicable";
    case "PENDING":
      return "Pending";
    default:
      return status.replace(/_/g, " ");
  }
}

export default function SellerSubmittedResponseDetailPage({
  params,
}: {
  params: Promise<{ responseId: string }>;
}) {
  const { responseId } = use(params);
  const [response, setResponse] = useState<SubmittedResponseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/seller/responses/${encodeURIComponent(responseId)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load submitted response");
      }
      setResponse(data.response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load submitted response");
    } finally {
      setLoading(false);
    }
  }, [responseId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-5 py-4">
        <div className="h-6 w-48 animate-pulse rounded bg-[var(--surface)]" />
        <div className="h-36 animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />
        <div className="h-56 animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />
      </div>
    );
  }

  if (error || !response) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 py-6">
        <Link
          href="/seller/responses"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink-2)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Submitted Responses</span>
        </Link>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to load submitted response</p>
            <p className="mt-1 text-xs">{error || "Response not found."}</p>
          </div>
        </div>
      </div>
    );
  }

  const productEntries = Object.entries(
    response.structuredDetails?.productAndPacking || {}
  ).filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "");

  const dispatchEntries = Object.entries(
    response.structuredDetails?.dispatchAndSettlement || {}
  ).filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "");

  const requestedItemMap = new Map(
    response.requestedItems.map((item) => [item.key, item.label])
  );

  const needsFollowUp =
    response.sellerStatusLabel === "Additional Information Required" ||
    response.sellerStatusLabel === "Human Review Required" ||
    response.requestStatus === "ADDITIONAL_EVIDENCE_REQUIRED";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/seller/responses"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink-2)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Submitted Responses</span>
        </Link>

        <button
          type="button"
          onClick={() => void loadDetail()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)] cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Header Summary Card */}
      <header className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ink-3)]">
              <span className="font-mono font-semibold text-[var(--ink)]">
                {response.caseNumber}
              </span>
              <span>&middot;</span>
              <span className="font-mono">{response.requestNumber}</span>
              <span>&middot;</span>
              <span>{response.marketplace}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--ink)]">
              {response.productName || response.customerComplaintTitle}
            </h1>
            <p className="text-xs text-[var(--ink-2)]">
              Order ID: <span className="font-mono font-medium text-[var(--ink)]">{response.orderId}</span>
              {" · "}
              Claimed Amount:{" "}
              <span className="font-semibold text-[var(--ink)]">
                {formatSellerMoney(response.amountMinor, response.currency)}
              </span>
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            <SellerStatusPill label={response.sellerStatusLabel} />
            <Link
              href={`/seller/requests/${encodeURIComponent(response.requestId)}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-white hover:opacity-95"
            >
              <span>
                {needsFollowUp ? "Submit Additional Information" : "Add Supplemental Clarification"}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-[var(--line)] pt-4 sm:grid-cols-3 text-xs">
          <div>
            <span className="text-[var(--ink-3)] block">Submitted On</span>
            <span className="font-medium text-[var(--ink)]">
              {formatSellerDate(response.submittedAt)}
            </span>
          </div>
          <div>
            <span className="text-[var(--ink-3)] block">Submitted By</span>
            <span className="font-medium text-[var(--ink)]">
              {response.responderName}
              {response.organizationName ? ` · ${response.organizationName}` : ""}
            </span>
          </div>
          <div>
            <span className="text-[var(--ink-3)] block">Verification Checked On</span>
            <span className="font-medium text-[var(--ink)]">
              {response.verifiedAt ? formatSellerDate(response.verifiedAt) : "In progress"}
            </span>
          </div>
        </div>
      </header>

      {needsFollowUp && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 text-xs sm:text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-semibold">Further clarification or review is active on this request</p>
              <p className="mt-0.5 text-xs opacity-90">
                Your original submission below stays intact. Adding supplemental information creates a new linked entry in the verification record.
              </p>
            </div>
          </div>
          <Link
            href={`/seller/requests/${encodeURIComponent(response.requestId)}`}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800"
          >
            <span>Open Request</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Original Response & Explanation */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-base font-semibold text-[var(--ink)]">Original Response Summary</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--ink)]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>{formatStanceLabel(response.stance)}</span>
          </span>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-4 space-y-3 text-sm text-[var(--ink)] whitespace-pre-wrap">
          {response.summary}
          {response.additionalRemarks && (
            <div className="border-t border-[var(--line)] pt-3 text-xs sm:text-sm text-[var(--ink-2)]">
              <span className="font-semibold text-[var(--ink)] block mb-1">Additional Remarks</span>
              {response.additionalRemarks}
            </div>
          )}
        </div>

        {response.itemResponses.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)]">
              Requested Evidence Status Recorded
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {response.itemResponses.map((ir) => (
                <div
                  key={ir.key}
                  className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/30 px-3.5 py-2.5 text-xs flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--ink)]">
                      {requestedItemMap.get(ir.key) || formatFieldLabel(ir.key)}
                    </p>
                    {ir.note && <p className="mt-0.5 text-[var(--ink-2)]">{ir.note}</p>}
                  </div>
                  <span className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink-2)]">
                    {formatAvailabilityLabel(ir.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Structured Product/Packing & Dispatch/Settlement Details */}
      {(productEntries.length > 0 || dispatchEntries.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {productEntries.length > 0 && (
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-[var(--accent)]" />
                <h2 className="text-sm sm:text-base font-semibold text-[var(--ink)]">
                  Product, Packing &amp; Order Details
                </h2>
              </div>
              <dl className="space-y-2.5 text-xs sm:text-sm">
                {productEntries.map(([key, val]) => (
                  <div
                    key={key}
                    className="flex flex-col gap-0.5 border-b border-[var(--line)]/60 pb-2 last:border-b-0 last:pb-0"
                  >
                    <dt className="text-xs text-[var(--ink-3)]">{formatFieldLabel(key)}</dt>
                    <dd className="font-medium text-[var(--ink)] break-words">{String(val)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {dispatchEntries.length > 0 && (
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-[var(--accent)]" />
                <h2 className="text-sm sm:text-base font-semibold text-[var(--ink)]">
                  Dispatch &amp; Settlement Details
                </h2>
              </div>
              <dl className="space-y-2.5 text-xs sm:text-sm">
                {dispatchEntries.map(([key, val]) => (
                  <div
                    key={key}
                    className="flex flex-col gap-0.5 border-b border-[var(--line)]/60 pb-2 last:border-b-0 last:pb-0"
                  >
                    <dt className="text-xs text-[var(--ink-3)]">{formatFieldLabel(key)}</dt>
                    <dd className="font-medium text-[var(--ink)] break-words">{String(val)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      )}

      {/* Uploaded Evidence & Verification Details */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-base font-semibold text-[var(--ink)]">
              Submitted Supporting Evidence &amp; Verification
            </h2>
          </div>
          <span className="text-xs text-[var(--ink-3)]">
            {response.evidenceItems.length}{" "}
            {response.evidenceItems.length === 1 ? "file" : "files"}
          </span>
        </div>

        <SellerContextualGuide
          guideId="seller-response-verification-guide"
          title="How Verification Checks Work"
          defaultOpen={false}
          compactLabel="About verification checks"
        >
          <p>
            Uploaded files undergo usability, text extraction, relevance, and order/date
            consistency screening. Items flagged for ambiguity or inconclusive text extraction are
            routed for human review rather than rejected silently.
          </p>
        </SellerContextualGuide>

        {response.evidenceItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--line)] p-4 text-xs sm:text-sm text-[var(--ink-2)]">
            No supporting files were attached to this submission (submitted as explanation / declaration only).
          </p>
        ) : (
          <EvidenceVerificationChecksGrid items={response.evidenceItems} />
        )}
      </section>

      {/* Response Thread History if multiple submissions exist on the request */}
      {response.threadResponses.length > 1 && (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs space-y-3">
          <h2 className="text-sm sm:text-base font-semibold text-[var(--ink)]">
            Complete Submission Thread ({response.threadResponses.length})
          </h2>
          <div className="space-y-2.5">
            {response.threadResponses.map((entry, idx) => {
              const isCurrent = entry.id === response.id;
              return (
                <div
                  key={entry.id}
                  className={`rounded-xl border p-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${
                    isCurrent
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]/20"
                      : "border-[var(--line)] bg-[var(--surface-2)]/30"
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--ink)]">
                        Submission #{idx + 1}
                        {isCurrent ? " (Viewing)" : ""}
                      </span>
                      <SellerStatusPill label={entry.sellerStatusLabel} />
                      <span className="text-xs text-[var(--ink-3)]">
                        {formatSellerDate(entry.submittedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ink-2)] line-clamp-1">{entry.summary}</p>
                  </div>

                  {!isCurrent && (
                    <Link
                      href={`/seller/responses/${encodeURIComponent(entry.id)}`}
                      className="shrink-0 text-xs font-semibold text-[var(--accent)] hover:underline"
                    >
                      Open Entry
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
