"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FolderOpen,
  Search,
  Plus,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Calendar,
  AlertCircle,
  ShoppingBag,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { BuyerComplaintSummaryCard } from "@/server/services/buyer-tracking.service";
import {
  groupComplaintsByDate,
  formatComplaintTimestamp,
  formatPurchaseAmount,
} from "@/lib/buyer-date-grouping";
import { CustomerStatusBadge } from "./customer-status-badge";
import { BuyerCaseDetail } from "./buyer-case-detail";
import { CustomerNotificationBell } from "@/components/common/notification-panel";
import { CustomerAccountMenu } from "./customer-account-menu";

export interface BuyerComplaintRow {
  id: string;
  dbId?: string;
  title: string;
  platform: string;
  orderId: string;
  productName: string;
  category: string;
  amount: number;
  currency: string;
  requestedRemedy: string;
  status: string;
  rawStatus: string;
  rawStage?: string;
  createdAt: string;
}

export function mapBackendStatusToCustomerStatus(
  rawStatus: string,
  rawStage?: string
): { label: string; tone: "blue" | "amber" | "purple" | "indigo" | "emerald" | "rose" } {
  const s = (rawStatus || "").toUpperCase();
  const stage = (rawStage || "").toUpperCase();

  if (s === "SUBMITTED" || s === "DRAFT" || s === "INTAKE") {
    return { label: "Submitted", tone: "blue" };
  }
  if (s === "EVIDENCE_SUBMITTED") {
    return { label: "Reviewing evidence", tone: "amber" };
  }
  if (s === "EVIDENCE_REQUESTED") {
    return { label: "Waiting for merchant response", tone: "amber" };
  }
  if (stage === "RESOLUTION_PROPOSED" || s === "PROPOSAL_PENDING" || s === "RESOLUTION_PROPOSED") {
    return { label: "Resolution proposed", tone: "indigo" };
  }
  if (s === "APPROVAL_PENDING" || s === "AWAITING_APPROVAL") {
    return { label: "Awaiting approval", tone: "indigo" };
  }
  if (s === "EXECUTING_REFUND" || s === "REFUND_PENDING") {
    return { label: "Refund in progress", tone: "blue" };
  }
  if (s === "EXECUTING_REPLACEMENT") {
    return { label: "Replacement in progress", tone: "blue" };
  }
  if (s === "UNDER_ANALYSIS" || s === "UNDER_INVESTIGATION" || s === "BERR_ANALYSIS") {
    return { label: "Under investigation", tone: "purple" };
  }
  if (s === "RESOLVED" || s === "CLOSED" || s === "ARCHIVED") {
    return { label: "Resolved", tone: "emerald" };
  }
  if (s === "IN_REVIEW" || s === "ESCALATED") {
    return { label: "Escalated", tone: "rose" };
  }
  return { label: "Under investigation", tone: "purple" };
}

export function parseComplaintDetails(c: {
  id?: string;
  caseNumber?: string;
  title?: string;
  description?: string;
  category?: string;
  status?: string;
  stage?: string;
  amount?: number;
  amountMinor?: number;
  currency?: string;
  createdAt?: string | Date;
  claims?: Array<{ requestedRemedy?: string; statement?: string }>;
  events?: Array<{ eventType?: string; metadataJson?: string | null }>;
  expectedProduct?: string;
}): BuyerComplaintRow {
  const caseId = c.caseNumber || c.id || "RG-1001";
  const desc = c.description || "";
  let platform = "Online Store";
  let orderId = caseId;
  let productName = c.expectedProduct || c.title || "Purchased Product";
  let originalCategory = c.category || "Other issue";
  let remedy = "Either is acceptable";

  const createdEvt = c.events?.find((e) => e.eventType === "CASE_CREATED" && e.metadataJson);
  if (createdEvt?.metadataJson) {
    try {
      const meta = JSON.parse(createdEvt.metadataJson) as Record<string, unknown>;
      if (typeof meta.platform === "string" && meta.platform.trim()) platform = meta.platform.trim();
      if (typeof meta.orderId === "string" && meta.orderId.trim()) orderId = meta.orderId.trim();
      if (typeof meta.productName === "string" && meta.productName.trim()) productName = meta.productName.trim();
      if (typeof meta.originalCategory === "string" && meta.originalCategory.trim()) originalCategory = meta.originalCategory.trim();
      if (typeof meta.requestedRemedy === "string") {
        const raw = meta.requestedRemedy.toUpperCase();
        if (raw === "REPLACEMENT") remedy = "Replacement";
        else if (raw === "FULL_REFUND") remedy = "Full refund";
        else if (raw === "EITHER") remedy = "Either is acceptable";
      }
    } catch {
      // Fallback safely
    }
  }

  const platformMatch = desc.match(/\[Platform:\s*([^|\]]+)/i);
  if (platformMatch && platform === "Online Store") platform = platformMatch[1].trim();
  const orderIdMatch = desc.match(/Order ID:\s*([^|\]]+)/i);
  if (orderIdMatch && orderId === caseId) orderId = orderIdMatch[1].trim();
  const productMatch = desc.match(/Product:\s*([^|\]]+)/i);
  if (productMatch && productName === (c.expectedProduct || c.title || "Purchased Product")) {
    productName = productMatch[1].trim();
  }

  if (!createdEvt?.metadataJson && c.claims && c.claims.length > 0 && c.claims[0].requestedRemedy) {
    const raw = c.claims[0].requestedRemedy.toUpperCase();
    if (raw.includes("REPLACE")) remedy = "Replacement";
    else if (raw.includes("REFUND")) remedy = "Full refund";
  }

  const rawStatus = c.status || "SUBMITTED";
  const mapped = mapBackendStatusToCustomerStatus(rawStatus, c.stage);
  const amountVal = typeof c.amount === "number" ? c.amount : (c.amountMinor || 0) / 100;

  return {
    id: caseId,
    dbId: c.id,
    title: c.title || "Complaint",
    platform,
    orderId,
    productName,
    category: originalCategory,
    amount: amountVal,
    currency: c.currency || "INR",
    requestedRemedy: remedy,
    status: mapped.label,
    rawStatus,
    rawStage: c.stage,
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
  };
}

