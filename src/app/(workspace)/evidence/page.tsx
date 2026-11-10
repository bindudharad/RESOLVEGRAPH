"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Image as ImageIcon,
  MessageSquare,
  RotateCcw,
  UploadCloud,
  X,
  LayoutGrid,
  List,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Copy,
  Check,
} from "lucide-react";
import { DEMO_EVIDENCE } from "@/lib/mock-data";
import { formatDate, formatDateTime } from "@/lib/utils";
import { DemoBadge } from "@/components/common/demo-badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/common/search-input";
import { Select } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { Chip } from "@/components/ui/chip";
import { useToast } from "@/components/common/toast";
import { TiltCard3D } from "@/components/3d/tilt-card-3d";
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
  sha256?: string;
}

export default function EvidencePage() {
  const { toast } = useToast();
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>(DEMO_EVIDENCE);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedCase, setSelectedCase] = useState<string>("All");
  const [inspectItem, setInspectItem] = useState<EvidenceItem | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [copiedHash, setCopiedHash] = useState(false);

  // Upload Form State
  const [uploadCaseId, setUploadCaseId] = useState("RG-1001");
  const [uploadType, setUploadType] = useState("INVOICE");
  const [uploadVisibility, setUploadVisibility] = useState("SHARED_WITH_PARTICIPANTS");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadEvidence = () => {
    fetch("/api/evidence?limit=100")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          const mapped: EvidenceItem[] = data.items.map((it: ApiEvidenceItem) => ({
            id: it.id,
            name: it.name,
            caseId: it.caseId,
            type: (it.type === "PHOTO" ? "Product Photo" : it.type === "INVOICE" ? "Invoice" : it.type === "TRACKING_INFO" ? "Dispatch Record" : it.type === "CHAT_LOG" ? "Chat Transcript" : "Invoice") as EvidenceType,
            uploadedBy: it.uploadedBy,
            uploadedAt: it.uploadedAt,
            verification: (it.verification === "VERIFIED" ? "Verified" : it.verification === "SUSPICIOUS" ? "Unverified" : "Pending") as VerificationStatus,
            sizeKb: it.sizeKb,
            extension: (it.extension as EvidenceItem["extension"]) || "pdf",
            sha256: it.sha256,
          }));
          setEvidenceList(mapped);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadEvidence();
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
        return <Chip variant="verified">Verified</Chip>;
      case "Pending":
        return <Chip variant="missing">Pending Review</Chip>;
      case "Unverified":
        return <Chip variant="danger">Unverified</Chip>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--line)]/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-[var(--ink)]">
              Evidence <span className="italic text-[var(--accent)] font-semibold">Vault</span> & Intelligence
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[var(--ink-2)]">
            Universal cryptographically hashed vault of buyer receipts, packaging photos, dispatch manifests, and unboxing challenge recordings.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setUploadModalOpen(true)}
          icon={<UploadCloud className="h-4 w-4" />}
          className="shadow-sm font-semibold text-xs px-4 h-9"
        >
          Upload Evidence
        </Button>
      </section>

      {/* KPI Stats overview with 3D Tilt */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <TiltCard3D maxTilt={8} depth={15} glowColor="rgba(99, 112, 245, 0.2)">
          <div className="paper-dark rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm h-full flex flex-col justify-between">
            <div>
              <p className="text-[11.5px] font-mono uppercase font-semibold text-[var(--ink-2)]">Total Files</p>
              <p className="mt-1 text-[24px] font-bold tabular-nums font-mono text-[var(--ink)]">{stats.total}</p>
            </div>
            <span className="text-[10.5px] text-[var(--ink-3)] font-mono pt-2 border-t border-[var(--line)]/50 mt-2">Fictional demonstration items</span>
          </div>
        </TiltCard3D>

        <TiltCard3D maxTilt={8} depth={15} glowColor="rgba(16, 185, 129, 0.22)">
          <div className="paper-dark rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm h-full flex flex-col justify-between">
            <div>
              <p className="text-[11.5px] font-mono uppercase font-semibold text-emerald-400">Verified Records</p>
              <p className="mt-1 text-[24px] font-bold tabular-nums font-mono text-emerald-400">{stats.verified}</p>
            </div>
            <span className="text-[10.5px] text-[var(--ink-3)] font-mono pt-2 border-t border-[var(--line)]/50 mt-2">Passed cryptographic check</span>
          </div>
        </TiltCard3D>

        <TiltCard3D maxTilt={8} depth={15} glowColor="rgba(245, 158, 11, 0.22)">
          <div className="paper-dark rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm h-full flex flex-col justify-between">
            <div>
              <p className="text-[11.5px] font-mono uppercase font-semibold text-amber-400">Pending Review</p>
              <p className="mt-1 text-[24px] font-bold tabular-nums font-mono text-amber-400">{stats.pending}</p>
            </div>
            <span className="text-[10.5px] text-[var(--ink-3)] font-mono pt-2 border-t border-[var(--line)]/50 mt-2">Awaiting triage & matching</span>
          </div>
        </TiltCard3D>

        <TiltCard3D maxTilt={8} depth={15} glowColor="rgba(244, 63, 94, 0.22)">
          <div className="paper-dark rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm h-full flex flex-col justify-between">
            <div>
              <p className="text-[11.5px] font-mono uppercase font-semibold text-rose-400">Unverified Files</p>
              <p className="mt-1 text-[24px] font-bold tabular-nums font-mono text-rose-400">{stats.unverified}</p>
            </div>
            <span className="text-[10.5px] text-[var(--ink-3)] font-mono pt-2 border-t border-[var(--line)]/50 mt-2">Disputed or incomplete</span>
          </div>
        </TiltCard3D>
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

          {/* Grid / Table View Switcher */}
          <div className="flex items-center rounded-lg border border-line bg-surface-2 p-0.5 ml-auto">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === "grid" ? "bg-surface text-fg shadow-xs" : "text-subtle hover:text-fg"
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === "table" ? "bg-surface text-fg shadow-xs" : "text-subtle hover:text-fg"
              }`}
              title="Detailed Table View"
            >
              <List className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Evidence Grid, Table, or Empty State */}
      {filteredEvidence.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg border border-line bg-surface">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-2 text-subtle">
            <Filter className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-[14px] font-semibold text-fg">
            No Evidence Files Match Current Filters
          </h3>
          <p className="mt-1 max-w-sm text-[12.5px] text-subtle">
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
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEvidence.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setInspectItem(item);
                setZoomLevel(1);
                setRotation(0);
              }}
              className="group cursor-pointer rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 transition-all duration-200 hover:border-[var(--accent)] hover:shadow-lg hover:-translate-y-1 paper-dark relative overflow-hidden"
            >
              {/* Laser scan line on unverified/pending files */}
              {item.verification !== "Verified" && <div className="scan-y opacity-60" />}

              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[var(--ink)]">
                  {item.caseId}
                </span>
                {getVerificationBadge(item.verification)}
              </div>

              <div className="mt-3 flex h-32 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/50 transition-colors group-hover:bg-[var(--surface-2)] shadow-inner">
                <div className="flex flex-col items-center gap-1.5 text-center p-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)] border border-[var(--line)] shadow-xs">
                    {getExtensionIcon(item.extension)}
                  </div>
                  <span className="text-[10.5px] font-mono uppercase tracking-wider text-[var(--ink-3)] font-semibold">
                    {item.extension.toUpperCase()} &bull; {item.sizeKb > 1024 ? `${(item.sizeKb / 1024).toFixed(1)}MB` : `${item.sizeKb}KB`}
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <h4 className="text-[13px] font-semibold text-[var(--ink)] truncate" title={item.name}>
                  {item.name}
                </h4>
                <div className="mt-1 flex items-center justify-between text-[11.5px] text-[var(--ink-3)] font-mono">
                  <span>{item.type}</span>
                  <span>{formatDate(item.uploadedAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
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
                    onClick={() => {
                      setInspectItem(item);
                      setZoomLevel(1);
                      setRotation(0);
                    }}
                    className="cursor-pointer transition-colors hover:bg-surface-2/70"
                  >
                    <td className="py-3.5 pl-5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface-3">
                          {getExtensionIcon(item.extension)}
                        </div>
                        <span className="font-medium text-fg hover:text-amber-400 transition-colors truncate max-w-[200px]">
                          {item.name}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium">
                      <Link
                        href={`/cases/${item.caseId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-amber-400 hover:underline"
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
                          setZoomLevel(1);
                          setRotation(0);
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
        </div>
      )}

      {/* Inspect Item Modal with Zoom, Pan, Rotate, and Extraction Overlays */}
      <Dialog
        open={Boolean(inspectItem)}
        onClose={() => setInspectItem(null)}
        title={inspectItem ? inspectItem.name : "Evidence Item"}
        description="Forensic bilateral evidence artifact with bounding box fact extraction."
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                icon={<ZoomOut className="h-3.5 w-3.5" />}
              >
                Zoom Out
              </Button>
              <span className="font-mono text-xs text-subtle px-1">
                {(zoomLevel * 100).toFixed(0)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                icon={<ZoomIn className="h-3.5 w-3.5" />}
              >
                Zoom In
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                icon={<RotateCw className="h-3.5 w-3.5" />}
              >
                Rotate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setZoomLevel(1);
                  setRotation(0);
                }}
              >
                Reset
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {inspectItem && (
                <a
                  href={`/api/evidence/${inspectItem.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-fg hover:bg-surface-2 transition-colors"
                >
                  Download Evidence
                </a>
              )}
              <Button variant="secondary" size="sm" onClick={() => setInspectItem(null)}>
                Close
              </Button>
            </div>
          </div>
        }
      >
        {inspectItem && (
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-md border border-line bg-surface-2 p-3 text-[12px]">
              <div>
                <span className="text-subtle">Case Associated:</span>{" "}
                <Link
                  href={`/cases/${inspectItem.caseId}`}
                  className="font-mono font-medium text-[var(--accent)] hover:underline"
                >
                  {inspectItem.caseId}
                </Link>
              </div>
              <div>
                <span className="text-subtle">Type:</span>{" "}
                <span className="font-medium text-fg">{inspectItem.type}</span>
              </div>
              <div>
                <span className="text-subtle">Uploaded By:</span>{" "}
                <span className="font-medium text-fg">{inspectItem.uploadedBy}</span>
              </div>
              <div>
                <span className="text-subtle">Timestamp:</span>{" "}
                <span className="font-medium text-fg font-mono">{formatDateTime(inspectItem.uploadedAt)}</span>
              </div>
            </div>

            {/* Document visual preview with transform viewport */}
            <div className="relative min-h-[300px] max-h-[420px] overflow-hidden rounded-lg border border-line bg-surface flex items-center justify-center p-6">
              <div
                className="transition-transform duration-200 flex flex-col items-center justify-center relative"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface-2">
                  {getExtensionIcon(inspectItem.extension)}
                </div>
                <p className="mt-3 text-[14px] font-semibold text-fg">{inspectItem.name}</p>
                <p className="mt-1 text-[12px] text-subtle font-mono">
                  {inspectItem.extension.toUpperCase()} document ({inspectItem.sizeKb} KB)
                </p>

                {/* Bounding box fact extraction overlays */}
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <div className="rounded border-2 border-dashed border-[var(--contested)] bg-[color-mix(in_srgb,var(--contested)_10%,transparent)] px-2.5 py-1 text-[11px] font-mono text-[var(--contested)]">
                    Extracted Serial: APX-512-V2
                  </div>
                  <div className="rounded border-2 border-dashed border-[var(--buyer)] bg-[color-mix(in_srgb,var(--buyer)_10%,transparent)] px-2.5 py-1 text-[11px] font-mono text-[var(--buyer)]">
                    Capacity Label: 512GB NVMe
                  </div>
                </div>
              </div>
            </div>

            {/* SHA-256 Tamper-Proof Hash Row */}
            <div className="flex items-center justify-between rounded-lg border border-line bg-surface-2 p-3 text-xs">
              <div className="flex items-center gap-2">
                {getVerificationBadge(inspectItem.verification)}
                <span className="text-subtle">Tamper-evident verification hash:</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-fg">
                <span className="truncate max-w-[280px]">
                  {inspectItem.sha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inspectItem.sha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
                    setCopiedHash(true);
                    setTimeout(() => setCopiedHash(false), 2000);
                  }}
                  className="rounded p-1 hover:bg-surface text-subtle hover:text-fg"
                  title="Copy SHA-256 hash"
                >
                  {copiedHash ? <Check className="h-3.5 w-3.5 text-[var(--agreed)]" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Real Multipart Evidence Ingestion Dialog */}
      <Dialog
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Dispute Evidence"
        description="Attach authenticated documents, packing slips, photographs or invoices with SHA-256 integrity checks."
        size="md"
        footer={null}
      >
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!uploadFile) {
            setUploadError("Please choose a file to upload.");
            return;
          }
          setIsUploading(true);
          setUploadError(null);
          try {
            const formData = new FormData();
            formData.append("file", uploadFile);
            formData.append("evidenceType", uploadType);
            formData.append("visibility", uploadVisibility);
            formData.append("description", uploadDescription || "Uploaded via Evidence Library");

            const res = await fetch(`/api/cases/${uploadCaseId}/evidence`, {
              method: "POST",
              body: formData,
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || "Evidence upload failed.");
            }

            toast({
              tone: "success",
              title: "Evidence Uploaded & Verified",
              description: `Stored to private vault and registered SHA-256 hash for case ${uploadCaseId}.`,
            });

            setUploadModalOpen(false);
            setUploadFile(null);
            setUploadDescription("");
            loadEvidence();
          } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Failed to upload file");
          } finally {
            setIsUploading(false);
          }
        }} className="flex flex-col gap-4 py-3 text-xs">
          {uploadError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-300">
              {uploadError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-fg">Dispute Case Association</label>
            <select
              value={uploadCaseId}
              onChange={(e) => setUploadCaseId(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-fg focus:border-[var(--color-brand)] focus:outline-none"
            >
              {uniqueCases.map((cId) => (
                <option key={cId} value={cId}>{cId}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-fg">Evidence Category</label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-fg focus:border-[var(--color-brand)] focus:outline-none"
              >
                <option value="INVOICE">Tax Invoice</option>
                <option value="PHOTO">Product Photo</option>
                <option value="PACKAGING">Packaging Capture</option>
                <option value="DISPATCH_RECORD">Dispatch Waybill</option>
                <option value="CHAT_LOG">Chat Transcript</option>
                <option value="PAYMENT_RECEIPT">Payment Receipt</option>
                <option value="OTHER">Other Documentation</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-fg">Visibility Boundary</label>
              <select
                value={uploadVisibility}
                onChange={(e) => setUploadVisibility(e.target.value)}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-fg focus:border-[var(--color-brand)] focus:outline-none"
              >
                <option value="SHARED_WITH_PARTICIPANTS">Shared (Buyer & Merchant)</option>
                <option value="MERCHANT_ONLY">Merchant Only</option>
                <option value="BUYER_ONLY">Buyer Only</option>
                <option value="INTERNAL">Internal Manager Only</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-fg">Select Document / Capture</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="rounded-lg border border-dashed border-line bg-surface-2 p-3 text-fg file:mr-3 file:rounded file:border-0 file:bg-[var(--color-brand-solid)] file:px-3 file:py-1 file:text-xs file:font-medium file:text-white hover:file:opacity-90"
            />
            <span className="text-[11px] text-faint">Supports PDF, JPEG, and PNG up to 25MB with cryptographic hash attestation.</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-fg">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Certified shipping label and barcode scan from warehouse"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-fg placeholder:text-muted focus:border-[var(--color-brand)] focus:outline-none"
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2.5 pt-2 border-t border-line">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUploadModalOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isUploading || !uploadFile}
            >
              {isUploading ? "Verifying & Uploading..." : "Upload & Attest Hash"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
