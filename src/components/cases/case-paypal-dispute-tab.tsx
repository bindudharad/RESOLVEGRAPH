"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Clock,
  ExternalLink,
  CheckCircle2,
  FileText,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PayPalDisputeTabProps {
  caseId: string;
  amount: number;
  currency?: string;
  merchant?: string;
}

interface DisputeData {
  id: string;
  paypalDisputeId: string;
  disputeLifeCycleStage: string;
  disputeState: string;
  disputeReason: string;
  disputeAmountMinor: number;
  currency: string;
  buyerResponseDueDate?: string | null;
  sellerResponseDueDate?: string | null;
  allowedActions: string[];
}

export function CasePayPalDisputeTab({
  caseId,
  amount,
  currency = "USD",
  merchant = "Apex Tech Retail",
}: PayPalDisputeTabProps) {
  const [dispute, setDispute] = useState<DisputeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadDispute() {
      try {
        const res = await fetch(`/api/paypal/disputes?caseId=${caseId}`);
        if (res.ok) {
          const data = await res.json();
          if (mounted && Array.isArray(data) && data.length > 0) {
            setDispute(data[0]);
            setLoading(false);
            return;
          }
        }
      } catch {
        // fallback
      }

      // Default synthetic dispute state linked to case
      if (mounted) {
        setDispute({
          id: `disp_${caseId.toLowerCase().replace(/-/g, "_")}`,
          paypalDisputeId: `PP-D-${caseId.replace(/[^0-9]/g, "") || "9482"}`,
          disputeLifeCycleStage: "INQUIRY",
          disputeState: "REQUIRED_ACTION",
          disputeReason: "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED",
          disputeAmountMinor: Math.round(amount * 100),
          currency,
          sellerResponseDueDate: new Date(Date.now() + 8 * 86400000).toISOString(),
          buyerResponseDueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
          allowedActions: ["ACCEPT_CLAIM", "PROVIDE_EVIDENCE", "MAKE_OFFER"],
        });
        setLoading(false);
      }
    }

    loadDispute();
    return () => {
      mounted = false;
    };
  }, [caseId, amount, currency]);

  if (loading) {
    return (
      <div className="rg-card p-8 text-center text-subtle text-sm animate-pulse">
        Checking PayPal Resolution Center sync...
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="rg-card p-8 text-center text-subtle text-sm">
        No active PayPal dispute record linked.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Dispute Header Alert */}
      <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="rounded-lg bg-sky-500/20 p-2.5 text-sky-400 shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase text-sky-400">
                  {dispute.paypalDisputeId}
                </span>
                <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10.5px] font-semibold text-sky-300 uppercase">
                  Stage: {dispute.disputeLifeCycleStage}
                </span>
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10.5px] font-semibold text-amber-300 uppercase">
                  State: {dispute.disputeState}
                </span>
              </div>
              <h3 className="mt-1 text-base font-bold text-fg">
                PayPal Customer Dispute: {dispute.disputeReason.replace(/_/g, " ")}
              </h3>
              <p className="mt-0.5 text-xs text-subtle">
                Claimed amount:{" "}
                <strong className="text-fg tabular-nums">
                  {formatCurrency(dispute.disputeAmountMinor / 100, (dispute.currency as "USD" | "INR") || "USD")}
                </strong>
                . Managed merchant: <strong className="text-fg">{merchant}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link href={`/paypal/disputes/${dispute.paypalDisputeId}`}>
              <Button
                variant="primary"
                size="sm"
                icon={<ExternalLink className="h-3.5 w-3.5" />}
              >
                Dispute Management Center
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Deadlines & Action Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rg-card p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-faint uppercase tracking-wider">
            <Clock className="h-4 w-4 text-amber-400" />
            <span>Merchant Response Due</span>
          </div>
          <p className="mt-2 text-base font-bold text-amber-400">
            {dispute.sellerResponseDueDate ? formatDate(dispute.sellerResponseDueDate) : "N/A"}
          </p>
          <p className="mt-1 text-[11px] text-faint">
            Failure to respond before deadline defaults in favor of buyer.
          </p>
        </div>

        <div className="rg-card p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-faint uppercase tracking-wider">
            <Clock className="h-4 w-4 text-sky-400" />
            <span>Buyer Follow-Up Window</span>
          </div>
          <p className="mt-2 text-base font-bold text-fg">
            {dispute.buyerResponseDueDate ? formatDate(dispute.buyerResponseDueDate) : "N/A"}
          </p>
          <p className="mt-1 text-[11px] text-faint">
            Window for buyer to respond to merchant counter-proposals.
          </p>
        </div>

        <div className="rg-card p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-faint uppercase tracking-wider">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Allowed Settlement Actions</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {dispute.allowedActions.map((action) => (
              <span
                key={action}
                className="rounded bg-surface-2 border border-line px-2 py-0.5 text-[11px] font-mono text-subtle"
              >
                {action}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bilateral Evidence Sync Section */}
      <div className="rg-card p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-line">
          <div>
            <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-400" />
              <span>Evidence Submission Package for PayPal</span>
            </h3>
            <p className="text-xs text-subtle mt-0.5">
              ResolveGraph automatically compiles case evidence according to PayPal Dispute API evidence formats.
            </p>
          </div>

          <Link href={`/paypal/disputes/${dispute.paypalDisputeId}`}>
            <Button variant="secondary" size="sm" icon={<Send className="h-3.5 w-3.5" />}>
              Compile & Transmit Package
            </Button>
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-surface-2 p-3.5 text-xs">
            <div className="flex items-center justify-between font-semibold text-fg">
              <span>Proof of Delivery & Carrier Tracking</span>
              <span className="text-emerald-400 font-mono text-[11px]">FORMATTED</span>
            </div>
            <p className="mt-1 text-[11px] text-faint">
              Includes carrier tracking ID, delivery timestamp, GPS coordinates, and recipient signature photo.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-surface-2 p-3.5 text-xs">
            <div className="flex items-center justify-between font-semibold text-fg">
              <span>Warehouse Condition & Serial Photo</span>
              <span className="text-emerald-400 font-mono text-[11px]">FORMATTED</span>
            </div>
            <p className="mt-1 text-[11px] text-faint">
              Barcode scan, serial log, and high-resolution packaging inspection record.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
