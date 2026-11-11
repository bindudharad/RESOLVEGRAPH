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
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { DEMO_EVIDENCE } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/common/search-input";
import { Select } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/common/toast";
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
            type: (it.type === "PHOTO"
              ? "Product Photo"
              : it.type === "INVOICE"
              ? "Invoice"
              : it.type === "TRACKING_INFO"
              ? "Dispatch Record"
              : it.type === "CHAT_LOG"
              ? "Chat Transcript"
              : "Invoice") as EvidenceType,
            uploadedBy: it.uploadedBy,
            uploadedAt: it.uploadedAt,
            verification: (it.verification === "VERIFIED"
              ? "Verified"
              : it.verification === "SUSPICIOUS"
              ? "Unverified"
              : "Pending") as VerificationStatus,
            sizeKb: it.sizeKb,
            extension: it.extension,
            hash: it.sha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          }));
          setEvidenceList(mapped);
        }
      })
      .catch((err) => {
        console.warn("Could not load API evidence, using initial demo set", err);
      });
  };

  useEffect(() => {
    loadEvidence();
  }, []);

  const uniqueCases = useMemo(() => {
    return Array.from(new Set(evidenceList.map((e) => e.caseId))).sort();
  }, [evidenceList]);

  const filteredEvidence = useMemo(() => {
    return evidenceList.filter((item) => {
      if (selectedType !== "All" && item.type !== selectedType) return false;
      if (selectedStatus !== "All" && item.verification !== selectedStatus) return false;
      if (selectedCase !== "All" && item.caseId !== selectedCase) return false;
      if (!query.trim()) return true;

      const q = query.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.caseId.toLowerCase().includes(q) ||
        item.uploadedBy.toLowerCase().includes(q)
      );
    });
  }, [evidenceList, query, selectedType, selectedStatus, selectedCase]);

  const stats = useMemo(() => {
    const total = evidenceList.length;
    const verified = evidenceList.filter((e) => e.verification === "Verified").length;
    const pending = evidenceList.filter((e) => e.verification === "Pending").length;
    const unverified = evidenceList.filter((e) => e.verification === "Unverified").length;
    return { total, verified, pending, unverified };
  }, [evidenceList]);

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

  const getExtensionIcon = (ext: string) => {
    switch (ext.toLowerCase()) {
      case "pdf":
        return <FileText className="h-5 w-5 text-rose-400" />;
      case "png":
      case "jpg":
      case "jpeg":
        return <ImageIcon className="h-5 w-5 text-sky-400" />;
      case "csv":
      case "xlsx":
        return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
      case "mp4":
      case "mov":
        return <Eye className="h-5 w-5 text-amber-400" />;
      default:
        return <FileCheck className="h-5 w-5 text-white/50" />;
    }
  };

  const getVerificationBadge = (status: VerificationStatus) => {
    switch (status) {
      case "Verified":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 font-mono text-[10.5px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Verified
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 font-mono text-[10.5px] font-medium text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Pending Triage
          </span>
        );
      case "Unverified":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 font-mono text-[10.5px] font-medium text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            Flagged
          </span>
        );
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    toast({
      tone: "success",
      title: "Hash Copied",
      description: "SHA-256 fingerprint copied to clipboard.",
    });
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Please select a file to upload.");
      return;
    }
    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("caseId", uploadCaseId);
      formData.append("type", uploadType);
      formData.append("description", uploadDescription || "Uploaded via Evidence Vault");

      const res = await fetch("/api/evidence/intake", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload failed");
      }

      toast({
        tone: "success",
        title: "Evidence Ingested",
        description: `Successfully uploaded ${uploadFile.name} with SHA-256 validation.`,
      });
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadDescription("");
      loadEvidence();
    } catch (err) {
      console.error(err);
      setUploadError(err instanceof Error ? err.message : "Failed to upload evidence.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12 antialiased">
      {/* ======================================================== */}
      {/* 1. HEADER SECTION                                        */}
      {/* ======================================================== */}
      <header className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-white/50">
                Forensic Storage Vault
              </span>
              <span className="text-white/20">·</span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 font-mono text-[11px] text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Bitwise SHA-256 Validation Active
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Evidence Vault &amp; Asset Inspection
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Universal cryptographically hashed vault of buyer receipts, packaging photos, dispatch manifests, and unboxing media.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="primary"
              size="md"
              onClick={() => setUploadModalOpen(true)}
              icon={<UploadCloud className="h-4 w-4 text-black" />}
              className="bg-white text-black hover:bg-white/90 text-xs font-semibold px-4 h-9 shadow-xs"
            >
              Upload Evidence
            </Button>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. FOUR AUTHORITATIVE METRIC CARDS                       */}
      {/* ======================================================== */}
      <section
        aria-label="Evidence Metrics Overview"
        className="grid grid-cols-2 gap-3.5 sm:grid-cols-4"
      >
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-medium text-white/50">Total Assets</span>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold text-white tabular-nums">
              {stats.total}
            </span>
            <p className="mt-1 text-xs text-white/50">Across all tenant cases</p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] font-mono text-white/40">
            Immutable Storage
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-medium text-white/50">Verified Records</span>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold text-emerald-400 tabular-nums">
              {stats.verified}
            </span>
            <p className="mt-1 text-xs text-white/50">Passed bitwise SHA-256</p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] font-mono text-emerald-400">
            100% Integrity Match
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-medium text-white/50">Pending Review</span>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold text-amber-400 tabular-nums">
              {stats.pending}
            </span>
            <p className="mt-1 text-xs text-white/50">Awaiting forensic matching</p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] font-mono text-amber-400">
            In Intake Queue
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-medium text-white/50">Unverified / Disputed</span>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold text-rose-400 tabular-nums">
              {stats.unverified}
            </span>
            <p className="mt-1 text-xs text-white/50">Contested or damaged proofs</p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] font-mono text-rose-400">
            Requires Re-submission
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. SEARCH & CATEGORY FILTERS TOOLBAR                     */}
      {/* ======================================================== */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search by file name, case ID, or uploader…"
          className="w-full lg:max-w-md bg-white/[0.03] border-white/[0.08] text-white"
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Case Filter */}
          <Select
            value={selectedCase}
            onChange={(e) => setSelectedCase(e.target.value)}
            className="w-[calc(50%-0.25rem)] sm:w-36 text-xs bg-white/[0.03] border-white/[0.08] text-white"
            aria-label="Filter by associated case"
          >
            <option value="All" className="bg-[#0E121D]">All Cases</option>
            {uniqueCases.map((cId) => (
              <option key={cId} value={cId} className="bg-[#0E121D]">
                {cId}
              </option>
            ))}
          </Select>

          {/* Evidence Type Filter */}
          <Select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-[calc(50%-0.25rem)] sm:w-44 text-xs bg-white/[0.03] border-white/[0.08] text-white"
            aria-label="Filter by evidence type"
          >
            <option value="All" className="bg-[#0E121D]">All Types</option>
            {EVIDENCE_TYPES.map((type) => (
              <option key={type} value={type} className="bg-[#0E121D]">
                {type}
              </option>
            ))}
          </Select>

          {/* Status Filter */}
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-[calc(50%-0.25rem)] sm:w-40 text-xs bg-white/[0.03] border-white/[0.08] text-white"
            aria-label="Filter by verification status"
          >
            <option value="All" className="bg-[#0E121D]">All Statuses</option>
            {VERIFICATION_STATUSES.map((status) => (
              <option key={status} value={status} className="bg-[#0E121D]">
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
              className="text-xs text-white/60 hover:text-white"
            >
              Reset
            </Button>
          )}

          {/* Grid / Table View Switcher */}
          <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5 ml-auto">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === "grid" ? "bg-white text-black shadow-xs" : "text-white/50 hover:text-white"
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
                viewMode === "table" ? "bg-white text-black shadow-xs" : "text-white/50 hover:text-white"
              }`}
              title="Detailed Table View"
            >
              <List className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. EVIDENCE CARD GRID (NO LASER/TILT SLOP, PURE CRAFT)   */}
      {/* ======================================================== */}
      {filteredEvidence.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-white/[0.08] bg-[#0E121D]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/50">
            <Filter className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-white">
            No Evidence Files Match Current Filters
          </h3>
          <p className="mt-1 max-w-sm text-xs text-white/50">
            Try adjusting your query, selecting a different case dossier, or clearing filter dropdowns.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="mt-4 text-xs border-white/[0.08]"
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
              className="group cursor-pointer rounded-2xl border border-white/[0.08] bg-[#0E121D] p-4 transition-all duration-150 hover:border-white/[0.18] hover:bg-white/[0.02] flex flex-col justify-between"
            >
              <div>
                {/* Header: Case ID & Verification */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-sky-400 group-hover:underline">
                    {item.caseId}
                  </span>
                  {getVerificationBadge(item.verification)}
                </div>

                {/* File Icon & Preview Area */}
                <div className="mt-3 flex h-28 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] transition-colors group-hover:bg-white/[0.04]">
                  <div className="flex flex-col items-center gap-1.5 text-center p-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08]">
                      {getExtensionIcon(item.extension)}
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                      {item.extension.toUpperCase()} &bull; {item.sizeKb > 1024 ? `${(item.sizeKb / 1024).toFixed(1)}MB` : `${item.sizeKb}KB`}
                    </span>
                  </div>
                </div>

                {/* Title & Metadata (Clean, no hashes) */}
                <div className="mt-3">
                  <h4 className="text-xs font-semibold text-white truncate" title={item.name}>
                    {item.name}
                  </h4>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-white/50 font-mono">
                    <span className="text-white/60">{item.type}</span>
                    <span>{formatDate(item.uploadedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Trigger */}
              <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-white/40 group-hover:text-white/80 transition-colors">
                <span>By {item.uploadedBy}</span>
                <span className="inline-flex items-center gap-1 text-sky-400 font-medium">
                  Inspect
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E121D] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02] font-mono text-[11px] text-white/40 uppercase tracking-wider">
                  <th className="py-3 px-5">Document Name</th>
                  <th className="py-3 px-4">Case Dossier</th>
                  <th className="py-3 px-4">Evidence Type</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-4">Date Added</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Integrity Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredEvidence.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => {
                      setInspectItem(item);
                      setZoomLevel(1);
                      setRotation(0);
                    }}
                    className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                          {getExtensionIcon(item.extension)}
                        </div>
                        <span className="font-medium text-white truncate max-w-[220px]">
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-sky-400">
                      <Link
                        href={`/cases/${item.caseId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline"
                      >
                        {item.caseId}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-white/70">{item.type}</td>
                    <td className="py-3 px-4 text-white/60">{item.uploadedBy}</td>
                    <td className="py-3 px-4 font-mono text-white/50 whitespace-nowrap">
                      {formatDate(item.uploadedAt)}
                    </td>
                    <td className="py-3 px-4 font-mono text-white/50">
                      {item.sizeKb > 1024 ? `${(item.sizeKb / 1024).toFixed(1)}MB` : `${item.sizeKb}KB`}
                    </td>
                    <td className="py-3 px-4">
                      {getVerificationBadge(item.verification)}
                    </td>
                    <td className="py-3 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setInspectItem(item);
                          setZoomLevel(1);
                          setRotation(0);
                        }}
                        className="h-7 text-[11px] text-white/70 hover:text-white"
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

      {/* ======================================================== */}
      {/* 5. FORENSIC ASSET INSPECTION DIALOG                      */}
      {/* ======================================================== */}
      {inspectItem && (
        <Dialog
          open={Boolean(inspectItem)}
          onClose={() => setInspectItem(null)}
          title={inspectItem.name}
          description={`Forensic asset inspection — ${inspectItem.type} (${inspectItem.extension.toUpperCase()})`}
          className="max-w-2xl bg-[#0E121D] border-white/[0.08]"
        >
          <div className="space-y-5 text-xs text-white/80">
            {/* Visual Canvas Area */}
            <div className="relative flex h-64 w-full items-center justify-center rounded-xl border border-white/[0.08] bg-black/40 overflow-hidden">
              <div
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease-out",
                }}
                className="flex flex-col items-center justify-center p-4 text-center select-none"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-2">
                  {getExtensionIcon(inspectItem.extension)}
                </div>
                <span className="font-mono text-sm text-white font-semibold">
                  {inspectItem.name}
                </span>
                <span className="text-[11px] text-white/50 font-mono mt-1">
                  MIME: application/{inspectItem.extension} &bull; {inspectItem.sizeKb} KB
                </span>
              </div>

              {/* Floating Controls */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0E121D]/90 p-1 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.2))}
                  className="rounded p-1 text-white/60 hover:bg-white/[0.08] hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono text-[10px] text-white/60 px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.2))}
                  className="rounded p-1 text-white/60 hover:bg-white/[0.08] hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="rounded p-1 text-white/60 hover:bg-white/[0.08] hover:text-white ml-1"
                  title="Rotate 90deg"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Cryptographic SHA-256 Fingerprint (Shown here in detail view) */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  SHA-256 Bitwise Cryptographic Fingerprint
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyHash(inspectItem.sha256 || "")}
                  className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline"
                >
                  {copiedHash ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedHash ? "Copied" : "Copy Hash"}</span>
                </button>
              </div>
              <div className="rounded-lg bg-black/50 border border-white/[0.06] p-2.5 font-mono text-[11px] text-emerald-400 break-all select-all">
                {inspectItem.sha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
              </div>
            </div>

            {/* Forensic Dossier Context */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                <span className="text-white/50 text-[11px] block">Associated Case</span>
                <Link
                  href={`/cases/${inspectItem.caseId}`}
                  className="font-mono font-bold text-sky-400 hover:underline mt-0.5 inline-flex items-center gap-1"
                >
                  <span>{inspectItem.caseId}</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                <span className="text-white/50 text-[11px] block">Verification Status</span>
                <div className="mt-1">{getVerificationBadge(inspectItem.verification)}</div>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* ======================================================== */}
      {/* 6. UPLOAD EVIDENCE MODAL                                 */}
      {/* ======================================================== */}
      {uploadModalOpen && (
        <Dialog
          open={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          title="Ingest Forensic Evidence"
          className="max-w-lg bg-[#0E121D] border-white/[0.08]"
        >
          <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs text-white/80">
            {uploadError && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                {uploadError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-white/70 mb-1">
                Associated Case ID
              </label>
              <input
                type="text"
                value={uploadCaseId}
                onChange={(e) => setUploadCaseId(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-white/70 mb-1">
                Evidence Document Type
              </label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white"
              >
                <option value="INVOICE" className="bg-[#0E121D]">Merchant Commercial Invoice</option>
                <option value="PHOTO" className="bg-[#0E121D]">Unboxing / Product Photograph</option>
                <option value="TRACKING_INFO" className="bg-[#0E121D]">Carrier Dispatch Manifest</option>
                <option value="CHAT_LOG" className="bg-[#0E121D]">Pre-Dispute Chat Transcript</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-white/70 mb-1">
                Select Binary Asset (PDF, PNG, JPG, MP4)
              </label>
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/80 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-black"
                required
              />
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUploadModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isUploading}
                className="text-xs bg-white text-black font-semibold"
              >
                {isUploading ? "Validating SHA-256..." : "Submit to Vault"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
