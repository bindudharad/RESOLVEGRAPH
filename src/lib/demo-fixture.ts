/**
 * RESOLVEGRAPH — Canonical Demo Story Fixture Module
 *
 * Source: Demo fixture (All records explicitly flagged as fictional).
 * Central case: RG-2026-0412
 * Scenario: 1 TB SSD ordered, 512 GB received, ₹6,499 paid via PayPal.
 */

import { dayAnchor, atTime } from "@/lib/utils";
import type { ResolutionCase, BerrState } from "@/lib/types";

export interface BerrComparisonRow {
  id: string;
  attribute: string;
  buyerEvidence: string;
  merchantEvidence: string;
  state: BerrState;
  buyerSourceId?: string;
  merchantSourceId?: string;
  explanation: string;
  confidence: number;
}

export const CANONICAL_DEMO_CASE: ResolutionCase = {
  id: "RG-2026-0412",
  title: "Wrong Capacity Delivered — 1TB vs 512GB NVMe SSD",
  customer: "Alex Morgan",
  merchant: "Apex Tech Labs Ltd",
  category: "Product Not as Described",
  status: "Under Investigation",
  priority: "High",
  amount: 6499,
  currency: "INR",
  createdAt: atTime(dayAnchor(-2), 10, 15).toISOString(),
  updatedAt: atTime(dayAnchor(0), 9, 30).toISOString(),
  expectedProduct: "ApexPro 1TB NVMe Gen4 SSD",
  reportedProduct: "ApexPro 512GB NVMe SSD",
  description:
    "Buyer purchased 1TB NVMe Gen4 SSD for ₹6,499 via PayPal. Upon unboxing, package contained a 512GB SSD model with altered capacity labeling.",
};

export const CANONICAL_BERR_ROWS: BerrComparisonRow[] = [
  {
    id: "BERR-001",
    attribute: "Ordered product",
    buyerEvidence: "1 TB NVMe SSD (Order confirmation & tax invoice)",
    merchantEvidence: "1 TB NVMe SSD listing & warehouse pick record",
    state: "AGREED",
    buyerSourceId: "E-0101",
    merchantSourceId: "E-0201",
    explanation: "Both parties agree the commercial contract stipulated a 1 TB NVMe SSD.",
    confidence: 1.0,
  },
  {
    id: "BERR-002",
    attribute: "Purchase amount",
    buyerEvidence: "₹6,499 tax receipt (Razorpay/PayPal)",
    merchantEvidence: "₹6,499 PayPal capture record (TXN-8921-PP)",
    state: "AGREED",
    buyerSourceId: "E-0102",
    merchantSourceId: "E-0202",
    explanation: "Financial transaction ledger fully reconciles with no amount discrepancy.",
    confidence: 1.0,
  },
  {
    id: "BERR-003",
    attribute: "Delivered product",
    buyerEvidence: "Photograph showing 512 GB model on digital calipers & drive label",
    merchantEvidence: "No conclusive delivery evidence (serial scan omitted at dispatch)",
    state: "MISSING",
    buyerSourceId: "E-0103",
    explanation: "Merchant has not provided conclusive dispatch evidence verifying product variant.",
    confidence: 0.85,
  },
  {
    id: "BERR-004",
    attribute: "Packaging",
    buyerEvidence: "Damaged outer carton photograph with broken seal sticker",
    merchantEvidence: "Dispatch bay photograph showing intact manufacturer seal",
    state: "CONTESTED",
    buyerSourceId: "E-0104",
    merchantSourceId: "E-0204",
    explanation: "Conflicting evidence on whether seal integrity was broken prior to carrier handover.",
    confidence: 0.72,
  },
  {
    id: "BERR-005",
    attribute: "Serial number",
    buyerEvidence: "Visible SN: APX-98214-512GB in unboxing photo",
    merchantEvidence: "Not recorded at dispatch gate",
    state: "MISSING",
    buyerSourceId: "E-0105",
    explanation: "Merchant inventory logs do not record outbound serial mapping for this shipment.",
    confidence: 0.9,
  },
];

export interface TimelineStep {
  id: string;
  title: string;
  party: "BUYER" | "MERCHANT" | "PAYMENT" | "AI" | "RESOLVEGRAPH" | string;
  timestamp: string;
  completed: boolean;
  current?: boolean;
  description: string;
}

export const CANONICAL_TIMELINE_STEPS: TimelineStep[] = [
  {
    id: "STEP-1",
    title: "Order Placed",
    party: "BUYER",
    timestamp: "Nov 7, 2026 · 10:15",
    completed: true,
    description: "Buyer placed order for 1TB NVMe SSD for ₹6,499",
  },
  {
    id: "STEP-2",
    title: "PayPal Capture",
    party: "PAYMENT",
    timestamp: "Nov 7, 2026 · 10:16",
    completed: true,
    description: "PayPal captured ₹6,499 (TXN-8921-PP)",
  },
  {
    id: "STEP-3",
    title: "Merchant Dispatch",
    party: "MERCHANT",
    timestamp: "Nov 7, 2026 · 16:40",
    completed: true,
    description: "Carrier picked up package from Apex Tech Labs warehouse",
  },
  {
    id: "STEP-4",
    title: "Delivered & Inspected",
    party: "BUYER",
    timestamp: "Nov 8, 2026 · 14:20",
    completed: true,
    description: "Buyer received carton; reported 512GB model inside",
  },
  {
    id: "STEP-5",
    title: "Bilateral Evidence Graph",
    party: "AI",
    timestamp: "Nov 8, 2026 · 15:05",
    completed: true,
    current: true,
    description: "BEG cross-correlated buyer photos against dispatch manifest",
  },
  {
    id: "STEP-6",
    title: "Human Officer Decision",
    party: "RESOLVEGRAPH",
    timestamp: "Pending",
    completed: false,
    description: "Human officer reviewing recommended remedy: ₹1,800 Partial Refund",
  },
  {
    id: "STEP-7",
    title: "Bilateral Settlement",
    party: "PAYMENT",
    timestamp: "Not yet occurred",
    completed: false,
    description: "PayPal sandbox adjustment executed once authorized by human reviewer",
  },
];

export const DEMO_DATASET_SUMMARY = {
  isDemo: true,
  benchmarkCases: 300,
  accuracyRate: 89.3,
  averageRTO: "891ms",
  activeStages: 14,
  disputeCategories: ["NOT_AS_DESCRIBED", "NON_DELIVERY", "DAMAGED_TRANSIT", "UNAUTHORIZED"],
};
