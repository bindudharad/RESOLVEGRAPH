"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Clock,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface LineItem {
  id: string;
  productReference: string;
  sku?: string | null;
  title: string;
  quantity: number;
  unitAmountMinor: number;
  totalAmountMinor: number;
}

interface PaymentRecord {
  id: string;
  providerOrderId: string;
  captureId?: string | null;
  environment: string;
  amountMinor: number;
  currency: string;
  paymentStatus: string;
  capturedAt?: string | null;
  refunds?: {
    id: string;
    amountMinor: number;
    currency: string;
    status: string;
    reason: string;
    createdAt: string;
  }[];
}

interface OrderRecord {
  id: string;
  orderNumber: string;
  currency: string;
  totalAmountMinor: number;
  status: string;
  createdAt: string;
  items: LineItem[];
  payments: PaymentRecord[];
}

interface CasePurchaseTabProps {
  caseId: string;
  amount: number;
  currency?: string;
  customer?: string;
  merchant?: string;
}

export function CasePurchaseTab({
  caseId,
  amount,
  currency = "USD",
  customer = "Alex Johnson",
  merchant = "Apex Tech Retail",
}: CasePurchaseTabProps) {
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadOrder() {
      try {
        const res = await fetch(`/api/commerce/orders?caseId=${caseId}`);
        if (res.ok) {
          const data = await res.json();
          if (mounted && Array.isArray(data) && data.length > 0) {
            setOrder(data[0]);
            setLoading(false);
            return;
          }
        }
      } catch {
        // fallback
      }

      // Default synthetic order if no backend order exists yet
      if (mounted) {
        setOrder({
          id: `ord_${caseId.toLowerCase().replace(/-/g, "_")}`,
          orderNumber: `ORD-2026-${caseId.replace(/[^0-9]/g, "") || "8841"}`,
          currency,
          totalAmountMinor: Math.round(amount * 100),
          status: "CAPTURED",
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          items: [
            {
              id: "item-1",
              productReference: "PROD-NVME-1TB",
              sku: "SSD-1000GB-GEN4",
              title: "ApexDrive Pro 1TB NVMe PCIe 4.0 SSD (Internal)",
              quantity: 1,
              unitAmountMinor: Math.round(amount * 100),
              totalAmountMinor: Math.round(amount * 100),
            },
          ],
          payments: [
            {
              id: `pay_${caseId.toLowerCase().replace(/-/g, "_")}`,
              providerOrderId: "5O190127TN364715T",
              captureId: "84729103KM829141P",
              environment: "sandbox",
              amountMinor: Math.round(amount * 100),
              currency,
              paymentStatus: "COMPLETED",
              capturedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
              refunds: [],
            },
          ],
        });
        setLoading(false);
      }
    }

    loadOrder();
    return () => {
      mounted = false;
    };
  }, [caseId, amount, currency]);

  if (loading) {
    return (
      <div className="rg-card p-8 text-center text-subtle text-sm animate-pulse">
        Loading purchase and payment records...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rg-card p-8 text-center text-subtle text-sm">
        No commerce order linked to this dispute.
      </div>
    );
  }

  const primaryPayment = order.payments?.[0];
  const refundedTotalMinor =
    primaryPayment?.refunds?.reduce((acc, r) => acc + (r.status === "COMPLETED" ? r.amountMinor : 0), 0) || 0;
  const netCapturedMinor = (primaryPayment?.amountMinor || order.totalAmountMinor) - refundedTotalMinor;

  const formatCur = (val: number, cur?: string) =>
    formatCurrency(val, (cur as "USD" | "INR") || "USD");

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Cards Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rg-card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-faint uppercase tracking-wider">
            <ShoppingBag className="h-4 w-4 text-sky-400" />
            <span>Commerce Order</span>
          </div>
          <p className="mt-2 font-mono text-base font-bold text-fg">{order.orderNumber}</p>
          <p className="mt-0.5 text-xs text-subtle">
            Placed {formatDate(order.createdAt)}
          </p>
        </div>

        <div className="rg-card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-faint uppercase tracking-wider">
            <CreditCard className="h-4 w-4 text-emerald-400" />
            <span>PayPal Capture ID</span>
          </div>
          <p className="mt-2 font-mono text-base font-bold text-[#34d399]">
            {primaryPayment?.captureId || "PENDING"}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-subtle">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Sandbox Capture (V2)</span>
          </div>
        </div>

        <div className="rg-card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-faint uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4 text-purple-400" />
            <span>Gross Authorized</span>
          </div>
          <p className="mt-2 text-base font-bold text-fg tabular-nums">
            {formatCur(order.totalAmountMinor / 100, order.currency)}
          </p>
          <p className="mt-0.5 text-xs text-subtle">
            Customer: {customer}
          </p>
        </div>

        <div className="rg-card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-faint uppercase tracking-wider">
            <RotateCcw className="h-4 w-4 text-amber-400" />
            <span>Net Balance After Refunds</span>
          </div>
          <p className="mt-2 text-base font-bold text-fg tabular-nums">
            {formatCur(netCapturedMinor / 100, order.currency)}
          </p>
          <p className="mt-0.5 text-xs text-amber-300/80">
            {refundedTotalMinor > 0
              ? `${formatCur(refundedTotalMinor / 100, order.currency)} refunded`
              : "0 refunds executed"}
          </p>
        </div>
      </div>

      {/* Main Order Line Items */}
      <div className="rg-card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-fg">Purchased Order Items</h3>
            <p className="text-xs text-subtle">
              Fulfillment by merchant: <strong className="text-fg">{merchant}</strong>
            </p>
          </div>

          {primaryPayment && (
            <Link href={`/payments/${primaryPayment.id}`}>
              <Button variant="outline" size="sm" icon={<ExternalLink className="h-3.5 w-3.5" />}>
                View Payment Ledger
              </Button>
            </Link>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-surface-2 text-faint">
              <tr>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider">Item / Description</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-center">Qty</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Unit Price</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {order.items.map((item) => (
                <tr key={item.id} className="hover:bg-surface-2/40">
                  <td className="px-5 py-3.5 font-medium text-fg">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted shrink-0" />
                      <span>{item.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-subtle">{item.sku || "N/A"}</td>
                  <td className="px-4 py-3.5 text-center text-fg font-medium">{item.quantity}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-subtle">
                    {formatCur(item.unitAmountMinor / 100, order.currency)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-fg">
                    {formatCur(item.totalAmountMinor / 100, order.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-line-2 bg-surface-2/60 font-semibold text-fg">
              <tr>
                <td colSpan={4} className="px-5 py-3 text-right">
                  Order Total:
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-[#34d399]">
                  {formatCur(order.totalAmountMinor / 100, order.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment Processing Ledger Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rg-card p-5">
          <h3 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-sky-400" />
            <span>PayPal Gateway Transaction Log</span>
          </h3>

          <dl className="grid grid-cols-2 gap-y-3 text-xs">
            <dt className="text-faint">Order Session ID:</dt>
            <dd className="font-mono text-fg text-right">{primaryPayment?.providerOrderId || "N/A"}</dd>

            <dt className="text-faint">Capture Reference:</dt>
            <dd className="font-mono text-[#34d399] text-right font-medium">
              {primaryPayment?.captureId || "N/A"}
            </dd>

            <dt className="text-faint">Gateway Status:</dt>
            <dd className="text-right">
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-400">
                {primaryPayment?.paymentStatus || "COMPLETED"}
              </span>
            </dd>

            <dt className="text-faint">Captured Timestamp:</dt>
            <dd className="text-subtle text-right">
              {primaryPayment?.capturedAt ? formatDate(primaryPayment.capturedAt) : "N/A"}
            </dd>

            <dt className="text-faint">Environment:</dt>
            <dd className="font-mono text-xs uppercase text-sky-400 text-right">
              {primaryPayment?.environment || "sandbox"}
            </dd>
          </dl>
        </div>

        <div className="rg-card p-5">
          <h3 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-amber-400" />
            <span>Refund Ledger & Exposure</span>
          </h3>

          {primaryPayment?.refunds && primaryPayment.refunds.length > 0 ? (
            <div className="flex flex-col gap-2">
              {primaryPayment.refunds.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between rounded-md border border-line bg-surface-2 p-3 text-xs"
                >
                  <div>
                    <p className="font-semibold text-fg">{ref.reason}</p>
                    <p className="text-[11px] text-faint flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(ref.createdAt)}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums text-rose-400">
                      -{formatCur(ref.amountMinor / 100, ref.currency)}
                    </p>
                    <span className="text-[10.5px] font-medium text-emerald-400">{ref.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-line p-5 text-center text-xs text-subtle">
              <p>No refunds processed yet against this capture.</p>
              <p className="mt-1 text-[11px] text-faint">
                Approved resolution proposals can execute automated partial or full refunds.
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between pt-3 border-t border-line text-xs">
            <span className="text-faint">Remaining Refundable:</span>
            <span className="font-bold tabular-nums text-fg">
              {formatCur(netCapturedMinor / 100, order.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
