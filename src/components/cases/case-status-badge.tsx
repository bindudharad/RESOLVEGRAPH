import { Chip, type ChipVariant } from "@/components/ui/chip";
import type { CaseStatus } from "@/lib/types";

export const STATUS_VARIANT_MAP: Record<CaseStatus, ChipVariant> = {
  Open: "buyer",
  "Under Investigation": "ai",
  "Awaiting Merchant": "merchant",
  "Awaiting Buyer": "contested",
  Resolved: "agreed",
  Escalated: "danger",
};

export function CaseStatusBadge({
  status,
  withTitle = true,
}: {
  status: CaseStatus;
  withTitle?: boolean;
}) {
  const variant = STATUS_VARIANT_MAP[status] || "neutral";
  return (
    <Chip variant={variant} title={withTitle ? `Status: ${status}` : undefined}>
      {status}
    </Chip>
  );
}
