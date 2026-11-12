"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ShieldCheck,
  ShieldAlert,
  Send,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  PlusCircle,
  X,
  FileCheck2,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RequestedEvidenceItem {
  key: string;
  label: string;
  description?: string;
  status?: string;
  required?: boolean;
  sellerNote?: string;
}

interface SellerWorkflowPayload {
  caseId: string;
  caseNumber: string;
  screening: {
    passed: boolean;
    screeningState: string;
    reason: string;
    eligibleDocumentIds: string[];
    flaggedEvidenceIds: string[];
  };
  matches: Array<{
    id: string;
    sourceEvidenceId: string | null;
    sourcePageNumber: number | null;
    sourceExcerpt: string | null;
    extractedLegalName: string | null;
    extractedDisplayName: string | null;
    extractedGstin: string | null;
    extractedPanMasked: string | null;
    extractedAddress: string | null;
    extractedState: string | null;
    extractedMarketplace: string | null;
    extractedMarketplaceSellerId: string | null;
    extractedOrderId: string | null;
    extractedInvoiceNumber: string | null;
    sellerRelationship: string | null;
    detectedEntities: Array<{
      name: string;
      role: string;
      gstin?: string;
      sectionLabel?: string;
      reason: string;
    }>;
    matchedSeller: {
      id: string;
      legalName: string;
      gstin: string | null;
      registrationStatus: string;
      verificationStatus: string;
      linkedOrganization: { id: string; name: string } | null;
    } | null;
    matchOutcome: string;
    matchConfidence: number;
    matchSignals: { signals: string[]; reviewReasons: string[] };
    requiresHumanReview: boolean;
    reviewedBy: string | null;
    reviewedAt: string | null;
    screeningGateStatus: string;
  }>;
  requests: Array<{
    id: string;
    requestNumber: string;
    sellerLegalName: string | null;
    sellerGstin: string | null;
    organizationName: string | null;
    marketplace: string;
    orderId: string;
    productName: string;
    requestDescription: string;
    requestedItems: RequestedEvidenceItem[];
    deliveryChannel: string;
    registrationStatus: string;
    status: string;
    marketplaceSupportUrl: string | null;
    preparedMessageForBuyer: string | null;
    customerReportedSubmissionAt: string | null;
    customerSubmissionNote: string | null;
    dispatchedAt: string | null;
    viewedAt: string | null;
    respondedAt: string | null;
    dueAt: string | null;
    followUpCount: number;
    communicationAttempts: Array<{
      id: string;
      attemptNumber: number;
      channel: string;
      actionType: string;
      executionStatus: string;
      failureReason: string | null;
      executedAt: string;
    }>;
    responses: Array<{
      id: string;
      stance: string;
      summary: string;
      additionalRemarks?: string | null;
      verificationStatus: string;
      responderName: string;
      submittedAt: string;
      evidenceItems: Array<{
        id: string;
        filename: string;
        verificationStatus: string;
        humanReviewRequired: boolean;
      }>;
    }>;
  }>;
  directoryCandidates: Array<{
    id: string;
    legalName: string;
    gstin: string | null;
    registrationStatus: string;
    linkedOrganization: { id: string; name: string } | null;
  }>;
}

const DEFAULT_DEMO_ITEMS = [
  {
    key: "EXACT_PRODUCT_SKU",
    label: "Exact product SKU",
    description: "Itemized manufacturer SKU identifying the specific product model packaged.",
    required: true,
  },
  {
    key: "MANUFACTURER_MODEL_NUMBER",
    label: "Manufacturer model number",
    description: "Hardware model and capacity identifier stamped on product housing and packaging.",
    required: true,
  },
  {
    key: "ORIGINAL_PRODUCT_SPECIFICATIONS",
    label: "Original product specifications",
    description: "Manufacturer specification sheet or catalog specifications confirming storage capacity.",
    required: true,
  },
  {
    key: "PACKING_DECLARATION",
    label: "Packing declaration",
    description: "Fulfillment station or warehouse packing declaration confirming order contents and measured weight.",
    required: true,
  },
  {
    key: "PRODUCT_PHOTOGRAPHS",
    label: "Available product photographs",
    description: "High-resolution photographs of packaged unit, retail packaging, and tamper-evident seals.",
    required: false,
  },
  {
    key: "WAREHOUSE_QC_SERIAL_LOG",
    label: "Warehouse quality-control or serial-number records",
    description: "Warehouse barcode scan log and serial registry recorded during fulfillment.",
    required: false,
  },
];

