import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { CaseStatus } from "@/lib/types";

export const STATUS_TONE: Record<CaseStatus, BadgeTone> = {
  Open: "info",
  "Under Investigation": "brand",
  "Awaiting Merchant": "warning",
  "Awaiting Buyer": "accent",
  Resolved: "success",
  Escalated: "danger",
};

/** Short accessibility label so colour is never the only signal. */
const STATUS_MEANING: Record<CaseStatus, string> = {
  Open: "Open — no investigation started yet",
  "Under Investigation": "Under investigation — evidence under review",
  "Awaiting Merchant": "Awaiting merchant response",
  "Awaiting Buyer": "Awaiting buyer response",
  Resolved: "Resolved — closed with an agreed outcome",
  Escalated: "Escalated — needs immediate attention",
};

export function CaseStatusBadge({
  status,
  withTitle = true,
}: {
  status: CaseStatus;
  withTitle?: boolean;
}) {
  return (
    <Badge tone={STATUS_TONE[status]} dot title={withTitle ? STATUS_MEANING[status] : undefined}>
      {status}
    </Badge>
  );
}
