/**
 * RESOLVEGRAPH — Replacement Remedy Execution & Delivery Lifecycle Service
 *
 * Strictly separates:
 *   BERR Recommendation -> Policy Eligibility -> Human Authorization ->
 *   Seller Stock Confirmation -> Physical Dispatch (PackagePassport) ->
 *   Delivery Confirmation -> Case Resolution
 *
 * Never marks a replacement case RESOLVED upon authorization or dispatch alone.
 */

import { prisma } from "@/lib/prisma";
import type { AuthenticatedUser } from "@/server/auth/session";
import { canAccessCase } from "@/server/auth/permissions";
import {
  CaseStatus,
  EventType,
  OrganizationRole,
  RemedyType,
  UserRole,
} from "@/generated/prisma/client";
import { RefundService } from "@/server/paypal/services/refund.service";
import { PackagePassportService } from "@/server/services/package-passport.service";
import { DeliveryReminderService } from "@/server/services/delivery-reminder.service";
import { CaseLifecycleService } from "./case-lifecycle.service";
import { EventOrchestrationService } from "./event-orchestration.service";
import { SecurityAuditService } from "@/server/services/security-audit.service";
import { BegSyncService } from "@/server/graph/beg-sync.service";

export class ReplacementExecutionError extends Error {
  public readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ReplacementExecutionError";
    this.status = status;
  }
}

async function notifySellerOrgMembers(params: {
  organizationId: string | null | undefined;
  caseNumber: string;
  title: string;
  body: string;
  type?: string;
}) {
  if (!params.organizationId) return;
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId: params.organizationId,
      isActive: true,
      role: {
        in: [
          OrganizationRole.OWNER,
          OrganizationRole.ORG_ADMIN,
          OrganizationRole.MERCHANT_AGENT,
          OrganizationRole.RESOLUTION_MANAGER,
        ],
      },
    },
    select: { userId: true },
  });
  for (const m of members) {
    await prisma.notificationMessage
      .create({
        data: {
          userId: m.userId,
          title: params.title,
          body: params.body,
          linkUrl: "/seller/requests",
          type: params.type || "INFO",
        },
      })
      .catch(() => {});
  }
}

function canUserActAsSellerForCase(
  user: AuthenticatedUser,
  caseOrganizationId: string | null,
  fulfillmentOrgId: string | null,
  caseMerchantId: string
): boolean {
  if (user.isPlatformAdmin || user.role === UserRole.ADMIN) return true;
  if (user.role === UserRole.BUYER) return false;

  const targetOrgId = fulfillmentOrgId || caseOrganizationId;
  if (targetOrgId) {
    return user.orgMemberships.some(
      (m) =>
        m.organizationId === targetOrgId &&
        m.role !== OrganizationRole.VIEWER
    );
  }
  return user.id === caseMerchantId && user.role === UserRole.MERCHANT;
}

const proposalReplacementLocks = new Map<string, Promise<unknown>>();

async function withProposalReplacementLock<T>(
  proposalId: string,
  fn: () => Promise<T>
): Promise<T> {
  const prev = proposalReplacementLocks.get(proposalId) ?? Promise.resolve();
  let releaseLock!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  const chained = prev.catch(() => {}).then(() => gate);
  proposalReplacementLocks.set(proposalId, chained);
  await prev.catch(() => {});
  try {
    return await fn();
  } finally {
    releaseLock();
    if (proposalReplacementLocks.get(proposalId) === chained) {
      proposalReplacementLocks.delete(proposalId);
    }
  }
}

export class ReplacementExecutionService {
  /**
   * Authorizes a REPLACEMENT resolution proposal and creates a tracked
   * ReplacementFulfillment record without falsely marking the case RESOLVED.
   * Serializes per proposalId and handles P2002 races idempotently.
   */
  public static async authorizeAndInitiateReplacement(params: {
    proposalId: string;
    actor: AuthenticatedUser;
    requestedSku?: string;
    notes?: string;
  }) {
    return withProposalReplacementLock(params.proposalId, () =>
      this.authorizeAndInitiateReplacementLocked(params)
    );
  }

