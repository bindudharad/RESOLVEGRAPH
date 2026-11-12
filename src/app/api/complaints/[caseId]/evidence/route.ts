import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { evidenceStorage, EvidenceStorageError } from "@/server/storage/evidence-storage";
import { EvidenceGuardService } from "@/server/services/evidenceguard.service";
import { SellerWorkflowOrchestrator } from "@/server/seller";
import { BerrV2Service } from "@/server/ai/reasoning/berr-v2.service";
import { BegSyncService } from "@/server/graph/beg-sync.service";
import { SecurityAuditService } from "@/server/services/security-audit.service";
import { BuyerTrackingService } from "@/server/services/buyer-tracking.service";
import {
  CaseStatus,
  EventType,
  EvidenceType,
  EvidenceSource,
  VerificationStatus,
  EvidenceVisibility,
} from "@/generated/prisma/client";

function mapMimeToEvidenceType(mimeType: string, filename: string): EvidenceType {
  const mime = mimeType.toLowerCase();
  const lower = filename.toLowerCase();
  if (mime.startsWith("image/")) return EvidenceType.PHOTO;
  if (mime === "application/pdf" || lower.includes("invoice")) return EvidenceType.INVOICE;
  if (lower.includes("receipt")) return EvidenceType.RECEIPT;
  return EvidenceType.OTHER;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  const savedKeys: string[] = [];

  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    const caseRecord = await prisma.caseRecord.findFirst({
      where: { OR: [{ caseNumber: caseId }, { id: caseId }] },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: `Complaint '${caseId}' not found` }, { status: 404 });
    }

    // Strict ownership enforcement: only the complaint owner (or platform admin) can append customer follow-up evidence
    if (!user.isPlatformAdmin && caseRecord.buyerId !== user.id) {
      return NextResponse.json(
        { error: "Access denied: You are not authorized to upload evidence to this complaint." },
        { status: 403 }
      );
    }

    if (caseRecord.status === CaseStatus.CLOSED || caseRecord.status === CaseStatus.ARCHIVED) {
      return NextResponse.json(
        { error: "Cannot upload additional evidence to a closed complaint." },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const note = (formData.get("note") as string)?.trim() || "";
    const uploadedFiles = [
      ...(formData.getAll("evidence_files") as File[]),
      ...(formData.getAll("file") as File[]),
    ].filter((f) => f && f instanceof File && f.size > 0);

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: "Please attach at least one valid file (JPG, PNG, WEBP, PDF, MP4, or WEBM)." },
        { status: 400 }
      );
    }

    // Validate & persist binary files into private storage upfront
    const prepared: Array<{
      buffer: Buffer;
      stored: Awaited<ReturnType<typeof evidenceStorage.saveFile>>;
    }> = [];

    for (const file of uploadedFiles) {
      const buf = Buffer.from(await file.arrayBuffer());
      const stored = await evidenceStorage.saveFile(buf, file.name, file.type);
      savedKeys.push(stored.storageKey);
      prepared.push({ buffer: buf, stored });
    }

    // Atomic append preserving all historical records & timestamps
    const createdEvidence = await prisma.$transaction(async (tx) => {
      const results: Array<{ id: string; filename: string; sha256: string; buffer: Buffer }> = [];

      for (const item of prepared) {
        const evidence = await tx.evidence.create({
          data: {
            caseId: caseRecord.id,
            uploadedById: user.id,
            filename: item.stored.sanitizedFilename,
            mimeType: item.stored.detectedMimeType,
            sizeBytes: item.stored.sizeBytes,
            storageKey: item.stored.storageKey,
            sha256: item.stored.sha256,
            description: note || `Customer additional supporting evidence for ${caseRecord.caseNumber}`,
            evidenceType: mapMimeToEvidenceType(
              item.stored.detectedMimeType,
              item.stored.sanitizedFilename
            ),
            sourceType: EvidenceSource.BUYER_UPLOAD,
            verificationStatus: VerificationStatus.UNVERIFIED,
            visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
            metadataJson: JSON.stringify({
              slotTag: "additional_evidence",
              customerNote: note || undefined,
              uploadedAt: new Date().toISOString(),
            }),
          },
        });

        results.push({
          id: evidence.id,
          filename: evidence.filename,
          sha256: evidence.sha256,
          buffer: item.buffer,
        });

        await tx.caseEvent.create({
          data: {
            caseId: caseRecord.id,
            actorId: user.id,
            eventType: EventType.EVIDENCE_UPLOADED,
            description: `Customer uploaded additional evidence: ${evidence.filename}`,
            metadataJson: JSON.stringify({
              evidenceId: evidence.id,
              filename: evidence.filename,
              sizeBytes: item.stored.sizeBytes,
              sha256: evidence.sha256,
              isFollowUp: true,
              customerNote: note || undefined,
            }),
          },
        });

        await tx.caseTimelineEvent.create({
          data: {
            caseId: caseRecord.id,
            actorId: user.id,
            evidenceId: evidence.id,
            eventType: "EVIDENCE_SUBMITTED",
            title: "Additional evidence uploaded",
            description: note
              ? `Submitted ${evidence.filename}: ${note}`
              : `Submitted ${evidence.filename} for re-evaluation.`,
            occurredAt: new Date(),
            timePrecision: "EXACT_TIMESTAMP",
            timeBasis: "USER_REPORTED",
            metadataJson: JSON.stringify({ sourceParty: "CUSTOMER" }),
          },
        });
      }

      // Append status transition for re-investigation without overwriting prior history
      if (caseRecord.status !== CaseStatus.UNDER_ANALYSIS) {
        await tx.caseRecord.update({
          where: { id: caseRecord.id },
          data: { status: CaseStatus.UNDER_ANALYSIS },
        });

        await tx.caseEvent.create({
          data: {
            caseId: caseRecord.id,
            actorId: user.id,
            eventType: EventType.STATUS_CHANGED,
            description: `Investigation resumed after customer submitted additional evidence.`,
            metadataJson: JSON.stringify({
              fromStatus: caseRecord.status,
              toStatus: CaseStatus.UNDER_ANALYSIS,
              trigger: "ADDITIONAL_EVIDENCE_SUBMITTED",
            }),
          },
        });
      }

      return results;
    });

    // Run EvidenceGuard + Seller Workflow (if not yet initiated) + BERR v2 re-evaluation cycle
    for (const ev of createdEvidence) {
      await EvidenceGuardService.analyzeEvidence(ev.id, ev.buffer).catch((err) => {
        console.warn("Follow-up EvidenceGuard warning:", err);
      });
    }

    const existingSellerReq = await prisma.sellerEvidenceRequest.findFirst({
      where: { caseId: caseRecord.id },
      select: { id: true, status: true },
    });
    if (!existingSellerReq) {
      await SellerWorkflowOrchestrator.initiateAfterScreening({
        caseIdOrNumber: caseRecord.id,
        actorId: user.id,
        runGuardIfMissing: false,
        idempotencyKey: `gateway:${caseRecord.id}:followup:${createdEvidence[0]?.id || Date.now()}`,
      }).catch((err) => {
        console.warn("Follow-up seller workflow trigger skipped:", err);
      });
    }

    const analysisRun = await prisma.aIAnalysisRun.create({
      data: {
        caseId: caseRecord.id,
        requestedById: user.id,
        provider: "deterministic-berr",
        model: "berr-v2-engine",
        analysisType: "FULL_BERR",
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });

    try {
      await BegSyncService.handleDomainEvent({
        caseId: caseRecord.id,
        triggerEvent: "BUYER_EVIDENCE_UPLOADED",
        actorId: user.id,
        rerunBerr: false,
      }).catch((err) => {
        console.warn("Follow-up BEG sync warning:", err);
      });

      const berrResult = await BerrV2Service.evaluateCase(caseRecord.id, {
        triggerReason: "BUYER_EVIDENCE_UPLOADED",
        createdById: user.id,
      });
      await prisma.aIAnalysisRun.update({
        where: { id: analysisRun.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
      await prisma.caseEvent.create({
        data: {
          caseId: caseRecord.id,
          actorId: user.id,
          eventType: EventType.AI_ANALYSIS_COMPLETED,
          description: `Updated evaluation completed (${berrResult.factCounts.verified} verified, ${berrResult.factCounts.contested} contested).`,
          metadataJson: JSON.stringify({
            analysisRunId: analysisRun.id,
            reEvaluation: true,
          }),
        },
      });
    } catch (evalErr) {
      await prisma.aIAnalysisRun.update({
        where: { id: analysisRun.id },
        data: {
          status: "NEEDS_HUMAN_REVIEW",
          safeErrorMessage: evalErr instanceof Error ? evalErr.message : "Evaluation deferred",
        },
      }).catch(() => {});
    }

    await prisma.notificationMessage.create({
      data: {
        userId: user.id,
        title: `Evidence Received — ${caseRecord.caseNumber}`,
        body: `${createdEvidence.length} additional file(s) uploaded. RESOLVEGRAPH resumed investigation.`,
        linkUrl: `/cases?complaint=${encodeURIComponent(caseRecord.caseNumber)}`,
        type: "INFO",
      },
    }).catch(() => {});

    await SecurityAuditService.record({
      actorId: user.id,
      action: "BUYER_ADDITIONAL_EVIDENCE_UPLOADED",
      targetType: "CaseRecord",
      targetId: caseRecord.id,
      status: "SUCCESS",
      metadata: {
        caseNumber: caseRecord.caseNumber,
        filesCount: createdEvidence.length,
      },
    });

    const updatedDetail = await BuyerTrackingService.getBuyerComplaintDetail(
      user,
      caseRecord.caseNumber
    );

    return NextResponse.json({
      success: true,
      uploadedCount: createdEvidence.length,
      detail: updatedDetail,
    });
  } catch (error: unknown) {
    for (const key of savedKeys) {
      await evidenceStorage.deleteFile(key).catch(() => {});
    }

    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof EvidenceStorageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Additional evidence upload error:", error);
    const message = error instanceof Error ? error.message : "Failed to upload evidence";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
