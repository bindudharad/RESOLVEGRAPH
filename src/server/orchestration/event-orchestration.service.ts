import { prisma } from "@/lib/prisma";
import { EventType } from "@/generated/prisma/client";
import { SecurityAuditService } from "../services/security-audit.service";

export interface RecordCaseEventInput {
  caseId: string;
  eventType: EventType;
  actorId?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface RecordTimelineEventInput {
  caseId: string;
  eventType: string;
  title: string;
  description: string;
  occurredAt?: Date;
  recordedAt?: Date;
  timeBasis?: string;
  sourceParty?: string;
  evidenceId?: string;
  claimId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export interface UnifiedAuditItem {
  id: string;
  type: "CASE_EVENT" | "TIMELINE_EVENT" | "SECURITY_AUDIT" | "PAYPAL_WEBHOOK";
  title: string;
  description: string;
  timestamp: string;
  actor: {
    id?: string | null;
    name?: string | null;
    role?: string | null;
  };
  metadata?: Record<string, unknown> | null;
}

export class EventOrchestrationService {
  /**
   * Records a core lifecycle CaseEvent to the database.
   */
  public static async recordCaseEvent(input: RecordCaseEventInput) {
    return prisma.caseEvent.create({
      data: {
        caseId: input.caseId,
        eventType: input.eventType,
        actorId: input.actorId || null,
        description: input.description,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      },
      include: {
        actor: {
          select: { id: true, fullName: true, role: true, email: true },
        },
      },
    });
  }

  /**
   * Records a high-fidelity CaseTimelineEvent with explicit temporal classification.
   */
  public static async recordTimelineEvent(input: RecordTimelineEventInput) {
    const combinedMeta = {
      sourceParty: input.sourceParty || "SYSTEM",
      ...input.metadata,
    };

    return prisma.caseTimelineEvent.create({
      data: {
        caseId: input.caseId,
        eventType: input.eventType,
        title: input.title,
        description: input.description,
        occurredAt: input.occurredAt || new Date(),
        recordedAt: input.recordedAt || new Date(),
        timeBasis: input.timeBasis || "SYSTEM_OBSERVED",
        timePrecision: "EXACT_TIMESTAMP",
        evidenceId: input.evidenceId || null,
        claimId: input.claimId || null,
        actorId: input.actorId || null,
        metadataJson: JSON.stringify(combinedMeta),
      },
    });
  }

  /**
   * Records a security-relevant event via SecurityAuditService.
   */
  public static async recordSecurityAudit(params: {
    actorId?: string | null;
    action: string;
    targetType: string;
    targetId?: string | null;
    status?: "SUCCESS" | "DENIED" | "FAILURE";
    metadata?: Record<string, unknown>;
  }) {
    return SecurityAuditService.record(params);
  }

  /**
   * Queries and aggregates all disparate audit streams for a case into a single chronological timeline:
   * 1. CaseEvents (status transitions, assignments, remedies)
   * 2. CaseTimelineEvents (real-world vs recorded-at milestones)
   * 3. SecurityAuditEvents (access checks, mutations, security scans)
   * 4. PayPalWebhookEvents (order captures, dispute updates, payment notifications)
   */
  public static async getUnifiedCaseAuditHistory(caseId: string): Promise<UnifiedAuditItem[]> {
    const caseRecord = await prisma.caseRecord.findUnique({
      where: { id: caseId },
      include: {
        orders: {
          include: {
            payments: {
              include: {
                disputes: true,
              },
            },
          },
        },
      },
    });

    if (!caseRecord) {
      return [];
    }

    // 1. Case Events
    const caseEvents = await prisma.caseEvent.findMany({
      where: { caseId },
      include: {
        actor: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // 2. Timeline Events
    const timelineEvents = await prisma.caseTimelineEvent.findMany({
      where: { caseId },
      include: {
        actor: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { occurredAt: "asc" },
    });

    // 3. Security Audits
    const securityAudits = await prisma.securityAuditEvent.findMany({
      where: {
        OR: [
          { targetType: "CASE", targetId: caseId },
          {
            targetType: "EVIDENCE",
            targetId: {
              in: (
                await prisma.evidence.findMany({
                  where: { caseId },
                  select: { id: true },
                })
              ).map((e) => e.id),
            },
          },
        ],
      },
      include: {
        actor: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // 4. PayPal Webhooks matching order capture IDs or dispute IDs
    const captureIds: string[] = [];
    const disputeIds: string[] = [];
    for (const order of caseRecord.orders) {
      for (const payment of order.payments) {
        if (payment.captureId) captureIds.push(payment.captureId);
        if (payment.providerOrderId) captureIds.push(payment.providerOrderId);
        for (const disp of payment.disputes) {
          if (disp.paypalDisputeId) disputeIds.push(disp.paypalDisputeId);
        }
      }
    }

    const webhookEvents =
      captureIds.length > 0 || disputeIds.length > 0
        ? await prisma.payPalWebhookEvent.findMany({
            where: {
              resourceId: {
                in: [...captureIds, ...disputeIds],
              },
            },
            orderBy: { receivedAt: "asc" },
          })
        : [];

    const items: UnifiedAuditItem[] = [];

    // Map CaseEvents
    for (const ce of caseEvents) {
      let meta: Record<string, unknown> | null = null;
      if (ce.metadataJson) {
        try {
          meta = JSON.parse(ce.metadataJson);
        } catch {
          // ignore parsing error
        }
      }
      items.push({
        id: ce.id,
        type: "CASE_EVENT",
        title: `Case Event: ${ce.eventType.replace(/_/g, " ")}`,
        description: ce.description || `Case event ${ce.eventType} recorded.`,
        timestamp: ce.createdAt.toISOString(),
        actor: {
          id: ce.actor?.id,
          name: ce.actor?.fullName || "System Automated",
          role: ce.actor?.role || "SYSTEM",
        },
        metadata: meta,
      });
    }

    // Map TimelineEvents
    for (const te of timelineEvents) {
      let meta: Record<string, unknown> = {};
      if (te.metadataJson) {
        try {
          meta = JSON.parse(te.metadataJson);
        } catch {
          // ignore parsing error
        }
      }
      const sourceParty = (meta.sourceParty as string) || "SYSTEM";
      items.push({
        id: te.id,
        type: "TIMELINE_EVENT",
        title: te.title,
        description: te.description,
        timestamp: (te.occurredAt || te.recordedAt).toISOString(),
        actor: {
          id: te.actor?.id,
          name: te.actor?.fullName || sourceParty,
          role: sourceParty,
        },
        metadata: {
          timeBasis: te.timeBasis,
          sourceParty,
          ...meta,
        },
      });
    }

    // Map SecurityAudits
    for (const sa of securityAudits) {
      let meta: Record<string, unknown> | null = null;
      if (sa.metadataJson) {
        try {
          meta = JSON.parse(sa.metadataJson);
        } catch {
          // ignore parsing error
        }
      }
      items.push({
        id: sa.id,
        type: "SECURITY_AUDIT",
        title: `Security Audit: ${sa.action}`,
        description: `Action on ${sa.targetType} [${sa.targetId || "N/A"}] resulted in ${sa.status}.`,
        timestamp: sa.createdAt.toISOString(),
        actor: {
          id: sa.actor?.id,
          name: sa.actor?.fullName || "System Security",
          role: sa.actor?.role || "SECURITY_AGENT",
        },
        metadata: meta,
      });
    }

    // Map PayPal Webhooks
    for (const wh of webhookEvents) {
      items.push({
        id: wh.id,
        type: "PAYPAL_WEBHOOK",
        title: `PayPal Webhook: ${wh.eventType}`,
        description: `Resource: ${wh.resourceType} (${wh.resourceId}) - Processing: ${wh.processingStatus}`,
        timestamp: wh.receivedAt.toISOString(),
        actor: {
          id: "paypal-webhook",
          name: "PayPal Gateway",
          role: "PAYMENT_PROCESSOR",
        },
        metadata: {
          paypalEventId: wh.paypalEventId,
          processingStatus: wh.processingStatus,
          signatureVerified: Boolean(wh.signatureVerifiedAt),
        },
      });
    }

    // Sort chronologically ascending
    items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return items;
  }
}
