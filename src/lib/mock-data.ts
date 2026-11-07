/**
 * RESOLVEGRAPH — demonstration data.
 *
 * Every record below is fictional. Nothing here is loaded from a backend, and
 * no figure represents a real business statistic. The workspace is explicitly
 * badged "DEMO DATA" throughout the product so these numbers can never be
 * mistaken for live metrics.
 *
 * Dates are anchored to the current calendar day (see lib/utils) so the
 * content always reads as recent while remaining hydration-safe.
 */

import { dayAnchor, atTime, shareOf } from "@/lib/utils";
import type {
  ActivityEvent,
  CaseStatus,
  DistributionSlice,
  EvidenceItem,
  NotificationItem,
  RemedyItem,
  ResolutionCase,
  ResolutionPoint,
  ResolutionRange,
} from "@/lib/types";

export const WORKSPACE = {
  name: "Demo Commerce Workspace",
  descriptor: "Commerce Intelligence",
  isDemo: true,
  planLabel: "Evaluation",
  seats: 8,
} as const;

export const CURRENT_USER = {
  name: "Admin",
  fullName: "Priya Raghavan",
  role: "Workspace Administrator",
  email: "admin@resolvegraph.demo",
  initials: "PR",
} as const;

/* ---------------------------------------------------------------------------
   KPI summary — demonstration values only
   --------------------------------------------------------------------------- */

export interface MetricCardData {
  key: string;
  label: string;
  value: number;
  trend: number;
  hint: string;
  tone: "neutral" | "info" | "warning" | "success";
}

export const KPI_METRICS: MetricCardData[] = [
  {
    key: "total-cases",
    label: "Total Cases",
    value: 1284,
    trend: 12.8,
    hint: "All cases recorded in this demo workspace",
    tone: "neutral",
  },
  {
    key: "open-cases",
    label: "Open Cases",
    value: 186,
    trend: 8.2,
    hint: "Currently active and not yet resolved",
    tone: "info",
  },
  {
    key: "awaiting-response",
    label: "Awaiting Response",
    value: 42,
    trend: -5.4,
    hint: "Waiting on a buyer or merchant reply",
    tone: "warning",
  },
  {
    key: "resolved-cases",
    label: "Resolved Cases",
    value: 1056,
    trend: 18.6,
    hint: "Closed with an agreed outcome",
    tone: "success",
  },
];

/* ---------------------------------------------------------------------------
   Case roster
   --------------------------------------------------------------------------- */

const y = (n: number) => dayAnchor(-n);

