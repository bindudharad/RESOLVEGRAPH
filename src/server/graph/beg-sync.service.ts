/**
 * RESOLVEGRAPH — Event-Driven BEG Incremental Synchronization Coordinator
 *
 * Hooks complaint intake, buyer evidence uploads/verification, seller identification,
 * seller responses, and investigation findings into persisted BEG construction and
 * BERR re-evaluation without breaking transaction flow.
 */

import { prisma } from "@/lib/prisma";
import { BegPersistenceService } from "./beg-persistence.service";
import { BerrV2Service } from "@/server/ai/reasoning/berr-v2.service";

export type BegTriggerEvent =
  | "COMPLAINT_CREATED"
  | "BUYER_EVIDENCE_UPLOADED"
  | "BUYER_EVIDENCE_VERIFIED"
  | "SELLER_IDENTIFIED"
  | "SELLER_REQUEST_DISPATCHED"
  | "SELLER_RESPONSE_SUBMITTED"
  | "INVESTIGATION_UPDATED"
  | "MANUAL_REBUILD";

export class BegSyncService {
  /**
   * Synchronizes the persisted BEG graph after a domain event and optionally
   * re-evaluates BERR while marking/preserving historical BERR assessments.
   */
  public static async handleDomainEvent(params: {
    caseId: string;
    triggerEvent: BegTriggerEvent | string;
    actorId?: string | null;
    rerunBerr?: boolean;
  }): Promise<{
    begGraphId: string;
    version: number;
    changed: boolean;
    berrAssessmentId?: string;
  }> {
    const syncRes = await BegPersistenceService.syncCaseGraph(
      params.caseId,
      params.triggerEvent,
      params.actorId,
      { markBerrStale: true }
    );

    if (syncRes.changed) {
      await prisma.caseEvent
        .create({
          data: {
            caseId: syncRes.graph.caseId,
            actorId: params.actorId || undefined,
            eventType: "BEG_GRAPH_UPDATED",
            description: `Bilateral Evidence Graph updated to v${syncRes.version} (${params.triggerEvent}): ${syncRes.graph.nodes.length} nodes, ${syncRes.graph.edges.length} edges.`,
            metadataJson: JSON.stringify({
              begGraphId: syncRes.begGraphId,
              version: syncRes.version,
              revisionId: syncRes.revisionId,
              triggerEvent: params.triggerEvent,
              nodeCount: syncRes.graph.nodes.length,
              edgeCount: syncRes.graph.edges.length,
            }),
          },
        })
        .catch((err) => {
          console.warn("[BegSyncService] Failed to log BEG_GRAPH_UPDATED event:", err);
        });
    }

    let berrAssessmentId: string | undefined;
    if (params.rerunBerr) {
      try {
        const berr = await BerrV2Service.evaluateCase(syncRes.graph.caseId, {
          triggerReason: params.triggerEvent,
          createdById: params.actorId || undefined,
        });
        berrAssessmentId = berr.assessmentId;
      } catch (err) {
        console.warn("[BegSyncService] Non-fatal BERR re-evaluation error:", err);
      }
    }

    return {
      begGraphId: syncRes.begGraphId,
      version: syncRes.version,
      changed: syncRes.changed,
      berrAssessmentId,
    };
  }
}
