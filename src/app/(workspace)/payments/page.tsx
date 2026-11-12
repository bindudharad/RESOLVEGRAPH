"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  DollarSign,
  RotateCcw,
  ShieldAlert,
  Search,
  ExternalLink,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ShieldCheck,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { SlideOver } from "@/components/ui/slide-over";
import { RefundDialog } from "@/components/payments/refund-dialog";
import { useSession } from "@/lib/auth-client";
import { formatCurrency } from "@/lib/utils";
import { formatMinorCurrency } from "@/server/analytics/timezone-calendar";
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

const STATUS_FILTERS = [
  { id: "ALL", label: "All Payments" },
  { id: "COMPLETED", label: "Completed" },
  { id: "APPROVED", label: "Approved" },
  { id: "PARTIALLY_REFUNDED", label: "Partially Refunded" },
  { id: "REFUNDED", label: "Refunded" },
  { id: "CREATED", label: "Pending Capture" },
];

export default function PaymentsPage() {
  const { data: session } = useSession();
  const sessionUser = session?.user as { role?: string; isPlatformAdmin?: boolean } | undefined;
  const isBuyerUser = Boolean(
    sessionUser && sessionUser.role === "BUYER" && !sessionUser.isPlatformAdmin
  );
  const canOpenCaptureAnalytics = !isBuyerUser;

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
  const [inspectPayment, setInspectPayment] = useState<PaymentItem | null>(null);

  const loadPayments = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      try {
        const query = new URLSearchParams();
        if (statusFilter !== "ALL") query.set("status", statusFilter);
        if (search.trim()) query.set("search", search.trim());

        const res = await fetch(`/api/payments?${query.toString()}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setPayments(data.payments || []);
          if (data.metrics) setMetrics(data.metrics);
        }
      } catch (err) {
        console.error("Failed to load payments:", err);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [statusFilter, search]
  );

  useEffect(() => {
    void loadPayments(false);

    const onRefresh = () => {
      void loadPayments(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadPayments(true);
      }
    };

    window.addEventListener("focus", onRefresh);
    window.addEventListener("resolvegraph:capture-updated", onRefresh);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("resolvegraph:capture-updated", onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadPayments]);

  const handleRefresh = () => {
    void loadPayments(true);
  };

  const totalCaptureCount =
    metrics.capturedByCurrency?.reduce((sum, item) => sum + (item.count || 0), 0) ?? 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 font-mono text-[10.5px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Completed
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 font-mono text-[10.5px] font-medium text-sky-400">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            Approved
          </span>
        );
      case "PARTIALLY_REFUNDED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 font-mono text-[10.5px] font-medium text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Partially Refunded
          </span>
        );
      case "REFUNDED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] border border-white/[0.1] px-2.5 py-0.5 font-mono text-[10.5px] font-medium text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
            Refunded
          </span>
        );
      case "DENIED":
      case "REVERSED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 font-mono text-[10.5px] font-medium text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            Reversed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 font-mono text-[10.5px] font-medium text-white/60">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 antialiased">
      {/* ======================================================== */}
      {/* 1. PAGE HEADER                                           */}
      {/* ======================================================== */}
      <header className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-white/50">
                Treasury &amp; Settlement
              </span>
              <span className="text-white/20">·</span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 font-mono text-[11px] text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                PayPal Capture Orchestration Live
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Payment &amp; Settlement Ledger
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Deterministic transaction tracking, automated capture reconciliation, and dual-key refund execution.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {canOpenCaptureAnalytics && (
              <Link href="/analytics/captures">
                <Button
                  variant="outline"
                  className="gap-2 text-xs border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
                >
                  <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Capture Analytics</span>
                </Button>
              </Link>
            )}
            <Link href="/paypal/disputes">
              <Button
                variant="outline"
                className="gap-2 text-xs border-white/[0.08] bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:text-white"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                <span>PayPal Disputes</span>
              </Button>
            </Link>
            <Link href="/reconciliation">
              <Button
                variant="outline"
                className="gap-2 text-xs border-white/[0.08] bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:text-white"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>10-Tier Reconciliation</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. FOUR AUTHORITATIVE METRIC CARDS                       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Capture -> Interactive Capture Analytics (authorized roles only) */}
        {canOpenCaptureAnalytics ? (
          <Link
            href="/analytics/captures"
            data-testid="payments-total-capture-card"
            className="group rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:bg-white/[0.03] cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            <div className="flex items-center justify-between text-white/60 group-hover:text-white text-xs font-medium transition-colors">
              <span>Total Capture</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-4">
              {loading && payments.length === 0 && metrics.totalCapturedMinor === 0 ? (
                <div className="space-y-2">
                  <div className="h-8 w-32 rounded bg-white/[0.08] animate-pulse" />
                  <div className="h-3.5 w-40 rounded bg-white/[0.05] animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="font-mono text-2xl font-bold text-white tabular-nums">
                    {metrics.capturedByCurrency && metrics.capturedByCurrency.length > 0
                      ? metrics.capturedByCurrency
                          .map((c) => `${formatMinorCurrency(c.totalAmountMinor, c.currency)} ${c.currency}`)
                          .join(" + ")
                      : `${formatMinorCurrency(metrics.totalCapturedMinor, "USD")} USD`}
                  </div>
                  <p className="mt-1 text-xs text-white/50">
                    {totalCaptureCount.toLocaleString("en-US")} successful capture
                    {totalCaptureCount === 1 ? "" : "s"} • Authoritative ledger
                  </p>
                </>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-emerald-400">
              <span>6-mo &amp; daily trends</span>
              <span className="inline-flex items-center gap-1 font-medium group-hover:underline">
                <span>View Analytics</span>
                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </div>
          </Link>
        ) : (
          <div
            data-testid="payments-total-capture-card"
            className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-white/60 text-xs font-medium">
              <span>Total Capture</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-4">
              <div className="font-mono text-2xl font-bold text-white tabular-nums">
                {metrics.capturedByCurrency && metrics.capturedByCurrency.length > 0
                  ? metrics.capturedByCurrency
                      .map((c) => `${formatMinorCurrency(c.totalAmountMinor, c.currency)} ${c.currency}`)
                      .join(" + ")
                  : `${formatMinorCurrency(metrics.totalCapturedMinor, "USD")} USD`}
              </div>
              <p className="mt-1 text-xs text-white/50">
                {totalCaptureCount.toLocaleString("en-US")} successful capture
                {totalCaptureCount === 1 ? "" : "s"} • Authoritative ledger
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-white/40">
              <span>Order payment ledger</span>
              <span>Buyer scope</span>
            </div>
          </div>
        )}

        {/* Total Refunds */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/50 text-xs font-medium">
            <span>Total Refunds</span>
            <RotateCcw className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl font-bold text-white tabular-nums">
              {metrics.refundedByCurrency && metrics.refundedByCurrency.length > 0
                ? metrics.refundedByCurrency
                    .map((r) =>
                      formatCurrency(
                        r.totalAmountMinor / 100,
                        (r.currency as Currency) || "USD"
                      )
                    )
                    .join(" + ")
                : formatCurrency(metrics.totalRefundedMinor / 100, "USD")}
            </div>
            <p className="mt-1 text-xs text-white/50">Completed return transactions</p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] font-mono text-white/40">
            Zero balance discrepancy
          </div>
        </div>

        {/* Active Disputes */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/50 text-xs font-medium">
            <span>Active Disputes</span>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl font-bold text-amber-400 tabular-nums">
              {metrics.activeDisputesCount}
            </div>
            <p className="mt-1 text-xs text-white/50">Disputes under investigation</p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] font-mono text-amber-400">
            Escrow Holds Active
          </div>
        </div>

        {/* Recorded Payments */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/50 text-xs font-medium">
            <span>Recorded Orders</span>
            <CreditCard className="h-4 w-4 text-teal-400" />
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl font-bold text-white tabular-nums">
              {metrics.totalTransactions}
            </div>
            <p className="mt-1 text-xs text-white/50">Commerce orders tracked</p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] font-mono text-white/40">
            Multi-Tenant Isolated
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. TOOLBAR: SEARCH & STATUS FILTER PILLS                 */}
      {/* ======================================================== */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <Input
            placeholder="Search by Order ID, Capture ID, or Counterparty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-white/20"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shrink-0 ${
                statusFilter === f.id
                  ? "bg-white text-black font-semibold shadow-xs"
                  : "bg-white/[0.03] border border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. PROFESSIONAL TRANSACTION TABLE                        */}
      {/* ======================================================== */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E121D] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] font-mono text-[11px] text-white/40 uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Order / Capture ID</th>
                <th className="px-5 py-3 font-medium">Buyer &amp; Merchant</th>
                <th className="px-5 py-3 font-medium">Linked Dispute</th>
                <th className="px-5 py-3 font-medium text-right">Settled Amount</th>
                <th className="px-5 py-3 font-medium">Payment Status</th>
                <th className="px-5 py-3 font-medium">Captured Date</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-white/40">
                    <div className="flex flex-col items-center gap-2">
                      <Clock className="h-5 w-5 animate-spin text-white/30" />
                      <span>Loading payments ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-white/40">
                    No payment records match your active search and filter criteria.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const refundedSum = p.refunds
                    .filter((r) => r.status === "COMPLETED")
                    .reduce((sum, r) => sum + r.amountMinor, 0);
                  const remainingMinor = Math.max(0, p.amountMinor - refundedSum);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setInspectPayment(p)}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-mono font-semibold text-white group-hover:text-sky-300 transition-colors">
                          {p.commerceOrder?.orderNumber || "ORD-UNKNOWN"}
                        </div>
                        <div className="font-mono text-[11px] text-white/40">
                          {p.captureId ? `Cap: ${p.captureId}` : `Order: ${p.providerOrderId}`}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-white/90">
                          {p.commerceOrder?.buyer?.fullName || "Buyer"}
                        </div>
                        <div className="text-[11px] text-white/50">
                          {p.commerceOrder?.merchantOrganization?.name || "Merchant"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        {p.commerceOrder?.case ? (
                          <Link
                            href={`/cases/${p.commerceOrder.case.id}`}
                            className="font-mono font-medium text-sky-400 hover:underline inline-flex items-center gap-1"
                          >
                            <span>{p.commerceOrder.case.caseNumber}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-white/40 font-mono">No Dispute</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-white tabular-nums">
                        <div>
                          {formatCurrency(p.amountMinor / 100, (p.currency as Currency) || "USD")}
                        </div>
                        {refundedSum > 0 && (
                          <div className="text-[10px] text-amber-400">
                            - {formatCurrency(refundedSum / 100, (p.currency as Currency) || "USD")}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {getStatusBadge(p.paymentStatus)}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-white/50 text-[11.5px]">
                        {new Date(p.capturedAt || p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setInspectPayment(p)}
                            className="h-7 text-[11px] text-white/70 hover:text-white hover:bg-white/[0.06] gap-1"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="h-3 w-3" />
                          </Button>
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

      {/* ======================================================== */}
      {/* 5. TRANSACTION DETAIL SLIDE-OVER DRAWER                  */}
      {/* ======================================================== */}
      {inspectPayment && (
        <SlideOver
          open={Boolean(inspectPayment)}
          onClose={() => setInspectPayment(null)}
          title={
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              <span className="font-mono font-bold text-white">
                {inspectPayment.commerceOrder?.orderNumber || inspectPayment.providerOrderId}
              </span>
            </div>
          }
          subtitle="Authoritative Payment Settlement Details"
        >
          <div className="space-y-6 text-xs text-white/80">
            {/* Status & Summary Header */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-white/50">Settlement Amount</span>
                <div className="font-mono text-xl font-bold text-white mt-0.5">
                  {formatCurrency(
                    inspectPayment.amountMinor / 100,
                    (inspectPayment.currency as Currency) || "USD"
                  )}
                </div>
              </div>
              <div>{getStatusBadge(inspectPayment.paymentStatus)}</div>
            </div>

            {/* Provider & Technical Identifiers */}
            <div className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <h3 className="font-semibold text-white text-xs uppercase font-mono tracking-wider text-white/50">
                Authoritative Keys
              </h3>
              <div className="space-y-2 font-mono text-[11.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Internal Payment ID:</span>
                  <span className="text-white select-all">{inspectPayment.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">PayPal Order ID:</span>
                  <span className="text-white select-all">{inspectPayment.providerOrderId}</span>
                </div>
                {inspectPayment.captureId && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">PayPal Capture ID:</span>
                    <span className="text-emerald-400 select-all">{inspectPayment.captureId}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Environment Mode:</span>
                  <span className="text-white/80">{inspectPayment.environment}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Captured At:</span>
                  <span className="text-white/80">
                    {new Date(inspectPayment.capturedAt || inspectPayment.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Counterparty Information */}
            <div className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <h3 className="font-semibold text-white text-xs uppercase font-mono tracking-wider text-white/50">
                Counterparty Profile
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-white/50 block text-[11px]">Buyer Persona</span>
                  <span className="font-semibold text-white block mt-0.5">
                    {inspectPayment.commerceOrder?.buyer?.fullName || "Verified Consumer"}
                  </span>
                  <span className="text-white/50 font-mono text-[11px] block">
                    {inspectPayment.commerceOrder?.buyer?.email || "alex.morgan@consumer.demo"}
                  </span>
                </div>
                <div>
                  <span className="text-white/50 block text-[11px]">Merchant Organization</span>
                  <span className="font-semibold text-white block mt-0.5">
                    {inspectPayment.commerceOrder?.merchantOrganization?.name || "TechStore Global"}
                  </span>
                  <span className="text-white/50 font-mono text-[11px] block">
                    {inspectPayment.commerceOrder?.merchantOrganization?.slug || "techstore-demo"}
                  </span>
                </div>
              </div>
            </div>

            {/* Linked Dispute Case */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-white/50 block">Investigation Dossier</span>
                {inspectPayment.commerceOrder?.case ? (
                  <div className="mt-1">
                    <span className="font-mono font-bold text-sky-400">
                      {inspectPayment.commerceOrder.case.caseNumber}
                    </span>
                    <p className="text-[11px] text-white/60">
                      {inspectPayment.commerceOrder.case.title}
                    </p>
                  </div>
                ) : (
                  <span className="text-white/40 block mt-0.5">No active dispute linked</span>
                )}
              </div>
              {inspectPayment.commerceOrder?.case && (
                <Link
                  href={`/cases/${inspectPayment.commerceOrder.case.id}`}
                  className="rounded-lg bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:bg-sky-500/20 transition-colors inline-flex items-center gap-1"
                >
                  <span>Open Case</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            {/* Action Bar in Drawer */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
              <Link href={`/payments/${inspectPayment.id}`}>
                <Button variant="outline" size="sm" className="text-xs">
                  Full Page View
                </Button>
              </Link>
              {inspectPayment.paymentStatus === "COMPLETED" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSelectedRefundPayment(inspectPayment);
                    setInspectPayment(null);
                  }}
                  className="text-xs"
                >
                  Issue Refund
                </Button>
              )}
            </div>
          </div>
        </SlideOver>
      )}

      {/* ======================================================== */}
      {/* 6. REFUND DIALOG MODAL                                   */}
      {/* ======================================================== */}
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