export const DEMO_CASES: ResolutionCase[] = [
  {
    id: "RG-1001",
    title: "Wrong Product Received",
    customer: "Alex Morgan",
    merchant: "TechStore",
    category: "Product Not as Described",
    amount: 6499,
    currency: "INR",
    priority: "High",
    status: "Under Investigation",
    createdAt: atTime(y(6), 9, 14).toISOString(),
    updatedAt: atTime(y(0), 8, 42).toISOString(),
    description:
      "Customer ordered a Portable SSD 1 TB but received a Portable SSD 512 GB. The packaging label and invoice both list the 1 TB model, while the device reports 512 GB of usable capacity.",
    expectedProduct: "Portable SSD 1 TB",
    reportedProduct: "Portable SSD 512 GB",
  },
  {
    id: "RG-1002",
    title: "Refund Awaiting Approval",
    customer: "Sarah Johnson",
    merchant: "DigitalMart",
    category: "Refund Pending",
    amount: 2199,
    currency: "INR",
    priority: "Medium",
    status: "Awaiting Merchant",
    createdAt: atTime(y(5), 11, 5).toISOString(),
    updatedAt: atTime(y(1), 16, 20).toISOString(),
    description:
      "Buyer returned an unopened item eight days ago. The merchant acknowledged receipt of the return but has not yet approved the refund transaction.",
  },
  {
    id: "RG-1003",
    title: "Seller Response Overdue",
    customer: "Daniel Carter",
    merchant: "Nova Electronics",
    category: "Item Not Received",
    amount: 149,
    currency: "USD",
    priority: "High",
    status: "Escalated",
    createdAt: atTime(y(9), 14, 32).toISOString(),
    updatedAt: atTime(y(2), 10, 8).toISOString(),
    description:
      "Order shows a delivered status but the buyer has no parcel. The merchant has not responded to two evidence requests within the response window.",
  },
  {
    id: "RG-1004",
    title: "Evidence Incomplete",
    customer: "Alex Morgan",
    merchant: "DigitalMart",
    category: "Damaged Product",
    amount: 4850,
    currency: "INR",
    priority: "Medium",
    status: "Awaiting Buyer",
    createdAt: atTime(y(4), 15, 47).toISOString(),
    updatedAt: atTime(y(1), 9, 55).toISOString(),
    description:
      "Buyer reports a cracked display on arrival. A product photograph was submitted, but packaging and dispatch records are still outstanding.",
  },
  {
    id: "RG-1005",
    title: "Package Never Arrived",
    customer: "Sarah Johnson",
    merchant: "TechStore",
    category: "Item Not Received",
    amount: 89.99,
    currency: "USD",
    priority: "Medium",
    status: "Open",
    createdAt: atTime(y(2), 8, 12).toISOString(),
    updatedAt: atTime(y(1), 13, 30).toISOString(),
    description:
      "Tracking has not updated in six days and the estimated delivery window has passed without a delivery attempt.",
  },
  {
    id: "RG-1006",
    title: "Cracked Screen on Delivery",
    customer: "Daniel Carter",
    merchant: "Nova Electronics",
    category: "Damaged Product",
    amount: 18999,
    currency: "INR",
    priority: "High",
    status: "Under Investigation",
    createdAt: atTime(y(3), 10, 25).toISOString(),
    updatedAt: atTime(y(0), 11, 10).toISOString(),
    description:
      "Smartphone arrived with a fractured front panel. Outer carton shows impact damage on one corner; carrier inspection is pending.",
  },
  {
    id: "RG-1007",
    title: "Duplicate Charge on Card",
    customer: "Alex Morgan",
    merchant: "DigitalMart",
    category: "Payment Issue",
    amount: 210,
    currency: "USD",
    priority: "High",
    status: "Escalated",
    createdAt: atTime(y(7), 17, 3).toISOString(),
    updatedAt: atTime(y(1), 15, 44).toISOString(),
    description:
      "Buyer reports two identical authorisations for a single order placed three minutes apart. One capture is disputed.",
  },
  {
    id: "RG-1008",
    title: "Return Request Denied",
    customer: "Sarah Johnson",
    merchant: "TechStore",
    category: "Return Denied",
    amount: 3299,
    currency: "INR",
    priority: "Low",
    status: "Awaiting Merchant",
    createdAt: atTime(y(8), 12, 19).toISOString(),
    updatedAt: atTime(y(3), 14, 2).toISOString(),
    description:
      "Merchant declined the return citing the hygiene-seal policy. Buyer contests that the seal was already broken on arrival.",
  },
  {
    id: "RG-1009",
    title: "Wrong Size Shipped",
    customer: "Daniel Carter",
    merchant: "Nova Electronics",
    category: "Product Not as Described",
    amount: 1749,
    currency: "INR",
    priority: "Low",
    status: "Open",
    createdAt: atTime(y(1), 16, 41).toISOString(),
    updatedAt: atTime(y(0), 9, 5).toISOString(),
    description:
      "Ordered size M, received size XL. Tags and packing slip both read XL.",
  },
  {
    id: "RG-1010",
    title: "Refund Not Received",
    customer: "Sarah Johnson",
    merchant: "DigitalMart",
    category: "Refund Pending",
    amount: 64.5,
    currency: "USD",
    priority: "Medium",
    status: "Awaiting Merchant",
    createdAt: atTime(y(10), 9, 58).toISOString(),
    updatedAt: atTime(y(4), 11, 26).toISOString(),
    description:
      "Merchant confirmed a refund twelve days ago. Buyer's statement shows no credit after the stated five to seven working days.",
  },
  {
    id: "RG-1011",
    title: "Missing Accessories",
    customer: "Alex Morgan",
    merchant: "TechStore",
    category: "Other",
    amount: 2499,
    currency: "INR",
    priority: "Low",
    status: "Resolved",
    createdAt: atTime(y(14), 13, 11).toISOString(),
    updatedAt: atTime(y(1), 15, 18).toISOString(),
    description:
      "Replacement accessory bundle dispatched after the merchant confirmed a packing error.",
  },
  {
    id: "RG-1012",
    title: "Counterfeit Item Claim",
    customer: "Daniel Carter",
    merchant: "Nova Electronics",
    category: "Product Not as Described",
    amount: 325,
    currency: "USD",
    priority: "High",
    status: "Under Investigation",
    createdAt: atTime(y(11), 10, 47).toISOString(),
    updatedAt: atTime(y(2), 17, 15).toISOString(),
    description:
      "Buyer alleges the serial number does not appear in the manufacturer's warranty registry. Serial photographs and an invoice were submitted.",
  },
  {
    id: "RG-1013",
    title: "Partial Shipment Missing",
    customer: "Sarah Johnson",
    merchant: "DigitalMart",
    category: "Item Not Received",
    amount: 5199,
    currency: "INR",
    priority: "Medium",
    status: "Open",
    createdAt: atTime(y(3), 11, 30).toISOString(),
    updatedAt: atTime(y(1), 12, 12).toISOString(),
    description:
      "Two of five line items arrived. The remaining three are marked fulfilled in the merchant's system.",
  },
  {
    id: "RG-1014",
    title: "Warranty Refund Denied",
    customer: "Alex Morgan",
    merchant: "TechStore",
    category: "Refund Pending",
    amount: 7999,
    currency: "INR",
    priority: "Medium",
    status: "Resolved",
    createdAt: atTime(y(18), 15, 22).toISOString(),
    updatedAt: atTime(y(1), 16, 48).toISOString(),
    description:
      "Goodwill partial settlement agreed after the warranty eligibility review concluded in the buyer's favour.",
  },
];

