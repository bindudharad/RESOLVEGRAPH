import { Chip, type ChipVariant } from "@/components/ui/chip";
import type { CasePriority } from "@/lib/types";

const PRIORITY_VARIANT_MAP: Record<CasePriority, ChipVariant> = {
  High: "contested",
  Medium: "neutral",
  Low: "neutral",
};

export function PriorityBadge({
  priority,
  withTitle = true,
}: {
  priority: CasePriority;
  withTitle?: boolean;
}) {
  const variant = PRIORITY_VARIANT_MAP[priority] || "neutral";
  return (
    <Chip variant={variant} title={withTitle ? `Priority: ${priority}` : undefined}>
      {priority}
    </Chip>
  );
}
