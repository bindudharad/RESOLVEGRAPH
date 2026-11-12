"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  X,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Video,
} from "lucide-react";

export function SellerStatusPill({ label }: { label: string }) {
  const lower = label.toLowerCase();
  let tone = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30";
  let Icon = Clock;

  if (
    lower.includes("verified for investigation") ||
    lower === "submitted" ||
    lower === "verified"
  ) {
    tone =
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30";
    Icon = CheckCircle2;
  } else if (
    lower.includes("additional information") ||
    lower.includes("human review") ||
    lower.includes("overdue") ||
    lower.includes("inconclusive")
  ) {
    tone =
      "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30";
    Icon = AlertTriangle;
  } else if (lower.includes("in progress") || lower.includes("under verification")) {
    tone =
      "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30";
    Icon = Clock;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${tone}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function formatSellerMoney(amountMinor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${currency || "INR"} ${(amountMinor / 100).toFixed(2)}`;
  }
}

export function formatSellerDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatStanceLabel(stance: string) {
  switch ((stance || "").toUpperCase()) {
    case "AGREE":
      return "Agreed with Complaint";
    case "DISAGREE":
      return "Disagreed with Complaint";
    case "PARTIAL_AGREEMENT":
      return "Partial Agreement";
    case "CLARIFICATION_ONLY":
      return "Provided Clarification";
    default:
      return stance.replace(/_/g, " ");
  }
}

export interface PreviewableEvidenceItem {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes?: number;
  previewUrl: string;
  description?: string | null;
}

export function SellerEvidenceViewerModal({
  item,
  onClose,
}: {
  item: PreviewableEvidenceItem | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  if (!item) return null;

  const isImage = item.mimeType.startsWith("image/");
  const isPdf = item.mimeType === "application/pdf" || item.filename.toLowerCase().endsWith(".pdf");
  const isVideo = item.mimeType.startsWith("video/");

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${item.filename}`}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5 min-w-0">
            {isImage ? (
              <ImageIcon className="h-4 w-4 text-blue-600 shrink-0" />
            ) : isVideo ? (
              <Video className="h-4 w-4 text-indigo-600 shrink-0" />
            ) : (
              <FileText className="h-4 w-4 text-amber-600 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--ink)]">{item.filename}</p>
              {item.description && (
                <p className="truncate text-xs text-[var(--ink-3)]">{item.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={item.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
            >
              <span>Open Tab</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close evidence preview"
              className="rounded-lg p-1.5 text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[var(--surface-2)] p-4 flex items-center justify-center min-h-[320px]">
          {isImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.previewUrl}
              alt={item.filename}
              className="max-h-[72vh] max-w-full rounded-lg border border-[var(--line)] object-contain bg-white"
            />
          ) : isVideo ? (
            <video
              src={item.previewUrl}
              controls
              className="max-h-[72vh] max-w-full rounded-lg border border-[var(--line)] bg-black"
            />
          ) : isPdf ? (
            <iframe
              src={item.previewUrl}
              title={item.filename}
              className="h-[72vh] w-full rounded-lg border border-[var(--line)] bg-white"
            />
          ) : (
            <div className="text-center space-y-2 py-8">
              <FileText className="h-10 w-10 mx-auto text-[var(--ink-3)]" />
              <p className="text-sm font-medium text-[var(--ink)]">
                Inline preview unavailable for this file format ({item.mimeType}).
              </p>
              <a
                href={item.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-white"
              >
                Open Authenticated File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EvidenceVerificationChecksGrid({
  items,
}: {
  items: Array<{
    id: string;
    filename: string;
    mimeType?: string;
    verificationStatus: string;
    humanReviewRequired: boolean;
    previewUrl?: string;
    fileUsability: { usable: boolean; notes?: string[]; scanStatus?: string } | null;
    documentExtraction: {
      performed: boolean;
      method: string;
      extractedTextLength: number;
      isScanned: boolean;
    } | null;
    evidenceRelevance: { relevant: boolean; score: number; reason: string } | null;
    informationConsistency: {
      consistent: boolean;
      orderIdMatched: boolean;
      productMatched?: boolean;
      notes?: string[];
    } | null;
    suspiciousSignals: Array<{ code: string; severity: string; detail: string }>;
  }>;
}) {
  const [previewItem, setPreviewItem] = useState<PreviewableEvidenceItem | null>(null);

  return (
    <>
      <div className="space-y-3">
        {items.map((ev) => (
          <div
            key={ev.id}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 space-y-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-[var(--accent)] shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-[var(--ink)] truncate">
                  {ev.filename}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {ev.previewUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewItem({
                        id: ev.id,
                        filename: ev.filename,
                        mimeType: ev.mimeType || "application/pdf",
                        previewUrl: ev.previewUrl!,
                      })
                    }
                    className="text-xs font-medium text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    Preview File
                  </button>
                )}
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-2.5 py-0.5 text-[11px] font-medium">
                  {ev.humanReviewRequired ? (
                    <>
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-amber-700 dark:text-amber-300">
                        Human Review Required
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700 dark:text-emerald-300">
                        {ev.verificationStatus}
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div className="rounded-lg bg-[var(--surface-2)]/70 p-2.5">
                <span className="text-[11px] text-[var(--ink-3)] block">File Signature &amp; Scan</span>
                <span className="font-semibold text-[var(--ink)]">
                  {ev.fileUsability?.usable ? "Valid & Usable" : "Issue Flagged"}
                </span>
              </div>
              <div className="rounded-lg bg-[var(--surface-2)]/70 p-2.5">
                <span className="text-[11px] text-[var(--ink-3)] block">OCR &amp; Extraction</span>
                <span className="font-semibold text-[var(--ink)]">
                  {ev.documentExtraction?.performed
                    ? `${ev.documentExtraction.extractedTextLength} chars extracted`
                    : "Visual inspection queued"}
                </span>
              </div>
              <div className="rounded-lg bg-[var(--surface-2)]/70 p-2.5">
                <span className="text-[11px] text-[var(--ink-3)] block">Order Consistency</span>
                <span className="font-semibold text-[var(--ink)]">
                  {ev.informationConsistency?.orderIdMatched
                    ? "Order ID Matched"
                    : "Pending Cross-Check"}
                </span>
              </div>
              <div className="rounded-lg bg-[var(--surface-2)]/70 p-2.5">
                <span className="text-[11px] text-[var(--ink-3)] block">Relevance Score</span>
                <span className="font-semibold text-[var(--ink)]">
                  {ev.evidenceRelevance
                    ? `${Math.round(ev.evidenceRelevance.score * 100)}%`
                    : "—"}
                </span>
              </div>
            </div>

            {ev.suspiciousSignals && ev.suspiciousSignals.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                Verification notices: {ev.suspiciousSignals.map((s) => s.detail).join(" · ")}
              </div>
            )}
          </div>
        ))}
      </div>

      <SellerEvidenceViewerModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </>
  );
}
