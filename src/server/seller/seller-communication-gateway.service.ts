/**
 * RESOLVEGRAPH — Seller Communication Gateway
 *
 * Central reusable backend service selecting and executing the authorized
 * communication channel for seller evidence requests in strict priority order:
 *
 * Priority 1: RESOLVEGRAPH Seller Portal (Registered & Verified Seller Organizations)
 * Priority 2: Authorized Marketplace Integration Adapter (Only when genuine API credentials & capability exist)
 * Priority 3: Customer-Assisted Official Help Centre Fallback (Honest CUSTOMER_ACTION_REQUIRED state)
 */

import { prisma } from '@/lib/prisma';
import {
  EventType,
  OrganizationRole,
  UserRole,
} from '@/generated/prisma/client';
import { MarketplaceCommunicationService } from './marketplace-communication.service';
import { SellerEvidenceRequirementsService } from './seller-evidence-requirements.service';
import {
  getSellerResponseWindowHours,
  normalizeMarketplaceName,
  type SellerCommunicationChannel,
  type SellerEvidenceRequestStatus,
  type SellerRegistrationStatus,
} from './seller.types';
import type { SellerMatchResolution } from './seller-directory.service';

export interface SellerGatewayRequestInput {
  caseId: string;
  caseNumber: string;
  buyerId: string;
  orderId: string;
  marketplace: string;
  productName: string;
  complaintCategory: string;
  originalCategory?: string | null;
  buyerScreeningPassed: boolean;
  sellerMatchId: string;
  matchResolution: SellerMatchResolution;
  actorId: string;
  idempotencyKey?: string;
}

export interface SellerGatewayExecutionOutput {
  selectedChannel: SellerCommunicationChannel;
  channelEligibility: 'ELIGIBLE' | 'UNAVAILABLE' | 'BLOCKED';
  sellerRegistrationStatus: SellerRegistrationStatus;
  integrationAvailability: string;
  requestStatus: SellerEvidenceRequestStatus | 'REVIEW_REQUIRED';
  failureReason: string | null;
  marketplaceSupportUrl: string | null;
  relatedSellerAccountId: string | null;
  relatedOrganizationId: string | null;
  requestId: string | null;
  requestNumber: string | null;
  executedAt: string;
}

async function generateNextRequestNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const existing = await prisma.sellerEvidenceRequest.findMany({
    where: { requestNumber: { startsWith: `SER-${year}-` } },
    select: { requestNumber: true },
  });
  let maxSeq = 1000;
  for (const r of existing) {
    const m = r.requestNumber.match(/^SER-\d{4}-(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxSeq) maxSeq = n;
    }
  }
  return `SER-${year}-${maxSeq + 1}`;
}

