import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { CasePriority } from "@/lib/types";

const PRIORITY_TONE: Record<CasePriority, BadgeTone> = {
  High: "danger",
  Medium: "warning",
  Low: "neutral",
};

const PRIORITY_MEANING: Record<CasePriority, string> = {
  High: "High priority — respond first",
  Medium: "Medium priority — standard queue",
  Low: "Low priority — no immediate action",
};

export function PriorityBadge({
  priority,
  withTitle = true,
}: {
  priority: CasePriority;
  withTitle?: boolean;
}) {
  return (
    <Badge
      tone={PRIORITY_TONE[priority]}
      title={withTitle ? PRIORITY_MEANING[priority] : undefined}
      className="min-w-[68px] justify-center"
    >
      {priority}
    </Badge>
  );
}
