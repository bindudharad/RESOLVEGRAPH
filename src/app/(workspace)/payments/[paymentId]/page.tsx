"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  ExternalLink,
  RefreshCw,
  Clock,
  User,
  Building,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefundDialog } from "@/components/payments/refund-dialog";
import { formatCurrency } from "@/lib/utils";
import type { Currency } from "@/lib/types";

interface PaymentDetailData {
  payment: {
    id: string;
    environment: string;
    providerOrderId: string;
    captureId: string | null;
    amountMinor: number;
    currency: string;
    paymentStatus: string;
    intent: string;
    invoiceId: string | null;
    customId: string | null;
    capturedAt: string | null;
    createdAt: string;
    commerceOrder: {
      id: string;
      orderNumber: string;
      status: string;
      buyer: { id: string; fullName: string; email: string };
      merchantOrganization: { id: string; name: string; slug: string };
      case: {
        id: string;
        caseNumber: string;
        title: string;
        status: string;
        resolutionProposals: Array<{
          id: string;
          title: string;
          proposalType: string;
          amountMinor: number | null;
          status: string;
        }>;
      } | null;
      items: Array<{
        id: string;
        productReference: string;
        sku: string | null;
        title: string;
        quantity: number;
        unitAmountMinor: number;
        totalAmountMinor: number;
      }>;
    };
    refunds: Array<{
      id: string;
      paypalRefundId: string | null;
      amountMinor: number;
      currency: string;
      status: string;
      reason: string;
      completedAt: string | null;
      createdAt: string;
      requestedBy: { id: string; fullName: string; email: string };
      approvedBy: { id: string; fullName: string; email: string } | null;
      resolutionProposal: { id: string; title: string } | null;
    }>;
    disputes: Array<{
      id: string;
      paypalDisputeId: string;
      paypalStatus: string;
      disputeReason: string;
      disputeAmountMinor: number;
      currency: string;
    }>;
  };
  remainingRefundableMinor: number;
  canRefund: boolean;
}

interface ReconciliationResult {
  isMatched: boolean;
  discrepancies: string[];
  internalAmountMinor: number;
  providerAmountMinor?: number;
  internalStatus: string;
  providerStatus?: string;
  checkedAt: string;
}

