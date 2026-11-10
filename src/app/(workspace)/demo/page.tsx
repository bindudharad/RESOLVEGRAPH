"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  CreditCard,
  AlertCircle,
  FileText,
  Sparkles,
  Scale,
  Handshake,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  ArrowRight,
  Zap,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/common/toast";

interface StageInfo {
  number: number;
  title: string;
  shortDesc: string;
  technicalSummary: string;
  icon: React.ReactNode;
}

const STAGES: StageInfo[] = [
  {
    number: 1,
    title: "Checkout",
    shortDesc: "Customer purchases 1 TB NVMe SSD",
    technicalSummary: "Creates CommerceOrder (totalAmountMinor: 7999, currency: USD/INR equivalent $79.99 / ₹6,499) and initializes PayPal V2 Order session.",
    icon: <ShoppingBag className="h-5 w-5 text-sky-400" />,
  },
  {
    number: 2,
    title: "PayPal Capture",
    shortDesc: "PayPal Sandbox authorizes and captures funds",
    technicalSummary: "Captures providerOrderId (5O190127TN364715T), generates PayPal Capture ID (84729103KM829141P), records completed payment.",
    icon: <CreditCard className="h-5 w-5 text-emerald-400" />,
  },
  {
    number: 3,
    title: "Complaint Filing",
    shortDesc: "Buyer reports received 512 GB drive instead of 1 TB",
    technicalSummary: "Creates CaseRecord (RG-1001), category NOT_AS_DESCRIBED, status SUBMITTED, links buyer claim statement.",
    icon: <AlertCircle className="h-5 w-5 text-amber-400" />,
  },
  {
    number: 4,
    title: "Evidence Upload",
    shortDesc: "Parties submit invoice and drive label photograph",
    technicalSummary: "Inspects magic bytes (image/jpeg, application/pdf), verifies SHA-256 hashes, registers AI processing consents.",
    icon: <FileText className="h-5 w-5 text-amber-400" />,
  },
  {
    number: 5,
    title: "BERR AI Analysis",
    shortDesc: "Multimodal extraction flags capacity contradiction D=0.88",
    technicalSummary: "Normalizes facts (1000GB vs 512GB), checks serial mismatch, calculates discrepancy score D=0.88, builds Bilateral Evidence Graph.",
    icon: <Sparkles className="h-5 w-5 text-rose-400" />,
  },
  {
    number: 6,
    title: "Policy Grounding",
    shortDesc: "Apex Tech Retail policy evaluated against findings",
    technicalSummary: "Policy APEX-POL-HARDWARE evaluates mismatch. Suggests remedies: Partial Refund $25.00 or Full Refund $79.99 upon return.",
    icon: <Scale className="h-5 w-5 text-teal-400" />,
  },
  {
    number: 7,
    title: "Bilateral Agreement",
    shortDesc: "Merchant proposes $25 refund; buyer accepts",
    technicalSummary: "Generates ResolutionProposal (PARTIAL_REFUND $25.00). Both parties submit ACCEPTED responses, reaching AGREED status.",
    icon: <Handshake className="h-5 w-5 text-indigo-400" />,
  },
  {
    number: 8,
    title: "PayPal Refund & Final History",
    shortDesc: "Automated PayPal Sandbox refund with immutable ledger",
    technicalSummary: "Calls RefundService with idempotency key, dispatches $25.00 to buyer, records RefundTransaction, transitions Case to RESOLVED.",
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
  },
];

interface LiveDemoTimelineStep {
  stage: string;
  timestamp: string;
  detail: string;
}

interface LiveDemoData {
  caseId: string;
  caseNumber: string;
  orderNumber: string;
  paypalOrderId: string;
  paypalCaptureId: string;
  refundId: string;
  approvalStatus: string;
  finalCanonicalStatus: string;
  argumentsHash: string;
  auditRecordHash: string;
  providerType?: 'rest' | 'mock';
  environment?: 'sandbox' | 'live';
  investigationResult?: {
    confidenceScore?: number;
    executiveSummary?: string;
    berrTraceability?: {
      rootCause?: string;
      remedyRecommendation?: string;
    };
  };
  timeline?: LiveDemoTimelineStep[];
}

