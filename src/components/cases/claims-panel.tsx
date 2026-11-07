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
    <div className="rg-card flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h3 className="text-[14px] font-semibold text-fg">Party Claims & Statements</h3>
          <p className="mt-0.5 text-[12.5px] text-subtle">
            Unedited statements registered by the buyer and merchant during dispute intake.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-faint">
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
              className={`flex flex-col justify-between rounded-lg border p-4.5 transition-colors ${
                isBuyer
                  ? "border-[color-mix(in_srgb,var(--color-brand)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_90%,var(--color-brand)_10%)]"
                  : "border-line bg-surface-2"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                        isBuyer
                          ? "bg-[color-mix(in_srgb,var(--color-brand)_20%,transparent)] text-[#b3a1ff]"
                          : "bg-surface-3 text-[#38bdf8]"
                      }`}
                    >
                      {isBuyer ? <User className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-fg">
                          {claim.author}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${
                            isBuyer
                              ? "bg-[color-mix(in_srgb,var(--color-brand)_18%,transparent)] text-[#a08bff]"
                              : "bg-[color-mix(in_srgb,var(--color-info)_18%,transparent)] text-[#38bdf8]"
                          }`}
                        >
                          {claim.party}
                        </span>
                      </div>
                      <span className="text-[11px] text-faint">
                        Submitted {formatDateTime(claim.submittedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-md border border-line bg-app/60 p-3.5">
                  <blockquote className="text-[13px] leading-relaxed text-muted italic">
                    &ldquo;{claim.statement}&rdquo;
                  </blockquote>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-[11px] text-faint">
                <span className="inline-flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3 text-subtle" />
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
