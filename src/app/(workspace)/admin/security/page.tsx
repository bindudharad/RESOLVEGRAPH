"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  RefreshCw,
  KeyRound,
  FileCode,
  Sliders,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const [killSwitch, setKillSwitch] = useState<KillSwitchState | null>(null);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [updating, setUpdating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  const handleUpdateKillSwitch = async (updates: Partial<KillSwitchState>) => {
    setUpdating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/kill-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updates,
          reason: reason || "Administrative security posture update",
          adminUser: "System Administrator (Master Key)",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update kill switch");

      setKillSwitch(data.data || data.config);
      setMessage("Emergency security posture updated and recorded to tamper-evident audit ledger.");
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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-fg">
              Security, Kill Switch & Cryptographic Audit Ledger
            </h1>
            <Badge tone="brand">Zero Autonomous Disbursement</Badge>
          </div>
          <p className="text-sm text-muted">
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
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
          {message}
        </div>
      )}

      {chainValid !== null && (
        <div
          className={`rounded-xl border p-4 text-xs flex items-center justify-between ${
            chainValid
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {chainValid ? (
              <ShieldCheck className="h-5 w-5 shrink-0" />
            ) : (
              <ShieldAlert className="h-5 w-5 shrink-0" />
            )}
            <span>
              {chainValid
                ? "Cryptographic Verification Succeeded: All sequential SHA-256 blocks validated without tampering or chain breakage."
                : "Cryptographic Verification Warning: Hash mismatch detected in sequential ledger blocks!"}
            </span>
          </div>
          <Badge
            tone={chainValid ? "success" : "danger"}
          >
            {chainValid ? "CHAIN VALID" : "CHAIN CORRUPTED"}
          </Badge>
        </div>
      )}

      {/* Kill Switch Controls */}
      <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm space-y-6">
        {(() => {
          const isMasterKilled = Boolean(
            killSwitch &&
            killSwitch.isOutboundPayPalKilled &&
            killSwitch.isExternalProviderKilled &&
            killSwitch.isAutonomousAgentKilled &&
            killSwitch.isNotificationKilled
          );
          return (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h2 className="text-base font-semibold text-fg flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-primary" />
                    Administrative Emergency Circuit Breakers
                  </h2>
                  <p className="text-xs text-muted">
                    Instantly halt outbound PayPal payments, third-party provider syncs, or autonomous agents in the event of an anomaly.
                  </p>
                </div>
                {killSwitch && (
                  <Badge tone={isMasterKilled ? "danger" : "success"}>
                    {isMasterKilled ? "GLOBAL EMERGENCY HALT" : "SYSTEM OPERATIONAL"}
                  </Badge>
                )}
              </div>

              {killSwitch && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Master Toggle */}
                  <div className="rounded-lg border border-border bg-surface-2/40 p-4 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-fg">Master Circuit Halt</span>
                        {isMasterKilled ? (
                          <Lock className="h-4 w-4 text-red-500" />
                        ) : (
                          <Unlock className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted">
                        Freezes all financial disbursals, provider calls, and autonomous agents in a single action.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isMasterKilled ? "primary" : "danger"}
                      disabled={updating}
                      onClick={() =>
                        handleUpdateKillSwitch({
                          isOutboundPayPalKilled: !isMasterKilled,
                          isExternalProviderKilled: !isMasterKilled,
                          isAutonomousAgentKilled: !isMasterKilled,
                          isNotificationKilled: !isMasterKilled,
                        })
                      }
                      className="w-full text-xs"
                    >
                      {isMasterKilled ? "Deactivate Master Halt" : "Activate Master Freeze"}
                    </Button>
                  </div>

                  {/* PayPal Sandbox Payments */}
                  <div className="rounded-lg border border-border bg-surface-2/40 p-4 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-fg">PayPal Sandbox API</span>
                        <Badge tone={killSwitch.isOutboundPayPalKilled ? "danger" : "success"}>
                          {killSwitch.isOutboundPayPalKilled ? "HALTED" : "ACTIVE"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted">
                        Governs outbound refund, authorization, and capture calls to PayPal Sandbox API endpoints.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updating}
                      onClick={() =>
                        handleUpdateKillSwitch({
                          isOutboundPayPalKilled: !killSwitch.isOutboundPayPalKilled,
                        })
                      }
                      className="w-full text-xs"
                    >
                      {killSwitch.isOutboundPayPalKilled ? "Resume PayPal API" : "Halt PayPal API"}
                    </Button>
                  </div>

                  {/* Autonomous Copilot Agents */}
                  <div className="rounded-lg border border-border bg-surface-2/40 p-4 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-fg">Multi-Agent Engine</span>
                        <Badge tone={killSwitch.isAutonomousAgentKilled ? "danger" : "success"}>
                          {killSwitch.isAutonomousAgentKilled ? "PAUSED" : "ACTIVE"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted">
                        Controls autonomous multi-agent hypothesis generation, consensus scoring, and auto-triage.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updating}
                      onClick={() =>
                        handleUpdateKillSwitch({
                          isAutonomousAgentKilled: !killSwitch.isAutonomousAgentKilled,
                        })
                      }
                      className="w-full text-xs"
                    >
                      {killSwitch.isAutonomousAgentKilled ? "Resume AI Agents" : "Pause AI Agents"}
                    </Button>
                  </div>

                  {/* External Providers & Sync */}
                  <div className="rounded-lg border border-border bg-surface-2/40 p-4 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-fg">Provider Gateways</span>
                        <Badge tone={killSwitch.isExternalProviderKilled ? "danger" : "success"}>
                          {killSwitch.isExternalProviderKilled ? "BLOCKED" : "ACTIVE"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted">
                        Governs inbound webhooks and synchronization with external card networks and clearinghouses.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updating}
                      onClick={() =>
                        handleUpdateKillSwitch({
                          isExternalProviderKilled: !killSwitch.isExternalProviderKilled,
                        })
                      }
                      className="w-full text-xs"
                    >
                      {killSwitch.isExternalProviderKilled ? "Resume Gateways" : "Halt Gateways"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-border/60">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Mandatory administrative audit reason (e.g. 'Simulated zero-day network anomaly drill')..."
            className="text-xs flex-1"
          />
          {killSwitch?.updatedAt && (
            <span className="text-[11px] text-muted whitespace-nowrap self-center font-mono">
              Last state change: {new Date(killSwitch.updatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Cryptographic Hash-Chained Audit Ledger Table */}
      <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-base font-semibold text-fg flex items-center gap-2">
              <FileCode className="h-5 w-5 text-emerald-400" />
              Cryptographic Hash-Chained Audit Ledger
            </h3>
            <p className="text-xs text-muted">
              Every sensitive financial proposal, kill switch toggle, and evidence intake is sequentially sealed with SHA-256 block hashing.
            </p>
          </div>
          <Badge tone="neutral" className="font-mono text-xs">
            {auditRecords.length} Blocks Recorded
          </Badge>
        </div>

        {auditRecords.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center">
            No audit records registered in current session.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 text-muted border-b border-border font-medium">
                <tr>
                  <th className="p-3">Seq #</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity Type</th>
                  <th className="p-3">Chained Hash (SHA-256)</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {auditRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-surface-2/30">
                    <td className="p-3 font-bold text-fg">#{rec.sequenceNumber}</td>
                    <td className="p-3 font-semibold text-primary">{rec.action}</td>
                    <td className="p-3 text-muted">{rec.entityType}</td>
                    <td className="p-3 text-[11px] text-faint truncate max-w-xs" title={rec.chainedHash}>
                      {rec.chainedHash.slice(0, 16)}...{rec.chainedHash.slice(-12)}
                    </td>
                    <td className="p-3 text-muted">{new Date(rec.timestamp).toLocaleTimeString()}</td>
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