export function BuyerComplaintsList() {
  const [complaints, setComplaints] = useState<BuyerComplaintSummaryCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [summary, setSummary] = useState<{ pendingCount: number; completedCount: number }>({
    pendingCount: 0,
    completedCount: 0,
  });
  const [page, setPage] = useState<number>(1);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [refreshTick, setRefreshTick] = useState<number>(0);

  // Selected Complaint for Modal/Drawer Detail View (deep-linked via ?complaint=)
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [focusEvidenceOnOpen, setFocusEvidenceOnOpen] = useState<boolean>(false);

  // Sync modal state with ?complaint= query param safely on client (supports refresh & browser Back/Forward)
  useEffect(() => {
    const syncFromUrl = () => {
      const sp = new URLSearchParams(window.location.search);
      const fromUrl = sp.get("complaint");
      setSelectedComplaintId(fromUrl || null);
      setFocusEvidenceOnOpen(sp.get("respond") === "1");
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 220);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch complaints from /api/complaints/my
  useEffect(() => {
    let active = true;

    async function loadComplaints() {
      try {
        const sp = new URLSearchParams();
        sp.set("page", String(page));
        sp.set("limit", "12");
        if (debouncedSearch.trim()) sp.set("search", debouncedSearch.trim());
        if (statusFilter !== "all") sp.set("status", statusFilter);
        if (dateFilter === "custom") {
          if (startDate) sp.set("startDate", startDate);
          if (endDate) sp.set("endDate", endDate);
        } else if (dateFilter !== "all") {
          sp.set("date", dateFilter);
        }

        const res = await fetch(`/api/complaints/my?${sp.toString()}`, { cache: "no-store" });
        if (!active) return;

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setErrorMsg(err.error || "Unable to load your complaints.");
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (!active) return;
        setComplaints(Array.isArray(data.items) ? data.items : []);
        if (data.summary) setSummary(data.summary);
        if (data.pagination) setPagination(data.pagination);
        setErrorMsg("");
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch buyer complaints:", err);
        if (active) {
          setErrorMsg("Network error loading your complaints.");
          setLoading(false);
        }
      }
    }

    void loadComplaints();
    return () => {
      active = false;
    };
  }, [page, debouncedSearch, statusFilter, dateFilter, startDate, endDate, refreshTick]);

  const openComplaintModal = useCallback((complaintId: string, focusEvidence = false) => {
    setFocusEvidenceOnOpen(focusEvidence);
    setSelectedComplaintId(complaintId);
    const url = new URL(window.location.href);
    url.searchParams.set("complaint", complaintId);
    if (focusEvidence) {
      url.searchParams.set("respond", "1");
    } else {
      url.searchParams.delete("respond");
    }
    window.history.pushState({ complaint: complaintId }, "", url.toString());
  }, []);

  const closeModal = useCallback(() => {
    setSelectedComplaintId(null);
    setFocusEvidenceOnOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("complaint");
    url.searchParams.delete("respond");
    window.history.pushState({}, "", url.toString());
  }, []);

  // Lock page scroll + listen for Escape when detail modal is open
  useEffect(() => {
    if (!selectedComplaintId) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedComplaintId, closeModal]);

  const dateGroups = useMemo(() => groupComplaintsByDate(complaints), [complaints]);

  const hasActiveFilters =
    debouncedSearch.trim().length > 0 ||
    statusFilter !== "all" ||
    dateFilter !== "all" ||
    Boolean(startDate) ||
    Boolean(endDate);

  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setDateFilter("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-5xl mx-auto pb-12 antialiased">
      {/* ======================================================== */}
      {/* 1. TOP HEADER — TITLE + NOTIFICATION + CTA + PROFILE     */}
      {/* ======================================================== */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-[var(--ink)]">
            My Complaints
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            Track your submitted complaints and their resolution progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* 1. Notification Bell */}
          <CustomerNotificationBell onOpenComplaint={(id) => openComplaintModal(id)} />

          {/* 2. Raise a New Complaint CTA */}
          <Link
            href="/overview"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3.5 sm:px-4 text-xs sm:text-sm font-semibold shadow-sm transition-colors focus:outline-none focus:ring-4 focus:ring-blue-200 whitespace-nowrap"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Raise a New Complaint</span>
          </Link>

          {/* 3. Customer Profile / Avatar Menu */}
          <CustomerAccountMenu />
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. PENDING & COMPLETED SUMMARY                           */}
      {/* ======================================================== */}
      <section aria-label="Complaint summary" className="grid grid-cols-2 gap-3 sm:gap-4 items-stretch">
        <button
          type="button"
          onClick={() => {
            setStatusFilter((prev) => (prev === "pending" ? "all" : "pending"));
            setPage(1);
          }}
          className={`flex h-full items-center justify-between gap-2 rounded-2xl border bg-white p-3.5 sm:p-4 text-left transition-all cursor-pointer ${
            statusFilter === "pending"
              ? "border-blue-500 ring-2 ring-blue-100 shadow-sm"
              : "border-slate-200 shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block">
              Pending
            </span>
            <div className="mt-0.5 text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums leading-tight">
              {loading ? "—" : summary.pendingCount}
            </div>
            <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500">
              Unresolved<span className="hidden sm:inline"> complaints</span>
            </p>
          </div>
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter((prev) => (prev === "completed" ? "all" : "completed"));
            setPage(1);
          }}
          className={`flex h-full items-center justify-between gap-2 rounded-2xl border bg-white p-3.5 sm:p-4 text-left transition-all cursor-pointer ${
            statusFilter === "completed"
              ? "border-emerald-500 ring-2 ring-emerald-100 shadow-sm"
              : "border-slate-200 shadow-xs hover:border-slate-300"
          }`}
        >
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 block">
              Completed
            </span>
            <div className="mt-0.5 text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums leading-tight">
              {loading ? "—" : summary.completedCount}
            </div>
            <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500">
              Resolved<span className="hidden sm:inline"> &amp; finalized</span>
            </p>
          </div>
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600">
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </button>
      </section>

      {/* ======================================================== */}
      {/* 3. COMPACT SEARCH & FILTERS                              */}
      {/* ======================================================== */}
      <section
        aria-label="Filter complaints"
        className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2.5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-center">
          {/* Search Input */}
          <div className="relative sm:col-span-2 md:col-span-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by complaint ID or product name..."
              aria-label="Search by complaint ID or product name"
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-3 focus:ring-blue-100 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs sm:text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-3 focus:ring-blue-100 transition-colors"
            >
              <option value="all">Status: All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="md:col-span-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <select
                aria-label="Filter by submission date"
                value={dateFilter}
                onChange={(e) => {
                  const next = e.target.value;
                  setDateFilter(next);
                  if (next !== "custom") {
                    setStartDate("");
                    setEndDate("");
                  }
                  setPage(1);
                }}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-8.5 pr-3 text-xs sm:text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-3 focus:ring-blue-100 transition-colors"
              >
                <option value="all">All dates</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="custom">Custom date range</option>
              </select>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap cursor-pointer px-1.5"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {dateFilter === "custom" && (
          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs text-slate-600">
            <label className="flex items-center gap-1.5">
              <span>From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span>To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
              />
            </label>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 4. YOUR COMPLAINTS SECTION HEADING                       */}
      {/* ======================================================== */}
      <div className="flex items-center justify-between px-1 pt-1">
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--ink)]">
          Your Complaints
        </h2>
        {!loading && (
          <span className="text-xs font-medium text-[var(--ink-3)]">
            {pagination.total} {pagination.total === 1 ? "complaint" : "complaints"}
          </span>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. DATE-WISE SUBMISSION LIST                             */}
      {/* ======================================================== */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-slate-500 shadow-xs">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-sm font-medium">Loading your complaints...</p>
        </div>
      ) : errorMsg ? (
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xs">
          <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-900">{errorMsg}</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 px-6 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <FolderOpen className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {hasActiveFilters ? "No matching complaints found" : "No complaints yet"}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
            {hasActiveFilters
              ? "Try adjusting your search query or clearing your active filters."
              : "Your submitted complaints will appear here. When you experience a problem with an online purchase, submit a complaint and track its progress here."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 text-sm font-semibold cursor-pointer"
              >
                <span>Clear Filters</span>
              </button>
            ) : (
              <Link
                href="/overview"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-semibold shadow-sm transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Raise a New Complaint</span>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {dateGroups.map((group) => (
            <section key={group.dateKey} aria-label={`Complaints submitted ${group.heading}`}>
              {/* Date Heading */}
              <div className="flex items-center gap-2.5 mb-3 px-1">
                <h2 className="text-sm font-bold text-[var(--ink)] tracking-tight">
                  {group.heading}
                </h2>
                <span className="rounded-full bg-[var(--surface-2)] border border-[var(--line)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink-2)]">
                  {group.items.length}
                </span>
              </div>

              {/* Submission Cards under this date */}
              <div className="space-y-3">
                {group.items.map((item) => {
                  const isSelected = selectedComplaintId === item.id;
                  const formattedAmount = formatPurchaseAmount(item.amount, item.currency);
                  const formattedTime = formatComplaintTimestamp(item.createdAt);

                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openComplaintModal(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openComplaintModal(item.id);
                        }
                      }}
                      aria-label={`View complaint ${item.id} for ${item.productName}`}
                      className={`group rounded-2xl border bg-white p-5 transition-all cursor-pointer focus:outline-none focus:ring-3 focus:ring-blue-200 ${
                        isSelected
                          ? "border-blue-600 ring-2 ring-blue-100 shadow-md"
                          : "border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        {/* Left Details */}
                        <div className="min-w-0 flex-1 space-y-1.5">
                          {/* Top Row: ID + Platform + Timestamp */}
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                            <span className="font-mono font-bold text-blue-700">
                              {item.id}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              <ShoppingBag className="h-3 w-3 text-slate-500" />
                              {item.platform}
                            </span>
                            <span className="text-slate-500 font-medium">{formattedTime}</span>
                          </div>

                          {/* Product Name & Complaint Title */}
                          <div>
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors break-words leading-snug">
                              {item.productName}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 mt-0.5 break-words line-clamp-2">
                              {item.title}
                            </p>
                          </div>

                          {/* Optional Evidence Summary */}
                          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <FileText className="h-3 w-3 text-slate-400" />
                              {item.evidenceCount}{" "}
                              {item.evidenceCount === 1 ? "file attached" : "files attached"}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span>Preferred: {item.requestedRemedy}</span>
                          </div>

                          {/* Customer Action Required Banner (Strictly separate from overall status) */}
                          {item.requiresCustomerAction && (
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50/90 px-3 py-2 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="inline-flex items-center gap-1 rounded bg-amber-200/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-950 shrink-0">
                                  <AlertTriangle className="h-3 w-3 text-amber-800" />
                                  ACTION REQUIRED
                                </span>
                                <span className="font-medium text-amber-900 truncate">
                                  {item.actionRequiredMessage || "Additional evidence requested."}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openComplaintModal(item.id, true);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors shrink-0 cursor-pointer"
                              >
                                <span>View and respond</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Right Side: Amount + Status Badge + View Affordance */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <div className="text-left sm:text-right">
                            <div className="text-base font-extrabold text-slate-900 tabular-nums">
                              {formattedAmount}
                            </div>
                            <div className="mt-1">
                              <CustomerStatusBadge status={item.status} />
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:text-blue-800 group-hover:translate-x-0.5 transition-all">
                            <span>View complaint</span>
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-xs">
              <span className="text-xs text-slate-600">
                Page <strong className="text-slate-900">{pagination.page}</strong> of{" "}
                <strong className="text-slate-900">{pagination.totalPages}</strong> ({pagination.total} total)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. COMPLAINT DETAIL MODAL / MOBILE FULL-SCREEN VIEW      */}
      {/* ======================================================== */}
      {selectedComplaintId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Complaint ${selectedComplaintId} details`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-0 md:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="w-full h-full md:h-auto md:max-w-5xl flex flex-col">
            <BuyerCaseDetail
              key={`${selectedComplaintId}-${focusEvidenceOnOpen ? "focus" : "std"}`}
              caseId={selectedComplaintId}
              isModal
              initialFocusEvidence={focusEvidenceOnOpen}
              onClose={closeModal}
              onComplaintUpdated={() => setRefreshTick((t) => t + 1)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
