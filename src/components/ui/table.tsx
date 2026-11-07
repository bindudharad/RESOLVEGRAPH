import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: ComponentPropsWithRef<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full caption-bottom border-collapse text-[13px]", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: ComponentPropsWithRef<"thead">) {
  return (
    <thead
      className={cn(
        "border-b border-line bg-[#0a1120]",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: ComponentPropsWithRef<"tbody">) {
  return <tbody className={cn("divide-y divide-line", className)} {...props} />;
}

export function TableRow({
  className,
  ...props
}: ComponentPropsWithRef<"tr">) {
  return (
    <tr
      className={cn(
        "transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--color-brand)_5%,transparent)]",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  align = "left",
  ...props
}: ComponentPropsWithRef<"th"> & { align?: "left" | "right" | "center" }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  align = "left",
  ...props
}: ComponentPropsWithRef<"td"> & { align?: "left" | "right" | "center" }) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle text-muted",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    />
  );
}
