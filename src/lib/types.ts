/**
 * RESOLVEGRAPH — shared domain types.
 *
 * Step 1 is a frontend-only foundation: every type here describes the shape of
 * local demonstration data. They are intentionally aligned with the shapes the
 * later persistence / AI phases will need, so the migration is additive rather
 * than a rewrite.
 */

export const CASE_CATEGORIES = [
  "Product Not as Described",
  "Item Not Received",
  "Damaged Product",
  "Refund Pending",
  "Return Denied",
  "Payment Issue",
  "Other",
] as const;

export type CaseCategory = (typeof CASE_CATEGORIES)[number];

export const CASE_STATUSES = [
  "Open",
  "Under Investigation",
  "Awaiting Merchant",
  "Awaiting Buyer",
  "Resolved",
  "Escalated",
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_PRIORITIES = ["High", "Medium", "Low"] as const;

export type CasePriority = (typeof CASE_PRIORITIES)[number];

export type BerrState = "AGREED" | "CONTESTED" | "MISSING" | "VERIFIED";

export const CURRENCIES = ["INR", "USD"] as const;

export type Currency = (typeof CURRENCIES)[number];

export interface ResolutionCase {
  id: string;
  title: string;
  customer: string;
  merchant: string;
  category: CaseCategory;
  amount: number;
  currency: Currency;
  priority: CasePriority;
  status: CaseStatus;
  /** ISO timestamp */
  createdAt: string;
  /** ISO timestamp */
  updatedAt: string;
  description: string;
  expectedProduct?: string;
  reportedProduct?: string;
  /**
   * True for cases created through the Create Case dialog during this session.
   * They live in React state only and disappear on reload.
   */
  ephemeral?: boolean;
}

export type EvidenceType =
  | "Invoice"
  | "Product Photo"
  | "Packaging Photo"
  | "Dispatch Record"
  | "Chat Transcript"
  | "Payment Receipt";

export type VerificationStatus = "Verified" | "Pending" | "Unverified";

export interface EvidenceItem {
  id: string;
  name: string;
  caseId: string;
  type: EvidenceType;
  uploadedBy: string;
  uploadedAt: string;
  verification: VerificationStatus;
  sizeKb: number;
  extension: "pdf" | "png" | "jpg" | "csv" | "txt";
  sha256?: string;
}

export type ActivityKind =
  | "created"
  | "buyer-submission"
  | "merchant-response"
  | "evidence"
  | "ai-analysis"
  | "refund"
  | "resolved"
  | "escalated"
  | "status";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  description: string;
  actor: string;
  timestamp: string;
  caseId?: string;
}

export type NotificationKind = "info" | "warning" | "success" | "ai";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  href?: string;
}

export type RemedyKind =
  | "Replacement"
  | "Full Refund"
  | "Partial Settlement"
  | "Human Review";

export type RemedyState = "Pending" | "Approved" | "Requested";

export interface RemedyItem {
  id: string;
  caseId: string;
  title: string;
  kind: RemedyKind;
  state: RemedyState;
  requestType: "Refund" | "Replacement" | "Human Review";
  amount: number;
  currency: Currency;
  raisedAt: string;
}

export type ResolutionRange = "7D" | "30D" | "90D";

export interface ResolutionPoint {
  label: string;
  total: number;
  resolved: number;
  open: number;
}

export interface DistributionSlice {
  category: CaseCategory;
  count: number;
  share: number;
}