export function SellerOutreachTab({ caseId }: { caseId: string }) {
  const [data, setData] = useState<SellerWorkflowPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Create Evidence Request Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<"FORM" | "REVIEW">("FORM");
  const [reqSubject, setReqSubject] = useState(
    "Request for Fulfillment & Technical Specifications Evidence — Portable SSD 1TB"
  );
  const [reqDescription, setReqDescription] = useState(
    "Customer reports receiving 512 GB portable SSD instead of the purchased 1 TB model. Please provide itemized packing and serial verification."
  );
  const [selectedItems, setSelectedItems] = useState<typeof DEFAULT_DEMO_ITEMS>(DEFAULT_DEMO_ITEMS);
  const [deadlineHours, setDeadlineHours] = useState(72);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const loadWorkflow = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/seller-workflow`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load seller workflow");
      setData(json);
      if (json.requests && json.requests.length > 0 && !selectedRequestId) {
        setSelectedRequestId(json.requests[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load seller workflow");
    } finally {
      setLoading(false);
    }
  }, [caseId, selectedRequestId]);

  useEffect(() => {
    loadWorkflow();
  }, [loadWorkflow]);

  const handleTriggerWorkflow = async () => {
    setActionBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/seller-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to execute seller identification");
      await loadWorkflow();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setActionBusy(false);
    }
  };

  const handleResolveMatch = async (sellerMatchId: string) => {
    if (!selectedSellerId) return;
    setActionBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/seller-workflow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerMatchId,
          sellerId: selectedSellerId,
          reviewNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to resolve seller match");
      await loadWorkflow();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Match resolution failed");
    } finally {
      setActionBusy(false);
    }
  };

  const handleCreateEvidenceRequest = async () => {
    setCreateSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/seller-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: reqSubject,
          description: reqDescription,
          requestedItems: selectedItems,
          deadlineHours,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create evidence request");
      setSuccessToast(
        json.message ||
          "Demo evidence request successfully delivered to the seller's RESOLVEGRAPH workspace."
      );
      setCreateModalOpen(false);
      await loadWorkflow();
      if (json.request?.id) {
        setSelectedRequestId(json.request.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create evidence request");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleFollowUpAction = async (
    requestId: string,
    action: "FOLLOW_UP" | "MARK_NO_RESPONSE" | "REQUEST_ADDITIONAL_EVIDENCE"
  ) => {
    setActionBusy(true);
    setError(null);
    try {
      const body =
        action === "REQUEST_ADDITIONAL_EVIDENCE"
          ? {
              action,
              prompt: "Please provide serial number / warehouse QC scan log clarifying discrepancy.",
            }
          : action === "MARK_NO_RESPONSE"
          ? { action, reason: "Response SLA window elapsed without seller reply." }
          : { action, message: "Reminder: please submit requested order & fulfillment evidence." };

      const res = await fetch(`/api/seller/requests/${encodeURIComponent(requestId)}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed follow-up action");
      await loadWorkflow();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Follow-up error");
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rg-card p-8 text-xs text-muted">Loading Seller Identification &amp; Outreach...</div>
    );
  }

  if (!data) {
    return (
      <div className="rg-card p-6 text-xs text-red-300">
        {error || "Seller workflow state unavailable."}
      </div>
    );
  }

  const latestMatch = data.matches[0] || null;
  const activeReq =
    data.requests.find((r) => r.id === selectedRequestId) || data.requests[0] || null;

  return (
    <div className="space-y-6">
      {/* Notifications & Toasts */}
      {successToast && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200 flex items-center justify-between gap-2 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-400 hover:text-emerald-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Global Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-2/40 border border-line rounded-xl p-3.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase text-subtle">
            Case {data.caseNumber}
          </span>
          <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-mono border border-line text-fg">
            Seller Outreach Portal
          </span>
          <span className="rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold">
            DEMO / TEST
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadWorkflow} disabled={actionBusy}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setModalStep("FORM");
              setCreateModalOpen(true);
            }}
            disabled={actionBusy}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-xs"
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            Create Evidence Request (Demo)
          </Button>
        </div>
      </div>

      {/* Stage 1: Buyer Evidence Screening Gate */}
      <section className="rg-card p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {data.screening.passed ? (
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-amber-400" />
            )}
            <h3 className="text-sm font-semibold text-fg">
              Buyer Evidence Screening Gate: {data.screening.screeningState}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {data.directoryCandidates.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleTriggerWorkflow} disabled={actionBusy}>
                <Send className="h-3.5 w-3.5 mr-1" />
                Run Seller Identification Engine
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted">{data.screening.reason}</p>
      </section>

      {/* Stage 2 & 3: Role-Aware Extraction & Directory Match */}
      {latestMatch && (
        <section className="rg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase text-subtle">
                Seller Identity &amp; Directory Match
              </span>
              <h3 className="text-base font-semibold text-fg flex items-center gap-2 mt-0.5">
                <Building2 className="h-4 w-4 text-[var(--merchant)]" />
                <span>
                  {latestMatch.matchedSeller?.legalName ||
                    latestMatch.extractedLegalName ||
                    "TechStore Retail Private Limited"}
                </span>
                {latestMatch.matchedSeller?.registrationStatus === "REGISTERED" && (
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                    REGISTERED &amp; VERIFIED
                  </span>
                )}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="rounded-full border border-line px-2.5 py-0.5 text-fg">
                {latestMatch.matchOutcome}
              </span>
              <span className="text-subtle">
                Confidence {Math.round((latestMatch.matchConfidence || 0) * 100)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div>
              <span className="text-subtle block">GSTIN</span>
              <span className="font-mono text-fg">{latestMatch.extractedGstin || "29ABCDE1234F1Z5"}</span>
            </div>
            <div>
              <span className="text-subtle block">Marketplace</span>
              <span className="text-fg">{latestMatch.extractedMarketplace || "Amazon India"}</span>
            </div>
            <div>
              <span className="text-subtle block">Order ID</span>
              <span className="font-mono text-fg">{latestMatch.extractedOrderId || "ORD-20261103-8821"}</span>
            </div>
            <div>
              <span className="text-subtle block">Linked Organization</span>
              <span className="text-fg font-medium">
                {latestMatch.matchedSeller?.linkedOrganization?.name || "TechStore Global Workspace"}
              </span>
            </div>
          </div>

          {latestMatch.detectedEntities.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-mono uppercase text-subtle">
                Document Role Disambiguation (Actual Seller vs Logistics / Billing)
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {latestMatch.detectedEntities.map((ent, idx) => (
                  <div
                    key={`${ent.name}-${idx}`}
                    className="rounded-lg border border-line bg-surface-2/50 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-fg">{ent.name}</span>
                      <span
                        className={`font-mono text-[10px] rounded px-1.5 py-0.5 ${
                          ent.role === "SELLER"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-slate-500/20 text-slate-300"
                        }`}
                      >
                        {ent.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-subtle mt-1">{ent.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {latestMatch.requiresHumanReview && data.directoryCandidates.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-200">
                Investigator Review Required ({latestMatch.matchSignals.reviewReasons[0] || latestMatch.matchOutcome})
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  value={selectedSellerId}
                  onChange={(e) => setSelectedSellerId(e.target.value)}
                  className="rounded-lg border border-line bg-surface px-2.5 py-2 text-xs text-fg"
                >
                  <option value="">Select verified Seller Directory entry...</option>
                  {data.directoryCandidates.map((cand) => (
                    <option key={cand.id} value={cand.id}>
                      {cand.legalName} {cand.gstin ? `(${cand.gstin})` : ""} [{cand.registrationStatus}]
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Investigator verification note"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="rounded-lg border border-line bg-surface px-2.5 py-2 text-xs text-fg"
                />
                <Button
                  size="sm"
                  onClick={() => handleResolveMatch(latestMatch.id)}
                  disabled={!selectedSellerId || actionBusy}
                >
                  Confirm &amp; Execute Gateway
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Stage 4: Communication Gateway Requests & Controls */}
      {data.requests.length > 0 && activeReq && (
        <section className="rg-card p-5 space-y-5">
          {/* Header & Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase text-subtle">
                  Seller Communication Gateway
                </span>
                <span className="rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold">
                  DEMO / TEST
                </span>
              </div>
              <h3 className="text-base font-semibold text-fg mt-0.5 flex items-center gap-2">
                <span>{activeReq.requestNumber}</span>
                <span className="text-muted text-xs font-normal">·</span>
                <span className="text-xs text-subtle font-mono">
                  Channel:{" "}
                  <span className="font-semibold text-emerald-400">
                    RESOLVEGRAPH Seller Portal (Internal Delivery)
                  </span>
                </span>
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {data.requests.length > 1 && (
                <select
                  value={activeReq.id}
                  onChange={(e) => setSelectedRequestId(e.target.value)}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-fg font-mono"
                >
                  {data.requests.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.requestNumber} ({r.status})
                    </option>
                  ))}
                </select>
              )}
              <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-mono text-fg bg-surface">
                {activeReq.status}
              </span>
              {activeReq.deliveryChannel === "SELLER_PORTAL" && (
                <Link href={`/seller/requests/${encodeURIComponent(activeReq.id)}`} target="_blank">
                  <Button variant="outline" size="sm" className="gap-1">
                    <span>Open Seller Portal View</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Internal Demo Notice Banner */}
          <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-3 text-xs text-sky-200 flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-sky-400 shrink-0" />
            <span>
              <strong>Demonstration Delivery Safeguard:</strong> This evidence request was delivered
              directly to the verified seller organization&apos;s RESOLVEGRAPH workspace (
              <span className="font-mono">{activeReq.organizationName || "TechStore Global"}</span>). No real emails or external marketplace messages were transmitted.
            </span>
          </div>

          {/* Request Meta Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-subtle block">Target Organization</span>
              <span className="font-medium text-fg">
                {activeReq.organizationName || "TechStore Global Workspace"}
              </span>
            </div>
            <div>
              <span className="text-subtle block">Order Reference</span>
              <span className="font-mono text-fg">{activeReq.orderId}</span>
            </div>
            <div>
              <span className="text-subtle block">Product Item</span>
              <span className="text-fg">{activeReq.productName || "UltraFast Portable SSD 1TB"}</span>
            </div>
            <div>
              <span className="text-subtle block">Response Deadline</span>
              <span className="font-mono text-amber-300">
                {activeReq.dueAt ? new Date(activeReq.dueAt).toLocaleString() : "72 Hours SLA"}
              </span>
            </div>
          </div>

          {/* Requested Evidence Items Checklist */}
          {activeReq.requestedItems && activeReq.requestedItems.length > 0 && (
            <div className="space-y-2.5 rounded-xl border border-line bg-surface-2/30 p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-mono uppercase text-subtle">
                  Requested Evidence Items ({activeReq.requestedItems.length})
                </p>
                <span className="text-[11px] text-muted font-mono">
                  SLA: Due {activeReq.dueAt ? new Date(activeReq.dueAt).toLocaleDateString() : "in 3 days"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {activeReq.requestedItems.map((item, idx) => (
                  <div
                    key={`${item.key}-${idx}`}
                    className="flex items-start gap-2 rounded-lg border border-line bg-surface/80 p-2.5"
                  >
                    <FileCheck2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-fg">{item.label}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-2 border border-line text-subtle">
                          {item.status || "PENDING"}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-muted mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      {item.sellerNote && (
                        <p className="text-[11px] text-emerald-300 mt-1 italic">
                          Seller Note: {item.sellerNote}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Investigator Follow-Up Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              disabled={actionBusy}
              onClick={() => handleFollowUpAction(activeReq.id, "FOLLOW_UP")}
            >
              <Clock className="h-3.5 w-3.5 mr-1" />
              Send Follow-Up ({activeReq.followUpCount})
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={actionBusy}
              onClick={() =>
                handleFollowUpAction(activeReq.id, "REQUEST_ADDITIONAL_EVIDENCE")
              }
            >
              Request Additional Evidence
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={actionBusy}
              onClick={() => handleFollowUpAction(activeReq.id, "MARK_NO_RESPONSE")}
            >
              Mark NO_RESPONSE
            </Button>
          </div>

          {/* Seller Responses Summary */}
          {activeReq.responses.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-line">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-mono uppercase text-subtle">
                  Seller Responses ({activeReq.responses.length})
                </p>
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Response Received &amp; Graph Synchronized
                </span>
              </div>

              {activeReq.responses.map((resp) => (
                <div
                  key={resp.id}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-fg text-sm">
                        Stance:{" "}
                        <span
                          className={`font-mono px-2 py-0.5 rounded ${
                            resp.stance === "DISAGREE"
                              ? "bg-amber-500/20 text-amber-300"
                              : resp.stance === "AGREE"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-blue-500/20 text-blue-300"
                          }`}
                        >
                          {resp.stance}
                        </span>
                      </span>
                      <span className="text-subtle font-mono">·</span>
                      <span className="text-subtle">
                        Screening:{" "}
                        <span className="font-semibold text-fg">
                          {resp.verificationStatus}
                        </span>
                      </span>
                    </div>
                    <span className="text-subtle font-mono">
                      Submitted by {resp.responderName} on{" "}
                      {new Date(resp.submittedAt).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-subtle block font-semibold mb-1">
                      Seller Explanation:
                    </span>
                    <p className="text-fg bg-surface/70 rounded-lg p-2.5 border border-line leading-relaxed whitespace-pre-wrap">
                      {resp.summary}
                    </p>
                  </div>

                  {resp.additionalRemarks && (
                    <div>
                      <span className="text-subtle block font-semibold mb-1">
                        Additional Remarks:
                      </span>
                      <p className="text-muted text-[11px]">{resp.additionalRemarks}</p>
                    </div>
                  )}

                  {resp.evidenceItems.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-subtle block font-semibold">
                        Uploaded Evidence Artifacts ({resp.evidenceItems.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {resp.evidenceItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-lg border border-line bg-surface p-2"
                          >
                            <span className="font-mono text-fg text-[11px] truncate mr-2">
                              {item.filename}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                item.verificationStatus === "VERIFIED"
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : "bg-amber-500/15 text-amber-300"
                              }`}
                            >
                              {item.verificationStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Communication Attempt Ledger */}
          <div className="space-y-2 pt-2 border-t border-line">
            <p className="text-[11px] font-mono uppercase text-subtle">
              Communication Attempts Ledger ({activeReq.communicationAttempts.length})
            </p>
            {activeReq.communicationAttempts.map((att) => (
              <div
                key={att.id}
                className="rounded-lg border border-line bg-surface-2/40 px-3 py-2 flex flex-wrap items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-semibold text-fg mr-2">#{att.attemptNumber}</span>
                  <span className="text-fg">{att.actionType}</span>
                  <span className="text-subtle ml-2">({att.channel})</span>
                  {att.failureReason && (
                    <span className="text-amber-300 ml-2">— {att.failureReason}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-emerald-400 font-semibold">
                    {att.executionStatus}
                  </span>
                  <span className="text-subtle text-[11px]">
                    {new Date(att.executedAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CREATE EVIDENCE REQUEST MODAL DIALOG */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-fg">
                    Create Seller Evidence Request
                  </h3>
                  <p className="text-[11px] text-subtle">
                    Platform Workspace · Internal Demonstration Workflow
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-lg p-1.5 text-subtle hover:text-fg hover:bg-surface-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Internal Demo Safeguard Warning */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Internal Demonstration Safeguard:</strong>
                  This request will be delivered directly to the registered seller&apos;s RESOLVEGRAPH
                  portal workspace. No external emails, SMTP dispatches, or third-party communications
                  will be transmitted.
                </div>
              </div>

              {/* Verified Seller Identification Card */}
              <div className="rounded-xl border border-line bg-surface-2/40 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-subtle uppercase">
                    Target Seller Organization
                  </span>
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                    VERIFIED MATCH
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-fg">
                      {latestMatch?.matchedSeller?.legalName || "TechStore Retail Private Limited"}
                    </p>
                    <p className="text-[11px] text-muted">
                      Organization:{" "}
                      <span className="font-semibold text-fg">
                        {latestMatch?.matchedSeller?.linkedOrganization?.name ||
                          "TechStore Global Workspace"}
                      </span>
                    </p>
                  </div>
                  <div className="text-right font-mono text-[11px] text-subtle">
                    <p>Order: {latestMatch?.extractedOrderId || "ORD-20261103-8821"}</p>
                    <p>GSTIN: {latestMatch?.extractedGstin || "29ABCDE1234F1Z5"}</p>
                  </div>
                </div>
              </div>

              {modalStep === "FORM" ? (
                <>
                  {/* Subject */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-fg block">
                      Request Subject
                    </label>
                    <input
                      type="text"
                      value={reqSubject}
                      onChange={(e) => setReqSubject(e.target.value)}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-fg block">
                      Investigation Request Context &amp; Discrepancy Description
                    </label>
                    <textarea
                      rows={3}
                      value={reqDescription}
                      onChange={(e) => setReqDescription(e.target.value)}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  {/* Requested Items Checklist */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-fg block">
                        Information &amp; Documents Requested ({selectedItems.length} selected)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedItems(
                            selectedItems.length === DEFAULT_DEMO_ITEMS.length
                              ? []
                              : DEFAULT_DEMO_ITEMS
                          )
                        }
                        className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                      >
                        {selectedItems.length === DEFAULT_DEMO_ITEMS.length
                          ? "Deselect All"
                          : "Select All 6 Demo Items"}
                      </button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {DEFAULT_DEMO_ITEMS.map((item) => {
                        const checked = selectedItems.some((i) => i.key === item.key);
                        return (
                          <div
                            key={item.key}
                            onClick={() => {
                              if (checked) {
                                setSelectedItems(selectedItems.filter((i) => i.key !== item.key));
                              } else {
                                setSelectedItems([...selectedItems, item]);
                              }
                            }}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                              checked
                                ? "border-emerald-500/40 bg-emerald-500/5 text-fg"
                                : "border-line bg-surface-2/20 text-muted hover:bg-surface-2/40"
                            }`}
                          >
                            <div className="mt-0.5">
                              {checked ? (
                                <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Square className="h-4 w-4 text-subtle shrink-0" />
                              )}
                            </div>
                            <div className="text-xs flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-fg">{item.label}</span>
                                {item.required && (
                                  <span className="text-[10px] font-mono text-amber-300">
                                    Required
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted mt-0.5">{item.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Deadline Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-fg block">
                      Seller Response Deadline (SLA Window)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { hours: 24, label: "24 Hours (1 Day)" },
                        { hours: 48, label: "48 Hours (2 Days)" },
                        { hours: 72, label: "72 Hours (3 Days)" },
                      ].map((opt) => (
                        <button
                          key={opt.hours}
                          type="button"
                          onClick={() => setDeadlineHours(opt.hours)}
                          className={`rounded-xl border py-2 px-2 text-xs font-medium cursor-pointer transition-colors ${
                            deadlineHours === opt.hours
                              ? "border-emerald-500 bg-emerald-500/15 text-emerald-200"
                              : "border-line bg-surface text-muted hover:bg-surface-2"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* REVIEW SUMMARY STEP */
                <div className="space-y-4 text-xs">
                  <div className="rounded-xl border border-line bg-surface-2/30 p-4 space-y-3">
                    <h4 className="font-bold text-fg text-sm border-b border-line pb-2">
                      Review Evidence Request Summary
                    </h4>
                    <div>
                      <span className="text-subtle block font-semibold">Subject:</span>
                      <p className="text-fg font-medium">{reqSubject}</p>
                    </div>
                    <div>
                      <span className="text-subtle block font-semibold">Context:</span>
                      <p className="text-fg">{reqDescription}</p>
                    </div>
                    <div>
                      <span className="text-subtle block font-semibold mb-1">
                        Requested Items ({selectedItems.length}):
                      </span>
                      <ul className="list-disc pl-5 space-y-1 text-fg">
                        {selectedItems.map((item) => (
                          <li key={item.key}>
                            <strong>{item.label}</strong>: {item.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-line text-subtle font-mono text-[11px]">
                      <span>Delivery Channel: RESOLVEGRAPH Seller Portal</span>
                      <span>Deadline: {deadlineHours} Hours</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-line bg-surface-2/30">
              {modalStep === "FORM" ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateModalOpen(false)}
                    disabled={createSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setModalStep("REVIEW")}
                    disabled={selectedItems.length === 0 || !reqSubject.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    Review Request &rarr;
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModalStep("FORM")}
                    disabled={createSubmitting}
                  >
                    &larr; Back to Edit
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreateEvidenceRequest}
                    disabled={createSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5 shadow-md"
                  >
                    {createSubmitting ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Delivering to Seller Portal...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Send Evidence Request</span>
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
