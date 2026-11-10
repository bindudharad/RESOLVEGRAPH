"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error" | "info";

export interface ToastRecord {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  isDemo?: boolean;
}

interface ToastApi {
  toast: (input: { title: string; description?: string; tone?: ToastTone; isDemo?: boolean }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

const TONE_STROKE = {
  success: "text-[#4fdcae]",
  error: "text-[#fa8b8b]",
  info: "text-[#5ccdf7]",
} as const;

const AUTO_DISMISS_MS = 5000;

let activeToastFn: ToastApi["toast"] | null = null;

export const toast = {
  success: (title: string, options?: { description?: string; isDemo?: boolean }) => {
    if (activeToastFn) {
      activeToastFn({ title, description: options?.description, tone: "success", isDemo: options?.isDemo });
    }
  },
  error: (title: string, options?: { description?: string; isDemo?: boolean }) => {
    if (activeToastFn) {
      activeToastFn({ title, description: options?.description, tone: "error", isDemo: options?.isDemo });
    }
  },
  info: (title: string, options?: { description?: string; isDemo?: boolean }) => {
    if (activeToastFn) {
      activeToastFn({ title, description: options?.description, tone: "info", isDemo: options?.isDemo });
    }
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toastFn = useCallback<ToastApi["toast"]>(
    ({ title, description, tone = "info", isDemo = true }) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-3), { id, title, description, tone, isDemo }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    activeToastFn = toastFn;
    return () => {
      activeToastFn = null;
    };
  }, [toastFn]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const api = useMemo(() => ({ toast: toastFn }), [toastFn]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return context;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-200 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end"
    >
      {toasts.map((item) => {
        const Icon = TONE_ICON[item.tone];
        return (
          <div
            key={item.id}
            role="status"
            className="rg-anim-rise pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 py-3 shadow-2xl"
          >
            <Icon
              className={cn("mt-0.5 h-4 w-4 shrink-0", TONE_STROKE[item.tone])}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-medium leading-snug text-[var(--ink)]">{item.title}</p>
                {item.isDemo && (
                  <span className="rounded bg-[var(--surface-2)] border border-[var(--line-strong)] px-1.5 py-0.2 text-[10px] font-mono uppercase tracking-wider text-[var(--ink-3)]">
                    Demo
                  </span>
                )}
              </div>
              {item.description ? (
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink-2)]">
                  {item.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              aria-label="Dismiss notification"
              className="-mr-1.5 shrink-0 rounded p-1 text-faint transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
