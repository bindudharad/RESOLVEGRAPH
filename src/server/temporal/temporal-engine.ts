/**
 * RESOLVEGRAPH — Step 5: Temporal Evidence Intelligence Engine
 * Distinguishes occurred vs recorded times, detects temporal anomalies, and enables counterfactual case replay.
 */

import { prisma } from "@/lib/prisma";

export interface TemporalAnomaly {
  anomalyType:
    | "OUT_OF_ORDER_STAGE"
    | "CONTRADICTORY_DATES"
    | "LATE_ARRIVING_EVIDENCE"
    | "SUPERSEDED_FACT"
    | "UNPRECEDENTED_COMPLAINT";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  involvedEventIds: string[];
  observedDates: {
    eventA: { id: string; type: string; date: string };
    eventB: { id: string; type: string; date: string };
  };
}

export interface ChronologicalTimelineEvent {
  id: string;
  caseId: string;
  eventType: string;
  title: string;
  description: string;
  occurredAt: string | null;
  recordedAt: string;
  sourceTimestamp: string | null;
  timePrecision: string;
  timeBasis: string;
  uncertaintyHours: number;
  isContradictory: boolean;
  metadata?: Record<string, unknown>;
}

export interface CounterfactualReplayState {
  caseId: string;
  asOfTimestamp: string;
  eventsCount: number;
  claimsPresent: Array<{ id: string; claimType: string; assertedAt: string }>;
  evidencePresent: Array<{ id: string; title: string; submittedAt: string }>;
  factsKnown: Array<{ id: string; fieldKey: string; normalizedValue: string | null }>;
  findingsFormed: Array<{ id: string; title: string; findingType: string }>;
}

