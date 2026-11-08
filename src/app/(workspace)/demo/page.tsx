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

export default function GuidedDemoPage() {
  const [currentStage, setCurrentStage] = useState(1);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

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
              <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-rose-300 border border-rose-500/30">
                LIVE PAYMENTS HARD-BLOCKED
              </span>
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/30">
                HACKATHON GUIDED WALKTHROUGH
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-fg">
              End-to-End Guided Demonstration Workspace
            </h1>
            <p className="mt-1 text-sm text-subtle">
              Simulate the complete 8-stage lifecycle: <strong>Purchase</strong> → <strong>PayPal Capture</strong> → <strong>Complaint</strong> → <strong>Evidence</strong> → <strong>BERR AI</strong> → <strong>Policy Grounding</strong> → <strong>Bilateral Agreement</strong> → <strong>Automated Refund</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              icon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Reset Scenario
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCompleteAll}
              disabled={isProcessing || completedStages.length === 8}
              icon={<Zap className="h-3.5 w-3.5 text-amber-400" />}
            >
              Simulate Entire Lifecycle
            </Button>
            <Link href="/cases/RG-1001">
              <Button
                variant="primary"
                size="sm"
                icon={<ExternalLink className="h-3.5 w-3.5" />}
              >
                Inspect Case RG-1001 Dossier
              </Button>
            </Link>
          </div>
        </div>
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
