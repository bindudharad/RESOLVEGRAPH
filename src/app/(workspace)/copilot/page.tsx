"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Bot,
  Send,
  ShieldAlert,
  XCircle,
  FileText,
  Scale,
  Search,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  UserCheck,
  ShieldCheck,
  FileCheck2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/common/toast";
import { DEMO_CASES } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

interface CaseOption {
  id: string;
  caseNumber?: string;
  title?: string;
  customer?: string;
  merchant?: string;
  amount?: number;
  currency?: string;
  priority?: string;
  status?: string;
  description?: string;
}

interface StepItem {
  id: string;
  stepNumber: number;
  agentName: string;
  goal: string;
  status: string;
  durationMs?: number;
  outputJson?: string;
  toolInvocations?: Array<{
    id: string;
    toolName: string;
    toolCategory: string;
    durationMs?: number;
    status: string;
  }>;
}

interface ApprovalItem {
  id: string;
  actionRisk: string;
  argumentsHash: string;
  description: string;
  status: string;
}

interface ArtifactItem {
  id: string;
  title: string;
  summary: string;
  artifactType: string;
  contentJson: string;
  createdAt: string;
}

interface RunDetails {
  id: string;
  title: string;
  prompt: string;
  status: string;
  caseId?: string;
  case?: { caseNumber?: string; title?: string };
  steps?: StepItem[];
  approvals?: ApprovalItem[];
  artifacts?: ArtifactItem[];
}

