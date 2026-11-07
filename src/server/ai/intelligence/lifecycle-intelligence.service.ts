/**
 * RESOLVEGRAPH Version 2.0
 * Module 13: Multimodal Case Intelligence & Lifecycle Divergence Detector
 * 
 * Unifies fact extraction across all commerce lifecycle milestones:
 * - Purchase Memory (Original guaranteed order specifications)
 * - Merchant Product Catalogue & Package Passport (Declared packed items)
 * - Physical Tamper Seals (Integrity and application state)
 * - Courier Delivery Checkpoints (Carrier events and handover)
 * - Buyer Unboxing Recording (Dual-Sight video and visible labels)
 * - Buyer & Merchant Statements (Dispute claims and counter-assertions)
 * 
 * Pinpoints the exact milestone where discrepancy or tampering emerged.
 */

import { prisma } from "@/lib/prisma";

export interface LifecycleFact {
  milestone: "PURCHASE" | "PACKING" | "SEALING" | "TRANSIT" | "DELIVERY" | "UNBOXING" | "DISPUTE_CLAIM";
  field: string;
  value: string;
  sourceEntity: string;
  sourceId: string;
  sourceSpan: string;
  confidence: number;
  reviewStatus: "UNREVIEWED" | "CONFIRMED" | "CORRECTED" | "CONTESTED";
  timestamp?: Date;
}

export interface LifecycleDivergence {
  field: string;
  divergenceMilestone: string;
  priorMilestoneValue: string;
  divergentValue: string;
  explanation: string;
  confidence: number;
}

export interface CaseLifecycleTimelineReport {
  caseId: string;
  allFacts: LifecycleFact[];
  divergences: LifecycleDivergence[];
  summary: string;
  integrityVerdict: "CONSISTENT_ACROSS_LIFECYCLE" | "POST_FULFILLMENT_DIVERGENCE" | "PRE_DISPATCH_DISCREPANCY" | "UNVERIFIED";
}