  private static async authorizeAndInitiateReplacementLocked(params: {
    proposalId: string;
    actor: AuthenticatedUser;
    requestedSku?: string;
    notes?: string;
  }) {
    const proposal = await prisma.resolutionProposal.findUnique({
      where: { id: params.proposalId },
      include: {
        case: {
          include: {
            orders: { include: { items: true }, take: 1 },
            purchaseMemory: true,
            sellerIdentityMatches: {
              where: { matchedSellerId: { not: null } },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
        replacementFulfillment: true,
      },
    });

    if (!proposal) {
      throw new ReplacementExecutionError(`Proposal '${params.proposalId}' not found.`, 404);
    }

    if (proposal.proposalType !== "REPLACEMENT") {
      throw new ReplacementExecutionError(
        `Proposal '${params.proposalId}' is '${proposal.proposalType}', not REPLACEMENT.`,
        400
      );
    }

    if (
      proposal.status === "REJECTED" ||
      proposal.status === "CANCELLED" ||
      proposal.authorizationStatus === "REJECTED"
    ) {
      throw new ReplacementExecutionError(
        "Authorization denied or rejected replacement proposal cannot be executed.",
        400
      );
    }

    const canAuthorize =
      params.actor.isPlatformAdmin ||
      params.actor.role === UserRole.ADMIN ||
      params.actor.role === UserRole.RESOLUTION_MANAGER ||
      RefundService.isAuthorizedRefundApprover(params.actor, proposal.organizationId);

    if (!canAuthorize) {
      throw new ReplacementExecutionError(
        "Forbidden: User does not have permission to authorize replacement fulfillment.",
        403
      );
    }

    // Check active BERR blockers if proposal relies on an assessment
    if (proposal.basedOnAssessmentId) {
      const assessment = await prisma.berrAssessmentRecord.findUnique({
        where: { id: proposal.basedOnAssessmentId },
        select: { id: true, status: true, overallStatus: true, isStale: true },
      });
      if (assessment?.status === "INSUFFICIENT_BEG_DATA") {
        throw new ReplacementExecutionError(
          "Cannot authorize replacement when underlying BERR assessment reports INSUFFICIENT_BEG_DATA.",
          400
        );
      }
    }

    // Idempotent guard: return existing ReplacementFulfillment if already initiated
    if (proposal.replacementFulfillment) {
      return {
        fulfillment: proposal.replacementFulfillment,
        alreadyInitiated: true,
      };
    }

    const now = new Date();
    const linkedOrder = proposal.case.orders[0] || null;
    const productName =
      linkedOrder?.items[0]?.title ||
      proposal.case.purchaseMemory?.listingTitle ||
      proposal.case.title;
    const requestedSku =
      params.requestedSku ||
      linkedOrder?.items[0]?.sku ||
      proposal.case.purchaseMemory?.sku ||
      undefined;
    const orgId = proposal.case.organizationId || proposal.organizationId;
    const matchedSellerId = proposal.case.sellerIdentityMatches[0]?.matchedSellerId || null;

    let fulfillment;
    try {
      const txRes = await prisma.$transaction(async (tx) => {
        await tx.resolutionProposal.update({
          where: { id: proposal.id },
          data: {
            status: "AGREED",
            authorizationStatus: "AUTHORIZED",
            authorizedById: params.actor.id,
            authorizedAt: now,
            executionMode: "REPLACEMENT_FULFILLMENT",
            updatedAt: now,
          },
        });

        const createdFulfillment = await tx.replacementFulfillment.create({
          data: {
            caseId: proposal.caseId,
            proposalId: proposal.id,
            orderId: linkedOrder?.id || null,
            merchantOrganizationId: orgId,
            sellerId: matchedSellerId,
            productName,
            requestedSku: requestedSku || null,
            status: "REQUESTED_FROM_SELLER",
            authorizedById: params.actor.id,
            authorizedAt: now,
            notes: params.notes || "Authorized replacement requested from seller organization.",
          },
        });

        return { fulfillment: createdFulfillment };
      });
      fulfillment = txRes.fulfillment;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        const existing = await prisma.replacementFulfillment.findUnique({
          where: { proposalId: proposal.id },
        });
        if (existing) {
          return {
            fulfillment: existing,
            alreadyInitiated: true,
          };
        }
      }
      throw error;
    }

    if (proposal.case.status !== CaseStatus.RESOLVED && proposal.case.status !== CaseStatus.CLOSED) {
      if (proposal.case.status !== CaseStatus.EXECUTING_REPLACEMENT) {
        await CaseLifecycleService.transitionStatus({
          caseId: proposal.caseId,
          nextStatus: CaseStatus.EXECUTING_REPLACEMENT,
          actorId: params.actor.id,
          note: `Replacement authorized (${fulfillment.id}); awaiting seller confirmation, dispatch, and delivery.`,
          metadata: {
            proposalId: proposal.id,
            replacementFulfillmentId: fulfillment.id,
          },
        }).catch(async () => {
          await prisma.caseRecord.update({
            where: { id: proposal.caseId },
            data: { status: CaseStatus.EXECUTING_REPLACEMENT, updatedAt: now },
          });
        });
      }
      await prisma.caseRecord.update({
        where: { id: proposal.caseId },
        data: { recommendedRemedy: RemedyType.REPLACEMENT, updatedAt: now },
      });
    }

    await EventOrchestrationService.recordCaseEvent({
      caseId: proposal.caseId,
      eventType: EventType.REPLACEMENT_AUTHORIZED,
      actorId: params.actor.id,
      description: `Replacement authorized for ${productName}. Awaiting seller confirmation and dispatch.`,
      metadata: {
        proposalId: proposal.id,
        fulfillmentId: fulfillment.id,
        requestedSku,
      },
    });

    await DeliveryReminderService.notifyBuyerCaseEvent({
      userId: proposal.case.buyerId,
      caseNumber: proposal.case.caseNumber,
      title: `Replacement Authorized — ${proposal.case.caseNumber}`,
      body: `Your replacement for ${productName} has been authorized and requested from the seller.`,
      type: "INFO",
    });

    await notifySellerOrgMembers({
      organizationId: orgId,
      caseNumber: proposal.case.caseNumber,
      title: `Replacement Fulfillment Required — ${proposal.case.caseNumber}`,
      body: `Authorized replacement requested for ${productName} (Fulfillment ${fulfillment.id}). Please confirm stock and dispatch tracking.`,
      type: "WARNING",
    });

    await SecurityAuditService.record({
      actorId: params.actor.id,
      action: "REPLACEMENT_AUTHORIZED",
      targetType: "ReplacementFulfillment",
      targetId: fulfillment.id,
      status: "SUCCESS",
      metadata: { caseId: proposal.caseId, proposalId: proposal.id },
    });

    return { fulfillment, alreadyInitiated: false };
  }

  /**
   * Seller confirms replacement availability and SKU prior to shipment.
   */
  public static async confirmBySeller(params: {
    fulfillmentId: string;
    actor: AuthenticatedUser;
    confirmedSku?: string;
    notes?: string;
  }) {
    const fulfillment = await prisma.replacementFulfillment.findFirst({
      where: {
        OR: [
          { id: params.fulfillmentId },
          { proposalId: params.fulfillmentId },
          { caseId: params.fulfillmentId },
        ],
      },
      include: { case: true },
      orderBy: { createdAt: "desc" },
    });

    if (!fulfillment) {
      throw new ReplacementExecutionError(`Replacement fulfillment '${params.fulfillmentId}' not found.`, 404);
    }

    if (
      !canUserActAsSellerForCase(
        params.actor,
        fulfillment.case.organizationId,
        fulfillment.merchantOrganizationId,
        fulfillment.case.merchantId
      )
    ) {
      throw new ReplacementExecutionError(
        "Forbidden: User is not authorized to confirm replacement for this seller organization.",
        403
      );
    }

    if (fulfillment.status === "CANCELLED" || fulfillment.status === "COMPLETED") {
      throw new ReplacementExecutionError(
        `Cannot confirm replacement in '${fulfillment.status}' status.`,
        400
      );
    }

    const now = new Date();
    const updated = await prisma.replacementFulfillment.update({
      where: { id: fulfillment.id },
      data: {
        status: "SELLER_CONFIRMED",
        confirmedSku: params.confirmedSku || fulfillment.requestedSku || null,
        sellerConfirmedById: params.actor.id,
        sellerConfirmedAt: now,
        notes: params.notes || fulfillment.notes,
      },
    });

    await EventOrchestrationService.recordCaseEvent({
      caseId: fulfillment.caseId,
      eventType: EventType.REPLACEMENT_CONFIRMED,
      actorId: params.actor.id,
      description: `Seller confirmed replacement readiness${updated.confirmedSku ? ` (SKU: ${updated.confirmedSku})` : ""}.`,
      metadata: { fulfillmentId: updated.id, confirmedSku: updated.confirmedSku },
    });

    await DeliveryReminderService.notifyBuyerCaseEvent({
      userId: fulfillment.case.buyerId,
      caseNumber: fulfillment.case.caseNumber,
      title: `Seller Confirmed Replacement — ${fulfillment.case.caseNumber}`,
      body: `Seller confirmed replacement dispatch preparation for ${fulfillment.productName}.`,
      type: "INFO",
    });

    return updated;
  }

  /**
   * Creates a tracked replacement PackagePassport, dispatches via carrier, and
   * keeps case in EXECUTING_REPLACEMENT until delivery confirmation.
   */
  public static async dispatchReplacement(params: {
    fulfillmentId: string;
    actor: AuthenticatedUser;
    carrierName: string;
    trackingNumber: string;
    confirmedSku?: string;
    sealNumber?: string;
    sealType?: string;
  }) {
    const fulfillment = await prisma.replacementFulfillment.findFirst({
      where: {
        OR: [
          { id: params.fulfillmentId },
          { proposalId: params.fulfillmentId },
          { caseId: params.fulfillmentId },
        ],
      },
      include: { case: { include: { purchaseMemory: true } } },
      orderBy: { createdAt: "desc" },
    });

    if (!fulfillment) {
      throw new ReplacementExecutionError(`Replacement fulfillment '${params.fulfillmentId}' not found.`, 404);
    }

    if (
      !canUserActAsSellerForCase(
        params.actor,
        fulfillment.case.organizationId,
        fulfillment.merchantOrganizationId,
        fulfillment.case.merchantId
      )
    ) {
      throw new ReplacementExecutionError(
        "Forbidden: User is not authorized to dispatch replacement for this seller organization.",
        403
      );
    }

    if (
      fulfillment.status === "DISPATCHED" ||
      fulfillment.status === "DELIVERED" ||
      fulfillment.status === "COMPLETED"
    ) {
      return { fulfillment, alreadyDispatched: true };
    }

    if (fulfillment.status === "CANCELLED") {
      throw new ReplacementExecutionError("Cannot dispatch a cancelled replacement.", 400);
    }

    const orgId =
      fulfillment.merchantOrganizationId ||
      fulfillment.case.organizationId ||
      "org_default";

    const pkg = await PackagePassportService.createPackagePassport({
      merchantOrganizationId: orgId,
      orderId: fulfillment.orderId || undefined,
      purchaseMemoryId: fulfillment.case.purchaseMemoryId || undefined,
      carrierName: params.carrierName,
      trackingNumber: params.trackingNumber,
      userId: params.actor.id,
      items: [
        {
          productName: fulfillment.productName,
          sku: params.confirmedSku || fulfillment.confirmedSku || fulfillment.requestedSku || undefined,
          quantity: 1,
          condition: "NEW_REPLACEMENT",
        },
      ],
    });

    if (params.sealNumber) {
      const allowedSealTypes = [
        "TAMPER_EVIDENT_TAPE",
        "HOLOGRAPHIC_LABEL",
        "BARCODE_STRIP",
        "SECURITY_VOID_LABEL",
      ] as const;
      const sealType = allowedSealTypes.includes(
        params.sealType as (typeof allowedSealTypes)[number]
      )
        ? (params.sealType as (typeof allowedSealTypes)[number])
        : "TAMPER_EVIDENT_TAPE";

      await PackagePassportService.attachSeal({
        packageId: pkg.id,
        sealNumber: params.sealNumber,
        sealType,
        userId: params.actor.id,
      });
    }

    await PackagePassportService.dispatchPackage({
      packageId: pkg.id,
      carrierName: params.carrierName,
      trackingNumber: params.trackingNumber,
      userId: params.actor.id,
    });

    const now = new Date();
    const updated = await prisma.replacementFulfillment.update({
      where: { id: fulfillment.id },
      data: {
        packagePassportId: pkg.id,
        carrierName: params.carrierName,
        trackingNumber: params.trackingNumber,
        confirmedSku: params.confirmedSku || fulfillment.confirmedSku || fulfillment.requestedSku,
        status: "DISPATCHED",
        dispatchedAt: now,
        sellerConfirmedById: fulfillment.sellerConfirmedById || params.actor.id,
        sellerConfirmedAt: fulfillment.sellerConfirmedAt || now,
      },
    });

    await prisma.caseRecord.update({
      where: { id: fulfillment.caseId },
      data: {
        packagePassportId: pkg.id,
        status: CaseStatus.EXECUTING_REPLACEMENT,
        updatedAt: now,
      },
    });

    await EventOrchestrationService.recordCaseEvent({
      caseId: fulfillment.caseId,
      eventType: EventType.REPLACEMENT_DISPATCHED,
      actorId: params.actor.id,
      description: `Replacement shipped via ${params.carrierName} (Tracking #${params.trackingNumber}, Passport ${pkg.packageNumber}). Awaiting delivery confirmation.`,
      metadata: {
        fulfillmentId: updated.id,
        packagePassportId: pkg.id,
        packageNumber: pkg.packageNumber,
        carrierName: params.carrierName,
        trackingNumber: params.trackingNumber,
      },
    });

    return { fulfillment: updated, packagePassport: pkg, alreadyDispatched: false };
  }

  /**
   * Confirms actual physical delivery of the replacement parcel and ONLY THEN
   * marks the replacement proposal COMPLETED and the dispute case RESOLVED.
   */
  public static async confirmDeliveryAndComplete(params: {
    fulfillmentId: string;
    actor: AuthenticatedUser;
    deliveryNote?: string;
  }) {
    const fulfillment = await prisma.replacementFulfillment.findFirst({
      where: {
        OR: [
          { id: params.fulfillmentId },
          { proposalId: params.fulfillmentId },
          { packagePassportId: params.fulfillmentId },
          { caseId: params.fulfillmentId },
        ],
      },
      include: { case: true, proposal: true, packagePassport: true },
      orderBy: { createdAt: "desc" },
    });

    if (!fulfillment) {
      throw new ReplacementExecutionError(`Replacement fulfillment '${params.fulfillmentId}' not found.`, 404);
    }

    if (!canAccessCase(params.actor, fulfillment.case)) {
      throw new ReplacementExecutionError(
        "Forbidden: User does not have access to confirm delivery for this complaint.",
        403
      );
    }

    if (fulfillment.status === "COMPLETED") {
      return { fulfillment, alreadyCompleted: true };
    }

    if (
      fulfillment.status !== "DISPATCHED" &&
      fulfillment.status !== "IN_TRANSIT" &&
      fulfillment.status !== "DELIVERED"
    ) {
      throw new ReplacementExecutionError(
        `Replacement cannot be marked delivered while in '${fulfillment.status}' status. Dispatch tracking must be recorded first.`,
        400
      );
    }

    return this.completeFulfillmentInternal({
      fulfillment,
      actorId: params.actor.id,
      deliveryNote: params.deliveryNote,
    });
  }

  /**
   * Called automatically when a verified DELIVERED event is logged for a PackagePassport.
   */
  public static async syncDeliveredPackage(params: {
    packageId: string;
    actorId?: string | null;
    deliveredAt?: Date;
    deliveryNote?: string;
  }) {
    const fulfillment = await prisma.replacementFulfillment.findFirst({
      where: {
        packagePassportId: params.packageId,
        status: { in: ["DISPATCHED", "IN_TRANSIT", "DELIVERED"] },
      },
      include: { case: true, proposal: true, packagePassport: true },
      orderBy: { createdAt: "desc" },
    });

    if (!fulfillment) {
      return null;
    }

    const actorId =
      params.actorId ||
      fulfillment.authorizedById ||
      fulfillment.case.buyerId ||
      fulfillment.case.merchantId;

    return this.completeFulfillmentInternal({
      fulfillment,
      actorId,
      deliveredAt: params.deliveredAt,
      deliveryNote: params.deliveryNote,
    });
  }

  private static async completeFulfillmentInternal(params: {
    fulfillment: {
      id: string;
      caseId: string;
      proposalId: string;
      packagePassportId: string | null;
      merchantOrganizationId: string | null;
      productName: string;
      carrierName: string | null;
      trackingNumber: string | null;
      status: string;
      deliveredAt: Date | null;
      case: {
        id: string;
        caseNumber: string;
        buyerId: string | null;
        organizationId: string | null;
        purchaseMemoryId: string | null;
      };
      packagePassport: { status: string } | null;
    };
    actorId: string;
    deliveredAt?: Date;
    deliveryNote?: string;
  }) {
    const { fulfillment } = params;
    const now = params.deliveredAt || new Date();

    if (fulfillment.status === "COMPLETED") {
      return { fulfillment, alreadyCompleted: true };
    }

    if (fulfillment.packagePassportId && fulfillment.packagePassport?.status !== "DELIVERED") {
      await prisma.packagePassport.update({
        where: { id: fulfillment.packagePassportId },
        data: { status: "DELIVERED", deliveredAt: now },
      });
      await prisma.deliveryEvent.create({
        data: {
          packageId: fulfillment.packagePassportId,
          purchaseMemoryId: fulfillment.case.purchaseMemoryId,
          eventType: "DELIVERED",
          carrier: fulfillment.carrierName || "Carrier",
          isEstimated: false,
          eventTimestamp: now,
          checkpoint: params.deliveryNote || "Replacement delivery confirmed",
          rawSource: `USER_CONFIRMATION:${params.actorId}`,
        },
      });
    }

    const completedFulfillment = await prisma.$transaction(async (tx) => {
      const updated = await tx.replacementFulfillment.update({
        where: { id: fulfillment.id },
        data: {
          status: "COMPLETED",
          deliveredAt: fulfillment.deliveredAt || now,
          completedAt: now,
        },
      });

      await tx.resolutionProposal.update({
        where: { id: fulfillment.proposalId },
        data: {
          status: "COMPLETED",
          authorizationStatus: "COMPLETED",
          updatedAt: now,
        },
      });

      return updated;
    });

    await CaseLifecycleService.resolveCase({
      caseId: fulfillment.caseId,
      actorId: params.actorId,
      remedy: RemedyType.REPLACEMENT,
      summary: `Replacement delivered and confirmed${
        fulfillment.trackingNumber ? ` (Tracking #${fulfillment.trackingNumber})` : ""
      }.`,
    });

    await EventOrchestrationService.recordCaseEvent({
      caseId: fulfillment.caseId,
      eventType: EventType.REPLACEMENT_DELIVERED,
      actorId: params.actorId,
      description: `Replacement delivered and verified. Case marked RESOLVED.`,
      metadata: {
        fulfillmentId: completedFulfillment.id,
        proposalId: fulfillment.proposalId,
        trackingNumber: fulfillment.trackingNumber,
      },
    });

    await DeliveryReminderService.notifyBuyerCaseEvent({
      userId: fulfillment.case.buyerId,
      caseNumber: fulfillment.case.caseNumber,
      title: `Replacement Delivered & Resolved — ${fulfillment.case.caseNumber}`,
      body: `Your replacement for ${fulfillment.productName} has been confirmed delivered. This complaint is now resolved.`,
      type: "SUCCESS",
    });

    await notifySellerOrgMembers({
      organizationId: fulfillment.merchantOrganizationId || fulfillment.case.organizationId,
      caseNumber: fulfillment.case.caseNumber,
      title: `Replacement Delivered — ${fulfillment.case.caseNumber}`,
      body: `Replacement delivery for ${fulfillment.productName} has been confirmed and the case is resolved.`,
      type: "SUCCESS",
    });

    await BegSyncService.handleDomainEvent({
      caseId: fulfillment.caseId,
      triggerEvent: "INVESTIGATION_UPDATED",
      actorId: params.actorId,
      rerunBerr: false,
    }).catch(() => {});

    return { fulfillment: completedFulfillment, alreadyCompleted: false };
  }
}
