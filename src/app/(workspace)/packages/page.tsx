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
  Navigation,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/common/toast";

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
  const { toast } = useToast();
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

  // Dispatch state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchCarrier, setDispatchCarrier] = useState("FedEx Express");
  const [dispatchTracking, setDispatchTracking] = useState("TRK-774910293");
  const [isDispatching, setIsDispatching] = useState(false);

  // Delivery Event state
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventType, setEventType] = useState("OUT_FOR_DELIVERY");
  const [checkpointLocation, setCheckpointLocation] = useState("Regional Sorting Facility (Hub #4)");
  const [isRecordingEvent, setIsRecordingEvent] = useState(false);

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
        toast({
          tone: "success",
          title: "Passport Generated",
          description: "New Package Passport issued with signed QR token.",
        });
        await loadPackages();
        setShowCreateModal(false);
      } else {
        const err = await res.json();
        toast({ tone: "error", title: "Creation Failed", description: err.error });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error creating package";
      toast({ tone: "error", title: "Error", description: msg });
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
        toast({
          tone: "success",
          title: "Tamper Seal Applied",
          description: `Security seal ${sealNumber} cryptographically attached.`,
        });
        await loadPackages();
        setShowSealModal(false);
      } else {
        const err = await res.json();
        toast({ tone: "error", title: "Seal Failed", description: err.error });
      }
    } catch (e: unknown) {
      toast({ tone: "error", title: "Error", description: e instanceof Error ? e.message : "Seal error" });
    }
  }

  async function handleDispatchPackage() {
    if (!selectedPackage) return;
    setIsDispatching(true);
    try {
      const res = await fetch(`/api/packages/${selectedPackage.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrierName: dispatchCarrier,
          trackingNumber: dispatchTracking,
        }),
      });
      if (res.ok) {
        toast({
          tone: "success",
          title: "Package Dispatched",
          description: `Package marked DISPATCHED with ${dispatchCarrier} (${dispatchTracking}).`,
        });
        await loadPackages();
        setShowDispatchModal(false);
      } else {
        const err = await res.json();
        toast({ tone: "error", title: "Dispatch Failed", description: err.error });
      }
    } catch (e: unknown) {
      toast({ tone: "error", title: "Error", description: e instanceof Error ? e.message : "Dispatch error" });
    } finally {
      setIsDispatching(false);
    }
  }

  async function handleRecordDeliveryEvent() {
    if (!selectedPackage) return;
    setIsRecordingEvent(true);
    try {
      const res = await fetch("/api/delivery/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          eventType,
          carrier: selectedPackage.carrierName || "Courier Partner",
          checkpoint: checkpointLocation,
        }),
      });
      if (res.ok) {
        toast({
          tone: "success",
          title: "Delivery Checkpoint Logged",
          description: `Event "${eventType}" recorded. Pre-delivery unboxing notification emitted if out for delivery.`,
        });
        await loadPackages();
        setShowEventModal(false);
      } else {
        const err = await res.json();
        toast({ tone: "error", title: "Event Recording Failed", description: err.error });
      }
    } catch (e: unknown) {
      toast({ tone: "error", title: "Error", description: e instanceof Error ? e.message : "Event recording error" });
    } finally {
      setIsRecordingEvent(false);
    }
  }

  async function handleConfirmReceipt(packageItem: PackagePassportItem) {
    try {
      const res = await fetch("/api/delivery/confirm-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: packageItem.id,
        }),
      });
      if (res.ok) {
        toast({
          tone: "success",
          title: "Delivery Receipt Confirmed",
          description: "Package status updated to DELIVERED. Unboxing verification session unlocked.",
        });
        await loadPackages();
      } else {
        const err = await res.json();
        toast({ tone: "error", title: "Confirmation Failed", description: err.error });
      }
    } catch (e: unknown) {
      toast({ tone: "error", title: "Error", description: e instanceof Error ? e.message : "Confirmation error" });
    }
  }

  const filtered = packages.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.uniquePackageId.toLowerCase().includes(q) ||
      (p.carrierName && p.carrierName.toLowerCase().includes(q)) ||
      (p.trackingNumber && p.trackingNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-fg">
              Package Passports &amp; Fulfillment Security
            </h1>
            <Badge tone="brand">Module 09</Badge>
          </div>
          <p className="text-sm text-muted">
            Cryptographic parcel identities, physical tamper-evident seal tracking, courier transit checkpoints, and public QR verification.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            Register Package Passport
          </Button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Registered Passports</span>
            <Package className="h-4 w-4 text-brand-2" />
          </div>
          <div className="mt-2 text-2xl font-bold text-fg">{packages.length}</div>
          <p className="mt-1 text-[11px] text-faint">Outbound parcels tracked</p>
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
            {packages.filter((p) => p.status === "DISPATCHED" || p.status === "IN_TRANSIT" || p.status === "OUT_FOR_DELIVERY").length}
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
                <th className="px-4 py-3">Carrier &amp; Tracking</th>
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
                          item.status === "DELIVERED"
                            ? "success"
                            : item.status === "DISPATCHED" || item.status === "OUT_FOR_DELIVERY"
                            ? "info"
                            : item.status === "SEALED"
                            ? "brand"
                            : "neutral"
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {item.status === "REGISTERED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPackage(item);
                              setShowSealModal(true);
                            }}
                            className="text-xs h-7 px-2"
                          >
                            Attach Seal
                          </Button>
                        )}

                        {(item.status === "REGISTERED" || item.status === "SEALED") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPackage(item);
                              setDispatchCarrier(item.carrierName || "FedEx Express");
                              setDispatchTracking(item.trackingNumber || "TRK-774910293");
                              setShowDispatchModal(true);
                            }}
                            className="text-xs h-7 px-2 text-sky-400 border-sky-500/30 hover:bg-sky-500/10"
                          >
                            Dispatch
                          </Button>
                        )}

                        {(item.status === "DISPATCHED" || item.status === "IN_TRANSIT" || item.status === "OUT_FOR_DELIVERY") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPackage(item);
                              setShowEventModal(true);
                            }}
                            className="text-xs h-7 px-2 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                          >
                            Checkpoint
                          </Button>
                        )}

                        {(item.status === "DISPATCHED" || item.status === "IN_TRANSIT" || item.status === "OUT_FOR_DELIVERY") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConfirmReceipt(item)}
                            className="text-xs h-7 px-2 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                          >
                            Confirm Receipt
                          </Button>
                        )}

                        <Link
                          href={`/intake?packageId=${item.id}&action=unbox`}
                          className="inline-flex items-center text-xs text-amber-400 hover:underline px-1.5 py-1"
                        >
                          <Sparkles className="h-3 w-3 mr-0.5" />
                          Unbox
                        </Link>

                        <Link
                          href={`/api/packages/verify/${item.qrVerificationToken}`}
                          target="_blank"
                          className="inline-flex items-center text-xs text-brand-2 hover:underline px-1.5 py-1"
                        >
                          Verify QR
                          <ExternalLink className="h-3 w-3 ml-0.5" />
                        </Link>
                      </div>
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
                Apply &amp; Seal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {showDispatchModal && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface-1 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-fg flex items-center gap-2">
              <Truck className="h-5 w-5 text-sky-400" />
              Dispatch Package to Carrier
            </h3>
            <p className="mt-1 text-xs text-muted">
              Mark package <span className="text-fg font-mono">{selectedPackage.uniquePackageId}</span> as dispatched and in transit.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-fg">Carrier Partner</label>
                <Input
                  value={dispatchCarrier}
                  onChange={(e) => setDispatchCarrier(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-fg">Air Waybill / Tracking Number</label>
                <Input
                  value={dispatchTracking}
                  onChange={(e) => setDispatchTracking(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDispatchModal(false)}
                disabled={isDispatching}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDispatchPackage}
                disabled={isDispatching || !dispatchCarrier || !dispatchTracking}
              >
                {isDispatching ? "Dispatching..." : "Confirm Dispatch"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Checkpoint Modal */}
      {showEventModal && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface-1 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-fg flex items-center gap-2">
              <Navigation className="h-5 w-5 text-amber-400" />
              Record Delivery Checkpoint Event
            </h3>
            <p className="mt-1 text-xs text-muted">
              Package: <span className="text-fg font-mono">{selectedPackage.uniquePackageId}</span>
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-fg">Carrier Event Milestone</label>
                <Select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="mt-1"
                >
                  <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY (Triggers Unboxing Reminder)</option>
                  <option value="IN_TRANSIT">IN_TRANSIT (Departed Facility)</option>
                  <option value="DELAYED">DELAYED (Severe Weather / Exception)</option>
                  <option value="DELIVERED">DELIVERED (Courier Sign-off)</option>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-fg">Checkpoint Location</label>
                <Input
                  value={checkpointLocation}
                  onChange={(e) => setCheckpointLocation(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEventModal(false)}
                disabled={isRecordingEvent}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRecordDeliveryEvent}
                disabled={isRecordingEvent}
              >
                {isRecordingEvent ? "Recording..." : "Log Checkpoint"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
