import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  hover = false,
  glass = true,
  ...props
}: ComponentPropsWithRef<"div"> & { hover?: boolean; glass?: boolean }) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border transition-all duration-200",
        glass
          ? "border-white/[0.09] bg-[#151D28]/70 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.18)]"
          : "border-white/[0.09] bg-[#151D28] shadow-sm",
        hover && "hover:border-white/[0.18] hover:bg-[#1B2532]/80 hover:shadow-[0_8px_32px_rgba(0,0,0,0.28)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: ComponentPropsWithRef<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 px-6 pb-3 pt-5 border-b border-white/[0.06]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: ComponentPropsWithRef<"h2">) {
  return (
    <h2
      className={cn(
        "text-[15px] font-semibold tracking-[-0.011em] text-[#F4F7FB]",
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: ComponentPropsWithRef<"p">) {
  return (
    <p
      className={cn("mt-1 text-[12.5px] leading-relaxed text-[#A3AFBF]", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  className,
  ...props
}: ComponentPropsWithRef<"div">) {
  return <div className={cn("p-6", className)} {...props} />;
}

/** Header block used across dashboard and record pages. */
export function SectionHeading({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.012em] text-fg">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[12.5px] leading-relaxed text-subtle">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
