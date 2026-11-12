"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import {
  Bell,
  CheckCircle2,
  Globe,
  Info,
  Moon,
  Palette,
  Sun,
  User,
  Users,
  ShieldCheck,
  Server,
  Cpu,
  CreditCard,
  Building2,
  KeyRound,
  Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/common/toast";

type SettingsTab = "workspace" | "profile" | "appearance" | "notifications" | "about";

interface ProfileOrgMembership {
  organizationId: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

interface RealUserProfile {
  id: string;
  email: string;
  name: string;
  fullName: string;
  role: string;
  isPlatformAdmin: boolean;
  phone: string | null;
  organization: string | null;
  orgMemberships?: ProfileOrgMembership[];
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "RG";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatRoleLabel(role?: string, isPlatformAdmin?: boolean): string {
  if (isPlatformAdmin || role === "ADMIN") return "Platform Administrator";
  if (role === "MERCHANT") return "Seller Account";
  if (role === "BUYER") return "Customer Account";
  if (role === "RESOLUTION_MANAGER") return "Resolution Manager";
  if (role === "INVESTIGATOR") return "Investigator";
  return role || "Workspace Member";
}

interface HealthStatus {
  status: string;
  uptimeSeconds: number;
  database: {
    connected: boolean;
    stats?: {
      users: number;
      cases: number;
      evidence: number;
    };
  };
  aiEngine: {
    provider: string;
    modelTier: string;
  };
  paypal: {
    mode: string;
    configured: boolean;
    environment: string;
  };
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const sessionUser = session?.user as
    | { name?: string; email?: string; role?: string; isPlatformAdmin?: boolean; organization?: string }
    | undefined;
  const isPlatformAdmin = Boolean(sessionUser?.isPlatformAdmin || sessionUser?.role === "ADMIN");
  const isMerchant = Boolean(sessionUser?.role === "MERCHANT" && !isPlatformAdmin);
  const isBuyer = Boolean(sessionUser?.role === "BUYER" && !isPlatformAdmin);
  const isEnterpriseStaff = !isBuyer && !isMerchant;

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [hasInitializedTab, setHasInitializedTab] = useState(false);

  // Real DB-backed profile state
  const [dbProfile, setDbProfile] = useState<RealUserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [workspaceName, setWorkspaceName] = useState<string>("RESOLVEGRAPH");
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userPhone, setUserPhone] = useState<string>("");

  useEffect(() => {
    if (!hasInitializedTab && sessionUser) {
      setActiveTab(isEnterpriseStaff ? "workspace" : "profile");
      setHasInitializedTab(true);
    }
  }, [hasInitializedTab, isEnterpriseStaff, sessionUser]);

