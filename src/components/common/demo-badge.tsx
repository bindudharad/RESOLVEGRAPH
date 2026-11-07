import { cn } from "@/lib/utils";

/**
 * Unobtrusive marker shown in the sidebar, top bar and on metric surfaces so
 * demonstration figures are never mistaken for real business statistics.
 */
export function DemoBadge({
  size = "sm",
  className,
}: {
  size?: "xs" | "sm";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border border-[color-mix(in_srgb,var(--color-warning)_32%,transparent)] " +
          "bg-[color-mix(in_srgb,var(--color-warning)_11%,transparent)] font-semibold uppercase " +
          "text-[#f7c95c] tabular-nums",
        size === "xs" ? "px-1.5 py-px text-[9.5px] tracking-[0.09em]" : "px-2 py-0.5 text-[10px] tracking-[0.08em]",
        className,
      )}
    >
      <span aria-hidden="true" className="h-1 w-1 rounded-full bg-current" />
      Demo data
    </span>
  );
}