export const FEATURED_CASE_ID = "RG-1001";

/* ---------------------------------------------------------------------------
   Resolution performance series
   --------------------------------------------------------------------------- */

/** Deterministic pseudo-random generator so demo charts never flicker. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function buildSeries(range: ResolutionRange): ResolutionPoint[] {
  const config = {
    "7D": { points: 7, step: 1, base: 44, seed: 7 },
    "30D": { points: 30, step: 1, base: 46, seed: 30 },
    "90D": { points: 13, step: 7, base: 46, seed: 90 },
  }[range];

  const rand = seeded(config.seed);
  const today = dayAnchor(0);
  const points: ResolutionPoint[] = [];
  let open = 168;

  for (let i = config.points - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i * config.step);

    const wave = Math.sin((config.points - i) / 2.4) * 6;
    const total = Math.round(config.base + wave + rand() * 12);
    const resolved = Math.round(total * (0.62 + rand() * 0.2));
    open = Math.max(96, open + Math.round(rand() * 14 - 7));

    points.push({
      label:
        range === "90D"
          ? new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
            }).format(day)
          : new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day) +
            (range === "30D"
              ? ` ${new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(day)}`
              : ""),
      total,
      resolved,
      open,
    });
  }

  return points;
}

export const RESOLUTION_SERIES: Record<ResolutionRange, ResolutionPoint[]> = {
  "7D": buildSeries("7D"),
  "30D": buildSeries("30D"),
  "90D": buildSeries("90D"),
};

/* ---------------------------------------------------------------------------
   Case distribution by category
   --------------------------------------------------------------------------- */

const DISTRIBUTION_COUNTS: Record<string, number> = {
  "Product Not as Described": 342,
  "Item Not Received": 268,
  "Damaged Product": 197,
  "Refund Pending": 164,
  "Return Denied": 121,
  "Payment Issue": 113,
  Other: 79,
};

export const DISTRIBUTION_TOTAL = Object.values(DISTRIBUTION_COUNTS).reduce(
  (sum, n) => sum + n,
  0,
);

