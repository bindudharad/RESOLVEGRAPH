"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  FileText,
  FolderOpen,
  HelpCircle,
  Home,
  Inbox,
  LayoutDashboard,
  Library,
  Plus,
  Search,
  Settings,
  Sparkles,
  X,
  CreditCard,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Package,
  MessageSquare,
  FileSearch,
  UploadCloud,
  Layers,
  Languages,
  Bot,
  Building2,
  PlayCircle,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { useDemoCases } from "@/hooks/use-demo-cases";
import { DEMO_EVIDENCE } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

interface CommandItem {
  id: string;
  category: "Navigation" | "Cases" | "Evidence" | "Actions";
  title: string;
  subtitle?: string;
  icon: typeof Search;
  href?: string;
  action?: () => void;
  badge?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onCreateCase?: () => void;
}

export function CommandPalette({ open, onClose, onCreateCase }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { cases } = useDemoCases();

  const items = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];

    // Quick Actions (Section 4.2)
    list.push({
      id: "act-create-case",
      category: "Actions",
      title: "Create New Case",
      subtitle: "Open interactive dispute registration form",
      icon: Plus,
      action: () => {
        onClose();
        onCreateCase?.();
      },
    });

    list.push({
      id: "act-switch-theme",
      category: "Actions",
      title: "Toggle Theme (Light / Dark)",
      subtitle: "Switch between light-first and calibrated dark theme",
      icon: Settings,
      action: () => {
        onClose();
        const root = document.documentElement;
        const current = root.getAttribute("data-theme") || "light";
        const next = current === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        if (next === "dark") root.classList.add("dark");
        else root.classList.remove("dark");
        localStorage.setItem("rg.theme", next);
      },
    });

    list.push({
      id: "act-reduce-motion",
      category: "Actions",
      title: "Reduce Motion",
      subtitle: "Disable parallax and clamp transitions to 120ms fades",
      icon: Settings,
      action: () => {
        onClose();
        const root = document.documentElement;
        const current = root.getAttribute("data-motion") || "full";
        const next = current === "reduced" ? "full" : "reduced";
        root.setAttribute("data-motion", next);
        if (next === "reduced") root.classList.add("reduce-motion");
        else root.classList.remove("reduce-motion");
        localStorage.setItem("rg.motion", next);
      },
    });

    // Navigation Pages
    const pages = [
      { title: "Home — Investigation Command Center", href: "/dashboard", icon: Home },
      { title: "Case Management", href: "/cases", icon: FolderOpen },
      { title: "Payment Incidents & Forensics", href: "/incidents", icon: FileSearch },
      { title: "Universal Intake", href: "/intake", icon: UploadCloud },
      { title: "Cross-Reconciliation", href: "/reconciliation", icon: Layers },
      { title: "Purchase Memory", href: "/purchases", icon: ShoppingCart },
      { title: "Package Passports", href: "/packages", icon: Package },
      { title: "Shared Resolution Room", href: "/resolution-room", icon: MessageSquare },
      { title: "Payments & Refunds", href: "/payments", icon: CreditCard },
      { title: "PayPal Disputes", href: "/paypal/disputes", icon: ShieldAlert },
      { title: "Evidence Library", href: "/evidence", icon: Library },
      { title: "Resolution Center", href: "/resolution", icon: Inbox },
      { title: "AI Copilot Orchestrator", href: "/copilot", icon: Bot },
      { title: "Investigation Insights (BERR)", href: "/investigation", icon: Sparkles },
      { title: "Multilingual Voice Intake", href: "/multilingual", icon: Languages },
      { title: "Security & Kill Switch", href: "/admin/security", icon: ShieldCheck },
      { title: "Analytics & Reporting", href: "/analytics", icon: BarChart3 },
      { title: "Organizations & Team", href: "/organizations", icon: Building2 },
      { title: "Guided Interactive Demo", href: "/demo", icon: PlayCircle },
      { title: "Documentation & API Reference", href: "/docs", icon: BookOpen },
      { title: "BERR Methodology & Benchmarks", href: "/methodology", icon: GraduationCap },
      { title: "Settings & Profile", href: "/settings", icon: Settings },
      { title: "Help & Support", href: "/help", icon: HelpCircle },
    ];

    for (const p of pages) {
      list.push({
        id: `nav-${p.href}`,
        category: "Navigation",
        title: p.title,
        icon: p.icon,
        href: p.href,
      });
    }

    // Active Cases
    for (const c of cases) {
      list.push({
        id: `case-${c.id}`,
        category: "Cases",
        title: `${c.id} · ${c.title}`,
        subtitle: `${c.customer} (Buyer) vs. ${c.merchant} · ${formatCurrency(c.amount, c.currency)}`,
        icon: FolderOpen,
        href: `/cases/${c.id}`,
        badge: c.status,
      });
    }

    // Evidence
    for (const ev of DEMO_EVIDENCE.slice(0, 8)) {
      list.push({
        id: `ev-${ev.id}`,
        category: "Evidence",
        title: ev.name,
        subtitle: `Case ${ev.caseId} · ${ev.type} · ${ev.uploadedBy}`,
        icon: FileText,
        href: `/cases/${ev.caseId}`,
        badge: ev.verification,
      });
    }

    if (!query.trim()) return list;

    const q = query.toLowerCase().trim();
    return list.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle?.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      return matchTitle || matchSubtitle || matchCat;
    });
  }, [query, cases, onClose, onCreateCase]);

  // Derive clamped safe index during render (no effect needed)
  const safeIndex = items.length === 0 ? 0 : Math.min(selectedIndex, items.length - 1);

  const handleSelect = (item: CommandItem) => {
    setQuery("");
    setSelectedIndex(0);
    onClose();
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
  };

  const handleClose = () => {
    setQuery("");
    setSelectedIndex(0);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, items.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[safeIndex]) {
        handleSelect(items[safeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] sm:pt-[15vh]"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Palette Panel */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-line-2 bg-[#090f1d] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.9)] animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-[#a08bff]" />
          <input
            ref={inputRef}
            type="text"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, case ID, customer or file name…"
            className="h-13 w-full bg-transparent px-3 text-[14px] text-fg placeholder:text-faint focus:outline-none"
          />
          <button
            type="button"
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded text-faint hover:bg-surface-2 hover:text-fg"
            aria-label="Close command palette"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 scrollbar-thin">
          {items.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-faint">
              No matching commands or dispute records found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {items.map((item, index) => {
                const isSelected = index === safeIndex;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? "bg-[color-mix(in_srgb,var(--color-brand)_18%,transparent)] text-fg"
                        : "text-muted hover:bg-surface-2/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                          isSelected
                            ? "border-[var(--color-brand)] bg-[var(--color-brand-solid)] text-white"
                            : "border-line bg-surface-2 text-subtle"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium truncate text-fg">
                            {item.title}
                          </span>
                          <span className="text-[10.5px] uppercase tracking-wider text-faint font-semibold">
                            {item.category}
                          </span>
                        </div>
                        {item.subtitle && (
                          <p className="truncate text-[11.5px] text-faint mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {item.badge && (
                        <span className="rounded bg-surface-3 px-2 py-0.5 text-[10.5px] font-medium text-subtle">
                          {item.badge}
                        </span>
                      )}
                      {isSelected && (
                        <ArrowRight className="h-3.5 w-3.5 text-amber-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="flex items-center justify-between border-t border-line bg-surface px-4 py-2 text-[11px] text-faint">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-line bg-surface-2 px-1 font-mono text-[10px]">↑</kbd>{" "}
              <kbd className="rounded border border-line bg-surface-2 px-1 font-mono text-[10px]">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="rounded border border-line bg-surface-2 px-1.5 font-mono text-[10px]">↵</kbd> to select
            </span>
            <span>
              <kbd className="rounded border border-line bg-surface-2 px-1 font-mono text-[10px]">esc</kbd> to close
            </span>
          </div>
          <span>RESOLVEGRAPH Universal Search</span>
        </div>
      </div>
    </div>
  );
}
