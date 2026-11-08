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
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/common/toast";

interface CopilotTabProps {
  caseId: string;
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
  steps?: StepItem[];
  approvals?: ApprovalItem[];
  artifacts?: ArtifactItem[];
}

export function CaseCopilotTab({ caseId }: CopilotTabProps) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeRun, setActiveRun] = useState<RunDetails | null>(null);
  const [previousRuns, setPreviousRuns] = useState<RunDetails[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isRespondingApproval, setIsRespondingApproval] = useState(false);

  const quickPrompts = [
    {
      title: "Investigate Discrepancies",
      prompt: "Investigate all claims and evidence for discrepancies, contradictions, and missing items.",
      icon: Search,
      color: "text-rose-400"
    },
    {
      title: "Evaluate Policy & Remedy",
      prompt: "Evaluate applicable merchant policies and calculate eligible remedies with proposed terms.",
      icon: Scale,
      color: "text-teal-400"
    },
    {
      title: "Draft Buyer Message",
      prompt: "Draft an objective, professional message to the buyer citing verified case evidence.",
      icon: FileText,
      color: "text-sky-400"
    },
    {
      title: "Prepare PayPal Dossier",
      prompt: "Prepare dispute evidence summary and audit trail for formal PayPal dispute response.",
      icon: ShieldAlert,
      color: "text-amber-400"
    }
  ];

  const loadRunDetails = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`/api/copilot/runs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveRun(data);
      }
    } catch (e) {
      console.warn("Failed to load run details:", e);
    }
  }, []);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(`/api/copilot/runs?caseId=${encodeURIComponent(caseId)}`);
      if (res.ok) {
        const data = await res.json();
        setPreviousRuns(data.runs || []);
        if (data.runs && data.runs.length > 0) {
          loadRunDetails(data.runs[0].id);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch copilot runs:", e);
    }
  }, [caseId, loadRunDetails]);

  useEffect(() => {
    let mounted = true;

    async function initRuns() {
      try {
        const res = await fetch(`/api/copilot/runs?caseId=${encodeURIComponent(caseId)}`);
        if (res.ok) {
          const data = await res.json();
          if (!mounted) return;
          const runs = data.runs || [];
          setPreviousRuns(runs);
          if (runs.length > 0) {
            const detailRes = await fetch(`/api/copilot/runs/${runs[0].id}`);
            if (detailRes.ok && mounted) {
              const detailData = await detailRes.json();
              setActiveRun(detailData);
            }
          }
        }
      } catch (e) {
        console.warn("Failed to fetch copilot runs:", e);
      }
    }

    initRuns();

    return () => {
      mounted = false;
    };
  }, [caseId]);

  const handleStartRun = async (promptText: string) => {
    if (!promptText.trim()) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/copilot/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
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
      fetchRuns();
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
      fetchRuns();
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
    toast({ tone: "info", title: "Copied to Clipboard", description: "Text copied to system clipboard." });
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const pendingApproval = activeRun?.approvals?.find((a) => a.status === "PENDING");

  return (
    <div className="flex flex-col gap-6">
      {/* Copilot Header */}
      <div className="rg-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_20%,transparent)] text-[var(--color-brand)]">
                <Bot className="h-5 w-5" />
              </span>
              <h2 className="text-base font-semibold text-fg">ResolveGraph Multi-Agent Case Copilot</h2>
            </div>
            <p className="text-xs text-subtle mt-1">
              Human-governed agentic AI system: triage, forensic investigation, policy evaluation, communication drafting, and adversarial quality review.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Financial Guardrails Enforced (Zero Autonomous Payouts)
            </span>
          </div>
        </div>

        {/* Quick Workflow Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {quickPrompts.map((qp, idx) => {
            const Icon = qp.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleStartRun(qp.prompt)}
                disabled={isLoading}
                className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 p-3 text-left transition-all hover:border-[var(--color-brand)] hover:bg-surface-3 disabled:opacity-50"
              >
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${qp.color}`} />
                <div>
                  <p className="text-xs font-semibold text-fg">{qp.title}</p>
                  <p className="text-[11px] text-faint line-clamp-2 mt-0.5">{qp.prompt}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Prompt Input Area */}
        <div className="mt-5 flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleStartRun(prompt)}
              placeholder="Instruct the Copilot (e.g., 'Check if buyer provided return tracking and calculate partial refund under policy')..."
              disabled={isLoading}
              className="w-full rounded-lg border border-line bg-surface-2 px-4 py-2.5 text-xs text-fg placeholder:text-faint focus:border-[var(--color-brand)] focus:outline-none"
            />
          </div>
          <Button
            onClick={() => handleStartRun(prompt)}
            disabled={isLoading || !prompt.trim()}
            className="flex items-center gap-2 text-xs"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Orchestrating...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Execute Copilot</span>
              </>
            )}
          </Button>
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
                  Human Approval Required (Risk: {pendingApproval.actionRisk})
                </span>
                <span className="text-[11px] text-faint font-mono">
                  SHA-256: {pendingApproval.argumentsHash.substring(0, 16)}...
                </span>
              </div>
              <h3 className="text-sm font-semibold text-fg mt-1">
                {pendingApproval.description}
              </h3>
              <p className="text-xs text-subtle mt-1">
                The agent proposes a financial resolution settlement. Under ResolveGraph safety policies, agents can never execute financial operations autonomously. Operator sign-off is required.
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
                    <span>Approve & Settle</span>
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

      {/* Main Execution View */}
      {activeRun ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Multi-Agent Step Trace */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="rg-card p-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-[var(--color-brand)]" />
                  <h3 className="text-sm font-semibold text-fg">Agent Execution Trace</h3>
                  <span className="font-mono text-[11px] text-faint">({activeRun.steps?.length || 0} steps)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    activeRun.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    activeRun.status === "WAITING_FOR_APPROVAL" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                    activeRun.status === "FAILED" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                    "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                  }`}>
                    {activeRun.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {/* Execution Steps Accordion */}
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

                          {/* Tool Invocations within Step */}
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
          </div>

          {/* Right Column: Produced Artifacts */}
          <div className="flex flex-col gap-4">
            <div className="rg-card p-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-sky-400" />
                  <h3 className="text-sm font-semibold text-fg">Draft Artifacts</h3>
                </div>
                <span className="text-[11px] font-mono text-faint">
                  {activeRun.artifacts?.length || 0} artifact(s)
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                {activeRun.artifacts && activeRun.artifacts.length > 0 ? (
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

                        {/* If Draft Message, allow preview and copy */}
                        {artifact.artifactType === "DRAFT_MESSAGE" && content.body && (
                          <div className="mt-1 rounded bg-[#090d16] p-2.5 border border-line-2 font-mono text-[11px] text-subtle whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {content.body}
                          </div>
                        )}

                        {/* If Draft Proposal, show financial badges */}
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
                    No artifacts produced yet for this run.
                  </div>
                )}
              </div>
            </div>

            {/* Run History Switcher */}
            {previousRuns.length > 1 && (
              <div className="rg-card p-4">
                <span className="text-[11px] font-semibold text-faint uppercase tracking-wider">
                  Previous Copilot Runs ({previousRuns.length}):
                </span>
                <div className="mt-2 flex flex-col gap-1.5">
                  {previousRuns.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => loadRunDetails(r.id)}
                      className={`flex items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition-colors ${
                        activeRun.id === r.id
                          ? "bg-amber-500/10 font-semibold text-amber-400"
                          : "text-subtle hover:bg-surface-2 hover:text-fg"
                      }`}
                    >
                      <span className="truncate max-w-[180px]">{r.title}</span>
                      <span className="text-[10px] font-mono text-faint">{r.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rg-card p-12 text-center">
          <Bot className="h-10 w-10 text-faint mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-fg">No Active Copilot Run</h3>
          <p className="text-xs text-subtle max-w-md mx-auto mt-1">
            Select one of the quick workflow buttons above or type a natural-language instruction to start the multi-agent orchestration.
          </p>
        </div>
      )}
    </div>
  );
}
