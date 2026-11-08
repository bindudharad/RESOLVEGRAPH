import {
  BarChart3,
  Bot,
  Building2,
  CreditCard,
  FolderOpen,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  Library,
  MessageSquare,
  Package,
  PlayCircle,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UploadCloud,
  FileSearch,
  Layers,
  Languages,
  type LucideIcon,
} from "lucide-react";

/**
 * Navigation availability.
 *
 * `live`    — fully designed and interactive in Step 1.
 * `preview` — routed, but renders an explicit placeholder so it can never be
 *             mistaken for finished backend functionality.
 */
export type NavAvailability = "live" | "preview";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  availability: NavAvailability;
  /** Short explanation shown on preview routes. */
  previewNote?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        availability: "live",
      },
      {
        label: "Guided Demo",
        href: "/demo",
        icon: PlayCircle,
        availability: "live",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "All Cases",
        href: "/cases",
        icon: FolderOpen,
        availability: "live",
      },
      {
        label: "Purchase Memory",
        href: "/purchases",
        icon: ShoppingCart,
        availability: "live",
      },
      {
        label: "Package Passports",
        href: "/packages",
        icon: Package,
        availability: "live",
      },
      {
        label: "Shared Resolution Room",
        href: "/resolution-room",
        icon: MessageSquare,
        availability: "live",
      },
      {
        label: "Payments & Refunds",
        href: "/payments",
        icon: CreditCard,
        availability: "live",
      },
      {
        label: "PayPal Disputes",
        href: "/paypal/disputes",
        icon: ShieldAlert,
        availability: "live",
      },
      {
        label: "Evidence Library",
        href: "/evidence",
        icon: Library,
        availability: "preview",
        previewNote:
          "Sample evidence records are shown. Persistent upload and storage arrive in a later phase.",
      },
      {
        label: "Resolution Center",
        href: "/resolution",
        icon: Inbox,
        availability: "preview",
        previewNote:
          "Remedy queues are illustrative. The resolution engine and payment actions are not built yet.",
      },
    ],
  },
  {
    label: "Payment Investigation",
    items: [
      {
        label: "Payment Incidents",
        href: "/incidents",
        icon: FileSearch,
        availability: "live",
      },
      {
        label: "Universal Intake",
        href: "/intake",
        icon: UploadCloud,
        availability: "live",
      },
      {
        label: "Cross-Reconciliation",
        href: "/reconciliation",
        icon: Layers,
        availability: "live",
      },
      {
        label: "Multilingual Voice",
        href: "/multilingual",
        icon: Languages,
        availability: "live",
      },
      {
        label: "Security & Kill Switch",
        href: "/admin/security",
        icon: ShieldCheck,
        availability: "live",
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        label: "AI Copilot",
        href: "/copilot",
        icon: Bot,
        availability: "live",
      },
      {
        label: "Investigation Insights",
        href: "/investigation",
        icon: Sparkles,
        availability: "preview",
        previewNote:
          "AI evidence analysis and reasoning are deferred to the next development phase.",
      },
      {
        label: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        availability: "preview",
        previewNote:
          "Analytics will be computed from persisted case data once the backend phase lands.",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Organizations",
        href: "/organizations",
        icon: Building2,
        availability: "live",
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        availability: "live",
      },
      {
        label: "Help & Support",
        href: "/help",
        icon: HelpCircle,
        availability: "live",
      },
    ],
  },
];

/** Flattened list — used by breadcrumb generation and mobile navigation. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export function findNavItem(href: string): NavItem | undefined {
  return NAV_ITEMS.find(
    (item) => item.href === href || href.startsWith(`${item.href}/`),
  );
}

export interface Breadcrumb {
  label: string;
  href?: string;
}

/**
 * Derives a breadcrumb trail from the pathname.
 * `/cases/RG-1001` → Cases › RG-1001
 */
export function breadcrumbsFor(pathname: string): Breadcrumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Dashboard" }];

  const crumbs: Breadcrumb[] = [];
  const root = segments[0];
  const rootItem = NAV_ITEMS.find(
    (item) => item.href === `/${root}` || item.href.startsWith(`/${root}/`),
  );

  crumbs.push({
    label: rootItem?.label ?? capitalize(root),
    href: segments.length > 1 ? `/${root}` : undefined,
  });

  for (const segment of segments.slice(1)) {
    crumbs.push({ label: decodeURIComponent(segment) });
  }

  return crumbs;
}

/** Route title used in the top bar and document metadata. */
export function titleFor(pathname: string): string {
  const item = findNavItem(pathname);
  if (item) return item.label;
  if (pathname.startsWith("/cases/")) return "Case Details";
  return "RESOLVEGRAPH";
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const PAGE_META: Record<string, { title: string; description: string }> = {
  "/dashboard": {
    title: "Dashboard",
    description: "Commerce resolution workspace overview.",
  },
  "/cases": {
    title: "Case Management",
    description: "Track, review and manage commerce resolution cases.",
  },
  "/incidents": {
    title: "Payment Incidents",
    description: "Cross-provider payment failure and dispute investigation pipeline.",
  },
  "/intake": {
    title: "Universal Payment Intake",
    description: "Extract, validate, and verify multi-source payment evidence.",
  },
  "/reconciliation": {
    title: "Cross-Platform Reconciliation",
    description: "10-tier deterministic transaction matching and discrepancy analysis.",
  },
  "/multilingual": {
    title: "Multilingual Voice Intake",
    description: "Assisted voice and conversational complaint creation in English, Kannada, and Hindi.",
  },
  "/admin/security": {
    title: "Security & Kill Switch",
    description: "Administrative emergency controls, prompt injection defense, and hash-chained audit ledger.",
  },
  "/evidence": {
    title: "Evidence Library",
    description: "Buyer and seller evidence attached to resolution cases.",
  },
  "/resolution": {
    title: "Resolution Center",
    description: "Pending remedies, refund and replacement requests.",
  },
  "/investigation": {
    title: "Investigation Insights",
    description: "AI-assisted investigation support (coming in a later phase).",
  },
  "/analytics": {
    title: "Analytics",
    description: "Workspace resolution analytics (coming in a later phase).",
  },
  "/organizations": {
    title: "Organizations",
    description: "Manage multi-tenant workspaces, merchant memberships and team roles.",
  },
  "/settings": {
    title: "Settings",
    description: "Workspace, profile and preference settings.",
  },
  "/help": {
    title: "Help & Support",
    description: "Guides and support resources for RESOLVEGRAPH.",
  },
};
