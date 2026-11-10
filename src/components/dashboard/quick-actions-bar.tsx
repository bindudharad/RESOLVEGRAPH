"use client";

import Link from "next/link";
import {
  UploadCloud,
  FileSpreadsheet,
  FileCheck2,
  ShoppingCart,
  Inbox,
} from "lucide-react";
import { CreateCaseAction } from "@/components/cases/create-case-dialog";
import { Button } from "@/components/ui/button";

export function QuickActionsBar() {
  return (
    <section aria-label="Prioritized Quick Actions" className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-2 border-b border-[var(--line)]/60">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink)] block">
            Investigation Quick Actions
          </span>
          <span className="text-[11px] text-[var(--ink-3)]">
            Frequently accessed investigator workflows and operational accelerators.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <CreateCaseAction
          variant="outline"
          size="sm"
          label="New Investigation"
          className="text-xs h-10 w-full justify-start font-medium bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--ink)] border-[var(--line)]"
        />

        <Link href="/intake" className="w-full">
          <Button variant="outline" size="sm" className="text-xs h-10 w-full justify-start font-medium bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--ink)] border-[var(--line)]">
            <UploadCloud className="h-4 w-4 mr-1.5 text-teal-500 shrink-0" />
            <span className="truncate">Import Evidence</span>
          </Button>
        </Link>

        <Link href="/reconciliation" className="w-full">
          <Button variant="outline" size="sm" className="text-xs h-10 w-full justify-start font-medium bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--ink)] border-[var(--line)]">
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-blue-500 shrink-0" />
            <span className="truncate">Explore Trans.</span>
          </Button>
        </Link>

        <Link href="/evidence" className="w-full">
          <Button variant="outline" size="sm" className="text-xs h-10 w-full justify-start font-medium bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--ink)] border-[var(--line)]">
            <FileCheck2 className="h-4 w-4 mr-1.5 text-purple-500 shrink-0" />
            <span className="truncate">Review Evidence</span>
          </Button>
        </Link>

        <Link href="/purchases" className="w-full">
          <Button variant="outline" size="sm" className="text-xs h-10 w-full justify-start font-medium bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--ink)] border-[var(--line)]">
            <ShoppingCart className="h-4 w-4 mr-1.5 text-emerald-500 shrink-0" />
            <span className="truncate">Purchase Memory</span>
          </Button>
        </Link>

        <Link href="/resolution" className="w-full">
          <Button variant="outline" size="sm" className="text-xs h-10 w-full justify-start font-medium bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--ink)] border-[var(--line)]">
            <Inbox className="h-4 w-4 mr-1.5 text-amber-500 shrink-0" />
            <span className="truncate">Resolution Hub</span>
          </Button>
        </Link>
      </div>
    </section>
  );
}
