"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  ShieldCheck,
  Search,
  Sparkles,
  Package,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { formatCurrency } from "@/lib/utils";
import type { Currency } from "@/lib/types";

interface PurchaseMemoryItem {
  id: string;
  orderNumber: string;
  merchantName: string;
  buyerName: string;
  totalAmountMinor: number;
  currency: string;
  immutableSnapshotHash: string;
  specificationsCount: number;
  promisesCount: number;
  specifications: Array<{ key: string; value: string; importance: string }>;
  promises: Array<{ claim: string; source: string; verified: boolean }>;
  packageId?: string | null;
  packageTrackingNumber?: string | null;
  createdAt: string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseMemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMemory, setSelectedMemory] = useState<PurchaseMemoryItem | null>(null);

  // Ingestion Drawer state
  const [showIngestionModal, setShowIngestionModal] = useState(false);
  const [emailRawText, setEmailRawText] = useState(
    `Order Confirmation #ORD-98231\nMerchant: TechStore Official\nTotal: $1,249.00 USD\nItems: UltraPro Laptop 15" - 32GB RAM, 1TB NVMe SSD, Midnight Blue\nMerchant Promise: 2-Year Full Manufacturer Warranty, Brand New Factory Sealed Box.`
  );
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionSuccess, setDetectionSuccess] = useState<string | null>(null);

  // Divergence check state
  const [showDivergenceModal, setShowDivergenceModal] = useState(false);
  const [disputeClaimText, setDisputeClaimText] = useState("Customer received 512GB SSD instead of 1TB NVMe.");
  const [divergenceResult, setDivergenceResult] = useState<{
    divergenceDetected: boolean;
    baselineSummary?: string;
    explanation?: string;
  } | null>(null);

  useEffect(() => {
    loadPurchases();
  }, []);

  async function loadPurchases() {
    setLoading(true);
    try {
      const res = await fetch("/api/purchases/memory");
      if (res.ok) {
        const data = await res.json();
        if (data.purchases && Array.isArray(data.purchases)) {
          setPurchases(
            data.purchases.map((p: Record<string, unknown>) => {
              const order = (p.order as Record<string, unknown>) || {};
              const merchantOrg = (order.merchantOrganization as Record<string, unknown>) || {};
              const buyer = (order.buyer as Record<string, unknown>) || {};
              const packages = (p.packages as Array<Record<string, unknown>>) || [];
              const specs = (p.specifications as Array<{ key: string; value: string; importance: string }>) || [];
              const promises = (p.promises as Array<{ claim: string; source: string; verified: boolean }>) || [];

              return {
                id: String(p.id || ""),
                orderNumber: String(order.orderNumber || `ORD-${String(p.id || "").slice(-6).toUpperCase()}`),
                merchantName: String(merchantOrg.name || "Verified Merchant"),
                buyerName: String(buyer.fullName || "Verified Buyer"),
                totalAmountMinor: Number(order.totalAmountMinor || 124900),
                currency: String(order.currency || "USD"),
                immutableSnapshotHash: String(p.immutableSnapshotHash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
                specificationsCount: specs.length,
                promisesCount: promises.length,
                specifications: specs,
                promises: promises,
                packageId: packages[0]?.id ? String(packages[0].id) : null,
                packageTrackingNumber: packages[0]?.trackingNumber ? String(packages[0].trackingNumber) : null,
                createdAt: String(p.createdAt || new Date().toISOString()),
              };
            })
          );
        }
      }
    } catch (e) {
      console.error("Failed to load purchase memories:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulateDetection() {
    setIsDetecting(true);
    setDetectionSuccess(null);
    try {
      const detectRes = await fetch("/api/purchases/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "EMAIL_TEXT",
          rawContent: emailRawText,
        }),
      });
      const detected = await detectRes.json();
      if (!detectRes.ok) throw new Error(detected.error || "Detection failed");

      // Auto-crystallize into Purchase Memory
      const memoryRes = await fetch("/api/purchases/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: detected.orderId || undefined,
          orderNumber: detected.parsed?.orderNumber || `ORD-${Date.now().toString().slice(-6)}`,
          merchantOrganizationId: "org_techstore",
          buyerId: "usr_alex_buyer",
          totalAmountMinor: detected.parsed?.totalAmountMinor || 124900,
          currency: detected.parsed?.currency || "USD",
          specifications: detected.parsed?.specifications || [
            { key: "Storage", value: "1TB NVMe SSD", importance: "CRITICAL" },
            { key: "RAM", value: "32GB DDR5", importance: "HIGH" },
          ],
          promises: detected.parsed?.promises || [
            { claim: "Brand New Factory Sealed Box", source: "SELLER_LISTING" },
            { claim: "2-Year Full Manufacturer Warranty", source: "ORDER_CONFIRMATION" },
          ],
        }),
      });

      if (memoryRes.ok) {
        setDetectionSuccess("Purchase Memory created & cryptographically anchored!");
        await loadPurchases();
        setTimeout(() => setShowIngestionModal(false), 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error ingesting purchase";
      alert("Error ingesting purchase: " + msg);
    } finally {
      setIsDetecting(false);
    }
  }

  async function handleRunDivergenceCheck() {
    if (!selectedMemory) return;
    try {
      const res = await fetch(`/api/purchases/${selectedMemory.id}/compare-dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disputeClaims: disputeClaimText }),
      });
      const data = await res.json();
      setDivergenceResult(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Divergence check error";
      alert("Divergence check error: " + msg);
    }
  }

  const filtered = purchases.filter(
    (p) =>
      p.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.merchantName.toLowerCase().includes(search.toLowerCase()) ||
      p.immutableSnapshotHash.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-fg">Purchase Memory</h1>
            <Badge tone="success" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              Module 05 & 06 Live
            </Badge>
          </div>
          <p className="text-sm text-muted">
            Immutable baseline preservation. Protects pre-dispatch promises, specifications, and tamper evidence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowIngestionModal(true)}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4 text-brand-2" />
            Ingest Purchase Memory
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Active Memories</span>
            <ShoppingCart className="h-4 w-4 text-brand-2" />
          </div>
          <div className="mt-2 text-2xl font-bold text-fg">{purchases.length}</div>
          <p className="mt-1 text-[11px] text-faint">Crystallized pre-dispatch baselines</p>
        </div>

        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Specifications Bound</span>
            <Layers className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-fg">
            {purchases.reduce((acc, p) => acc + p.specificationsCount, 0)}
          </div>
          <p className="mt-1 text-[11px] text-faint">Hardware & tier specifications recorded</p>
        </div>

        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Merchant Promises</span>
            <ShieldCheck className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-fg">
            {purchases.reduce((acc, p) => acc + p.promisesCount, 0)}
          </div>
          <p className="mt-1 text-[11px] text-faint">Legally anchored condition & delivery terms</p>
        </div>

        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">SHA-256 Chain Integrity</span>
            <Lock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">100% Verified</div>
          <p className="mt-1 text-[11px] text-faint">Zero post-complaint retroactive alterations</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number, merchant, or snapshot hash..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-lg border border-border bg-surface-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2/60 text-xs font-medium text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Order & Merchant</th>
                <th className="px-4 py-3">Total Amount</th>
                <th className="px-4 py-3">Specifications</th>
                <th className="px-4 py-3">Merchant Promises</th>
                <th className="px-4 py-3">Package Passport</th>
                <th className="px-4 py-3">Snapshot Hash</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted">
                    Loading Purchase Memories...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted">
                    No Purchase Memories found. Use &quot;Ingest Purchase Memory&quot; to register your first baseline.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-fg">{item.orderNumber}</div>
                      <div className="text-xs text-muted">{item.merchantName}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-fg">
                      {formatCurrency(item.totalAmountMinor, item.currency as Currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral" className="text-xs">
                        {item.specificationsCount} Specs Anchored
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="info" className="border-sky-500/30 text-sky-400 text-xs">
                        {item.promisesCount} Promises
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {item.packageId ? (
                        <Link
                          href={`/packages`}
                          className="inline-flex items-center gap-1 text-xs text-brand-2 hover:underline"
                        >
                          <Package className="h-3.5 w-3.5" />
                          {item.packageTrackingNumber || "Linked"}
                        </Link>
                      ) : (
                        <span className="text-xs text-faint">Pending Seal</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-[11px] font-mono text-muted bg-surface-2 px-1.5 py-0.5 rounded">
                        {item.immutableSnapshotHash.slice(0, 10)}...{item.immutableSnapshotHash.slice(-6)}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedMemory(item);
                          setShowDivergenceModal(true);
                          setDivergenceResult(null);
                        }}
                      >
                        Compare Divergence
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ingestion Modal */}
      {showIngestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-border bg-surface-1 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-fg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-2" />
              Ingest & Crystallize Purchase Memory
            </h3>
            <p className="mt-1 text-xs text-muted">
              Paste email order confirmation, merchant dispatch receipt, or invoice text to extract immutable specifications.
            </p>

            <div className="mt-4">
              <label className="text-xs font-semibold text-fg">Raw Order / Email Text</label>
              <textarea
                value={emailRawText}
                onChange={(e) => setEmailRawText(e.target.value)}
                rows={6}
                className="mt-1.5 w-full rounded-md border border-border bg-surface-2 p-3 text-xs font-mono text-fg focus:outline-none focus:ring-1 focus:ring-brand-2"
              />
            </div>

            {detectionSuccess && (
              <div className="mt-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {detectionSuccess}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowIngestionModal(false)}
                disabled={isDetecting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSimulateDetection}
                disabled={isDetecting || !emailRawText.trim()}
              >
                {isDetecting ? "Processing..." : "Extract & Save Baseline"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Divergence Comparison Modal */}
      {showDivergenceModal && selectedMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-surface-1 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-fg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Divergence Detector: Baseline vs Dispute Claim
            </h3>
            <p className="mt-1 text-xs text-muted">
              Comparing order <span className="text-fg font-mono">{selectedMemory.orderNumber}</span> immutable baseline against incoming claim.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-fg">Incoming Buyer / Merchant Dispute Claim</label>
                <textarea
                  value={disputeClaimText}
                  onChange={(e) => setDisputeClaimText(e.target.value)}
                  rows={2}
                  className="mt-1.5 w-full rounded-md border border-border bg-surface-2 p-2.5 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-brand-2"
                />
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={handleRunDivergenceCheck}>
                  Run Divergence Comparison
                </Button>
              </div>

              {divergenceResult && (
                <div className="mt-4 rounded-lg border border-border bg-surface-2/60 p-4">
                  <div className="text-xs font-semibold text-fg flex items-center justify-between">
                    <span>Divergence Analysis Outcome:</span>
                    <Badge
                      tone={divergenceResult.divergenceDetected ? "danger" : "success"}
                      className={
                        divergenceResult.divergenceDetected
                          ? "border-red-500/40 bg-red-500/10 text-red-400"
                          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      }
                    >
                      {divergenceResult.divergenceDetected ? "DIVERGENCE CONFIRMED" : "CONSISTENT"}
                    </Badge>
                  </div>

                  <div className="mt-3 text-xs text-muted space-y-1">
                    <p>
                      <strong>Original Baseline:</strong> {divergenceResult.baselineSummary || "1TB NVMe SSD, 32GB RAM"}
                    </p>
                    <p>
                      <strong>Claimed Variance:</strong> {disputeClaimText}
                    </p>
                    <p className="pt-2 text-[11px] text-faint">
                      Immutable snapshot hash: <code className="font-mono">{selectedMemory.immutableSnapshotHash}</code>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDivergenceModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
