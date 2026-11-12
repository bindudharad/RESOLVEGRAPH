/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  FileText,
  Video,
  X,
  AlertCircle,
  CheckCircle2,
  Save,
  Loader2,
} from "lucide-react";
import type {
  DynamicFormFieldDef,
  DynamicSellerFormConfig,
  RequestedEvidenceRequirement,
  RequestedItemResponseStatus,
  SellerDraftPayload,
  SellerResponseStance,
} from "@/server/seller/seller.types";
import { SellerContextualGuide } from "@/components/seller/seller-contextual-guide";
import { getAcceptableEvidenceGuidanceForCategory } from "@/components/seller/seller-guidance-content";

const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface UploadedSellerFile {
  id: string;
  file: File;
  previewUrl?: string;
  stepGroup: "PACKING" | "DISPATCH" | "ADDITIONAL";
  requestedItemKey: string;
  evidenceType: string;
}

const WIZARD_STEPS = [
  { id: 1, label: "Seller's Response" },
  { id: 2, label: "Product & Packing" },
  { id: 3, label: "Dispatch Details" },
  { id: 4, label: "Review & Submit" },
];

const RESPONSE_STANCE_OPTIONS: Array<{
  id: SellerResponseStance;
  title: string;
  subtitle: string;
}> = [
  {
    id: "AGREE",
    title: "I agree with the customer's complaint.",
    subtitle: "Acknowledge the issue reported by the customer and share supporting details.",
  },
  {
    id: "DISAGREE",
    title: "I disagree with the customer's complaint.",
    subtitle: "Explain why your records contradict the claim and attach supporting proof.",
  },
  {
    id: "CLARIFICATION_ONLY",
    title: "I need to provide clarification.",
    subtitle: "Share neutral fulfillment, billing, or transit context for investigators.",
  },
];

const ITEM_AVAILABILITY_OPTIONS: Array<{
  value: RequestedItemResponseStatus;
  label: string;
}> = [
  { value: "PROVIDED", label: "Evidence provided" },
  { value: "NOT_AVAILABLE", label: "Not available" },
  { value: "NOT_APPLICABLE", label: "Not applicable" },
  { value: "EXPLANATION_REQUIRED", label: "Explanation provided" },
];

