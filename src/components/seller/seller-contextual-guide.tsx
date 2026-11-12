"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Info, X } from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface SellerContextualGuideProps {
  guideId: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  compactLabel?: string;
}

function getStorageKey(userId: string | undefined, guideId: string): string {
  return `rg_seller_contextual_guide:v1:${userId || "anonymous"}:${guideId}`;
}

export function SellerContextualGuide({
  guideId,
  title,
  children,
  defaultOpen = true,
  compactLabel,
}: SellerContextualGuideProps) {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const [open, setOpen] = useState(defaultOpen);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  const storageKey = getStorageKey(userId, guideId);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === "dismissed") {
        setOpen(false);
      } else if (saved === "open") {
        setOpen(true);
      } else {
        setOpen(defaultOpen);
      }
    } catch {
      setOpen(defaultOpen);
    } finally {
      setHydratedKey(storageKey);
    }
  }, [defaultOpen, storageKey]);

  const toggleOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    try {
      window.localStorage.setItem(storageKey, nextOpen ? "open" : "dismissed");
    } catch {
      // Ignore storage errors cleanly
    }
  };

  if (!open) {
    return (
      <div className="flex items-center justify-end" data-guide-id={guideId}>
        <button
          type="button"
          onClick={() => toggleOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-[11px] font-medium text-[var(--ink-2)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--ink)]"
        >
          <Info className="h-3 w-3 text-[var(--accent)]" aria-hidden="true" />
          <span>{compactLabel || `Show guide: ${title}`}</span>
          <ChevronDown className="h-3 w-3 opacity-70" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label={title}
      data-guide-id={guideId}
      data-hydrated={hydratedKey === storageKey ? "true" : "false"}
      className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/45 px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]"
            aria-hidden="true"
          />
          <div className="min-w-0 space-y-1.5">
            <p className="font-semibold text-[var(--ink)]">{title}</p>
            <div className="space-y-1.5">{children}</div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => toggleOpen(false)}
            aria-label={`Hide ${title}`}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--ink-3)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)]"
          >
            <span className="hidden sm:inline">Hide</span>
            <ChevronUp className="h-3.5 w-3.5 sm:hidden" aria-hidden="true" />
            <X className="hidden sm:inline h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
