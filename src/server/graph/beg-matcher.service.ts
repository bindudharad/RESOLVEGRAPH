/**
 * RESOLVEGRAPH — Deterministic BEG Evidence Matcher & Cross-Party Discrepancy Engine
 *
 * Implements Part 5 Step 5 (deterministic matching priority) and Part 8 (cross-party
 * contradiction & missing-information detection) without fabricating links or
 * promoting uncorroborated heuristics / AI inferences to VERIFIED.
 */

import type {
  BegVerificationState,
  DiscrepancyState,
  EvidenceSourceOrigin,
} from "./graph.types";

export interface MatchableRecord {
  nodeId: string;
  party: "BUYER" | "SELLER" | "MARKETPLACE" | "LOGISTICS" | "SYSTEM" | "NEUTRAL";
  sourceOrigin: EvidenceSourceOrigin;
  label: string;
  complaintId?: string | null;
  caseNumber?: string | null;
  orderId?: string | null;
  gstin?: string | null;
  marketplace?: string | null;
  marketplaceSellerId?: string | null;
  sellerName?: string | null;
  sku?: string | null;
  modelNumber?: string | null;
  invoiceNumber?: string | null;
  amountMinor?: number | null;
  currency?: string | null;
  timestampIso?: string | null;
  productTitle?: string | null;
}

export type DeterministicMatchMethod =
  | "EXACT_COMPLAINT_ID"
  | "EXACT_ORDER_ID"
  | "VERIFIED_GSTIN"
  | "MARKETPLACE_SELLER_ID"
  | "SKU_MODEL"
  | "INVOICE_NUMBER"
  | "AMOUNT_AND_CORROBORATED_ANCHOR"
  | "FUZZY_CANDIDATE"
  | "AMBIGUOUS_CANDIDATE";

export interface MatchCandidateResult {
  matched: boolean;
  sourceNodeId: string;
  targetNodeId: string;
  method: DeterministicMatchMethod | "AMOUNT_ONLY_REJECTED" | "NO_ANCHOR";
  verificationState: BegVerificationState;
  confidence: number;
  explanation: string;
  isAmbiguous: boolean;
}

export interface AttributeObservation {
  nodeId: string;
  party: "BUYER" | "SELLER" | "SHARED";
  role: "ORDER_SPEC" | "BUYER_CLAIM" | "BUYER_OBSERVATION" | "SELLER_DECLARATION" | "SELLER_EVIDENCE" | "PAYMENT";
  sourceOrigin: EvidenceSourceOrigin;
  verificationState: BegVerificationState;
  text: string;
  attributes: {
    capacityToken?: string | null;
    modelToken?: string | null;
    sku?: string | null;
    quantity?: number | null;
    amountMinor?: number | null;
    currency?: string | null;
    deliveryState?: string | null;
  };
}

export interface DetectedDiscrepancy {
  key: string;
  attribute: string;
  state: DiscrepancyState;
  verificationState: BegVerificationState;
  summary: string;
  orderValue?: string;
  buyerValue?: string;
  sellerValue?: string;
  orderNodeId?: string;
  buyerNodeId?: string;
  sellerNodeId?: string;
  involvedNodeIds: string[];
}

