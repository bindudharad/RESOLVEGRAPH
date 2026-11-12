"use client";

import { Bell, Check, CheckCheck, Sparkles, TriangleAlert, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Dropdown, DropdownSeparator } from "@/components/ui/dropdown";
import { DemoBadge } from "@/components/common/demo-badge";
import { relativeAge } from "@/lib/utils";
import { formatNotificationTimestamp } from "@/lib/buyer-date-grouping";
import { DEMO_NOTIFICATIONS } from "@/lib/mock-data";
import type { NotificationKind } from "@/lib/types";
import { useSession } from "@/lib/auth-client";

interface NotificationViewItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  timestamp: string;
  href?: string;
  complaintId?: string | null;
  read: boolean;
}

const NOTIF_SYNC_EVENT = "rg-notifications-updated";

export function notifyNotificationsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NOTIF_SYNC_EVENT));
  }
}

export function extractComplaintIdFromHref(href?: string | null): string | null {
  if (!href) return null;
  try {
    const parsed = new URL(href, "https://resolvegraph.local");
    const complaintParam = parsed.searchParams.get("complaint");
    if (complaintParam && complaintParam.trim()) {
      return complaintParam.trim();
    }
    const match = parsed.pathname.match(/^\/cases\/([^/?#]+)$/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  } catch {
    // Fallback regex parsing
    const paramMatch = href.match(/[?&]complaint=([^&]+)/);
    if (paramMatch && paramMatch[1]) {
      return decodeURIComponent(paramMatch[1]);
    }
    const pathMatch = href.match(/\/cases\/([^/?#]+)/);
    if (pathMatch && pathMatch[1]) {
      return decodeURIComponent(pathMatch[1]);
    }
  }
  return null;
}

const KIND_ICON = {
  info: Bell,
  warning: TriangleAlert,
  success: Check,
  ai: Sparkles,
} as const;

const KIND_STROKE = {
  info: "text-sky-400",
  warning: "text-amber-400",
  success: "text-emerald-400",
  ai: "text-amber-400",
} as const;

function strokeFor(kind: NotificationKind): string {
  return KIND_STROKE[kind];
}

function mapDbTypeToKind(type?: string): NotificationKind {
  switch ((type || "INFO").toUpperCase()) {
    case "SUCCESS":
      return "success";
    case "WARNING":
    case "URGENT":
      return "warning";
    default:
      return "info";
  }
}

export function NotificationPanel() {
  const { data: session } = useSession();
  const user = session?.user as { role?: string; isPlatformAdmin?: boolean } | undefined;
  const isPlatformAdmin = Boolean(user?.isPlatformAdmin || user?.role === "ADMIN");
  const isBuyer = Boolean(user?.role === "BUYER" && !isPlatformAdmin);
  const isMerchant = Boolean(user?.role === "MERCHANT" && !isPlatformAdmin);

  if (isBuyer) {
    return <CustomerNotificationBell />;
  }

  if (isMerchant) {
    return <SellerNotificationBell />;
  }

  return <EnterpriseDemoNotificationPanel />;
}

export function SellerNotificationBell({ className }: { className?: string }) {
  return <CustomerNotificationBell portalMode="seller" className={className} />;
}

export function CustomerNotificationBell({
  onOpenComplaint,
  className,
  portalMode = "buyer",
}: {
  onOpenComplaint?: (complaintId: string) => void;
  className?: string;
  portalMode?: "buyer" | "seller";
}) {
  const [items, setItems] = useState<NotificationViewItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [allModalOpen, setAllModalOpen] = useState(false);
  const [allItems, setAllItems] = useState<NotificationViewItem[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const mapServerRows = useCallback(
    (
      rows: Array<{
        id: string;
        type?: string;
        title: string;
        body: string;
        createdAt: string;
        linkUrl?: string | null;
        isRead: boolean;
      }>
    ): NotificationViewItem[] =>
      rows.map((n) => {
        const complaintId =
          portalMode === "buyer" ? extractComplaintIdFromHref(n.linkUrl) : null;
        return {
          id: n.id,
          kind: mapDbTypeToKind(n.type),
          title: n.title,
          body: n.body,
          timestamp: n.createdAt,
          href:
            portalMode === "seller"
              ? n.linkUrl && n.linkUrl.startsWith("/seller")
                ? n.linkUrl
                : "/seller/requests"
              : complaintId
              ? `/cases?complaint=${encodeURIComponent(complaintId)}`
              : n.linkUrl || undefined,
          complaintId,
          read: Boolean(n.isRead),
        };
      }),
    [portalMode]
  );

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=30", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (!Array.isArray(json.notifications)) return;
      const mapped = mapServerRows(json.notifications);
      setItems(mapped);
      setUnreadCount(
        typeof json.unreadCount === "number"
          ? json.unreadCount
          : mapped.filter((m) => !m.read).length
      );
    } catch {
      // Non-fatal
    }
  }, [mapServerRows]);

  useEffect(() => {
    void loadNotifications();
    const onSync = () => {
      void loadNotifications();
    };
    window.addEventListener(NOTIF_SYNC_EVENT, onSync);
    return () => {
      window.removeEventListener(NOTIF_SYNC_EVENT, onSync);
    };
  }, [loadNotifications]);

  const markRead = async (id: string, currentlyRead: boolean) => {
    if (!currentlyRead) {
      setItems((curr) => curr.map((item) => (item.id === id ? { ...item, read: true } : item)));
      setAllItems((curr) => curr.map((item) => (item.id === id ? { ...item, read: true } : item)));
      setUnreadCount((c) => Math.max(0, c - 1));
      await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }).catch(() => {});
      notifyNotificationsUpdated();
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0 && items.every((i) => i.read)) return;
    setItems((curr) => curr.map((item) => ({ ...item, read: true })));
    setAllItems((curr) => curr.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
    notifyNotificationsUpdated();
  };

  const openAllNotificationsModal = async () => {
    setAllModalOpen(true);
    setLoadingAll(true);
    try {
      const res = await fetch("/api/notifications?limit=100", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.notifications)) {
          setAllItems(mapServerRows(json.notifications));
        }
      }
    } catch {
      setAllItems(items);
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => {
    if (!allModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAllModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [allModalOpen]);

  const renderRow = (item: NotificationViewItem, closeModalOnOpen?: boolean) => {
    const Icon = KIND_ICON[item.kind];
    const handleClickItem = () => {
      void markRead(item.id, item.read);
      if (closeModalOnOpen) {
        setAllModalOpen(false);
      }
      if (item.complaintId && onOpenComplaint) {
        onOpenComplaint(item.complaintId);
      }
    };

    const bodyBlock = (
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] ${strokeFor(item.kind)}`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span
              className={`text-[12.5px] leading-snug break-words ${
                item.read ? "font-medium text-[var(--ink-2)]" : "font-semibold text-[var(--ink)]"
              }`}
            >
              {item.title}
            </span>
            {!item.read && (
              <span
                aria-label="Unread"
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500"
              />
            )}
          </div>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--ink-2)] line-clamp-2 break-words">
            {item.body}
          </p>
        </div>
      </div>
    );

    const rowContent = (
      <div
        className={`w-full px-3 py-2.5 text-left transition-colors ${
          item.read
            ? "hover:bg-[var(--surface-2)]"
            : "bg-blue-500/[0.07] hover:bg-blue-500/[0.12] border-l-2 border-blue-500"
        }`}
      >
        {item.complaintId && onOpenComplaint ? (
          <button
            type="button"
            onClick={handleClickItem}
            className="block w-full text-left cursor-pointer"
          >
            {bodyBlock}
          </button>
        ) : item.href ? (
          <Link
            href={item.href}
            onClick={handleClickItem}
            className="block w-full"
            title={item.title}
          >
            {bodyBlock}
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleClickItem}
            className="block w-full text-left cursor-pointer"
          >
            {bodyBlock}
          </button>
        )}

        <div className="mt-1 pl-10 flex items-center justify-between gap-2">
          <span className="text-[11px] text-[var(--ink-3)]">
            {formatNotificationTimestamp(item.timestamp)}
          </span>
          {!item.read && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void markRead(item.id, item.read);
              }}
              className="text-[10.5px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0"
            >
              Mark read
            </button>
          )}
        </div>
      </div>
    );

    return rowContent;
  };

  return (
    <>
      <Dropdown
        label="Notifications"
        width="w-[min(24rem,calc(100vw-2rem))]"
        className={className}
        trigger={(props) => (
          <button
            type="button"
            {...props}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            <Bell className="h-[17px] w-[17px]" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                data-testid="notification-unread-badge"
                className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[var(--surface)]"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        )}
      >
        <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-1.5">
          <div>
            <span className="text-[13px] font-semibold text-[var(--ink)]">Notifications</span>
            <p className="text-[11px] text-[var(--ink-3)]">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void markAllRead();
            }}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 transition-colors hover:bg-[var(--surface-2)] disabled:pointer-events-none disabled:opacity-45"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </button>
        </div>

        <DropdownSeparator />

        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-[var(--ink-3)]">
            {portalMode === "seller"
              ? "No notifications yet. Evidence request updates will appear here."
              : "No notifications yet. Updates on your complaints will appear here."}
          </p>
        ) : (
          <ul className="max-h-[min(56vh,21rem)] divide-y divide-[var(--line)] overflow-y-auto overscroll-contain">
            {items.slice(0, 15).map((item) => (
              <li key={item.id}>{renderRow(item)}</li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <>
            <DropdownSeparator />
            <div className="px-2 pt-1 pb-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void openAllNotificationsModal();
                }}
                className="w-full rounded-md py-1.5 text-center text-[12px] font-medium text-blue-600 dark:text-blue-400 transition-colors hover:bg-[var(--surface-2)]"
              >
                View all notifications
              </button>
            </div>
          </>
        )}
      </Dropdown>

      {allModalOpen && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAllModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="All notifications"
            className="flex max-h-[82vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--ink)]">All Notifications</h2>
                <p className="text-[11.5px] text-[var(--ink-3)]">
                  {unreadCount > 0 ? `${unreadCount} unread updates` : "All notifications read"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  disabled={unreadCount === 0}
                  className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-[11.5px] font-medium text-blue-600 dark:text-blue-400 hover:bg-[var(--surface-2)] disabled:opacity-45"
                >
                  Mark all as read
                </button>
                <button
                  type="button"
                  onClick={() => setAllModalOpen(false)}
                  aria-label="Close notifications"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[var(--line)]">
              {loadingAll ? (
                <p className="px-5 py-8 text-center text-xs text-[var(--ink-3)]">
                  Loading notifications…
                </p>
              ) : allItems.length === 0 ? (
                <p className="px-5 py-8 text-center text-xs text-[var(--ink-3)]">
                  No notifications recorded yet.
                </p>
              ) : (
                allItems.map((item) => <div key={item.id}>{renderRow(item, true)}</div>)
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Frontend demo panel driven by mock notifications for non-buyer operational workspaces.
 */
function EnterpriseDemoNotificationPanel() {
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
            <span aria-hidden="true" className="absolute right-1.5 top-1.5 flex h-2 w-2">
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
          className="rounded px-1.5 py-1 text-[11px] font-medium text-amber-400 transition-colors hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-45"
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
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] ${strokeFor(item.kind)}`}
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
