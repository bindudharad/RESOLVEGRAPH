"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  RefreshCw,
  KeyRound,
  FileCode,
  AlertTriangle,
  Building2,
  Settings as SettingsIcon,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

interface KillSwitchState {
  id?: string;
  isOutboundPayPalKilled: boolean;
  isExternalProviderKilled: boolean;
  isAutonomousAgentKilled: boolean;
  isNotificationKilled: boolean;
  reason?: string;
  updatedBy?: string;
  updatedAt?: string;
}

interface AuditRecord {
  id: string;
  sequenceNumber: number;
  action: string;
  entityType: string;
  entityId: string;
  payloadHash: string;
  previousHash: string;
  chainedHash: string;
  timestamp: string;
}

export default function SecurityPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const user = session?.user as { isPlatformAdmin?: boolean; role?: string } | undefined;
  const isPlatformAdmin = Boolean(user?.isPlatformAdmin || user?.role === "ADMIN");

  const [killSwitch, setKillSwitch] = useState<KillSwitchState | null>(null);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [updating, setUpdating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !isPlatformAdmin) {
      router.replace("/access-denied");
      return;
    }

    if (!isPlatformAdmin) return;

    let mounted = true;
    async function init() {
      try {
        const [ksRes, auditRes] = await Promise.all([
          fetch("/api/admin/kill-switch"),
          fetch("/api/audit/chained?limit=50"),
        ]);

        if (ksRes.ok && mounted) {
          const ksData = await ksRes.json();
          setKillSwitch(ksData.data || ksData.config || null);
        }
        if (auditRes.ok && mounted) {
          const auditData = await auditRes.json();
          setAuditRecords(auditData.records || []);
        }
      } catch (err) {
        console.error("Failed to initialize security controls:", err);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [isPending, isPlatformAdmin, router]);

  if (!isPending && !isPlatformAdmin) {
    return null;
  }

  const handleUpdateKillSwitch = async (updates: Partial<KillSwitchState>, actionLabel: string) => {
    // Explicit confirmation for safety
    const confirmed = window.confirm(
      `CONFIRM EMERGENCY ACTION:\n\nAre you sure you want to execute: "${actionLabel}"?\n\nThis will instantly modify platform security rules and record a permanent entry to the immutable audit ledger.`
    );
    if (!confirmed) return;

    setUpdating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/kill-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updates,
          reason: reason || `Administrative security posture update: ${actionLabel}`,
          adminUser: "System Administrator (Master Key)",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update kill switch");

      setKillSwitch(data.data || data.config);
      setMessage(`Emergency action "${actionLabel}" executed and recorded to tamper-evident audit ledger.`);
      // Reload audit chain
      const auditRes = await fetch("/api/audit/chained?limit=50");
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditRecords(auditData.records || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      alert(msg);
    } finally {
      setUpdating(false);
    }
  };

  const verifyLedgerIntegrity = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/audit/chained?verify=true");
      if (res.ok) {
        const data = await res.json();
        setChainValid(data.isChainValid);
      }
    } catch (err) {
      console.error(err);
      setChainValid(false);
    } finally {
      setVerifying(false);
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const isMasterKilled = Boolean(
    killSwitch &&
    killSwitch.isOutboundPayPalKilled &&
    killSwitch.isExternalProviderKilled &&
    killSwitch.isAutonomousAgentKilled &&
    killSwitch.isNotificationKilled
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Administration Sub-Navigation */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <Link
          href="/organizations"
          className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-subtle hover:text-fg hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1.5"
        >
          <Building2 className="h-3.5 w-3.5" />
          Organizations & Roles
        </Link>
        <span className="rounded-lg bg-[#0E121D] border border-white/[0.12] px-3.5 py-1.5 text-xs font-semibold text-fg inline-flex items-center gap-1.5 shadow-sm">
          <KeyRound className="h-3.5 w-3.5 text-sky-400" />
          Security & Cryptographic Audit
        </span>
        <Link
          href="/settings"
          className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-subtle hover:text-fg hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1.5"
        >
          <SettingsIcon className="h-3.5 w-3.5" />
          Platform Settings
        </Link>
      </div>

      {/* Header section */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[23px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">
              Security & Cryptographic Audit Ledger
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Continuous Integrity Verification
            </span>
          </div>
          <p className="mt-1 text-[13.5px] text-subtle">
            Administrative circuit breakers, payment kill switches, and continuous SHA-256 hash-chained verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={verifyLedgerIntegrity}
            disabled={verifying}
            className="text-xs"
          >
            {verifying ? (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <KeyRound className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
            )}
            Verify Audit Chain Integrity
          </Button>
        </div>
      </section>

      {message && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs text-emerald-400 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Chain Integrity Result Banner */}
      {chainValid !== null && (
        <div
          className={`rounded-xl border p-4 text-xs flex items-center justify-between ${
            chainValid
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-rose-500/30 bg-rose-500/10 text-rose-400"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {chainValid ? (
              <ShieldCheck className="h-5 w-5 shrink-0" />
            ) : (
              <ShieldAlert className="h-5 w-5 shrink-0" />
            )}
            <span className="font-medium">
              {chainValid
                ? "Cryptographic Verification Succeeded: All sequential SHA-256 blocks validated without tampering or chain breakage."
                : "Cryptographic Verification Warning: Hash mismatch detected in sequential ledger blocks!"}
            </span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
            chainValid
              ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
              : "border-rose-500/40 bg-rose-500/20 text-rose-300"
          }`}>
            {chainValid ? "CHAIN VALID" : "CHAIN CORRUPTED"}
          </span>
        </div>
      )}

      {/* EMERGENCY CONTROLS & KILL SWITCH — Prominent Amber/Red Callout Box */}
      <div className={`rounded-xl border p-6 space-y-6 ${
        isMasterKilled
          ? "border-rose-500/40 bg-rose-950/20"
          : "border-amber-500/30 bg-[#0E121D]"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg border shrink-0 ${
              isMasterKilled
                ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-400"
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg flex items-center gap-2">
                Emergency Circuit Breakers & Kill Switches
              </h2>
              <p className="text-xs text-subtle mt-0.5">
                Immediate system-wide freezes for payment gateways, external providers, and autonomous agents. Actions require explicit confirmation.
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase border ${
            isMasterKilled
              ? "border-rose-500/30 bg-rose-500/10 text-rose-400 animate-pulse"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          }`}>
            <span className={`h-2 w-2 rounded-full ${isMasterKilled ? "bg-rose-400" : "bg-emerald-400"}`} />
            {isMasterKilled ? "GLOBAL EMERGENCY HALT" : "SYSTEM OPERATIONAL"}
          </span>
        </div>

        {killSwitch && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Master Toggle */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm text-fg">Master Circuit Freeze</span>
                  {isMasterKilled ? (
                    <Lock className="h-4 w-4 text-rose-400" />
                  ) : (
                    <Unlock className="h-4 w-4 text-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-subtle">
                  Freezes all financial disbursals, provider calls, and autonomous agents in a single action.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.04]">
                <Button
                  size="sm"
                  variant={isMasterKilled ? "primary" : "danger"}
                  disabled={updating}
                  onClick={() =>
                    handleUpdateKillSwitch(
                      {
                        isOutboundPayPalKilled: !isMasterKilled,
                        isExternalProviderKilled: !isMasterKilled,
                        isAutonomousAgentKilled: !isMasterKilled,
                        isNotificationKilled: !isMasterKilled,
                      },
                      isMasterKilled ? "Deactivate Master Halt" : "Activate Master Freeze"
                    )
                  }
                  className="w-full text-xs font-semibold"
                >
                  {isMasterKilled ? "Deactivate Master Halt" : "Activate Master Freeze"}
                </Button>
              </div>
            </div>

            {/* PayPal Sandbox Payments */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm text-fg">PayPal Sandbox API</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                    killSwitch.isOutboundPayPalKilled
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  }`}>
                    {killSwitch.isOutboundPayPalKilled ? "HALTED" : "ACTIVE"}
                  </span>
                </div>
                <p className="text-xs text-subtle">
                  Governs outbound refund, authorization, and capture calls to PayPal Sandbox API endpoints.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.04]">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updating}
                  onClick={() =>
                    handleUpdateKillSwitch(
                      { isOutboundPayPalKilled: !killSwitch.isOutboundPayPalKilled },
                      killSwitch.isOutboundPayPalKilled ? "Resume PayPal API" : "Halt PayPal API"
                    )
                  }
                  className="w-full text-xs"
                >
                  {killSwitch.isOutboundPayPalKilled ? "Resume PayPal API" : "Halt PayPal API"}
                </Button>
              </div>
            </div>

            {/* Autonomous Copilot Agents */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm text-fg">Multi-Agent Engine</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                    killSwitch.isAutonomousAgentKilled
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  }`}>
                    {killSwitch.isAutonomousAgentKilled ? "PAUSED" : "ACTIVE"}
                  </span>
                </div>
                <p className="text-xs text-subtle">
                  Controls autonomous multi-agent hypothesis generation, consensus scoring, and auto-triage.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.04]">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updating}
                  onClick={() =>
                    handleUpdateKillSwitch(
                      { isAutonomousAgentKilled: !killSwitch.isAutonomousAgentKilled },
                      killSwitch.isAutonomousAgentKilled ? "Resume AI Agents" : "Pause AI Agents"
                    )
                  }
                  className="w-full text-xs"
                >
                  {killSwitch.isAutonomousAgentKilled ? "Resume AI Agents" : "Pause AI Agents"}
                </Button>
              </div>
            </div>

            {/* External Providers & Sync */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm text-fg">Provider Gateways</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                    killSwitch.isExternalProviderKilled
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  }`}>
                    {killSwitch.isExternalProviderKilled ? "BLOCKED" : "ACTIVE"}
                  </span>
                </div>
                <p className="text-xs text-subtle">
                  Governs inbound webhooks and synchronization with external card networks and clearinghouses.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.04]">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updating}
                  onClick={() =>
                    handleUpdateKillSwitch(
                      { isExternalProviderKilled: !killSwitch.isExternalProviderKilled },
                      killSwitch.isExternalProviderKilled ? "Resume Gateways" : "Halt Gateways"
                    )
                  }
                  className="w-full text-xs"
                >
                  {killSwitch.isExternalProviderKilled ? "Resume Gateways" : "Halt Gateways"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Audit Memo Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-white/[0.06]">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Administrative audit memo (e.g. 'Simulated zero-day network anomaly drill')..."
            className="text-xs flex-1 bg-[#0A0D14] border-white/[0.08]"
          />
          {killSwitch?.updatedAt && (
            <span className="text-[11px] text-faint whitespace-nowrap self-center font-mono">
              Last modification: {new Date(killSwitch.updatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Cryptographic Hash-Chained Audit Ledger Table */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div>
            <h3 className="text-base font-semibold text-fg flex items-center gap-2">
              <FileCode className="h-5 w-5 text-emerald-400" />
              Cryptographic Hash-Chained Audit Ledger
            </h3>
            <p className="text-xs text-subtle">
              Every sensitive financial proposal, kill switch toggle, and evidence intake is sequentially sealed with SHA-256 block hashing.
            </p>
          </div>
          <span className="font-mono text-xs text-faint bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-lg">
            {auditRecords.length} Blocks Recorded
          </span>
        </div>

        {auditRecords.length === 0 ? (
          <p className="text-sm text-subtle py-8 text-center">
            No audit records registered in current session.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0A0D14] text-subtle border-b border-white/[0.06] font-medium">
                <tr>
                  <th className="p-3">Seq #</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity Type</th>
                  <th className="p-3">Chained Hash (SHA-256)</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-mono">
                {auditRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 font-bold text-fg">#{rec.sequenceNumber}</td>
                    <td className="p-3 font-semibold text-sky-400">{rec.action}</td>
                    <td className="p-3 text-subtle">{rec.entityType}</td>
                    <td className="p-3 text-[11px] text-faint">
                      <div className="flex items-center gap-1.5">
                        <span title={rec.chainedHash}>
                          {rec.chainedHash.slice(0, 16)}...{rec.chainedHash.slice(-10)}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyHash(rec.chainedHash)}
                          className="text-subtle hover:text-fg p-0.5"
                          title="Copy full hash"
                        >
                          {copiedHash === rec.chainedHash ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-subtle">{new Date(rec.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
