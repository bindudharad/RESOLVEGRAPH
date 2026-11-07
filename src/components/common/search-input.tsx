"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, type ComponentPropsWithRef } from "react";
import { Kbd } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends Omit<ComponentPropsWithRef<"input">, "onChange" | "value"> {
  value: string;
  onValueChange: (value: string) => void;
  /** Show the ⌘K hint on the trailing edge. */
  shortcut?: boolean;
  /** Small "Planned" chip signalling a not-yet-implemented capability. */
  plannedChip?: boolean;
}

/**
 * Controlled search field with a clear affordance, keyboard shortcut hint
 * and an optional "Planned" marker for capabilities still in development.
 */
export function SearchInput({
  value,
  onValueChange,
  shortcut = false,
  plannedChip = false,
  placeholder = "Search…",
  className,
  ...props
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isK = event.key.toLowerCase() === "k";
      if (!isK) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={cn("relative w-full", className)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-faint"
      >
        <Search className="h-4 w-4" />
      </span>

      <input
        ref={inputRef}
        type="search"
        role="searchbox"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          "h-9 w-full rounded-md border border-line bg-[#0a1120] text-[13px] text-fg placeholder:text-faint",
          "pl-9 transition-[border-color,box-shadow] duration-150",
          "focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-brand)_35%,transparent)]",
          plannedChip ? "pr-[86px]" : shortcut ? "pr-16" : value ? "pr-9" : "pr-3",
          "[&::-webkit-search-cancel-button]:hidden",
        )}
        {...props}
      />

      {value ? (
        <button
          type="button"
          onClick={() => {
            onValueChange("");
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute inset-y-0 right-2 my-auto flex h-6 w-6 items-center justify-center rounded text-faint transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : plannedChip ? (
        <span
          className="absolute inset-y-0 right-2 my-auto flex h-5 items-center rounded border border-[color-mix(in_srgb,var(--color-brand)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_15%,transparent)] px-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#b3a1ff]"
          title="Global search across cases and evidence is planned for a later phase"
        >
          Planned
        </span>
      ) : shortcut ? (
        <span className="pointer-events-none absolute inset-y-0 right-2 my-auto hidden h-5 items-center gap-0.5 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      ) : null}
    </div>
  );
}
