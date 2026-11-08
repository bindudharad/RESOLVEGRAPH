"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  QrCode,
  Search,
  Plus,
  Truck,
  ExternalLink,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

interface PackagePassportItem {
  id: string;
  uniquePackageId: string;
  status: string;
  carrierName: string | null;
  trackingNumber: string | null;
  qrVerificationToken: string;
  integrityHashChain: string;
  itemsCount: number;
  sealsCount: number;
  items: Array<{ title: string; sku: string | null; quantity: number }>;
  seals: Array<{ sealNumber: string; status: string; appliedAt: string }>;
  createdAt: string;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<PackagePassportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackagePassportItem | null>(null);

  // Creation form state
  const [carrierName, setCarrierName] = useState("FedEx Express");
  const [trackingNumber, setTrackingNumber] = useState("TRK-774910293");
  const [itemTitle, setItemTitle] = useState("UltraPro Laptop 15-inch");
  const [itemSku, setItemSku] = useState("SKU-UP-15-MID");
  const [itemSerial, setItemSerial] = useState("SN-9988221100");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Seal form state
  const [showSealModal, setShowSealModal] = useState(false);
  const [sealNumber, setSealNumber] = useState("SEAL-SEC-44019");

  useEffect(() => {
    loadPackages();
  }, []);

