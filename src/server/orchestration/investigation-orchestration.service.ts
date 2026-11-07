import { prisma } from "@/lib/prisma";
import { BerrEngine } from "../ai/reasoning/berr-engine";
import { GraphBuilder } from "../graph/graph-builder";
import { CaseLifecycleService } from "./case-lifecycle.service";
import { EventOrchestrationService } from "./event-orchestration.service";
import { CaseStage, EventType } from "@/generated/prisma/client";

export class InvestigationOrchestrationService {
  /**
   * Triggers an end-to-end multimodal AI investigation and builds an evidence graph.
   */
  public static async startAiInvestigation(
    caseId: string,
    requestedById: string,
    options?: { forceMock?: boolean; triggerReason?: string }
  ) {
    const caseRecord = await prisma.caseRecord.findUnique({
      where: { id: caseId },
      include: {
        claims: true,
        evidence: true,
        buyer: true,
        merchant: true,
      },
    });

    if (!caseRecord) {
      throw new Error(`Case ${caseId} not found`);
    }

    const provider = options?.forceMock ? "test" : (process.env.AI_PROVIDER || "openai");

    // Ensure consents exist for claims and evidence
    for (const c of caseRecord.claims) {
      const existingConsent = await prisma.aIProcessingConsent.findFirst({
        where: { claimId: c.id, revokedAt: null },
      });
      if (!existingConsent) {
        await prisma.aIProcessingConsent.create({
          data: {
            caseId,
            claimId: c.id,
            grantedById: c.authorId || caseRecord.buyerId,
            provider,
            purpose: "EVIDENCE_INVESTIGATION",
            noticeVersion: "2026.1",
          },
        });
      }
    }

    for (const e of caseRecord.evidence) {
      const existingConsent = await prisma.aIProcessingConsent.findFirst({
        where: { evidenceId: e.id, revokedAt: null },
      });
      if (!existingConsent) {
        await prisma.aIProcessingConsent.create({
          data: {
            caseId,
            evidenceId: e.id,
            grantedById: e.uploadedById || caseRecord.buyerId,
            provider,
            purpose: "EVIDENCE_INVESTIGATION",
            noticeVersion: "2026.1",
          },
        });
      }
    }

    // Create Analysis Run
    const run = await prisma.aIAnalysisRun.create({
      data: {
        caseId,
        requestedById,
        engineVersion: "berr-v2.0",
        provider,
        model: options?.forceMock ? "test-deterministic-v1" : (process.env.OPENAI_MODEL || "gpt-4o-mini"),
        status: "PROCESSING",
      },
    });

    await EventOrchestrationService.recordCaseEvent({
      caseId,
      eventType: EventType.AI_ANALYSIS_REQUESTED,
      actorId: requestedById,
      description: `BERR Multimodal Analysis enqueued (Run ID: ${run.id}).`,
    });

    // Advance Stage to INVESTIGATION
    await CaseLifecycleService.transitionStage({
      caseId,
      nextStage: CaseStage.INVESTIGATION,
      actorId: requestedById,
      note: "Stage advanced to INVESTIGATION following AI trigger.",
    });

    // Execute BERR engine
    const analysisResult = await BerrEngine.runCaseBERR(run.id, options?.forceMock ?? false);

    // Build Bilateral Evidence Graph snapshot
    const graphData = await GraphBuilder.buildGraph(caseId);
    await GraphBuilder.saveSnapshot(graphData, "berr-2.0");

    await EventOrchestrationService.recordCaseEvent({
      caseId,
      eventType: EventType.AI_ANALYSIS_COMPLETED,
      actorId: requestedById,
      description: `AI Analysis completed with ${analysisResult.findingsCount} findings. Graph snapshot generated with ${graphData.nodes.length} nodes and ${graphData.edges.length} edges.`,
    });

    await EventOrchestrationService.recordTimelineEvent({
      caseId,
      eventType: "AI_ANALYSIS_COMPLETED",
      title: "BERR AI Analysis & Evidence Graph Compiled",
      description: `Synthesized analysis with discrepancy score ${analysisResult.discrepancy.totalDiscrepancyScore.toFixed(2)} and ${analysisResult.findingsCount} findings.`,
      occurredAt: new Date(),
      timeBasis: "SYSTEM_OBSERVED",
      sourceParty: "SYSTEM",
      actorId: requestedById,
    });

    return {
      runId: run.id,
      analysis: analysisResult,
      graph: graphData,
    };
  }

  /**
   * Retrieves the full AI investigation dossier for a case.
   */
  public static async getInvestigationDossier(caseId: string) {
    const latestRun = await prisma.aIAnalysisRun.findFirst({
      where: { caseId },
      orderBy: { createdAt: "desc" },
      include: {
        inputs: true,
      },
    });

    const findings = await prisma.berrFinding.findMany({
      where: { caseId },
      include: {
        evidenceLinks: {
          include: {
            evidence: true,
          },
        },
      },
    });

    const facts = await prisma.extractedFact.findMany({
      where: { caseId },
      include: {
        evidence: true,
      },
    });

    const assessments = await prisma.claimEvidenceAssessment.findMany({
      where: { caseId },
      include: {
        claim: true,
        evidence: true,
      },
    });

    const latestSnapshot = await prisma.graphSnapshot.findFirst({
      where: { caseId },
      orderBy: { createdAt: "desc" },
    });

    return {
      latestRun,
      findings,
      facts,
      assessments,
      latestSnapshot,
    };
  }
}
