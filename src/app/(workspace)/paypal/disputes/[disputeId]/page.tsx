"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  FileCheck,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PackageCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";

interface DisputeDetailData {
  dispute: {
    id: string;
    paypalDisputeId: string;
    paypalTransactionId: string | null;
    disputeReason: string;
    lifecycleStage: string;
    paypalStatus: string;
    sellerResponseDueDate: string | null;
    disputeAmountMinor: number;
    currency: string;
    organization: { id: string; name: string };
    payment: {
      id: string;
      providerOrderId: string;
      captureId: string | null;
      commerceOrder: {
        orderNumber: string;
        buyer: { fullName: string; email: string };
        items: Array<{ title: string; quantity: number; unitAmountMinor: number }>;
      };
    } | null;
    linkedCase: {
      id: string;
      caseNumber: string;
      title: string;
      status: string;
      evidence: Array<{
        id: string;
        filename: string;
        evidenceType: string;
        mimeType: string;
        visibility: string;
      }>;
    } | null;
    allowedActions: string[];
  };
}

export default function DisputeDetailPage({
  params,
}: {
  params: Promise<{ disputeId: string }>;
}) {
  const { disputeId } = use(params);
  const [data, setData] = useState<DisputeDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Evidence submission state
  const [evidenceType, setEvidenceType] = useState("PROOF_OF_FULFILLMENT");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [evidenceSuccess, setEvidenceSuccess] = useState<string | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  // Accept claim state
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/paypal/disputes/${disputeId}`);
        if (!res.ok) {
          const errJson = await res.json();
          throw new Error(errJson.error || "Failed to load dispute");
        }
        const json = await res.json();
        if (mounted) setData(json);
      } catch (err: unknown) {
        if (mounted) setError(err instanceof Error ? err.message : "Error loading dispute");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [disputeId]);

  const handleRefresh = () => {
    fetch(`/api/paypal/disputes/${disputeId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) setData(json);
      });
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEvidence(true);
    setEvidenceError(null);
    setEvidenceSuccess(null);

    try {
      const res = await fetch(`/api/paypal/disputes/${disputeId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceType,
          note: evidenceNote.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to submit evidence");
      }

      setEvidenceSuccess("Case evidence compiled and successfully transmitted to PayPal!");
      handleRefresh();
    } catch (err: unknown) {
      setEvidenceError(err instanceof Error ? err.message : "Failed to submit evidence");
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  const handleAcceptClaim = async () => {
    if (!confirm("Are you sure you want to accept this claim? PayPal will close the dispute in the buyer's favor.")) {
      return;
    }

    setIsAccepting(true);
    try {
      const res = await fetch(`/api/paypal/disputes/${disputeId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPT_CLAIM" }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to accept claim");
      }

      setAcceptSuccess(true);
      handleRefresh();
    } catch (err: unknown) {
      alert(`Error accepting claim: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center p-8 text-sm text-muted">
        Loading dispute details...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
          <p className="font-semibold">Unable to load dispute</p>
          <p className="mt-1 text-sm">{error || "Dispute not found"}</p>
          <Link href="/paypal/disputes">
            <Button variant="outline" className="mt-4 gap-2 text-xs">
              <ArrowLeft className="h-4 w-4" />
              Back to Disputes
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { dispute } = data;
  const c = dispute.linkedCase;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Top Breadcrumbs & Status */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/paypal/disputes">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted">
              <ArrowLeft className="h-4 w-4" />
              Disputes
            </Button>
          </Link>
          <span className="text-muted">/</span>
          <span className="font-mono text-sm font-semibold text-fg">{dispute.paypalDisputeId}</span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
            {dispute.lifecycleStage}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {dispute.allowedActions.includes("ACCEPT_CLAIM") && dispute.paypalStatus !== "RESOLVED" && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleAcceptClaim}
              disabled={isAccepting}
              className="text-xs"
            >
              {isAccepting ? "Accepting..." : "Accept Dispute Claim"}
            </Button>
          )}
        </div>
      </div>

      {acceptSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          <span>Claim accepted. The dispute has been closed in the buyer&apos;s favor on PayPal.</span>
        </div>
      )}

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Details & Evidence Compiler */}
        <div className="space-y-6 lg:col-span-2">
          {/* Dispute Metadata */}
          <div className="rounded-xl border border-line bg-card/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fg">Dispute Information</h2>
              <Badge tone={dispute.paypalStatus === "RESOLVED" ? "success" : "warning"} dot>
                {dispute.paypalStatus}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
              <div>
                <span className="text-muted block">Dispute Reason</span>
                <span className="font-medium text-fg">{dispute.disputeReason.replace(/_/g, " ")}</span>
              </div>
              <div>
                <span className="text-muted block">Disputed Amount</span>
                <span className="font-mono font-semibold text-fg">
                  ${(dispute.disputeAmountMinor / 100).toFixed(2)} {dispute.currency}
                </span>
              </div>
              <div>
                <span className="text-muted block">Seller Response Due</span>
                <span className="font-medium text-amber-300 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {dispute.sellerResponseDueDate
                    ? new Date(dispute.sellerResponseDueDate).toLocaleDateString()
                    : "None specified"}
                </span>
              </div>
              <div>
                <span className="text-muted block">PayPal Transaction</span>
                <span className="font-mono text-fg">{dispute.paypalTransactionId || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted block">Merchant Organization</span>
                <span className="font-medium text-fg">{dispute.organization.name}</span>
              </div>
            </div>
          </div>

          {/* Evidence Compiler Panel */}
          <div className="rounded-xl border border-line bg-card/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-brand" />
                  Case Evidence Compiler
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Package verified case records and transmit directly into PayPal Dispute Evidence.
                </p>
              </div>
            </div>

            {evidenceSuccess && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{evidenceSuccess}</span>
              </div>
            )}

            {evidenceError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{evidenceError}</span>
              </div>
            )}

            {c ? (
              <form onSubmit={handleSubmitEvidence} className="space-y-4 text-xs">
                <div>
                  <label className="mb-1 block font-medium text-muted">Available Case Documents</label>
                  <div className="divide-y divide-line rounded-lg border border-line bg-surface/50 p-2 max-h-48 overflow-y-auto">
                    {c.evidence.map((ev) => (
                      <div key={ev.id} className="py-2 px-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-3.5 w-3.5 text-brand" />
                          <span className="font-medium text-fg">{ev.filename}</span>
                        </div>
                        <Badge tone="neutral">{ev.evidenceType}</Badge>
                      </div>
                    ))}
                  </div>
                  <span className="mt-1 block text-[11px] text-muted">
                    {c.evidence.length} authorized items will be referenced in the PayPal evidence submission.
                  </span>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-muted">PayPal Evidence Type</label>
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value)}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg focus:border-brand focus:outline-none"
                  >
                    <option value="PROOF_OF_FULFILLMENT">Proof of Fulfillment / Shipment</option>
                    <option value="PROOF_OF_DELIVERY">Proof of Delivery</option>
                    <option value="PROOF_OF_DAMAGE_OR_SIGNIFICANT_DIFFERENCE">Damage or Difference Inspection</option>
                    <option value="PROOF_OF_REFUND_OUTSIDE_PAYPAL">Proof of Prior Refund</option>
                    <option value="OTHER">Other Grounded Documentation</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-muted">Statement / Notes for PayPal Reviewer</label>
                  <Textarea
                    value={evidenceNote}
                    onChange={(e) => setEvidenceNote(e.target.value)}
                    placeholder="Provide explanatory context for the PayPal claims analyst..."
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingEvidence || dispute.paypalStatus === "RESOLVED"}
                  className="gap-2 text-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSubmittingEvidence ? "Submitting..." : "Compile & Submit Evidence to PayPal"}
                </Button>
              </form>
            ) : (
              <div className="rounded-lg border border-dashed border-line p-6 text-center text-xs text-muted">
                This PayPal dispute is not linked to an internal ResolveGraph case yet. Link a case from the payments ledger to compile evidence.
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Linked Case & Allowed Actions */}
        <div className="space-y-6">
          {/* Linked Case Card */}
          {c && (
            <div className="rounded-xl border border-line bg-card/60 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-fg">Linked ResolveGraph Case</h2>
              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted">Case Number:</span>
                  <span className="font-mono font-semibold text-brand">{c.caseNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Status:</span>
                  <span className="font-medium text-fg">{c.status}</span>
                </div>
                <div className="text-muted mt-1">{c.title}</div>
                <Link href={`/cases/${c.id}`} className="block pt-2">
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                    Open Case Investigation
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Permitted PayPal Actions */}
          <div className="rounded-xl border border-line bg-card/60 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-fg">Permitted Actions</h2>
            <div className="space-y-1.5 text-xs">
              {dispute.allowedActions.length === 0 ? (
                <span className="text-muted">No further actions available on this dispute.</span>
              ) : (
                dispute.allowedActions.map((act) => (
                  <div key={act} className="flex items-center gap-2 rounded bg-surface/70 px-2.5 py-1.5 border border-line">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="font-mono text-[11px] text-fg">{act}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
