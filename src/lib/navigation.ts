import {
  Bot,
  CreditCard,
  FolderOpen,
  LayoutDashboard,
  Library,
  Package,
  Scale,
  Settings,
  ShieldCheck,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

/**
 * Navigation availability.
 *
 * `live`    — fully designed and interactive.
 * `preview` — routed with informational context.
 */
export type NavAvailability = "live" | "preview";

export interface NavSubItem {
  label: string;
  href: string;
  adminOnly?: boolean;
}

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  availability: NavAvailability;
  adminOnly?: boolean;
  merchantOnly?: boolean;
  hideForPlatformAdmin?: boolean;
  /** Short explanation shown on preview routes. */
  previewNote?: string;
  subItems?: NavSubItem[];
}

export interface NavGroup {
  label: string;
  adminOnly?: boolean;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Platform",
    items: [
      {
        label: "Overview",
        href: "/overview",
        icon: LayoutDashboard,
        availability: "live",
      },
      {
        label: "Payments",
        href: "/payments",
        icon: CreditCard,
        availability: "live",
      },
      {
        label: "Investigations",
        href: "/cases",
        icon: FolderOpen,
        availability: "live",
        subItems: [
          { label: "Cases Roster", href: "/cases" },
          { label: "Investigation Engine", href: "/investigation" },
        ],
      },
      {
        label: "Evidence",
        href: "/evidence",
        icon: Library,
        availability: "live",
      },
      {
        label: "Resolution",
        href: "/resolution",
        icon: Scale,
        availability: "live",
        subItems: [
          { label: "Dual-Key Proposals", href: "/resolution" },
          { label: "Bilateral Room", href: "/resolution-room" },
        ],
      },
      {
        label: "AI Copilot",
        href: "/copilot",
        icon: Bot,
        availability: "live",
      },
      {
        label: "Administration",
        href: "/organizations",
        icon: ShieldCheck,
        availability: "live",
        adminOnly: true,
        subItems: [
          { label: "Organizations & Roles", href: "/organizations", adminOnly: true },
          { label: "Security & Audit", href: "/admin/security", adminOnly: true },
          { label: "Settings", href: "/settings" },
        ],
      },
    ],
  },
  {
    label: "Commerce",
    items: [
      {
        label: "Purchase Memory",
        href: "/purchases",
        icon: ShoppingCart,
        availability: "live",
        hideForPlatformAdmin: true,
      },
      {
        label: "Package & Delivery",
        href: "/packages",
        icon: Package,
        availability: "live",
        hideForPlatformAdmin: true,
      },
    ],
  },
];

/** Flattened list — used by breadcrumb generation and mobile navigation. */
export const NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((group) => group.items),
  { label: "Investigation Engine", href: "/investigation", icon: FolderOpen, availability: "live" },
  { label: "Shared Resolution Room", href: "/resolution-room", icon: Scale, availability: "live" },
  { label: "Organizations & Roles", href: "/organizations", icon: ShieldCheck, availability: "live", adminOnly: true },
  { label: "Security & Audit", href: "/admin/security", icon: ShieldCheck, availability: "live", adminOnly: true },
  { label: "Settings", href: "/settings", icon: Settings, availability: "live" },
];

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
 * Derives a consistent, hierarchical breadcrumb trail from the pathname.
 * - /dashboard -> Home
 * - /cases -> Home / Cases
 * - /cases/RG-2026-0412 -> Home / Cases / RG-2026-0412
 * - /reconciliation -> Home / Cross-Reconciliation
 * Home is always a clickable link back to /dashboard on any subpage.
 */
export function breadcrumbsFor(pathname: string): Breadcrumb[] {
  if (pathname === "/overview") {
    return [{ label: "Overview" }];
  }
  if (pathname === "/dashboard" || pathname === "/") {
    return [{ label: "Overview", href: "/overview" }, { label: "Command Center" }];
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Overview" }];

  // Every subpage breadcrumb trail begins with Overview linking to /overview
  const crumbs: Breadcrumb[] = [{ label: "Overview", href: "/overview" }];
  const root = segments[0];
  const rootPath = `/${root}`;

  const rootItem = NAV_ITEMS.find(
    (item) => item.href === rootPath || item.href.startsWith(`${rootPath}/`),
  );

  let rootLabel: string;
  if (rootItem) {
    rootLabel = rootItem.label;
  } else if (root === "incidents") {
    rootLabel = "Payment Incidents";
  } else if (root === "resolution-room") {
    rootLabel = "Shared Resolution Room";
  } else {
    rootLabel = capitalize(root);
  }

  // If on the root page itself (e.g. /cases, /evidence, /payments)
  if (segments.length === 1) {
    crumbs.push({ label: rootLabel });
    return crumbs;
  }

  // If on a sub-resource (e.g. /cases/RG-1001), root is a clickable parent
  crumbs.push({
    label: rootLabel,
    href: rootPath,
  });

  for (const segment of segments.slice(1)) {
    const decoded = decodeURIComponent(segment);
    const isCuid = /^[a-z0-9]{20,36}$/i.test(decoded);
    const label = isCuid ? `Dossier (${decoded.slice(0, 8)}…)` : decoded;
    crumbs.push({ label });
  }

  return crumbs;
}

/** Route title used in the top bar and document metadata. */
export function titleFor(pathname: string): string {
  if (pathname === "/overview") return "Overview";
  if (pathname === "/dashboard" || pathname === "/") return "Command Center";
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
    title: "Home",
    description: "Financial Investigation Command Center.",
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
    description: "Bilateral evidence-to-remedy reasoning (BERR) engine, contradiction analysis, and knowledge graph intelligence.",
  },
  "/analytics": {
    title: "Analytics",
    description: "Workspace resolution performance, statutory SLA turnaround, and AI accuracy metrics.",
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
  "/docs": {
    title: "Documentation & API Reference",
    description: "System architecture, 10-tier matching hierarchy, statutory TAT rules, and complete REST APIs.",
  },
  "/methodology": {
    title: "BERR v2 Methodology",
    description: "Formal mathematical formulations, 4-quadrant fact classification, and RECOURSE-BENCH results.",
  },
};
