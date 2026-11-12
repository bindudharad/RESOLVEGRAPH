"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Video,
  Lock,
  Eye,
  MessageSquarePlus,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type {
  DynamicSellerFormConfig,
  RequestedEvidenceRequirement,
  SellerDraftPayload,
} from "@/server/seller/seller.types";
import {
  SellerStatusPill,
  SellerEvidenceViewerModal,
  formatSellerDate,
  formatSellerMoney,
  formatStanceLabel,
  type PreviewableEvidenceItem,
} from "@/components/seller/seller-ui-primitives";
import { SellerSubmissionWizard } from "@/components/seller/seller-submission-wizard";
import { SellerContextualGuide } from "@/components/seller/seller-contextual-guide";

interface RequestDetailModel {
  id: string;
  requestNumber: string;
  status: string;
  statusBucket: string;
  statusLabel: string;
  canRespond: boolean;
  orderDetails: {
    caseId: string;
    caseNumber: string;
    caseCategory: string;
    caseStatus: string;
    orderId: string;
    marketplace: string;
    productName: string;
    amountMinor: number;
    currency: string;
    complaintCategory: string;
    caseCreatedAt: string;
    requestedAt: string;
    viewedAt: string | null;
    respondedAt: string | null;
    dueAt: string | null;
    sellerLegalName: string | null;
    organizationName: string | null;
  };
  customerComplaint: {
    title: string;
    issueSummary: string;
    requestDescription: string;
    sharedBuyerEvidence: Array<{
      id: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      evidenceType: string;
      description: string | null;
      previewUrl: string;
      createdAt: string;
    }>;
  };
  requestedItems: RequestedEvidenceRequirement[];
  dynamicFormConfig: DynamicSellerFormConfig;
  draftResponse: SellerDraftPayload | null;
  responses: Array<{
    id: string;
    stance: string;
    summary: string;
    verificationStatus: string;
    sellerStatusLabel: string;
    responderName: string;
    submittedAt: string;
    evidenceItems: Array<{ id: string; filename: string }>;
  }>;
}

