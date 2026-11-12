"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Search,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrganizationOption {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

interface DirectoryEntry {
  id: string;
  legalName: string;
  displayName: string | null;
  gstin: string | null;
  panMasked: string | null;
  businessAddress: string | null;
  state: string | null;
  identityStatus: string;
  registrationStatus: string;
  verificationStatus: string;
  identificationSource: string;
  verifiedAt: string | null;
  linkedOrganizationId: string | null;
  linkedOrganization: OrganizationOption | null;
  marketplaceAccounts: Array<{
    id: string;
    marketplace: string;
    marketplaceSellerId: string | null;
    storefrontName: string | null;
    isVerified: boolean;
  }>;
  _count: {
    evidenceRequests: number;
    identityMatches: number;
  };
}

export default function SellerDirectoryPage() {
  const [sellers, setSellers] = useState<DirectoryEntry[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [regFilter, setRegFilter] = useState("ALL");

  // Quick register form
  const [showAdd, setShowAdd] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [gstin, setGstin] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [marketplace, setMarketplace] = useState("FLIPKART");
  const [linkedOrgId, setLinkedOrgId] = useState("");
  const [saving, setSaving] = useState(false);

  const loadDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      if (regFilter !== "ALL") qs.set("registrationStatus", regFilter);
      const res = await fetch(`/api/seller/directory?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load Seller Directory");
      setSellers(data.sellers || []);
      setOrganizations(data.organizations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load directory");
    } finally {
      setLoading(false);
    }
  }, [search, regFilter]);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/seller/directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalName: legalName.trim(),
          gstin: gstin.trim() || undefined,
          state: stateVal.trim() || undefined,
          marketplace,
          linkedOrganizationId: linkedOrgId || null,
          registrationStatus: linkedOrgId ? "REGISTERED" : "UNREGISTERED",
          verificationStatus: linkedOrgId ? "VERIFIED" : "UNVERIFIED",
          identityStatus: linkedOrgId ? "REGISTERED" : "IDENTIFIED",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create entry");
      setLegalName("");
      setGstin("");
      setStateVal("");
      setLinkedOrgId("");
      setShowAdd(false);
      await loadDirectory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyLink = async (sellerId: string, organizationId: string | null) => {
    setError(null);
    try {
      const res = await fetch(`/api/seller/directory/${encodeURIComponent(sellerId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationStatus: "VERIFIED",
          linkedOrganizationId: organizationId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification update failed");
      await loadDirectory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify seller");
    }
  };

  return (
    <div className="space-y-6">
      <header className="rg-card p-5 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-subtle">
            <Building2 className="h-4 w-4 text-[var(--accent)]" />
            <span>Central Identity Governance</span>
          </div>
          <h1 className="mt-1.5 text-[22px] font-bold text-fg">Seller Directory</h1>
          <p className="mt-1 text-xs text-muted max-w-2xl">
            Distinguishes unverified sellers extracted from buyer invoices from verified merchant
            organizations registered on RESOLVEGRAPH.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadDirectory}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAdd((p) => !p)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Seller Entry
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleCreateEntry} className="rg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-fg">Register Seller Directory Entry</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              type="text"
              required
              placeholder="Legal Seller Name (e.g., Suri Consumer Private Limited)"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-fg"
            />
            <input
              type="text"
              placeholder="GSTIN (15 chars, optional)"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs font-mono text-fg"
            />
            <input
              type="text"
              placeholder="State (e.g., Karnataka)"
              value={stateVal}
              onChange={(e) => setStateVal(e.target.value)}
              className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-fg"
            />
            <select
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value)}
              className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-fg"
            >
              <option value="FLIPKART">FLIPKART</option>
              <option value="AMAZON">AMAZON</option>
              <option value="MEESHO">MEESHO</option>
              <option value="MYNTRA">MYNTRA</option>
              <option value="DIRECT">DIRECT</option>
              <option value="OTHER">OTHER</option>
            </select>
            <select
              value={linkedOrgId}
              onChange={(e) => setLinkedOrgId(e.target.value)}
              className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-fg"
            >
              <option value="">Unregistered (Not linked to RESOLVEGRAPH Org)</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  Link Org: {org.name}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving..." : "Save Directory Entry"}
            </Button>
          </div>
        </form>
      )}

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-3.5 w-3.5 text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search legal name, storefront, GSTIN, or state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface pl-8 pr-3 py-2 text-xs text-fg"
          />
        </div>
        {["ALL", "REGISTERED", "UNREGISTERED", "INACTIVE"].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setRegFilter(st)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer ${
              regFilter === st
                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-fg"
                : "border-line bg-surface text-muted hover:text-fg"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Directory List */}
      <div className="space-y-3">
        {loading ? (
          <div className="rg-card p-8 text-center text-xs text-muted">Loading Seller Directory...</div>
        ) : sellers.length === 0 ? (
          <div className="rg-card p-8 text-center text-xs text-muted">
            No matching sellers in directory.
          </div>
        ) : (
          sellers.map((s) => (
            <div key={s.id} className="rg-card p-4 sm:p-5 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-fg">{s.legalName}</h3>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-mono ${
                        s.registrationStatus === "REGISTERED"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      {s.registrationStatus}
                    </span>
                    <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-mono text-subtle">
                      {s.verificationStatus}
                    </span>
                    <span className="rounded border border-line px-2 py-0.5 text-[10px] font-mono text-subtle">
                      Source: {s.identificationSource}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>
                      GSTIN:{" "}
                      <strong className="font-mono text-fg">{s.gstin || "Not Extracted"}</strong>
                    </span>
                    {s.panMasked && (
                      <span>
                        PAN: <strong className="font-mono text-fg">{s.panMasked}</strong>
                      </span>
                    )}
                    {s.state && <span>State: {s.state}</span>}
                    <span>
                      Cases Matched: <strong className="text-fg">{s._count.identityMatches}</strong>
                    </span>
                    <span>
                      Requests: <strong className="text-fg">{s._count.evidenceRequests}</strong>
                    </span>
                  </div>

                  {s.marketplaceAccounts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {s.marketplaceAccounts.map((acc) => (
                        <span
                          key={acc.id}
                          className="rounded border border-line bg-surface-2 px-2 py-0.5 text-[10.5px] font-mono text-subtle"
                        >
                          {acc.marketplace}
                          {acc.marketplaceSellerId ? `: ${acc.marketplaceSellerId}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {s.linkedOrganization ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Linked: {s.linkedOrganization.name}</span>
                    </span>
                  ) : (
                    <select
                      aria-label={`Link organization for ${s.legalName}`}
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) handleVerifyLink(s.id, e.target.value);
                      }}
                      className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-fg"
                    >
                      <option value="">Link to Registered Org...</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {s.verificationStatus !== "VERIFIED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerifyLink(s.id, s.linkedOrganizationId)}
                    >
                      <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                      Verify Identity
                    </Button>
                  )}

                  {s.linkedOrganizationId && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-subtle">
                      <Link2 className="h-3 w-3" /> Portal Connected
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