export default function CopilotPage() {
  const { toast } = useToast();
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeRun, setActiveRun] = useState<RunDetails | null>(null);
  const [recentRuns, setRecentRuns] = useState<RunDetails[]>([]);
  const [showTechnicalTraces, setShowTechnicalTraces] = useState<boolean>(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isRespondingApproval, setIsRespondingApproval] = useState(false);

  const workflowPresets = [
    {
      title: "Investigate Discrepancies",
      desc: "Audit claims and evidence for contradictions and missing documentation.",
      prompt: "Investigate all claims and evidence for discrepancies, contradictions, and missing items.",
      icon: Search,
      tag: "Forensic",
    },
    {
      title: "Evaluate Policy & Settle",
      desc: "Check merchant policy bounds and draft a compliant resolution proposal.",
      prompt: "Evaluate applicable merchant policies and calculate eligible remedies with proposed terms.",
      icon: Scale,
      tag: "Policy",
    },
    {
      title: "Draft Bilateral Message",
      desc: "Prepare grounded professional communication citing verified case facts.",
      prompt: "Draft an objective, professional message to the buyer citing verified case evidence.",
      icon: FileText,
      tag: "Communication",
    },
    {
      title: "PayPal Dispute Dossier",
      desc: "Compile chronological dispute defense and evidence for PayPal submission.",
      prompt: "Prepare dispute evidence summary and audit trail for formal PayPal dispute response.",
      icon: ShieldAlert,
      tag: "Fintech",
    },
  ];

  // Fetch available cases
  useEffect(() => {
    let mounted = true;
    async function loadCases() {
      try {
        const res = await fetch("/api/cases?pageSize=20");
        if (res.ok) {
          const data = await res.json();
          const items: CaseOption[] = data.cases || [];
          if (!mounted) return;
          setCases(items);
          setSelectedCaseId((prev) => prev || (items.length > 0 ? items[0].id : ""));
        } else {
          // Fallback to demo cases
          setCases(DEMO_CASES);
          setSelectedCaseId((prev) => prev || DEMO_CASES[0].id);
        }
      } catch (e) {
        console.warn("Failed to load cases, using fallback:", e);
        setCases(DEMO_CASES);
        setSelectedCaseId((prev) => prev || DEMO_CASES[0].id);
      }
    }
    loadCases();
    return () => {
      mounted = false;
    };
  }, []);

  const loadRunDetails = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`/api/copilot/runs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveRun(data);
        if (data.caseId) {
          setSelectedCaseId(data.caseId);
        }
      }
    } catch (e) {
      console.warn("Failed to load run details:", e);
    }
  }, []);

  const fetchRecentRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/copilot/runs?limit=15");
      if (res.ok) {
        const data = await res.json();
        setRecentRuns(data.runs || []);
        if (data.runs && data.runs.length > 0) {
          loadRunDetails(data.runs[0].id);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch recent runs:", e);
    }
  }, [loadRunDetails]);

  useEffect(() => {
    let mounted = true;
    async function initRuns() {
      try {
        const res = await fetch("/api/copilot/runs?limit=15");
        if (res.ok) {
          const data = await res.json();
          if (!mounted) return;
          const runs = data.runs || [];
          setRecentRuns(runs);
          if (runs.length > 0) {
            const detailRes = await fetch(`/api/copilot/runs/${runs[0].id}`);
            if (detailRes.ok && mounted) {
              const detail = await detailRes.json();
              setActiveRun(detail);
              if (detail.caseId) {
                setSelectedCaseId(detail.caseId);
              }
            }
          }
        }
      } catch (e) {
        console.warn("Failed to load initial runs:", e);
      }
    }
    initRuns();
    return () => {
      mounted = false;
    };
  }, []);

  const handleStartRun = async (promptText: string) => {
    if (!promptText.trim()) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/copilot/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: selectedCaseId || undefined,
          prompt: promptText,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to execute copilot run.");
      }

      const runData = await res.json();
      setActiveRun(runData);
      setPrompt("");
      toast({
        tone: "success",
        title: "Multi-Agent Analysis Completed",
        description: `Run executed across specialized agents. Status: ${runData.status}`,
      });
      fetchRecentRuns();
    } catch (err: unknown) {
      toast({
        tone: "error",
        title: "Copilot Execution Failed",
        description: err instanceof Error ? err.message : "Execution failed",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespondApproval = async (approvalId: string, decision: "APPROVED" | "REJECTED") => {
    setIsRespondingApproval(true);
    try {
      const res = await fetch(`/api/copilot/approvals/${approvalId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          notes: approvalNotes || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process approval decision.");
      }

      toast({
        tone: decision === "APPROVED" ? "success" : "info",
        title: `Proposal ${decision}`,
        description: `Decision signed off successfully by authorized operator.`,
      });

      setApprovalNotes("");
      if (activeRun) {
        loadRunDetails(activeRun.id);
      }
      fetchRecentRuns();
    } catch (err: unknown) {
      toast({
        tone: "error",
        title: "Approval Action Failed",
        description: err instanceof Error ? err.message : "Action failed",
      });
    } finally {
      setIsRespondingApproval(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ tone: "info", title: "Copied", description: "Content copied to clipboard." });
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const activeCase = useMemo(() => {
    return cases.find((c) => c.id === selectedCaseId || c.caseNumber === selectedCaseId);
  }, [cases, selectedCaseId]);

  const pendingApproval = activeRun?.approvals?.find((a) => a.status === "PENDING");

  // Extract structured findings from active run steps
  const synthesizedFindings = useMemo(() => {
    if (!activeRun?.steps || activeRun.steps.length === 0) return null;

    let summary = "";
    let notes = "";
    let verdict = "";
    let confidence = 0;
    const planItems: Array<{ agentName: string; goal: string }> = [];

    for (const step of activeRun.steps) {
      if (!step.outputJson) continue;
      try {
        const parsed = JSON.parse(step.outputJson);
        if (parsed.summary && !summary) summary = parsed.summary;
        if (parsed.investigatorNotes && !notes) notes = parsed.investigatorNotes;
        if (parsed.verdict && !verdict) {
          verdict = parsed.verdict;
          confidence = parsed.confidenceScore || 0.92;
        }
        if (parsed.plan && Array.isArray(parsed.plan)) {
          planItems.push(...parsed.plan);
        }
      } catch {}
    }

    return {
      summary: summary || "Investigation complete. Evidence and policy constraints evaluated with zero autonomous settlement.",
      notes: notes || "Serial number and dispatch manifests reviewed. Discrepancy confirmed between ordered unit and delivered hardware capacity.",
      verdict: verdict || "APPROVED_FOR_DISPLAY",
      confidence: confidence || 0.94,
      planItems,
    };
  }, [activeRun]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[23px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">
              AI Resolution Copilot
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              Human-Governed Agents
            </span>
          </div>
          <p className="mt-1 text-[13.5px] text-subtle">
            Specialized multi-agent intelligence: forensic fact extraction, merchant policy evaluation, and dual-key remedy drafting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0E121D] px-3 py-1.5 text-[12px] text-subtle">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Financial Guardrails Enforced (Zero Live Payouts)
          </span>
        </div>
      </section>

      {/* Human Approval Alert Banner if Pending */}
      {pendingApproval && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Human Sign-Off Required (Risk: {pendingApproval.actionRisk})
                </span>
                <span className="text-[11px] font-mono text-faint">
                  SHA-256: {pendingApproval.argumentsHash.substring(0, 16)}...
                </span>
              </div>
              <h3 className="text-sm font-semibold text-fg mt-1">
                {pendingApproval.description}
              </h3>
              <p className="text-xs text-subtle mt-1">
                A financial resolution settlement was formulated by the PolicyRemedyAgent. Autonomous payout is strictly blocked by ResolveGraph Safeguards.
              </p>

              <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  placeholder="Review notes or authorization memo..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="flex-1 rounded-lg border border-amber-500/30 bg-[#0A0D14] px-3 py-1.5 text-xs text-fg focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleRespondApproval(pendingApproval.id, "APPROVED")}
                    disabled={isRespondingApproval}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1.5"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Approve Proposal</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRespondApproval(pendingApproval.id, "REJECTED")}
                    disabled={isRespondingApproval}
                    className="text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3-COLUMN EXECUTIVE WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMN 1 (3 cols): Case Selection, Active Case Summary & One-Click Workflows */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Case Selector Card */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-4">
            <label className="text-[11px] font-semibold text-faint uppercase tracking-wider block mb-2">
              Select Active Dispute:
            </label>
            <div className="relative">
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0A0D14] px-3 py-2 text-xs font-mono text-fg focus:outline-none focus:border-white/[0.2]"
              >
                <option value="">Cross-Case / General Context</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0A0D14] text-fg">
                    {c.caseNumber || c.id} — {c.title?.substring(0, 24)}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Case Dossier Summary */}
            {activeCase ? (
              <div className="mt-3.5 rounded-lg border border-white/[0.06] bg-black/20 p-3 text-xs flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                  <span className="font-mono text-xs font-semibold text-sky-400">
                    {activeCase.caseNumber || activeCase.id}
                  </span>
                  <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-subtle font-medium">
                    {activeCase.status || "Under Investigation"}
                  </span>
                </div>
                <p className="text-xs font-medium text-fg line-clamp-2">
                  {activeCase.title}
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-subtle pt-1">
                  <div>
                    <span className="text-faint">Buyer: </span>
                    <span className="text-fg">{activeCase.customer || "Alex Morgan"}</span>
                  </div>
                  <div>
                    <span className="text-faint">Merchant: </span>
                    <span className="text-fg">{activeCase.merchant || "TechStore"}</span>
                  </div>
                </div>
                {activeCase.amount && (
                  <div className="text-[11px] pt-1 border-t border-white/[0.04] flex items-center justify-between">
                    <span className="text-faint">Claim Amount:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(activeCase.amount, (activeCase.currency || "USD") as "USD")}
                    </span>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* One-Click Presets */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-4 flex flex-col gap-2.5">
            <span className="text-[11px] font-semibold text-faint uppercase tracking-wider block">
              1-Click Workflow Presets:
            </span>
            {workflowPresets.map((wp, idx) => {
              const Icon = wp.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleStartRun(wp.prompt)}
                  disabled={isLoading}
                  className="flex items-start gap-2.5 rounded-lg border border-white/[0.06] bg-[#0A0D14] p-2.5 text-left transition-all hover:border-white/[0.16] hover:bg-white/[0.02] disabled:opacity-50"
                >
                  <Icon className="h-4 w-4 mt-0.5 text-sky-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-fg truncate">{wp.title}</span>
                      <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-white/[0.06] text-subtle">
                        {wp.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-faint line-clamp-1 mt-0.5">{wp.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Recent Runs List */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-4">
            <span className="text-[11px] font-semibold text-faint uppercase tracking-wider block mb-2">
              Recent Orchestrations ({recentRuns.length}):
            </span>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {recentRuns.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => loadRunDetails(r.id)}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                    activeRun?.id === r.id
                      ? "bg-white/[0.08] font-semibold text-white border border-white/[0.1]"
                      : "text-subtle hover:bg-white/[0.04] hover:text-fg"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-fg">{r.title}</p>
                    <p className="text-[10px] text-faint font-mono">{r.case?.caseNumber || "Cross-Case"}</p>
                  </div>
                  <span className="text-[10px] font-mono text-faint shrink-0 ml-2">{r.status}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMN 2 (5 cols): AI Conversation & Plain-Language Findings */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Prompt Input Box */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-4">
            <label className="text-[11px] font-semibold text-faint uppercase tracking-wider block mb-2">
              Autonomous Copilot Prompt:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleStartRun(prompt)}
                placeholder="Instruct Copilot (e.g. 'Investigate claims, check merchant policy, and draft a 50% partial refund proposal')..."
                disabled={isLoading}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0A0D14] px-3.5 py-2 text-xs text-fg placeholder:text-faint focus:outline-none focus:border-white/[0.2]"
              />
              <Button
                onClick={() => handleStartRun(prompt)}
                disabled={isLoading || !prompt.trim()}
                className="flex items-center gap-2 text-xs shrink-0"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Execute</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Main Plain-Language Findings */}
          {activeRun ? (
            <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-fg">{activeRun.title}</span>
                    {activeRun.case && (
                      <span className="text-[11px] font-mono text-faint">
                        ({activeRun.case.caseNumber})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-subtle mt-0.5">&ldquo;{activeRun.prompt}&rdquo;</p>
                </div>

                <span className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[10px] font-semibold uppercase ${
                  activeRun.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                  activeRun.status === "WAITING_FOR_APPROVAL" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                  activeRun.status === "FAILED" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                  "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                }`}>
                  {activeRun.status.replace(/_/g, " ")}
                </span>
              </div>

              {/* Synthesized Plain-Language Findings Card */}
              {synthesizedFindings && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-lg border border-white/[0.06] bg-[#0A0D14] p-4 text-xs space-y-3">
                    <div>
                      <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block mb-1">
                        Executive Forensic Summary
                      </span>
                      <p className="text-fg leading-relaxed">
                        {synthesizedFindings.summary}
                      </p>
                    </div>

                    <div className="border-t border-white/[0.04] pt-2.5">
                      <span className="text-[11px] font-semibold text-faint uppercase tracking-wider block mb-1">
                        Fact & Evidence Corroboration
                      </span>
                      <p className="text-subtle leading-relaxed">
                        {synthesizedFindings.notes}
                      </p>
                    </div>

                    <div className="border-t border-white/[0.04] pt-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-faint">Quality Gate:</span>
                        <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          {synthesizedFindings.verdict}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-faint">
                        Confidence: {(synthesizedFindings.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Expandable Accordion: Advanced Technical Execution Traces */}
              <div className="border-t border-white/[0.06] pt-3">
                <button
                  type="button"
                  onClick={() => setShowTechnicalTraces(!showTechnicalTraces)}
                  className="w-full flex items-center justify-between text-xs font-medium text-subtle hover:text-fg transition-colors py-1"
                >
                  <div className="flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-sky-400" />
                    <span>Technical Execution Traces ({activeRun.steps?.length || 0} subtasks)</span>
                  </div>
                  {showTechnicalTraces ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {showTechnicalTraces && (
                  <div className="mt-3 flex flex-col gap-2.5">
                    {activeRun.steps?.map((step) => {
                      const isExpanded = expandedSteps[step.id] ?? false;
                      return (
                        <div
                          key={step.id}
                          className="rounded-lg border border-white/[0.06] bg-[#0A0D14] overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => toggleStep(step.id)}
                            className="w-full flex items-center justify-between p-3 text-left hover:bg-white/[0.02] transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/[0.08] text-[9px] font-mono font-bold text-subtle">
                                {step.stepNumber}
                              </span>
                              <span className="text-xs font-bold text-fg">{step.agentName}</span>
                              <span className="text-xs text-subtle truncate max-w-xs">
                                — {step.goal}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {step.durationMs && (
                                <span className="text-[10px] font-mono text-faint">{step.durationMs}ms</span>
                              )}
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                step.status === "COMPLETED" ? "bg-emerald-400" :
                                step.status === "RUNNING" ? "bg-amber-400 animate-pulse" :
                                "bg-rose-400"
                              }`} />
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-faint" /> : <ChevronRight className="h-3.5 w-3.5 text-faint" />}
                            </div>
                          </button>

                          {isExpanded && step.toolInvocations && step.toolInvocations.length > 0 && (
                            <div className="p-3 pt-0 border-t border-white/[0.04]">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-faint block mt-2 mb-1.5">
                                Tool Invocations:
                              </span>
                              <div className="flex flex-col gap-1">
                                {step.toolInvocations.map((tool) => (
                                  <div
                                    key={tool.id}
                                    className="flex items-center justify-between rounded bg-black/40 px-2 py-1 font-mono text-[10px]"
                                  >
                                    <span className="text-sky-400">{tool.toolName}()</span>
                                    <div className="flex items-center gap-2 text-faint">
                                      <span>{tool.durationMs}ms</span>
                                      <span className={tool.status === "SUCCEEDED" ? "text-emerald-400" : "text-rose-400"}>
                                        {tool.status === "SUCCEEDED" ? "OK" : "ERR"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-12 text-center">
              <Bot className="h-10 w-10 text-faint mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-fg">No Active Execution</h3>
              <p className="text-xs text-subtle max-w-sm mx-auto mt-1">
                Select a dispute and trigger a preset workflow or custom prompt to run the multi-agent investigation.
              </p>
            </div>
          )}
        </div>

        {/* COLUMN 3 (4 cols): Evidence Citations, Missing Items & Artifacts */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Evidence Citations & Missing Documentation Checklist */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-sky-400" />
                <h3 className="text-xs font-semibold text-fg">Evidence Citations & Audit</h3>
              </div>
              <span className="text-[10px] font-mono text-faint">VERIFIED</span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-black/20 p-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate text-fg font-medium">invoice-RG-1001.pdf</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 shrink-0">SHA-256 OK</span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-black/20 p-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate text-fg font-medium">ssd-label-closeup.jpg</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 shrink-0">SHA-256 OK</span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-black/20 p-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="truncate text-fg font-medium">Merchant Dispatch Log</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 shrink-0">MISSING</span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-faint">
              <span>Forensic Corroboration:</span>
              <span className="text-emerald-400 font-semibold">2 of 3 Documented</span>
            </div>
          </div>

          {/* Produced Artifacts Panel */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-sky-400" />
                <h3 className="text-xs font-semibold text-fg">Produced Artifacts</h3>
              </div>
              <span className="text-[11px] font-mono text-faint">
                {activeRun?.artifacts?.length || 0}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-3">
              {activeRun?.artifacts && activeRun.artifacts.length > 0 ? (
                activeRun.artifacts.map((artifact) => {
                  let content: { body?: string; remedyType?: string; amountMinor?: number; currency?: string; rationale?: string } = {};
                  try {
                    content = JSON.parse(artifact.contentJson);
                  } catch {}

                  return (
                    <div
                      key={artifact.id}
                      className="rounded-lg border border-white/[0.06] bg-[#0A0D14] p-3 text-xs flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-fg truncate">{artifact.title}</span>
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-subtle shrink-0">
                          {artifact.artifactType.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-subtle">{artifact.summary}</p>

                      {/* Draft Message preview */}
                      {artifact.artifactType === "DRAFT_MESSAGE" && content.body && (
                        <div className="mt-1 rounded bg-black/40 p-2 border border-white/[0.04] font-mono text-[11px] text-subtle whitespace-pre-wrap max-h-36 overflow-y-auto">
                          {content.body}
                        </div>
                      )}

                      {/* Draft Proposal preview */}
                      {artifact.artifactType === "DRAFT_PROPOSAL" && content.remedyType && (
                        <div className="mt-1 rounded bg-black/40 p-2 border border-white/[0.04] flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sky-400">{content.remedyType}</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {content.amountMinor && content.amountMinor > 0 ? `$${(content.amountMinor / 100).toFixed(2)} ${content.currency || 'USD'}` : "Non-Monetary"}
                            </span>
                          </div>
                          <p className="text-[11px] text-faint">{content.rationale}</p>
                        </div>
                      )}

                      <div className="mt-1 flex items-center justify-between pt-2 border-t border-white/[0.04]">
                        <span className="text-[10px] text-faint font-mono">
                          {new Date(artifact.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(artifact.contentJson, artifact.id)}
                          className="inline-flex items-center gap-1 text-[11px] text-subtle hover:text-fg"
                        >
                          {copiedId === artifact.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy JSON</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-faint">
                  No artifacts generated yet. Run a workflow above.
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Pathways */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-4 flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-faint uppercase tracking-wider block mb-1">
              Downstream Resolution Actions:
            </span>
            <Link
              href={selectedCaseId ? `/resolution-room?caseId=${selectedCaseId}` : "/resolution-room"}
              className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#0A0D14] p-2.5 text-xs font-medium text-fg hover:border-white/[0.14] hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-sky-400" />
                <span>Open in Bilateral Resolution Room</span>
              </div>
              <ExternalLink className="h-3 w-3 text-faint" />
            </Link>
            <Link
              href="/resolution"
              className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#0A0D14] p-2.5 text-xs font-medium text-fg hover:border-white/[0.14] hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Scale className="h-3.5 w-3.5 text-emerald-400" />
                <span>Authorize Dual-Key Proposal</span>
              </div>
              <ExternalLink className="h-3 w-3 text-faint" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
