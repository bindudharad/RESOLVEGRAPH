import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  hover = false,
  ...props
}: ComponentPropsWithRef<"div"> & { hover?: boolean }) {
  return (
    <div
      className={cn("rg-card", hover && "rg-card-hover", className)}
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
        "flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pt-4.5",
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
        "text-[14.5px] font-semibold tracking-[-0.011em] text-fg",
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
      className={cn("mt-1 text-[12.5px] leading-relaxed text-subtle", className)}
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
  return <div className={cn("px-5 pb-5", className)} {...props} />;
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
