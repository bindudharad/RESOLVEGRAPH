"use client";

import Link from "next/link";
import {
  ShoppingCart,
  Package,
  Video,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function CommerceProtectionPanel() {
  const { summary } = useDashboard();

  const commerce = summary?.commerceIntelligence || {
    totalOrders: 294,
    purchaseMemories: 2,
    registeredPackages: 0,
    packagesInTransit: 0,
    deliveryReminders: 52,
    unboxingSessions: 60,
  };

  return (
    <section aria-labelledby="commerce-protection-heading" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="commerce-protection-heading" className="text-base font-semibold text-[var(--ink)] flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-teal-500" />
              Commerce & Physical Fulfillment Protection
            </h2>
            <Badge tone="brand" className="text-[11px] font-mono">
              PRE-DISPATCH ANCHORS
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-[var(--ink-2)]">
            Prevent post-complaint revision through immutable specification baselines, package passports, and CameraX unboxing verification.
          </p>
        </div>

        <Link href="/purchases">
          <Button variant="outline" size="sm" className="text-xs h-8">
            Open Commerce Protection <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </Link>
      </div>

      {/* 5-Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Link
          href="/purchases"
          className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/40 p-3 hover:bg-[var(--surface-2)]/80 transition-colors group"
        >
          <span className="text-[11px] font-medium text-[var(--ink-2)] flex items-center gap-1 group-hover:text-[var(--accent)] transition-colors">
            <ShoppingCart className="h-3 w-3" /> Tracked Orders
          </span>
          <p className="text-xl font-bold font-mono text-[var(--ink)] mt-1">
            {commerce.totalOrders}
          </p>
          <span className="text-[10px] text-[var(--ink-3)] block mt-0.5">
            Verified commerce carts
          </span>
        </Link>

        <Link
          href="/purchases"
          className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/40 p-3 hover:bg-[var(--surface-2)]/80 transition-colors group"
        >
          <span className="text-[11px] font-medium text-[var(--ink-2)] flex items-center gap-1 group-hover:text-[var(--accent)] transition-colors">
            <ShieldCheck className="h-3 w-3 text-emerald-500" /> Purchase Memories
          </span>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {commerce.purchaseMemories} Sealed
          </p>
          <span className="text-[10px] text-[var(--ink-3)] block mt-0.5">
            Pre-dispatch hardware specs
          </span>
        </Link>

        <Link
          href="/packages"
          className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/40 p-3 hover:bg-[var(--surface-2)]/80 transition-colors group"
        >
          <span className="text-[11px] font-medium text-[var(--ink-2)] flex items-center gap-1 group-hover:text-[var(--accent)] transition-colors">
            <Package className="h-3 w-3 text-blue-500" /> Package Passports
          </span>
          <p className="text-xl font-bold font-mono text-[var(--ink)] mt-1">
            {commerce.registeredPackages}
          </p>
          <span className="text-[10px] text-[var(--ink-3)] block mt-0.5">
            Tamper seal barcodes
          </span>
        </Link>

        <Link
          href="/cases"
          className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/40 p-3 hover:bg-[var(--surface-2)]/80 transition-colors group"
        >
          <span className="text-[11px] font-medium text-[var(--ink-2)] flex items-center gap-1 group-hover:text-[var(--accent)] transition-colors">
            <Clock className="h-3 w-3 text-amber-500" /> Delivery Reminders
          </span>
          <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {commerce.deliveryReminders}
          </p>
          <span className="text-[10px] text-[var(--ink-3)] block mt-0.5">
            Customer sign-off nudges
          </span>
        </Link>

        <Link
          href="/intake"
          className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/40 p-3 hover:bg-[var(--surface-2)]/80 transition-colors group col-span-2 sm:col-span-1"
        >
          <span className="text-[11px] font-medium text-[var(--ink-2)] flex items-center gap-1 group-hover:text-[var(--accent)] transition-colors">
            <Video className="h-3 w-3 text-purple-500" /> Unboxing Sessions
          </span>
          <p className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
            {commerce.unboxingSessions}
          </p>
          <span className="text-[10px] text-[var(--ink-3)] block mt-0.5">
            Dual-Sight CameraX recordings
          </span>
        </Link>
      </div>
    </section>
  );
}