function validateSellerFile(file: File): string | null {
  if (!file || file.size === 0) return `"${file?.name || "File"}" is empty.`;
  if (file.size > MAX_FILE_BYTES) {
    return `"${file.name}" exceeds the 10 MB per-file size limit.`;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const allowedExts = new Set(["pdf", "jpg", "jpeg", "png", "webp", "mp4", "webm"]);
  if (file.type && !ACCEPTED_MIME_TYPES.has(file.type) && !allowedExts.has(ext)) {
    return `"${file.name}" is an unsupported file format. Allowed: PDF, JPG, PNG, WEBP, MP4, WEBM.`;
  }
  return null;
}

export function SellerSubmissionWizard({
  requestId,
  orderId,
  productName,
  complaintCategory,
  isFollowUp = false,
  requestedItems,
  dynamicFormConfig,
  initialDraft,
  onSubmitted,
  onCancel,
}: {
  requestId: string;
  caseNumber: string;
  orderId: string;
  productName: string;
  complaintCategory?: string;
  isFollowUp?: boolean;
  requestedItems: RequestedEvidenceRequirement[];
  dynamicFormConfig: DynamicSellerFormConfig;
  initialDraft: SellerDraftPayload | null;
  onSubmitted: (result: { responseId: string; verificationStatus: string }) => void;
  onCancel?: () => void;
}) {
  const acceptableEvidenceTips = getAcceptableEvidenceGuidanceForCategory(complaintCategory);
  const [step, setStep] = useState<number>(initialDraft?.currentStep || 1);
  const [stance, setStance] = useState<SellerResponseStance>(initialDraft?.stance || "DISAGREE");
  const [summary, setSummary] = useState<string>(initialDraft?.summary || "");
  const [additionalRemarks, setAdditionalRemarks] = useState<string>(
    initialDraft?.additionalRemarks || ""
  );

  // Step 2 & Step 3 Dynamic Values
  const [productValues, setProductValues] = useState<Record<string, string>>(() => ({
    productName: initialDraft?.structuredDetails?.productAndPacking?.productName || productName,
    ...(initialDraft?.structuredDetails?.productAndPacking || {}),
  }));
  const [dispatchValues, setDispatchValues] = useState<Record<string, string>>(
    () => initialDraft?.structuredDetails?.dispatchAndSettlement || {}
  );

  // Requested checklist item states
  const [itemStates, setItemStates] = useState<
    Record<string, { status: RequestedItemResponseStatus; note: string }>
  >(() => {
    const map: Record<string, { status: RequestedItemResponseStatus; note: string }> = {};
    const draftMap = new Map(
      (initialDraft?.itemResponses || []).map((r) => [r.key, r])
    );
    for (const item of requestedItems) {
      const fromDraft = draftMap.get(item.key);
      map[item.key] = {
        status:
          fromDraft?.status ||
          (item.status && item.status !== "PENDING" ? item.status : "PROVIDED"),
        note: fromDraft?.note || item.sellerNote || "",
      };
    }
    return map;
  });

  // Files across steps
  const [files, setFiles] = useState<UploadedSellerFile[]>([]);
  const fileCounterRef = useRef(0);
  const [fileError, setFileError] = useState<string | null>(null);

  // Step 4 Declaration + Submission
  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
  const [idempotencyKey] = useState<string>(() =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `seller-resp-${Date.now()}`
  );
  const [stepError, setStepError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [submittedResult, setSubmittedResult] = useState<{
    responseId: string;
    verificationStatus: string;
  } | null>(null);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, [files]);

  const persistDraftSilently = async (targetStep: number, showFeedback = false) => {
    setSavingDraft(true);
    if (showFeedback) setDraftNotice(null);
    try {
      const draft: SellerDraftPayload = {
        stance,
        summary,
        additionalRemarks,
        currentStep: targetStep,
        itemResponses: requestedItems.map((it) => ({
          key: it.key,
          status: itemStates[it.key]?.status || "NOT_AVAILABLE",
          note: itemStates[it.key]?.note || undefined,
        })),
        structuredDetails: {
          productAndPacking: productValues,
          dispatchAndSettlement: dispatchValues,
        },
      };
      const res = await fetch(`/api/seller/requests/${encodeURIComponent(requestId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      if (res.ok && showFeedback) {
        setDraftNotice("Draft saved. Request marked In Progress.");
      }
    } catch {
      // Non-fatal draft failure
    } finally {
      setSavingDraft(false);
    }
  };

  const handleAddFiles = (
    list: FileList | null,
    stepGroup: "PACKING" | "DISPATCH" | "ADDITIONAL"
  ) => {
    if (!list || list.length === 0) return;
    setFileError(null);
    const errs: string[] = [];
    const added: UploadedSellerFile[] = [];

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const err = validateSellerFile(file);
      if (err) {
        errs.push(err);
        continue;
      }
      fileCounterRef.current += 1;
      const previewUrl =
        file.type.startsWith("image/") || file.type.startsWith("video/")
          ? URL.createObjectURL(file)
          : undefined;
      added.push({
        id: `up-${fileCounterRef.current}`,
        file,
        previewUrl,
        stepGroup,
        requestedItemKey: requestedItems[0]?.key || "",
        evidenceType: file.type.startsWith("image/")
          ? "PHOTO"
          : stepGroup === "DISPATCH"
          ? "TRACKING_INFO"
          : "INVOICE",
      });
    }

    if (errs.length > 0) setFileError(errs.join(" "));
    if (added.length > 0) setFiles((prev) => [...prev, ...added]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const found = prev.find((f) => f.id === id);
      if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const validateCurrentStep = (s: number): string | null => {
    if (s === 1) {
      if (!stance) return "Please select one of the three response options.";
      if (summary.trim().length < 5) {
        return "Please explain your response in at least a brief sentence (minimum 5 characters).";
      }
    }
    if (s === 2) {
      for (const field of dynamicFormConfig.step2Fields) {
        if (field.required && !productValues[field.key]?.trim()) {
          return `Please enter "${field.label}".`;
        }
      }
      for (const item of requestedItems) {
        const st = itemStates[item.key];
        if (st?.status === "EXPLANATION_REQUIRED" && !st.note.trim()) {
          return `Please provide an explanation for "${item.label}".`;
        }
      }
    }
    return null;
  };

  const goToStep = async (nextStep: number) => {
    setStepError(null);
    if (nextStep > step) {
      const err = validateCurrentStep(step);
      if (err) {
        setStepError(err);
        return;
      }
    }
    setStep(nextStep);
    void persistDraftSilently(nextStep, false);
  };

  const handleSubmitFinal = async () => {
    setStepError(null);
    if (!declarationConfirmed) {
      setStepError(
        "Please check the mandatory confirmation declaration before submitting."
      );
      return;
    }

    setSubmitting(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      const payload = {
        stance,
        summary: summary.trim(),
        additionalRemarks: additionalRemarks.trim() || undefined,
        declarationConfirmed: true,
        idempotencyKey,
        structuredDetails: {
          productAndPacking: productValues,
          dispatchAndSettlement: dispatchValues,
        },
        itemResponses: requestedItems.map((it) => ({
          key: it.key,
          status: itemStates[it.key]?.status || "NOT_AVAILABLE",
          note: itemStates[it.key]?.note || undefined,
        })),
        fileMetadata: files.map((f) => ({
          requestedItemKey: f.requestedItemKey || undefined,
          evidenceType: f.evidenceType,
          visibility: "SHARED_WITH_PARTICIPANTS",
        })),
      };
      formData.append("payload", JSON.stringify(payload));
      files.forEach((f) => formData.append("files", f.file));

      setUploadProgress(55);
      const res = await fetch(
        `/api/seller/requests/${encodeURIComponent(requestId)}/respond`,
        {
          method: "POST",
          body: formData,
        }
      );
      setUploadProgress(90);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit seller evidence.");
      }

      setUploadProgress(100);
      const resultObj = {
        responseId: data.response?.responseId || "",
        verificationStatus: data.response?.verificationStatus || "NEEDS_REVIEW",
      };
      setSubmittedResult(resultObj);
      onSubmitted(resultObj);
    } catch (err) {
      setStepError(err instanceof Error ? err.message : "Failed to submit response");
      setUploadProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedResult) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-[var(--surface)] p-6 sm:p-8 shadow-sm max-w-3xl mx-auto text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-[var(--ink)]">Seller Evidence Submitted</h2>
        <p className="text-sm text-[var(--ink-2)] max-w-lg mx-auto">
          Your response and supporting files for order <strong className="font-mono">{orderId}</strong>{" "}
          have been securely saved and queued through RESOLVEGRAPH Evidence Verification &amp; BERR evaluation.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {submittedResult.responseId && (
            <Link
              href={`/seller/responses/${encodeURIComponent(submittedResult.responseId)}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
            >
              View Submitted Response
            </Link>
          )}
          <Link
            href="/seller/requests"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)]"
          >
            Back to Evidence Requests
          </Link>
        </div>
      </div>
    );
  }

  const renderField = (
    field: DynamicFormFieldDef,
    values: Record<string, string>,
    setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  ) => {
    const val = values[field.key] || "";
    const updateVal = (v: string) =>
      setValues((prev) => ({ ...prev, [field.key]: v }));

    return (
      <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
        <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {field.type === "textarea" ? (
          <textarea
            rows={3}
            value={val}
            onChange={(e) => updateVal(e.target.value)}
            placeholder={field.placeholder}
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        ) : field.type === "select" ? (
          <select
            value={val}
            onChange={(e) => updateVal(e.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="">Select an option...</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={field.type}
            value={val}
            onChange={(e) => updateVal(e.target.value)}
            placeholder={field.placeholder}
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        )}
      </div>
    );
  };

  const renderDropzone = (
    group: "PACKING" | "DISPATCH" | "ADDITIONAL",
    title: string,
    hints: string[]
  ) => {
    const groupFiles = files.filter((f) => f.stepGroup === group);
    return (
      <div className="space-y-3 pt-2">
        <div>
          <h4 className="text-xs font-semibold text-[var(--ink)]">{title}</h4>
          <p className="text-xs text-[var(--ink-3)] mt-0.5">
            Accepted if available: {hints.join(" · ")}
          </p>
        </div>

        <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--line-strong)] bg-[var(--surface-2)]/40 p-5 text-center cursor-pointer hover:border-[var(--accent)] transition-colors">
          <UploadCloud className="h-6 w-6 text-[var(--accent)] mb-1.5" />
          <span className="text-xs sm:text-sm font-semibold text-[var(--ink)]">
            Click to upload files (PDF, JPG, PNG, WEBP, MP4, WEBM)
          </span>
          <span className="text-[11px] text-[var(--ink-3)] mt-0.5">
            Maximum 10 MB per file · Do not fabricate unavailable records
          </span>
          <input
            type="file"
            multiple
            accept="application/pdf,image/jpeg,image/png,image/webp,video/mp4,video/webm"
            className="sr-only"
            onChange={(e) => handleAddFiles(e.target.files, group)}
          />
        </label>

        {groupFiles.length > 0 && (
          <div className="space-y-2">
            {groupFiles.map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {f.previewUrl && f.file.type.startsWith("image/") ? (
                    <img
                      src={f.previewUrl}
                      alt={f.file.name}
                      className="h-10 w-10 rounded-lg object-cover border border-[var(--line)] shrink-0"
                    />
                  ) : f.file.type.startsWith("video/") ? (
                    <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center border border-[var(--line)] shrink-0">
                      <Video className="h-4 w-4 text-indigo-600" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center border border-[var(--line)] shrink-0">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--ink)] truncate max-w-[200px] sm:max-w-[280px]">
                      {f.file.name}
                    </p>
                    <p className="text-[11px] text-[var(--ink-3)]">
                      {Math.max(1, Math.round(f.file.size / 1024))} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={f.requestedItemKey}
                    onChange={(e) =>
                      setFiles((prev) =>
                        prev.map((x) =>
                          x.id === f.id ? { ...x, requestedItemKey: e.target.value } : x
                        )
                      )
                    }
                    className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--ink)] max-w-[170px]"
                  >
                    <option value="">General Evidence</option>
                    {requestedItems.map((it) => (
                      <option key={it.key} value={it.key}>
                        {it.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    aria-label={`Remove ${f.file.name}`}
                    className="rounded-lg p-1.5 text-[var(--ink-3)] hover:bg-red-50 hover:text-red-600 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7 shadow-sm space-y-6">
      {/* Wizard Top Header + Save Draft */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            Seller Evidence Submission
          </span>
          <h2 className="text-lg font-bold text-[var(--ink)]">
            Order {orderId} · {productName}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={savingDraft}
            onClick={() => void persistDraftSilently(step, true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)] cursor-pointer disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{savingDraft ? "Saving..." : "Save Draft"}</span>
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Progress Indicator */}
      <nav aria-label="Response Progress" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {WIZARD_STEPS.map((ws) => {
          const active = step === ws.id;
          const completed = step > ws.id;
          return (
            <button
              key={ws.id}
              type="button"
              onClick={() => void goToStep(ws.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent)]/8 text-[var(--ink)]"
                  : completed
                  ? "border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-3)]"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  active
                    ? "bg-[var(--accent)] text-white"
                    : completed
                    ? "bg-emerald-600 text-white"
                    : "bg-[var(--surface-2)] text-[var(--ink-2)]"
                }`}
              >
                {completed ? <Check className="h-3.5 w-3.5" /> : ws.id}
              </span>
              <span className="truncate text-xs font-semibold">{ws.label}</span>
            </button>
          );
        })}
      </nav>

      {isFollowUp ? (
        <SellerContextualGuide
          guideId="seller-wizard-follow-up"
          title="Submitting Additional Information"
          compactLabel="Follow-up instructions"
        >
          <p>
            Your earlier response stays intact in the verification thread. Provide only the
            requested follow-up clarification or missing documents below, or mark unavailable records
            accurately.
          </p>
        </SellerContextualGuide>
      ) : (
        <SellerContextualGuide
          guideId="seller-wizard-intro"
          title="Completing Your Response"
          defaultOpen={false}
          compactLabel="Response tips"
        >
          <p>
            Provide factual order context, attach relevant evidence only when available, and mark
            unavailable items honestly rather than guessing.
          </p>
        </SellerContextualGuide>
      )}

      {draftNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-800 dark:text-emerald-200">
          {draftNotice}
        </div>
      )}

      {(stepError || fileError) && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 p-3 text-xs text-red-700 dark:text-red-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{stepError || fileError}</span>
        </div>
      )}

      {/* STEP 1 — SELLER'S RESPONSE */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--ink)]">
              What is your response to this complaint?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-2)] mt-0.5">
              Explain your understanding of the customer&apos;s reported issue. Choose{" "}
              <strong className="text-[var(--ink)]">Agree</strong> to confirm the claim,{" "}
              <strong className="text-[var(--ink)]">Disagree</strong> to provide counter-facts and
              records, or <strong className="text-[var(--ink)]">Clarification</strong> for neutral
              context.
            </p>
          </div>

          <div className="space-y-2.5" role="radiogroup" aria-label="Seller response options">
            {RESPONSE_STANCE_OPTIONS.map((opt) => {
              const selected = stance === opt.id;
              return (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                    selected
                      ? "border-[var(--accent)] bg-[var(--accent)]/[0.06]"
                      : "border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-2)]/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="seller-stance"
                    checked={selected}
                    onChange={() => setStance(opt.id)}
                    className="mt-1"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-[var(--ink)]">
                      {opt.title}
                    </span>
                    <span className="block text-xs text-[var(--ink-2)] mt-0.5">
                      {opt.subtitle}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          <div>
            <label
              htmlFor="seller-response-explanation"
              className="block text-xs sm:text-sm font-semibold text-[var(--ink)] mb-1"
            >
              Explain your response
            </label>
            <p className="text-[11px] text-[var(--ink-3)] mb-1.5">
              Focus on verifiable order dates, SKU/variant picked, carrier status, or inspection
              notes from your actual records.
            </p>
            <textarea
              id="seller-response-explanation"
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe what happened from your perspective..."
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
        </div>
      )}

      {/* STEP 2 — PRODUCT & PACKING INFORMATION */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--ink)]">
              {dynamicFormConfig.step2Title}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-2)] mt-0.5">
              {dynamicFormConfig.step2Subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {dynamicFormConfig.step2Fields.map((f) =>
              renderField(f, productValues, setProductValues)
            )}
          </div>

          {/* Non-Coercive Requested Evidence Availability */}
          <div className="space-y-2.5 pt-2 border-t border-[var(--line)]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)]">
              Requested Evidence Status &amp; Unavailable Information
            </h4>
            <p className="text-xs text-[var(--ink-2)]">
              Never guess or fabricate missing records. If an item was not captured or does not
              apply to this order, select <strong className="text-[var(--ink)]">Not available</strong>{" "}
              or <strong className="text-[var(--ink)]">Not applicable</strong> and note a brief
              explanation.
            </p>
            <div className="space-y-2">
              {requestedItems.map((it) => {
                const st = itemStates[it.key]?.status || "NOT_AVAILABLE";
                const noteVal = itemStates[it.key]?.note || "";
                const hasTaggedUpload = files.some((f) => f.requestedItemKey === it.key);
                const noUploadNeeded = st === "NOT_AVAILABLE" || st === "NOT_APPLICABLE";
                const notePlaceholder =
                  st === "NOT_AVAILABLE"
                    ? "Optional reason this record is unavailable (no upload required)"
                    : st === "NOT_APPLICABLE"
                    ? "Optional reason this item is not applicable (no upload required)"
                    : st === "EXPLANATION_REQUIRED"
                    ? "Required brief explanation for this item"
                    : "Reference number or note (upload matching file below if available)";

                return (
                  <div
                    key={it.key}
                    className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/30 p-3 grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center"
                  >
                    <div className="sm:col-span-5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-xs font-semibold text-[var(--ink)]">{it.label}</p>
                        {noUploadNeeded && (
                          <span className="rounded-full bg-[var(--surface)] border border-[var(--line)] px-2 py-0.5 text-[10px] font-medium text-[var(--ink-3)]">
                            No upload required
                          </span>
                        )}
                        {st === "PROVIDED" && !hasTaggedUpload && !noteVal.trim() && (
                          <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
                            Attach file or add note
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="sm:col-span-3">
                      <select
                        aria-label={`Availability for ${it.label}`}
                        value={st}
                        onChange={(e) =>
                          setItemStates((prev) => ({
                            ...prev,
                            [it.key]: {
                              status: e.target.value as RequestedItemResponseStatus,
                              note: prev[it.key]?.note || "",
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--ink)]"
                      >
                        {ITEM_AVAILABILITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={noteVal}
                        onChange={(e) =>
                          setItemStates((prev) => ({
                            ...prev,
                            [it.key]: {
                              status: prev[it.key]?.status || "NOT_AVAILABLE",
                              note: e.target.value,
                            },
                          }))
                        }
                        placeholder={notePlaceholder}
                        className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--ink)]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {renderDropzone(
            "PACKING",
            dynamicFormConfig.step2UploadTitle,
            dynamicFormConfig.step2UploadHints
          )}
        </div>
      )}

      {/* STEP 3 — DISPATCH INFORMATION */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--ink)]">
              {dynamicFormConfig.step3Title}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-2)] mt-0.5">
              {dynamicFormConfig.step3Subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {dynamicFormConfig.step3Fields.map((f) =>
              renderField(f, dispatchValues, setDispatchValues)
            )}
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/35 p-3 text-xs text-[var(--ink-2)] space-y-1">
            <p className="font-semibold text-[var(--ink)]">
              Relevant evidence examples for this complaint type (attach only what applies):
            </p>
            <ul className="list-disc pl-4 space-y-0.5">
              {acceptableEvidenceTips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>

          {renderDropzone(
            "DISPATCH",
            dynamicFormConfig.step3UploadTitle,
            dynamicFormConfig.step3UploadHints
          )}
        </div>
      )}

      {/* STEP 4 — ADDITIONAL EVIDENCE AND FINAL SUBMISSION */}
      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--ink)]">
              Additional supporting information &amp; Final Review
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-2)] mt-0.5">
              Add any final remarks or extra files, review your response summary, and submit.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
              Additional Explanation (Optional)
            </label>
            <textarea
              rows={3}
              value={additionalRemarks}
              onChange={(e) => setAdditionalRemarks(e.target.value)}
              placeholder="Any additional clarification or communication details..."
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          {renderDropzone("ADDITIONAL", "Additional Supporting Files", [
            "Seller communication records",
            "Additional photographs or documents",
          ])}

          {/* Final Review Summary */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-[var(--ink-3)]">
                Submission Summary Review
              </span>
            </div>

            <div className="rounded-lg bg-[var(--surface)] p-3 border border-[var(--line)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--ink)]">1. Seller&apos;s Response</span>
                <button
                  type="button"
                  onClick={() => void goToStep(1)}
                  className="text-[var(--accent)] hover:underline font-medium cursor-pointer"
                >
                  Edit
                </button>
              </div>
              <p className="font-medium text-[var(--ink)]">
                {RESPONSE_STANCE_OPTIONS.find((o) => o.id === stance)?.title}
              </p>
              <p className="text-[var(--ink-2)]">{summary}</p>
            </div>

            <div className="rounded-lg bg-[var(--surface)] p-3 border border-[var(--line)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--ink)]">2. Product &amp; Packing</span>
                <button
                  type="button"
                  onClick={() => void goToStep(2)}
                  className="text-[var(--accent)] hover:underline font-medium cursor-pointer"
                >
                  Edit
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[var(--ink-2)]">
                {Object.entries(productValues)
                  .filter(([, v]) => v?.trim())
                  .map(([k, v]) => (
                    <span key={k}>
                      <strong className="text-[var(--ink)]">{k}:</strong> {v}
                    </span>
                  ))}
              </div>
            </div>

            <div className="rounded-lg bg-[var(--surface)] p-3 border border-[var(--line)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--ink)]">3. Dispatch Details</span>
                <button
                  type="button"
                  onClick={() => void goToStep(3)}
                  className="text-[var(--accent)] hover:underline font-medium cursor-pointer"
                >
                  Edit
                </button>
              </div>
              {Object.values(dispatchValues).some((v) => v?.trim()) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[var(--ink-2)]">
                  {Object.entries(dispatchValues)
                    .filter(([, v]) => v?.trim())
                    .map(([k, v]) => (
                      <span key={k}>
                        <strong className="text-[var(--ink)]">{k}:</strong> {v}
                      </span>
                    ))}
                </div>
              ) : (
                <p className="text-[var(--ink-3)]">No dispatch details entered (optional).</p>
              )}
            </div>

            <div className="rounded-lg bg-[var(--surface)] p-3 border border-[var(--line)] space-y-1">
              <span className="font-semibold text-[var(--ink)] block">
                Uploaded Evidence Files ({files.length})
              </span>
              {files.length === 0 ? (
                <p className="text-[var(--ink-3)]">No files attached.</p>
              ) : (
                <ul className="list-disc pl-5 text-[var(--ink-2)]">
                  {files.map((f) => (
                    <li key={f.id}>
                      {f.file.name} ({f.stepGroup.toLowerCase()})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <p className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/40 px-3.5 py-2.5 text-xs text-[var(--ink-2)]">
            <strong className="text-[var(--ink)]">Final Review:</strong> Verify your selected
            response option, explanation, item availability statuses, and attachments above. After
            submission, uploaded records enter verification screening and may be reviewed by an
            investigator alongside customer evidence.
          </p>

          {/* Mandatory Seller Declaration */}
          <label className="flex items-start gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-3.5 text-xs text-[var(--ink)] cursor-pointer">
            <input
              type="checkbox"
              checked={declarationConfirmed}
              onChange={(e) => setDeclarationConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            <span className="leading-relaxed">
              I confirm that the information and documents submitted are accurate to the best of my
              knowledge and that I am authorized to submit this response on behalf of the business.
            </span>
          </label>

          {submitting && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-medium text-[var(--ink-2)]">
                <span>Uploading evidence &amp; running verification screening...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
        <button
          type="button"
          disabled={step === 1 || submitting}
          onClick={() => void goToStep(step - 1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--ink-2)] hover:bg-[var(--surface-2)] disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        {step < 4 ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void goToStep(step + 1)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-5 py-2 text-xs sm:text-sm font-semibold text-white hover:opacity-95 cursor-pointer"
          >
            <span>Continue</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmitFinal}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 cursor-pointer"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{submitting ? "Submitting..." : "Submit Seller Evidence"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