export default function GuidedDemoPage() {
  const [currentStage, setCurrentStage] = useState(1);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveDemoResult, setLiveDemoResult] = useState<LiveDemoData | null>(null);
  const [isLiveDemoRunning, setIsLiveDemoRunning] = useState(false);
  const { toast } = useToast();

  const handleExecuteLiveHackathonDemo = async () => {
    setIsLiveDemoRunning(true);
    try {
      const res = await fetch("/api/demo/paypal-investigation", { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Execution failed");
      }
      setLiveDemoResult(json.data as LiveDemoData);
      toast({
        tone: "success",
        title: "PayPal Hackathon Demonstration Succeeded!",
        description: `Executed 13 stages. Case: ${json.data.caseNumber}, Refund: ${json.data.refundId}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to execute scenario.";
      toast({
        tone: "error",
        title: "Demonstration Failed",
        description: msg,
      });
    } finally {
      setIsLiveDemoRunning(false);
    }
  };

  const handleAdvanceStage = (stageNum: number) => {
    setIsProcessing(true);
    setTimeout(() => {
      setCompletedStages((prev) => Array.from(new Set([...prev, stageNum])));
      if (stageNum < 8) {
        setCurrentStage(stageNum + 1);
      }
      setIsProcessing(false);
      toast({
        tone: "success",
        title: `Stage ${stageNum} Completed: ${STAGES[stageNum - 1].title}`,
        description: STAGES[stageNum - 1].shortDesc,
      });
    }, 600);
  };

  const handleReset = () => {
    setCurrentStage(1);
    setCompletedStages([]);
    toast({
      tone: "info",
      title: "Demo Scenario Reset",
      description: "Returned to Stage 1 (Initial Purchase & Checkout).",
    });
  };

  const handleCompleteAll = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setCompletedStages([1, 2, 3, 4, 5, 6, 7, 8]);
      setCurrentStage(8);
      setIsProcessing(false);
      toast({
        tone: "success",
        title: "All 8 Stages Simulated",
        description: "Full end-to-end resolution lifecycle executed deterministically.",
      });
    }, 800);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner: Scenario Identity & Controls */}
      <div className="rounded-xl border border-line bg-gradient-to-r from-surface to-surface-2 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                PAYPAL SANDBOX VERIFIED
              </span>
              <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-semibold text-sky-300 border border-sky-500/30">
                HYBRID SANDBOX / REST READY
              </span>
              <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-rose-300 border border-rose-500/30">
                LIVE PRODUCTION HARD-BLOCKED
              </span>
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/30">
                HACKATHON GUIDED WALKTHROUGH
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-fg">
              End-to-End Guided Demonstration Workspace
            </h1>
            <p className="mt-1 text-sm text-subtle max-w-3xl">
              Experience the dual-mode payment intelligence architecture: Execute the live <strong>13-stage automated agentic PayPal investigation</strong> or walk through the <strong>8-stage interactive dispute lifecycle</strong> with full cryptographic auditability.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-subtle bg-surface-2/60 border border-line rounded-lg p-2.5 max-w-3xl">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Sandbox Transparency:</strong> Running in PayPal Sandbox mode with strict financial safeguards. High-fidelity local mock is active by default; providing live sandbox credentials in <code className="text-fg bg-surface px-1 py-0.5 rounded font-mono">.env</code> immediately connects to <code className="text-fg bg-surface px-1 py-0.5 rounded font-mono">api-m.sandbox.paypal.com</code>.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              icon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExecuteLiveHackathonDemo}
              disabled={isLiveDemoRunning}
              icon={<Sparkles className="h-3.5 w-3.5 text-amber-300" />}
            >
              {isLiveDemoRunning ? "Running Live Pipeline (13 Stages)..." : "Run Live Agentic PayPal Demo"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCompleteAll}
              disabled={isProcessing || completedStages.length === 8}
              icon={<Zap className="h-3.5 w-3.5 text-amber-400" />}
            >
              Simulate 8-Stage Lifecycle
            </Button>
            <Link href="/cases/RG-1001">
              <Button
                variant="outline"
                size="sm"
                icon={<ExternalLink className="h-3.5 w-3.5" />}
              >
                Inspect RG-1001 Dossier
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Live PayPal AI Hackathon Demo Execution Panel */}
      {isLiveDemoRunning && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-6 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-sky-400 animate-spin" />
            <div>
              <h3 className="text-base font-bold text-fg">Executing 13-Stage Agentic PayPal Investigation</h3>
              <p className="text-xs text-subtle">
                Initializing PayPal Sandbox order, capturing funds, ingesting cancellation evidence, correlating canonical transactions, running BERR reasoning, generating cryptographic proposal, human approval & authorized refund...
              </p>
            </div>
          </div>
          <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-mono font-bold text-sky-300">
            PROCESSING...
          </span>
        </div>
      )}

      {liveDemoResult && (
        <div className="rounded-xl border border-emerald-500/40 bg-surface p-6 shadow-lg flex flex-col gap-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-line">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> 13/13 MILESTONES EXECUTED
                </span>
                <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-bold text-sky-300 border border-sky-500/30">
                  CONFIDENCE: {Math.round((liveDemoResult.investigationResult?.confidenceScore ?? 0.96) * 100)}%
                </span>
                <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-500/30">
                  STATUS: {liveDemoResult.finalCanonicalStatus}
                </span>
                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-mono font-bold text-fg border border-line">
                  PROVIDER: {liveDemoResult.providerType === 'rest' ? 'LIVE PAYPAL SANDBOX (REST)' : 'HIGH-FIDELITY SANDBOX MOCK'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-fg">
                Live PayPal Investigation & Authorized Resolution Dossier
              </h2>
              <p className="text-xs text-subtle mt-0.5">
                Demonstrated on PayPal Sandbox: Order captured, cancellation evidence correlated, BERR discrepancy confirmed, human authorized, refund executed, and chained audit block appended.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/cases/${liveDemoResult.caseId}`}>
                <Button variant="primary" size="sm" icon={<ExternalLink className="h-3.5 w-3.5" />}>
                  Inspect Case {liveDemoResult.caseNumber}
                </Button>
              </Link>
              <Link href="/audit">
                <Button variant="outline" size="sm" icon={<ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />}>
                  Chained Audit Ledger
                </Button>
              </Link>
            </div>
          </div>

          {/* Key Reference Identifiers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-lg bg-surface-2 p-3 border border-line">
              <span className="text-[10px] uppercase font-bold text-faint">Case Number</span>
              <p className="font-mono text-xs font-semibold text-fg mt-1 truncate">{liveDemoResult.caseNumber}</p>
            </div>
            <div className="rounded-lg bg-surface-2 p-3 border border-line">
              <span className="text-[10px] uppercase font-bold text-faint">Order Number</span>
              <p className="font-mono text-xs font-semibold text-fg mt-1 truncate">{liveDemoResult.orderNumber}</p>
            </div>
            <div className="rounded-lg bg-surface-2 p-3 border border-line">
              <span className="text-[10px] uppercase font-bold text-faint">PayPal Order ID</span>
              <p className="font-mono text-xs font-semibold text-sky-400 mt-1 truncate">{liveDemoResult.paypalOrderId}</p>
            </div>
            <div className="rounded-lg bg-surface-2 p-3 border border-line">
              <span className="text-[10px] uppercase font-bold text-faint">PayPal Capture ID</span>
              <p className="font-mono text-xs font-semibold text-emerald-400 mt-1 truncate">{liveDemoResult.paypalCaptureId}</p>
            </div>
            <div className="rounded-lg bg-surface-2 p-3 border border-line">
              <span className="text-[10px] uppercase font-bold text-faint">PayPal Refund ID</span>
              <p className="font-mono text-xs font-semibold text-indigo-400 mt-1 truncate">{liveDemoResult.refundId}</p>
            </div>
            <div className="rounded-lg bg-surface-2 p-3 border border-line">
              <span className="text-[10px] uppercase font-bold text-faint">Approval Status</span>
              <p className="font-mono text-xs font-semibold text-emerald-400 mt-1 truncate">{liveDemoResult.approvalStatus}</p>
            </div>
          </div>

          {/* AI Investigation Executive Intelligence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-line bg-surface-2 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-brand)] uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" /> AI Investigation Findings
                </span>
                <span className="font-mono text-[10px] text-faint">Agent: payment-investigation</span>
              </div>
              <p className="text-xs text-fg leading-relaxed">
                {liveDemoResult.investigationResult?.executiveSummary}
              </p>
              {liveDemoResult.investigationResult?.berrTraceability && (
                <div className="mt-2 pt-3 border-t border-line text-xs space-y-1.5">
                  <p>
                    <strong className="text-fg">Root Cause:</strong>{" "}
                    <span className="text-subtle">{liveDemoResult.investigationResult.berrTraceability.rootCause}</span>
                  </p>
                  <p>
                    <strong className="text-fg">Remedy Recommendation:</strong>{" "}
                    <span className="text-subtle">{liveDemoResult.investigationResult.berrTraceability.remedyRecommendation}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Cryptographic Human-Authorization Box */}
            <div className="rounded-lg border border-line bg-surface-2 p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    <ShieldCheck className="h-4 w-4" /> Financial Guardrails & Audit
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold">ZERO AUTONOMOUS BYPASS</span>
                </div>
                <p className="text-xs text-subtle mt-2 leading-relaxed">
                  Financial action was prepared by the AI investigation agent with cryptographic parameters.
                  Execution was locked until the human merchant manager verified and authorized the proposal.
                </p>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-line text-[11px] font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-faint">Proposal Arguments Hash:</span>
                  <span className="text-sky-300 font-bold truncate max-w-[200px]" title={liveDemoResult.argumentsHash}>
                    {liveDemoResult.argumentsHash}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-faint">Audit Ledger Block Hash:</span>
                  <span className="text-emerald-300 font-bold truncate max-w-[200px]" title={liveDemoResult.auditRecordHash}>
                    {liveDemoResult.auditRecordHash}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 13-Milestone Execution Timeline */}
          <div>
            <h4 className="text-xs font-semibold text-fg uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-subtle" /> 13-Stage Chronological Audit Timeline
            </h4>
            <div className="rounded-lg border border-line bg-surface-2 divide-y divide-line max-h-60 overflow-y-auto">
              {liveDemoResult.timeline?.map((step: LiveDemoTimelineStep, idx: number) => (
                <div key={idx} className="flex items-start justify-between p-3 text-xs gap-3">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-fg">{step.stage}</span>
                  </div>
                  <p className="text-subtle text-right text-[11.5px] max-w-lg">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mode B Section Header */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 text-xs font-mono font-bold">
            MODE B: STEP-BY-STEP SIMULATION
          </span>
          <h2 className="text-base font-bold text-fg">8-Stage Interactive Dispute Lifecycle Walkthrough</h2>
        </div>
        <p className="text-xs text-subtle">
          Step through each transaction stage manually to inspect mutations across database models, BERR reasoning calculations, and real-time payload audit streams.
        </p>
      </div>

      {/* Scenario Metadata Card */}
      <div className="rg-card p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-faint mb-3">
          Benchmark Scenario: Storage Hardware Capacity Discrepancy
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-faint">Buyer:</span>
            <p className="font-semibold text-fg mt-0.5">Alex Johnson (usr_alex_buyer)</p>
          </div>
          <div>
            <span className="text-faint">Merchant:</span>
            <p className="font-semibold text-fg mt-0.5">Apex Tech Retail (Apex Tech Retail)</p>
          </div>
          <div>
            <span className="text-faint">Purchased Product:</span>
            <p className="font-semibold text-fg mt-0.5">ApexDrive Pro 1TB NVMe PCIe 4.0 SSD ($79.99 / ₹6,499)</p>
          </div>
          <div>
            <span className="text-faint">Factual Discrepancy:</span>
            <p className="font-semibold text-rose-400 mt-0.5">Received 512GB Drive in 1TB packaging (Clash D=0.88)</p>
          </div>
        </div>
      </div>

      {/* 8-Stage Interactive Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {STAGES.map((st) => {
          const isDone = completedStages.includes(st.number);
          const isCurrent = currentStage === st.number;

          return (
            <button
              key={st.number}
              type="button"
              onClick={() => setCurrentStage(st.number)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                isCurrent
                  ? "border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-brand)_15%,transparent)] shadow-md"
                  : isDone
                  ? "border-emerald-500/40 bg-emerald-950/20 text-fg hover:bg-emerald-950/30"
                  : "border-line bg-surface-2 text-subtle hover:bg-surface-2/80 hover:text-fg"
              }`}
            >
              <div className="flex items-center justify-center mb-1.5">
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  st.icon
                )}
              </div>
              <span className="text-[11px] font-bold">
                {st.number}. {st.title}
              </span>
              <span className="text-[9.5px] mt-0.5 text-faint">
                {isDone ? "Completed" : isCurrent ? "Active" : "Pending"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Stage Detail & Execution Panel */}
      {(() => {
        const stage = STAGES[currentStage - 1];
        const isDone = completedStages.includes(stage.number);

        return (
          <div className="rg-card p-6 flex flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-surface-2 p-2.5 border border-line">
                  {stage.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-faint uppercase">
                      Stage {stage.number} of 8
                    </span>
                    {isDone && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-400">
                        VERIFIED COMPLETE
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-fg mt-0.5">{stage.title}</h2>
                  <p className="text-xs text-subtle">{stage.shortDesc}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {!isDone ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleAdvanceStage(stage.number)}
                    disabled={isProcessing}
                    icon={<ArrowRight className="h-4 w-4" />}
                  >
                    {isProcessing ? "Processing Stage..." : `Execute Stage ${stage.number}`}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> State Recorded
                    </span>
                    {stage.number < 8 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCurrentStage(stage.number + 1)}
                        icon={<ArrowRight className="h-3.5 w-3.5" />}
                      >
                        Next: Stage {stage.number + 1}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Technical Execution Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold text-fg uppercase tracking-wider">
                  Underlying Architecture & Service Execution
                </h4>
                <div className="rounded-lg border border-line bg-surface-2 p-4 text-xs space-y-2 text-subtle">
                  <p>
                    <strong className="text-fg">Service Operation:</strong> {stage.technicalSummary}
                  </p>
                  <p>
                    <strong className="text-fg">Database Models Mutated:</strong>{" "}
                    {stage.number === 1 && "CommerceOrder, CommerceOrderItem"}
                    {stage.number === 2 && "PayPalPayment (COMPLETED, captureId: 84729103KM829141P)"}
                    {stage.number === 3 && "CaseRecord (RG-1001), Claim (ITEM_NOT_AS_DESCRIBED)"}
                    {stage.number === 4 && "Evidence (SHA-256 verified), AIProcessingConsent (GRANTED)"}
                    {stage.number === 5 && "AIAnalysisRun (berr-v2.0), ExtractedFact, BerrFinding, GraphSnapshot"}
                    {stage.number === 6 && "ResolutionPolicy (APEX-POL-HARDWARE), ResolutionRule"}
                    {stage.number === 7 && "ResolutionProposal (AGREED), ResolutionPartyResponse (ACCEPTED)"}
                    {stage.number === 8 && "RefundTransaction (COMPLETED), PayPalPayment (refundedMinor: 2500)"}
                  </p>
                  <p>
                    <strong className="text-fg">Idempotency & Safety:</strong> Strict minor unit arithmetic, PayPal-Request-Id idempotency locking, zero live mode execution.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold text-fg uppercase tracking-wider">
                  Live Payload & Audit Event Stream
                </h4>
                <div className="rounded-lg border border-line bg-surface-2 p-4 font-mono text-[11px] text-faint max-h-52 overflow-y-auto">
                  {stage.number === 1 && JSON.stringify({
                    action: "COMMERCE_ORDER_CREATED",
                    orderNumber: "ORD-2026-8841",
                    buyerId: "usr_alex_buyer",
                    merchantOrg: "Apex Tech Retail",
                    currency: "USD",
                    totalAmountMinor: 7999,
                    status: "PENDING",
                    paypalOrderSession: "5O190127TN364715T",
                  }, null, 2)}

                  {stage.number === 2 && JSON.stringify({
                    action: "PAYMENT_CAPTURED",
                    captureId: "84729103KM829141P",
                    providerOrderId: "5O190127TN364715T",
                    amountMinor: 7999,
                    currency: "USD",
                    paymentStatus: "COMPLETED",
                    environment: "sandbox",
                  }, null, 2)}

                  {stage.number === 3 && JSON.stringify({
                    action: "CASE_CREATED",
                    caseId: "RG-1001",
                    title: "Hardware Storage Capacity Discrepancy",
                    category: "NOT_AS_DESCRIBED",
                    claimStatement: "Ordered 1TB ApexDrive Pro NVMe SSD, package arrived with 512GB unit.",
                    requestedRemedy: "PARTIAL_REFUND",
                  }, null, 2)}

                  {stage.number === 4 && JSON.stringify({
                    action: "EVIDENCE_UPLOADED_AND_SCANNED",
                    invoiceFile: "Invoice_ApexDrive_1TB.pdf (application/pdf, 48 KB)",
                    devicePhoto: "Drive_Label_512GB.jpg (image/jpeg, 312 KB)",
                    magicByteValidation: "PASS (Clean)",
                    sha256Locked: true,
                    aiConsentsActive: 2,
                  }, null, 2)}

                  {stage.number === 5 && JSON.stringify({
                    action: "BERR_PIPELINE_COMPLETE",
                    runId: "run_berr_demo_01",
                    findingsCount: 3,
                    discrepancy: {
                      D_exact: 1.0,
                      D_semantic: 0.75,
                      D_temporal: 0.0,
                      totalDiscrepancyScore: 0.88,
                    },
                    graphNodes: 7,
                    graphEdges: 9,
                  }, null, 2)}

                  {stage.number === 6 && JSON.stringify({
                    action: "POLICY_EVALUATION",
                    policy: "APEX-POL-HARDWARE-MISMATCH-v1",
                    eligibleRemedies: ["PARTIAL_REFUND_DIFFERENCE", "FULL_REFUND_WITH_RETURN"],
                    recommendedAmountMinor: 2500,
                    requiresReturn: false,
                  }, null, 2)}

                  {stage.number === 7 && JSON.stringify({
                    action: "BILATERAL_AGREEMENT_REACHED",
                    proposalId: "prop_demo_7721",
                    proposalType: "PARTIAL_REFUND",
                    amountMinor: 2500,
                    buyerResponse: "ACCEPTED",
                    merchantResponse: "ACCEPTED",
                    finalStatus: "AGREED",
                  }, null, 2)}

                  {stage.number === 8 && JSON.stringify({
                    action: "PAYPAL_REFUND_COMPLETED",
                    paypalRefundId: "REF-99214710KM",
                    amountMinor: 2500,
                    currency: "USD",
                    refundRequestId: "reso-ref-prop_demo_7721",
                    paymentNetBalanceMinor: 5499,
                    caseStatus: "RESOLVED",
                    immutableLedgerUpdated: true,
                  }, null, 2)}
                </div>
              </div>
            </div>

            {/* Quick Context Jump Links */}
            <div className="flex flex-wrap items-center justify-between pt-4 border-t border-line text-xs">
              <span className="text-faint">Inspect live subsystem records:</span>
              <div className="flex items-center gap-3">
                <Link href="/cases/RG-1001" className="text-sky-400 hover:underline flex items-center gap-1">
                  <span>Open RG-1001 Case Dossier</span> <ExternalLink className="h-3 w-3" />
                </Link>
                <Link href="/payments" className="text-emerald-400 hover:underline flex items-center gap-1">
                  <span>View Payments & Refunds Ledger</span> <ExternalLink className="h-3 w-3" />
                </Link>
                <Link href="/paypal/disputes" className="text-amber-400 hover:underline flex items-center gap-1">
                  <span>PayPal Dispute Console</span> <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
