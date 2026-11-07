"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Image as ImageIcon,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
  UploadCloud,
  X,
} from "lucide-react";
import { DEMO_EVIDENCE } from "@/lib/mock-data";
import { formatDate, formatDateTime } from "@/lib/utils";
import { DemoBadge } from "@/components/common/demo-badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/common/search-input";
import { Select } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import type { EvidenceItem, EvidenceType, VerificationStatus } from "@/lib/types";

const EVIDENCE_TYPES: EvidenceType[] = [
  "Invoice",
  "Product Photo",
  "Packaging Photo",
  "Dispatch Record",
  "Chat Transcript",
  "Payment Receipt",
];

const VERIFICATION_STATUSES: VerificationStatus[] = [
  "Verified",
  "Pending",
  "Unverified",
];

interface ApiEvidenceItem {
  id: string;
  name: string;
  caseId: string;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  verification: string;
  sizeKb: number;
  extension: string;
}

export default function EvidencePage() {
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>(DEMO_EVIDENCE);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedCase, setSelectedCase] = useState<string>("All");
  const [inspectItem, setInspectItem] = useState<EvidenceItem | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/evidence?limit=100")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          const mapped: EvidenceItem[] = data.items.map((it: ApiEvidenceItem) => ({
            id: it.id,
            name: it.name,
            caseId: it.caseId,
            type: (it.type === "PHOTO" ? "Product Photo" : it.type === "INVOICE" ? "Invoice" : it.type === "TRACKING_INFO" ? "Dispatch Record" : "Invoice") as EvidenceType,
            uploadedBy: it.uploadedBy,
            uploadedAt: it.uploadedAt,
            verification: (it.verification === "VERIFIED" ? "Verified" : it.verification === "SUSPICIOUS" ? "Unverified" : "Pending") as VerificationStatus,
            sizeKb: it.sizeKb,
            extension: (it.extension as EvidenceItem["extension"]) || "pdf",
          }));
          setEvidenceList(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Derive all unique case IDs present in evidence
  const uniqueCases = useMemo(() => {
    return Array.from(new Set(evidenceList.map((e) => e.caseId))).sort();
  }, [evidenceList]);

  const filteredEvidence = useMemo(() => {
    return evidenceList.filter((item) => {
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const matches =
          item.name.toLowerCase().includes(q) ||
          item.caseId.toLowerCase().includes(q) ||
          item.uploadedBy.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (selectedType !== "All" && item.type !== selectedType) {
        return false;
      }

      if (selectedStatus !== "All" && item.verification !== selectedStatus) {
        return false;
      }

      if (selectedCase !== "All" && item.caseId !== selectedCase) {
        return false;
      }

      return true;
    });
  }, [evidenceList, query, selectedType, selectedStatus, selectedCase]);

  const resetFilters = () => {
    setQuery("");
    setSelectedType("All");
    setSelectedStatus("All");
    setSelectedCase("All");
  };

  const hasActiveFilters =
    query.trim() !== "" ||
    selectedType !== "All" ||
    selectedStatus !== "All" ||
    selectedCase !== "All";

  // Summary counts
  const stats = useMemo(() => {
    const verified = evidenceList.filter((e) => e.verification === "Verified").length;
    const pending = evidenceList.filter((e) => e.verification === "Pending").length;
    const unverified = evidenceList.filter((e) => e.verification === "Unverified").length;
    return { total: evidenceList.length, verified, pending, unverified };
  }, [evidenceList]);

  const getExtensionIcon = (ext: EvidenceItem["extension"]) => {
    switch (ext) {
      case "pdf":
        return <FileText className="h-4 w-4 text-[#fa8b8b]" />;
      case "png":
      case "jpg":
        return <ImageIcon className="h-4 w-4 text-[#a08bff]" />;
      case "csv":
        return <FileSpreadsheet className="h-4 w-4 text-[#34d399]" />;
      case "txt":
        return <MessageSquare className="h-4 w-4 text-[#38bdf8]" />;
      default:
        return <FileCheck className="h-4 w-4 text-subtle" />;
    }
  };

  const getVerificationBadge = (status: VerificationStatus) => {
    switch (status) {
      case "Verified":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[#6ee7b7]">
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-[color-mix(in_srgb,var(--color-warning)_15%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[#fcd34d]">
            <Clock className="h-3 w-3" />
            Pending Review
          </span>
        );
      case "Unverified":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-[color-mix(in_srgb,var(--color-danger)_15%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[#fa8b8b]">
            <ShieldAlert className="h-3 w-3" />
            Unverified
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[23px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">
              Evidence Library
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-[13.5px] text-subtle">
            Repository of buyer and seller supporting records, receipts and photos.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setUploadModalOpen(true)}
          icon={<UploadCloud className="h-4 w-4" />}
        >
          Upload Evidence
        </Button>
      </section>

      {/* KPI Stats overview */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rg-card p-4">
          <p className="text-[11.5px] font-medium text-subtle">Total Files</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-fg">{stats.total}</p>
          <span className="text-[11px] text-faint">Fictional demonstration items</span>
        </div>

        <div className="rg-card p-4">
          <p className="text-[11.5px] font-medium text-subtle">Verified Records</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[#34d399]">{stats.verified}</p>
          <span className="text-[11px] text-faint">Passed cryptographic check</span>
        </div>

        <div className="rg-card p-4">
          <p className="text-[11.5px] font-medium text-subtle">Pending Review</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[#fbbf24]">{stats.pending}</p>
          <span className="text-[11px] text-faint">Awaiting triage & matching</span>
        </div>

        <div className="rg-card p-4">
          <p className="text-[11.5px] font-medium text-subtle">Unverified Files</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[#fa8b8b]">{stats.unverified}</p>
          <span className="text-[11px] text-faint">Disputed or incomplete</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="rg-card flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search by file name, case ID or uploader…"
          className="w-full lg:max-w-md"
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Case Filter */}
          <Select
            value={selectedCase}
            onChange={(e) => setSelectedCase(e.target.value)}
            className="w-[calc(50%-0.25rem)] sm:w-36"
            aria-label="Filter by associated case"
          >
            <option value="All">All Cases</option>
            {uniqueCases.map((cId) => (
              <option key={cId} value={cId}>
                {cId}
              </option>
            ))}
          </Select>

          {/* Evidence Type Filter */}
          <Select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-[calc(50%-0.25rem)] sm:w-44"
            aria-label="Filter by evidence type"
          >
            <option value="All">All Document Types</option>
            {EVIDENCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>

          {/* Status Filter */}
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-[calc(50%-0.25rem)] sm:w-40"
            aria-label="Filter by verification status"
          >
            <option value="All">All Statuses</option>
            {VERIFICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              icon={<X className="h-3.5 w-3.5" />}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Evidence Table */}
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-[13px]">
            <thead className="border-b border-line bg-surface-2 text-[11.5px] font-semibold uppercase tracking-wider text-faint">
              <tr>
                <th className="py-3 pl-5 pr-4">File Name</th>
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">Evidence Type</th>
                <th className="py-3 px-4">Uploaded By</th>
                <th className="py-3 px-4">Date Added</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 pl-4 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredEvidence.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setInspectItem(item)}
                  className="cursor-pointer transition-colors hover:bg-surface-2/70"
                >
                  <td className="py-3.5 pl-5 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface-3">
                        {getExtensionIcon(item.extension)}
                      </div>
                      <span className="font-medium text-fg hover:text-[#b3a1ff] transition-colors truncate max-w-[200px]">
                        {item.name}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-medium">
                    <Link
                      href={`/cases/${item.caseId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#a08bff] hover:underline"
                    >
                      {item.caseId}
                    </Link>
                  </td>

                  <td className="py-3.5 px-4 text-muted">{item.type}</td>

                  <td className="py-3.5 px-4 text-fg">{item.uploadedBy}</td>

                  <td className="py-3.5 px-4 text-subtle whitespace-nowrap">
                    {formatDate(item.uploadedAt)}
                  </td>

                  <td className="py-3.5 px-4 text-faint tabular-nums font-mono">
                    {item.sizeKb > 1024
                      ? `${(item.sizeKb / 1024).toFixed(1)} MB`
                      : `${item.sizeKb} KB`}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {getVerificationBadge(item.verification)}
                  </td>

                  <td className="py-3.5 pl-4 pr-5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectItem(item);
                      }}
                      icon={<Eye className="h-3.5 w-3.5" />}
                    >
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEvidence.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-2 text-faint">
              <Filter className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-[14px] font-semibold text-fg">
              No Evidence Files Match Current Filters
            </h3>
            <p className="mt-1 max-w-sm text-[12.5px] text-faint">
              Try broadening your search term, clearing the case filter, or resetting document status.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="mt-4"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>

      {/* Inspect Item Modal */}
      <Dialog
        open={Boolean(inspectItem)}
        onClose={() => setInspectItem(null)}
        title={inspectItem ? inspectItem.name : "Evidence Item"}
        description="Fictional demonstration document attached to dispute investigation."
        size="md"
        footer={
          <div className="flex w-full items-center justify-between">
            <span className="text-[11.5px] text-faint">
              Demo Vault Item · No persistent download
            </span>
            <Button variant="secondary" size="sm" onClick={() => setInspectItem(null)}>
              Close
            </Button>
          </div>
        }
      >
        {inspectItem && (
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-3 rounded-md border border-line bg-surface-2 p-3 text-[12px]">
              <div>
                <span className="text-subtle">Case Associated:</span>{" "}
                <Link
                  href={`/cases/${inspectItem.caseId}`}
                  className="font-mono font-medium text-[#a08bff] hover:underline"
                >
                  {inspectItem.caseId}
                </Link>
              </div>
              <div>
                <span className="text-subtle">Evidence Category:</span>{" "}
                <span className="font-medium text-fg">{inspectItem.type}</span>
              </div>
              <div>
                <span className="text-subtle">Uploaded By:</span>{" "}
                <span className="font-medium text-fg">{inspectItem.uploadedBy}</span>
              </div>
              <div>
                <span className="text-subtle">Timestamp:</span>{" "}
                <span className="font-medium text-fg">{formatDateTime(inspectItem.uploadedAt)}</span>
              </div>
            </div>

            {/* Document visual mockup */}
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-line bg-[#040711] p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line-2 bg-surface-2">
                {getExtensionIcon(inspectItem.extension)}
              </div>
              <p className="mt-3 text-[14px] font-semibold text-fg">{inspectItem.name}</p>
              <p className="mt-1 text-[12px] text-faint">
                Simulated {inspectItem.extension.toUpperCase()} artifact ({inspectItem.sizeKb} KB)
              </p>

              <div className="mt-4 flex items-center gap-2">
                {getVerificationBadge(inspectItem.verification)}
                <span className="text-[11px] text-faint">· SHA-256 Checksum Pending</span>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Elegant Upcoming Upload Modal Placeholder */}
      <Dialog
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Evidence Upload Pipeline"
        description="Upcoming multi-party upload and cryptographic attestation functionality."
        size="md"
        footer={
          <Button variant="primary" size="sm" onClick={() => setUploadModalOpen(false)}>
            Understood
          </Button>
        }
      >
        <div className="flex flex-col gap-4 py-3">
          <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-brand)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)] p-4 text-[13px] leading-relaxed text-muted">
            <p className="font-semibold text-fg">Evidence Ingestion Pipeline (Phase 2)</p>
            <p className="mt-1 text-[12px]">
              Direct file storage to persistent object stores (S3/GCS) with automated OCR document extraction, tamper-evident EXIF analysis, and dispute packaging will become available in the next engineering phase.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-md border border-line bg-surface-2 p-3 text-[12px] text-subtle">
            <span className="font-medium text-fg">Planned Ingestion Capabilities:</span>
            <ul className="list-inside list-disc space-y-1 text-faint text-[11.5px]">
              <li>PDF Invoice text parsing & tax invoice number validation</li>
              <li>Shipping label barcode & carrier dispatch reconciliation</li>
              <li>Photographic damage detection via multimodal vision models</li>
              <li>Customer service chat export indexing & timestamp verification</li>
            </ul>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
