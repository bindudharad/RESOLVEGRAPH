/**
 * RESOLVEGRAPH — Step 5: Advanced 12-Stage BERR Reasoning Engine
 * Bilateral Evidence-to-Remedy Reasoning with Fact Relations, Temporal Intelligence,
 * Semantic Drift, Policy Grounding, and Graph Snapshotting.
 */

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ConsentManager } from "../security/consent-manager";
import { EvidenceExtractor } from "../extraction/evidence-extractor";
import { ContradictionDetector } from "./contradiction-detector";
import { MissingEvidenceDetector } from "./missing-evidence-detector";
import { getAIProvider } from "../providers/provider-factory";
import { RawExtractedFact } from "../schemas/extraction.schema";
import { SemanticDriftEngine, CommercialStageFact } from "@/server/drift/semantic-drift-engine";
import { ResolutionEngine } from "@/server/resolution/resolution-engine";
import { GraphBuilder } from "@/server/graph/graph-builder";

export class BerrEngine {
  /**
   * Executes the full 12-stage BERR reasoning pipeline for an analysis run.
   */
  public static async runCaseBERR(runId: string, forceTestProvider = false) {
    const startTime = Date.now();

    const run = await prisma.aIAnalysisRun.findUnique({
      where: { id: runId },
      include: {
        case: {
          include: {
            claims: true,
            evidence: true,
          },
        },
      },
    });

    if (!run) {
      throw new Error(`AI Analysis Run ${runId} not found`);
    }

    const caseRecord = run.case;

    // Transition to PROCESSING
    await prisma.aIAnalysisRun.update({
      where: { id: runId },
      data: {
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });

    try {
      const provider = getAIProvider(forceTestProvider || run.provider === "test");

      // ==========================================
      // STAGE 1: Case Context Assembly & Consent Quarantine
      // ==========================================
      const consentScope = await ConsentManager.getCaseConsentedScope(caseRecord.id, run.provider);

      for (const ev of consentScope.allowedEvidence) {
        const hash = crypto.createHash("sha256").update(ev.id + (ev.fileSize || 0)).digest("hex");
        await prisma.aIAnalysisInput.create({
          data: {
            analysisRunId: run.id,
            evidenceId: ev.id,
            sourceHash: hash,
            sourceVersion: "v1.0",
            consentReference: `consent_evidence_${ev.id}`,
          },
        });
      }

      for (const cl of consentScope.allowedClaims) {
        const hash = crypto.createHash("sha256").update(cl.id + cl.statement).digest("hex");
        await prisma.aIAnalysisInput.create({
          data: {
            analysisRunId: run.id,
            claimId: cl.id,
            sourceHash: hash,
            sourceVersion: "v1.0",
            consentReference: `consent_claim_${cl.id}`,
          },
        });
      }

      // ==========================================
      // STAGES 2 & 3: Claim Decomposition, Fact Extraction & Normalization
      // ==========================================
      let totalTokens = 0;
      const extractedEvidenceFacts: Array<{
        evidenceId: string;
        title: string;
        evidenceType: string;
        facts: RawExtractedFact[];
      }> = [];

      for (const ev of consentScope.allowedEvidence) {
        const extraction = await EvidenceExtractor.processEvidence({
          evidenceId: ev.id,
          analysisRunId: run.id,
          caseId: caseRecord.id,
          forceTestProvider: forceTestProvider || run.provider === "test",
        });

        totalTokens += extraction.tokensUsed;
        extractedEvidenceFacts.push({
          evidenceId: ev.id,
          title: ev.title,
          evidenceType: ev.evidenceType,
          facts: extraction.facts,
        });
      }

      // Fetch newly created DB facts for relational linking
      const dbFacts = await prisma.extractedFact.findMany({
        where: { analysisRunId: run.id },
      });

      // ==========================================
      // STAGE 4: Evidence Reconciliation & FactClaimAssessment
      // ==========================================
      const buyerClaims = consentScope.allowedClaims.filter((c) => c.claimantRole === "BUYER");
      const merchantClaims = consentScope.allowedClaims.filter((c) => c.claimantRole === "MERCHANT");

      for (const claim of consentScope.allowedClaims) {
        for (const evFact of extractedEvidenceFacts) {
          let rel = "MENTIONS";
          let explanation = `Evidence mentions attributes relevant to claim: ${claim.claimType}`;
          const claimLower = claim.statement.toLowerCase();

          const hasContradict = evFact.facts.some(
            (f) =>
              claimLower.includes(f.rawValue.toLowerCase()) === false &&
              f.factType === "PRODUCT_SPECIFICATION"
          );

          if (claim.claimantRole === "BUYER" && evFact.evidenceType === "RECEIPT") {
            rel = "SUPPORTS";
            explanation = "Merchant invoice corroborates purchase transaction referenced in claim.";
          } else if (hasContradict && evFact.evidenceType === "TRACKING_DOCUMENT") {
            rel = "CONTRADICTS";
            explanation = "Carrier tracking data conflicts with non-receipt or delivery date in statement.";
          }

          // Step 4 legacy table
          await prisma.claimEvidenceAssessment.create({
            data: {
              caseId: caseRecord.id,
              analysisRunId: run.id,
              claimId: claim.id,
              evidenceId: evFact.evidenceId,
              relationshipType: rel,
              explanation,
              confidenceBand: "HIGH",
              reviewStatus: "UNREVIEWED",
            },
          });
        }

        // Step 5 FactClaimAssessment records linking individual db facts to claims
        for (const fact of dbFacts) {
          const isRelevant =
            claim.statement.toLowerCase().includes(fact.fieldKey.toLowerCase()) ||
            (fact.normalizedValue && claim.statement.toLowerCase().includes(fact.normalizedValue.toLowerCase()));

          if (isRelevant) {
            try {
              await prisma.factClaimAssessment.create({
                data: {
                  caseId: caseRecord.id,
                  claimId: claim.id,
                  extractedFactId: fact.id,
                  relationshipType: claim.claimantRole === "BUYER" ? "SUPPORTS" : "PARTIALLY_SUPPORTS",
                  explanation: `Extracted fact ${fact.fieldKey} directly corroborates assertion in ${claim.claimType}.`,
                  sourceAnalysisRunId: run.id,
                },
              });
            } catch {
              // Ignore duplicates if unique constraint hit
            }
          }
        }
      }

      // ==========================================
      // STAGE 5: Bilateral Analysis & FactRelation Construction
      // ==========================================
      for (let i = 0; i < dbFacts.length; i++) {
        for (let j = i + 1; j < dbFacts.length; j++) {
          const fA = dbFacts[i];
          const fB = dbFacts[j];

          // If comparing same field key across different evidence
          if (fA.fieldKey === fB.fieldKey && fA.id !== fB.id) {
            let relationType = "EQUIVALENT";
            let explanation = `Both evidence sources corroborate ${fA.fieldKey} = ${fA.normalizedValue || fA.rawValue}.`;

            if (fA.normalizedValue && fB.normalizedValue && fA.normalizedValue !== fB.normalizedValue) {
              relationType = "CONTRADICTS";
              explanation = `Discrepancy detected for ${fA.fieldKey}: "${fA.normalizedValue}" vs "${fB.normalizedValue}".`;
            }

            try {
              await prisma.factRelation.create({
                data: {
                  caseId: caseRecord.id,
                  sourceFactId: fA.id,
                  targetFactId: fB.id,
                  relationType,
                  explanation,
                  confidenceBand: "HIGH",
                  sourceAnalysisRunId: run.id,
                },
              });
            } catch {
              // Ignore duplicate relations
            }
          }
        }
      }

      // ==========================================
      // STAGE 6: Temporal Timeline Reconstruction
      // ==========================================
      const existingTimelineCount = await prisma.caseTimelineEvent.count({
        where: { caseId: caseRecord.id },
      });

      if (existingTimelineCount === 0) {
        // Synthesize initial chronological events from case and evidence
        await prisma.caseTimelineEvent.create({
          data: {
            caseId: caseRecord.id,
            eventType: "PURCHASE",
            title: "Transaction Placed",
            description: `Order placed for ${caseRecord.currency} ${caseRecord.amountMinor / 100}`,
            occurredAt: caseRecord.createdAt,
            recordedAt: caseRecord.createdAt,
            timePrecision: "EXACT_TIMESTAMP",
            timeBasis: "SYSTEM_OBSERVED",
          },
        });

        for (const ev of caseRecord.evidence) {
          await prisma.caseTimelineEvent.create({
            data: {
              caseId: caseRecord.id,
              evidenceId: ev.id,
              eventType: "EVIDENCE_SUBMITTED",
              title: `Evidence Submitted: ${ev.filename}`,
              description: `Uploaded ${ev.evidenceType} with ${ev.mimeType}`,
              occurredAt: ev.createdAt,
              recordedAt: ev.createdAt,
              timePrecision: "EXACT_TIMESTAMP",
              timeBasis: "USER_REPORTED",
            },
          });
        }
      }

      // ==========================================
      // STAGE 7: Semantic Drift Analysis
      // ==========================================
      const commercialFacts: CommercialStageFact[] = [];
      for (const fact of dbFacts) {
        const lowerKey = fact.fieldKey.toLowerCase();
        let stage: CommercialStageFact["stage"] = "ORDER";
        if (lowerKey.includes("delivery") || lowerKey.includes("received")) stage = "DELIVERY";
        else if (lowerKey.includes("tracking") || lowerKey.includes("dispatch")) stage = "DISPATCH";
        else if (lowerKey.includes("claim") || lowerKey.includes("complaint")) stage = "CLAIM";

        commercialFacts.push({
          stage,
          fieldKey: fact.fieldKey,
          value: fact.normalizedValue || fact.rawValue,
        });
      }

      const driftResult = SemanticDriftEngine.analyzeDrift(commercialFacts);

      // ==========================================
      // STAGE 8: Missing Evidence Analysis & Contradiction Scoring
      // ==========================================
      const allExtractedFacts: RawExtractedFact[] = [];
      for (const ef of extractedEvidenceFacts) {
        allExtractedFacts.push(...ef.facts);
      }

      const contradictionEval = ContradictionDetector.evaluateDiscrepancy({
        buyerStatements: buyerClaims.map((c) => c.statement),
        merchantStatements: merchantClaims.map((c) => c.statement),
        evidenceFacts: allExtractedFacts,
      });

      const evidenceTypes = consentScope.allowedEvidence.map((e) => e.evidenceType);
      const hasTracking = evidenceTypes.includes("TRACKING_DOCUMENT");
      const hasPodSignature = allExtractedFacts.some((f) => f.factType === "TRACKING_NUMBER");
      const hasPackaging = evidenceTypes.includes("PHOTO");

      const missingItems = MissingEvidenceDetector.detectMissingEvidence({
        category: caseRecord.category,
        existingEvidenceTypes: evidenceTypes,
        hasCarrierTracking: hasTracking,
        hasSignatureProof: hasPodSignature,
        hasPackagingPhotos: hasPackaging,
        hasReturnLabel: evidenceTypes.includes("RETURN_LABEL"),
      });

      // Provider reasoning
      const reasoningRes = await provider.reasonBERR({
        caseId: caseRecord.id,
        title: caseRecord.title,
        category: caseRecord.category,
        disputeAmountCents: caseRecord.amountMinor,
        currency: caseRecord.currency,
        buyerClaims: buyerClaims.map((c) => ({
          id: c.id,
          claimType: c.claimType,
          statement: c.statement,
          demandedAmountCents: c.demandedAmountCents,
        })),
        merchantClaims: merchantClaims.map((c) => ({
          id: c.id,
          claimType: c.claimType,
          statement: c.statement,
          demandedAmountCents: c.demandedAmountCents,
        })),
        evidenceFacts: extractedEvidenceFacts,
      });

      totalTokens += reasoningRes.tokenUsage.totalTokens;

      // Save Findings
      for (const f of reasoningRes.findings) {
        const finding = await prisma.berrFinding.create({
          data: {
            caseId: caseRecord.id,
            analysisRunId: run.id,
            findingType:
              f.findingType === "SPECIFICATION_MISMATCH" || f.findingType === "DELIVERY_NON_RECEIPT"
                ? "CONTRADICTION"
                : f.findingType === "CONSISTENT_ALIGNMENT"
                ? "AGREEMENT"
                : "INCONCLUSIVE",
            outcome: f.findingType === "CONSISTENT_ALIGNMENT" ? "CONSISTENT" : "CONFLICTING",
            severity: f.severity,
            title: f.title,
            explanation: f.description,
            recommendedNextStep: f.recommendedNextSteps.join("; "),
            reviewStatus: "UNREVIEWED",
          },
        });

        for (const evId of f.relatedEvidenceIds || []) {
          try {
            await prisma.berrFindingEvidence.create({
              data: {
                findingId: finding.id,
                evidenceId: evId,
                relationRole: "SUPPORTING",
              },
            });
          } catch {
            // Ignore
          }
        }
      }

      for (const m of missingItems) {
        await prisma.berrFinding.create({
          data: {
            caseId: caseRecord.id,
            analysisRunId: run.id,
            findingType: "MISSING_EVIDENCE",
            outcome: "INSUFFICIENT_EVIDENCE",
            severity: m.importance === "CRITICAL" ? "HIGH" : "MEDIUM",
            title: `Missing Evidence: ${m.evidenceType}`,
            explanation: `Requirement for ${m.party}: ${m.reason}`,
            recommendedNextStep: m.suggestedAction,
            reviewStatus: "UNREVIEWED",
          },
        });
      }

      // ==========================================
      // STAGE 9: Resolution Intelligence & Remedy Suggestion
      // ==========================================
      const policyEval = await ResolutionEngine.evaluateCase(caseRecord.id);
      const existingProposalsCount = await prisma.resolutionProposal.count({
        where: { caseId: caseRecord.id },
      });

      if (existingProposalsCount === 0 && policyEval.recommendedOption) {
        const rec = policyEval.recommendedOption;
        await prisma.resolutionProposal.create({
          data: {
            caseId: caseRecord.id,
            organizationId: caseRecord.organizationId || "org_default",
            policyId: rec.policyId || null,
            basedOnAnalysisRunId: run.id,
            proposedById: run.requestedById,
            proposalType: rec.proposalType,
            title: rec.title,
            description: rec.reason,
            amountMinor: rec.recommendedAmountMinor,
            currency: rec.currency,
            reason: `Grounded in policy ${policyEval.policyName} (${policyEval.policyVersion}). ${rec.justificationNotes.join(" ")}`,
            policyVersion: rec.policyVersion,
            status: "DRAFT",
          },
        });
      }

      // ==========================================
      // STAGES 10, 11 & 12: Explanation, Human Review Routing & Graph Snapshot
      // ==========================================
      const totalDiscrepancy = contradictionEval.discrepancy.totalDiscrepancyScore;
      const finalStatus =
        totalDiscrepancy >= 0.5 || driftResult.hasDrift ? "NEEDS_HUMAN_REVIEW" : "COMPLETED";
      const durationMs = Date.now() - startTime;

      await prisma.aIAnalysisRun.update({
        where: { id: run.id },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          durationMs,
          inputTokenCount: totalTokens > 0 ? Math.round(totalTokens * 0.7) : 400,
          outputTokenCount: totalTokens > 0 ? Math.round(totalTokens * 0.3) : 150,
        },
      });

      // Build & Snapshot Bilateral Evidence Graph
      try {
        const graphData = await GraphBuilder.buildGraph(caseRecord.id);
        await GraphBuilder.saveSnapshot(graphData, "berr-2.0");
      } catch (graphErr) {
        console.warn("[BerrEngine] Graph snapshot creation skipped:", graphErr);
      }

      await prisma.caseEvent.create({
        data: {
          caseId: caseRecord.id,
          actorId: run.requestedById,
          eventType: "AI_ANALYSIS_COMPLETED",
          description: `AI BERR 12-Stage Analysis finished in ${durationMs}ms with status ${finalStatus}. Total discrepancy score: ${totalDiscrepancy}. Drift detected: ${driftResult.hasDrift}`,
          metadataJson: JSON.stringify({
            runId: run.id,
            status: finalStatus,
            discrepancyScore: totalDiscrepancy,
            driftScore: driftResult.overallDriftScore,
            findingsCount: reasoningRes.findings.length + missingItems.length,
            durationMs,
          }),
        } as unknown as Parameters<typeof prisma.caseEvent.create>[0]["data"],
      });

      return {
        runId: run.id,
        status: finalStatus,
        discrepancy: contradictionEval.discrepancy,
        driftResult,
        findingsCount: reasoningRes.findings.length + missingItems.length,
        durationMs,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[BerrEngine] Error executing run ${run.id}:`, errorMsg);

      await prisma.aIAnalysisRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          safeErrorCode: "ANALYSIS_EXECUTION_ERROR",
          safeErrorMessage: errorMsg.slice(0, 255),
        },
      });

      await prisma.caseEvent.create({
        data: {
          caseId: caseRecord.id,
          actorId: run.requestedById,
          eventType: "AI_ANALYSIS_FAILED",
          description: `AI Analysis failed: ${errorMsg.slice(0, 100)}`,
          metadataJson: JSON.stringify({
            runId: run.id,
            error: errorMsg,
          }),
        } as unknown as Parameters<typeof prisma.caseEvent.create>[0]["data"],
      });

      throw err;
    }
  }
}
