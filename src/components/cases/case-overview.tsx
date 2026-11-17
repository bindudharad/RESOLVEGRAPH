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
      <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
        <h3 className="text-[12px] font-mono font-semibold uppercase tracking-wider text-[#A7B2C2]">
          Complaint Summary
        </h3>
        <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#F5F7FA]">
          {caseItem.description}
        </p>

        {/* Expected vs Reported product diff if available */}
        {(caseItem.expectedProduct || caseItem.reportedProduct) && (
          <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#22C55E]">
                <CheckCircle2 className="h-4 w-4" />
                <span>Expected Product</span>
              </div>
              <p className="mt-1.5 text-[14px] font-medium text-[#F5F7FA]">
                {caseItem.expectedProduct ?? "As ordered"}
              </p>
              <p className="mt-0.5 text-[11.5px] text-[#A7B2C2]">
                According to order invoice & store product specification
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#F59E0B]">
                <AlertCircle className="h-4 w-4" />
                <span>Reported Product</span>
              </div>
              <p className="mt-1.5 text-[14px] font-medium text-[#F5F7FA]">
                {caseItem.reportedProduct ?? "Different from ordered"}
              </p>
              <p className="mt-0.5 text-[11.5px] text-[#A7B2C2]">
                Disclosed in buyer complaint with photographic verification
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Structured Transaction Metadata */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
        <h3 className="text-[12px] font-mono font-semibold uppercase tracking-wider text-[#A7B2C2]">
          Transaction & Dispute Details
        </h3>
        <dl className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#1B2634]/60 p-3.5">
            <Receipt className="mt-0.5 h-4 w-4 text-emerald-400" />
            <div>
              <dt className="text-[11.5px] font-medium text-[#A7B2C2]">Disputed Amount</dt>
              <dd className="mt-0.5 text-[14.5px] font-semibold tabular-nums text-[#F5F7FA]">
                {formatCurrency(caseItem.amount, caseItem.currency)}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#1B2634]/60 p-3.5">
            <Store className="mt-0.5 h-4 w-4 text-amber-400" />
            <div>
              <dt className="text-[11.5px] font-medium text-[#A7B2C2]">Merchant</dt>
              <dd className="mt-0.5 text-[14px] font-semibold text-[#F5F7FA]">
                {caseItem.merchant}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#1B2634]/60 p-3.5">
            <User className="mt-0.5 h-4 w-4 text-[#3B82F6]" />
            <div>
              <dt className="text-[11.5px] font-medium text-[#A7B2C2]">Buyer / Claimant</dt>
              <dd className="mt-0.5 text-[14px] font-semibold text-[#F5F7FA]">
                {caseItem.customer}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#1B2634]/60 p-3.5">
            <Tag className="mt-0.5 h-4 w-4 text-[#718096]" />
            <div>
              <dt className="text-[11.5px] font-medium text-[#A7B2C2]">Category</dt>
              <dd className="mt-0.5 text-[13.5px] font-medium text-[#F5F7FA]">
                {caseItem.category}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#1B2634]/60 p-3.5">
            <Package className="mt-0.5 h-4 w-4 text-[#718096]" />
            <div>
              <dt className="text-[11.5px] font-medium text-[#A7B2C2]">Case Filing Date</dt>
              <dd className="mt-0.5 text-[13.5px] font-medium text-[#F5F7FA]" title={caseItem.createdAt}>
                {formatDate(caseItem.createdAt)}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#1B2634]/60 p-3.5">
            <ArrowRight className="mt-0.5 h-4 w-4 text-[#718096]" />
            <div>
              <dt className="text-[11.5px] font-medium text-[#A7B2C2]">Last Interaction</dt>
              <dd className="mt-0.5 text-[13.5px] font-medium text-[#F5F7FA]">
                {formatDateTime(caseItem.updatedAt)}
              </dd>
            </div>
          </div>
        </dl>
      </div>
    </div>
  );
}
