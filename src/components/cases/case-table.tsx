"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Inbox,
  RotateCcw,
  SlidersHorizontal,
  CheckSquare,
  Square,
  Layers,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { PriorityBadge } from "@/components/cases/priority-badge";
import { DemoBadge } from "@/components/common/demo-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { SlideOver } from "@/components/ui/slide-over";
import { toast } from "@/components/common/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency, formatDate, relativeAge } from "@/lib/utils";
import type { ResolutionCase } from "@/lib/types";

type SortKey =
  | "id"
  | "customer"
  | "merchant"
  | "category"
  | "amount"
  | "status"
  | "priority"
  | "updatedAt";

const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

function compare(a: ResolutionCase, b: ResolutionCase, key: SortKey): number {
  switch (key) {
    case "amount":
      return a.amount - b.amount;
    case "priority":
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    case "updatedAt":
      return a.updatedAt.localeCompare(b.updatedAt);
    default:
      return (a[key] ?? "").toString().localeCompare((b[key] ?? "").toString());
  }
}

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "id", label: "Case ID" },
  { key: "customer", label: "Buyer" },
  { key: "merchant", label: "Merchant" },
  { key: "category", label: "Issue" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "updatedAt", label: "Last Updated" },
];

export interface CaseTableProps {
  cases: ResolutionCase[];
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  onResetFilters?: () => void;
  className?: string;
}

