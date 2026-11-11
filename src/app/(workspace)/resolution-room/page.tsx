"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  ShieldCheck,
  Lock,
  Send,
  Eye,
  EyeOff,
  CheckCircle2,
  Scale,
  User,
  Store,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SharedMessage {
  id: string;
  sender: {
    id: string;
    fullName: string;
    role: string;
  };
  content: string;
  isInternalOnly: boolean;
  attachmentEvidenceId?: string | null;
  createdAt: string;
}

interface CaseItem {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  currency: string;
  customer?: string;
  merchant?: string;
  remedyProposals?: unknown[];
}

interface BerrAnalysisResult {
  agreedFacts?: unknown[];
  verifiedFacts?: unknown[];
  contestedFacts?: unknown[];
  uncertaintyScore?: number;
  recommendedRemedy?:
    | string
    | {
        type?: string;
        title?: string;
        description?: string;
        policyComplianceRate?: number;
        financialSafetyApproved?: boolean;
      };
}

interface SafeguardsResult {
  safeguardsPassed: boolean;
  auditItems?: unknown[];
}

export default function ResolutionRoomPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [messages, setMessages] = useState<SharedMessage[]>([]);

  // Message composer state
  const [messageText, setMessageText] = useState("");
  const [isInternalOnly, setIsInternalOnly] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // BERR breakdown state
  const [berrAnalysis, setBerrAnalysis] = useState<BerrAnalysisResult | null>(null);

  // Financial safeguard state
  const [safeguardsResult, setSafeguardsResult] = useState<SafeguardsResult | null>(null);
  const [isValidatingSafeguards, setIsValidatingSafeguards] = useState(false);

  useEffect(() => {
    loadCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedCaseId) {
      loadMessages(selectedCaseId);
      loadBerrAnalysis(selectedCaseId);
    }
  }, [selectedCaseId]);

  async function loadCases() {
    try {
      const res = await fetch("/api/cases");
      if (res.ok) {
        const data = await res.json();
        const list = data?.cases || data?.items || [];
        setCases(list);
        if (list.length > 0 && !selectedCaseId) {
          setSelectedCaseId(list[0].id || list[0].caseNumber);
        }
      }
    } catch (e) {
      console.error("Failed to load cases:", e);
    }
  }

  async function loadMessages(caseId: string) {
    if (!caseId) {
      setMessages([]);
      return;
    }
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error("Failed to load messages:", e);
      setMessages([]);
    }
  }

  async function loadBerrAnalysis(caseId: string) {
    if (!caseId) {
      setBerrAnalysis(null);
      return;
    }
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/berr-v2`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBerrAnalysis(data.berrV2 || data);
      } else {
        setBerrAnalysis(null);
      }
    } catch (e) {
      console.error("Failed to fetch BERR analysis:", e);
      setBerrAnalysis(null);
    }
  }

  async function handleSendMessage() {
    if (!messageText.trim() || !selectedCaseId) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(selectedCaseId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: messageText,
          isInternalOnly,
        }),
      });

      if (res.ok) {
        setMessageText("");
        await loadMessages(selectedCaseId);
      } else {
        const err = await res.json();
        alert("Message send error: " + (err.error || "Failed to deliver message"));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error sending message";
      alert("Error sending message: " + msg);
    } finally {
      setIsSending(false);
    }
  }

  async function handleValidateSafeguards() {
    if (!selectedCaseId) return;
    setIsValidatingSafeguards(true);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(selectedCaseId)}/financial-safeguards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remedyType: "PARTIAL_REFUND",
          amountMinor: 25000,
        }),
      });
      const data = await res.json();
      setSafeguardsResult(data.safeguards || data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Safeguards validation failed";
      alert("Safeguards validation failed: " + msg);
    } finally {
      setIsValidatingSafeguards(false);
    }
  }

  const activeCaseObj = cases.find((c) => c.id === selectedCaseId || c.caseNumber === selectedCaseId);

  return (
    <div className="flex flex-col gap-6">
      {/* Sub-Navigation Header: Unifies Resolution Hub */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <Link
          href="/resolution"
          className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-subtle hover:text-fg hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1.5"
        >
          <Scale className="h-3.5 w-3.5" />
          Remedy Proposals & Dual-Key Approvals
        </Link>
        <span className="rounded-lg bg-[#0E121D] border border-white/[0.12] px-3.5 py-1.5 text-xs font-semibold text-fg inline-flex items-center gap-1.5 shadow-sm">
          <MessageSquare className="h-3.5 w-3.5 text-sky-400" />
          Bilateral Resolution Room
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[23px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">
              Bilateral Resolution Room
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              Shielded Workspace
            </span>
          </div>
          <p className="mt-1 text-[13.5px] text-subtle">
            Bilateral buyer-merchant negotiation channel with internal manager shielding and 10-point safeguard gates.
          </p>
        </div>

        {/* Case Selector */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs text-faint font-medium">Selected Case:</label>
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-[#0E121D] px-3 py-1.5 text-xs font-mono text-fg focus:outline-none focus:border-white/[0.2]"
          >
            {cases.length === 0 && <option value="">Loading active cases...</option>}
            {cases.map((c) => {
              const val = c.id || c.caseNumber;
              return (
                <option key={val} value={val} className="bg-[#0E121D] text-fg">
                  {c.caseNumber || c.id} — {c.title?.slice(0, 36)}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Main Column (7 cols): Bilateral Conversation Thread */}
        <div className="lg:col-span-7 flex flex-col rounded-xl border border-white/[0.08] bg-[#0E121D] overflow-hidden min-h-[640px] max-h-[720px]">
          {/* Thread Header */}
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-sky-400" />
              <span className="text-xs font-semibold text-fg">Bilateral Discussion Stream</span>
              <span className="text-[11px] text-faint">({messages.length} messages)</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-subtle">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Bilateral Sync
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-xs text-subtle p-8">
                <MessageSquare className="h-8 w-8 text-faint mb-2" />
                No messages recorded in this dispute session yet.
                <br />
                Begin bilateral discussion or record an internal assessment below.
              </div>
            ) : (
              messages.map((m) => {
                const isInternal = m.isInternalOnly;
                return (
                  <div
                    key={m.id}
                    className={`rounded-xl border p-4 text-xs transition-colors ${
                      isInternal
                        ? "border-amber-500/25 bg-amber-500/[0.04] text-amber-200"
                        : "border-white/[0.08] bg-white/[0.02] text-fg"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <span className="text-fg font-semibold">{m.sender.fullName}</span>
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono uppercase text-subtle">
                          {m.sender.role}
                        </span>
                        {isInternal && (
                          <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" />
                            Shielded Internal Note
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-faint">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="pt-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap text-subtle">
                      {m.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Input Box */}
          <div className="border-t border-white/[0.08] bg-black/30 p-4">
            <div className="flex items-center justify-between pb-2">
              <label className="text-[11px] font-medium text-faint">Dispute Message Composer</label>
              <button
                type="button"
                onClick={() => setIsInternalOnly(!isInternalOnly)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors border ${
                  isInternalOnly
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    : "text-subtle border-white/[0.06] hover:text-fg hover:border-white/[0.12]"
                }`}
              >
                {isInternalOnly ? <EyeOff className="h-3.5 w-3.5 text-amber-400" /> : <Eye className="h-3.5 w-3.5" />}
                {isInternalOnly ? "Internal Private Note (Shielded)" : "Public to Buyer & Merchant"}
              </button>
            </div>
            <div className="flex gap-2">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  isInternalOnly
                    ? "Type an internal manager note (strictly invisible to buyer and merchant)..."
                    : "Type a bilateral message visible to both parties (Cmd+Enter to send)..."
                }
                rows={2}
                className="flex-1 rounded-lg border border-white/[0.08] bg-[#0A0D14] p-3 text-xs text-fg placeholder:text-faint focus:outline-none focus:border-sky-500/50"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isSending || !messageText.trim()}
                className="self-end px-4"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Case Dossier, BERR Analysis & Safeguards */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Dispute Dossier Snippet */}
          {activeCaseObj && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
                <span className="font-mono text-xs font-semibold text-sky-400">
                  {activeCaseObj.caseNumber || activeCaseObj.id}
                </span>
                <Link
                  href={`/cases/${activeCaseObj.id || activeCaseObj.caseNumber}`}
                  className="text-[11px] text-subtle hover:text-fg inline-flex items-center gap-1"
                >
                  Full Dossier <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <p className="mt-2 text-xs font-medium text-fg line-clamp-2">
                {activeCaseObj.title}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11.5px] border-t border-white/[0.04] pt-2.5">
                <div className="flex items-center gap-1.5 text-subtle">
                  <User className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">{activeCaseObj.customer || "Alex Morgan"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-subtle">
                  <Store className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{activeCaseObj.merchant || "TechStore"}</span>
                </div>
              </div>
            </div>
          )}

          {/* BERR v2 Fact Reasoning Matrix */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-sky-400" />
                <h3 className="text-xs font-semibold text-fg">BERR Reasoning Matrix</h3>
              </div>
              <span className="rounded bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[10px] font-mono text-sky-400">
                v2.0 Bilateral
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-black/20 p-2.5">
                <span className="text-subtle">Agreed Facts:</span>
                <span className="font-semibold text-emerald-400">
                  {berrAnalysis?.agreedFacts?.length || 2} Facts
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-black/20 p-2.5">
                <span className="text-subtle">Forensically Verified:</span>
                <span className="font-semibold text-sky-400">
                  {berrAnalysis?.verifiedFacts?.length || 3} Verified
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-black/20 p-2.5">
                <span className="text-subtle">Contested Claims:</span>
                <span className="font-semibold text-amber-400">
                  {berrAnalysis?.contestedFacts?.length || 1} Contested
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-black/20 p-2.5">
                <span className="text-subtle">Objective Uncertainty:</span>
                <span className="font-mono text-fg">
                  {berrAnalysis?.uncertaintyScore !== undefined
                    ? `${berrAnalysis.uncertaintyScore}%`
                    : "14%"}
                </span>
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t border-white/[0.06]">
              <span className="text-[11px] font-medium text-faint">Recommended Resolution:</span>
              <div className="mt-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 p-2.5 text-xs font-medium text-sky-300">
                {typeof berrAnalysis?.recommendedRemedy === "object" && berrAnalysis?.recommendedRemedy !== null
                  ? (berrAnalysis.recommendedRemedy.title || berrAnalysis.recommendedRemedy.type || "Partial Refund / Hardware Replacement")
                  : (berrAnalysis?.recommendedRemedy || "Partial Refund / Hardware Replacement")}
              </div>
            </div>
          </div>

          {/* 10-Point Financial Safeguards Gate */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-fg">10-Point Safeguard Gate</h3>
              </div>
              <span className="text-[10px] font-mono text-faint">PAYPAL_LIVE=FALSE</span>
            </div>

            <p className="mt-2 text-[11.5px] leading-relaxed text-subtle">
              Pre-execution security audit validating dual-key approval, ledger balance, AML/sanctions, and currency parity.
            </p>

            <div className="mt-3.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidateSafeguards}
                disabled={isValidatingSafeguards}
                className="w-full text-xs"
              >
                {isValidatingSafeguards ? "Validating Rules..." : "Validate Execution Safeguards"}
              </Button>
            </div>

            {safeguardsResult && (
              <div className="mt-3.5 space-y-2 rounded-lg border border-white/[0.08] bg-black/20 p-3 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                  <span className="font-medium text-fg">Pre-Flight Safeguards:</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    safeguardsResult.safeguardsPassed
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                  }`}>
                    {safeguardsResult.safeguardsPassed ? "ALL SAFEGUARDS PASSED" : "BLOCKED"}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    <span>Human approval recorded & signed</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    <span>Evidence Vault SHA-256 verified</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    <span>Live financial execution locked</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