  useEffect(() => {
    let active = true;
    setProfileLoading(true);
    fetch("/api/profile", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load profile");
        return data;
      })
      .then((data) => {
        if (!active || !data?.profile) return;
        const p = data.profile as RealUserProfile;
        setDbProfile(p);
        setUserName(p.fullName || p.name || "");
        setUserEmail(p.email || "");
        setUserPhone(p.phone || "");
        setWorkspaceName(
          p.orgMemberships?.[0]?.organization?.name || p.organization || "RESOLVEGRAPH"
        );
      })
      .catch((err) => {
        if (!active) return;
        if (sessionUser?.name) setUserName(sessionUser.name);
        if (sessionUser?.email) setUserEmail(sessionUser.email);
        console.error("Failed to fetch real user profile:", err);
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sessionUser?.email, sessionUser?.name]);

  const [density, setDensity] = useState<"compact" | "default">(() => {
    if (typeof window === "undefined") return "default";
    try {
      const saved = localStorage.getItem("rg_density");
      return saved === "compact" || saved === "default" ? saved : "default";
    } catch {
      return "default";
    }
  });

  const [notifyOverdue, setNotifyOverdue] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("rg_notify_overdue");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const [notifyAi, setNotifyAi] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("rg_notify_ai");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const [notifyDigest, setNotifyDigest] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("rg_notify_digest");
      return saved !== null ? saved === "true" : false;
    } catch {
      return false;
    }
  });

  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    if (!isEnterpriseStaff) return;
    let active = true;
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) setHealth(data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [isEnterpriseStaff]);

  const handleSave = async () => {
    const trimmedName = userName.trim();
    if (trimmedName.length < 2) {
      toast({
        tone: "error",
        title: "Invalid Name",
        description: "Full name must be at least 2 characters long.",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimmedName,
          phone: userPhone.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile settings.");
      }

      if (data.profile) {
        setDbProfile(data.profile);
        setUserName(data.profile.fullName || data.profile.name || trimmedName);
        setUserPhone(data.profile.phone || "");
      }

      try {
        localStorage.setItem("rg_density", density);
        localStorage.setItem("rg_notify_overdue", String(notifyOverdue));
        localStorage.setItem("rg_notify_ai", String(notifyAi));
        localStorage.setItem("rg_notify_digest", String(notifyDigest));
      } catch {
        // Ignore storage errors
      }

      toast({
        tone: "success",
        title: "Account Settings Saved",
        description: "Your profile details and preferences have been persisted to the database.",
      });
    } catch (err: unknown) {
      toast({
        tone: "error",
        title: "Save Failed",
        description: err instanceof Error ? err.message : "Could not save profile changes.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Role-aware Sub-Navigation */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 flex-wrap">
        {isMerchant ? (
          <>
            <Link
              href="/seller"
              className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-subtle hover:text-fg hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1.5"
            >
              Seller Dashboard
            </Link>
            <Link
              href="/seller/profile"
              className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-subtle hover:text-fg hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1.5"
            >
              <Building2 className="h-3.5 w-3.5" />
              Business Profile
            </Link>
            <span className="rounded-lg bg-[#0E121D] border border-white/[0.12] px-3.5 py-1.5 text-xs font-semibold text-fg inline-flex items-center gap-1.5 shadow-sm">
              <SettingsIcon className="h-3.5 w-3.5 text-sky-400" />
              Account Settings
            </span>
          </>
        ) : isBuyer ? (
          <>
            <Link
              href="/overview"
              className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-subtle hover:text-fg hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1.5"
            >
              Customer Portal
            </Link>
            <Link
              href="/cases"
              className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-subtle hover:text-fg hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1.5"
            >
              My Complaints
            </Link>
            <span className="rounded-lg bg-[#0E121D] border border-white/[0.12] px-3.5 py-1.5 text-xs font-semibold text-fg inline-flex items-center gap-1.5 shadow-sm">
              <SettingsIcon className="h-3.5 w-3.5 text-sky-400" />
              Account Settings
            </span>
          </>
        ) : (
          <>
            <Link
              href="/organizations"
              className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-subtle hover:text-fg hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1.5"
            >
              <Building2 className="h-3.5 w-3.5" />
              Organizations &amp; Roles
            </Link>
            <Link
              href="/admin/security"
              className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-subtle hover:text-fg hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1.5"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Security &amp; Cryptographic Audit
            </Link>
            <span className="rounded-lg bg-[#0E121D] border border-white/[0.12] px-3.5 py-1.5 text-xs font-semibold text-fg inline-flex items-center gap-1.5 shadow-sm">
              <SettingsIcon className="h-3.5 w-3.5 text-sky-400" />
              Platform Settings
            </span>
          </>
        )}
      </div>

      {/* Header section */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[23px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">
              {isEnterpriseStaff ? "Platform & Workspace Settings" : "Account Settings"}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {formatRoleLabel(dbProfile?.role || sessionUser?.role, dbProfile?.isPlatformAdmin || isPlatformAdmin)}
            </span>
          </div>
          <p className="mt-1 text-[13.5px] text-subtle">
            {isEnterpriseStaff
              ? "Manage your workspace configuration, administrative profile, and system parameters."
              : "Manage your personal profile details, contact number, and notification preferences."}
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || profileLoading}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </section>

      {/* Main settings layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Navigation Tabs */}
        <nav className="flex flex-row overflow-x-auto lg:flex-col gap-1 border-b border-white/[0.08] pb-3 lg:border-b-0 lg:pb-0">
          {isEnterpriseStaff && (
            <button
              type="button"
              onClick={() => setActiveTab("workspace")}
              className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-xs font-medium transition-colors text-left shrink-0 ${
                activeTab === "workspace"
                  ? "bg-white/[0.08] font-semibold text-white border border-white/[0.1]"
                  : "text-subtle hover:bg-white/[0.04] hover:text-fg"
              }`}
            >
              <Globe className="h-4 w-4 text-sky-400" />
              <span>Workspace</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-xs font-medium transition-colors text-left shrink-0 ${
              activeTab === "profile"
                ? "bg-white/[0.08] font-semibold text-white border border-white/[0.1]"
                : "text-subtle hover:bg-white/[0.04] hover:text-fg"
            }`}
          >
            <User className="h-4 w-4 text-emerald-400" />
            <span>Account Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("appearance")}
            className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-xs font-medium transition-colors text-left shrink-0 ${
              activeTab === "appearance"
                ? "bg-white/[0.08] font-semibold text-white border border-white/[0.1]"
                : "text-subtle hover:bg-white/[0.04] hover:text-fg"
            }`}
          >
            <Palette className="h-4 w-4 text-amber-400" />
            <span>Appearance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-xs font-medium transition-colors text-left shrink-0 ${
              activeTab === "notifications"
                ? "bg-white/[0.08] font-semibold text-white border border-white/[0.1]"
                : "text-subtle hover:bg-white/[0.04] hover:text-fg"
            }`}
          >
            <Bell className="h-4 w-4 text-rose-400" />
            <span>Notifications</span>
          </button>

          {isEnterpriseStaff && (
            <button
              type="button"
              onClick={() => setActiveTab("about")}
              className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-xs font-medium transition-colors text-left shrink-0 ${
                activeTab === "about"
                  ? "bg-white/[0.08] font-semibold text-white border border-white/[0.1]"
                  : "text-subtle hover:bg-white/[0.04] hover:text-fg"
              }`}
            >
              <Info className="h-4 w-4 text-indigo-400" />
              <span>About Architecture</span>
            </button>
          )}
        </nav>

        {/* Tab Content Panes */}
        <div className="flex flex-col gap-6">
          {/* Workspace Tab */}
          {activeTab === "workspace" && isEnterpriseStaff && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] flex flex-col gap-6 p-6">
              <div>
                <h2 className="text-[15px] font-semibold text-fg">Workspace Metadata</h2>
                <p className="mt-0.5 text-xs text-subtle">
                  Organization tenant parameters and commerce intelligence environment.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <Field
                  htmlFor="workspace-name"
                  label="Workspace Name"
                  hint="Displayed in the workspace header and case dossiers"
                >
                  <Input
                    id="workspace-name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="bg-[#0A0D14] border-white/[0.08]"
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field htmlFor="product-descriptor" label="Product Descriptor">
                    <Input id="product-descriptor" value="RESOLVEGRAPH Commerce Resolution" disabled className="opacity-80 bg-[#0A0D14] border-white/[0.08]" />
                  </Field>

                  <Field htmlFor="plan-license" label="Environment Mode">
                    <Input id="plan-license" value="Enterprise Multi-Tenant" disabled className="opacity-80 bg-[#0A0D14] border-white/[0.08]" />
                  </Field>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-4 text-xs text-subtle">
                  <div className="flex items-center gap-2 font-medium text-fg">
                    <Users className="h-4 w-4 text-sky-400" />
                    <span>Registered Platform Users: {health?.database.stats?.users ?? "—"}</span>
                  </div>
                  <p className="mt-1 text-faint">
                    Enterprise workspace instance configured with multi-tenant role-based access control.
                  </p>
                </div>

                {health && (
                  <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-4">
                    <h3 className="text-xs font-semibold text-fg mb-3 flex items-center gap-2 uppercase tracking-wider">
                      <Server className="h-4 w-4 text-emerald-400" />
                      Infrastructure Health & Telemetry
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-faint">Database Engine:</span>
                        <p className="font-semibold text-emerald-400">
                          {health.database.connected ? "Connected (SQLite WAL)" : "Disconnected"}
                        </p>
                      </div>
                      <div>
                        <span className="text-faint">Indexed Dispute Records:</span>
                        <p className="font-mono font-semibold text-fg">{health.database.stats?.cases ?? 0}</p>
                      </div>
                      <div>
                        <span className="text-faint">AI Reasoning Engine:</span>
                        <p className="font-semibold text-fg capitalize">{health.aiEngine.provider}</p>
                      </div>
                      <div>
                        <span className="text-faint">Payment Gateway:</span>
                        <p className="font-semibold text-fg uppercase">{health.paypal.environment} ({health.paypal.mode})</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* User Profile Tab */}
          {activeTab === "profile" && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] flex flex-col gap-6 p-6">
              <div>
                <h2 className="text-[15px] font-semibold text-fg">
                  {isEnterpriseStaff ? "Administrator Profile" : isMerchant ? "Seller Account Profile" : "Customer Profile"}
                </h2>
                <p className="mt-0.5 text-xs text-subtle">
                  {isEnterpriseStaff
                    ? "Personal credentials and triage officer attribution."
                    : "Verified account details stored securely in RESOLVEGRAPH."}
                </p>
              </div>

              {profileLoading ? (
                <p className="text-xs text-subtle py-4">Loading account profile...</p>
              ) : (
                <>
                  <div className="flex items-center gap-4 border-b border-white/[0.06] pb-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-base font-bold text-fg">
                      {getInitials(userName || dbProfile?.fullName || "RG")}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-fg">{userName || "Account User"}</h3>
                      <p className="text-xs text-subtle">
                        {formatRoleLabel(dbProfile?.role || sessionUser?.role, dbProfile?.isPlatformAdmin || isPlatformAdmin)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <Field htmlFor="profile-name" label="Full Name">
                      <Input
                        id="profile-name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="bg-[#0A0D14] border-white/[0.08]"
                      />
                    </Field>

                    <Field htmlFor="profile-phone" label="Phone Number" hint="Optional contact number for complaint updates">
                      <Input
                        id="profile-phone"
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="bg-[#0A0D14] border-white/[0.08]"
                      />
                    </Field>

                    <Field htmlFor="profile-email" label="Registered Email Address" hint="Sign-in email cannot be edited here">
                      <Input
                        id="profile-email"
                        value={userEmail}
                        disabled
                        className="opacity-80 bg-[#0A0D14] border-white/[0.08]"
                      />
                    </Field>

                    <Field htmlFor="profile-role" label="Account Role">
                      <Input
                        id="profile-role"
                        value={formatRoleLabel(dbProfile?.role || sessionUser?.role, dbProfile?.isPlatformAdmin || isPlatformAdmin)}
                        disabled
                        className="opacity-80 bg-[#0A0D14] border-white/[0.08]"
                      />
                    </Field>

                    {dbProfile?.orgMemberships && dbProfile.orgMemberships.length > 0 && (
                      <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-4">
                        <p className="text-xs font-semibold text-fg mb-2">Active Organization Memberships</p>
                        <ul className="space-y-1.5 text-xs text-subtle">
                          {dbProfile.orgMemberships.map((m) => (
                            <li key={m.organizationId} className="flex items-center justify-between gap-2">
                              <span className="text-fg font-medium">{m.organization.name}</span>
                              <span className="rounded border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wide text-subtle">
                                {m.role}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] flex flex-col gap-6 p-6">
              <div>
                <h2 className="text-[15px] font-semibold text-fg">Appearance & Display</h2>
                <p className="mt-0.5 text-xs text-subtle">
                  Fine-tune theme parameters and information density.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-faint uppercase tracking-wider block mb-1">
                  Active Theme Palette
                </label>
                <p className="text-xs text-subtle mb-3">
                  RESOLVEGRAPH is engineered with an obsidian graphite palette and quiet hairlines.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-md">
                  <div className="flex items-center justify-between rounded-xl border border-sky-500/50 bg-[#0A0D14] p-3.5">
                    <div className="flex items-center gap-2.5">
                      <Moon className="h-4 w-4 text-sky-400" />
                      <div>
                        <p className="text-xs font-semibold text-fg">Obsidian Graphite</p>
                        <p className="text-[11px] text-faint">Enterprise Dark (Active)</p>
                      </div>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#0A0D14] p-3.5 opacity-60">
                    <div className="flex items-center gap-2.5">
                      <Sun className="h-4 w-4 text-subtle" />
                      <div>
                        <p className="text-xs font-semibold text-fg">Enterprise Light</p>
                        <p className="text-[11px] text-faint">High-Contrast Mode</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-faint">Available</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <label className="text-xs font-semibold text-faint uppercase tracking-wider block mb-1">
                  Table Density
                </label>
                <div className="mt-2.5 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDensity("default")}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      density === "default"
                        ? "border-white/[0.14] bg-white/[0.08] text-white font-semibold"
                        : "border-white/[0.08] bg-[#0A0D14] text-subtle hover:text-fg"
                    }`}
                  >
                    Comfortable (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDensity("compact")}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      density === "compact"
                        ? "border-white/[0.14] bg-white/[0.08] text-white font-semibold"
                        : "border-white/[0.08] bg-[#0A0D14] text-subtle hover:text-fg"
                    }`}
                  >
                    Dense (High-Density)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] flex flex-col gap-6 p-6">
              <div>
                <h2 className="text-[15px] font-semibold text-fg">Notification Rules</h2>
                <p className="mt-0.5 text-xs text-subtle">
                  Configure real-time notifications and dispute alert dispatching.
                </p>
              </div>

              <div className="flex flex-col divide-y divide-white/[0.04]">
                <div className="flex items-center justify-between py-3.5">
                  <div>
                    <p className="text-xs font-medium text-fg">Overdue Dispute Alerts</p>
                    <p className="text-[11px] text-faint">
                      Notify when a merchant exceeds the mandated 48-hour response window.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOverdue}
                    onChange={(e) => setNotifyOverdue(e.target.checked)}
                    className="h-4 w-4 rounded border-white/[0.2] bg-[#0A0D14] accent-sky-500"
                  />
                </div>

                <div className="flex items-center justify-between py-3.5">
                  <div>
                    <p className="text-xs font-medium text-fg">AI Evidence Indexing Notices</p>
                    <p className="text-[11px] text-faint">
                      Alert when new document batches finish cryptographic indexing.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyAi}
                    onChange={(e) => setNotifyAi(e.target.checked)}
                    className="h-4 w-4 rounded border-white/[0.2] bg-[#0A0D14] accent-sky-500"
                  />
                </div>

                <div className="flex items-center justify-between py-3.5">
                  <div>
                    <p className="text-xs font-medium text-fg">Daily Morning Brief Digest</p>
                    <p className="text-[11px] text-faint">
                      Receive an executive summary email of active claim volume at 08:00 AM.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyDigest}
                    onChange={(e) => setNotifyDigest(e.target.checked)}
                    className="h-4 w-4 rounded border-white/[0.2] bg-[#0A0D14] accent-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* About RESOLVEGRAPH Tab */}
          {activeTab === "about" && isEnterpriseStaff && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] flex flex-col gap-5 p-6">
              <div>
                <h2 className="text-[15px] font-semibold text-fg">About RESOLVEGRAPH Platform</h2>
                <p className="mt-0.5 text-xs text-subtle">
                  AI-Powered Commerce Resolution Infrastructure.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-4 text-xs">
                <p className="font-semibold text-fg text-sm">
                  &ldquo;From the first complaint to a fair resolution.&rdquo;
                </p>
                <p className="mt-2 text-xs leading-relaxed text-subtle">
                  RESOLVEGRAPH connects buyers, merchants, payment records, supporting evidence and resolution workflows in one intelligent platform.
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-3">
                  <dt className="text-faint font-medium">Build Version</dt>
                  <dd className="mt-0.5 font-mono text-fg">2.0.0-enterprise</dd>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-3">
                  <dt className="text-faint font-medium">Release Quality</dt>
                  <dd className="mt-0.5 font-medium text-emerald-400">Audited & Verified</dd>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-3">
                  <dt className="text-faint font-medium">Core Stack</dt>
                  <dd className="mt-0.5 font-medium text-fg">Next.js · React 19 · Tailwind v4</dd>
                </div>
              </dl>

              <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-4 text-xs leading-relaxed text-subtle">
                <p className="font-semibold text-fg flex items-center gap-1.5 mb-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Verified Engineering Architecture:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start gap-2">
                    <Server className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <span><strong>Database:</strong> SQLite with 40 Prisma schema models & immutable audit events.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Cpu className="h-4 w-4 text-sky-400 mt-0.5 shrink-0" />
                    <span><strong>AI Intelligence:</strong> BERR 5-agent specialist reasoning with evidence citation gating.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span><strong>Payment Gateway:</strong> PayPal Sandbox Orders v2 capture, disputes, and refund workflows.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <span><strong>Governance:</strong> Dual-key human approval safeguards on all financial settlements.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
