"use client";

import { useEffect, useState } from "react";
import {
  Layers,
  AlertTriangle,
  RefreshCw,
  Scale,
  FileSpreadsheet,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Mismatch {
  id: string;
  mismatchType: string;
  severity: string;
  description: string;
  sourceA: string;
  sourceB: string;
  suggestedAction: string;
  isResolved: boolean;
}

interface MatchingDecision {
  id: string;
  sourceAId: string;
  sourceBId: string;
  outcome: "MATCHED" | "REVIEW" | "UNMATCHED" | "CONFLICT";
  confidenceScore: number;
  matchedFields: string[];
  conflictingFields: string[];
  explanation: string;
}

interface SourceRecord {
  id: string;
  sourceType: string;
  providerName: string;
  claimedReference: string;
  claimedAmountMinor: number;
  claimedCurrency: string;
  claimedStatus: string;
}

interface CanonicalTx {
  id: string;
  caseId: string;
  canonicalReference: string;
  grossAmountMinor: number;
  feeAmountMinor: number;
  netAmountMinor: number;
  currency: string;
  normalizedStatus: string;
  reconciliationState: string;
  sourceRecords: SourceRecord[];
  matchingDecisions: MatchingDecision[];
  mismatches: Mismatch[];
}

interface CaseItem {
  id: string;
  caseNumber: string;
  title: string;
}

export default function ReconciliationPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [transactions, setTransactions] = useState<CanonicalTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cases?limit=50")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = data?.cases || data?.items || [];
        if (list.length > 0) {
          setCases(list);
          setSelectedCaseId(list[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const refreshTransactions = async (caseId: string) => {
    if (!caseId) return;
    try {
      const res = await fetch(`/api/transactions/canonical?caseId=${caseId}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to reload transactions:", err);
    }
  };

  useEffect(() => {
    if (!selectedCaseId) return;
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/transactions/canonical?caseId=${selectedCaseId}`);
        if (res.ok && mounted) {
          const data = await res.json();
          setTransactions(data.transactions || []);
        }
      } catch (err) {
        console.error("Failed to load canonical transactions:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [selectedCaseId]);

  const handleRunReconciliation = async () => {
    if (!selectedCaseId) return;
    setReconciling(true);
    setMessage(null);
    try {
      const res = await fetch("/api/transactions/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: selectedCaseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reconciliation failed");

      setMessage(`Reconciliation executed: ${data.decisions?.length || 0} pair comparisons evaluated.`);
      await refreshTransactions(selectedCaseId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reconciliation error";
      setMessage(msg);
    } finally {
      setReconciling(false);
    }
  };

  const seedMultiSourceDemo = async () => {
    if (!selectedCaseId) return;
    setReconciling(true);
    try {
      // Create canonical transaction with multi-source records
      const res = await fetch("/api/transactions/canonical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: selectedCaseId,
          canonicalReference: `TX-CANONICAL-${Date.now().toString().slice(-6)}`,
          grossAmountMinor: 4999, // $49.99
          feeAmountMinor: 175,
          netAmountMinor: 4824,
          currency: "USD",
          normalizedStatus: "COMPLETED",
          sourceRecords: [
            {
              sourceType: "PAYMENT_GATEWAY",
              providerName: "PayPal Sandbox",
              claimedReference: "CAPTURE-9988112233",
              claimedAmountMinor: 4999,
              claimedCurrency: "USD",
              claimedStatus: "COMPLETED",
            },
            {
              sourceType: "MERCHANT_INVOICE",
              providerName: "TechStore Portal",
              claimedReference: "ORD-RG-2026-X19",
              claimedAmountMinor: 4999,
              claimedCurrency: "USD",
              claimedStatus: "PENDING_CAPTURE", // Intentional discrepancy!
            },
            {
              sourceType: "EMAIL_CONFIRMATION",
              providerName: "Customer Receipt Email",
              claimedReference: "RECEIPT-887766",
              claimedAmountMinor: 4999,
              claimedCurrency: "USD",
              claimedStatus: "PAID",
            },
            {
              sourceType: "NET_BANKING",
              providerName: "HDFC Card Debit",
              claimedReference: "CARD-AUTH-5544",
              claimedAmountMinor: 4999,
              claimedCurrency: "USD",
              claimedStatus: "SETTLED",
            },
          ],
        }),
      });

      if (!res.ok) throw new Error("Failed to seed multi-source data");

      // Auto-reconcile
      await fetch("/api/transactions/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: selectedCaseId }),
      });

      await refreshTransactions(selectedCaseId);
      setMessage("Seeded 4-Source Cross-Provider Incident: Gateway Confirmed vs Merchant Pending.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Seed failed";
      alert(msg);
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">
              Cross-Platform Transaction Reconciliation
            </h1>
            <Badge tone="brand">10-Tier Matching Hierarchy</Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            Reconcile multi-provider records across gateways, banking rails, UPI apps, and merchant systems to isolate status contradictions and timing gaps.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={seedMultiSourceDemo}
            disabled={reconciling}
            className="text-xs shrink-0"
          >
            <Zap className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            Seed Sandbox Dispute
          </Button>
          <Button
            size="sm"
            onClick={handleRunReconciliation}
            disabled={reconciling || transactions.length === 0}
            className="text-xs shrink-0"
          >
            {reconciling ? (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Scale className="mr-1.5 h-3.5 w-3.5" />
            )}
            Run 10-Tier Reconciliation
          </Button>
        </div>
      </div>

      {/* Case Selector */}
      <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider shrink-0">
            Active Case:
          </span>
          <select
            aria-label="Active Case Selection"
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="w-full sm:w-96 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} - {c.title.slice(0, 45)}
              </option>
            ))}
          </select>
        </div>
        {message && (
          <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded">
            {message}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-1 p-8 text-center">
          <Layers className="h-12 w-12 text-muted mb-3 opacity-40" />
          <h3 className="text-sm font-semibold text-fg">No Canonical Transactions for this Case</h3>
          <p className="text-xs text-muted max-w-sm mt-1">
            Click &quot;Seed 4-Source Sandbox Dispute&quot; above to immediately populate a multi-source cross-platform transaction for demonstration.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {transactions.map((tx) => (
            <div key={tx.id} className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm space-y-6">
              {/* Canonical Tx Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-bold text-fg">
                      {tx.canonicalReference}
                    </span>
                    <Badge
                      tone={
                        tx.reconciliationState === "FULLY_RECONCILED"
                          ? "success"
                          : tx.reconciliationState === "DISCREPANCY_DETECTED"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {tx.reconciliationState}
                    </Badge>
                    <Badge tone="info">
                      {tx.normalizedStatus}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted mt-1 block">
                    Canonical Decimal-Safe Amount: {(tx.grossAmountMinor / 100).toFixed(2)} {tx.currency} (Fee: {(tx.feeAmountMinor / 100).toFixed(2)}, Net: {(tx.netAmountMinor / 100).toFixed(2)})
                  </span>
                </div>
              </div>

              {/* Source Records Multi-Source Comparison Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  Source Records ({tx.sourceRecords?.length || 0} Attested Sources)
                </h4>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-2/60 text-muted border-b border-border font-medium">
                      <tr>
                        <th className="p-3">Source Channel</th>
                        <th className="p-3">Provider / Entity</th>
                        <th className="p-3">Claimed Reference</th>
                        <th className="p-3">Claimed Amount</th>
                        <th className="p-3">Claimed Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {tx.sourceRecords?.map((src) => (
                        <tr key={src.id} className="hover:bg-surface-2/30">
                          <td className="p-3 font-medium text-fg">{src.sourceType}</td>
                          <td className="p-3 font-semibold text-primary">{src.providerName}</td>
                          <td className="p-3 font-mono text-muted">{src.claimedReference}</td>
                          <td className="p-3 font-mono text-fg">
                            {(src.claimedAmountMinor / 100).toFixed(2)} {src.claimedCurrency}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                src.claimedStatus === "COMPLETED" || src.claimedStatus === "SETTLED" || src.claimedStatus === "PAID"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-amber-500/10 text-amber-400"
                              }`}
                            >
                              {src.claimedStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Discrepancies & Mismatches */}
              {tx.mismatches && tx.mismatches.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    Detected Mismatches ({tx.mismatches.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tx.mismatches.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-lg border border-red-500/20 bg-red-500/5 p-3.5 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-red-400">{m.mismatchType}</span>
                          <Badge tone="danger">
                            {m.severity}
                          </Badge>
                        </div>
                        <p className="text-muted text-[11px]">{m.description}</p>
                        <div className="rounded bg-surface-2 p-2 text-[10px] text-faint font-mono">
                          <span className="text-fg font-semibold">Suggested Action:</span> {m.suggestedAction}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Decisions */}
              {tx.matchingDecisions && tx.matchingDecisions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
                    <Scale className="h-4 w-4 text-primary" />
                    Deterministic Matching Decisions ({tx.matchingDecisions.length} Evaluated Pairs)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tx.matchingDecisions.map((dec) => (
                      <div key={dec.id} className="rounded-lg border border-border bg-surface-2/40 p-3.5 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge
                            tone={
                              dec.outcome === "MATCHED"
                                ? "success"
                                : dec.outcome === "CONFLICT"
                                ? "danger"
                                : "warning"
                            }
                          >
                            {dec.outcome} ({(dec.confidenceScore * 100).toFixed(0)}%)
                          </Badge>
                          <span className="text-[10px] text-faint font-mono">
                            Matched: {dec.matchedFields?.join(", ") || "None"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted">{dec.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
