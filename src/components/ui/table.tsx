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
        "border-b border-white/[0.09] bg-[#111821]/80 backdrop-blur-md",
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
  return <tbody className={cn("divide-y divide-white/[0.05]", className)} {...props} />;
}

export function TableRow({
  className,
  ...props
}: ComponentPropsWithRef<"tr">) {
  return (
    <tr
      className={cn(
        "transition-colors duration-150 hover:bg-white/[0.03]",
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
        "whitespace-nowrap px-4 py-3 text-[10.5px] font-mono font-semibold uppercase tracking-[0.08em] text-[#718096]",
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
        "px-4 py-3.5 align-middle text-[#A3AFBF] text-[13px]",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    />
  );
}
