"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  ShieldAlert,
  XCircle,
  ArrowRight,
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
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/common/toast";

interface CaseOption {
  id: string;
  caseNumber?: string;
  title?: string;
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
  case?: { caseNumber?: string };
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
      tag: "Forensic"
    },
    {
      title: "Evaluate Policy & Settle",
      desc: "Check merchant policy bounds and draft a compliant resolution proposal.",
      prompt: "Evaluate applicable merchant policies and calculate eligible remedies with proposed terms.",
      icon: Scale,
      tag: "Policy"
    },
    {
      title: "Draft Buyer Message",
      desc: "Prepare grounded professional communication citing verified case facts.",
      prompt: "Draft an objective, professional message to the buyer citing verified case evidence.",
      icon: FileText,
      tag: "Communication"
    },
    {
      title: "PayPal Dispute Dossier",
      desc: "Compile chronological dispute defense and evidence for PayPal submission.",
      prompt: "Prepare dispute evidence summary and audit trail for formal PayPal dispute response.",
      icon: ShieldAlert,
      tag: "Fintech"
    }
  ];

  // Fetch available cases
  useEffect(() => {
    let mounted = true;
    async function loadCases() {
      try {
        const res = await fetch("/api/cases?pageSize=20");
        if (res.ok) {
          const data = await res.json();
          const items = data.cases || [];
          if (!mounted) return;
          setCases(items);
          setSelectedCaseId((prev) => prev || (items.length > 0 ? items[0].id : ""));
        }
      } catch (e) {
        console.warn("Failed to load cases:", e);
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
          prompt: promptText
        })
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
        title: "Multi-Agent Orchestration Completed",
        description: `Run executed across specialized agents. Status: ${runData.status}`
      });
      fetchRecentRuns();
    } catch (err: unknown) {
      toast({
        tone: "error",
        title: "Copilot Execution Failed",
        description: err instanceof Error ? err.message : "Execution failed"
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
          notes: approvalNotes || undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process approval decision.");
      }

      toast({
        tone: decision === "APPROVED" ? "success" : "info",
        title: `Proposal ${decision}`,
        description: `Decision signed off successfully by authorized operator.`
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
        description: err instanceof Error ? err.message : "Action failed"
      });
    } finally {
      setIsRespondingApproval(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ tone: "info", title: "Copied", description: "JSON copied to clipboard." });
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const pendingApproval = activeRun?.approvals?.find((a) => a.status === "PENDING");

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="rg-card p-6 border-b border-line bg-gradient-to-r from-surface-1 via-surface-2 to-surface-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_20%,transparent)] text-[var(--color-brand)] shadow-sm">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-lg font-bold text-fg">Multi-Agent Case Resolution Copilot</h1>
                <p className="text-xs text-subtle">
                  Human-governed agentic AI system: triage, forensic investigation, policy evaluation, communication drafting, and adversarial quality review.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Financial Guardrails Enforced (Zero Autonomous Payouts)
            </span>
          </div>
        </div>

        {/* Multi-Agent Architecture Pipeline Visualizer */}
        <div className="mt-6 pt-5 border-t border-line/60">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-3">
            Active Multi-Agent Topology:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
            <div className="rounded-lg border border-line bg-surface-2 p-2.5 text-center">
              <span className="text-[10px] font-mono text-faint uppercase block">Manager</span>
              <span className="font-semibold text-violet-400 mt-0.5 block">Orchestrator</span>
            </div>
            <div className="rounded-lg border border-line bg-surface-2 p-2.5 text-center">
              <span className="text-[10px] font-mono text-faint uppercase block">Intent & Plan</span>
              <span className="font-semibold text-sky-400 mt-0.5 block">CaseTriage</span>
            </div>
            <div className="rounded-lg border border-line bg-surface-2 p-2.5 text-center">
              <span className="text-[10px] font-mono text-faint uppercase block">Facts & Claims</span>
              <span className="font-semibold text-rose-400 mt-0.5 block">Investigator</span>
            </div>
            <div className="rounded-lg border border-line bg-surface-2 p-2.5 text-center">
              <span className="text-[10px] font-mono text-faint uppercase block">Policy & Bounds</span>
              <span className="font-semibold text-teal-400 mt-0.5 block">PolicyRemedy</span>
            </div>
            <div className="rounded-lg border border-line bg-surface-2 p-2.5 text-center">
              <span className="text-[10px] font-mono text-faint uppercase block">Grounding</span>
              <span className="font-semibold text-amber-400 mt-0.5 block">Drafter</span>
            </div>
            <div className="rounded-lg border border-line bg-surface-2 p-2.5 text-center">
              <span className="text-[10px] font-mono text-faint uppercase block">Adversarial Gate</span>
              <span className="font-semibold text-emerald-400 mt-0.5 block">QualityReview</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Strip: Case Selector + Prompt Input */}
      <div className="rg-card p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-2 sm:w-80">
            <FolderOpen className="h-4 w-4 text-subtle shrink-0" />
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-fg focus:outline-none focus:border-[var(--color-brand)]"
            >
              <option value="">Cross-Case / General Context</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber || c.id} — {c.title?.substring(0, 35)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleStartRun(prompt)}
              placeholder="Give natural-language instruction (e.g. 'Investigate claims, check merchant policy, and draft a 50% partial refund proposal')..."
              disabled={isLoading}
              className="w-full rounded-lg border border-line bg-surface-2 px-4 py-2 text-xs text-fg placeholder:text-faint focus:outline-none focus:border-[var(--color-brand)]"
            />
            <Button
              onClick={() => handleStartRun(prompt)}
              disabled={isLoading || !prompt.trim()}
              className="flex items-center gap-2 text-xs shrink-0"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Running...</span>
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

        {/* Workflow Presets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {workflowPresets.map((wp, idx) => {
            const Icon = wp.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleStartRun(wp.prompt)}
                disabled={isLoading}
                className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 p-3 text-left transition-all hover:border-[var(--color-brand)] hover:bg-surface-3 disabled:opacity-50"
              >
                <Icon className="h-4 w-4 mt-0.5 text-[var(--color-brand)] shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-fg truncate">{wp.title}</span>
                    <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-surface-3 text-subtle">{wp.tag}</span>
                  </div>
                  <p className="text-[11px] text-faint line-clamp-2 mt-0.5">{wp.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Human Approval Alert Banner if Pending */}
      {pendingApproval && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 shadow-lg">
          <div className="flex items-start gap-3.5">
            <div className="rounded-full bg-amber-500/20 p-2 text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Human Sign-Off Required (Risk: {pendingApproval.actionRisk})
                </span>
                <span className="text-[11px] text-faint font-mono">
                  SHA-256: {pendingApproval.argumentsHash.substring(0, 16)}...
                </span>
              </div>
              <h3 className="text-sm font-semibold text-fg mt-1">
                {pendingApproval.description}
              </h3>
              <p className="text-xs text-subtle mt-1">
                A financial resolution settlement was formulated by the PolicyRemedyAgent. Autonomous execution is strictly blocked by ResolveGraph Financial Guardrails.
              </p>

              <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  placeholder="Optional review notes or authorization memo..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="flex-1 rounded-md border border-amber-500/30 bg-surface-2 px-3 py-1.5 text-xs text-fg focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleRespondApproval(pendingApproval.id, "APPROVED")}
                    disabled={isRespondingApproval}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1.5"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Approve & Materialize</span>
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

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Multi-Agent Execution Details */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {activeRun ? (
            <div className="rg-card p-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-fg">{activeRun.title}</span>
                    {activeRun.case && (
                      <span className="text-[11px] font-mono text-faint">
                        ({activeRun.case.caseNumber})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-subtle mt-0.5">Prompt: &ldquo;{activeRun.prompt}&rdquo;</p>
                </div>

                <span className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold uppercase ${
                  activeRun.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                  activeRun.status === "WAITING_FOR_APPROVAL" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                  activeRun.status === "FAILED" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                  "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                }`}>
                  {activeRun.status.replace(/_/g, " ")}
                </span>
              </div>

              {/* Step List */}
              <div className="mt-4 flex flex-col gap-3">
                {activeRun.steps?.map((step) => {
                  const isExpanded = expandedSteps[step.id] ?? true;
                  let parsedOutput: {
                    summary?: string;
                    investigatorNotes?: string;
                    plan?: Array<{ agentName: string; goal: string }>;
                    verdict?: string;
                    confidenceScore?: number;
                  } | null = null;
                  try {
                    parsedOutput = step.outputJson ? JSON.parse(step.outputJson) : null;
                  } catch {}

                  return (
                    <div
                      key={step.id}
                      className="rounded-lg border border-line bg-surface-2 overflow-hidden transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => toggleStep(step.id)}
                        className="w-full flex items-center justify-between p-3.5 text-left hover:bg-surface-3 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-3 text-[10px] font-bold font-mono text-muted">
                            {step.stepNumber}
                          </span>
                          <span className="text-xs font-bold text-fg">{step.agentName}</span>
                          <span className="text-xs text-subtle font-normal truncate max-w-xs sm:max-w-md">
                            — {step.goal}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {step.durationMs && (
                            <span className="text-[11px] font-mono text-faint">{step.durationMs}ms</span>
                          )}
                          <span className={`h-2 w-2 rounded-full ${
                            step.status === "COMPLETED" ? "bg-emerald-400" :
                            step.status === "RUNNING" ? "bg-amber-400 animate-pulse" :
                            "bg-rose-400"
                          }`} />
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-faint" /> : <ChevronRight className="h-3.5 w-3.5 text-faint" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-3.5 pt-0 border-t border-line/40 text-xs">
                          {parsedOutput && (
                            <div className="mt-2.5 rounded bg-[#090d16] p-3 text-fg border border-line-2">
                              {parsedOutput.summary && (
                                <p className="text-xs text-fg font-medium mb-2">{parsedOutput.summary}</p>
                              )}
                              {parsedOutput.investigatorNotes && (
                                <p className="text-xs text-subtle mb-2">{parsedOutput.investigatorNotes}</p>
                              )}
                              {parsedOutput.plan && (
                                <div className="mt-2 flex flex-col gap-1.5">
                                  <span className="text-[11px] font-semibold text-faint uppercase">Orchestrated Subtask Plan:</span>
                                  {parsedOutput.plan.map((p, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 text-[11px] text-subtle">
                                      <ArrowRight className="h-3 w-3 text-[var(--color-brand)] shrink-0" />
                                      <span className="font-semibold text-fg">{p.agentName}:</span>
                                      <span>{p.goal}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {parsedOutput.verdict && (
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-[11px] font-semibold text-faint uppercase">Quality Gate Verdict:</span>
                                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    parsedOutput.verdict === "APPROVED_FOR_DISPLAY" ? "bg-emerald-500/20 text-emerald-400" :
                                    parsedOutput.verdict === "HUMAN_REVIEW_REQUIRED" ? "bg-amber-500/20 text-amber-400" :
                                    "bg-rose-500/20 text-rose-400"
                                  }`}>
                                    {parsedOutput.verdict}
                                  </span>
                                  <span className="text-[11px] text-faint">
                                    (Confidence: {((parsedOutput.confidenceScore || 0) * 100).toFixed(0)}%)
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Tool Calls */}
                          {step.toolInvocations && step.toolInvocations.length > 0 && (
                            <div className="mt-3">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">
                                Tool Calls ({step.toolInvocations.length}):
                              </span>
                              <div className="mt-1.5 flex flex-col gap-1.5">
                                {step.toolInvocations.map((tool) => (
                                  <div
                                    key={tool.id}
                                    className="flex items-center justify-between rounded bg-surface-3 px-2.5 py-1.5 font-mono text-[11px]"
                                  >
                                    <span className="text-sky-400 font-semibold">{tool.toolName}()</span>
                                    <div className="flex items-center gap-2 text-faint">
                                      <span className="text-[10px] uppercase">{tool.toolCategory}</span>
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
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rg-card p-12 text-center">
              <Bot className="h-10 w-10 text-faint mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-fg">No Active Execution</h3>
              <p className="text-xs text-subtle max-w-md mx-auto mt-1">
                Select a case and choose a workflow preset above or input a custom prompt to trigger the agent orchestrator.
              </p>
            </div>
          )}
        </div>

        {/* Right Column (1 span): Artifacts + Run History */}
        <div className="flex flex-col gap-4">
          {/* Artifacts Panel */}
          <div className="rg-card p-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-fg">Produced Artifacts</h3>
              </div>
              <span className="text-[11px] font-mono text-faint">
                {activeRun?.artifacts?.length || 0}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {activeRun?.artifacts && activeRun.artifacts.length > 0 ? (
                activeRun.artifacts.map((artifact) => {
                  let content: { body?: string; remedyType?: string; amountMinor?: number; currency?: string; rationale?: string } = {};
                  try {
                    content = JSON.parse(artifact.contentJson);
                  } catch {}

                  return (
                    <div
                      key={artifact.id}
                      className="rounded-lg border border-line bg-surface-2 p-3.5 text-xs flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-fg">{artifact.title}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-3 text-subtle">
                          {artifact.artifactType.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-subtle">{artifact.summary}</p>

                      {/* Draft Message preview */}
                      {artifact.artifactType === "DRAFT_MESSAGE" && content.body && (
                        <div className="mt-1 rounded bg-[#090d16] p-2.5 border border-line-2 font-mono text-[11px] text-subtle whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {content.body}
                        </div>
                      )}

                      {/* Draft Proposal preview */}
                      {artifact.artifactType === "DRAFT_PROPOSAL" && content.remedyType && (
                        <div className="mt-1 rounded bg-[#090d16] p-2.5 border border-line-2 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-teal-400">{content.remedyType}</span>
                            <span className="font-mono font-bold text-fg">
                              {content.amountMinor && content.amountMinor > 0 ? `$${(content.amountMinor / 100).toFixed(2)} ${content.currency || 'USD'}` : "Non-Monetary"}
                            </span>
                          </div>
                          <p className="text-[11px] text-faint">{content.rationale}</p>
                        </div>
                      )}

                      <div className="mt-1 flex items-center justify-between pt-2 border-t border-line/40">
                        <span className="text-[10px] text-faint font-mono">
                          {new Date(artifact.createdAt).toLocaleTimeString()}
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
                <div className="p-6 text-center text-xs text-faint">
                  No artifacts generated yet.
                </div>
              )}
            </div>
          </div>

          {/* Recent Runs List */}
          <div className="rg-card p-4">
            <span className="text-[11px] font-semibold text-faint uppercase tracking-wider">
              Recent Copilot Runs ({recentRuns.length}):
            </span>
            <div className="mt-2 flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {recentRuns.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => loadRunDetails(r.id)}
                  className={`flex items-center justify-between rounded px-2.5 py-2 text-left text-xs transition-colors ${
                    activeRun?.id === r.id
                      ? "bg-[color-mix(in_srgb,var(--color-brand)_20%,transparent)] font-semibold text-[#b3a1ff]"
                      : "text-subtle hover:bg-surface-2 hover:text-fg"
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
      </div>
    </div>
  );
}
