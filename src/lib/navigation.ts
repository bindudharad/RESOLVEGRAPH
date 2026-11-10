import {
  Home,
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
  BookOpen,
  GraduationCap,
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
        label: "Home",
        href: "/dashboard",
        icon: Home,
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
        availability: "live",
      },
      {
        label: "Resolution Center",
        href: "/resolution",
        icon: Inbox,
        availability: "live",
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
        availability: "live",
      },
      {
        label: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        availability: "live",
      },
    ],
  },
  {
    label: "Reference",
    items: [
      {
        label: "Documentation & APIs",
        href: "/docs",
        icon: BookOpen,
        availability: "live",
      },
      {
        label: "BERR Methodology",
        href: "/methodology",
        icon: GraduationCap,
        availability: "live",
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
 * Derives a consistent, hierarchical breadcrumb trail from the pathname.
 * - /dashboard -> Home
 * - /cases -> Home / Cases
 * - /cases/RG-2026-0412 -> Home / Cases / RG-2026-0412
 * - /reconciliation -> Home / Cross-Reconciliation
 * Home is always a clickable link back to /dashboard on any subpage.
 */
export function breadcrumbsFor(pathname: string): Breadcrumb[] {
  // Canonical Home route
  if (pathname === "/dashboard" || pathname === "/") {
    return [{ label: "Home" }];
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Home" }];

  // Every subpage breadcrumb trail begins with Home linking to /dashboard
  const crumbs: Breadcrumb[] = [{ label: "Home", href: "/dashboard" }];
  const root = segments[0];
  const rootPath = `/${root}`;

  const rootItem = NAV_ITEMS.find(
    (item) => item.href === rootPath || item.href.startsWith(`${rootPath}/`),
  );

  let rootLabel: string;
  if (rootItem) {
    rootLabel = rootItem.label === "All Cases" ? "Cases" : rootItem.label;
  } else if (root === "incidents") {
    rootLabel = "Payment Incidents";
  } else if (root === "resolution-room") {
    rootLabel = "Shared Resolution Room";
  } else {
    rootLabel = capitalize(root);
  }

  // If on the root page itself (e.g. /cases, /evidence, /reconciliation)
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
  if (pathname === "/dashboard" || pathname === "/") return "Home";
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
