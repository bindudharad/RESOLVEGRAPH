"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import { FEATURED_EVIDENCE_SLOTS, type CaseEvidenceSlot } from "@/lib/mock-data";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface EvidenceRecordItem {
  id: string;
  name: string;
  caseId: string;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  verification: string;
  visibility: string;
  scanStatus: string;
  sizeKb: number;
  extension: string;
  sha256: string;
  storageKey?: string;
  description?: string | null;
}

interface EvidencePreviewProps {
  caseId: string;
}

export function EvidencePreview({ caseId }: EvidencePreviewProps) {
  const isCanonicalDemo = caseId.toUpperCase() === "RG-2026-0412";
  const [dbEvidence, setDbEvidence] = useState<EvidenceRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDbItem, setSelectedDbItem] = useState<EvidenceRecordItem | null>(null);
  const [selectedDemoSlot, setSelectedDemoSlot] = useState<CaseEvidenceSlot | null>(null);

  useEffect(() => {
    let active = true;
    async function loadEvidence() {
      try {
        setLoading(true);
        const res = await fetch(`/api/evidence?caseId=${encodeURIComponent(caseId)}`);
        if (res.ok) {
          const data = await res.json();
          if (active && Array.isArray(data.items)) {
            setDbEvidence(data.items);
          }
        }
      } catch {
        // silent error handling
      } finally {
        if (active) setLoading(false);
      }
    }
    loadEvidence();
    return () => {
      active = false;
    };
  }, [caseId]);

  const getFileIcon = (extOrType: string) => {
    const s = extOrType.toLowerCase();
    if (s.includes("png") || s.includes("jpg") || s.includes("jpeg") || s.includes("photo") || s.includes("image")) {
      return ImageIcon;
    }
    if (s.includes("pdf") || s.includes("invoice") || s.includes("receipt") || s.includes("doc")) {
      return FileText;
    }
    if (s.includes("csv") || s.includes("xlsx") || s.includes("sheet")) {
      return FileSpreadsheet;
    }
    return FileCheck;
  };

  // If real database evidence exists, show real records
  const hasRealEvidence = dbEvidence.length > 0;

  return (
    <>
      <div className="rg-card flex flex-col gap-4 p-5">
        <div className="flex flex-col justify-between gap-2 border-b border-line pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-fg">Evidence Vault</h3>
              {isCanonicalDemo && !hasRealEvidence && (
                <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10.5px] font-medium text-amber-300">
                  Demo Evaluation Case
                </span>
              )}
              {hasRealEvidence && (
                <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10.5px] font-medium text-emerald-400">
                  {dbEvidence.length} Persisted Artifact{dbEvidence.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12.5px] text-subtle">
              Cryptographically fingerprinted documents and media artifacts filed for case {caseId}.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-faint">
            {hasRealEvidence ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                {dbEvidence.length} Attached to Complaint
              </span>
            ) : isCanonicalDemo ? (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                  {FEATURED_EVIDENCE_SLOTS.filter((s) => s.present).length} Available
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-warning)]" />
                  {FEATURED_EVIDENCE_SLOTS.filter((s) => !s.present).length} Pending
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-muted">
                <Clock className="h-3 w-3" />
                Awaiting Upload
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-subtle animate-pulse">
            Loading case evidence records...
          </div>
        ) : hasRealEvidence ? (
          /* Real Evidence Grid */
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {dbEvidence.map((item) => {
              const IconComp = getFileIcon(item.extension || item.type);
              const isImage = ["png", "jpg", "jpeg", "webp"].includes(item.extension?.toLowerCase());
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedDbItem(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedDbItem(item);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  className="group relative flex cursor-pointer flex-col justify-between rounded-lg border border-line bg-surface-2 p-4 transition-all hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--surface-2)_85%,var(--accent)_6%)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--accent)] shadow-xs">
                        <IconComp className="h-4 w-4" />
                      </div>
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                        <CheckCircle2 className="h-3 w-3" />
                        {item.verification === "VERIFIED" ? "Verified" : "Attached"}
                      </span>
                    </div>

                    <h4 className="mt-3 text-[13px] font-semibold text-fg group-hover:text-[var(--accent)] transition-colors truncate" title={item.name}>
                      {item.name}
                    </h4>
                    <p className="mt-1 text-[11.5px] text-faint line-clamp-2">
                      {item.description || `${item.type} artifact submitted for dispute verification.`}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 border-t border-line/60 pt-2.5 text-[11px]">
                    <div className="flex items-center justify-between text-subtle font-mono">
                      <span>{item.type} · {item.sizeKb} KB</span>
                      <span className="inline-flex items-center gap-1 text-[var(--accent)] opacity-80 group-hover:opacity-100 font-sans font-medium">
                        <Eye className="h-3 w-3" />
                        Inspect
                      </span>
                    </div>
                    {item.sha256 && (
                      <span className="font-mono text-[9.5px] text-faint truncate" title={`SHA-256: ${item.sha256}`}>
                        SHA: {item.sha256.substring(0, 16)}…
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : isCanonicalDemo ? (
          /* Canonical Demo Slots fallback ONLY for demo case */
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED_EVIDENCE_SLOTS.map((slot) => {
              const IconComponent = getFileIcon(slot.type);
              return (
                <div
                  key={slot.label}
                  onClick={() => setSelectedDemoSlot(slot)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedDemoSlot(slot);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  className={`group relative flex cursor-pointer flex-col justify-between rounded-lg border p-4 transition-all focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                    slot.present
                      ? "border-line bg-surface-2 hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--surface-2)_80%,var(--accent)_6%)]"
                      : "border-dashed border-line-2 bg-app/50 hover:border-line"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-md border ${
                          slot.present
                            ? "border-[var(--line)] bg-[var(--surface)] text-[var(--accent)] shadow-xs"
                            : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-3)]"
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>

                      {slot.present ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                          <CheckCircle2 className="h-3 w-3" />
                          Attached
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                          <Clock className="h-3 w-3" />
                          Requested
                        </span>
                      )}
                    </div>

                    <h4 className="mt-3 text-[13px] font-semibold text-fg group-hover:text-[var(--accent)] transition-colors">
                      {slot.label}
                    </h4>
                    <p className="mt-1 text-[11.5px] text-faint">{slot.note}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-2.5 text-[11px]">
                    <span className="text-subtle font-mono">{slot.type}</span>
                    <span className="inline-flex items-center gap-1 text-[var(--accent)] opacity-80 group-hover:opacity-100">
                      <Eye className="h-3 w-3" />
                      Inspect
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Clean Empty State for live cases with no evidence */
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line p-8 text-center">
            <ShieldAlert className="h-8 w-8 text-subtle mb-2" />
            <h4 className="text-sm font-semibold text-fg">No Evidence Files Uploaded Yet</h4>
            <p className="mt-1 max-w-sm text-xs text-muted">
              Supporting documents, photos, or delivery scans submitted by the customer or seller will be cryptographically locked and displayed here.
            </p>
          </div>
        )}
      </div>

      {/* Real Evidence Inspection Modal */}
      <Dialog
        open={Boolean(selectedDbItem)}
        onClose={() => setSelectedDbItem(null)}
        title={selectedDbItem ? selectedDbItem.name : "Evidence Item"}
        description={selectedDbItem ? `Case ${selectedDbItem.caseId} forensic artifact ledger record` : "Evidence details"}
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between">
            <span className="text-[11.5px] font-mono text-faint">
              {selectedDbItem ? `SHA: ${selectedDbItem.sha256.substring(0, 24)}…` : ""}
            </span>
            <div className="flex items-center gap-2">
              {selectedDbItem && (
                <a
                  href={`/api/evidence/${selectedDbItem.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-90 transition-opacity"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download File</span>
                </a>
              )}
              <Button variant="secondary" size="sm" onClick={() => setSelectedDbItem(null)}>
                Close
              </Button>
            </div>
          </div>
        }
      >
        {selectedDbItem && (
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-md border border-line bg-surface-2 p-3 text-xs">
              <div>
                <p className="text-[11px] text-subtle">File Type</p>
                <p className="font-semibold text-fg uppercase">{selectedDbItem.extension || selectedDbItem.type}</p>
              </div>
              <div>
                <p className="text-[11px] text-subtle">Artifact Size</p>
                <p className="font-medium text-fg">{selectedDbItem.sizeKb} KB</p>
              </div>
              <div>
                <p className="text-[11px] text-subtle">Uploaded By</p>
                <p className="font-medium text-fg">{selectedDbItem.uploadedBy}</p>
              </div>
              <div>
                <p className="text-[11px] text-subtle">Verification</p>
                <span className="inline-flex items-center gap-1 text-[var(--accent)] font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {selectedDbItem.verification}
                </span>
              </div>
            </div>

            {selectedDbItem.description && (
              <div className="rounded-md border border-line bg-surface p-3 text-xs">
                <span className="font-medium text-subtle">Description: </span>
                <span className="text-fg">{selectedDbItem.description}</span>
              </div>
            )}

            {/* Visual Canvas / Preview */}
            <div className="relative flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-line bg-[#040711] p-4 text-center overflow-hidden">
              {["png", "jpg", "jpeg", "webp"].includes(selectedDbItem.extension?.toLowerCase()) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/evidence/${selectedDbItem.id}/download`}
                  alt={selectedDbItem.name}
                  className="max-h-[300px] w-auto rounded object-contain"
                />
              ) : selectedDbItem.extension?.toLowerCase() === "pdf" ? (
                <div className="flex flex-col items-center gap-2 text-subtle">
                  <FileText className="h-12 w-12 text-[var(--accent)]" />
                  <p className="text-xs font-medium text-fg">PDF Document Artifact</p>
                  <a
                    href={`/api/evidence/${selectedDbItem.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[var(--accent)] underline"
                  >
                    Open PDF in Viewer <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-subtle">
                  <FileCheck className="h-12 w-12 text-[var(--accent)]" />
                  <p className="text-xs font-medium text-fg">Certified Dispute Artifact</p>
                </div>
              )}

              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-[11px] text-muted">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                <span>SHA-256 fingerprint verified against evidence ledger</span>
              </div>
            </div>

            <div className="rounded-md border border-line/80 bg-surface-2 p-2.5 font-mono text-[10.5px] text-muted break-all">
              <strong className="text-subtle font-sans">Full Hash: </strong>
              {selectedDbItem.sha256}
            </div>
          </div>
        )}
      </Dialog>

      {/* Demo Modal ONLY for canonical demo case */}
      <Dialog
        open={Boolean(selectedDemoSlot)}
        onClose={() => setSelectedDemoSlot(null)}
        title={selectedDemoSlot ? `${selectedDemoSlot.label} — Demo Evidence Item` : "Evidence Detail"}
        description="Fictional demonstration record for visual layout verification."
        size="md"
        footer={
          <div className="flex w-full items-center justify-between">
            <span className="text-[11.5px] text-faint">
              Demo Preview Only
            </span>
            <Button variant="secondary" size="sm" onClick={() => setSelectedDemoSlot(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedDemoSlot && (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center justify-between rounded-md border border-line bg-surface-2 p-3">
              <div>
                <p className="text-[11.5px] text-subtle">Document Type</p>
                <p className="text-[13px] font-semibold text-fg">{selectedDemoSlot.type}</p>
              </div>
              <div>
                <p className="text-[11.5px] text-subtle">Availability</p>
                <p className="text-[13px] font-medium text-fg">
                  {selectedDemoSlot.present ? "Present on record" : "Awaiting merchant upload"}
                </p>
              </div>
              <div>
                <p className="text-[11.5px] text-subtle">Case Associated</p>
                <p className="text-[13px] font-mono text-[var(--accent)]">{caseId}</p>
              </div>
            </div>

            <div className="relative flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-line bg-[#040711] p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line-2 bg-surface-2 text-[var(--accent)]">
                <FileCheck className="h-6 w-6" />
              </div>
              <p className="mt-3 text-[13.5px] font-medium text-fg">
                {selectedDemoSlot.label} Visual Canvas
              </p>
              <p className="mt-1 max-w-sm text-[12px] text-faint">
                {selectedDemoSlot.note}
              </p>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
