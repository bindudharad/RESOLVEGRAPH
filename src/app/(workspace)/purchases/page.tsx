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
  Layers2,
  Clock,
  ArrowRight,
  Truck,
  Box,
  FileCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DemoBadge } from "@/components/common/demo-badge";
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

const PURCHASE_STAGES = [
  { id: 1, label: "Advertised", desc: "Product listing & promises", icon: ShoppingCart },
  { id: 2, label: "Confirmed", desc: "Tax invoice & payment", icon: FileCheck },
  { id: 3, label: "Pre-Dispatch", desc: "Warehouse pick & barcode scan", icon: Box },
  { id: 4, label: "Transit", desc: "Carrier custody & weigh-in", icon: Truck },
  { id: 5, label: "Delivered", desc: "Receipt & unboxing proof", icon: Package },
];

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseMemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMemory, setSelectedMemory] = useState<PurchaseMemoryItem | null>(null);
  const [showAmendments, setShowAmendments] = useState(false);

  // Ingestion Drawer state
  const [showIngestionModal, setShowIngestionModal] = useState(false);
  const [emailRawText, setEmailRawText] = useState(
    `Order Confirmation #ORD-98231\nMerchant: Apex Tech Labs Ltd\nTotal: ₹6,499.00 INR\nItems: ApexPro 1TB NVMe Gen4 SSD\nMerchant Promise: Factory Sealed 1TB Model, 5-Year Warranty.`
  );
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionSuccess, setDetectionSuccess] = useState<string | null>(null);

  // Divergence check state
  const [showDivergenceModal, setShowDivergenceModal] = useState(false);
  const [disputeClaimText, setDisputeClaimText] = useState("Customer received 512GB SSD model instead of 1TB NVMe.");
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
                merchantName: String(merchantOrg.name || "Apex Tech Labs Ltd"),
                buyerName: String(buyer.fullName || "Alex Morgan"),
                totalAmountMinor: Number(order.totalAmountMinor || 649900),
                currency: String(order.currency || "INR"),
                immutableSnapshotHash: String(p.immutableSnapshotHash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
                specificationsCount: specs.length || 3,
                promisesCount: promises.length || 2,
                specifications: specs.length > 0 ? specs : [
                  { key: "Capacity", value: "1000GB (1TB)", importance: "CRITICAL" },
                  { key: "Interface", value: "PCIe 4.0 x4 NVMe", importance: "STANDARD" },
                  { key: "Form Factor", value: "M.2 2280", importance: "STANDARD" },
                ],
                promises: promises.length > 0 ? promises : [
                  { claim: "Factory sealed retail packaging", source: "Listing Details", verified: true },
                  { claim: "Manufacturer 5-Year Limited Warranty", source: "Order Confirmation", verified: true },
                ],
                packageId: packages[0]?.id ? String(packages[0].id) : "pkg-demo-01",
                packageTrackingNumber: packages[0]?.trackingNumber ? String(packages[0].trackingNumber) : "APX-TRK-9942",
                createdAt: String(p.createdAt || new Date().toISOString()),
              };
            })
          );
        }
      }
    } catch {
      // Fallback canonical demo memory
      setPurchases([
        {
          id: "pmem-canonical-01",
          orderNumber: "ORD-RG-2026-0412",
          merchantName: "Apex Tech Labs Ltd",
          buyerName: "Alex Morgan",
          totalAmountMinor: 649900,
          currency: "INR",
          immutableSnapshotHash: "9a2f7c38e12b64d8a19283746501928374659283746592837465928374650123",
          specificationsCount: 3,
          promisesCount: 2,
          specifications: [
            { key: "Capacity", value: "1000GB (1TB)", importance: "CRITICAL" },
            { key: "Interface", value: "PCIe 4.0 x4 NVMe", importance: "STANDARD" },
            { key: "Form Factor", value: "M.2 2280", importance: "STANDARD" },
          ],
          promises: [
            { claim: "Factory sealed retail box with holographic seal", source: "Tax Invoice #INV-882", verified: true },
            { claim: "5-Year Manufacturer Warranty", source: "Listing Spec #APX-1TB", verified: true },
          ],
          packageId: "pkg-demo-01",
          packageTrackingNumber: "APX-TRK-9942",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulateDetection() {
    setIsDetecting(true);
    setDetectionSuccess(null);
    try {
      const res = await fetch("/api/purchases/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: emailRawText }),
      });
      if (res.ok) {
        setDetectionSuccess("Successfully parsed specifications into immutable memory hash.");
        setTimeout(() => {
          setShowIngestionModal(false);
          loadPurchases();
        }, 1200);
      }
    } catch {
      setDetectionSuccess("Parsed memory hash registered for evaluation session.");
      setTimeout(() => setShowIngestionModal(false), 1200);
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
    } catch {
      setDivergenceResult({
        divergenceDetected: true,
        baselineSummary: "1TB NVMe Gen4 SSD",
        explanation: "Hardware baseline anchored to 1000GB capacity. Received item telemetry indicates 512GB model.",
      });
    }
  }

  const filtered = purchases.filter(
    (p) =>
      p.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.merchantName.toLowerCase().includes(search.toLowerCase()) ||
      p.immutableSnapshotHash.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[23px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">
              Purchase Memory
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-[13.5px] text-subtle">
            Immutable pre-dispatch baseline preservation. Prevents post-complaint retroactive revisions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => setShowAmendments((prev) => !prev)}
            className={showAmendments ? "border-[var(--accent)] text-[var(--accent)] bg-surface-2" : ""}
            icon={<Layers2 className="h-4 w-4" />}
          >
            {showAmendments ? "Hide Amendments" : "Show Amendments (2.5D Stack)"}
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => setShowIngestionModal(true)}
            icon={<Sparkles className="h-4 w-4" />}
          >
            Ingest Baseline
          </Button>
        </div>
      </div>

      {/* 5-Stage Connected Lifecycle Rail */}
      <div className="rg-card p-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <span className="text-[12px] font-bold uppercase tracking-wider text-fg">
            5-Stage Purchase Memory Rail
          </span>
          <span className="font-mono text-xs text-subtle">Cryptographically Anchored</span>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          {PURCHASE_STAGES.map((st, i) => {
            const Icon = st.icon;
            const isCompleted = i <= 3;
            const isCurrent = i === 4;
            return (
              <div
                key={st.id}
                className={`relative rounded-lg border p-3 transition-all ${
                  isCurrent
                    ? "border-[var(--ai)] bg-[var(--ai)]/5 shadow-xs"
                    : isCompleted
                    ? "border-line bg-surface-2/40"
                    : "border-dashed border-line bg-surface opacity-60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                      isCurrent
                        ? "bg-[var(--ai)] text-white"
                        : isCompleted
                        ? "bg-surface-3 text-fg"
                        : "bg-surface-2 text-subtle"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-fg">{st.label}</span>
                </div>
                <p className="mt-2 text-[11px] text-subtle">{st.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-subtle">Active Baselines</span>
            <ShoppingCart className="h-4 w-4 text-[var(--buyer)]" />
          </div>
          <div className="mt-2 font-mono text-[22px] font-bold text-fg">{purchases.length}</div>
          <p className="mt-1 text-[11px] text-faint">Crystallized pre-dispatch memories</p>
        </div>

        <div className="rg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-subtle">Hardware Specs Anchored</span>
            <Layers className="h-4 w-4 text-[var(--agreed)]" />
          </div>
          <div className="mt-2 font-mono text-[22px] font-bold text-fg">
            {purchases.reduce((acc, p) => acc + p.specificationsCount, 0)}
          </div>
          <p className="mt-1 text-[11px] text-faint">Capacity, voltage, form-factors sealed</p>
        </div>

        <div className="rg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-subtle">Merchant Promises</span>
            <ShieldCheck className="h-4 w-4 text-[var(--merchant)]" />
          </div>
          <div className="mt-2 font-mono text-[22px] font-bold text-fg">
            {purchases.reduce((acc, p) => acc + p.promisesCount, 0)}
          </div>
          <p className="mt-1 text-[11px] text-faint">Condition & warranty guarantees</p>
        </div>

        <div className="rg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-subtle">SHA-256 Ledger Integrity</span>
            <Lock className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div className="mt-2 font-mono text-[22px] font-bold text-[var(--agreed)]">100% Sealed</div>
          <p className="mt-1 text-[11px] text-faint">Zero retroactive post-claim mutations</p>
        </div>
      </div>

      {/* 2.5D Amendment Stack View (When toggled ON) */}
      {showAmendments && (
        <div className="rounded-xl border border-[var(--contested)] bg-[color-mix(in_srgb,var(--contested)_6%,transparent)] p-5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <Layers2 className="h-4 w-4 text-[var(--contested)]" />
              <h3 className="text-sm font-bold text-fg">
                2.5D Layered Amendment Differential Stack
              </h3>
            </div>
            <span className="rounded bg-[var(--contested)]/10 px-2 py-0.5 text-xs font-mono text-[var(--contested)]">
              1 Conflict Detected
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base Layer */}
            <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
              <span className="text-[11px] uppercase tracking-wider text-subtle font-mono">Layer 0 — Advertised Baseline</span>
              <p className="mt-1 font-bold text-fg text-sm">Product: ApexPro 1TB NVMe Gen4 SSD</p>
              <div className="mt-2 font-mono text-xs space-y-1 text-muted">
                <p>Capacity: <strong className="text-fg">1,000 GB (1TB)</strong></p>
                <p>Gross: ₹6,499.00 INR</p>
                <p>Seal: Holographic Brand Foil</p>
              </div>
            </div>

            {/* Elevated 2.5D Divergence Layer */}
            <div className="rounded-lg border-2 border-[var(--contested)] bg-surface p-4 shadow-xl translate-y-[-4px] ring-2 ring-[var(--contested)]/20">
              <span className="text-[11px] uppercase tracking-wider text-[var(--contested)] font-mono font-bold">Layer 1 — Received Delivery Claim (+4px Lift)</span>
              <p className="mt-1 font-bold text-fg text-sm">Reported: ApexPro 512GB Model Inside Carton</p>
              <div className="mt-2 font-mono text-xs space-y-1 text-[var(--contested)]">
                <p>Detected Capacity: <strong>512 GB (-488 GB Variance)</strong></p>
                <p>Serial Mismatch: APX-512-V2 vs APX-1000-NVME</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line p-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-subtle" />
            <input
              type="text"
              placeholder="Filter by order number, merchant, or hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-line bg-surface-2 pl-9 pr-3 py-1.5 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-2 border-b border-line font-medium text-subtle uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3">Merchant</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Specs Sealed</th>
                <th className="px-4 py-3">Tracking</th>
                <th className="px-4 py-3">Tamper-Proof Hash</th>
                <th className="px-4 py-3 text-right">Divergence Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-surface-2/50">
                  <td className="px-4 py-3 font-mono font-semibold text-fg">
                    {item.orderNumber}
                  </td>
                  <td className="px-4 py-3 text-fg">{item.merchantName}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-fg">
                    {formatCurrency(item.totalAmountMinor / 100, item.currency as Currency)}
                  </td>
                  <td className="px-4 py-3">
                    <Chip variant="agreed">{item.specificationsCount} Specs</Chip>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href="/packages"
                      className="font-mono text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                    >
                      <Package className="h-3 w-3" />
                      {item.packageTrackingNumber || "APX-TRK-9942"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-subtle">
                    {item.immutableSnapshotHash.slice(0, 10)}...{item.immutableSnapshotHash.slice(-6)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ingestion Modal */}
      {showIngestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-line bg-surface p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-fg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[var(--ai)]" />
              Ingest & Crystallize Purchase Memory
            </h3>
            <p className="mt-1 text-xs text-muted">
              Paste email confirmation or invoice to extract immutable specifications into tamper-proof SHA-256 seal.
            </p>

            <div className="mt-4">
              <label className="text-xs font-semibold text-fg">Raw Order / Email Text</label>
              <textarea
                value={emailRawText}
                onChange={(e) => setEmailRawText(e.target.value)}
                rows={5}
                className="mt-1.5 w-full rounded-md border border-line bg-surface-2 p-3 text-xs font-mono text-fg focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            {detectionSuccess && (
              <div className="mt-3 rounded-md bg-[color-mix(in_srgb,var(--agreed)_12%,transparent)] border border-[var(--agreed)]/30 p-2.5 text-xs text-[var(--agreed)] flex items-center gap-2">
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
                variant="primary"
                size="sm"
                onClick={handleSimulateDetection}
                disabled={isDetecting || !emailRawText.trim()}
              >
                {isDetecting ? "Processing..." : "Extract & Seal"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Divergence Comparison Modal */}
      {showDivergenceModal && selectedMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-line bg-surface p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-fg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[var(--contested)]" />
              Divergence Detector: Baseline vs Dispute Claim
            </h3>
            <p className="mt-1 text-xs text-muted">
              Comparing order <span className="text-fg font-mono">{selectedMemory.orderNumber}</span> immutable baseline against incoming claim.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-fg">Incoming Dispute Claim</label>
                <textarea
                  value={disputeClaimText}
                  onChange={(e) => setDisputeClaimText(e.target.value)}
                  rows={2}
                  className="mt-1.5 w-full rounded-md border border-line bg-surface-2 p-2.5 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              <div className="flex justify-end">
                <Button variant="primary" size="sm" onClick={handleRunDivergenceCheck}>
                  Run Divergence Comparison
                </Button>
              </div>

              {divergenceResult && (
                <div className="mt-4 rounded-lg border border-line bg-surface-2 p-4">
                  <div className="text-xs font-semibold text-fg flex items-center justify-between">
                    <span>Analysis Result:</span>
                    <Chip variant={divergenceResult.divergenceDetected ? "contested" : "agreed"}>
                      {divergenceResult.divergenceDetected ? "Divergence Confirmed" : "Consistent"}
                    </Chip>
                  </div>

                  <div className="mt-3 text-xs text-muted space-y-1">
                    <p>
                      <strong>Original Baseline:</strong> {divergenceResult.baselineSummary || "1TB NVMe SSD, 32GB RAM"}
                    </p>
                    <p>
                      <strong>Claimed Variance:</strong> {disputeClaimText}
                    </p>
                    <p className="pt-2 text-[11px] font-mono text-subtle truncate">
                      Immutable Hash: {selectedMemory.immutableSnapshotHash}
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
