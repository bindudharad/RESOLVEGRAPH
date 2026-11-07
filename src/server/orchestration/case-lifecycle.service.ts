import { prisma } from "@/lib/prisma";
import {
  CaseStatus,
  CaseStage,
  EventType,
  RemedyType,
} from "@/generated/prisma/client";
import { EventOrchestrationService } from "./event-orchestration.service";

export const ALLOWED_STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  [CaseStatus.DRAFT]: [CaseStatus.SUBMITTED, CaseStatus.CLOSED, CaseStatus.ARCHIVED],
  [CaseStatus.SUBMITTED]: [
    CaseStatus.IN_REVIEW,
    CaseStatus.EVIDENCE_REQUESTED,
    CaseStatus.UNDER_ANALYSIS,
    CaseStatus.RESOLVED,
    CaseStatus.CLOSED,
    CaseStatus.ARCHIVED,
  ],
  [CaseStatus.IN_REVIEW]: [
    CaseStatus.EVIDENCE_REQUESTED,
    CaseStatus.EVIDENCE_SUBMITTED,
    CaseStatus.UNDER_ANALYSIS,
    CaseStatus.RESOLVED,
    CaseStatus.CLOSED,
    CaseStatus.ARCHIVED,
  ],
  [CaseStatus.EVIDENCE_REQUESTED]: [
    CaseStatus.EVIDENCE_SUBMITTED,
    CaseStatus.IN_REVIEW,
    CaseStatus.UNDER_ANALYSIS,
    CaseStatus.CLOSED,
    CaseStatus.ARCHIVED,
  ],
  [CaseStatus.EVIDENCE_SUBMITTED]: [
    CaseStatus.UNDER_ANALYSIS,
    CaseStatus.IN_REVIEW,
    CaseStatus.RESOLVED,
    CaseStatus.CLOSED,
    CaseStatus.ARCHIVED,
  ],
  [CaseStatus.UNDER_ANALYSIS]: [
    CaseStatus.IN_REVIEW,
    CaseStatus.RESOLVED,
    CaseStatus.CLOSED,
    CaseStatus.ARCHIVED,
  ],
  [CaseStatus.RESOLVED]: [CaseStatus.CLOSED, CaseStatus.ARCHIVED],
  [CaseStatus.CLOSED]: [CaseStatus.ARCHIVED],
  [CaseStatus.ARCHIVED]: [],
};

export class CaseLifecycleService {
  /**
   * Checks whether a status transition is permitted by the state machine.
   */
  public static canTransition(currentStatus: CaseStatus, nextStatus: CaseStatus): boolean {
    if (currentStatus === nextStatus) return true;
    const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
    return allowed.includes(nextStatus);
  }

  /**
   * Transitions a case to a new status with validation and event recording.
   */
  public static async transitionStatus(input: {
    caseId: string;
    nextStatus: CaseStatus;
    actorId?: string;
    note?: string;
    metadata?: Record<string, unknown>;
  }) {
    const existing = await prisma.caseRecord.findUnique({
      where: { id: input.caseId },
    });

    if (!existing) {
      throw new Error(`Case ${input.caseId} not found`);
    }

    if (!this.canTransition(existing.status, input.nextStatus)) {
      throw new Error(
        `Invalid status transition: Cannot transition from ${existing.status} to ${input.nextStatus}`
      );
    }

    const updated = await prisma.caseRecord.update({
      where: { id: input.caseId },
      data: {
        status: input.nextStatus,
        updatedAt: new Date(),
      },
    });

    await EventOrchestrationService.recordCaseEvent({
      caseId: input.caseId,
      eventType: EventType.STATUS_CHANGED,
      actorId: input.actorId,
      description: input.note || `Status updated from ${existing.status} to ${input.nextStatus}`,
      metadata: {
        fromStatus: existing.status,
        toStatus: input.nextStatus,
        ...input.metadata,
      },
    });

    await EventOrchestrationService.recordTimelineEvent({
      caseId: input.caseId,
      eventType: "STATUS_CHANGED",
      title: `Status Transition: ${input.nextStatus}`,
      description: input.note || `Case status shifted to ${input.nextStatus}`,
      occurredAt: new Date(),
      timeBasis: "SYSTEM_OBSERVED",
      sourceParty: "SYSTEM",
      actorId: input.actorId,
      metadata: { fromStatus: existing.status, toStatus: input.nextStatus },
    });

    await EventOrchestrationService.recordSecurityAudit({
      actorId: input.actorId || null,
      action: "CASE_STATUS_TRANSITION",
      targetType: "CASE",
      targetId: input.caseId,
      status: "SUCCESS",
      metadata: { fromStatus: existing.status, toStatus: input.nextStatus },
    });

    return updated;
  }

  /**
   * Transitions a case stage.
   */
  public static async transitionStage(input: {
    caseId: string;
    nextStage: CaseStage;
    actorId?: string;
    note?: string;
  }) {
    const existing = await prisma.caseRecord.findUnique({
      where: { id: input.caseId },
    });

    if (!existing) {
      throw new Error(`Case ${input.caseId} not found`);
    }

    const updated = await prisma.caseRecord.update({
      where: { id: input.caseId },
      data: {
        stage: input.nextStage,
        updatedAt: new Date(),
      },
    });

    await EventOrchestrationService.recordTimelineEvent({
      caseId: input.caseId,
      eventType: "STAGE_CHANGED",
      title: `Stage Advanced: ${input.nextStage}`,
      description: input.note || `Case investigation stage advanced to ${input.nextStage}`,
      occurredAt: new Date(),
      timeBasis: "SYSTEM_OBSERVED",
      sourceParty: "SYSTEM",
      actorId: input.actorId,
    });

    return updated;
  }

  /**
   * Marks a case as RESOLVED with formal remedy and summary.
   */
  public static async resolveCase(input: {
    caseId: string;
    actorId: string;
    remedy: RemedyType;
    summary: string;
  }) {
    const updated = await prisma.caseRecord.update({
      where: { id: input.caseId },
      data: {
        status: CaseStatus.RESOLVED,
        stage: CaseStage.FINALIZED,
        recommendedRemedy: input.remedy,
        resolutionSummary: input.summary,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await EventOrchestrationService.recordCaseEvent({
      caseId: input.caseId,
      eventType: EventType.CASE_RESOLVED,
      actorId: input.actorId,
      description: `Case resolved with remedy ${input.remedy}: ${input.summary}`,
      metadata: { remedy: input.remedy, summary: input.summary },
    });

    await EventOrchestrationService.recordTimelineEvent({
      caseId: input.caseId,
      eventType: "CASE_RESOLVED",
      title: "Case Formally Resolved",
      description: `Agreed resolution: ${input.remedy}. Summary: ${input.summary}`,
      occurredAt: new Date(),
      timeBasis: "SYSTEM_OBSERVED",
      sourceParty: "SYSTEM",
      actorId: input.actorId,
    });

    return updated;
  }

  /**
   * Closes a case.
   */
  public static async closeCase(input: {
    caseId: string;
    actorId: string;
    reason: string;
    summary?: string;
  }) {
    const updated = await prisma.caseRecord.update({
      where: { id: input.caseId },
      data: {
        status: CaseStatus.CLOSED,
        closedAt: new Date(),
        resolutionSummary: input.summary || input.reason,
        updatedAt: new Date(),
      },
    });

    await EventOrchestrationService.recordCaseEvent({
      caseId: input.caseId,
      eventType: EventType.CASE_CLOSED,
      actorId: input.actorId,
      description: `Case closed: ${input.reason}`,
      metadata: { reason: input.reason },
    });

    return updated;
  }
}
