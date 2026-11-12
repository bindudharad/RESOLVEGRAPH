"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Store,
  Plus,
  Save,
  Info,
} from "lucide-react";
import { SellerStatusPill, formatSellerDate } from "@/components/seller/seller-ui-primitives";

interface MarketplaceAccountItem {
  id: string;
  marketplace: string;
  marketplaceSellerId: string | null;
  storefrontName: string | null;
  marketplaceUrl: string | null;
  relationshipType: string | null;
  isVerified: boolean;
}

interface AvailableOrgOption {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  membershipRole: string;
}

interface SellerProfileState {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  membershipRole: string;
  availableOrganizations?: AvailableOrgOption[];
  canEditOperationalFields: boolean;
  canEditIdentityFields: boolean;
  canViewSensitiveTaxDetails: boolean;
  sellerDirectoryId: string | null;
  legalName: string;
  displayName: string;
  businessType: string;
  gstin: string | null;
  panMasked: string | null;
  businessAddress: string;
  state: string;
  businessEmail: string;
  verifiedContactNumber: string;
  registrationStatus: string;
  verificationStatus: string;
  identityStatus: string;
  reverificationNotice: string | null;
  verifiedAt: string | null;
  marketplaceAccounts: MarketplaceAccountItem[];
}

function formatVerificationBadgeLabel(status: string): string {
  switch ((status || "").toUpperCase()) {
    case "VERIFIED":
      return "Verified";
    case "VERIFICATION_PENDING":
      return "Human Review Required";
    case "PENDING":
      return "Under Verification";
    default:
      return status.replace(/_/g, " ");
  }
}