export default function PaymentDetailPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = use(params);
  const [data, setData] = useState<PaymentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRefundDialog, setShowRefundDialog] = useState(false);

  // Reconciliation state
  const [reconciling, setReconciling] = useState(false);
  const [reconciliation, setReconciliation] = useState<ReconciliationResult | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/payments/${paymentId}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to load payment");
        }
        const json = await res.json();
        if (mounted) setData(json);
      } catch (err: unknown) {
        if (mounted) setError(err instanceof Error ? err.message : "Error loading payment");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [paymentId]);

  const handleRefresh = () => {
    fetch(`/api/payments/${paymentId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) setData(json);
      });
  };

  const handleRunReconciliation = async () => {
    setReconciling(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/reconciliation`);
      if (res.ok) {
        const json = await res.json();
        setReconciliation(json.reconciliation);
      }
    } catch (err) {
      console.error("Reconciliation error:", err);
    } finally {
      setReconciling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center p-8 text-sm text-muted">
        Loading payment details...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
          <p className="font-semibold">Unable to load payment</p>
          <p className="mt-1 text-sm">{error || "Payment not found"}</p>
          <Link href="/payments">
            <Button variant="outline" className="mt-4 gap-2 text-xs">
              <ArrowLeft className="h-4 w-4" />
              Back to Payments Ledger
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { payment, remainingRefundableMinor, canRefund } = data;
  const order = payment.commerceOrder;
  const totalRefunded = payment.refunds
    .filter((r) => r.status === "COMPLETED")
    .reduce((sum, r) => sum + r.amountMinor, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/payments">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted">
              <ArrowLeft className="h-4 w-4" />
              Ledger
            </Button>
          </Link>
          <span className="text-muted">/</span>
          <span className="font-mono text-sm font-semibold text-fg">{order.orderNumber}</span>
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400">
            Sandbox
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunReconciliation}
            disabled={reconciling}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${reconciling ? "animate-spin" : ""}`} />
            {reconciling ? "Auditing..." : "Reconcile with PayPal"}
          </Button>

          {canRefund && payment.paymentStatus === "COMPLETED" && remainingRefundableMinor > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowRefundDialog(true)}
              className="gap-2 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Issue Refund
            </Button>
          )}
        </div>
      </div>

      {/* Reconciliation Alert Banner if run */}
      {reconciliation && (
        <div
          className={`rounded-xl border p-4 text-xs ${
            reconciliation.isMatched
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm">
              {reconciliation.isMatched ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Provider State Fully Reconciled
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Discrepancy Detected During Audit
                </>
              )}
            </div>
            <span className="text-[11px] text-muted">
              Audited: {new Date(reconciliation.checkedAt).toLocaleTimeString()}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-4 text-muted sm:grid-cols-4">
            <div>
              <span className="block text-[10px] uppercase">Internal Ledger</span>
              <span className="font-mono text-fg">{formatCurrency(reconciliation.internalAmountMinor / 100, (payment.currency as Currency) || "USD")} ({reconciliation.internalStatus})</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase">PayPal Provider</span>
              <span className="font-mono text-fg">
                {reconciliation.providerAmountMinor !== undefined
                  ? formatCurrency(reconciliation.providerAmountMinor / 100, (payment.currency as Currency) || "USD")
                  : "N/A"}{" "}
                ({reconciliation.providerStatus || "N/A"})
              </span>
            </div>
          </div>

          {reconciliation.discrepancies.length > 0 && (
            <ul className="mt-2 list-disc pl-4 space-y-0.5 text-red-300">
              {reconciliation.discrepancies.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Main Grid: Overview & Financial Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Details & Items */}
        <div className="space-y-6 lg:col-span-2">
          {/* Transaction Metadata Card */}
          <div className="rounded-xl border border-line bg-card/60 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-fg">Transaction Overview</h2>
            <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
              <div>
                <span className="text-muted block">Internal Order</span>
                <span className="font-mono font-medium text-fg">{order.orderNumber}</span>
              </div>
              <div>
                <span className="text-muted block">PayPal Order ID</span>
                <span className="font-mono font-medium text-fg">{payment.providerOrderId}</span>
              </div>
              <div>
                <span className="text-muted block">Capture ID</span>
                <span className="font-mono font-medium text-fg">{payment.captureId || "Pending"}</span>
              </div>
              <div>
                <span className="text-muted block">Buyer</span>
                <span className="font-medium text-fg flex items-center gap-1">
                  <User className="h-3 w-3 text-muted" />
                  {order.buyer.fullName}
                </span>
                <span className="text-[11px] text-muted">{order.buyer.email}</span>
              </div>
              <div>
                <span className="text-muted block">Merchant Organization</span>
                <span className="font-medium text-fg flex items-center gap-1">
                  <Building className="h-3 w-3 text-muted" />
                  {order.merchantOrganization.name}
                </span>
              </div>
              <div>
                <span className="text-muted block">Captured At</span>
                <span className="font-medium text-fg flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted" />
                  {payment.capturedAt ? new Date(payment.capturedAt).toLocaleString() : "Not Captured"}
                </span>
              </div>
            </div>

            {order.case && (
              <div className="mt-3 rounded-lg border border-brand/20 bg-brand/5 p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted block">Linked Dispute Case</span>
                  <span className="font-semibold text-fg">{order.case.caseNumber} — {order.case.title}</span>
                </div>
                <Link href={`/cases/${order.case.id}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs text-brand border-brand/30">
                    View Case
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="rounded-xl border border-line bg-card/60 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-fg">Order Line Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line text-muted">
                  <tr>
                    <th className="pb-2 font-medium">Item & SKU</th>
                    <th className="pb-2 font-medium">Qty</th>
                    <th className="pb-2 font-medium">Unit Price</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5">
                        <div className="font-medium text-fg">{item.title}</div>
                        {item.sku && <div className="font-mono text-[10px] text-muted">{item.sku}</div>}
                      </td>
                      <td className="py-2.5 text-muted">{item.quantity}</td>
                      <td className="py-2.5 font-mono text-muted">{formatCurrency(item.unitAmountMinor / 100, (order.currency as Currency) || "USD")}</td>
                      <td className="py-2.5 text-right font-mono font-medium text-fg">
                        {formatCurrency(item.totalAmountMinor / 100, (order.currency as Currency) || "USD")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Refund Ledger */}
          <div className="rounded-xl border border-line bg-card/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fg">Refund Transactions Ledger</h2>
              <span className="text-xs text-muted">{payment.refunds.length} record(s)</span>
            </div>

            {payment.refunds.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line p-6 text-center text-xs text-muted">
                No refunds have been issued for this transaction.
              </div>
            ) : (
              <div className="divide-y divide-line/60">
                {payment.refunds.map((ref) => (
                  <div key={ref.id} className="py-3 flex items-start justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-fg">
                          -${(ref.amountMinor / 100).toFixed(2)} {ref.currency}
                        </span>
                        <Badge tone={ref.status === "COMPLETED" ? "success" : "neutral"} dot>
                          {ref.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted">Reason: {ref.reason}</p>
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-muted">
                        <span>By: {ref.requestedBy.fullName}</span>
                        {ref.paypalRefundId && <span>PayPal ID: {ref.paypalRefundId}</span>}
                        <span>Date: {new Date(ref.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {ref.resolutionProposal && (
                      <span className="rounded bg-surface px-2 py-1 text-[10px] text-muted border border-line">
                        Agreed Proposal: {ref.resolutionProposal.title}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Financial Balances & Dispute status */}
        <div className="space-y-6">
          {/* Financial Balance Summary */}
          <div className="rounded-xl border border-line bg-card/60 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-fg">Financial Summary</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-muted">
                <span>Gross Captured</span>
                <span className="font-mono font-medium text-fg">{formatCurrency(payment.amountMinor / 100, (payment.currency as Currency) || "USD")}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Total Refunded</span>
                <span className="font-mono font-medium text-amber-400">
                  -{formatCurrency(totalRefunded / 100, (payment.currency as Currency) || "USD")}
                </span>
              </div>
              <div className="border-t border-line pt-2 flex justify-between font-semibold text-fg">
                <span>Retained Balance</span>
                <span className="font-mono text-emerald-400">
                  {formatCurrency(remainingRefundableMinor / 100, (payment.currency as Currency) || "USD")}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-surface/80 p-3 text-xs">
              <span className="text-[11px] text-muted block mb-1">Refund Authorization</span>
              {canRefund ? (
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Authorized Merchant Role</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-muted">
                  <span>View Only (Merchant Agent Required)</span>
                </div>
              )}
            </div>
          </div>

          {/* Linked PayPal Disputes */}
          {payment.disputes.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                <ShieldAlert className="h-4 w-4" />
                <span>Active PayPal Dispute</span>
              </div>
              {payment.disputes.map((d) => (
                <div key={d.id} className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted">Dispute ID:</span>
                    <span className="font-mono text-fg">{d.paypalDisputeId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Status:</span>
                    <span className="font-medium text-amber-300">{d.paypalStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Disputed Amount:</span>
                    <span className="font-mono font-medium text-fg">
                      ${(d.disputeAmountMinor / 100).toFixed(2)}
                    </span>
                  </div>
                  <Link href={`/paypal/disputes/${d.id}`} className="block pt-2">
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1 text-amber-400 border-amber-500/30">
                      Manage Dispute & Evidence
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundDialog && (
        <RefundDialog
          open={showRefundDialog}
          onClose={() => setShowRefundDialog(false)}
          paymentId={payment.id}
          currency={payment.currency}
          capturedAmountMinor={payment.amountMinor}
          remainingRefundableMinor={remainingRefundableMinor}
          agreedProposals={order.case?.resolutionProposals || []}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
