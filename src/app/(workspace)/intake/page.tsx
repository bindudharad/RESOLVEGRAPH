"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  UploadCloud,
  FileCheck,
  AlertTriangle,
  FileText,
  Shield,
  Edit3,
  Check,
  X,
  RefreshCw,
  Sparkles,
  Video,
  Camera,
  CheckCircle2,
  Lock,
  Package,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/common/toast";

interface ExtractedField {
  id: string;
  fieldName: string;
  fieldValue: string;
  confidenceScore: number;
  confidenceTier: string;
  extractionMethod: string;
  isUserCorrected: boolean;
  correctedValue: string | null;
}

interface IntakeResult {
  evidence: {
    id: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    sha256Hash: string;
    extractionStatus: string;
  };
  extractions: ExtractedField[];
  isDuplicate: boolean;
  message: string;
}

interface CaseOption {
  id: string;
  caseNumber: string;
  title: string;
}

function UniversalIntakeContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialAction = searchParams.get("action");
  const initialPackageId = searchParams.get("packageId");

  const [intakeMode, setIntakeMode] = useState<"DOCUMENT" | "UNBOXING">(
    initialAction === "unbox" ? "UNBOXING" : "DOCUMENT"
  );

  const [cases, setCases] = useState<CaseOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [sourceType, setSourceType] = useState("UPI_APP");
  const [providerName, setProviderName] = useState("PhonePe");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editReason, setEditReason] = useState("");
  const [updatingField, setUpdatingField] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dual-Sight Unboxing State
  const [captureMode, setCaptureMode] = useState<"DUAL_STREAM_CONCURRENT" | "SEQUENTIAL_TOGGLE">("DUAL_STREAM_CONCURRENT");
  const [unboxingPackageId, setUnboxingPackageId] = useState(initialPackageId || "");
  const [unboxingSession, setUnboxingSession] = useState<{ id: string; sessionToken: string; status: string } | null>(null);
  const [unboxingChallenge, setUnboxingChallenge] = useState<{ challengeCode: string; expiresAt: string } | null>(null);
  const [isInitiatingSession, setIsInitiatingSession] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isCompletingSession, setIsCompletingSession] = useState(false);
  const [unboxingCompleted, setUnboxingCompleted] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch("/api/cases?limit=50")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.cases && mounted) {
          setCases(data.cases);
          setSelectedCaseId((prev) => prev || (data.cases.length > 0 ? data.cases[0].id : ""));
        }
      })
      .catch((err) => console.error("Failed to load cases:", err));
    return () => {
      mounted = false;
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }
    if (!selectedCaseId) {
      setError("Please select a target case for evidence ingestion.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caseId", selectedCaseId);
      formData.append("sourceType", sourceType);
      formData.append("providerName", providerName);

      const res = await fetch("/api/evidence/intake", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Evidence ingestion failed");
      }

      setResult(data);
      toast({
        tone: "success",
        title: "Evidence Ingested",
        description: `Stored in Evidence Vault (SHA-256: ${data.evidence.sha256Hash.slice(0, 10)}...).`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Evidence intake failed";
      setError(msg);
      toast({ tone: "error", title: "Ingestion Failed", description: msg });
    } finally {
      setUploading(false);
    }
  };

  const startEditField = (field: ExtractedField) => {
    setEditingFieldId(field.id);
    setEditValue(field.correctedValue || field.fieldValue);
    setEditReason("Human audit verification");
  };

  const saveFieldCorrection = async (fieldId: string) => {
    setUpdatingField(true);
    try {
      const res = await fetch(`/api/evidence/extractions/${fieldId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correctedValue: editValue,
          correctionReason: editReason || "Verified by investigator",
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save correction");
      }

      const updated = await res.json();

      // Update local state
      if (result) {
        setResult({
          ...result,
          extractions: result.extractions.map((f) =>
            f.id === fieldId
              ? {
                  ...f,
                  isUserCorrected: true,
                  correctedValue: updated.extraction.correctedValue,
                  confidenceTier: updated.extraction.confidenceTier,
                  confidenceScore: updated.extraction.confidenceScore,
                }
              : f,
          ),
        });
      }
      setEditingFieldId(null);
      toast({
        tone: "success",
        title: "Field Corrected",
        description: "Calibration weight updated and logged to audit ledger.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Correction failed";
      toast({ tone: "error", title: "Update Failed", description: msg });
    } finally {
      setUpdatingField(false);
    }
  };

  const loadDemoSample = (type: "PAYPAL" | "UPI") => {
    if (type === "PAYPAL") {
      setSourceType("PAYMENT_GATEWAY");
      setProviderName("PayPal");
      const sampleText = JSON.stringify(
        {
          provider: "PayPal",
          transaction_id: "CAPTURE-9988112233",
          amount: 49.99,
          currency: "USD",
          status: "COMPLETED",
          reference_id: "ORD-RG-2026-X19",
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      );
      const blob = new Blob([sampleText], { type: "application/json" });
      const sampleFile = new File([blob], "paypal_sandbox_capture_receipt.json", {
        type: "application/json",
      });
      setFile(sampleFile);
    } else {
      setSourceType("UPI_APP");
      setProviderName("PhonePe");
      const sampleCsv = `Date,UPI_Ref_No,Provider,Amount,Status,Beneficiary_VPA\n2026-11-08 09:30:15,UPI412399081234,PhonePe,1299.00,SUCCESS,merchant@okhdfcbank`;
      const blob = new Blob([sampleCsv], { type: "text/csv" });
      const sampleFile = new File([blob], "phonepe_upi_debit_statement.csv", {
        type: "text/csv",
      });
      setFile(sampleFile);
    }
  };

  // Dual-Sight Unboxing Actions
  const handleInitiateUnboxing = async () => {
    setIsInitiatingSession(true);
    setError(null);
    try {
      const res = await fetch("/api/unboxing/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: selectedCaseId || undefined,
          packageId: unboxingPackageId || undefined,
          captureMode,
          deviceInfo: "Chrome Browser / CameraX Web Emulator",
          isFrontOptionalAccepted: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate session");

      setUnboxingSession(data.session);
      setUnboxingChallenge(data.challenge);
      setUnboxingCompleted(false);
      toast({
        tone: "success",
        title: "Dual-Sight Session Initiated",
        description: `Present 6-digit challenge [${data.challenge.challengeCode}] in video frame.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Session error";
      setError(msg);
      toast({ tone: "error", title: "Initiation Failed", description: msg });
    } finally {
      setIsInitiatingSession(false);
    }
  };

  const handleSimulateVideoUpload = async () => {
    if (!unboxingSession) return;
    setIsUploadingVideo(true);
    try {
      // Simulate/upload an unboxing video chunk
      const mockVideoBlob = new Blob(["MOCK_DUAL_SIGHT_VIDEO_STREAM_DATA_WITH_SEAL_HASH"], { type: "video/mp4" });
      const mockVideoFile = new File([mockVideoBlob], "unboxing_session_stream.mp4", { type: "video/mp4" });

      const formData = new FormData();
      formData.append("chunk", mockVideoFile);
      formData.append("chunkIndex", "0");
      formData.append("totalChunks", "1");

      const res = await fetch(`/api/unboxing/sessions/${unboxingSession.sessionToken}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to upload video chunk");
      }

      toast({
        tone: "success",
        title: "Dual-Sight Stream Uploaded",
        description: "Reassembled and cryptographically hashed in Evidence Vault.",
      });
    } catch (e: unknown) {
      toast({ tone: "error", title: "Upload Failed", description: e instanceof Error ? e.message : "Upload error" });
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleCompleteUnboxing = async () => {
    if (!unboxingSession) return;
    setIsCompletingSession(true);
    try {
      const res = await fetch(`/api/unboxing/sessions/${unboxingSession.sessionToken}/complete`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete unboxing session");

      setUnboxingCompleted(true);
      toast({
        tone: "success",
        title: "Unboxing Session Completed",
        description: "Tamper seal verified. Evidence securely bound to case record.",
      });
    } catch (e: unknown) {
      toast({ tone: "error", title: "Completion Failed", description: e instanceof Error ? e.message : "Completion error" });
    } finally {
      setIsCompletingSession(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-fg">
              Universal Evidence &amp; Verification Intake
            </h1>
            <Badge tone="brand">Module 02 &amp; 10</Badge>
          </div>
          <p className="text-sm text-muted">
            Ingest and verify raw bank statements, payment receipts, UPI confirmations, and CameraX Dual-Sight unboxing video streams with bitwise SHA-256 fingerprinting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {intakeMode === "DOCUMENT" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDemoSample("PAYPAL")}
                className="text-xs"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Load PayPal Sample
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDemoSample("UPI")}
                className="text-xs"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                Load UPI Statement Sample
              </Button>
            </>
          ) : (
            <Badge tone="brand">Hardware Verification Ready</Badge>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-3 border-b border-line pb-3">
        <button
          type="button"
          onClick={() => setIntakeMode("DOCUMENT")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
            intakeMode === "DOCUMENT"
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              : "text-muted hover:bg-surface-2 hover:text-fg border border-transparent"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Document &amp; Payment Statement Intake</span>
        </button>
        <button
          type="button"
          onClick={() => setIntakeMode("UNBOXING")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
            intakeMode === "UNBOXING"
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              : "text-muted hover:bg-surface-2 hover:text-fg border border-transparent"
          }`}
        >
          <Video className="h-4 w-4" />
          <span>Dual-Sight Unboxing Verification (CameraX)</span>
          <Badge tone="info" className="ml-1 text-[10px]">6-Digit Challenge</Badge>
        </button>
      </div>

      {intakeMode === "DOCUMENT" ? (
        /* Document & Statement Intake Grid */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Form */}
          <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm lg:col-span-1">
            <h2 className="text-base font-semibold text-fg mb-4 flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-primary" />
              Evidence Parameters
            </h2>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Attach to Case
                </label>
                <select
                  aria-label="Select Target Case"
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {cases.length === 0 ? (
                    <option value="">Loading cases...</option>
                  ) : (
                    cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.caseNumber} - {c.title.slice(0, 35)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Source Type
                </label>
                <select
                  aria-label="Select Source Type"
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="UPI_APP">UPI App (PhonePe / GPay / Paytm)</option>
                  <option value="NET_BANKING">Net Banking / Bank Statement</option>
                  <option value="CARD_STATEMENT">Credit/Debit Card Statement</option>
                  <option value="PAYMENT_GATEWAY">Payment Gateway Capture (PayPal / Stripe)</option>
                  <option value="MERCHANT_INVOICE">Merchant Invoice / Order Detail</option>
                  <option value="EMAIL_CONFIRMATION">Email Confirmation / Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Provider / Entity Name
                </label>
                <Input
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="e.g., PhonePe, HDFC Bank, PayPal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Evidence File (PDF, PNG, JPG, CSV, JSON)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.csv,.json,.txt"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-surface-3 file:text-fg hover:file:bg-surface-2 cursor-pointer border border-border rounded-md p-1.5 bg-surface-2"
                />
                {file && (
                  <p className="mt-1.5 text-xs text-muted flex items-center gap-1">
                    <FileText className="h-3 w-3 text-primary" />
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {error && (
                <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={uploading || !file || !selectedCaseId}
                className="w-full"
                size="md"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Extracting &amp; Validating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Ingest &amp; Verify Evidence
                  </span>
                )}
              </Button>
            </form>
          </div>

          {/* Right Column: Ingestion Result & Extraction Inspection */}
          <div className="lg:col-span-2">
            {result ? (
              <div className="space-y-6">
                {/* File Hash & Status Summary */}
                <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-emerald-400" />
                        <h3 className="text-base font-semibold text-fg">
                          {result.evidence.fileName}
                        </h3>
                        {result.isDuplicate && (
                          <Badge tone="warning">Duplicate Content Flagged</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-1 font-mono">
                        SHA-256: {result.evidence.sha256Hash}
                      </p>
                    </div>
                    <Badge tone="success" className="self-start md:self-auto">
                      {result.evidence.extractionStatus}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted block">File Size</span>
                      <span className="font-mono text-fg font-medium">
                        {(result.evidence.fileSizeBytes / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div>
                      <span className="text-muted block">MIME Header</span>
                      <span className="font-mono text-fg font-medium">
                        {result.evidence.mimeType}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted block">Fields Extracted</span>
                      <span className="font-mono text-fg font-medium">
                        {result.extractions.length} calibrated
                      </span>
                    </div>
                    <div>
                      <span className="text-muted block">Vault ID</span>
                      <span className="font-mono text-primary font-medium">
                        {result.evidence.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                </div>

                {/* Calibrated Field Extractions & User Correction */}
                <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-fg">
                        Extracted Forensic Fields &amp; Confidence Calibration
                      </h4>
                      <p className="text-xs text-muted">
                        Review machine extractions. High/Medium confidence fields are auto-correlated; low confidence items require manual confirmation.
                      </p>
                    </div>
                  </div>

                  {result.extractions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted">
                      No key-value forensic facts detected in this format. File preserved bitwise in vault.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {result.extractions.map((field) => (
                        <div
                          key={field.id}
                          className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 min-w-[200px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-fg font-mono">
                                {field.fieldName}
                              </span>
                              {field.isUserCorrected && (
                                <Badge tone="brand" className="text-[10px] py-0 px-1">
                                  User Verified
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-muted block">
                              Method: {field.extractionMethod}
                            </span>
                          </div>

                          <div className="flex-1">
                            {editingFieldId === field.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="h-8 text-xs font-mono"
                                  autoFocus
                                />
                                <Input
                                  placeholder="Reason for correction"
                                  value={editReason}
                                  onChange={(e) => setEditReason(e.target.value)}
                                  className="h-7 text-[11px]"
                                />
                              </div>
                            ) : (
                              <div className="font-mono font-medium text-fg bg-surface-2 px-2.5 py-1.5 rounded border border-border inline-block">
                                {field.correctedValue || field.fieldValue}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              tone={
                                field.confidenceTier === "HIGH"
                                  ? "success"
                                  : field.confidenceTier === "MEDIUM"
                                  ? "info"
                                  : "warning"
                              }
                            >
                              {(field.confidenceScore * 100).toFixed(0)}% {field.confidenceTier}
                            </Badge>

                            {editingFieldId === field.id ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => saveFieldCorrection(field.id)}
                                  disabled={updatingField}
                                  className="h-8 text-xs"
                                >
                                  {updatingField ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingFieldId(null)}
                                  className="h-8 text-xs"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditField(field)}
                                className="text-xs h-7"
                              >
                                <Edit3 className="mr-1 h-3 w-3" />
                                Correct / Verify
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-1 p-8 text-center">
                <FileCheck className="h-12 w-12 text-muted mb-3 opacity-40" />
                <h3 className="text-sm font-semibold text-fg">No Evidence Ingested Yet</h3>
                <p className="text-xs text-muted max-w-sm mt-1">
                  Upload a payment receipt, bank statement, or gateway capture JSON/CSV on the left to inspect extraction confidence and cryptographic verification.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Dual-Sight Unboxing Verification Grid (Module 10) */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Session Configuration */}
          <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm lg:col-span-1">
            <h2 className="text-base font-semibold text-fg mb-4 flex items-center gap-2">
              <Camera className="h-5 w-5 text-amber-400" />
              Unboxing Session Setup
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Target Case
                </label>
                <select
                  aria-label="Select Target Case"
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNumber} - {c.title.slice(0, 35)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Package Passport Token / ID
                </label>
                <Input
                  value={unboxingPackageId}
                  onChange={(e) => setUnboxingPackageId(e.target.value)}
                  placeholder="PKG-PASSPORT-2026-9921 or ID"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Camera Recording Capability
                </label>
                <Select
                  value={captureMode}
                  onChange={(e) => setCaptureMode(e.target.value as "DUAL_STREAM_CONCURRENT" | "SEQUENTIAL_TOGGLE")}
                >
                  <option value="DUAL_STREAM_CONCURRENT">Concurrent Dual-Camera (Front Face + Rear Package)</option>
                  <option value="SEQUENTIAL_TOGGLE">Sequential Fallback (Toggle Rear Seal / Front Face)</option>
                </Select>
                <p className="mt-1 text-[11px] text-faint">
                  Hardware detector will automatically fallback to sequential mode if OEM concurrent recording is unsupported.
                </p>
              </div>

              <Button
                size="md"
                className="w-full"
                onClick={handleInitiateUnboxing}
                disabled={isInitiatingSession}
              >
                {isInitiatingSession ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating Challenge...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Initiate Dual-Sight Session
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Right Column: Active Verification Session Screen */}
          <div className="lg:col-span-2">
            {unboxingSession && unboxingChallenge ? (
              <div className="space-y-6">
                {/* Dynamic 6-Digit Challenge Card */}
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-md relative overflow-hidden text-[var(--ink)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-amber-400" />
                        <h3 className="text-base font-bold text-fg">
                          Cryptographic Dynamic Challenge
                        </h3>
                        <Badge tone="brand">Expires in 30m</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        Hold this 6-digit code in the camera frame while unboxing to prove temporal freshness and prevent replay fraud.
                      </p>
                    </div>

                    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-5 py-3 text-center">
                      <span className="text-xs uppercase tracking-widest text-faint block">Challenge Code</span>
                      <span className="text-3xl font-mono font-bold tracking-widest text-amber-400">
                        {unboxingChallenge.challengeCode}
                      </span>
                    </div>
                  </div>

                  {/* Dual Stream Video Emulator */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-line bg-black/60 p-4 text-center flex flex-col items-center justify-center min-h-[160px]">
                      <Video className="h-8 w-8 text-sky-400 mb-2 opacity-80" />
                      <span className="text-xs font-semibold text-fg">Front Camera (Buyer Presence)</span>
                      <span className="text-[11px] text-faint mt-0.5">Biometric Continuity Stream</span>
                      <span className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-mono text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        STREAM ACTIVE
                      </span>
                    </div>

                    <div className="rounded-lg border border-line bg-black/60 p-4 text-center flex flex-col items-center justify-center min-h-[160px]">
                      <Package className="h-8 w-8 text-amber-400 mb-2 opacity-80" />
                      <span className="text-xs font-semibold text-fg">Rear Camera (Package &amp; Seal)</span>
                      <span className="text-[11px] text-faint mt-0.5">dHash Perceptual Inspection</span>
                      <span className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-mono text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        SEAL IN FRAME
                      </span>
                    </div>
                  </div>

                  {/* Session Action Controls */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4">
                    <div className="text-xs font-mono text-faint">
                      Session Token: <code className="text-fg">{unboxingSession.sessionToken.slice(0, 16)}...</code>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSimulateVideoUpload}
                        disabled={isUploadingVideo || unboxingCompleted}
                      >
                        {isUploadingVideo ? "Uploading..." : "Upload Stream Chunks"}
                      </Button>

                      <Button
                        size="sm"
                        onClick={handleCompleteUnboxing}
                        disabled={isCompletingSession || unboxingCompleted}
                        className={unboxingCompleted ? "bg-emerald-600 hover:bg-emerald-600" : ""}
                      >
                        {isCompletingSession ? (
                          "Verifying..."
                        ) : unboxingCompleted ? (
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Session Completed
                          </span>
                        ) : (
                          "Complete & Seal Unboxing"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {unboxingCompleted && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-xs text-emerald-300 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-fg text-sm">Unboxing Verification Cryptographically Certified</h4>
                      <p className="mt-1 leading-relaxed text-emerald-200/90">
                        The video recording, challenge presence, and physical seal dHash have been validated and bound to the case. This evidence is immutable and available for BERR bilateral reasoning.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-1 p-8 text-center">
                <Camera className="h-12 w-12 text-muted mb-3 opacity-40" />
                <h3 className="text-sm font-semibold text-fg">No Active Unboxing Session</h3>
                <p className="text-xs text-muted max-w-sm mt-1">
                  Select a target case on the left and click &quot;Initiate Dual-Sight Session&quot; to generate your 6-digit challenge and begin recording unboxing evidence.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UniversalIntakePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px] text-muted text-sm">
          Loading universal intake workspace...
        </div>
      }
    >
      <UniversalIntakeContent />
    </Suspense>
  );
}
