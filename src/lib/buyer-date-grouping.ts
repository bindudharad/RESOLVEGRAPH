export interface DateComplaintGroup<T> {
  dateKey: string; // YYYY-MM-DD in local timezone
  heading: string; // "Today" | "Yesterday" | "November 9, 2026"
  items: T[];
}

function localCalendarKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateHeading(isoOrDate: string | Date, referenceNow: Date = new Date()): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return "Unknown date";

  const todayKey = localCalendarKey(referenceNow);
  const yesterdayDate = new Date(
    referenceNow.getFullYear(),
    referenceNow.getMonth(),
    referenceNow.getDate() - 1
  );
  const yesterdayKey = localCalendarKey(yesterdayDate);
  const itemKey = localCalendarKey(date);

  if (itemKey === todayKey) return "Today";
  if (itemKey === yesterdayKey) return "Yesterday";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatComplaintTimestamp(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return "";

  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${datePart} · ${timePart}`;
}

export function formatShortTimelineTimestamp(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatNotificationTimestamp(
  isoOrDate: string | Date,
  referenceNow: Date = new Date()
): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return "";

  const sameYear = date.getFullYear() === referenceNow.getFullYear();
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: sameYear ? "long" : "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${datePart} · ${timePart}`;
}

export function groupComplaintsByDate<T extends { createdAt: string }>(
  items: T[],
  referenceNow: Date = new Date()
): DateComplaintGroup<T>[] {
  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const groupsMap = new Map<string, DateComplaintGroup<T>>();

  for (const item of sorted) {
    const d = new Date(item.createdAt);
    const key = Number.isNaN(d.getTime()) ? "unknown" : localCalendarKey(d);
    const existing = groupsMap.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      groupsMap.set(key, {
        dateKey: key,
        heading: formatDateHeading(d, referenceNow),
        items: [item],
      });
    }
  }

  return Array.from(groupsMap.values());
}

export function formatPurchaseAmount(amount: number, currency: string): string {
  const code = (currency || "INR").toUpperCase();
  const isWhole = Math.abs(amount - Math.round(amount)) < 0.001;
  try {
    return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const sym = code === "INR" ? "₹" : code === "USD" ? "$" : code === "GBP" ? "£" : "€";
    return `${sym}${amount.toFixed(isWhole ? 0 : 2)}`;
  }
}