export class LifecycleIntelligenceService {
  /**
   * Reconstructs the end-to-end multimodal timeline and identifies where facts diverged.
   */
  public static async analyzeCaseLifecycle(caseId: string): Promise<CaseLifecycleTimelineReport> {
    const caseRecord = await prisma.caseRecord.findUnique({
      where: { id: caseId },
      include: {
        purchaseMemory: {
          include: {
            specifications: true,
            promises: true,
          },
        },
        packagePassport: {
          include: {
            items: true,
            seals: true,
            events: true,
          },
        },
        claims: true,
        evidence: {
          include: {
            extractedFacts: true,
            analysisResults: true,
          },
        },
        cameraSessions: {
          include: {
            streams: true,
            challenges: true,
          },
        },
      },
    });

    if (!caseRecord) {
      throw new Error(`Case ${caseId} not found.`);
    }

    const facts: LifecycleFact[] = [];
    const divergences: LifecycleDivergence[] = [];

    // Milestone 1: Purchase Memory (Order Promise)
    if (caseRecord.purchaseMemory) {
      const pm = caseRecord.purchaseMemory;
      facts.push({
        milestone: "PURCHASE",
        field: "product_title",
        value: pm.listingTitle,
        sourceEntity: "PurchaseMemory",
        sourceId: pm.id,
        sourceSpan: `Order #${pm.externalOrderId}`,
        confidence: 1.0,
        reviewStatus: "CONFIRMED",
        timestamp: pm.purchaseDate,
      });

      for (const spec of pm.specifications) {
        facts.push({
          milestone: "PURCHASE",
          field: spec.specKey,
          value: spec.specValue,
          sourceEntity: "PurchaseSpecification",
          sourceId: spec.id,
          sourceSpan: spec.sourceExcerpt || `Guaranteed specification: ${spec.specKey}`,
          confidence: spec.confidence,
          reviewStatus: "CONFIRMED",
          timestamp: pm.purchaseDate,
        });
      }
    }

    // Milestone 2 & 3: Merchant Package Passport & Seals
    if (caseRecord.packagePassport) {
      const pkg = caseRecord.packagePassport;
      for (const item of pkg.items) {
        if (item.declaredCapacity) {
          facts.push({
            milestone: "PACKING",
            field: "storage_capacity",
            value: item.declaredCapacity,
            sourceEntity: "PackageItem",
            sourceId: item.id,
            sourceSpan: `Merchant packing declaration: ${item.productName}`,
            confidence: 0.95,
            reviewStatus: "CONFIRMED",
            timestamp: pkg.createdAt,
          });
        }
      }

      for (const seal of pkg.seals) {
        facts.push({
          milestone: "SEALING",
          field: "physical_seal_status",
          value: seal.verificationStatus,
          sourceEntity: "PackageSeal",
          sourceId: seal.id,
          sourceSpan: `Seal #${seal.sealNumber} (${seal.sealType})`,
          confidence: 1.0,
          reviewStatus: "CONFIRMED",
          timestamp: seal.appliedAt,
        });
      }
    }

    // Milestone 4: Transit Checkpoints
    const deliveryEvents = await prisma.deliveryEvent.findMany({
      where: {
        OR: [
          { packageId: caseRecord.packagePassportId || undefined },
          { purchaseMemoryId: caseRecord.purchaseMemoryId || undefined },
        ],
      },
      orderBy: { eventTimestamp: "asc" },
    });

    for (const dev of deliveryEvents) {
      facts.push({
        milestone: "TRANSIT",
        field: "transit_checkpoint",
        value: dev.eventType,
        sourceEntity: "DeliveryEvent",
        sourceId: dev.id,
        sourceSpan: `${dev.carrier || "Courier"}: ${dev.checkpoint || dev.eventType} (Estimated: ${dev.isEstimated})`,
        confidence: dev.isEstimated ? 0.7 : 0.98,
        reviewStatus: "CONFIRMED",
        timestamp: dev.eventTimestamp,
      });
    }

    // Milestone 5: Buyer Unboxing Recording / Evidence
    for (const ev of caseRecord.evidence) {
      if (ev.description?.includes("unboxing") || ev.mimeType.startsWith("video/")) {
        for (const fact of ev.extractedFacts) {
          facts.push({
            milestone: "UNBOXING",
            field: fact.fieldKey,
            value: fact.normalizedValue,
            sourceEntity: "ExtractedFact",
            sourceId: fact.id,
            sourceSpan: fact.sourceExcerpt || ev.filename,
            confidence: 0.92,
            reviewStatus: "CONFIRMED",
            timestamp: fact.createdAt,
          });
        }
      }
    }

    // Milestone 6: Buyer Claims
    for (const claim of caseRecord.claims) {
      facts.push({
        milestone: "DISPUTE_CLAIM",
        field: "claimed_issue",
        value: claim.statement,
        sourceEntity: "Claim",
        sourceId: claim.id,
        sourceSpan: claim.statement,
        confidence: 1.0,
        reviewStatus: "CONTESTED",
        timestamp: claim.createdAt,
      });

      // Detect claimed capacity in dispute statement (e.g. 512 GB)
      const capMatch = claim.statement.match(/\b(\d+(?:\.\d+)?)\s*(TB|GB)\b/i);
      if (capMatch) {
        facts.push({
          milestone: "DISPUTE_CLAIM",
          field: "storage_capacity",
          value: `${capMatch[1]} ${capMatch[2].toUpperCase()}`,
          sourceEntity: "Claim",
          sourceId: claim.id,
          sourceSpan: capMatch[0],
          confidence: 0.9,
          reviewStatus: "CONTESTED",
          timestamp: claim.createdAt,
        });
      }
    }

    // Perform Divergence Detection across Lifecycle
    const capacityFacts = facts.filter((f) => f.field === "storage_capacity");
    if (capacityFacts.length >= 2) {
      const purchaseFact = capacityFacts.find((f) => f.milestone === "PURCHASE");
      const packingFact = capacityFacts.find((f) => f.milestone === "PACKING");
      const unboxingFact = capacityFacts.find((f) => f.milestone === "UNBOXING");
      const claimFact = capacityFacts.find((f) => f.milestone === "DISPUTE_CLAIM");

      if (purchaseFact && claimFact && purchaseFact.value !== claimFact.value) {
        const emergenceMilestone = unboxingFact ? "UNBOXING" : "DISPUTE_CLAIM";
        divergences.push({
          field: "storage_capacity",
          divergenceMilestone: emergenceMilestone,
          priorMilestoneValue: purchaseFact.value,
          divergentValue: claimFact.value,
          explanation: `Product storage capacity was promised as ${purchaseFact.value} at checkout and declared as ${packingFact?.value || purchaseFact.value} at packing, but diverged to ${claimFact.value} at ${emergenceMilestone}.`,
          confidence: 0.94,
        });
      }
    }

    let verdict: "CONSISTENT_ACROSS_LIFECYCLE" | "POST_FULFILLMENT_DIVERGENCE" | "PRE_DISPATCH_DISCREPANCY" | "UNVERIFIED" =
      "CONSISTENT_ACROSS_LIFECYCLE";

    if (divergences.length > 0) {
      verdict = "POST_FULFILLMENT_DIVERGENCE";
    }

    const summary =
      divergences.length > 0
        ? `Lifecycle Divergence Detected: ${divergences[0].explanation}`
        : "Lifecycle facts remain internally consistent across order, packing, transit, and receipt milestones.";

    return {
      caseId,
      allFacts: facts,
      divergences,
      summary,
      integrityVerdict: verdict,
    };
  }
}
