"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  ShieldAlert,
} from "lucide-react";
import { FEATURED_EVIDENCE_SLOTS, type CaseEvidenceSlot } from "@/lib/mock-data";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EvidencePreviewProps {
  caseId: string;
}

export function EvidencePreview({ caseId }: EvidencePreviewProps) {
  const [selectedSlot, setSelectedSlot] = useState<CaseEvidenceSlot | null>(null);

  // In demo mode, show the slots from FEATURED_EVIDENCE_SLOTS
  const slots = FEATURED_EVIDENCE_SLOTS;

  const getIcon = (type: string) => {
    if (type.toLowerCase().includes("image")) return ImageIcon;
    if (type.toLowerCase().includes("pdf")) return FileText;
    if (type.toLowerCase().includes("csv")) return FileSpreadsheet;
    return FileCheck;
  };

  return (
    <>
      <div className="rg-card flex flex-col gap-4 p-5">
        <div className="flex flex-col justify-between gap-2 border-b border-line pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-fg">Evidence Vault</h3>
              <span className="rounded bg-[color-mix(in_srgb,var(--color-brand)_15%,transparent)] px-2 py-0.5 text-[10.5px] font-medium text-[#b3a1ff]">
                Demo Records
              </span>
            </div>
            <p className="mt-0.5 text-[12.5px] text-subtle">
              Supporting documents and media artifacts filed for case {caseId}.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-faint">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
              {slots.filter((s) => s.present).length} Available
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--color-warning)]" />
              {slots.filter((s) => !s.present).length} Pending
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {slots.map((slot) => {
            const IconComponent = getIcon(slot.type);
            return (
              <div
                key={slot.label}
                onClick={() => setSelectedSlot(slot)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedSlot(slot);
                  }
                }}
                tabIndex={0}
                role="button"
                className={`group relative flex cursor-pointer flex-col justify-between rounded-lg border p-4 transition-all focus-visible:outline-2 focus-visible:outline-[var(--color-brand)] ${
                  slot.present
                    ? "border-line bg-surface-2 hover:border-[var(--color-brand)] hover:bg-[color-mix(in_srgb,var(--color-surface-2)_80%,var(--color-brand)_6%)]"
                    : "border-dashed border-line-2 bg-app/50 hover:border-line"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-md border ${
                        slot.present
                          ? "border-line-2 bg-[#0c1527] text-[#a08bff]"
                          : "border-line bg-surface text-faint"
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>

                    {slot.present ? (
                      <span className="inline-flex items-center gap-1 rounded bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] px-1.5 py-0.5 text-[10.5px] font-medium text-[#6ee7b7]">
                        <CheckCircle2 className="h-3 w-3" />
                        Attached
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-[color-mix(in_srgb,var(--color-warning)_15%,transparent)] px-1.5 py-0.5 text-[10.5px] font-medium text-[#fcd34d]">
                        <Clock className="h-3 w-3" />
                        Requested
                      </span>
                    )}
                  </div>

                  <h4 className="mt-3 text-[13px] font-semibold text-fg group-hover:text-[#b3a1ff] transition-colors">
                    {slot.label}
                  </h4>
                  <p className="mt-1 text-[11.5px] text-faint">{slot.note}</p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-2.5 text-[11px]">
                  <span className="text-subtle font-mono">{slot.type}</span>
                  <span className="inline-flex items-center gap-1 text-[#a08bff] opacity-80 group-hover:opacity-100">
                    <Eye className="h-3 w-3" />
                    Inspect
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Evidence Inspection Modal */}
      <Dialog
        open={Boolean(selectedSlot)}
        onClose={() => setSelectedSlot(null)}
        title={selectedSlot ? `${selectedSlot.label} — Evidence Item` : "Evidence Detail"}
        description="Fictional demonstration record for visual layout verification."
        size="md"
        footer={
          <div className="flex w-full items-center justify-between">
            <span className="text-[11.5px] text-faint">
              Demo Preview Only · Step 1 Interface
            </span>
            <Button variant="secondary" size="sm" onClick={() => setSelectedSlot(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedSlot && (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center justify-between rounded-md border border-line bg-surface-2 p-3">
              <div>
                <p className="text-[11.5px] text-subtle">Document Type</p>
                <p className="text-[13px] font-semibold text-fg">{selectedSlot.type}</p>
              </div>
              <div>
                <p className="text-[11.5px] text-subtle">Availability</p>
                <p className="text-[13px] font-medium text-fg">
                  {selectedSlot.present ? "Present on record" : "Awaiting merchant upload"}
                </p>
              </div>
              <div>
                <p className="text-[11.5px] text-subtle">Case Associated</p>
                <p className="text-[13px] font-mono text-[#a08bff]">{caseId}</p>
              </div>
            </div>

            {/* Visual Document Canvas Simulation */}
            <div className="relative flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-line bg-[#040711] p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line-2 bg-surface-2 text-[#a08bff]">
                <FileCheck className="h-6 w-6" />
              </div>
              <p className="mt-3 text-[13.5px] font-medium text-fg">
                {selectedSlot.label} Visual Canvas
              </p>
              <p className="mt-1 max-w-sm text-[12px] text-faint">
                {selectedSlot.note}
              </p>

              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-[11px] text-muted">
                <ShieldAlert className="h-3 w-3 text-[#38bdf8]" />
                <span>Simulated record — persistent file viewer connects in next phase</span>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