export interface MissingEvidenceGap {
  key: string;
  label: string;
  party: "BUYER" | "SELLER" | "SHARED";
  reason: string;
  relatedNodeId: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

function norm(value?: string | null): string {
  return (value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

function normText(value?: string | null): string {
  return (value || "").toLowerCase().trim();
}

const CORPORATE_LEGAL_STOP_WORDS = new Set([
  "private",
  "limited",
  "pvt",
  "ltd",
  "inc",
  "incorporated",
  "llc",
  "llp",
  "corp",
  "corporation",
  "company",
  "co",
]);

function extractMeaningfulWords(text?: string | null): Set<string> {
  const allWords = normText(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2);
  const filtered = allWords.filter((w) => !CORPORATE_LEGAL_STOP_WORDS.has(w) && w.length >= 3);
  return new Set(filtered.length > 0 ? filtered : allWords);
}

function tokenOverlapScore(a?: string | null, b?: string | null): number {
  const wordsA = extractMeaningfulWords(a);
  const wordsB = extractMeaningfulWords(b);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let shared = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) shared++;
  }
  return shared / Math.max(wordsA.size, wordsB.size);
}

/**
 * Deterministic matching between two evidence / entity records.
 * Strictly prioritizes hard identifiers and rejects amount-only linking.
 */
export function matchEvidenceRecords(
  left: MatchableRecord,
  right: MatchableRecord,
  options?: { isLeftVerifiedRegistry?: boolean; isRightVerifiedRegistry?: boolean }
): MatchCandidateResult {
  const baseFail = (
    method: "AMOUNT_ONLY_REJECTED" | "NO_ANCHOR",
    explanation: string
  ): MatchCandidateResult => ({
    matched: false,
    sourceNodeId: left.nodeId,
    targetNodeId: right.nodeId,
    method,
    verificationState: "UNVERIFIED",
    confidence: 0,
    explanation,
    isAmbiguous: false,
  });

  if (left.nodeId === right.nodeId) {
    return baseFail("NO_ANCHOR", "Same node cannot match itself.");
  }

  // 1. Exact Order ID (highest transactional precision)
  const ordL = norm(left.orderId);
  const ordR = norm(right.orderId);
  if (ordL && ordR && ordL === ordR) {
    const bothAuthoritative =
      (left.sourceOrigin === "INDEPENDENTLY_VERIFIED" || left.sourceOrigin === "SYSTEM_GENERATED") &&
      (right.sourceOrigin === "INDEPENDENTLY_VERIFIED" || right.sourceOrigin === "SYSTEM_GENERATED");
    return {
      matched: true,
      sourceNodeId: left.nodeId,
      targetNodeId: right.nodeId,
      method: "EXACT_ORDER_ID",
      verificationState: bothAuthoritative ? "VERIFIED" : "SOURCE_SUPPORTED",
      confidence: bothAuthoritative ? 0.97 : 0.88,
      explanation: `Deterministic exact Order ID match (${left.orderId}).`,
      isAmbiguous: false,
    };
  }

  // 2. Verified Seller GSTIN / Tax Identity
  const gstL = norm(left.gstin);
  const gstR = norm(right.gstin);
  if (gstL && gstR && gstL === gstR && gstL.length >= 10) {
    const isRegistryVerified = Boolean(options?.isLeftVerifiedRegistry || options?.isRightVerifiedRegistry);
    return {
      matched: true,
      sourceNodeId: left.nodeId,
      targetNodeId: right.nodeId,
      method: "VERIFIED_GSTIN",
      verificationState: isRegistryVerified ? "VERIFIED" : "SOURCE_SUPPORTED",
      confidence: isRegistryVerified ? 0.96 : 0.85,
      explanation: `Exact seller GSTIN/Tax ID match (${left.gstin}).`,
      isAmbiguous: false,
    };
  }

  // 3. Marketplace + Marketplace Seller ID
  const mktL = norm(left.marketplace);
  const mktR = norm(right.marketplace);
  const mktSellerL = norm(left.marketplaceSellerId);
  const mktSellerR = norm(right.marketplaceSellerId);
  if (mktL && mktR && mktL === mktR && mktSellerL && mktSellerR && mktSellerL === mktSellerR) {
    const isRegistryVerified = Boolean(options?.isLeftVerifiedRegistry || options?.isRightVerifiedRegistry);
    return {
      matched: true,
      sourceNodeId: left.nodeId,
      targetNodeId: right.nodeId,
      method: "MARKETPLACE_SELLER_ID",
      verificationState: isRegistryVerified ? "VERIFIED" : "SOURCE_SUPPORTED",
      confidence: 0.9,
      explanation: `Exact ${left.marketplace} seller ID match (${left.marketplaceSellerId}).`,
      isAmbiguous: false,
    };
  }

  // 4. Exact Invoice Number
  const invL = norm(left.invoiceNumber);
  const invR = norm(right.invoiceNumber);
  if (invL && invR && invL === invR && invL.length >= 4) {
    return {
      matched: true,
      sourceNodeId: left.nodeId,
      targetNodeId: right.nodeId,
      method: "INVOICE_NUMBER",
      verificationState: "SOURCE_SUPPORTED",
      confidence: 0.86,
      explanation: `Exact invoice number match (${left.invoiceNumber}).`,
      isAmbiguous: false,
    };
  }

  // 5. Exact SKU / Model Number
  const skuL = norm(left.sku || left.modelNumber);
  const skuR = norm(right.sku || right.modelNumber);
  if (skuL && skuR && skuL === skuR && skuL.length >= 4) {
    return {
      matched: true,
      sourceNodeId: left.nodeId,
      targetNodeId: right.nodeId,
      method: "SKU_MODEL",
      verificationState: "SOURCE_SUPPORTED",
      confidence: 0.82,
      explanation: `Exact product SKU/model match (${left.sku || left.modelNumber}).`,
      isAmbiguous: false,
    };
  }

  // 6. Exact Complaint ID (case association — scoped to explicit complaint refs)
  const cmpL = norm(left.complaintId || left.caseNumber);
  const cmpR = norm(right.complaintId || right.caseNumber);
  if (cmpL && cmpR && cmpL === cmpR && (left.orderId || right.orderId || left.invoiceNumber || right.invoiceNumber)) {
    return {
      matched: true,
      sourceNodeId: left.nodeId,
      targetNodeId: right.nodeId,
      method: "EXACT_COMPLAINT_ID",
      verificationState: "SOURCE_SUPPORTED",
      confidence: 0.78,
      explanation: `Scoped exact complaint association (${left.caseNumber || left.complaintId}) with document anchor.`,
      isAmbiguous: false,
    };
  }

  // 7. Amount + Currency check — STRICTLY require a corroborating anchor
  const sameAmount =
    typeof left.amountMinor === "number" &&
    typeof right.amountMinor === "number" &&
    left.amountMinor > 0 &&
    left.amountMinor === right.amountMinor &&
    (!left.currency || !right.currency || norm(left.currency) === norm(right.currency));

  const productOverlap = tokenOverlapScore(left.productTitle || left.label, right.productTitle || right.label);
  const sellerOverlap = tokenOverlapScore(left.sellerName, right.sellerName);

  const within48h = (() => {
    if (!left.timestampIso || !right.timestampIso) return false;
    const tL = Date.parse(left.timestampIso);
    const tR = Date.parse(right.timestampIso);
    if (!Number.isFinite(tL) || !Number.isFinite(tR)) return false;
    return Math.abs(tL - tR) <= 48 * 3600 * 1000;
  })();

  if (sameAmount) {
    if (productOverlap >= 0.45 || sellerOverlap >= 0.6 || within48h) {
      return {
        matched: true,
        sourceNodeId: left.nodeId,
        targetNodeId: right.nodeId,
        method: "AMOUNT_AND_CORROBORATED_ANCHOR",
        verificationState: "INFERRED",
        confidence: 0.68,
        explanation: `Amount (${left.amountMinor} ${left.currency || "minor"}) corroborated with secondary ${productOverlap >= 0.45 ? "product" : sellerOverlap >= 0.6 ? "seller" : "timestamp"} similarity; requires confirmation.`,
        isAmbiguous: false,
      };
    }
    return baseFail(
      "AMOUNT_ONLY_REJECTED",
      "Same amount & currency alone without Order ID, GSTIN, Invoice No, SKU, or corroborated timestamp/party anchor is insufficient to link evidence."
    );
  }

  // 8. Fuzzy Seller / Product candidate match — NEVER marks VERIFIED
  if (sellerOverlap >= 0.5 || productOverlap >= 0.55) {
    return {
      matched: true,
      sourceNodeId: left.nodeId,
      targetNodeId: right.nodeId,
      method: "FUZZY_CANDIDATE",
      verificationState: "INFERRED",
      confidence: Number(Math.max(sellerOverlap, productOverlap).toFixed(2)),
      explanation: `Fuzzy candidate similarity (${sellerOverlap >= 0.5 ? "seller name" : "product title"}); preserved as INFERRED until confirmed.`,
      isAmbiguous: false,
    };
  }

  return baseFail("NO_ANCHOR", "No deterministic or candidate anchor found between records.");
}

/**
 * Matches a seller name / identifier against candidate SellerDirectory entries while preserving ambiguity
 * when multiple candidate sellers exist.
 */
export function matchSellerCandidates<T extends { id: string; legalName: string; displayNames?: string[]; gstin?: string | null; marketplaceAccounts?: Array<{ marketplace: string; marketplaceSellerId: string }> }>(
  target: { gstin?: string | null; marketplace?: string | null; marketplaceSellerId?: string | null; sellerName?: string | null },
  candidates: T[]
): {
  status: "VERIFIED_EXACT" | "AMBIGUOUS" | "NO_MATCH";
  matches: Array<{ seller: T; method: DeterministicMatchMethod; confidence: number; verificationState: BegVerificationState }>;
} {
  const matches: Array<{ seller: T; method: DeterministicMatchMethod; confidence: number; verificationState: BegVerificationState }> = [];
  const targetGstin = norm(target.gstin);
  const targetMkt = norm(target.marketplace);
  const targetMktSeller = norm(target.marketplaceSellerId);

  for (const s of candidates) {
    if (targetGstin && norm(s.gstin) && norm(s.gstin) === targetGstin) {
      return {
        status: "VERIFIED_EXACT",
        matches: [{ seller: s, method: "VERIFIED_GSTIN", confidence: 0.98, verificationState: "VERIFIED" }],
      };
    }
    if (
      targetMkt &&
      targetMktSeller &&
      s.marketplaceAccounts?.some(
        (acc) => norm(acc.marketplace) === targetMkt && norm(acc.marketplaceSellerId) === targetMktSeller
      )
    ) {
      return {
        status: "VERIFIED_EXACT",
        matches: [{ seller: s, method: "MARKETPLACE_SELLER_ID", confidence: 0.93, verificationState: "VERIFIED" }],
      };
    }

    if (target.sellerName) {
      const names = [s.legalName, ...(s.displayNames || [])];
      let best = 0;
      for (const n of names) {
        best = Math.max(best, tokenOverlapScore(target.sellerName, n));
      }
      if (best >= 0.50) {
        matches.push({
          seller: s,
          method: "FUZZY_CANDIDATE",
          confidence: Number(best.toFixed(2)),
          verificationState: "INFERRED",
        });
      }
    }
  }

  if (matches.length === 0) {
    return { status: "NO_MATCH", matches: [] };
  }
  if (matches.length > 1) {
    return {
      status: "AMBIGUOUS",
      matches: matches.map((m) => ({
        ...m,
        method: "AMBIGUOUS_CANDIDATE",
        verificationState: "INFERRED",
      })),
    };
  }
  return { status: "AMBIGUOUS", matches };
}

/**
 * Extracts structured spec tokens (capacity like 512GB / 1TB, SKU/model codes, quantities)
 * cleanly from free text without guessing.
 */
export function extractAttributeTokens(text: string): {
  capacityToken: string | null;
  modelToken: string | null;
  quantity: number | null;
  deliveryMention: string | null;
} {
  const capMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(TB|GB|MB)\b/i);
  const capacityToken = capMatch ? `${capMatch[1]}${capMatch[2].toUpperCase()}` : null;