export function CaseTable({
  cases,
  pageSize = 10,
  emptyTitle = "No cases match these filters",
  emptyDescription = "Try widening the search term or clearing one of the filters.",
  onResetFilters,
  className,
}: CaseTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "updatedAt",
    dir: "desc",
  });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [peekCase, setPeekCase] = useState<ResolutionCase | null>(null);
  const router = useRouter();

  const sorted = useMemo(() => {
    const copy = [...cases];
    copy.sort((a, b) => {
      const result = compare(a, b, sort.key);
      return sort.dir === "asc" ? result : -result;
    });
    return copy;
  }, [cases, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  const toggleSort = (key: SortKey) => {
    setPage(1);
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "updatedAt" || key === "amount" ? "desc" : "asc" },
    );
  };

  const openCase = (id: string) => router.push(`/cases/${id}`);

  // Spacebar quick peek keyboard shortcut on focused row
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " && document.activeElement?.getAttribute("data-case-row")) {
        e.preventDefault();
        const caseId = document.activeElement.getAttribute("data-case-row");
        const found = cases.find((c) => c.id === caseId);
        if (found) setPeekCase(found);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cases]);

  const toggleSelectAll = () => {
    if (selectedIds.size === visible.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible.map((c) => c.id)));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (cases.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={emptyTitle}
        description={emptyDescription}
        compact
        action={
          onResetFilters ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              icon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Clear All Filters
            </Button>
          ) : undefined
        }
        className="border-line"
      />
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-line bg-surface", className)}>
      <div className="overflow-x-auto">
        <Table className="min-w-[1040px]">
          <TableHeader>
            <tr className="h-11 border-b border-line bg-surface-2 text-[12px] font-medium text-subtle">
              <th className="w-10 px-3 text-center">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  aria-label="Select all visible"
                  className="inline-flex items-center text-muted hover:text-fg"
                >
                  {selectedIds.size === visible.length && visible.length > 0 ? (
                    <CheckSquare className="h-4 w-4 text-[var(--accent)]" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </th>
              {COLUMNS.map((column) => {
                const active = sort.key === column.key;
                return (
                  <TableHead
                    key={column.key}
                    align={column.align}
                    aria-sort={
                      active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
                    }
                    className="py-2.5 px-3"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded transition-colors hover:text-fg text-subtle",
                        active && "text-fg font-semibold",
                        column.align === "right" && "flex-row-reverse",
                      )}
                    >
                      <span>{column.label}</span>
                      {active ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="h-3 w-3 text-[var(--accent)]" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-[var(--accent)]" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </button>
                  </TableHead>
                );
              })}
              <TableHead align="right" className="pr-4 py-2.5">
                Actions
              </TableHead>
            </tr>
          </TableHeader>

          <TableBody>
            {visible.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const isCanonical = item.id === "RG-2026-0412";
              return (
                <TableRow
                  key={item.id}
                  data-case-row={item.id}
                  onClick={() => openCase(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") openCase(item.id);
                  }}
                  tabIndex={0}
                  className={cn(
                    "group h-11 cursor-pointer transition-colors border-b border-line hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]",
                    isSelected && "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]",
                    isCanonical && "border-l-2 border-l-[var(--buyer)]",
                  )}
                >
                  <TableCell className="w-10 px-3 text-center" onClick={(e) => toggleSelectRow(item.id, e)}>
                    <button
                      type="button"
                      aria-label={`Select ${item.id}`}
                      className="inline-flex items-center text-muted hover:text-fg"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-[var(--accent)]" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </TableCell>

                  <TableCell className="whitespace-nowrap px-3 font-mono text-[12.5px]">
                    <span className="flex items-center gap-1.5">
                      <Link
                        href={`/cases/${item.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="font-medium text-fg underline-offset-2 transition-colors hover:text-[var(--accent)] hover:underline"
                      >
                        {item.id}
                      </Link>
                      {item.ephemeral ? <DemoBadge size="xs" /> : null}
                      {isCanonical ? (
                        <span className="rounded bg-[color-mix(in_srgb,var(--buyer)_12%,transparent)] px-1 py-0.2 text-[9.5px] font-medium text-[var(--buyer)] uppercase tracking-wider">
                          Demo Story
                        </span>
                      ) : null}
                    </span>
                  </TableCell>

                  <TableCell className="whitespace-nowrap px-3 text-[13px] text-fg font-medium">
                    {item.customer}
                  </TableCell>

                  <TableCell className="whitespace-nowrap px-3 text-[12.5px] text-muted">
                    {item.merchant}
                  </TableCell>

                  <TableCell className="max-w-[220px] px-3">
                    <span
                      className="block truncate text-[12.5px] text-muted"
                      title={item.title || item.category}
                    >
                      {item.title || item.category}
                    </span>
                  </TableCell>

                  <TableCell className="whitespace-nowrap px-3 text-right font-mono text-[12.5px] font-semibold text-fg">
                    {formatCurrency(item.amount, item.currency)}
                  </TableCell>

                  <TableCell className="px-3">
                    <CaseStatusBadge status={item.status} />
                  </TableCell>

                  <TableCell className="px-3">
                    <PriorityBadge priority={item.priority} />
                  </TableCell>

                  <TableCell className="whitespace-nowrap px-3 font-mono text-[11.5px] text-subtle">
                    <span>{formatDate(item.updatedAt)}</span>
                  </TableCell>

                  <TableCell className="text-right pr-4">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPeekCase(item);
                        }}
                        title="Quick peek (or hit Space)"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-fg"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <Link
                        href={`/cases/${item.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-line px-2 text-[11.5px] font-medium text-muted transition-colors hover:border-[var(--accent)] hover:text-fg"
                      >
                        <span>Open</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Floating bulk selection action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-3 left-4 right-4 z-20 mx-4 flex items-center justify-between rounded-lg border border-[var(--line-strong)] bg-surface px-4 py-2.5 shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">
              {selectedIds.size}
            </span>
            <span className="text-[12.5px] font-medium text-fg">
              cases selected
            </span>
            <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10.5px] uppercase font-mono text-subtle">
              Demo actions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.success(`Exported ${selectedIds.size} cases to CSV`, { isDemo: true });
                setSelectedIds(new Set());
              }}
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                toast.success(`Marked ${selectedIds.size} cases under review`, { isDemo: true });
                setSelectedIds(new Set());
              }}
            >
              Mark In Review
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2 px-4 py-3">
        <p className="text-[12px] text-subtle">
          Showing{" "}
          <span className="font-mono font-medium text-fg">{start + 1}</span>–
          <span className="font-mono font-medium text-fg">
            {Math.min(start + pageSize, sorted.length)}
          </span>{" "}
          of <span className="font-mono font-medium text-fg">{sorted.length}</span> cases
        </p>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={safePage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
          />
          <span className="px-2 text-[12px] font-mono text-muted">
            Page <span className="text-fg">{safePage}</span> of{" "}
            <span className="text-fg">{totalPages}</span>
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={safePage >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            icon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
      </div>

      {/* Spacebar / Eye Quick Peek SlideOver */}
      <SlideOver
        open={peekCase !== null}
        onClose={() => setPeekCase(null)}
        title={peekCase ? `Case ${peekCase.id}` : "Case Quick Peek"}
        description={peekCase?.title || "Dispute synopsis & key facts"}
        footer={
          peekCase ? (
            <div className="flex w-full items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setPeekCase(null)}>
                Close Preview
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const id = peekCase.id;
                  setPeekCase(null);
                  openCase(id);
                }}
                icon={<ArrowRight className="h-3.5 w-3.5" />}
              >
                Open Full Case Workspace
              </Button>
            </div>
          ) : undefined
        }
      >
        {peekCase && (
          <div className="space-y-5 text-[13px]">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <CaseStatusBadge status={peekCase.status} />
                <PriorityBadge priority={peekCase.priority} />
              </div>
              <span className="font-mono text-base font-bold text-fg">
                {formatCurrency(peekCase.amount, peekCase.currency)}
              </span>
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-subtle">
                Dispute Summary
              </label>
              <p className="mt-1 text-fg leading-relaxed bg-surface-2 p-3 rounded-md border border-line">
                {peekCase.description || "No dispute summary provided."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-lg border border-line bg-surface-2/50 p-3.5">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-subtle">Buyer Thread</p>
                <p className="mt-1 font-medium text-[var(--buyer)]">{peekCase.customer}</p>
                {peekCase.expectedProduct && (
                  <p className="mt-1 text-[11.5px] text-muted">
                    Claimed: {peekCase.expectedProduct}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-subtle">Merchant Thread</p>
                <p className="mt-1 font-medium text-[var(--merchant)]">{peekCase.merchant}</p>
                {peekCase.reportedProduct && (
                  <p className="mt-1 text-[11.5px] text-muted">
                    Delivered: {peekCase.reportedProduct}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-line p-3">
              <p className="text-[11px] uppercase tracking-wider text-subtle">Investigation Protocol</p>
              <p className="mt-1 text-[12px] text-muted">
                BERR matrix generated • Evidence graph ready • PayPal settlement webhook synchronized.
              </p>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
