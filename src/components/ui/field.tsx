import { ChevronDown } from "lucide-react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

const FIELD_BASE =
  "w-full rounded-xl border border-white/[0.09] bg-[#151D28]/70 backdrop-blur-md text-[13px] text-[#F4F7FB] placeholder:text-[#718096] " +
  "transition-all duration-150 " +
  "focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/25 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const VALID =
  "hover:border-white/[0.18]";
const INVALID =
  "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/25";

export interface InputProps extends ComponentPropsWithRef<"input"> {
  invalid?: boolean;
  icon?: ReactNode;
}

export function Input({
  invalid = false,
  icon,
  className,
  id,
  ...props
}: InputProps) {
  const field = (
    <input
      id={id}
      aria-invalid={invalid || undefined}
      className={cn(
        FIELD_BASE,
        invalid ? INVALID : VALID,
        icon ? "h-9 pl-9 pr-3" : "h-9 px-3",
        className,
      )}
      {...props}
    />
  );

  if (!icon) return field;

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-[var(--ink-3)]"
      >
        {icon}
      </span>
      {field}
    </div>
  );
}

export interface TextareaProps extends ComponentPropsWithRef<"textarea"> {
  invalid?: boolean;
}

export function Textarea({
  invalid = false,
  className,
  rows = 4,
  ...props
}: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        FIELD_BASE,
        invalid ? INVALID : VALID,
        "min-h-[88px] resize-y px-3 py-2.5 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export interface SelectProps extends ComponentPropsWithRef<"select"> {
  invalid?: boolean;
}

/**
 * Native <select> — keyboard and screen-reader behaviour comes for free,
 * and it stays usable inside compact filter toolbars.
 */
export function Select({
  invalid = false,
  className,
  children,
  ...props
}: SelectProps) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={cn(
          FIELD_BASE,
          invalid ? INVALID : VALID,
          "h-9 cursor-pointer appearance-none py-0 pl-3 pr-8",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-2.5 my-auto h-3.5 w-3.5 text-[var(--ink-3)]"
      />
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[12.5px] font-medium text-[var(--ink-2)]"
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-[var(--danger)]">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-[11.5px] text-[var(--danger)] font-medium">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11.5px] text-[var(--ink-3)]">{hint}</p>
      ) : null}
    </div>
  );
}
