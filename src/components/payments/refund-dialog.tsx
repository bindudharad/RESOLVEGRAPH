"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";

interface RefundDialogProps {
  open: boolean;
  onClose: () => void;
  paymentId: string;
  currency?: string;
  capturedAmountMinor: number;
  remainingRefundableMinor: number;
  agreedProposals?: Array<{
    id: string;
    title: string;
    amountMinor?: number | null;
  }>;
  onSuccess?: () => void;
}

export function RefundDialog({
  open,
  onClose,
  paymentId,
  currency = "USD",
  remainingRefundableMinor,
  agreedProposals = [],
  onSuccess,
}: RefundDialogProps) {
  const [refundType, setRefundType] = useState<"FULL" | "PARTIAL">("FULL");
  const [partialAmount, setPartialAmount] = useState<string>(
    (remainingRefundableMinor / 100).toFixed(2)
  );
  const [reason, setReason] = useState("");
  const [selectedProposalId, setSelectedProposalId] = useState<string>(
    agreedProposals[0]?.id || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const maxDecimal = (remainingRefundableMinor / 100).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    let amountMinor: number | undefined;
    if (refundType === "PARTIAL") {
      const parsedNum = parseFloat(partialAmount);
      if (isNaN(parsedNum) || parsedNum <= 0) {
        setErrorMessage("Please enter a valid partial refund amount greater than 0.");
        return;
      }
      amountMinor = Math.round(parsedNum * 100);
      if (amountMinor > remainingRefundableMinor) {
        setErrorMessage(
          `Refund amount exceeds remaining refundable balance of $${maxDecimal}`
        );
        return;
      }
    } else {
      amountMinor = remainingRefundableMinor;
    }

    if (!reason.trim()) {
      setErrorMessage("Please provide a reason for the refund.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountMinor,
          reason: reason.trim(),
          resolutionProposalId: selectedProposalId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process refund");
      }

      setSuccessMessage("Refund successfully authorized and completed via PayPal!");
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("resolvegraph:capture-updated", {
            detail: { type: "refund", paymentId },
          })
        );
      }
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Authorize Payment Refund"
      description={`Issue an authoritative merchant refund via PayPal Sandbox for payment ${paymentId.slice(0, 12)}...`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="rounded-lg border border-line bg-card/50 p-3">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Available Refundable Balance</span>
            <span className="font-mono text-sm font-semibold text-fg">
              {currency} ${maxDecimal}
            </span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Refund Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setRefundType("FULL");
                setPartialAmount(maxDecimal);
              }}
              className={`rounded-lg border p-2 text-center text-xs font-medium transition-colors ${
                refundType === "FULL"
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-line bg-surface hover:bg-surface-elevated text-muted"
              }`}
            >
              Full Refund (${maxDecimal})
            </button>
            <button
              type="button"
              onClick={() => setRefundType("PARTIAL")}
              className={`rounded-lg border p-2 text-center text-xs font-medium transition-colors ${
                refundType === "PARTIAL"
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-line bg-surface hover:bg-surface-elevated text-muted"
              }`}
            >
              Partial Refund
            </button>
          </div>
        </div>

        {refundType === "PARTIAL" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Refund Amount ({currency})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-muted">$</span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={maxDecimal}
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                className="pl-7"
                required
              />
            </div>
          </div>
        )}

        {agreedProposals.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Linked Resolution Proposal (Agreed by Parties)
            </label>
            <select
              value={selectedProposalId}
              onChange={(e) => setSelectedProposalId(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg focus:border-brand focus:outline-none"
            >
              <option value="">None / Standalone Merchant Action</option>
              {agreedProposals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} {p.amountMinor ? `($${(p.amountMinor / 100).toFixed(2)})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Reason for Refund (Required for Ledger Audit)
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Mutual dispute settlement, damaged goods discount, return accepted..."
            rows={2}
            required
          />
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] text-amber-300">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>
            Financial authorization requirement: Only verified merchant agents and managers can
            issue refunds.
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Authorize Refund"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
