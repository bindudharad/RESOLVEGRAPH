import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Package,
  Receipt,
  Store,
  Tag,
  User,
} from "lucide-react";
import type { ResolutionCase } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

interface CaseOverviewProps {
  caseItem: ResolutionCase;
}

export function CaseOverview({ caseItem }: CaseOverviewProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Summary Narrative */}
      <div className="rg-card p-5">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
          Complaint Summary
        </h3>
        <p className="mt-2.5 text-[14.5px] leading-relaxed text-fg">
          {caseItem.description}
        </p>

        {/* Expected vs Reported product diff if available */}
        {(caseItem.expectedProduct || caseItem.reportedProduct) && (
          <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-success)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)] p-3.5">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#6ee7b7]">
                <CheckCircle2 className="h-4 w-4" />
                <span>Expected Product</span>
              </div>
              <p className="mt-1.5 text-[14px] font-medium text-fg">
                {caseItem.expectedProduct ?? "As ordered"}
              </p>
              <p className="mt-0.5 text-[11.5px] text-faint">
                According to order invoice & store product specification
              </p>
            </div>

            <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-warning)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_8%,transparent)] p-3.5">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#fcd34d]">
                <AlertCircle className="h-4 w-4" />
                <span>Reported Product</span>
              </div>
              <p className="mt-1.5 text-[14px] font-medium text-fg">
                {caseItem.reportedProduct ?? "Different from ordered"}
              </p>
              <p className="mt-0.5 text-[11.5px] text-faint">
                Disclosed in buyer complaint with photographic verification
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Structured Transaction Metadata */}
      <div className="rg-card p-5">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
          Transaction & Dispute Details
        </h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-3 rounded-md border border-line bg-surface-2 p-3">
            <Receipt className="mt-0.5 h-4 w-4 text-[#a08bff]" />
            <div>
              <dt className="text-[11.5px] font-medium text-subtle">Disputed Amount</dt>
              <dd className="mt-0.5 text-[14.5px] font-semibold tabular-nums text-fg">
                {formatCurrency(caseItem.amount, caseItem.currency)}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-md border border-line bg-surface-2 p-3">
            <Store className="mt-0.5 h-4 w-4 text-[#38bdf8]" />
            <div>
              <dt className="text-[11.5px] font-medium text-subtle">Merchant</dt>
              <dd className="mt-0.5 text-[14px] font-semibold text-fg">
                {caseItem.merchant}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-md border border-line bg-surface-2 p-3">
            <User className="mt-0.5 h-4 w-4 text-[#34d399]" />
            <div>
              <dt className="text-[11.5px] font-medium text-subtle">Buyer / Claimant</dt>
              <dd className="mt-0.5 text-[14px] font-semibold text-fg">
                {caseItem.customer}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-md border border-line bg-surface-2 p-3">
            <Tag className="mt-0.5 h-4 w-4 text-subtle" />
            <div>
              <dt className="text-[11.5px] font-medium text-subtle">Category</dt>
              <dd className="mt-0.5 text-[13.5px] font-medium text-fg">
                {caseItem.category}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-md border border-line bg-surface-2 p-3">
            <Package className="mt-0.5 h-4 w-4 text-subtle" />
            <div>
              <dt className="text-[11.5px] font-medium text-subtle">Case Filing Date</dt>
              <dd className="mt-0.5 text-[13.5px] font-medium text-fg" title={caseItem.createdAt}>
                {formatDate(caseItem.createdAt)}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-md border border-line bg-surface-2 p-3">
            <ArrowRight className="mt-0.5 h-4 w-4 text-subtle" />
            <div>
              <dt className="text-[11.5px] font-medium text-subtle">Last Interaction</dt>
              <dd className="mt-0.5 text-[13.5px] font-medium text-fg">
                {formatDateTime(caseItem.updatedAt)}
              </dd>
            </div>
          </div>
        </dl>
      </div>
    </div>
  );
}