export class TemporalEngine {
  /**
   * Reconstructs chronological sequence and flags temporal anomalies.
   */
  public static async analyzeCaseTimeline(caseIdOrNumber: string): Promise<{
    timeline: ChronologicalTimelineEvent[];
    anomalies: TemporalAnomaly[];
  }> {
    const caseRecord = await prisma.caseRecord.findFirst({
      where: {
        OR: [{ id: caseIdOrNumber }, { caseNumber: caseIdOrNumber }],
      },
    });

    if (!caseRecord) {
      throw new Error(`Dispute case not found: ${caseIdOrNumber}`);
    }

    const events = await prisma.caseTimelineEvent.findMany({
      where: { caseId: caseRecord.id },
      orderBy: [{ occurredAt: "asc" }, { recordedAt: "asc" }],
    });

    const anomalies: TemporalAnomaly[] = [];

    // Helper map of stage expected order
    const stageRank: Record<string, number> = {
      PURCHASE: 1,
      PAYMENT: 2,
      DISPATCH: 3,
      DELIVERY_ATTEMPT: 4,
      DELIVERY_COMPLETED: 5,
      COMPLAINT_FILED: 6,
      EVIDENCE_SUBMITTED: 7,
      INSPECTION_REPORT: 8,
      RETURN_INITIATED: 9,
    };

    // 1. Detect chronological order violations & contradictory dates
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const evA = events[i];
        const evB = events[j];

        const dateA = evA.occurredAt || evA.recordedAt;
        const dateB = evB.occurredAt || evB.recordedAt;

        const rankA = stageRank[evA.eventType];
        const rankB = stageRank[evB.eventType];

        // E.g. delivery occurred BEFORE dispatch
        if (rankA && rankB && rankA > rankB && dateA < dateB) {
          anomalies.push({
            anomalyType: "CONTRADICTORY_DATES",
            severity: "CRITICAL",
            description: `${evA.eventType} (${dateA.toISOString()}) is recorded before earlier stage ${evB.eventType} (${dateB.toISOString()}).`,
            involvedEventIds: [evA.id, evB.id],
            observedDates: {
              eventA: { id: evA.id, type: evA.eventType, date: dateA.toISOString() },
              eventB: { id: evB.id, type: evB.eventType, date: dateB.toISOString() },
            },
          });
        }

        // Late arriving evidence check: e.g. carrier POD uploaded > 14 days after complaint
        if (
          evA.eventType === "COMPLAINT_FILED" &&
          (evB.eventType === "DELIVERY_COMPLETED" || evB.eventType === "EVIDENCE_SUBMITTED")
        ) {
          const diffDays =
            (evB.recordedAt.getTime() - (evA.occurredAt || evA.recordedAt).getTime()) /
            (1000 * 3600 * 24);
          if (diffDays > 14) {
            anomalies.push({
              anomalyType: "LATE_ARRIVING_EVIDENCE",
              severity: "MEDIUM",
              description: `Evidence recorded ${Math.round(diffDays)} days after initial complaint was filed.`,
              involvedEventIds: [evA.id, evB.id],
              observedDates: {
                eventA: { id: evA.id, type: evA.eventType, date: dateA.toISOString() },
                eventB: { id: evB.id, type: evB.eventType, date: dateB.toISOString() },
              },
            });
          }
        }
      }
    }

    const contradictoryIds = new Set(anomalies.flatMap((a) => a.involvedEventIds));

    const timeline: ChronologicalTimelineEvent[] = events.map((ev) => {
      let uncertaintyHours = 0;
      if (ev.timePrecision === "DATE_ONLY") uncertaintyHours = 24;
      else if (ev.timePrecision === "MONTH_YEAR") uncertaintyHours = 720;
      else if (ev.timePrecision === "APPROXIMATE") uncertaintyHours = 48;

      let meta: Record<string, unknown> = {};
      if (ev.metadataJson) {
        try {
          meta = JSON.parse(ev.metadataJson);
        } catch {
          // ignore
        }
      }

      return {
        id: ev.id,
        caseId: ev.caseId,
        eventType: ev.eventType,
        title: ev.title,
        description: ev.description,
        occurredAt: ev.occurredAt ? ev.occurredAt.toISOString() : null,
        recordedAt: ev.recordedAt.toISOString(),
        sourceTimestamp: ev.sourceTimestamp,
        timePrecision: ev.timePrecision,
        timeBasis: ev.timeBasis,
        uncertaintyHours,
        isContradictory: contradictoryIds.has(ev.id),
        metadata: meta,
      };
    });

    return { timeline, anomalies };
  }

  /**
   * Counterfactual Case Replay: Reconstructs what evidence, facts, and claims existed at timestamp T.
   */
  public static async replayCaseState(
    caseIdOrNumber: string,
    asOf: Date | string
  ): Promise<CounterfactualReplayState> {
    const asOfDate = typeof asOf === "string" ? new Date(asOf) : asOf;

    const caseRecord = await prisma.caseRecord.findFirst({
      where: {
        OR: [{ id: caseIdOrNumber }, { caseNumber: caseIdOrNumber }],
      },
    });

    if (!caseRecord) {
      throw new Error(`Dispute case not found: ${caseIdOrNumber}`);
    }

    const [events, claims, evidence, facts, findings] = await Promise.all([
      prisma.caseTimelineEvent.findMany({
        where: {
          caseId: caseRecord.id,
          recordedAt: { lte: asOfDate },
        },
      }),
      prisma.claim.findMany({
        where: {
          caseId: caseRecord.id,
          createdAt: { lte: asOfDate },
        },
      }),
      prisma.evidence.findMany({
        where: {
          caseId: caseRecord.id,
          createdAt: { lte: asOfDate },
        },
      }),
      prisma.extractedFact.findMany({
        where: {
          caseId: caseRecord.id,
          createdAt: { lte: asOfDate },
        },
      }),
      prisma.berrFinding.findMany({
        where: {
          caseId: caseRecord.id,
          createdAt: { lte: asOfDate },
        },
      }),
    ]);

    return {
      caseId: caseRecord.id,
      asOfTimestamp: asOfDate.toISOString(),
      eventsCount: events.length,
      claimsPresent: claims.map((c) => ({
        id: c.id,
        claimType: c.claimType,
        assertedAt: c.createdAt.toISOString(),
      })),
      evidencePresent: evidence.map((e) => ({
        id: e.id,
        title: e.filename,
        submittedAt: e.createdAt.toISOString(),
      })),
      factsKnown: facts.map((f) => ({
        id: f.id,
        fieldKey: f.fieldKey,
        normalizedValue: f.normalizedValue,
      })),
      findingsFormed: findings.map((fn) => ({
        id: fn.id,
        title: fn.title,
        findingType: fn.findingType,
      })),
    };
  }
}