export const CASE_DISTRIBUTION: DistributionSlice[] = Object.entries(
  DISTRIBUTION_COUNTS,
).map(([category, count]) => ({
  category: category as DistributionSlice["category"],
  count,
  share: shareOf(count, DISTRIBUTION_TOTAL),
}));

/* ---------------------------------------------------------------------------
   Needs attention queue
   --------------------------------------------------------------------------- */

export interface AttentionItem {
  caseId: string;
  issue: string;
  priority: "High" | "Medium";
  status: CaseStatus;
  updatedAt: string;
  reason: string;
}

export const ATTENTION_ITEMS: AttentionItem[] = [
  {
    caseId: "RG-1001",
    issue: "Wrong product received",
    priority: "High",
    status: "Under Investigation",
    updatedAt: atTime(y(0), 8, 42).toISOString(),
    reason: "Buyer evidence complete, merchant reply outstanding",
  },
  {
    caseId: "RG-1003",
    issue: "Seller response overdue",
    priority: "High",
    status: "Escalated",
    updatedAt: atTime(y(2), 10, 8).toISOString(),
    reason: "No merchant reply within the response window",
  },
  {
    caseId: "RG-1002",
    issue: "Refund awaiting approval",
    priority: "Medium",
    status: "Awaiting Merchant",
    updatedAt: atTime(y(1), 16, 20).toISOString(),
    reason: "Return received, remedy decision not yet recorded",
  },
  {
    caseId: "RG-1004",
    issue: "Evidence incomplete",
    priority: "Medium",
    status: "Awaiting Buyer",
    updatedAt: atTime(y(1), 9, 55).toISOString(),
    reason: "Packaging and dispatch records still needed",
  },
];

/* ---------------------------------------------------------------------------
   Recent activity feed
   --------------------------------------------------------------------------- */

export const RECENT_ACTIVITY: ActivityEvent[] = [
  {
    id: "act-1",
    kind: "status",
    description: "Status moved to Under Investigation — carrier inspection opened",
    actor: "Priya Raghavan",
    timestamp: atTime(y(0), 11, 10).toISOString(),
    caseId: "RG-1006",
  },
  {
    id: "act-2",
    kind: "status",
    description: "Dispatch record requested from the merchant",
    actor: "Priya Raghavan",
    timestamp: atTime(y(0), 8, 42).toISOString(),
    caseId: "RG-1001",
  },
  {
    id: "act-3",
    kind: "resolved",
    description: "Case marked resolved — goodwill partial settlement",
    actor: "Priya Raghavan",
    timestamp: atTime(y(1), 16, 48).toISOString(),
    caseId: "RG-1014",
  },
  {
    id: "act-4",
    kind: "created",
    description: "New complaint submitted — Wrong Size Shipped",
    actor: "Daniel Carter",
    timestamp: atTime(y(1), 16, 41).toISOString(),
    caseId: "RG-1009",
  },
  {
    id: "act-5",
    kind: "refund",
    description: "Refund request raised — ₹2,199 (demo event)",
    actor: "Sarah Johnson",
    timestamp: atTime(y(1), 16, 22).toISOString(),
    caseId: "RG-1002",
  },
  {
    id: "act-6",
    kind: "refund",
    description: "Refund approved (demo event) — ₹2,499",
    actor: "Priya Raghavan",
    timestamp: atTime(y(1), 15, 18).toISOString(),
    caseId: "RG-1011",
  },
  {
    id: "act-7",
    kind: "ai-analysis",
    description: "Evidence indexing completed (demo event)",
    actor: "System",
    timestamp: atTime(y(1), 10, 4).toISOString(),
    caseId: "RG-1006",
  },
  {
    id: "act-8",
    kind: "escalated",
    description: "Case escalated after serial verification stalled",
    actor: "System",
    timestamp: atTime(y(2), 17, 15).toISOString(),
    caseId: "RG-1012",
  },
  {
    id: "act-9",
    kind: "merchant-response",
    description: "Merchant response received — return eligibility disputed",
    actor: "DigitalMart",
    timestamp: atTime(y(2), 11, 26).toISOString(),
    caseId: "RG-1002",
  },
];