export default function SellerRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = use(params);
  const [detail, setDetail] = useState<RequestDetailModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [previewEvidence, setPreviewEvidence] = useState<PreviewableEvidenceItem | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/seller/requests/${encodeURIComponent(requestId)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to load evidence request");
      }
      const req: RequestDetailModel = data.request;
      setDetail(req);
      if (req.draftResponse && !showForm && req.responses.length === 0) {
        setShowForm(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load evidence request");
    } finally {
      setLoading(false);
    }
  }, [requestId, showForm]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-sm text-[var(--ink-3)]">
        Loading evidence request details...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Link
          href="/seller/requests"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-2)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Evidence Requests
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-500/10 p-6 text-sm text-red-700 dark:text-red-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error || "This evidence request is unavailable or outside your organization."}</span>
        </div>
      </div>
    );
  }

  const hasPreviousResponse = detail.responses.length > 0;
  const ctaButtonText = detail.draftResponse
    ? "Continue Saved Draft"
    : hasPreviousResponse
    ? "Submit Supplemental Information"
    : "Respond to Complaint";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-10">
      {/* Top breadcrumb / return link */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/seller/requests"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-2)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Evidence Requests
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold">
            DEMO / TEST
          </span>
          <SellerStatusPill label={detail.statusLabel} />
          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--ink-3)]">
            <Lock className="h-3 w-3" />
            Buyer personal contacts masked
          </span>
        </div>
      </div>

      {/* Internal Demo Safeguard Banner */}
      <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-3.5 text-xs text-sky-200 flex items-center gap-2.5">
        <Sparkles className="h-4 w-4 text-sky-400 shrink-0" />
        <span>
          <strong>Demonstration Evidence Request:</strong> This evidence request was delivered
          internally to your RESOLVEGRAPH Seller Portal account. Your response and uploaded evidence
          will be saved to the platform&apos;s bilateral evidence graph without external emails or
          third-party communications.
        </span>
      </div>

      <SellerContextualGuide
        guideId="seller-request-detail-pre-response"
        title="Before You Respond"
        compactLabel="Response instructions"
      >
        <p>
          Review the complaint summary, order reference, buyer attachments, and requested items
          below. Your explanation and uploaded records become part of the investigation alongside
          the customer&apos;s evidence. If a requested item is unavailable or inapplicable, you can
          mark it accurately without guessing.
        </p>
      </SellerContextualGuide>

      {/* SECTION A — COMPLAINT AND ORDER INFORMATION */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--line)] pb-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">
              A. Complaint &amp; Order Information
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-[var(--ink)] mt-0.5">
              Complaint {detail.orderDetails.caseNumber}
            </h1>
          </div>
          <span className="font-mono text-xs text-[var(--ink-3)]">
            Request {detail.requestNumber}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs sm:text-sm">
          <div>
            <span className="text-[11px] text-[var(--ink-3)] block">Complaint ID</span>
            <span className="font-mono font-semibold text-[var(--ink)]">
              {detail.orderDetails.caseNumber}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-[var(--ink-3)] block">Shopping Marketplace</span>
            <span className="font-semibold text-[var(--ink)]">
              {detail.orderDetails.marketplace}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-[var(--ink-3)] block">External Order ID</span>
            <span className="font-mono font-semibold text-[var(--ink)] break-all">
              {detail.orderDetails.orderId}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-[var(--ink-3)] block">Purchase Amount</span>
            <span className="font-mono font-semibold text-[var(--ink)]">
              {formatSellerMoney(detail.orderDetails.amountMinor, detail.orderDetails.currency)}
            </span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-[11px] text-[var(--ink-3)] block">Product Name</span>
            <span className="font-semibold text-[var(--ink)] break-words">
              {detail.orderDetails.productName}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-[var(--ink-3)] block">Complaint Category</span>
            <span className="font-medium text-[var(--ink)]">
              {detail.orderDetails.complaintCategory}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-[var(--ink-3)] block">Complaint / Request Dates</span>
            <span className="text-xs text-[var(--ink-2)] block">
              Submitted {formatSellerDate(detail.orderDetails.caseCreatedAt)}
              <br />
              Requested {formatSellerDate(detail.orderDetails.requestedAt)}
            </span>
          </div>
        </div>
      </section>

      {/* SECTION B — CUSTOMER COMPLAINT & SHARED EVIDENCE */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs space-y-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-3)] block">
          B. Customer Complaint
        </span>

        <div className="space-y-1.5">
          <h2 className="text-base sm:text-lg font-bold text-[var(--ink)] break-words">
            {detail.customerComplaint.title}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--ink-2)] leading-relaxed whitespace-pre-line break-words">
            {detail.customerComplaint.issueSummary}
          </p>
        </div>

        <div className="space-y-2.5 pt-2 border-t border-[var(--line)]">
          <h3 className="text-xs font-semibold text-[var(--ink)]">
            Customer Evidence Permitted for Seller Review ({detail.customerComplaint.sharedBuyerEvidence.length})
          </h3>
          {detail.customerComplaint.sharedBuyerEvidence.length === 0 ? (
            <p className="text-xs text-[var(--ink-3)]">
              No customer attachments were shared with participants for this complaint.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {detail.customerComplaint.sharedBuyerEvidence.map((ev) => {
                const isImage = ev.mimeType.startsWith("image/");
                const isVideo = ev.mimeType.startsWith("video/");
                return (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] border border-[var(--line)]">
                        {isImage ? (
                          <ImageIcon className="h-4 w-4 text-blue-600" />
                        ) : isVideo ? (
                          <Video className="h-4 w-4 text-indigo-600" />
                        ) : (
                          <FileText className="h-4 w-4 text-amber-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--ink)] truncate">{ev.filename}</p>
                        <p className="text-[11px] text-[var(--ink-3)]">
                          {ev.evidenceType.replace(/_/g, " ")} ·{" "}
                          {Math.max(1, Math.round(ev.sizeBytes / 1024))} KB
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPreviewEvidence({
                          id: ev.id,
                          filename: ev.filename,
                          mimeType: ev.mimeType,
                          sizeBytes: ev.sizeBytes,
                          previewUrl: ev.previewUrl,
                          description: ev.description,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--accent)] hover:bg-[var(--surface-2)] shrink-0 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* SECTION C — RESOLVEGRAPH EVIDENCE REQUEST */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-3)] block">
            C. RESOLVEGRAPH Evidence Request
          </span>
          <p className="text-xs sm:text-sm text-[var(--ink-2)]">
            {detail.customerComplaint.requestDescription}
          </p>
        </div>

        <ol className="space-y-2 list-none">
          {detail.requestedItems.map((item, idx) => (
            <li
              key={item.key}
              className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/30 p-3 text-xs sm:text-sm"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/12 text-xs font-bold text-[var(--accent)]">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-[var(--ink)]">{item.label}</span>
                <p className="text-xs text-[var(--ink-2)] mt-0.5">{item.description}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* SECTION D — PROMINENT RESPOND CTA */}
        {detail.canRespond && !showForm && (
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:opacity-95 cursor-pointer"
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span>{ctaButtonText}</span>
            </button>
            <span className="text-xs text-[var(--ink-3)]">
              You can navigate back between steps or mark unavailable items without penalty.
            </span>
          </div>
        )}
      </section>

      {/* 4-SECTION SELLER SUBMISSION WIZARD */}
      {showForm && detail.canRespond && (
        <SellerSubmissionWizard
          requestId={detail.id}
          caseNumber={detail.orderDetails.caseNumber}
          orderId={detail.orderDetails.orderId}
          productName={detail.orderDetails.productName}
          complaintCategory={detail.orderDetails.caseCategory}
          isFollowUp={hasPreviousResponse}
          requestedItems={detail.requestedItems}
          dynamicFormConfig={detail.dynamicFormConfig}
          initialDraft={detail.draftResponse}
          onSubmitted={() => {
            void loadDetail();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Existing Submitted Responses summary (if any) */}
      {hasPreviousResponse && (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-[var(--ink)] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Previous Submissions ({detail.responses.length})</span>
            </h2>
            <Link
              href="/seller/responses"
              className="text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              All Submitted Responses
            </Link>
          </div>
          <div className="space-y-2.5">
            {detail.responses.map((resp) => (
              <div
                key={resp.id}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[var(--ink)]">
                      {formatStanceLabel(resp.stance)}
                    </span>
                    <SellerStatusPill label={resp.sellerStatusLabel} />
                    <span className="text-[var(--ink-3)]">
                      {formatSellerDate(resp.submittedAt)}
                    </span>
                  </div>
                  <p className="text-[var(--ink-2)] line-clamp-2">{resp.summary}</p>
                </div>
                <Link
                  href={`/seller/responses/${encodeURIComponent(resp.id)}`}
                  className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)] shrink-0"
                >
                  View Response
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <SellerEvidenceViewerModal
        item={previewEvidence}
        onClose={() => setPreviewEvidence(null)}
      />
    </div>
  );
}
