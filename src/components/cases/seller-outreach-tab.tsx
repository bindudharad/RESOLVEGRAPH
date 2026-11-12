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
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

export function SellerOutreachTab({ caseId }: { caseId: string }) {
  const [data, setData] = useState<SellerWorkflowPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load seller workflow");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

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
  const latestReq = data.requests[0] || null;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
            <Button variant="outline" size="sm" onClick={loadWorkflow} disabled={actionBusy}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Refresh
            </Button>
            {data.directoryCandidates.length > 0 && (
              <Button size="sm" onClick={handleTriggerWorkflow} disabled={actionBusy}>
                <Send className="h-3.5 w-3.5 mr-1" />
                Run Seller ID &amp; Gateway
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
                    "Unidentified Seller"}
                </span>
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
              <span className="font-mono text-fg">{latestMatch.extractedGstin || "—"}</span>
            </div>
            <div>
              <span className="text-subtle block">Marketplace</span>
              <span className="text-fg">{latestMatch.extractedMarketplace || "—"}</span>
            </div>
            <div>
              <span className="text-subtle block">Order ID</span>
              <span className="font-mono text-fg">{latestMatch.extractedOrderId || "—"}</span>
            </div>
            <div>
              <span className="text-subtle block">Registration State</span>
              <span className="text-fg">
                {latestMatch.matchedSeller?.registrationStatus || "UNREGISTERED"}
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
                Scenario C — Investigator Review Required ({latestMatch.matchSignals.reviewReasons[0] || latestMatch.matchOutcome})
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

      {/* Stage 4: Communication Gateway Request & Follow-Up Controls */}
      {latestReq && (
        <section className="rg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase text-subtle">
                Seller Communication Gateway
              </span>
              <h3 className="text-base font-semibold text-fg mt-0.5">
                {latestReq.requestNumber} · Channel:{" "}
                <span className="font-mono text-[var(--accent)]">
                  {latestReq.deliveryChannel}
                </span>
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-mono text-fg">
                {latestReq.status}
              </span>
              {latestReq.deliveryChannel === "SELLER_PORTAL" && (
                <Link href={`/seller/requests/${encodeURIComponent(latestReq.id)}`}>
                  <Button variant="outline" size="sm">
                    Open Seller Portal View
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Investigator Follow-Up Actions */}
          {data.directoryCandidates.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={actionBusy}
                onClick={() => handleFollowUpAction(latestReq.id, "FOLLOW_UP")}
              >
                <Clock className="h-3.5 w-3.5 mr-1" />
                Send Follow-Up ({latestReq.followUpCount})
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={actionBusy}
                onClick={() =>
                  handleFollowUpAction(latestReq.id, "REQUEST_ADDITIONAL_EVIDENCE")
                }
              >
                Request Additional Evidence
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={actionBusy}
                onClick={() => handleFollowUpAction(latestReq.id, "MARK_NO_RESPONSE")}
              >
                Mark NO_RESPONSE
              </Button>
            </div>
          )}

          {/* Customer-Assisted Marketplace Fallback Preview */}
          {latestReq.deliveryChannel === "CUSTOMER_ASSISTED_HELP_CENTRE" && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-amber-200">
                  Unregistered Marketplace Seller — Official Help Centre Fallback
                </span>
                {latestReq.marketplaceSupportUrl && (
                  <a
                    href={latestReq.marketplaceSupportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline font-medium"
                  >
                    Official {latestReq.marketplace} Help Centre
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {latestReq.preparedMessageForBuyer && (
                <div className="relative rounded-lg border border-line bg-surface p-3 font-mono text-[11px] text-fg whitespace-pre-wrap">
                  {latestReq.preparedMessageForBuyer}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(latestReq.preparedMessageForBuyer || "");
                      setCopiedId(latestReq.id);
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--accent)] cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                    {copiedId === latestReq.id ? "Copied" : "Copy Message"}
                  </button>
                </div>
              )}
              {latestReq.customerReportedSubmissionAt && (
                <p className="text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Customer reported submission at{" "}
                  {new Date(latestReq.customerReportedSubmissionAt).toLocaleString()} (Note:{" "}
                  {latestReq.customerSubmissionNote})
                </p>
              )}
            </div>
          )}

          {/* Communication Attempt Ledger */}
          <div className="space-y-2">
            <p className="text-[11px] font-mono uppercase text-subtle">
              Communication Attempts ({latestReq.communicationAttempts.length})
            </p>
            {latestReq.communicationAttempts.map((att) => (
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
                <span className="font-mono text-[11px] text-fg">{att.executionStatus}</span>
              </div>
            ))}
          </div>

          {/* Seller Responses Summary */}
          {latestReq.responses.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-line">
              <p className="text-[11px] font-mono uppercase text-subtle">
                Seller Responses ({latestReq.responses.length})
              </p>
              {latestReq.responses.map((resp) => (
                <div
                  key={resp.id}
                  className="rounded-lg border border-line bg-surface-2/60 p-3 space-y-1.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between">
                    <span className="font-semibold text-fg">
                      {resp.stance} · Screening: {resp.verificationStatus}
                    </span>
                    <span className="text-subtle">
                      {new Date(resp.submittedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-muted">{resp.summary}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