export default function SellerBusinessProfilePage() {
  const [profile, setProfile] = useState<SellerProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMarketplace, setSavingMarketplace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable form state
  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [gstin, setGstin] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [stateName, setStateName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [verifiedContactNumber, setVerifiedContactNumber] = useState("");

  // Add storefront form
  const [showAddMarketplace, setShowAddMarketplace] = useState(false);
  const [newMarketplace, setNewMarketplace] = useState("");
  const [newStorefrontName, setNewStorefrontName] = useState("");
  const [newSellerId, setNewSellerId] = useState("");
  const [newMarketplaceUrl, setNewMarketplaceUrl] = useState("");

  const hydrateForm = useCallback((p: SellerProfileState) => {
    setLegalName(p.legalName || "");
    setDisplayName(p.displayName || "");
    setBusinessType(p.businessType || "");
    setGstin(p.gstin || "");
    setBusinessAddress(p.businessAddress || "");
    setStateName(p.state || "");
    setBusinessEmail(p.businessEmail || "");
    setVerifiedContactNumber(p.verifiedContactNumber || "");
  }, []);

  const loadProfile = useCallback(
    async (orgId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const query = orgId ? `?organizationId=${encodeURIComponent(orgId)}` : "";
        const res = await fetch(`/api/seller/profile${query}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load business profile");
        }
        setProfile(data.profile);
        hydrateForm(data.profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load business profile");
      } finally {
        setLoading(false);
      }
    },
    [hydrateForm]
  );

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const identityFieldChanged =
    profile !== null &&
    (legalName.trim() !== (profile.legalName || "").trim() ||
      gstin.trim().toUpperCase() !== (profile.gstin || "").trim().toUpperCase());

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload: Record<string, unknown> = {
        organizationId: profile.organizationId,
        displayName: displayName.trim(),
        businessType: businessType.trim(),
        businessAddress: businessAddress.trim(),
        state: stateName.trim(),
        businessEmail: businessEmail.trim(),
        verifiedContactNumber: verifiedContactNumber.trim(),
      };

      if (profile.canEditIdentityFields) {
        payload.legalName = legalName.trim();
        payload.gstin = gstin.trim() ? gstin.trim().toUpperCase() : null;
      }

      const res = await fetch("/api/seller/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save business profile");
      }
      setProfile(data.profile);
      hydrateForm(data.profile);
      setSuccessMsg(
        data.profile.reverificationNotice
          ? "Changes saved. Re-verification has been initiated for your updated legal/tax identity."
          : "Business profile updated successfully."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save business profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMarketplace(e: FormEvent) {
    e.preventDefault();
    if (!newMarketplace.trim()) return;
    setSavingMarketplace(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/seller/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: profile?.organizationId,
          marketplaceAccount: {
            marketplace: newMarketplace.trim(),
            storefrontName: newStorefrontName.trim() || undefined,
            marketplaceSellerId: newSellerId.trim() || undefined,
            marketplaceUrl: newMarketplaceUrl.trim() || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to link marketplace storefront");
      }
      setProfile(data.profile);
      setNewMarketplace("");
      setNewStorefrontName("");
      setNewSellerId("");
      setNewMarketplaceUrl("");
      setShowAddMarketplace(false);
      setSuccessMsg("Marketplace storefront linked to your business profile.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link marketplace storefront");
    } finally {
      setSavingMarketplace(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-5 py-4">
        <div className="h-6 w-48 animate-pulse rounded bg-[var(--surface)]" />
        <div className="h-32 animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />
        <div className="h-80 animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 py-6">
        <Link
          href="/seller"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink-2)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Seller Dashboard</span>
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error || "Seller business profile could not be loaded."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-10">
      <div>
        <Link
          href="/seller"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink-2)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Seller Dashboard</span>
        </Link>
      </div>

      {/* Header Summary Card */}
      <header className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--ink)] truncate">
                {profile.displayName || profile.legalName}
              </h1>
              <SellerStatusPill label={formatVerificationBadgeLabel(profile.verificationStatus)} />
            </div>
            <p className="mt-1 text-xs text-[var(--ink-2)]">
              Organization: <span className="font-medium text-[var(--ink)]">{profile.organizationName}</span>
              {" · "}
              Role: <span className="font-mono text-[var(--ink)]">{profile.membershipRole}</span>
              {profile.verifiedAt ? ` · Verified ${formatSellerDate(profile.verifiedAt)}` : ""}
            </p>
          </div>
        </div>
        {profile.availableOrganizations && profile.availableOrganizations.length > 1 && (
          <div className="shrink-0">
            <label
              htmlFor="seller-org-switcher"
              className="block text-[11px] font-semibold text-[var(--ink-3)] mb-1"
            >
              Switch Organization
            </label>
            <select
              id="seller-org-switcher"
              value={profile.organizationId}
              onChange={(e) => void loadProfile(e.target.value)}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--ink)]"
            >
              {profile.availableOrganizations.map((orgOpt) => (
                <option key={orgOpt.organizationId} value={orgOpt.organizationId}>
                  {orgOpt.organizationName} ({orgOpt.membershipRole})
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* Pending Re-verification Banner */}
      {(profile.verificationStatus === "VERIFICATION_PENDING" || profile.reverificationNotice) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs sm:text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-semibold">Business Identity Re-verification Pending</p>
            <p className="mt-0.5 text-xs opacity-90">
              {profile.reverificationNotice ||
                "Changes to legal name or GSTIN are queued for compliance verification by a platform administrator."}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {!profile.canEditOperationalFields && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/60 px-4 py-3 text-xs text-[var(--ink-2)]">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-[var(--ink-3)]" />
          <span>
            Your organization role ({profile.membershipRole}) has read-only access to business profile fields. Contact an organization administrator to update registered details.
          </span>
        </div>
      )}

      {/* Business Identity & Operational Details Form */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs space-y-6"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="text-base font-semibold text-[var(--ink)]">
                Registered Legal &amp; Tax Identity
              </h2>
            </div>
            {!profile.canEditIdentityFields && (
              <span className="text-[11px] font-medium text-[var(--ink-3)]">
                Owner / Admin only
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--ink-2)] mb-1.5">
                Legal Business Name
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                disabled={!profile.canEditIdentityFields}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] disabled:opacity-60 focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--ink-2)] mb-1.5">
                GSTIN
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                disabled={!profile.canEditIdentityFields}
                placeholder={profile.canViewSensitiveTaxDetails ? "15-character GSTIN" : "Restricted to Owner/Admin"}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 font-mono text-sm text-[var(--ink)] disabled:opacity-60 focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            {profile.panMasked && (
              <div>
                <label className="block text-xs font-medium text-[var(--ink-2)] mb-1.5">
                  PAN (Verified Masked Record)
                </label>
                <input
                  type="text"
                  value={profile.panMasked}
                  readOnly
                  disabled
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/60 px-3 py-2 font-mono text-sm text-[var(--ink-2)]"
                />
              </div>
            )}
          </div>

          {identityFieldChanged && profile.canEditIdentityFields && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Saving changes to Legal Business Name or GSTIN will trigger compliance re-verification and notify platform administrators.
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="border-b border-[var(--line)] pb-3">
            <h2 className="text-base font-semibold text-[var(--ink)]">
              Storefront &amp; Contact Information
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--ink-2)] mb-1.5">
                Storefront Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={!profile.canEditOperationalFields}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] disabled:opacity-60 focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--ink-2)] mb-1.5">
                Business Type
              </label>
              <input
                type="text"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                disabled={!profile.canEditOperationalFields}
                placeholder="e.g., Private Limited, Sole Proprietorship"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] disabled:opacity-60 focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--ink-2)] mb-1.5">
                Business Contact Email
              </label>
              <input
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                disabled={!profile.canEditOperationalFields}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] disabled:opacity-60 focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--ink-2)] mb-1.5">
                Verified Contact Number
              </label>
              <input
                type="text"
                value={verifiedContactNumber}
                onChange={(e) => setVerifiedContactNumber(e.target.value)}
                disabled={!profile.canEditOperationalFields}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] disabled:opacity-60 focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--ink-2)] mb-1.5">
                Registered / Dispatch Address
              </label>
              <textarea
                rows={2}
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                disabled={!profile.canEditOperationalFields}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] disabled:opacity-60 focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--ink-2)] mb-1.5">
                State / Jurisdiction
              </label>
              <input
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                disabled={!profile.canEditOperationalFields}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] disabled:opacity-60 focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {profile.canEditOperationalFields && (
          <div className="flex justify-end border-t border-[var(--line)] pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-60 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? "Saving Changes..." : "Save Profile Changes"}</span>
            </button>
          </div>
        )}
      </form>

      {/* Marketplace Accounts Section */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="text-base font-semibold text-[var(--ink)]">
              Linked Marketplace Storefronts ({profile.marketplaceAccounts.length})
            </h2>
          </div>

          {profile.canEditOperationalFields && (
            <button
              type="button"
              onClick={() => setShowAddMarketplace((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-2)]/80 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{showAddMarketplace ? "Cancel" : "Link Marketplace"}</span>
            </button>
          )}
        </div>

        {showAddMarketplace && profile.canEditOperationalFields && (
          <form
            onSubmit={handleAddMarketplace}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-4 space-y-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[var(--ink-2)] mb-1">
                  Marketplace Name *
                </label>
                <input
                  type="text"
                  required
                  value={newMarketplace}
                  onChange={(e) => setNewMarketplace(e.target.value)}
                  placeholder="e.g., Amazon India, Flipkart, Shopify"
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs sm:text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--ink-2)] mb-1">
                  Storefront Display Name
                </label>
                <input
                  type="text"
                  value={newStorefrontName}
                  onChange={(e) => setNewStorefrontName(e.target.value)}
                  placeholder="Storefront name visible to buyers"
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs sm:text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--ink-2)] mb-1">
                  Marketplace Seller ID
                </label>
                <input
                  type="text"
                  value={newSellerId}
                  onChange={(e) => setNewSellerId(e.target.value)}
                  placeholder="Optional merchant token / ID"
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 font-mono text-xs sm:text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--ink-2)] mb-1">
                  Storefront URL
                </label>
                <input
                  type="url"
                  value={newMarketplaceUrl}
                  onChange={(e) => setNewMarketplaceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs sm:text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingMarketplace}
                className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                {savingMarketplace ? "Linking..." : "Save Storefront"}
              </button>
            </div>
          </form>
        )}

        {profile.marketplaceAccounts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--line)] p-4 text-xs sm:text-sm text-[var(--ink-2)]">
            No marketplace storefronts linked yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {profile.marketplaceAccounts.map((acc) => (
              <div
                key={acc.id}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/30 p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--ink)]">{acc.marketplace}</span>
                  <SellerStatusPill label={acc.isVerified ? "Verified" : "Pending"} />
                </div>
                {acc.storefrontName && (
                  <p className="text-xs text-[var(--ink-2)]">
                    Storefront: <span className="font-medium text-[var(--ink)]">{acc.storefrontName}</span>
                  </p>
                )}
                {acc.marketplaceSellerId && (
                  <p className="text-xs text-[var(--ink-3)] font-mono">
                    ID: {acc.marketplaceSellerId}
                  </p>
                )}
                {acc.marketplaceUrl && (
                  <a
                    href={acc.marketplaceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs text-[var(--accent)] hover:underline break-all"
                  >
                    {acc.marketplaceUrl}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
