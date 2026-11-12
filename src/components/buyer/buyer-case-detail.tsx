/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  RefreshCw,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  CheckCircle2,
  ShieldCheck,
  Package,
  Wallet,
  ExternalLink,
} from "lucide-react";
import type { BuyerComplaintDetailModel } from "@/server/services/buyer-tracking.service";
import {
  formatComplaintTimestamp,
  formatPurchaseAmount,
  formatShortTimelineTimestamp,
} from "@/lib/buyer-date-grouping";
import { validateClientEvidenceFile } from "@/lib/buyer-complaint-config";
import { CustomerStatusBadge } from "./customer-status-badge";
import { ComplaintInvestigationTimeline } from "./complaint-investigation-timeline";
import { notifyNotificationsUpdated } from "@/components/common/notification-panel";

interface BuyerCaseDetailProps {
  caseId: string;
  isModal?: boolean;
  initialFocusEvidence?: boolean;
  onClose?: () => void;
  onComplaintUpdated?: () => void;
}

export function BuyerCaseDetail({
  caseId,
  isModal = false,
  initialFocusEvidence = false,
  onClose,
  onComplaintUpdated,
}: BuyerCaseDetailProps) {
  const [detail, setDetail] = useState<BuyerComplaintDetailModel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [detailsExpanded, setDetailsExpanded] = useState<boolean>(true);

  // Additional evidence uploader state (for re-investigation / active cases)
  const [showUploadPanel, setShowUploadPanel] = useState<boolean>(initialFocusEvidence);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [extraNote, setExtraNote] = useState<string>("");
  const [uploadErr, setUploadErr] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string>("");
  const [marketplaceCopied, setMarketplaceCopied] = useState<boolean>(false);
  const [marketplaceRef, setMarketplaceRef] = useState<string>("");
  const [reportingSupport, setReportingSupport] = useState<boolean>(false);
  const [supportReportError, setSupportReportError] = useState<string>("");
  const [proposalComment, setProposalComment] = useState<string>("");
  const [submittingProposalAction, setSubmittingProposalAction] = useState<
    "ACCEPTED" | "REQUESTED_CHANGES" | "REJECTED" | null
  >(null);
  const [proposalActionError, setProposalActionError] = useState<string>("");
  const [proposalActionSuccess, setProposalActionSuccess] = useState<string>("");
  const uploadSectionRef = useRef<HTMLDivElement>(null);

  const handleReportMarketplaceSupport = async () => {
    if (!detail?.sellerOutreach?.requestId || reportingSupport) return;
    setReportingSupport(true);
    setSupportReportError("");
    try {
      const res = await fetch(
        `/api/complaints/${encodeURIComponent(detail.complaint.id)}/seller-outreach`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: detail.sellerOutreach.requestId,
            ticketReference: marketplaceRef.trim() || undefined,
            note: marketplaceRef.trim()
              ? `Submitted via official ${detail.sellerOutreach.marketplace} Help Centre (Ref: ${marketplaceRef.trim()})`
              : `Submitted via official ${detail.sellerOutreach.marketplace} Help Centre`,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record submission");
      const refreshRes = await fetch(
        `/api/complaints/${encodeURIComponent(detail.complaint.id)}`,
        { cache: "no-store" }
      );
      if (refreshRes.ok) {
        const refreshed = await refreshRes.json();
        const nextDetail = refreshed?.detail ?? refreshed;
        if (nextDetail?.complaint) setDetail(nextDetail);
      }
      onComplaintUpdated?.();
    } catch (err: unknown) {
      setSupportReportError(
        err instanceof Error ? err.message : "Could not record marketplace submission."
      );
    } finally {
      setReportingSupport(false);
    }
  };

  const handleRespondToProposal = async (
    responseAction: "ACCEPTED" | "REQUESTED_CHANGES" | "REJECTED"
  ) => {
    const proposalId = detail?.resolutionSummary?.pendingBuyerProposal?.id;
    if (!proposalId || submittingProposalAction) return;
    if (
      (responseAction === "REJECTED" || responseAction === "REQUESTED_CHANGES") &&
      !proposalComment.trim()
    ) {
      setProposalActionError("Please enter a short reason or requested change note.");
      return;
    }

    setSubmittingProposalAction(responseAction);
    setProposalActionError("");
    setProposalActionSuccess("");
    try {
      const res = await fetch(
        `/api/resolution-proposals/${encodeURIComponent(proposalId)}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            response: responseAction,
            comment: proposalComment.trim() || undefined,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit resolution response.");
      }

      const refreshRes = await fetch(
        `/api/complaints/${encodeURIComponent(detail.complaint.id)}`,
        { cache: "no-store" }
      );
      if (refreshRes.ok) {
        const refreshed = await refreshRes.json();
        const nextDetail = refreshed?.detail ?? refreshed;
        if (nextDetail?.complaint) setDetail(nextDetail);
      }
      setProposalComment("");
      setProposalActionSuccess(
        responseAction === "ACCEPTED"
          ? "Resolution proposal approved. Settlement steps are underway."
          : responseAction === "REQUESTED_CHANGES"
          ? "Your requested changes were submitted to the review team."
          : "Resolution proposal declined and returned for review."
      );
      notifyNotificationsUpdated();
      onComplaintUpdated?.();
    } catch (err: unknown) {
      setProposalActionError(
        err instanceof Error ? err.message : "Could not record your response."
      );
    } finally {
      setSubmittingProposalAction(null);
    }
  };

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      try {
        const res = await fetch(`/api/complaints/${encodeURIComponent(caseId)}`);
        if (!active) return;
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          setErrorMsg(
            errJson.error ||
              (res.status === 403
                ? "Access denied: You do not have permission to view this complaint."
                : "Complaint not found.")
          );
          setLoading(false);
          return;
        }
        const json = (await res.json()) as BuyerComplaintDetailModel;
        if (!active) return;
        setDetail(json);
        setErrorMsg("");
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch buyer complaint detail:", err);
        if (active) {
          setErrorMsg("Unable to load complaint details. Please try again.");
          setLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      active = false;
    };
  }, [caseId]);

  useEffect(() => {
    if (!loading && detail && initialFocusEvidence) {
      const t = setTimeout(() => {
        uploadSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
      return () => clearTimeout(t);
    }
  }, [loading, detail, initialFocusEvidence]);

  const handleCopyId = () => {
    if (!detail) return;
    navigator.clipboard.writeText(detail.complaint.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenUpload = () => {
    setShowUploadPanel(true);
    setTimeout(() => {
      uploadSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const handleSelectExtraFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setUploadErr("");
    const accepted = "application/pdf,image/jpeg,image/png,image/webp,video/mp4,video/webm";
    const next: File[] = [];
    const errs: string[] = [];

    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const msg = validateClientEvidenceFile(f, accepted);
      if (msg) errs.push(msg);
      else next.push(f);
    }

    if (errs.length > 0) setUploadErr(errs.join(" "));
    if (next.length > 0) setExtraFiles((prev) => [...prev, ...next]);
  };

  const handleSubmitExtraEvidence = async () => {
    if (!detail || extraFiles.length === 0 || uploading) return;
    setUploading(true);
    setUploadErr("");
    setUploadSuccessMsg("");

    try {
      const formData = new FormData();
      extraFiles.forEach((f) => formData.append("evidence_files", f));
      if (extraNote.trim()) formData.append("note", extraNote.trim());

      const res = await fetch(`/api/complaints/${encodeURIComponent(detail.complaint.id)}/evidence`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload additional evidence.");
      }

      if (data.detail) {
        setDetail(data.detail);
      }
      setExtraFiles([]);
      setExtraNote("");
      setShowUploadPanel(false);
      setUploadSuccessMsg("Additional evidence uploaded. RESOLVEGRAPH has updated your investigation timeline.");
      notifyNotificationsUpdated();
      onComplaintUpdated?.();
    } catch (err: unknown) {
      setUploadErr(err instanceof Error ? err.message : "Failed to upload additional evidence.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 sm:p-12 text-center bg-white rounded-2xl">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading complaint dossier &amp; timeline...</p>
      </div>
    );
  }

  if (errorMsg || !detail) {
    return (
      <div className="p-8 sm:p-10 text-center bg-white rounded-2xl max-w-2xl mx-auto border border-red-200">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 mb-3">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Unable to Open Complaint</h2>
        <p className="mt-1.5 text-sm text-slate-600">{errorMsg || "Complaint record not found."}</p>
        <div className="mt-6">
          {isModal && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm font-semibold cursor-pointer"
            >
              <span>Close &amp; Return to List</span>
            </button>
          ) : (
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm font-semibold"
            >
              <span>Back to My Complaints</span>
            </Link>
          )}
        </div>
      </div>
    );
  }

  const { complaint, submissionDetails, timeline, resolutionSummary } = detail;
  const formattedAmount = formatPurchaseAmount(complaint.amount, complaint.currency);
  const formattedCreated = formatComplaintTimestamp(complaint.createdAt);
  const canAppendEvidence =
    complaint.rawStatus !== "CLOSED" && complaint.rawStatus !== "ARCHIVED";

  return (
    <div
      className={`flex flex-col bg-white text-slate-900 antialiased ${
        isModal
          ? "h-full md:h-auto md:max-h-[90vh] w-full rounded-none md:rounded-2xl overflow-hidden shadow-2xl border-0 md:border md:border-slate-200"
          : "w-full max-w-5xl mx-auto rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      }`}
    >
      {/* ======================================================== */}
      {/* STICKY COMPLAINT HEADER (PART 5)                         */}
      {/* ======================================================== */}
      <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-7 sm:py-5 z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {!isModal && (
              <Link
                href="/cases"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700 mb-3 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to My Complaints</span>
              </Link>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 font-mono">
                Complaint {complaint.id}
              </h1>
              <button
                type="button"
                onClick={handleCopyId}
                title="Copy Complaint ID"
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
              <CustomerStatusBadge status={complaint.status} size="md" />
            </div>

            <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
                  Platform
                </span>
                <span className="font-semibold text-slate-800">{complaint.platform}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
                  Order ID
                </span>
                <span className="font-mono font-semibold text-slate-800 break-all block">
                  {complaint.orderId}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
                  Product
                </span>
                <span className="font-semibold text-slate-800 break-words block" title={complaint.productName}>
                  {complaint.productName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
                  Purchase amount
                </span>
                <span className="font-semibold text-slate-900">{formattedAmount}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
                  Complaint submitted
                </span>
                <span className="font-medium text-slate-700 block break-words" title={formattedCreated}>
                  {formatShortTimelineTimestamp(complaint.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close complaint details"
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      {/* ======================================================== */}
      {/* SCROLLABLE DETAIL CONTENT                                */}
      {/* ======================================================== */}
      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7 space-y-6 bg-slate-50/40">
        {uploadSuccessMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{uploadSuccessMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT / PRIMARY COLUMN: FLIPKART-STYLE VERTICAL TIMELINE (PART 6–8) */}
          <div className="lg:col-span-7 space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-5">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Investigation &amp; Resolution Tracking
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chronological progress from registration through authorized resolution.
                  </p>
                </div>
                {canAppendEvidence && (
                  <button
                    type="button"
                    onClick={handleOpenUpload}
                    aria-label="Add Evidence"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100/80 transition-colors cursor-pointer shrink-0"
                  >
                    <UploadCloud className="h-3.5 w-3.5 shrink-0" />
                    <span className="sm:hidden">Add</span>
                    <span className="hidden sm:inline">Add Evidence</span>
                  </button>
                )}
              </div>

              <ComplaintInvestigationTimeline
                timeline={timeline}
                onTriggerUploadAdditional={handleOpenUpload}
              />
            </section>

            {/* Customer-Assisted Marketplace Help Centre Fallback Card (Unregistered Seller) */}
            {detail.sellerOutreach?.channel === "CUSTOMER_ASSISTED_HELP_CENTRE" && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-amber-800">
                      {detail.sellerOutreach.requestStatus === "MARKETPLACE_SUPPORT_PENDING"
                        ? "Marketplace Support Contacted (Pending Reply)"
                        : "Customer Action Recommended — Unregistered Seller"}
                    </span>
                    <h3 className="mt-1.5 text-sm font-bold text-slate-900">
                      {detail.sellerOutreach.identifiedSellerName
                        ? `${detail.sellerOutreach.identifiedSellerName} is not registered on RESOLVEGRAPH`
                        : "Identified seller is not registered on RESOLVEGRAPH"}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      RESOLVEGRAPH has no direct portal connection to this unregistered marketplace
                      seller. Submit the prepared message below through the official{" "}
                      {detail.sellerOutreach.marketplace || "Marketplace"} Help Centre and upload
                      their reply screenshot here.
                    </p>
                  </div>
                  {detail.sellerOutreach.marketplaceSupportUrl && (
                    <a
                      href={detail.sellerOutreach.marketplaceSupportUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-semibold shadow-xs shrink-0"
                    >
                      <span>Open Official Help Centre</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                {detail.sellerOutreach.preparedMessageForBuyer && (
                  <div className="rounded-xl border border-amber-200 bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Prepared Evidence Request Message
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(
                            detail.sellerOutreach?.preparedMessageForBuyer || ""
                          );
                          setMarketplaceCopied(true);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>{marketplaceCopied ? "Copied!" : "Copy Message"}</span>
                      </button>
                    </div>
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {detail.sellerOutreach.preparedMessageForBuyer}
                    </pre>
                  </div>
                )}

                {supportReportError && (
                  <p className="text-xs text-red-700 font-medium">{supportReportError}</p>
                )}

                {detail.sellerOutreach.requestStatus === "CUSTOMER_ACTION_REQUIRED" ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={marketplaceRef}
                      onChange={(e) => setMarketplaceRef(e.target.value)}
                      placeholder="Optional Help Centre ticket ID"
                      className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs text-slate-800 flex-1 min-w-[180px]"
                    />
                    <button
                      type="button"
                      disabled={reportingSupport}
                      onClick={handleReportMarketplaceSupport}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>
                        {reportingSupport
                          ? "Recording..."
                          : "I Submitted to Marketplace Support"}
                      </span>
                    </button>
                    {canAppendEvidence && (
                      <button
                        type="button"
                        onClick={handleOpenUpload}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-3 py-1.5 text-xs font-semibold cursor-pointer"
                      >
                        <UploadCloud className="h-3.5 w-3.5 text-blue-600" />
                        <span>Upload Screenshot / Reply</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 bg-white/80 rounded-xl border border-amber-200 px-3 py-2">
                    <span>
                      <strong>Status:</strong> Reported submitted to Help Centre (
                      {detail.sellerOutreach.customerSubmissionNote || "Pending reply"}). Upload any
                      marketplace support response below.
                    </span>
                    {canAppendEvidence && (
                      <button
                        type="button"
                        onClick={handleOpenUpload}
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        <UploadCloud className="h-3.5 w-3.5" />
                        <span>Upload Marketplace Reply</span>
                      </button>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Conditional Additional Evidence Upload Box */}
            {showUploadPanel && canAppendEvidence && (
              <section
                ref={uploadSectionRef}
                className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Upload Additional Supporting Evidence
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Attach requested photos, invoices, or transaction records to continue investigation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUploadPanel(false)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {uploadErr && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{uploadErr}</span>
                  </div>
                )}

                <div>
                  <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-300 bg-white p-4 text-center cursor-pointer hover:bg-blue-50/30 transition-colors">
                    <UploadCloud className="h-6 w-6 text-blue-600 mb-1" />
                    <span className="text-xs font-semibold text-slate-800">
                      Click to select additional photos, PDF invoice, or video
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      JPG, PNG, WEBP, PDF, MP4, WEBM (Max 10 MB each)
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="application/pdf,image/jpeg,image/png,image/webp,video/mp4,video/webm"
                      className="hidden"
                      onChange={(e) => {
                        handleSelectExtraFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>

                  {extraFiles.length > 0 && (
                    <ul className="mt-2.5 space-y-1.5 text-xs">
                      {extraFiles.map((f, i) => (
                        <li
                          key={`${f.name}-${i}`}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5"
                        >
                          <span className="truncate font-medium text-slate-800">{f.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setExtraFiles((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            className="text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label htmlFor="extra-evidence-note" className="block text-xs font-semibold text-slate-800 mb-1">
                    Note about these files (Optional)
                  </label>
                  <input
                    id="extra-evidence-note"
                    type="text"
                    value={extraNote}
                    onChange={(e) => setExtraNote(e.target.value)}
                    placeholder="e.g. Clearer photo showing device serial label"
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={extraFiles.length === 0 || uploading}
                    onClick={handleSubmitExtraEvidence}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Uploading &amp; Re-evaluating...</span>
                      </>
                    ) : (
                      <span>Submit Additional Evidence</span>
                    )}
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN: RESOLUTION SUMMARY (PART 11) + SUBMITTED DETAILS (PART 10) */}
          <div className="lg:col-span-5 space-y-6">
            {/* RESOLUTION SUMMARY CARD */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <span>Resolution Summary</span>
                </h2>
                {resolutionSummary.isCompleted && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Completed
                  </span>
                )}
              </div>

              <div
                className={`rounded-xl p-3.5 text-xs leading-relaxed border ${
                  resolutionSummary.isCompleted
                    ? "border-emerald-200 bg-emerald-50/70 text-emerald-950 font-medium"
                    : resolutionSummary.hasDecision
                    ? "border-blue-200 bg-blue-50/60 text-blue-950 font-medium"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                {resolutionSummary.headline}
              </div>

              {resolutionSummary.hasDecision && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                        Proposed Remedy
                      </span>
                      <span className="font-semibold text-slate-900">
                        {resolutionSummary.recommendedRemedy}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                        Approval Status
                      </span>
                      <span className="font-semibold text-slate-900">
                        {resolutionSummary.approvalStatus || "Pending review"}
                      </span>
                    </div>
                  </div>

                  {resolutionSummary.reasoningSummary && (
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase mb-1">
                        Decision Explanation
                      </span>
                      <p className="text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                        {resolutionSummary.reasoningSummary}
                      </p>
                    </div>
                  )}

                  {resolutionSummary.approvedRemedy && (
                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                          Approved Remedy
                        </span>
                        <span className="font-bold text-emerald-700">
                          {resolutionSummary.approvedRemedy}
                        </span>
                      </div>
                      {resolutionSummary.approvedAt && (
                        <div>
                          <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                            Approved On
                          </span>
                          <span className="font-medium text-slate-800">
                            {formatShortTimelineTimestamp(resolutionSummary.approvedAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {resolutionSummary.pendingBuyerProposal && (
                    <div className="pt-3 border-t border-slate-200 space-y-3">
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                            Confirmation Needed
                          </span>
                          {resolutionSummary.pendingBuyerProposal.amount !== null && (
                            <span className="text-xs font-extrabold text-slate-900">
                              {formatPurchaseAmount(
                                resolutionSummary.pendingBuyerProposal.amount,
                                resolutionSummary.pendingBuyerProposal.currency
                              )}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-900">
                          {resolutionSummary.pendingBuyerProposal.title}
                        </p>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {resolutionSummary.pendingBuyerProposal.description}
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor={`proposal-comment-${complaint.id}`}
                          className="block text-[11px] font-semibold text-slate-600 mb-1"
                        >
                          Optional note (required if requesting changes or declining)
                        </label>
                        <textarea
                          id={`proposal-comment-${complaint.id}`}
                          rows={2}
                          value={proposalComment}
                          onChange={(e) => setProposalComment(e.target.value)}
                          placeholder="Add confirmation notes or explain requested modifications..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {proposalActionError && (
                        <p className="text-xs font-medium text-rose-600">{proposalActionError}</p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={Boolean(submittingProposalAction)}
                          onClick={() => handleRespondToProposal("ACCEPTED")}
                          className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3 py-2 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>
                            {submittingProposalAction === "ACCEPTED" ? "Accepting..." : "Accept Proposal"}
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(submittingProposalAction)}
                          onClick={() => handleRespondToProposal("REQUESTED_CHANGES")}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 px-3 py-2 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <span>
                            {submittingProposalAction === "REQUESTED_CHANGES"
                              ? "Submitting..."
                              : "Request Changes"}
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(submittingProposalAction)}
                          onClick={() => handleRespondToProposal("REJECTED")}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-700 px-3 py-2 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <span>
                            {submittingProposalAction === "REJECTED" ? "Declining..." : "Decline"}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {proposalActionSuccess && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                      {proposalActionSuccess}
                    </div>
                  )}
                </div>
              )}

              {/* Refund Progress Card (only when refund record exists) */}
              {resolutionSummary.refundDetails && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Refund Tracking</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Refund Amount:</span>
                    <span className="font-bold text-slate-900">
                      {formatPurchaseAmount(
                        resolutionSummary.refundDetails.amount,
                        resolutionSummary.refundDetails.currency
                      )}
                    </span>
                  </div>
                  {resolutionSummary.refundDetails.referenceId && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Reference:</span>
                      <span className="font-mono text-slate-800 truncate">
                        {resolutionSummary.refundDetails.referenceId}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Processing Status:</span>
                    <span className="font-semibold text-blue-700">
                      {resolutionSummary.refundDetails.status}
                    </span>
                  </div>
                  {resolutionSummary.refundDetails.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Completed Date:</span>
                      <span className="font-semibold text-emerald-700">
                        {formatShortTimelineTimestamp(resolutionSummary.refundDetails.completedAt)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Replacement Progress Card (only when replacement passport exists) */}
              {resolutionSummary.replacementDetails && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-blue-600" />
                    <span>Replacement Tracking</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Item:</span>
                    <span className="font-semibold text-slate-900 truncate">
                      {resolutionSummary.replacementDetails.itemName}
                    </span>
                  </div>
                  {resolutionSummary.replacementDetails.referenceNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reference:</span>
                      <span className="font-mono text-slate-800">
                        {resolutionSummary.replacementDetails.referenceNumber}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dispatch Status:</span>
                    <span className="font-semibold text-blue-700">
                      {resolutionSummary.replacementDetails.status}
                    </span>
                  </div>
                  {resolutionSummary.replacementDetails.trackingNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tracking Number:</span>
                      <span className="font-mono text-slate-800">
                        {resolutionSummary.replacementDetails.trackingNumber}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* SUBMITTED COMPLAINT DETAILS (PART 10 — READ-ONLY COLLAPSIBLE) */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setDetailsExpanded((p) => !p)}
                className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-50/70 transition-colors border-b border-slate-100 cursor-pointer"
              >
                <h2 className="text-sm font-bold text-slate-900">
                  Submitted Complaint Details
                </h2>
                {detailsExpanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
              </button>

              {detailsExpanded && (
                <div className="p-5 space-y-5 text-xs">
                  {/* Order Information */}
                  <div>
                    <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Order information
                    </h3>
                    <div className="grid grid-cols-2 gap-2.5 bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Platform</span>
                        <span className="font-semibold text-slate-900">
                          {submissionDetails.orderInformation.platform}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Order ID</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {submissionDetails.orderInformation.orderId}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Product name</span>
                        <span className="font-semibold text-slate-900">
                          {submissionDetails.orderInformation.productName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Purchase amount</span>
                        <span className="font-semibold text-slate-900">
                          {formatPurchaseAmount(
                            submissionDetails.orderInformation.amount,
                            submissionDetails.orderInformation.currency
                          )}{" "}
                          ({submissionDetails.orderInformation.currency})
                        </span>
                      </div>
                      {submissionDetails.orderInformation.purchaseDate && (
                        <div className="col-span-2">
                          <span className="text-slate-500 block text-[10px]">Purchase date</span>
                          <span className="font-semibold text-slate-900">
                            {new Date(
                              submissionDetails.orderInformation.purchaseDate
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Complaint Information */}
                  <div>
                    <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Complaint information
                    </h3>
                    <div className="space-y-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Category</span>
                        <span className="font-semibold text-slate-900">
                          {submissionDetails.complaintInformation.category}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Complaint title</span>
                        <span className="font-semibold text-slate-900">
                          {submissionDetails.complaintInformation.title}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Your description</span>
                        <p className="text-slate-700 whitespace-pre-line mt-0.5 leading-relaxed">
                          {submissionDetails.complaintInformation.originalDescription}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Preferred Resolution (Original Verbatim Preference) */}
                  <div>
                    <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Preferred resolution (as submitted)
                    </h3>
                    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-800">
                      <span>{submissionDetails.preferredResolution}</span>
                    </div>
                  </div>

                  {/* Supporting Evidence */}
                  <div>
                    <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Supporting evidence ({submissionDetails.supportingEvidence.length})
                    </h3>
                    {submissionDetails.supportingEvidence.length === 0 ? (
                      <p className="text-slate-500 italic">No files attached yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {submissionDetails.supportingEvidence.map((ev) => (
                          <div
                            key={ev.id}
                            className="flex items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {ev.mimeType.startsWith("image/") ? (
                                <a
                                  href={ev.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 block h-10 w-10 rounded-lg overflow-hidden border border-slate-200 bg-white"
                                >
                                  <img
                                    src={ev.downloadUrl}
                                    alt={ev.filename}
                                    className="h-full w-full object-cover"
                                  />
                                </a>
                              ) : ev.mimeType.startsWith("video/") ? (
                                <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                                  <Video className="h-4 w-4" />
                                </div>
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                  <FileText className="h-4 w-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{ev.filename}</p>
                                <p className="text-[10.5px] text-slate-500">
                                  {ev.slotTag} · {formatShortTimelineTimestamp(ev.createdAt)}
                                </p>
                              </div>
                            </div>
                            <a
                              href={ev.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                              title="Preview or download file"
                            >
                              {ev.mimeType.startsWith("image/") ? (
                                <ImageIcon className="h-4 w-4" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Activity Information */}
                  <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Complaint created on:</span>
                      <span className="font-medium text-slate-700">
                        {formatShortTimelineTimestamp(submissionDetails.activityMetadata.createdAt)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last updated on:</span>
                      <span className="font-medium text-slate-700">
                        {formatShortTimelineTimestamp(submissionDetails.activityMetadata.updatedAt)}
                      </span>
                    </div>
                    {submissionDetails.activityMetadata.latestEventTitle && (
                      <div className="flex justify-between gap-2">
                        <span>Latest milestone:</span>
                        <span className="font-medium text-slate-800 text-right">
                          {submissionDetails.activityMetadata.latestEventTitle}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