/* ---------------------------------------------------------------------------
   Evidence library (sample records — nothing is actually stored)
   --------------------------------------------------------------------------- */

export const DEMO_EVIDENCE: EvidenceItem[] = [
  {
    id: "ev-01",
    name: "invoice-RG-1001.pdf",
    caseId: "RG-1001",
    type: "Invoice",
    uploadedBy: "Alex Morgan",
    uploadedAt: atTime(y(6), 9, 22).toISOString(),
    verification: "Verified",
    sizeKb: 184,
    extension: "pdf",
  },
  {
    id: "ev-02",
    name: "ssd-label-closeup.jpg",
    caseId: "RG-1001",
    type: "Product Photo",
    uploadedBy: "Alex Morgan",
    uploadedAt: atTime(y(6), 9, 26).toISOString(),
    verification: "Pending",
    sizeKb: 2140,
    extension: "jpg",
  },
  {
    id: "ev-03",
    name: "outer-packaging.jpg",
    caseId: "RG-1001",
    type: "Packaging Photo",
    uploadedBy: "Alex Morgan",
    uploadedAt: atTime(y(5), 18, 3).toISOString(),
    verification: "Pending",
    sizeKb: 1876,
    extension: "jpg",
  },
  {
    id: "ev-04",
    name: "dispatch-record-RG-1001.pdf",
    caseId: "RG-1001",
    type: "Dispatch Record",
    uploadedBy: "TechStore",
    uploadedAt: atTime(y(5), 11, 40).toISOString(),
    verification: "Verified",
    sizeKb: 96,
    extension: "pdf",
  },
  {
    id: "ev-05",
    name: "carrier-tracking-export.csv",
    caseId: "RG-1003",
    type: "Dispatch Record",
    uploadedBy: "Nova Electronics",
    uploadedAt: atTime(y(8), 15, 12).toISOString(),
    verification: "Verified",
    sizeKb: 42,
    extension: "csv",
  },
  {
    id: "ev-06",
    name: "buyer-chat-transcript.txt",
    caseId: "RG-1003",
    type: "Chat Transcript",
    uploadedBy: "Daniel Carter",
    uploadedAt: atTime(y(7), 10, 55).toISOString(),
    verification: "Unverified",
    sizeKb: 31,
    extension: "txt",
  },
  {
    id: "ev-07",
    name: "payment-receipt-RG-1007.pdf",
    caseId: "RG-1007",
    type: "Payment Receipt",
    uploadedBy: "Alex Morgan",
    uploadedAt: atTime(y(7), 17, 9).toISOString(),
    verification: "Verified",
    sizeKb: 121,
    extension: "pdf",
  },
  {
    id: "ev-08",
    name: "cracked-panel.png",
    caseId: "RG-1006",
    type: "Product Photo",
    uploadedBy: "Daniel Carter",
    uploadedAt: atTime(y(3), 10, 31).toISOString(),
    verification: "Pending",
    sizeKb: 3021,
    extension: "png",
  },
  {
    id: "ev-09",
    name: "serial-number-registry.png",
    caseId: "RG-1012",
    type: "Product Photo",
    uploadedBy: "Daniel Carter",
    uploadedAt: atTime(y(11), 11, 4).toISOString(),
    verification: "Unverified",
    sizeKb: 764,
    extension: "png",
  },
  {
    id: "ev-10",
    name: "return-label-RG-1002.pdf",
    caseId: "RG-1002",
    type: "Dispatch Record",
    uploadedBy: "Sarah Johnson",
    uploadedAt: atTime(y(5), 13, 47).toISOString(),
    verification: "Verified",
    sizeKb: 58,
    extension: "pdf",
  },
  {
    id: "ev-11",
    name: "line-item-manifest.csv",
    caseId: "RG-1013",
    type: "Invoice",
    uploadedBy: "DigitalMart",
    uploadedAt: atTime(y(3), 12, 2).toISOString(),
    verification: "Pending",
    sizeKb: 27,
    extension: "csv",
  },
  {
    id: "ev-12",
    name: "unboxing-video-still.jpg",
    caseId: "RG-1004",
    type: "Product Photo",
    uploadedBy: "Alex Morgan",
    uploadedAt: atTime(y(4), 16, 15).toISOString(),
    verification: "Pending",
    sizeKb: 1544,
    extension: "jpg",
  },
];