export class SellerCommunicationGatewayService {
  /**
   * Executes channel selection, creates persisted SellerEvidenceRequest +
   * SellerCommunicationAttempt records, and dispatches accurate notifications.
   */
  public static async routeAndDispatch(
    input: SellerGatewayRequestInput
  ): Promise<SellerGatewayExecutionOutput> {
    const executedAt = new Date();
    const marketplace = normalizeMarketplaceName(input.marketplace);

    if (!input.buyerScreeningPassed) {
      return {
        selectedChannel: 'REVIEW_REQUIRED',
        channelEligibility: 'BLOCKED',
        sellerRegistrationStatus: 'REQUIRES_REVIEW',
        integrationAvailability: 'BLOCKED_BY_SCREENING',
        requestStatus: 'REVIEW_REQUIRED',
        failureReason: 'Buyer evidence screening must pass before seller communication can begin.',
        marketplaceSupportUrl: null,
        relatedSellerAccountId: null,
        relatedOrganizationId: null,
        requestId: null,
        requestNumber: null,
        executedAt: executedAt.toISOString(),
      };
    }

    // Idempotency protection against duplicate dispatches
    if (input.idempotencyKey) {
      const existingReq = await prisma.sellerEvidenceRequest.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { communicationAttempts: { orderBy: { executedAt: 'desc' }, take: 1 } },
      });
      if (existingReq) {
        return {
          selectedChannel: existingReq.deliveryChannel as SellerCommunicationChannel,
          channelEligibility:
            existingReq.deliveryChannel === 'REVIEW_REQUIRED' ? 'BLOCKED' : 'ELIGIBLE',
          sellerRegistrationStatus: existingReq.registrationStatus as SellerRegistrationStatus,
          integrationAvailability:
            existingReq.deliveryChannel === 'SELLER_PORTAL'
              ? 'INTERNAL_PORTAL_CONNECTED'
              : existingReq.deliveryChannel === 'MARKETPLACE_API'
              ? 'AUTHORIZED_ADAPTER_ACTIVE'
              : 'NO_AUTHORIZED_API_HELP_CENTRE_FALLBACK',
          requestStatus: existingReq.status as SellerEvidenceRequestStatus,
          failureReason: existingReq.communicationAttempts[0]?.failureReason ?? null,
          marketplaceSupportUrl: existingReq.marketplaceSupportUrl,
          relatedSellerAccountId: existingReq.sellerId,
          relatedOrganizationId: existingReq.organizationId,
          requestId: existingReq.id,
          requestNumber: existingReq.requestNumber,
          executedAt: existingReq.createdAt.toISOString(),
        };
      }
    }

    const { matchResolution } = input;
    const { registration } = matchResolution;

    // -------------------------------------------------------------------------
    // SCENARIO C: Ambiguous / Unidentified / Inactive Seller -> Requires Review
    // -------------------------------------------------------------------------
    if (
      matchResolution.requiresHumanReview ||
      registration.registrationStatus === 'REQUIRES_REVIEW' ||
      registration.registrationStatus === 'INACTIVE'
    ) {
      const reviewReason =
        matchResolution.reviewReasons[0] ||
        registration.reason ||
        'SELLER IDENTITY REQUIRES REVIEW';

      await prisma.caseEvent.create({
        data: {
          caseId: input.caseId,
          actorId: input.actorId,
          eventType: EventType.SELLER_IDENTITY_MATCHED,
          description: `Seller identity requires investigator review (${matchResolution.matchOutcome}): ${reviewReason}`,
          metadataJson: JSON.stringify({
            stage: 'SELLER_IDENTITY_REQUIRES_REVIEW',
            matchOutcome: matchResolution.matchOutcome,
            candidateSellerIds: matchResolution.candidateSellerIds,
            reason: reviewReason,
          }),
        },
      });

      await prisma.caseTimelineEvent.create({
        data: {
          caseId: input.caseId,
          actorId: input.actorId,
          eventType: 'SELLER_IDENTITY_REVIEW_REQUIRED',
          title: 'Seller identity requires investigator review',
          description: reviewReason,
          occurredAt: executedAt,
          timePrecision: 'EXACT_TIMESTAMP',
          timeBasis: 'SYSTEM_OBSERVED',
          metadataJson: JSON.stringify({
            matchOutcome: matchResolution.matchOutcome,
            requiresHumanReview: true,
          }),
        },
      });

      await this.notifyInvestigators({
        caseNumber: input.caseNumber,
        title: `Seller Identity Review Needed — ${input.caseNumber}`,
        body: `Complaint ${input.caseNumber} requires manual seller verification before outreach: ${reviewReason}`,
        type: 'WARNING',
      });

      return {
        selectedChannel: 'REVIEW_REQUIRED',
        channelEligibility: 'BLOCKED',
        sellerRegistrationStatus: registration.registrationStatus,
        integrationAvailability: 'BLOCKED_PENDING_IDENTITY_REVIEW',
        requestStatus: 'REVIEW_REQUIRED',
        failureReason: reviewReason,
        marketplaceSupportUrl: null,
        relatedSellerAccountId: matchResolution.sellerEntry?.id ?? null,
        relatedOrganizationId: null,
        requestId: null,
        requestNumber: null,
        executedAt: executedAt.toISOString(),
      };
    }

    const reqPlan = SellerEvidenceRequirementsService.generateRequirements({
      category: input.complaintCategory,
      originalCategory: input.originalCategory,
      productName: input.productName,
      orderId: input.orderId,
    });

    const responseWindowHours = getSellerResponseWindowHours();
    const dueAt = new Date(executedAt.getTime() + responseWindowHours * 3600 * 1000);
    const requestNumber = await generateNextRequestNumber();

    // -------------------------------------------------------------------------
    // PRIORITY 1: RESOLVEGRAPH Seller Portal (Registered & Verified Seller)
    // -------------------------------------------------------------------------
    if (
      registration.registrationStatus === 'REGISTERED_VERIFIED' &&
      registration.organizationId &&
      registration.eligibleMemberUserIds.length > 0
    ) {
      // Safely link the CaseRecord to the verified Organization now (never via fuzzy match)
      await prisma.caseRecord.update({
        where: { id: input.caseId },
        data: {
          organizationId: registration.organizationId,
          ...(registration.merchantUserId ? { merchantId: registration.merchantUserId } : {}),
        },
      });

      const createdRequest = await prisma.sellerEvidenceRequest.create({
        data: {
          requestNumber,
          caseId: input.caseId,
          sellerId: matchResolution.sellerEntry?.id ?? null,
          sellerMatchId: input.sellerMatchId,
          organizationId: registration.organizationId,
          marketplace,
          orderId: input.orderId,
          productName: input.productName,
          complaintCategory: input.originalCategory || input.complaintCategory,
          requestDescription: reqPlan.requestDescription,
          requestedItemsJson: JSON.stringify(reqPlan.items),
          deliveryChannel: 'SELLER_PORTAL',
          registrationStatus: 'REGISTERED_VERIFIED',
          status: 'DELIVERED', // Internally persisted and delivered to Seller Portal
          createdById: input.actorId,
          dispatchedAt: executedAt,
          deliveredAt: executedAt,
          dueAt,
          idempotencyKey: input.idempotencyKey || null,
        },
      });

      // Distinct communication attempt & lifecycle events (generated, dispatched, delivered)
      await prisma.sellerCommunicationAttempt.create({
        data: {
          requestId: createdRequest.id,
          attemptNumber: 1,
          channel: 'SELLER_PORTAL',
          actionType: 'INITIAL_DISPATCH',
          eligibility: 'ELIGIBLE',
          executionStatus: 'DELIVERED',
          idempotencyKey: input.idempotencyKey ? `${input.idempotencyKey}:attempt:1` : null,
          actorId: input.actorId,
          metadataJson: JSON.stringify({
            organizationId: registration.organizationId,
            organizationName: registration.organizationName,
            notifiedMemberCount: registration.eligibleMemberUserIds.length,
          }),
          executedAt,
        },
      });

      await prisma.caseEvent.createMany({
        data: [
          {
            caseId: input.caseId,
            actorId: input.actorId,
            eventType: EventType.SELLER_EVIDENCE_REQUESTED,
            description: `Seller evidence request ${requestNumber} generated for verified seller ${matchResolution.sellerEntry?.legalName || registration.organizationName}.`,
            metadataJson: JSON.stringify({
              requestId: createdRequest.id,
              requestNumber,
              sellerId: matchResolution.sellerEntry?.id,
              organizationId: registration.organizationId,
              stage: 'MERCHANT_EVIDENCE_REQUESTED',
            }),
          },
          {
            caseId: input.caseId,
            actorId: input.actorId,
            eventType: EventType.SELLER_EVIDENCE_DISPATCHED,
            description: `Evidence request ${requestNumber} dispatched and delivered to RESOLVEGRAPH Seller Portal (${registration.organizationName}).`,
            metadataJson: JSON.stringify({
              requestId: createdRequest.id,
              requestNumber,
              channel: 'SELLER_PORTAL',
              deliveryState: 'DELIVERED',
            }),
          },
        ],
      });

      await prisma.caseTimelineEvent.create({
        data: {
          caseId: input.caseId,
          actorId: input.actorId,
          eventType: 'SELLER_EVIDENCE_REQUESTED',
          title: 'Evidence request sent to Seller Portal',
          description: `Sent itemized evidence request (${requestNumber}) to ${registration.organizationName}.`,
          occurredAt: executedAt,
          timePrecision: 'EXACT_TIMESTAMP',
          timeBasis: 'SYSTEM_OBSERVED',
          metadataJson: JSON.stringify({
            requestId: createdRequest.id,
            channel: 'SELLER_PORTAL',
          }),
        },
      });

      // Notify all eligible active seller organization members
      await prisma.notificationMessage.createMany({
        data: registration.eligibleMemberUserIds.map((memberUserId) => ({
          userId: memberUserId,
          title: `New Evidence Request ${requestNumber} — ${input.caseNumber}`,
          body: `Action requested for ${marketplace} order ${input.orderId} (${input.productName}). Review complaint and submit supporting records.`,
          linkUrl: `/seller/requests/${createdRequest.id}`,
          type: 'WARNING',
        })),
      });

      // Buyer-safe notification (no internal merchant secrets exposed)
      await prisma.notificationMessage.create({
        data: {
          userId: input.buyerId,
          title: `Seller Request Sent — ${input.caseNumber}`,
          body: `Verified seller "${matchResolution.sellerEntry?.displayName || matchResolution.sellerEntry?.legalName}" was matched on RESOLVEGRAPH and your evidence request was delivered via the Seller Portal.`,
          linkUrl: `/cases?complaint=${encodeURIComponent(input.caseNumber)}`,
          type: 'INFO',
        },
      });

      return {
        selectedChannel: 'SELLER_PORTAL',
        channelEligibility: 'ELIGIBLE',
        sellerRegistrationStatus: 'REGISTERED_VERIFIED',
        integrationAvailability: 'INTERNAL_PORTAL_CONNECTED',
        requestStatus: 'DELIVERED',
        failureReason: null,
        marketplaceSupportUrl: null,
        relatedSellerAccountId: matchResolution.sellerEntry?.id ?? null,
        relatedOrganizationId: registration.organizationId,
        requestId: createdRequest.id,
        requestNumber: createdRequest.requestNumber,
        executedAt: executedAt.toISOString(),
      };
    }

    // -------------------------------------------------------------------------
    // PRIORITY 2: Authorized Marketplace Integration (Unregistered Seller)
    // -------------------------------------------------------------------------
    const adapter = MarketplaceCommunicationService.getAdapter(marketplace);
    const authStatus = adapter.isAuthorizedForOutboundRequest();

    if (authStatus.authorized) {
      const dispatchRes = await adapter.sendEvidenceRequest({
        caseNumber: input.caseNumber,
        orderId: input.orderId,
        marketplace,
        sellerLegalName: matchResolution.sellerEntry?.legalName,
        productName: input.productName,
        complaintCategory: input.originalCategory || input.complaintCategory,
        requestedItems: reqPlan.items,
        idempotencyKey: input.idempotencyKey,
      });

      if (dispatchRes.available && dispatchRes.delivered) {
        const createdRequest = await prisma.sellerEvidenceRequest.create({
          data: {
            requestNumber,
            caseId: input.caseId,
            sellerId: matchResolution.sellerEntry?.id ?? null,
            sellerMatchId: input.sellerMatchId,
            organizationId: null,
            marketplace,
            orderId: input.orderId,
            productName: input.productName,
            complaintCategory: input.originalCategory || input.complaintCategory,
            requestDescription: reqPlan.requestDescription,
            requestedItemsJson: JSON.stringify(reqPlan.items),
            deliveryChannel: 'MARKETPLACE_API',
            registrationStatus: 'IDENTIFIED_UNREGISTERED',
            status: dispatchRes.executionStatus === 'DELIVERED' ? 'DELIVERED' : 'DELIVERY_PENDING',
            createdById: input.actorId,
            dispatchedAt: executedAt,
            deliveredAt: dispatchRes.executionStatus === 'DELIVERED' ? executedAt : null,
            dueAt,
            idempotencyKey: input.idempotencyKey || null,
          },
        });

        await prisma.sellerCommunicationAttempt.create({
          data: {
            requestId: createdRequest.id,
            attemptNumber: 1,
            channel: 'MARKETPLACE_API',
            actionType: 'INITIAL_DISPATCH',
            eligibility: 'ELIGIBLE',
            executionStatus: dispatchRes.executionStatus,
            externalReferenceId: dispatchRes.externalReferenceId || null,
            idempotencyKey: input.idempotencyKey ? `${input.idempotencyKey}:attempt:1` : null,
            actorId: input.actorId,
            executedAt,
          },
        });

        await prisma.caseEvent.create({
          data: {
            caseId: input.caseId,
            actorId: input.actorId,
            eventType: EventType.SELLER_EVIDENCE_DISPATCHED,
            description: `Evidence request ${requestNumber} dispatched via authorized ${marketplace} integration (ref: ${dispatchRes.externalReferenceId || 'N/A'}).`,
            metadataJson: JSON.stringify({
              requestId: createdRequest.id,
              channel: 'MARKETPLACE_API',
              externalReferenceId: dispatchRes.externalReferenceId,
            }),
          },
        });

        return {
          selectedChannel: 'MARKETPLACE_API',
          channelEligibility: 'ELIGIBLE',
          sellerRegistrationStatus: 'IDENTIFIED_UNREGISTERED',
          integrationAvailability: 'AUTHORIZED_ADAPTER_ACTIVE',
          requestStatus: createdRequest.status as SellerEvidenceRequestStatus,
          failureReason: null,
          marketplaceSupportUrl: null,
          relatedSellerAccountId: matchResolution.sellerEntry?.id ?? null,
          relatedOrganizationId: null,
          requestId: createdRequest.id,
          requestNumber: createdRequest.requestNumber,
          executedAt: executedAt.toISOString(),
        };
      }
    }

    // -------------------------------------------------------------------------
    // PRIORITY 3: Customer-Assisted Marketplace Help Centre Fallback
    // -------------------------------------------------------------------------
    const helpCentre = MarketplaceCommunicationService.getHelpCentreConfig(marketplace);
    const preparedMessage = MarketplaceCommunicationService.buildCustomerAssistedMessage({
      caseNumber: input.caseNumber,
      marketplace,
      orderId: input.orderId,
      productName: input.productName,
      sellerName: matchResolution.sellerEntry?.legalName,
      complaintCategory: input.originalCategory || input.complaintCategory,
      requestedItems: reqPlan.items,
    });

    const createdRequest = await prisma.sellerEvidenceRequest.create({
      data: {
        requestNumber,
        caseId: input.caseId,
        sellerId: matchResolution.sellerEntry?.id ?? null,
        sellerMatchId: input.sellerMatchId,
        organizationId: null,
        marketplace,
        orderId: input.orderId,
        productName: input.productName,
        complaintCategory: input.originalCategory || input.complaintCategory,
        requestDescription: reqPlan.requestDescription,
        requestedItemsJson: JSON.stringify(reqPlan.items),
        deliveryChannel: 'CUSTOMER_ASSISTED_HELP_CENTRE',
        registrationStatus: 'IDENTIFIED_UNREGISTERED',
        status: 'CUSTOMER_ACTION_REQUIRED',
        marketplaceSupportUrl: helpCentre.helpCentreUrl || null,
        preparedMessageForBuyer: preparedMessage,
        createdById: input.actorId,
        dueAt,
        idempotencyKey: input.idempotencyKey || null,
      },
    });

    await prisma.sellerCommunicationAttempt.create({
      data: {
        requestId: createdRequest.id,
        attemptNumber: 1,
        channel: 'CUSTOMER_ASSISTED_HELP_CENTRE',
        actionType: 'INITIAL_DISPATCH',
        eligibility: 'ELIGIBLE',
        executionStatus: 'CUSTOMER_ACTION_REQUIRED',
        failureReason: authStatus.reason,
        idempotencyKey: input.idempotencyKey ? `${input.idempotencyKey}:attempt:1` : null,
        actorId: input.actorId,
        metadataJson: JSON.stringify({
          marketplace,
          helpCentreUrl: helpCentre.helpCentreUrl || null,
          sellerRegistrationStatus: 'IDENTIFIED_UNREGISTERED',
        }),
        executedAt,
      },
    });

    await prisma.caseEvent.createMany({
      data: [
        {
          caseId: input.caseId,
          actorId: input.actorId,
          eventType: EventType.SELLER_EVIDENCE_REQUESTED,
          description: `SELLER IDENTIFIED — NOT REGISTERED ON RESOLVEGRAPH (${matchResolution.sellerEntry?.legalName || 'Seller'}). Prepared customer-assisted ${helpCentre.displayName} Help Centre request ${requestNumber}.`,
          metadataJson: JSON.stringify({
            requestId: createdRequest.id,
            requestNumber,
            channel: 'CUSTOMER_ASSISTED_HELP_CENTRE',
            marketplaceSupportUrl: helpCentre.helpCentreUrl || null,
            apiUnavailableReason: authStatus.reason,
          }),
        },
      ],
    });

    await prisma.caseTimelineEvent.create({
      data: {
        caseId: input.caseId,
        actorId: input.actorId,
        eventType: 'CUSTOMER_ASSISTED_OUTREACH_PREPARED',
        title: `Seller not on RESOLVEGRAPH — ${helpCentre.displayName} Help Centre guided step ready`,
        description: `Identified seller "${matchResolution.sellerEntry?.legalName || 'Unknown'}" is not registered on RESOLVEGRAPH. Copy the prepared evidence request and submit via ${helpCentre.displayName} Help Centre.`,
        occurredAt: executedAt,
        timePrecision: 'EXACT_TIMESTAMP',
        timeBasis: 'SYSTEM_OBSERVED',
        metadataJson: JSON.stringify({
          requestId: createdRequest.id,
          channel: 'CUSTOMER_ASSISTED_HELP_CENTRE',
          status: 'CUSTOMER_ACTION_REQUIRED',
        }),
      },
    });

    await prisma.notificationMessage.create({
      data: {
        userId: input.buyerId,
        title: `Action Needed: Contact ${helpCentre.displayName} Support — ${input.caseNumber}`,
        body: `Seller "${matchResolution.sellerEntry?.legalName || 'identified seller'}" is not registered on RESOLVEGRAPH. Open your complaint to copy the prepared message and submit via the official ${helpCentre.displayName} Help Centre.`,
        linkUrl: `/cases?complaint=${encodeURIComponent(input.caseNumber)}`,
        type: 'WARNING',
      },
    });

    return {
      selectedChannel: 'CUSTOMER_ASSISTED_HELP_CENTRE',
      channelEligibility: 'ELIGIBLE',
      sellerRegistrationStatus: 'IDENTIFIED_UNREGISTERED',
      integrationAvailability: 'NO_AUTHORIZED_API_HELP_CENTRE_FALLBACK',
      requestStatus: 'CUSTOMER_ACTION_REQUIRED',
      failureReason: authStatus.reason,
      marketplaceSupportUrl: helpCentre.helpCentreUrl || null,
      relatedSellerAccountId: matchResolution.sellerEntry?.id ?? null,
      relatedOrganizationId: null,
      requestId: createdRequest.id,
      requestNumber: createdRequest.requestNumber,
      executedAt: executedAt.toISOString(),
    };
  }

  /**
   * Records that the customer reported contacting the marketplace Help Centre.
   * Never upgrades status to DELIVERED_TO_SELLER without actual authorized integration confirmation.
   */
  public static async recordCustomerReportedSubmission(params: {
    requestId: string;
    buyerId: string;
    note?: string;
    ticketReference?: string;
  }) {
    const request = await prisma.sellerEvidenceRequest.findUnique({
      where: { id: params.requestId },
      include: { case: true, communicationAttempts: true },
    });

    if (!request) {
      throw new Error(`Seller evidence request ${params.requestId} not found.`);
    }
    if (request.case.buyerId !== params.buyerId) {
      throw new Error('Forbidden: Only the complaint owner can report marketplace Help Centre submission.');
    }
    if (request.deliveryChannel !== 'CUSTOMER_ASSISTED_HELP_CENTRE') {
      throw new Error('Customer submission reporting applies only to customer-assisted Help Centre requests.');
    }

    const now = new Date();
    const updated = await prisma.sellerEvidenceRequest.update({
      where: { id: request.id },
      data: {
        status: 'MARKETPLACE_SUPPORT_PENDING',
        customerReportedSubmissionAt: now,
        customerSubmissionNote:
          [params.ticketReference ? `Ref: ${params.ticketReference}` : null, params.note?.trim() || null]
            .filter(Boolean)
            .join(' — ') || 'Customer reported contacting marketplace Help Centre.',
      },
    });

    await prisma.sellerCommunicationAttempt.create({
      data: {
        requestId: request.id,
        attemptNumber: request.communicationAttempts.length + 1,
        channel: 'CUSTOMER_ASSISTED_HELP_CENTRE',
        actionType: 'CUSTOMER_REPORTED_CONTACT',
        eligibility: 'ELIGIBLE',
        executionStatus: 'CUSTOMER_REPORTED_SUBMISSION',
        externalReferenceId: params.ticketReference?.trim() || null,
        actorId: params.buyerId,
        metadataJson: JSON.stringify({
          note: params.note?.trim() || null,
          notVerifiedDeliveryToSeller: true,
        }),
        executedAt: now,
      },
    });

    await prisma.caseEvent.create({
      data: {
        caseId: request.caseId,
        actorId: params.buyerId,
        eventType: EventType.MARKETPLACE_SUPPORT_ACTION_RECORDED,
        description: `Customer reported submitting request ${request.requestNumber} to ${request.marketplace} Help Centre (awaiting marketplace/seller reply).`,
        metadataJson: JSON.stringify({
          requestId: request.id,
          executionStatus: 'CUSTOMER_REPORTED_SUBMISSION',
          ticketReference: params.ticketReference?.trim() || null,
        }),
      },
    });

    return updated;
  }

  private static async notifyInvestigators(params: {
    caseNumber: string;
    title: string;
    body: string;
    type: string;
  }) {
    const admins = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [{ isPlatformAdmin: true }, { role: UserRole.RESOLUTION_MANAGER }, { role: UserRole.ADMIN }],
      },
      select: { id: true },
    });

    if (admins.length === 0) return;

    await prisma.notificationMessage.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        title: params.title,
        body: params.body,
        linkUrl: `/cases/${encodeURIComponent(params.caseNumber)}`,
        type: params.type,
      })),
    });
  }

  public static async getActiveEligibleMembersForOrg(organizationId: string) {
    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId,
        isActive: true,
        role: {
          in: [
            OrganizationRole.OWNER,
            OrganizationRole.ORG_ADMIN,
            OrganizationRole.MERCHANT_AGENT,
            OrganizationRole.RESOLUTION_MANAGER,
          ],
        },
        user: { isActive: true },
      },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }
}
