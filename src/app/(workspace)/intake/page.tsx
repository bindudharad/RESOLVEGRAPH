"use client";

import { useEffect, useState, useRef } from "react";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

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

export default function UniversalIntakePage() {
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Evidence intake failed";
      setError(msg);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Correction failed";
      alert(msg);
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

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-fg">
              Universal Payment Evidence Intake
            </h1>
            <Badge tone="brand">Multi-Format Forensic Intake</Badge>
          </div>
          <p className="text-sm text-muted">
            Ingest and verify raw bank statements, payment receipts, UPI confirmations, and gateway captures with automated SHA-256 fingerprinting and calibrated field extraction.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Upload & Config Grid */}
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
                Provider Name
              </label>
              <Input
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="e.g., PhonePe, HDFC Bank, PayPal"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Evidence Document
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface-2/40 p-6 text-center hover:bg-surface-2 transition-colors"
              >
                <FileText className="h-8 w-8 text-muted mb-2" />
                <span className="text-xs font-medium text-fg">
                  {file ? file.name : "Click to select evidence file"}
                </span>
                <span className="text-[11px] text-faint mt-1">
                  Supports PDF, PNG, JPG, WEBP, CSV, JSON (up to 25MB)
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                aria-label="Evidence File Upload"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={uploading || !file}
              className="w-full flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Extracting & Ingesting...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" />
                  Ingest & Extract Evidence
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Right Column: Ingestion Results & Extraction Grid */}
        <div className="space-y-6 lg:col-span-2">
          {result ? (
            <div className="space-y-6">
              {/* Evidence Fingerprint Card */}
              <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="text-base font-semibold text-fg flex items-center gap-2">
                      <Shield className="h-5 w-5 text-emerald-400" />
                      Cryptographic Forensic Fingerprint
                    </h3>
                    <p className="text-xs text-muted">
                      Binary magic bytes validated. Tamper-evident hash registered in hash-chained audit ledger.
                    </p>
                  </div>
                  {result.isDuplicate ? (
                    <Badge tone="warning">
                      Duplicate Detected
                    </Badge>
                  ) : (
                    <Badge tone="success">
                      Verified Unique
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-4 text-xs">
                  <div>
                    <span className="text-faint">Filename</span>
                    <p className="font-mono font-medium text-fg truncate">{result.evidence.fileName}</p>
                  </div>
                  <div>
                    <span className="text-faint">Detected MIME</span>
                    <p className="font-mono font-medium text-fg">{result.evidence.mimeType}</p>
                  </div>
                  <div>
                    <span className="text-faint">File Size</span>
                    <p className="font-mono font-medium text-fg">
                      {(result.evidence.fileSizeBytes / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div>
                    <span className="text-faint">Extraction Status</span>
                    <p className="font-mono font-medium text-emerald-400">
                      {result.evidence.extractionStatus}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded bg-surface-2 p-2.5 text-[11px] font-mono break-all text-muted border border-border">
                  <span className="text-faint block text-[10px] uppercase font-semibold tracking-wider mb-1">
                    SHA-256 Hash
                  </span>
                  {result.evidence.sha256Hash}
                </div>
              </div>

              {/* Extracted Fields & Human-in-the-Loop Correction */}
              <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <h3 className="text-base font-semibold text-fg">
                      Calibrated Field Extractions ({result.extractions.length})
                    </h3>
                    <p className="text-xs text-muted">
                      Review extracted transaction anchors. Fields can be verified or human-corrected with full audit traceability.
                    </p>
                  </div>
                </div>

                {result.extractions.length === 0 ? (
                  <p className="text-sm text-faint py-6 text-center">
                    No structured payment anchors were extracted from this file format. You may attach manual source records in the Reconciliation tab.
                  </p>
                ) : (
                  <div className="divide-y divide-border mt-2">
                    {result.extractions.map((field) => (
                      <div key={field.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-fg">{field.fieldName}</span>
                            <Badge
                              tone={
                                field.confidenceTier === "HIGH"
                                  ? "success"
                                  : field.confidenceTier === "MEDIUM"
                                  ? "warning"
                                  : "danger"
                              }
                            >
                              {(field.confidenceScore * 100).toFixed(0)}% {field.confidenceTier}
                            </Badge>
                            {field.isUserCorrected && (
                              <Badge tone="info">
                                Human Verified
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs font-mono text-muted flex items-center gap-2">
                            <span>Value:</span>
                            <span className="font-semibold text-fg">
                              {field.isUserCorrected ? field.correctedValue : field.fieldValue}
                            </span>
                            {field.isUserCorrected && (
                              <span className="text-[11px] text-faint line-through">
                                ({field.fieldValue})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-faint">
                            Method: {field.extractionMethod}
                          </span>
                        </div>

                        {/* Actions */}
                        <div>
                          {editingFieldId === field.id ? (
                            <div className="flex items-center gap-2 mt-2 sm:mt-0">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-8 text-xs w-40"
                                placeholder="Corrected value"
                              />
                              <Button
                                size="sm"
                                variant="primary"
                                disabled={updatingField}
                                onClick={() => saveFieldCorrection(field.id)}
                                className="h-8 text-xs"
                              >
                                <Check className="h-3 w-3" />
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
    </div>
  );
}
