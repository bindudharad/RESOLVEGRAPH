"use client";

import { Bell, Check, Sparkles, TriangleAlert } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Dropdown, DropdownSeparator } from "@/components/ui/dropdown";
import { DemoBadge } from "@/components/common/demo-badge";
import { relativeAge } from "@/lib/utils";
import { DEMO_NOTIFICATIONS } from "@/lib/mock-data";
import type { NotificationKind } from "@/lib/types";

const KIND_ICON = {
  info: Bell,
  warning: TriangleAlert,
  success: Check,
  ai: Sparkles,
} as const;

const KIND_STROKE = {
  info: "text-[#5ccdf7]",
  warning: "text-[#f7c95c]",
  success: "text-[#4fdcae]",
  ai: "text-[#b3a1ff]",
} as const;

function strokeFor(kind: NotificationKind): string {
  return KIND_STROKE[kind];
}

/**
 * Frontend demo panel driven by mock notifications — no backend is involved,
 * and every entry is labelled as demonstration content.
 */
export function NotificationPanel() {
  const [items, setItems] = useState(DEMO_NOTIFICATIONS);
  const unread = items.filter((item) => !item.read).length;

  const markAllRead = () =>
    setItems((current) => current.map((item) => ({ ...item, read: true })));

  return (
    <Dropdown
      label="Notifications"
      width="w-[min(22rem,calc(100vw-2rem))]"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
          className="relative flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted transition-colors hover:border-line hover:bg-surface-2 hover:text-fg"
        >
          <Bell className="h-[17px] w-[17px]" aria-hidden="true" />
          {unread > 0 ? (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 flex h-2 w-2"
            >
              <span className="absolute inline-flex h-full w-full animate-[rg-ping_1.8s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-[var(--color-danger)] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-danger)] ring-2 ring-[var(--color-surface)]" />
            </span>
          ) : null}
        </button>
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-fg">Notifications</span>
          <DemoBadge size="xs" />
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unread === 0}
          className="rounded px-1.5 py-1 text-[11px] font-medium text-[#b3a1ff] transition-colors hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-45"
        >
          Mark all read
        </button>
      </div>

      <DropdownSeparator />

      <ul className="max-h-[min(60vh,22rem)] overflow-y-auto overscroll-contain">
        {items.map((item) => {
          const Icon = KIND_ICON[item.kind];
          const body = (
            <span className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-surface-2">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line bg-[#0a1120] ${strokeFor(item.kind)}`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span
                    className={`truncate text-[12.5px] font-medium ${
                      item.read ? "text-muted" : "text-fg"
                    }`}
                  >
                    {item.title}
                  </span>
                  {!item.read ? (
                    <span
                      aria-label="Unread"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand)]"
                    />
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-relaxed text-subtle">
                  {item.body}
                </span>
                <span className="mt-1 block text-[10.5px] uppercase tracking-[0.06em] text-faint">
                  {relativeAge(item.timestamp)}
                </span>
              </span>
            </span>
          );

          return (
            <li key={item.id}>
              {item.href ? (
                <Link href={item.href} className="block" title={item.title}>
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>

      <DropdownSeparator />

      <p className="px-3 pb-1.5 text-[11px] leading-relaxed text-faint">
        Mock notifications for interface demonstration only.
      </p>
    </Dropdown>
  );
}
