"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { CURRENT_USER, WORKSPACE } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/common/toast";

type SettingsTab = "workspace" | "profile" | "appearance" | "notifications" | "about";

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
  const [activeTab, setActiveTab] = useState<SettingsTab>("workspace");
  const { toast } = useToast();

  // Local state for interactive settings
  const [workspaceName, setWorkspaceName] = useState<string>(WORKSPACE.name);
  const [userName, setUserName] = useState<string>(CURRENT_USER.fullName);
  const [userEmail, setUserEmail] = useState<string>(CURRENT_USER.email);
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
    // Fetch system health
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
  }, []);

  const handleSave = () => {
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
      title: "Preferences Saved",
      description: "Your workspace display and notification preferences are saved to your local profile.",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[23px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">
              Settings
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Verified Environment
            </span>
          </div>
          <p className="mt-1 text-[13.5px] text-subtle">
            Manage your workspace configuration, administrative profile and display preferences.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleSave}>
          Save Preferences
        </Button>
      </section>

      {/* Main settings layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Navigation Tabs */}
        <nav className="flex flex-row overflow-x-auto lg:flex-col gap-1 border-b border-line pb-3 lg:border-b-0 lg:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("workspace")}
            className={`flex items-center gap-2.5 rounded-md px-3.5 py-2.5 text-[13px] font-medium transition-colors text-left ${
              activeTab === "workspace"
                ? "bg-amber-500/10 font-semibold text-amber-400"
                : "text-subtle hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>Workspace</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2.5 rounded-md px-3.5 py-2.5 text-[13px] font-medium transition-colors text-left ${
              activeTab === "profile"
                ? "bg-amber-500/10 font-semibold text-amber-400"
                : "text-subtle hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <User className="h-4 w-4" />
            <span>User Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("appearance")}
            className={`flex items-center gap-2.5 rounded-md px-3.5 py-2.5 text-[13px] font-medium transition-colors text-left ${
              activeTab === "appearance"
                ? "bg-amber-500/10 font-semibold text-amber-400"
                : "text-subtle hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <Palette className="h-4 w-4" />
            <span>Appearance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-2.5 rounded-md px-3.5 py-2.5 text-[13px] font-medium transition-colors text-left ${
              activeTab === "notifications"
                ? "bg-amber-500/10 font-semibold text-amber-400"
                : "text-subtle hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("about")}
            className={`flex items-center gap-2.5 rounded-md px-3.5 py-2.5 text-[13px] font-medium transition-colors text-left ${
              activeTab === "about"
                ? "bg-amber-500/10 font-semibold text-amber-400"
                : "text-subtle hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <Info className="h-4 w-4" />
            <span>About RESOLVEGRAPH</span>
          </button>
        </nav>

        {/* Tab Content Panes */}
        <div className="flex flex-col gap-6">
          {/* Workspace Tab */}
          {activeTab === "workspace" && (
            <div className="rg-card flex flex-col gap-6 p-6">
              <div>
                <h2 className="text-[16px] font-semibold text-fg">Workspace Information</h2>
                <p className="mt-0.5 text-[12.5px] text-subtle">
                  Organization metadata and commerce intelligence environment.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <Field
                  htmlFor="workspace-name"
                  label="Workspace Name"
                  hint="Displayed in the workspace switcher and case dossiers"
                >
                  <Input
                    id="workspace-name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field htmlFor="product-descriptor" label="Product Descriptor">
                    <Input id="product-descriptor" value={WORKSPACE.descriptor} disabled className="opacity-80" />
                  </Field>

                  <Field htmlFor="plan-license" label="Plan License">
                    <Input id="plan-license" value={WORKSPACE.planLabel} disabled className="opacity-80" />
                  </Field>
                </div>

                <div className="rounded-lg border border-line bg-surface-2 p-4 text-[12px] text-muted">
                  <div className="flex items-center gap-2 font-medium text-fg">
                    <Users className="h-4 w-4 text-[#a08bff]" />
                    <span>Seat Capacity: {WORKSPACE.seats} Admin & Analyst Seats</span>
                  </div>
                  <p className="mt-1 text-faint">
                    Enterprise workspace instance configured with multi-tenant role-based access control.
                  </p>
                </div>

                {health && (
                  <div className="rounded-lg border border-line bg-surface-3 p-4">
                    <h3 className="text-[13px] font-semibold text-fg mb-3 flex items-center gap-2">
                      <Server className="h-4 w-4 text-[#34d399]" />
                      Infrastructure Health
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-[12px]">
                      <div>
                        <span className="text-subtle">Database Status:</span>
                        <p className="font-semibold text-emerald-400">
                          {health.database.connected ? "Connected (SQLite)" : "Disconnected"}
                        </p>
                      </div>
                      <div>
                        <span className="text-subtle">Total Cases Indexed:</span>
                        <p className="font-semibold text-fg">{health.database.stats?.cases ?? 0}</p>
                      </div>
                      <div>
                        <span className="text-subtle">AI Reasoning Engine:</span>
                        <p className="font-semibold text-fg capitalize">{health.aiEngine.provider}</p>
                      </div>
                      <div>
                        <span className="text-subtle">PayPal Gateway:</span>
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
            <div className="rg-card flex flex-col gap-6 p-6">
              <div>
                <h2 className="text-[16px] font-semibold text-fg">Administrator Profile</h2>
                <p className="mt-0.5 text-[12.5px] text-subtle">
                  Personal credentials and triage officer attribution.
                </p>
              </div>

              <div className="flex items-center gap-4 border-b border-line pb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line-2 bg-[var(--color-brand-solid)] text-[18px] font-bold text-white shadow-md">
                  {CURRENT_USER.initials}
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-fg">{userName}</h3>
                  <p className="text-[12.5px] text-subtle">{CURRENT_USER.role}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Field htmlFor="profile-name" label="Full Name">
                  <Input
                    id="profile-name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </Field>

                <Field htmlFor="profile-email" label="Email Address">
                  <Input
                    id="profile-email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                </Field>

                <Field htmlFor="profile-role" label="Security Role">
                  <Input id="profile-role" value={CURRENT_USER.role} disabled className="opacity-80" />
                </Field>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <div className="rg-card flex flex-col gap-6 p-6">
              <div>
                <h2 className="text-[16px] font-semibold text-fg">Appearance & Display</h2>
                <p className="mt-0.5 text-[12.5px] text-subtle">
                  Fine-tune theme parameters and information density.
                </p>
              </div>

              <div>
                <label className="text-[13px] font-medium text-fg">Theme Palette</label>
                <p className="text-[12px] text-subtle mt-0.5 mb-3">
                  RESOLVEGRAPH is engineered with a high-contrast enterprise dark palette.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-md">
                  <div className="flex items-center justify-between rounded-lg border-2 border-[var(--color-brand)] bg-[#070c16] p-3.5">
                    <div className="flex items-center gap-2.5">
                      <Moon className="h-4 w-4 text-[#a08bff]" />
                      <div>
                        <p className="text-[13px] font-semibold text-fg">Fintech Dark</p>
                        <p className="text-[11px] text-faint">Deep Navy & Slate (Active)</p>
                      </div>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-[#34d399]" />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-line bg-surface-2 p-3.5 opacity-60">
                    <div className="flex items-center gap-2.5">
                      <Sun className="h-4 w-4 text-subtle" />
                      <div>
                        <p className="text-[13px] font-semibold text-fg">Enterprise Light</p>
                        <p className="text-[11px] text-faint">High-Contrast Contrast Mode</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-faint">Available</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-line pt-4">
                <label className="text-[13px] font-medium text-fg">Table Density</label>
                <div className="mt-2.5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDensity("default")}
                    className={`rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      density === "default"
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-400 font-semibold"
                        : "border-line bg-surface-2 text-subtle"
                    }`}
                  >
                    Comfortable (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDensity("compact")}
                    className={`rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      density === "compact"
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-400 font-semibold"
                        : "border-line bg-surface-2 text-subtle"
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
            <div className="rg-card flex flex-col gap-6 p-6">
              <div>
                <h2 className="text-[16px] font-semibold text-fg">Notification Rules</h2>
                <p className="mt-0.5 text-[12.5px] text-subtle">
                  Configure browser notifications and dispute alert dispatching.
                </p>
              </div>

              <div className="flex flex-col divide-y divide-line">
                <div className="flex items-center justify-between py-3.5">
                  <div>
                    <p className="text-[13.5px] font-medium text-fg">Overdue Dispute Alerts</p>
                    <p className="text-[11.5px] text-faint">
                      Notify when a merchant exceeds the mandated 48-hour response window.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOverdue}
                    onChange={(e) => setNotifyOverdue(e.target.checked)}
                    className="h-4 w-4 rounded border-line bg-surface accent-[var(--color-brand-solid)]"
                  />
                </div>

                <div className="flex items-center justify-between py-3.5">
                  <div>
                    <p className="text-[13.5px] font-medium text-fg">AI Evidence Indexing Notices</p>
                    <p className="text-[11.5px] text-faint">
                      Alert when new document batches finish cryptographic indexing.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyAi}
                    onChange={(e) => setNotifyAi(e.target.checked)}
                    className="h-4 w-4 rounded border-line bg-surface accent-[var(--color-brand-solid)]"
                  />
                </div>

                <div className="flex items-center justify-between py-3.5">
                  <div>
                    <p className="text-[13.5px] font-medium text-fg">Daily Morning Brief Digest</p>
                    <p className="text-[11.5px] text-faint">
                      Receive an executive summary email of active claim volume at 08:00 AM.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyDigest}
                    onChange={(e) => setNotifyDigest(e.target.checked)}
                    className="h-4 w-4 rounded border-line bg-surface accent-[var(--color-brand-solid)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* About RESOLVEGRAPH Tab */}
          {activeTab === "about" && (
            <div className="rg-card flex flex-col gap-5 p-6">
              <div>
                <h2 className="text-[16px] font-semibold text-fg">About RESOLVEGRAPH</h2>
                <p className="mt-0.5 text-[12.5px] text-subtle">
                  AI-Powered Commerce Resolution Infrastructure.
                </p>
              </div>

              <div className="rounded-lg border border-line bg-surface-2 p-4 text-[13px]">
                <p className="font-semibold text-fg text-[14px]">
                  &ldquo;From the first complaint to a fair resolution.&rdquo;
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  RESOLVEGRAPH connects buyers, merchants, payment records, supporting evidence and resolution workflows in one intelligent platform.
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-3.5 text-[12px] sm:grid-cols-3">
                <div className="rounded-md border border-line p-3">
                  <dt className="text-subtle font-medium">Build Version</dt>
                  <dd className="mt-0.5 font-mono text-fg">1.0.0-audited</dd>
                </div>

                <div className="rounded-md border border-line p-3">
                  <dt className="text-subtle font-medium">Release Quality</dt>
                  <dd className="mt-0.5 font-medium text-[#34d399]">Audited & Verified</dd>
                </div>

                <div className="rounded-md border border-line p-3">
                  <dt className="text-subtle font-medium">Core Stack</dt>
                  <dd className="mt-0.5 font-medium text-fg">Next.js · React 19 · Tailwind v4</dd>
                </div>
              </dl>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-[12px] leading-relaxed text-muted">
                <p className="font-semibold text-fg flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Verified Engineering Capabilities:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
                  <div className="flex items-start gap-2">
                    <Server className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <span><strong>Database:</strong> SQLite with 40 Prisma schema models & immutable audit events.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Cpu className="h-4 w-4 text-sky-400 mt-0.5 shrink-0" />
                    <span><strong>AI Intelligence:</strong> BERR 5-agent specialist reasoning with cryptographic evidence citation gating.</span>
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