/* ---------------------------------------------------------------------------
   Resolution center queues
   --------------------------------------------------------------------------- */

export const DEMO_REMEDIES: RemedyItem[] = [
  {
    id: "rm-01",
    caseId: "RG-1001",
    title: "Replacement — Portable SSD 1 TB",
    kind: "Replacement",
    state: "Pending",
    requestType: "Replacement",
    amount: 6499,
    currency: "INR",
    raisedAt: atTime(y(1), 14, 5).toISOString(),
  },
  {
    id: "rm-02",
    caseId: "RG-1002",
    title: "Full refund of returned item",
    kind: "Full Refund",
    state: "Pending",
    requestType: "Refund",
    amount: 2199,
    currency: "INR",
    raisedAt: atTime(y(1), 16, 22).toISOString(),
  },
  {
    id: "rm-03",
    caseId: "RG-1007",
    title: "Reverse duplicate authorisation",
    kind: "Full Refund",
    state: "Requested",
    requestType: "Refund",
    amount: 210,
    currency: "USD",
    raisedAt: atTime(y(2), 9, 40).toISOString(),
  },
  {
    id: "rm-04",
    caseId: "RG-1011",
    title: "Accessory bundle replacement dispatched",
    kind: "Replacement",
    state: "Approved",
    requestType: "Replacement",
    amount: 2499,
    currency: "INR",
    raisedAt: atTime(y(6), 10, 12).toISOString(),
  },
  {
    id: "rm-05",
    caseId: "RG-1014",
    title: "Goodwill partial settlement",
    kind: "Partial Settlement",
    state: "Approved",
    requestType: "Refund",
    amount: 3999,
    currency: "INR",
    raisedAt: atTime(y(7), 15, 30).toISOString(),
  },
  {
    id: "rm-06",
    caseId: "RG-1012",
    title: "Serial authenticity review",
    kind: "Human Review",
    state: "Pending",
    requestType: "Human Review",
    amount: 325,
    currency: "USD",
    raisedAt: atTime(y(2), 17, 20).toISOString(),
  },
  {
    id: "rm-07",
    caseId: "RG-1003",
    title: "Non-delivery reimbursement review",
    kind: "Human Review",
    state: "Requested",
    requestType: "Human Review",
    amount: 149,
    currency: "USD",
    raisedAt: atTime(y(3), 10, 8).toISOString(),
  },
];

/* ---------------------------------------------------------------------------
   Demo notifications
   --------------------------------------------------------------------------- */

export const DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "nt-1",
    kind: "warning",
    title: "Merchant response overdue",
    body: "RG-1003 has passed its response window and was escalated automatically.",
    timestamp: atTime(y(2), 10, 8).toISOString(),
    read: false,
    href: "/cases/RG-1003",
  },
  {
    id: "nt-2",
    kind: "info",
    title: "New complaint submitted",
    body: "Alex Morgan reported a wrong product received on RG-1001.",
    timestamp: atTime(y(6), 9, 14).toISOString(),
    read: false,
    href: "/cases/RG-1001",
  },
  {
    id: "nt-3",
    kind: "success",
    title: "Refund approved (demo event)",
    body: "A ₹2,499 goodwill settlement was recorded on RG-1011.",
    timestamp: atTime(y(1), 15, 18).toISOString(),
    read: true,
    href: "/cases/RG-1011",
  },
  {
    id: "nt-4",
    kind: "ai",
    title: "Evidence indexing completed",
    body: "Four documents on RG-1006 are indexed and ready for review.",
    timestamp: atTime(y(1), 10, 4).toISOString(),
    read: true,
    href: "/cases/RG-1006",
  },
  {
    id: "nt-5",
    kind: "info",
    title: "Buyer evidence requested",
    body: "Packaging photographs are still outstanding on RG-1004.",
    timestamp: atTime(y(1), 9, 55).toISOString(),
    read: true,
    href: "/cases/RG-1004",
  },
];

