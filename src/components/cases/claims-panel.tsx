import { MessageSquare, ShieldAlert, Store, User } from "lucide-react";
import type { ResolutionCase } from "@/lib/types";
import { FEATURED_CLAIMS } from "@/lib/mock-data";
import { formatDateTime } from "@/lib/utils";

interface ClaimsPanelProps {
  caseItem: ResolutionCase;
}

export function ClaimsPanel({ caseItem }: ClaimsPanelProps) {
  const claims = FEATURED_CLAIMS[caseItem.id] ?? [
    {
      party: "Buyer" as const,
      author: caseItem.customer,
      submittedAt: caseItem.createdAt,
      statement: caseItem.description,
    },
    {
      party: "Merchant" as const,
      author: caseItem.merchant,
      submittedAt: caseItem.updatedAt,
      statement: `We have received the inquiry regarding case ${caseItem.id}. Our inventory and fulfillment log has been flagged for review. We request verification documents to substantiate the discrepancy before final remedy determination.`,
    },
  ];

  return (
    <div className="glass-card flex flex-col gap-5 p-5 sm:p-6 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div>
          <h3 className="text-[14px] font-semibold text-[#F5F7FA]">Party Claims &amp; Statements</h3>
          <p className="mt-0.5 text-[12.5px] text-[#A7B2C2]">
            Unedited statements registered by the buyer and merchant during dispute intake.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#748195]">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{claims.length} statements on record</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {claims.map((claim, index) => {
          const isBuyer = claim.party === "Buyer";
          return (
            <div
              key={index}
              className={`flex flex-col justify-between rounded-xl border p-4.5 transition-all ${
                isBuyer
                  ? "border-[#3B82F6]/30 bg-[#3B82F6]/5"
                  : "border-white/[0.08] bg-[#1B2634]/60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold ${
                        isBuyer
                          ? "bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {isBuyer ? <User className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[#F5F7FA]">
                          {claim.author}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider ${
                            isBuyer
                              ? "bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30"
                              : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {claim.party}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#748195]">
                        Submitted {formatDateTime(claim.submittedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#111821]/70 p-3.5">
                  <blockquote className="text-[13px] leading-relaxed text-[#A7B2C2] italic">
                    &ldquo;{claim.statement}&rdquo;
                  </blockquote>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3 text-[11px] text-[#748195]">
                <span className="inline-flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3 text-[#3B82F6]" />
                  Tamper-evident record
                </span>
                <span>Signed electronically</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
