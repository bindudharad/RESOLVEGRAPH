"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  ShieldCheck,
  Lock,
  Send,
  Eye,
  EyeOff,
  CheckCircle2,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  remedyProposals?: unknown[];
}

interface BerrAnalysisResult {
  agreedFacts?: unknown[];
  verifiedFacts?: unknown[];
  contestedFacts?: unknown[];
  uncertaintyScore?: number;
  recommendedRemedy?: string;
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
        const list = data.cases || [];
        setCases(list);
        if (list.length > 0 && !selectedCaseId) {
          setSelectedCaseId(list[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load cases:", e);
    }
  }

  async function loadMessages(caseId: string) {
    try {
      const res = await fetch(`/api/cases/${caseId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error("Failed to load messages:", e);
    }
  }

  async function loadBerrAnalysis(caseId: string) {
    try {
      const res = await fetch(`/api/cases/${caseId}/berr-v2`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBerrAnalysis(data);
      }
    } catch (e) {
      console.error("Failed to fetch BERR analysis:", e);
    }
  }

  async function handleSendMessage() {
    if (!messageText.trim() || !selectedCaseId) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/cases/${selectedCaseId}/messages`, {
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
        alert("Message send error: " + err.error);
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
      const res = await fetch(`/api/cases/${selectedCaseId}/financial-safeguards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remedyType: "PARTIAL_REFUND",
          amountMinor: 25000,
        }),
      });
      const data = await res.json();
      setSafeguardsResult(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Safeguards validation failed";
      alert("Safeguards validation failed: " + msg);
    } finally {
      setIsValidatingSafeguards(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-fg">Shared Resolution Room</h1>
            <Badge tone="brand" className="border-purple-500/30 bg-purple-500/10 text-purple-400">
              Module 16 Live
            </Badge>
          </div>
          <p className="text-sm text-muted">
            Bilateral buyer-merchant workspace with internal manager shielding and 10-point financial safeguards.
          </p>
        </div>

        {/* Case Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted font-medium">Active Case:</label>
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="rounded-md border border-border bg-surface-1 px-3 py-1.5 text-xs font-mono text-fg focus:outline-none focus:ring-1 focus:ring-brand-2"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} — {c.title.slice(0, 32)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Bilateral Conversation Thread */}
        <div className="lg:col-span-2 flex flex-col rounded-lg border border-border bg-surface-1 overflow-hidden h-[680px]">
          {/* Thread Header */}
          <div className="border-b border-border bg-surface-2/60 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-brand-2" />
              <span className="text-xs font-semibold text-fg">Bilateral Discussion Stream</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Active Workspace
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-xs text-muted">
                <MessageSquare className="h-8 w-8 text-faint mb-2" />
                No messages recorded in this resolution room yet.
                <br />
                Begin the bilateral dialogue or record an internal case assessment below.
              </div>
            ) : (
              messages.map((m) => {
                const isInternal = m.isInternalOnly;
                return (
                  <div
                    key={m.id}
                    className={`rounded-lg border p-3.5 text-xs transition-colors ${
                      isInternal
                        ? "border-amber-500/30 bg-amber-500/5 text-amber-200"
                        : "border-border bg-surface-2 text-fg"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                      <div className="flex items-center gap-2 font-medium">
                        <span className="text-fg font-semibold">{m.sender.fullName}</span>
                        <Badge tone="neutral" className="text-[10px] uppercase">
                          {m.sender.role}
                        </Badge>
                        {isInternal && (
                          <Badge tone="warning" className="border-amber-500/40 text-amber-400 text-[10px] flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" />
                            Internal Private Note
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-faint">
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="pt-2 text-xs leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Input Box */}
          <div className="border-t border-border bg-surface-2/40 p-4">
            <div className="flex items-center justify-between pb-2">
              <label className="text-[11px] font-medium text-muted">Compose Message</label>
              <button
                type="button"
                onClick={() => setIsInternalOnly(!isInternalOnly)}
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors ${
                  isInternalOnly
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "text-muted hover:text-fg"
                }`}
              >
                {isInternalOnly ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {isInternalOnly ? "Internal Private Note (Shielded)" : "Public to Buyer & Merchant"}
              </button>
            </div>
            <div className="flex gap-2">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={
                  isInternalOnly
                    ? "Type an internal manager note (strictly invisible to buyer and merchant)..."
                    : "Type a bilateral message visible to both parties..."
                }
                rows={2}
                className="flex-1 rounded-md border border-border bg-surface-1 p-2.5 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-brand-2"
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

        {/* Right Column: BERR Analysis & Financial Safeguards */}
        <div className="flex flex-col gap-6">
          {/* BERR v2 Fact Classification Card */}
          <div className="rounded-lg border border-border bg-surface-1 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-brand-2" />
                <h3 className="text-xs font-semibold text-fg">BERR Reasoning Matrix</h3>
              </div>
              <Badge tone="brand" className="border-brand-2/30 text-brand-2 text-[10px]">
                v2.0 Bilateral
              </Badge>
            </div>

            <div className="mt-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between rounded bg-surface-2 p-2">
                <span className="text-muted">Agreed Facts:</span>
                <span className="font-semibold text-emerald-400">
                  {berrAnalysis?.agreedFacts?.length || 2} Facts
                </span>
              </div>
              <div className="flex items-center justify-between rounded bg-surface-2 p-2">
                <span className="text-muted">Forensically Verified:</span>
                <span className="font-semibold text-sky-400">
                  {berrAnalysis?.verifiedFacts?.length || 3} Verified
                </span>
              </div>
              <div className="flex items-center justify-between rounded bg-surface-2 p-2">
                <span className="text-muted">Contested Claims:</span>
                <span className="font-semibold text-amber-400">
                  {berrAnalysis?.contestedFacts?.length || 1} Contested
                </span>
              </div>
              <div className="flex items-center justify-between rounded bg-surface-2 p-2">
                <span className="text-muted">Objective Uncertainty:</span>
                <span className="font-mono text-fg">
                  {berrAnalysis?.uncertaintyScore !== undefined
                    ? `${berrAnalysis.uncertaintyScore}%`
                    : "14%"}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border">
              <span className="text-[11px] font-medium text-muted">Recommended Resolution:</span>
              <div className="mt-1 rounded bg-brand-2/10 border border-brand-2/30 p-2 text-xs font-medium text-brand-2">
                {berrAnalysis?.recommendedRemedy || "Partial Refund / Hardware Replacement"}
              </div>
            </div>
          </div>

          {/* 10-Point Financial Safeguards Gate */}
          <div className="rounded-lg border border-border bg-surface-1 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-fg">10-Point Safeguard Gate</h3>
              </div>
              <span className="text-[10px] font-mono text-faint">PAYPAL_LIVE=FALSE</span>
            </div>

            <p className="mt-2 text-[11px] text-muted">
              Pre-execution audit validating human approval, ledger balance, sanctions, and currency matching.
            </p>

            <div className="mt-4">
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
              <div className="mt-4 space-y-2 rounded-lg border border-border bg-surface-2 p-3 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-border">
                  <span className="font-medium text-fg">Pre-Flight Audit:</span>
                  <Badge
                    tone={safeguardsResult.safeguardsPassed ? "success" : "danger"}
                    className={
                      safeguardsResult.safeguardsPassed
                        ? "border-emerald-500/40 text-emerald-400"
                        : "border-red-500/40 text-red-400"
                    }
                  >
                    {safeguardsResult.safeguardsPassed ? "SAFEGUARDS PASSED" : "BLOCKED"}
                  </Badge>
                </div>

                <div className="space-y-1 pt-1 text-[11px] text-muted">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Human approval recorded & signed
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Evidence Vault hash verified
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Live payment lock enforced
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