/* ---------------------------------------------------------------------------
   Featured case narrative — RG-1001
   --------------------------------------------------------------------------- */

export interface CaseClaim {
  party: "Buyer" | "Merchant";
  author: string;
  submittedAt: string;
  statement: string;
}

export const FEATURED_CLAIMS: Record<string, CaseClaim[]> = {
  "RG-1001": [
    {
      party: "Buyer",
      author: "Alex Morgan",
      submittedAt: atTime(y(6), 9, 14).toISOString(),
      statement:
        "I ordered the Portable SSD 1 TB listed on the product page and paid ₹6,499. The parcel arrived sealed, but the drive inside is the 512 GB variant — the system information screen shows 476 GB usable. The invoice and the box label both say 1 TB, so either the wrong unit was packed or the label is incorrect. I have photographed the label, the drive and the packaging.",
    },
    {
      party: "Merchant",
      author: "TechStore",
      submittedAt: atTime(y(5), 11, 40).toISOString(),
      statement:
        "Our dispatch record shows SKU SSD-1TB-BLK picked and scanned against this order. We are requesting the serial number photograph and the carrier handover record so we can reconcile this against our warehouse log. We do not dispute the buyer's account; we need the identifiers to locate where the substitution occurred.",
    },
  ],
};

export interface CaseEvidenceSlot {
  label: string;
  type: string;
  present: boolean;
  note: string;
}

/** Visual placeholders only — no files have been uploaded anywhere. */
export const FEATURED_EVIDENCE_SLOTS: CaseEvidenceSlot[] = [
  {
    label: "Invoice",
    type: "PDF document",
    present: true,
    note: "Submitted by buyer · listed as ₹6,499",
  },
  {
    label: "Product Photograph",
    type: "Image",
    present: true,
    note: "Drive label showing 512 GB capacity",
  },
  {
    label: "Packaging Photograph",
    type: "Image",
    present: true,
    note: "Outer carton and printed SKU label",
  },
  {
    label: "Dispatch Record",
    type: "PDF document",
    present: false,
    note: "Requested from merchant · not yet supplied",
  },
];

export interface CaseTimelineEntry {
  label: string;
  detail: string;
  actor: string;
  timestamp: string;
  state: "done" | "current" | "upcoming";
}

export const FEATURED_TIMELINE: CaseTimelineEntry[] = [
  {
    label: "Case created",
    detail: "Complaint submitted through the buyer portal",
    actor: "Alex Morgan",
    timestamp: atTime(y(6), 9, 14).toISOString(),
    state: "done",
  },
  {
    label: "Buyer evidence submitted",
    detail: "Invoice, product photograph and packaging photograph attached",
    actor: "Alex Morgan",
    timestamp: atTime(y(6), 9, 26).toISOString(),
    state: "done",
  },
  {
    label: "Merchant response received",
    detail: "Dispatch record requested; warehouse reconciliation opened",
    actor: "TechStore",
    timestamp: atTime(y(5), 11, 40).toISOString(),
    state: "current",
  },
  {
    label: "Dispatch record outstanding",
    detail: "Awaiting carrier handover evidence from the merchant",
    actor: "TechStore",
    timestamp: atTime(y(1), 8, 42).toISOString(),
    state: "upcoming",
  },
];

/* ---------------------------------------------------------------------------
   Workspace activity counters used by placeholder routes
   --------------------------------------------------------------------------- */

export const WORKSPACE_STATS = {
  casesTracked: KPI_METRICS[0].value,
  openCases: KPI_METRICS[1].value,
  resolvedCases: KPI_METRICS[3].value,
  evidenceRecords: DEMO_EVIDENCE.length,
  merchants: ["TechStore", "DigitalMart", "Nova Electronics"],
} as const;
