"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  ExternalLink,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DisputeItem {
  id: string;
  paypalDisputeId: string;
  paypalTransactionId: string | null;
  disputeReason: string;
  lifecycleStage: string;
  paypalStatus: string;
  sellerResponseDueDate: string | null;
  disputeAmountMinor: number;
  currency: string;
  latestSyncedAt: string;
  organization: { id: string; name: string };
  payment: {
    id: string;
    commerceOrder: {
      orderNumber: string;
      buyer: { fullName: string; email: string };
    };
  } | null;
  linkedCase: {
    id: string;
    caseNumber: string;
    title: string;
    status: string;
  } | null;
}

export default function PayPalDisputesPage() {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (statusFilter !== "ALL") query.set("status", statusFilter);

        const res = await fetch(`/api/paypal/disputes?${query.toString()}`);
        if (res.ok && mounted) {
          const data = await res.json();
          setDisputes(data.disputes || []);
        }
      } catch (err) {
        console.error("Failed to load disputes:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [statusFilter]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== "ALL") query.set("status", statusFilter);
      query.set("sync", "true");

      const res = await fetch(`/api/paypal/disputes?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDisputes(data.disputes || []);
      }
    } catch (err) {
      console.error("Failed to sync disputes:", err);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "WAITING_FOR_SELLER_RESPONSE":
        return <Badge tone="warning" dot>Action Required</Badge>;
      case "UNDER_REVIEW":
        return <Badge tone="info" dot>Under Review</Badge>;
      case "RESOLVED":
        return <Badge tone="success" dot>Resolved</Badge>;
      case "OPEN":
        return <Badge tone="brand" dot>Open</Badge>;
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
            <h1 className="text-2xl font-bold tracking-tight text-fg">PayPal Dispute Operations</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              Disputes API
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Track inquiries, chargebacks, seller response deadlines, and compile case evidence for PayPal adjudication.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing API..." : "Sync Sandbox Disputes"}
          </Button>
          <Link href="/payments">
            <Button variant="ghost" size="sm" className="text-xs">
              View Payments Ledger
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 rounded-xl border border-line bg-card/40 p-3 text-xs">
        <span className="text-muted font-medium">Filter Status:</span>
        {["ALL", "WAITING_FOR_SELLER_RESPONSE", "UNDER_REVIEW", "RESOLVED"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`rounded-lg px-3 py-1 font-medium transition-colors ${
              statusFilter === st
                ? "bg-brand/15 text-brand border border-brand/30"
                : "text-muted hover:text-fg hover:bg-surface"
            }`}
          >
            {st === "ALL" ? "All Disputes" : st.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Disputes Table */}
      <div className="overflow-hidden rounded-xl border border-line bg-card/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-surface/70 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">PayPal Dispute ID</th>
                <th className="px-4 py-3 font-medium">Reason & Stage</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Seller Response Due</th>
                <th className="px-4 py-3 font-medium">Linked Case</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    Loading disputes...
                  </td>
                </tr>
              ) : disputes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    No disputes found for this filter.
                  </td>
                </tr>
              ) : (
                disputes.map((d) => (
                  <tr key={d.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-semibold text-fg">{d.paypalDisputeId}</div>
                      {d.paypalTransactionId && (
                        <div className="font-mono text-[10px] text-muted">
                          Tx: {d.paypalTransactionId}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-fg">{d.disputeReason.replace(/_/g, " ")}</div>
                      <div className="text-[10px] text-muted">Stage: {d.lifecycleStage}</div>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-fg">
                      ${(d.disputeAmountMinor / 100).toFixed(2)} {d.currency}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(d.paypalStatus)}</td>
                    <td className="px-4 py-3 text-muted">
                      {d.sellerResponseDueDate ? (
                        <span className="flex items-center gap-1 text-amber-300">
                          <Clock className="h-3 w-3" />
                          {new Date(d.sellerResponseDueDate).toLocaleDateString()}
                        </span>
                      ) : (
                        "None specified"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {d.linkedCase ? (
                        <Link
                          href={`/cases/${d.linkedCase.id}`}
                          className="font-medium text-brand hover:underline inline-flex items-center gap-1"
                        >
                          {d.linkedCase.caseNumber}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-muted">Unlinked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/paypal/disputes/${d.id}`}>
                        <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1">
                          Review & Evidence
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
