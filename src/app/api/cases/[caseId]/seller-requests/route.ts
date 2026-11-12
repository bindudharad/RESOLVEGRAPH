/**
 * RESOLVEGRAPH — Case Seller Evidence Request Creation API
 *
 * POST /api/cases/[caseId]/seller-requests
 * Allows platform investigators to customize, review, and dispatch a DEMO evidence request
 * directly to a verified seller organization's in-app portal workspace.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { EventType, UserRole } from '@/generated/prisma/client';
import { SellerCommunicationGatewayService } from '@/server/seller/seller-communication-gateway.service';
import { BegSyncService } from '@/server/graph/beg-sync.service';

function isInvestigator(user: { isPlatformAdmin: boolean; role: string }) {
  return (
    user.isPlatformAdmin ||
    user.role === UserRole.ADMIN ||
    user.role === UserRole.RESOLUTION_MANAGER
  );
}

export interface RequestedItemInput {
  key: string;
  label: string;
  description?: string;
  required?: boolean;
  suggestedEvidenceTypes?: string[];
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!isInvestigator(user)) {
      return NextResponse.json(
        { error: 'Only investigators or administrators can dispatch seller evidence requests.' },
        { status: 403 }
      );
    }

    const { caseId } = await context.params;
    const caseRecord = await prisma.caseRecord.findFirst({
      where: { OR: [{ id: caseId }, { caseNumber: caseId }] },
      include: {
        buyer: { select: { id: true, fullName: true, email: true } },
        organization: { select: { id: true, name: true, slug: true } },
        sellerIdentityMatches: {
          where: { matchedSellerId: { not: null } },
          include: {
            matchedSeller: {
              include: {
                linkedOrganization: { select: { id: true, name: true, slug: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: `Case ${caseId} not found.` }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    // Determine target organization
    let targetOrgId = body.organizationId as string | undefined;
    let targetSellerId = body.sellerId as string | undefined;

    if (!targetOrgId) {
      if (caseRecord.organizationId) {
        targetOrgId = caseRecord.organizationId;
      } else if (caseRecord.sellerIdentityMatches[0]?.matchedSeller?.linkedOrganizationId) {
        targetOrgId = caseRecord.sellerIdentityMatches[0].matchedSeller.linkedOrganizationId;
        targetSellerId = caseRecord.sellerIdentityMatches[0].matchedSeller.id;
      } else {
        // Fallback to TechStore as standard demo org
        const defaultOrg = await prisma.organization.findUnique({
          where: { id: 'org_techstore' },
        });
        if (defaultOrg) {
          targetOrgId = defaultOrg.id;
        }
      }
    }

    if (!targetOrgId) {
      return NextResponse.json(
        { error: 'No verified seller organization identified for this complaint.' },
        { status: 400 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { id: targetOrgId },
      include: {
        sellerDirectoryEntries: { take: 1 },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: `Organization ${targetOrgId} not found.` },
        { status: 404 }
      );
    }

    if (!targetSellerId && organization.sellerDirectoryEntries.length > 0) {
      targetSellerId = organization.sellerDirectoryEntries[0].id;
    }

    // Check eligible members in the organization
    const eligibleMemberUserIds =
      await SellerCommunicationGatewayService.getActiveEligibleMembersForOrg(targetOrgId);

    if (eligibleMemberUserIds.length === 0) {
      return NextResponse.json(
        {
          error: `Seller organization "${organization.name}" has no active members with responder roles.`,
        },
        { status: 400 }
      );
    }

    // Extract hints and payload fields
    const subject = String(
      body.subject || 'Request for Fulfillment & Technical Specifications Evidence'
    ).trim();
    const description = String(
      body.description ||
        'Customer reports receiving 512 GB portable SSD instead of the purchased 1 TB model. Please provide itemized packing and serial verification.'
    ).trim();

    const rawItems: RequestedItemInput[] = Array.isArray(body.requestedItems) && body.requestedItems.length > 0
      ? body.requestedItems
      : [
          {
            key: 'EXACT_PRODUCT_SKU',
            label: 'Exact product SKU',
            description: 'Itemized manufacturer SKU identifying the specific product model packaged.',
            required: true,
            suggestedEvidenceTypes: ['INVOICE', 'OTHER'],
          },
          {
            key: 'MANUFACTURER_MODEL_NUMBER',
            label: 'Manufacturer model number',
            description: 'Hardware model and capacity identifier stamped on product housing and packaging.',
            required: true,
            suggestedEvidenceTypes: ['PHOTO'],
          },
          {
            key: 'ORIGINAL_PRODUCT_SPECIFICATIONS',
            label: 'Original product specifications',
            description: 'Manufacturer specification sheet or catalog specifications confirming storage capacity.',
            required: true,
            suggestedEvidenceTypes: ['INVOICE', 'OTHER'],
          },
          {
            key: 'PACKING_DECLARATION',
            label: 'Packing declaration',
            description: 'Fulfillment station or warehouse packing declaration confirming order contents and measured weight.',
            required: true,
            suggestedEvidenceTypes: ['TRACKING_INFO', 'OTHER'],
          },
          {
            key: 'PRODUCT_PHOTOGRAPHS',
            label: 'Available product photographs',
            description: 'High-resolution photographs of packaged unit, retail packaging, and tamper-evident seals.',
            required: false,
            suggestedEvidenceTypes: ['PHOTO'],
          },
          {
            key: 'WAREHOUSE_QC_SERIAL_LOG',
            label: 'Warehouse quality-control or serial-number records',
            description: 'Warehouse barcode scan log and serial registry recorded during fulfillment.',
            required: false,
            suggestedEvidenceTypes: ['OTHER', 'TRACKING_INFO'],
          },
        ];

    const formattedItems = rawItems.map((item) => ({
      key: item.key,
      label: item.label,
      description: item.description || '',
      required: item.required ?? true,
      status: 'PENDING',
      suggestedEvidenceTypes: item.suggestedEvidenceTypes || ['OTHER'],
    }));

    const deadlineHours = typeof body.deadlineHours === 'number' && body.deadlineHours > 0
      ? body.deadlineHours
      : 72; // default 3 days
    const executedAt = new Date();
    const dueAt = new Date(executedAt.getTime() + deadlineHours * 3600 * 1000);

    const requestNumber = await SellerCommunicationGatewayService.generateNextRequestNumber();

    const orderId = String(body.orderId || caseRecord.caseNumber).trim();
    const productName = String(
      body.productName || caseRecord.title || 'UltraFast Portable SSD 1TB USB 3.2'
    ).trim();
    const marketplace = String(body.marketplace || 'Amazon India').trim();

    // Link case to organization if not already linked
    if (!caseRecord.organizationId) {
      await prisma.caseRecord.update({
        where: { id: caseRecord.id },
        data: {
          organizationId: targetOrgId,
          ...(eligibleMemberUserIds[0] ? { merchantId: eligibleMemberUserIds[0] } : {}),
        },
      });
    }

    // Persist SellerEvidenceRequest
    const createdRequest = await prisma.sellerEvidenceRequest.create({
      data: {
        requestNumber,
        caseId: caseRecord.id,
        sellerId: targetSellerId || null,
        sellerMatchId: caseRecord.sellerIdentityMatches[0]?.id || null,
        organizationId: targetOrgId,
        marketplace,
        orderId,
        productName,
        complaintCategory: caseRecord.category,
        requestDescription: `${subject}\n\n${description}`,
        requestedItemsJson: JSON.stringify(formattedItems),
        deliveryChannel: 'SELLER_PORTAL',
        registrationStatus: 'REGISTERED_VERIFIED',
        status: 'DELIVERED', // Delivered to Seller Portal in-app inbox
        createdById: user.id,
        dispatchedAt: executedAt,
        deliveredAt: executedAt,
        dueAt,
        idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : null,
      },
    });

    // Communication attempt record
    await prisma.sellerCommunicationAttempt.create({
      data: {
        requestId: createdRequest.id,
        attemptNumber: 1,
        channel: 'SELLER_PORTAL',
        actionType: 'INITIAL_DISPATCH',
        eligibility: 'ELIGIBLE',
        executionStatus: 'DELIVERED',
        actorId: user.id,
        metadataJson: JSON.stringify({
          isDemo: true,
          subject,
          deadlineHours,
          itemCount: formattedItems.length,
          deliveredToOrgName: organization.name,
        }),
        executedAt,
      },
    });

    // Case events
    await prisma.caseEvent.createMany({
      data: [
        {
          caseId: caseRecord.id,
          actorId: user.id,
          eventType: EventType.SELLER_EVIDENCE_REQUESTED,
          description: `[DEMO / TEST] Evidence request ${requestNumber} created by investigator for ${organization.name}.`,
          metadataJson: JSON.stringify({
            requestId: createdRequest.id,
            requestNumber,
            isDemo: true,
            subject,
            organizationId: targetOrgId,
            dueAt: dueAt.toISOString(),
          }),
        },
        {
          caseId: caseRecord.id,
          actorId: user.id,
          eventType: EventType.SELLER_EVIDENCE_DISPATCHED,
          description: `[DEMO / TEST] Evidence request ${requestNumber} delivered to RESOLVEGRAPH Seller Portal (${organization.name}).`,
          metadataJson: JSON.stringify({
            requestId: createdRequest.id,
            requestNumber,
            channel: 'SELLER_PORTAL',
            deliveryState: 'DELIVERED',
            isDemo: true,
          }),
        },
      ],
    });

    // Case timeline event
    await prisma.caseTimelineEvent.create({
      data: {
        caseId: caseRecord.id,
        actorId: user.id,
        eventType: 'SELLER_EVIDENCE_REQUESTED',
        title: 'Evidence request sent to Seller Portal (DEMO)',
        description: `Investigator sent itemized evidence request (${requestNumber}) to ${organization.name}. Response deadline: ${dueAt.toLocaleDateString()}.`,
        occurredAt: executedAt,
        timePrecision: 'EXACT_TIMESTAMP',
        timeBasis: 'SYSTEM_OBSERVED',
        metadataJson: JSON.stringify({
          requestId: createdRequest.id,
          channel: 'SELLER_PORTAL',
          isDemo: true,
        }),
      },
    });

    // In-app notifications for seller organization members
    await prisma.notificationMessage.createMany({
      data: eligibleMemberUserIds.map((memberUserId) => ({
        userId: memberUserId,
        title: `[DEMO / TEST] New Evidence Request ${requestNumber} — ${caseRecord.caseNumber}`,
        body: `Action requested for ${marketplace} order ${orderId} (${productName}): ${subject}. Response due by ${dueAt.toLocaleDateString()}.`,
        linkUrl: `/seller/requests/${createdRequest.id}`,
        type: 'WARNING',
      })),
    });

    // Buyer notification
    if (caseRecord.buyerId) {
      await prisma.notificationMessage.create({
        data: {
          userId: caseRecord.buyerId,
          title: `Evidence Request Sent to Seller — ${caseRecord.caseNumber}`,
          body: `Our investigation team requested supporting fulfillment and specification records from the seller for order ${orderId}.`,
          linkUrl: `/cases?complaint=${encodeURIComponent(caseRecord.caseNumber)}`,
          type: 'INFO',
        },
      });
    }

    // Sync persisted BEG Graph cleanly so Seller Request nodes connect immediately
    await BegSyncService.handleDomainEvent({
      caseId: caseRecord.id,
      triggerEvent: 'SELLER_REQUEST_CREATED',
      actorId: user.id,
      rerunBerr: false,
    }).catch((err) => console.warn('[seller-requests] BEG sync skipped:', err));

    return NextResponse.json({
      success: true,
      request: {
        id: createdRequest.id,
        requestNumber: createdRequest.requestNumber,
        status: createdRequest.status,
        deliveryChannel: createdRequest.deliveryChannel,
        dueAt: createdRequest.dueAt?.toISOString(),
        organizationName: organization.name,
      },
      message: "Demo evidence request successfully delivered to the seller's RESOLVEGRAPH workspace.",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('POST /api/cases/[caseId]/seller-requests error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create seller evidence request' },
      { status: 500 }
    );
  }
}