  async function loadPackages() {
    setLoading(true);
    try {
      const res = await fetch("/api/packages");
      if (res.ok) {
        const data = await res.json();
        if (data.packages && Array.isArray(data.packages)) {
          setPackages(
            data.packages.map((p: Record<string, unknown>) => ({
              id: String(p.id || ""),
              uniquePackageId: String(p.uniquePackageId || ""),
              status: String(p.status || "REGISTERED"),
              carrierName: (p.carrierName as string) || null,
              trackingNumber: (p.trackingNumber as string) || null,
              qrVerificationToken: String(p.qrVerificationToken || ""),
              integrityHashChain: String(p.integrityHashChain || ""),
              itemsCount: Array.isArray(p.items) ? p.items.length : 0,
              sealsCount: Array.isArray(p.seals) ? p.seals.length : 0,
              items: (p.items as Array<{ title: string; sku: string | null; quantity: number }>) || [],
              seals: (p.seals as Array<{ sealNumber: string; status: string; appliedAt: string }>) || [],
              createdAt: String(p.createdAt || new Date().toISOString()),
            }))
          );
        }
      }
    } catch (e) {
      console.error("Failed to load packages:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePackage() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrierName,
          trackingNumber,
          items: [
            {
              title: itemTitle,
              sku: itemSku,
              quantity: 1,
              serialNumber: itemSerial,
              declaredValueMinor: 124900,
            },
          ],
        }),
      });

      if (res.ok) {
        await loadPackages();
        setShowCreateModal(false);
      } else {
        const err = await res.json();
        alert("Failed to create package: " + err.error);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error creating package";
      alert("Error creating package: " + msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApplySeal() {
    if (!selectedPackage) return;
    try {
      const res = await fetch(`/api/packages/${selectedPackage.id}/seal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sealNumber,
          sealType: "TAMPER_EVIDENT_BARCODE",
          appliedByUserId: "usr_techstore_merchant",
        }),
      });
      if (res.ok) {
        await loadPackages();
        setShowSealModal(false);
      } else {
        const err = await res.json();
        alert("Seal error: " + err.error);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Seal error";
      alert("Error: " + msg);
    }
  }

  const filtered = packages.filter(
    (p) =>
      p.uniquePackageId.toLowerCase().includes(search.toLowerCase()) ||
      (p.carrierName && p.carrierName.toLowerCase().includes(search.toLowerCase())) ||
      (p.trackingNumber && p.trackingNumber.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-fg">Package Passports</h1>
            <Badge tone="info" className="border-sky-500/30 bg-sky-500/10 text-sky-400">
              Module 08 Live
            </Badge>
          </div>
          <p className="text-sm text-muted">
            Tamper-evident custody chain, HMAC-SHA256 signed QR passports, and fulfillment integrity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Register Package Passport
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Total Passports</span>
            <Package className="h-4 w-4 text-brand-2" />
          </div>
          <div className="mt-2 text-2xl font-bold text-fg">{packages.length}</div>
          <p className="mt-1 text-[11px] text-faint">Cryptographically tracked packages</p>
        </div>

        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Tamper Seals Applied</span>
            <Lock className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-fg">
            {packages.reduce((acc, p) => acc + p.sealsCount, 0)}
          </div>
          <p className="mt-1 text-[11px] text-faint">Physical security seal tracking</p>
        </div>

        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Transit Shipments</span>
            <Truck className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-fg">
            {packages.filter((p) => p.status === "DISPATCHED" || p.status === "IN_TRANSIT").length}
          </div>
          <p className="mt-1 text-[11px] text-faint">Monitored courier dispatch</p>
        </div>

        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">HMAC-SHA256 Status</span>
            <QrCode className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">Secured</div>
          <p className="mt-1 text-[11px] text-faint">Unique signed QR tokens active</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by package ID (PKG-2026-...), carrier, or tracking number..."
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
                <th className="px-4 py-3">Passport Identifier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Carrier & Tracking</th>
                <th className="px-4 py-3">Items Manifest</th>
                <th className="px-4 py-3">Tamper Seals</th>
                <th className="px-4 py-3">Verification Token</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted">
                    Loading Package Passports...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted">
                    No Package Passports registered. Click &quot;Register Package Passport&quot; to issue one.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-semibold text-fg flex items-center gap-1.5">
                        <QrCode className="h-4 w-4 text-brand-2" />
                        {item.uniquePackageId}
                      </div>
                      <div className="text-[11px] text-faint">
                        Created {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          item.status === "SEALED" || item.status === "DISPATCHED"
                            ? "success"
                            : "info"
                        }
                        className={
                          item.status === "SEALED" || item.status === "DISPATCHED"
                            ? "border-emerald-500/30 text-emerald-400"
                            : "border-sky-500/30 text-sky-400"
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-fg font-medium">{item.carrierName || "Pending Carrier"}</div>
                      <div className="text-xs font-mono text-muted">{item.trackingNumber || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral" className="text-xs">
                        {item.itemsCount} Manifest Items
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-emerald-400">
                        {item.sealsCount > 0 ? `${item.sealsCount} Sealed` : "Unsealed"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-[11px] font-mono text-muted bg-surface-2 px-1.5 py-0.5 rounded">
                        {item.qrVerificationToken.slice(0, 8)}...
                      </code>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedPackage(item);
                          setShowSealModal(true);
                        }}
                      >
                        Attach Seal
                      </Button>
                      <Link
                        href={`/api/packages/verify/${item.qrVerificationToken}`}
                        target="_blank"
                        className="inline-flex items-center text-xs text-brand-2 hover:underline"
                      >
                        Verify QR
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface-1 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-fg flex items-center gap-2">
              <Package className="h-5 w-5 text-brand-2" />
              Register New Package Passport
            </h3>
            <p className="mt-1 text-xs text-muted">
              Generates cryptographic QR token, integrity hash chain, and manifest items for dispatch.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-fg">Carrier Name</label>
                <Input
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-fg">Tracking Number</label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="border-t border-border pt-3">
                <span className="text-xs font-semibold text-fg">Manifest Item</span>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <Input
                    placeholder="Item Title"
                    value={itemTitle}
                    onChange={(e) => setItemTitle(e.target.value)}
                  />
                  <Input
                    placeholder="SKU"
                    value={itemSku}
                    onChange={(e) => setItemSku(e.target.value)}
                  />
                </div>
                <Input
                  placeholder="Serial Number"
                  value={itemSerial}
                  onChange={(e) => setItemSerial(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreatePackage}
                disabled={isSubmitting || !carrierName || !trackingNumber}
              >
                {isSubmitting ? "Generating..." : "Generate Passport"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Seal Modal */}
      {showSealModal && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface-1 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-fg flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald-400" />
              Attach Tamper-Evident Seal
            </h3>
            <p className="mt-1 text-xs text-muted">
              Package: <span className="text-fg font-mono">{selectedPackage.uniquePackageId}</span>
            </p>

            <div className="mt-4">
              <label className="text-xs font-semibold text-fg">Seal Number / Barcode</label>
              <Input
                value={sealNumber}
                onChange={(e) => setSealNumber(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSealModal(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleApplySeal}>
                Apply & Seal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
