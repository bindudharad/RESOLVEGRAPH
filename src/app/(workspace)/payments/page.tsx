"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  DollarSign,
  RotateCcw,
  ShieldAlert,
  Search,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { RefundDialog } from "@/components/payments/refund-dialog";
import { formatCurrency } from "@/lib/utils";
import type { Currency } from "@/lib/types";

interface PaymentItem {
  id: string;
  providerOrderId: string;
  captureId: string | null;
  environment: string;
  amountMinor: number;
  currency: string;
  paymentStatus: string;
  capturedAt: string | null;
  createdAt: string;
  commerceOrder: {
    id: string;
    orderNumber: string;
    buyer: { id: string; fullName: string; email: string };
    merchantOrganization: { id: string; name: string; slug: string };
    case: { id: string; caseNumber: string; status: string; title: string } | null;
  };
  refunds: Array<{ id: string; amountMinor: number; status: string }>;
  disputes: Array<{ id: string; paypalDisputeId: string; paypalStatus: string }>;
}

interface PaymentMetrics {
  totalCapturedMinor: number;
  totalRefundedMinor: number;
  capturedByCurrency?: Array<{ currency: string; totalAmountMinor: number; count: number }>;
  refundedByCurrency?: Array<{ currency: string; totalAmountMinor: number; count: number }>;
  activeDisputesCount: number;
  totalTransactions: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [metrics, setMetrics] = useState<PaymentMetrics>({
    totalCapturedMinor: 0,
    totalRefundedMinor: 0,
    activeDisputesCount: 0,
    totalTransactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedRefundPayment, setSelectedRefundPayment] = useState<PaymentItem | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (statusFilter !== "ALL") query.set("status", statusFilter);
        if (search.trim()) query.set("search", search.trim());

        const res = await fetch(`/api/payments?${query.toString()}`);
        if (res.ok && mounted) {
          const data = await res.json();
          setPayments(data.payments || []);
          if (data.metrics) setMetrics(data.metrics);
        }
      } catch (err) {
        console.error("Failed to load payments:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [statusFilter, search]);

  const handleRefresh = () => {
    const query = new URLSearchParams();
    if (statusFilter !== "ALL") query.set("status", statusFilter);
    if (search.trim()) query.set("search", search.trim());

    fetch(`/api/payments?${query.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setPayments(data.payments || []);
          if (data.metrics) setMetrics(data.metrics);
        }
      });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge tone="success" dot>Completed</Badge>;
      case "APPROVED":
        return <Badge tone="info" dot>Approved</Badge>;
      case "PARTIALLY_REFUNDED":
        return <Badge tone="warning" dot>Partially Refunded</Badge>;
      case "REFUNDED":
        return <Badge tone="neutral" dot>Refunded</Badge>;
      case "DENIED":
      case "REVERSED":
        return <Badge tone="danger" dot>Reversed</Badge>;
      default:
        return <Badge tone="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-fg">Payment & Refund Ledger</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
              PayPal Sandbox
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Auditable commerce transactions, server-side PayPal order captures, and merchant refund controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/paypal/disputes">
            <Button variant="outline" className="gap-2 text-xs">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              PayPal Disputes
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium">Captured Volume</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-fg">
            {metrics.capturedByCurrency && metrics.capturedByCurrency.length > 0
              ? metrics.capturedByCurrency.map((c) => formatCurrency(c.totalAmountMinor / 100, (c.currency as Currency) || "USD")).join(" + ")
              : formatCurrency(metrics.totalCapturedMinor / 100, "USD")}
          </div>
          <p className="mt-1 text-[11px] text-muted">Authoritative ledger capture total</p>
        </div>

        <div className="rounded-xl border border-line bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium">Total Refunds</span>
            <RotateCcw className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-fg">
            {metrics.refundedByCurrency && metrics.refundedByCurrency.length > 0
              ? metrics.refundedByCurrency.map((r) => formatCurrency(r.totalAmountMinor / 100, (r.currency as Currency) || "USD")).join(" + ")
              : formatCurrency(metrics.totalRefundedMinor / 100, "USD")}
          </div>
          <p className="mt-1 text-[11px] text-muted">Completed refund transactions</p>
        </div>

        <div className="rounded-xl border border-line bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium">Active Disputes</span>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">
            {metrics.activeDisputesCount}
          </div>
          <p className="mt-1 text-[11px] text-muted">Awaiting merchant or PayPal review</p>
        </div>

        <div className="rounded-xl border border-line bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-medium">Recorded Payments</span>
            <CreditCard className="h-4 w-4 text-brand" />
          </div>
          <div className="mt-2 text-2xl font-bold text-fg">
            {metrics.totalTransactions}
          </div>
          <p className="mt-1 text-[11px] text-muted">Commerce orders tracked</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <Input
            placeholder="Search by Order ID, Capture ID, or Order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg focus:border-brand focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="APPROVED">Approved</option>
            <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
            <option value="REFUNDED">Refunded</option>
            <option value="CREATED">Created (Pending Capture)</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="overflow-hidden rounded-xl border border-line bg-card/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-surface/70 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Order / Capture ID</th>
                <th className="px-4 py-3 font-medium">Buyer & Merchant</th>
                <th className="px-4 py-3 font-medium">Linked Case</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    Loading payments ledger...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    No payment records found matching your filters.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const refundedSum = p.refunds
                    .filter((r) => r.status === "COMPLETED")
                    .reduce((sum, r) => sum + r.amountMinor, 0);
                  const remainingMinor = Math.max(0, p.amountMinor - refundedSum);

                  return (
                    <tr key={p.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono font-semibold text-fg">
                          {p.commerceOrder?.orderNumber || "ORD-UNKNOWN"}
                        </div>
                        <div className="font-mono text-[11px] text-muted">
                          {p.captureId ? `Cap: ${p.captureId}` : `Order: ${p.providerOrderId}`}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-fg">
                          {p.commerceOrder?.buyer?.fullName || "Buyer"}
                        </div>
                        <div className="text-[11px] text-muted">
                          {p.commerceOrder?.merchantOrganization?.name || "Merchant"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.commerceOrder?.case ? (
                          <Link
                            href={`/cases/${p.commerceOrder.case.id}`}
                            className="font-medium text-brand hover:underline inline-flex items-center gap-1"
                          >
                            {p.commerceOrder.case.caseNumber}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-muted">Unlinked</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono font-semibold text-fg">
                          {formatCurrency(p.amountMinor / 100, (p.currency as Currency) || "USD")}
                        </div>
                        {refundedSum > 0 && (
                          <div className="text-[10px] text-amber-400">
                            Refunded: {formatCurrency(refundedSum / 100, (p.currency as Currency) || "USD")}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(p.paymentStatus)}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {new Date(p.capturedAt || p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.paymentStatus === "COMPLETED" && remainingMinor > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRefundPayment(p)}
                              className="h-7 text-[11px] text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                            >
                              Refund
                            </Button>
                          )}
                          <Link href={`/payments/${p.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1">
                              Details
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Dialog Modal */}
      {selectedRefundPayment && (
        <RefundDialog
          open={Boolean(selectedRefundPayment)}
          onClose={() => setSelectedRefundPayment(null)}
          paymentId={selectedRefundPayment.id}
          currency={selectedRefundPayment.currency}
          capturedAmountMinor={selectedRefundPayment.amountMinor}
          remainingRefundableMinor={
            selectedRefundPayment.amountMinor -
            selectedRefundPayment.refunds
              .filter((r) => r.status === "COMPLETED")
              .reduce((sum, r) => sum + r.amountMinor, 0)
          }
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