  const modelMatch = text.match(/\b([A-Z]{2,5}[- ]?\d{2,5}[A-Z0-9-]*|990\s*PRO|980\s*PRO|EVO\s*\d+)\b/i);
  const modelToken = modelMatch ? modelMatch[1].toUpperCase().replace(/\s+/g, " ") : null;

  const qtyMatch = text.match(/\b(?:qty|quantity|units?|pcs?)\s*[:=]?\s*(\d+)\b/i);
  const quantity = qtyMatch ? Number(qtyMatch[1]) : null;

  let deliveryMention: string | null = null;
  if (/\b(?:not received|never arrived|non[- ]?delivery|undelivered|missing package)\b/i.test(text)) {
    deliveryMention = "CLAIMED_NOT_DELIVERED";
  } else if (/\b(?:delivered|signed for|handed over|pod)\b/i.test(text)) {
    deliveryMention = "MARKED_DELIVERED";
  }

  return { capacityToken, modelToken, quantity, deliveryMention };
}

/**
 * Compares Order / Product Specification vs Buyer Observations vs Seller Declarations / Evidence
 * to classify CONSISTENT, INCONSISTENT, CONTESTED, MISSING, or REQUIRES_REVIEW discrepancies.
 */
export function evaluateAttributeDiscrepancies(
  observations: AttributeObservation[]
): DetectedDiscrepancy[] {
  const discrepancies: DetectedDiscrepancy[] = [];

  const orderSpecs = observations.filter((o) => o.role === "ORDER_SPEC");
  const buyerObs = observations.filter(
    (o) => o.role === "BUYER_OBSERVATION" || o.role === "BUYER_CLAIM"
  );
  const sellerDecl = observations.filter(
    (o) => o.role === "SELLER_DECLARATION" || o.role === "SELLER_EVIDENCE"
  );

  // 1. Capacity / Variant Spec Comparison (e.g., 1TB vs 512GB)
  const orderCap =
    orderSpecs.find((o) => o.attributes.capacityToken && o.nodeId.startsWith("spec:")) ||
    orderSpecs.find((o) => o.attributes.capacityToken);

  const buyerPhysicalObs = buyerObs.filter((o) => o.role === "BUYER_OBSERVATION");
  const buyerCap =
    (orderCap?.attributes.capacityToken
      ? buyerPhysicalObs.find(
          (o) =>
            o.attributes.capacityToken &&
            o.attributes.capacityToken !== orderCap.attributes.capacityToken
        )
      : undefined) ||
    buyerPhysicalObs.find((o) => o.attributes.capacityToken) ||
    buyerObs.find((o) => o.attributes.capacityToken);

  const sellerCap =
    (buyerCap?.attributes.capacityToken
      ? sellerDecl.find(
          (o) =>
            o.attributes.capacityToken &&
            o.attributes.capacityToken !== buyerCap.attributes.capacityToken
        )
      : undefined) || sellerDecl.find((o) => o.attributes.capacityToken);

  if (orderCap || buyerCap || sellerCap) {
    const vals = [
      orderCap?.attributes.capacityToken,
      buyerCap?.attributes.capacityToken,
      sellerCap?.attributes.capacityToken,
    ].filter(Boolean) as string[];
    const uniqueVals = Array.from(new Set(vals.map((v) => v.toUpperCase())));

    if (uniqueVals.length > 1) {
      const involved = [orderCap?.nodeId, buyerCap?.nodeId, sellerCap?.nodeId].filter(
        Boolean
      ) as string[];
      const buyerDiffersFromOrder =
        orderCap?.attributes.capacityToken &&
        buyerCap?.attributes.capacityToken &&
        orderCap.attributes.capacityToken !== buyerCap.attributes.capacityToken;
      const sellerConflictsWithBuyer =
        sellerCap?.attributes.capacityToken &&
        buyerCap?.attributes.capacityToken &&
        sellerCap.attributes.capacityToken !== buyerCap.attributes.capacityToken;

      discrepancies.push({
        key: "spec_capacity",
        attribute: "Product Specification / Capacity",
        state: sellerConflictsWithBuyer ? "CONTESTED" : "INCONSISTENT",
        verificationState: "CONTESTED",
        summary: `Product capacity/variant mismatch: Order=${orderCap?.attributes.capacityToken || "Unknown"}, Buyer observed=${buyerCap?.attributes.capacityToken || "Unknown"}, Seller stated=${sellerCap?.attributes.capacityToken || "Unknown"}.`,
        orderValue: orderCap?.attributes.capacityToken || undefined,
        buyerValue: buyerCap?.attributes.capacityToken || undefined,
        sellerValue: sellerCap?.attributes.capacityToken || undefined,
        orderNodeId: orderCap?.nodeId,
        buyerNodeId: buyerCap?.nodeId,
        sellerNodeId: sellerCap?.nodeId,
        involvedNodeIds: involved,
      });

      if (buyerDiffersFromOrder && !sellerCap) {
        discrepancies[discrepancies.length - 1].state = "REQUIRES_REVIEW";
      }
    } else if (uniqueVals.length === 1 && vals.length >= 2) {
      const involved = [orderCap?.nodeId, buyerCap?.nodeId, sellerCap?.nodeId].filter(
        Boolean
      ) as string[];
      discrepancies.push({
        key: "spec_capacity",
        attribute: "Product Specification / Capacity",
        state: "CONSISTENT",
        verificationState: "SOURCE_SUPPORTED",
        summary: `Product specification (${uniqueVals[0]}) is consistent across compared records.`,
        orderValue: orderCap?.attributes.capacityToken || undefined,
        buyerValue: buyerCap?.attributes.capacityToken || undefined,
        sellerValue: sellerCap?.attributes.capacityToken || undefined,
        orderNodeId: orderCap?.nodeId,
        buyerNodeId: buyerCap?.nodeId,
        sellerNodeId: sellerCap?.nodeId,
        involvedNodeIds: involved,
      });
    }
  }

  // 2. Delivery Status Comparison (Buyer Claimed Not Delivered vs Dispatch/Logistics Delivered)
  const buyerDelivery = buyerObs.find(
    (o) => o.attributes.deliveryState === "CLAIMED_NOT_DELIVERED"
  );
  const sellerDelivery = sellerDecl.find(
    (o) => o.attributes.deliveryState === "MARKED_DELIVERED"
  );
  if (buyerDelivery && sellerDelivery) {
    discrepancies.push({
      key: "delivery_status",
      attribute: "Delivery Confirmation",
      state: "CONTESTED",
      verificationState: "CONTESTED",
      summary:
        "Buyer reports non-delivery while seller/dispatch record indicates delivered; independent Proof of Delivery (PoD) verification required.",
      buyerValue: "Claimed Not Delivered",
      sellerValue: "Marked Delivered",
      buyerNodeId: buyerDelivery.nodeId,
      sellerNodeId: sellerDelivery.nodeId,
      involvedNodeIds: [buyerDelivery.nodeId, sellerDelivery.nodeId],
    });
  }

  // 3. Monetary Amount Mismatch
  const payments = observations.filter(
    (o) => typeof o.attributes.amountMinor === "number" && (o.attributes.amountMinor || 0) > 0
  );
  const distinctAmounts = Array.from(
    new Set(payments.map((p) => `${p.attributes.currency || "USD"}:${p.attributes.amountMinor}`))
  );
  if (distinctAmounts.length > 1) {
    discrepancies.push({
      key: "amount_consistency",
      attribute: "Transaction / Invoice Amount",
      state: "REQUIRES_REVIEW",
      verificationState: "CONTESTED",
      summary: `Multiple differing monetary amounts observed across case records (${distinctAmounts.join(" vs ")}).`,
      involvedNodeIds: payments.map((p) => p.nodeId),
    });
  }

  return discrepancies;
}
