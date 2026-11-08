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
} from "lucide-react";
import { useMemo, useState } from "react";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { PriorityBadge } from "@/components/cases/priority-badge";
import { DemoBadge } from "@/components/common/demo-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
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
      return a[key].localeCompare(b[key]);
  }
}

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "id", label: "Case ID" },
  { key: "customer", label: "Customer" },
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

/**
 * Sortable, paginated case table with clickable rows.
 * All state is local; records come from the session case store.
 */
export function CaseTable({
  cases,
  pageSize = 8,
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
    <div className={cn("overflow-hidden rounded-lg border border-line", className)}>
      <div className="overflow-x-auto">
        <Table className="min-w-[980px]">
          <TableHeader>
            <tr>
              {COLUMNS.map((column, index) => {
                const active = sort.key === column.key;
                return (
                  <TableHead
                    key={column.key}
                    align={column.align}
                    aria-sort={
                      active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
                    }
                    className={index === 0 ? "pl-5" : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded transition-colors hover:text-muted",
                        active && "text-muted",
                        column.align === "right" && "flex-row-reverse",
                      )}
                    >
                      {column.label}
                      {active ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="h-3 w-3" aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
                      )}
                    </button>
                  </TableHead>
                );
              })}
              <TableHead align="right" className="pr-5">
                Action
              </TableHead>
            </tr>
          </TableHeader>

          <TableBody>
            {visible.map((item) => (
              <TableRow
                key={item.id}
                onClick={() => openCase(item.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") openCase(item.id);
                }}
                tabIndex={0}
                className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-brand)]"
              >
                <TableCell className="whitespace-nowrap py-3.5 pl-5 pr-4">
                  <span className="flex items-center gap-2">
                    <Link
                      href={`/cases/${item.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="font-medium tabular-nums text-fg underline-offset-2 transition-colors hover:text-amber-400 hover:underline"
                    >
                      {item.id}
                    </Link>
                    {item.ephemeral ? <DemoBadge size="xs" /> : null}
                  </span>
                </TableCell>

                <TableCell className="whitespace-nowrap text-fg">{item.customer}</TableCell>

                <TableCell className="whitespace-nowrap">{item.merchant}</TableCell>

                <TableCell className="max-w-[200px]">
                  <span
                    className="block truncate text-[12.5px] text-muted"
                    title={item.category}
                  >
                    {item.category}
                  </span>
                </TableCell>

                <TableCell className="whitespace-nowrap text-right tabular-nums text-fg">
                  {formatCurrency(item.amount, item.currency)}
                </TableCell>

                <TableCell>
                  <CaseStatusBadge status={item.status} />
                </TableCell>

                <TableCell>
                  <PriorityBadge priority={item.priority} />
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  <span className="block text-[12.5px]">{formatDate(item.updatedAt)}</span>
                  <span className="block text-[11px] text-faint">
                    {relativeAge(item.updatedAt)}
                  </span>
                </TableCell>

                <TableCell className="text-right">
                  <Link
                    href={`/cases/${item.id}`}
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-2 px-2.5 text-[12px] font-medium text-muted transition-colors hover:border-[var(--color-brand)] hover:bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] hover:text-fg"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-[#0B0F17] px-4 py-3">
        <p className="text-[12px] text-subtle">
          Showing{" "}
          <span className="font-medium tabular-nums text-fg">{start + 1}</span>–
          <span className="font-medium tabular-nums text-fg">
            {Math.min(start + pageSize, sorted.length)}
          </span>{" "}
          of <span className="font-medium tabular-nums text-fg">{sorted.length}</span> cases
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
          <span className="px-2 text-[12px] tabular-nums text-muted">
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
    </div>
  );
}
