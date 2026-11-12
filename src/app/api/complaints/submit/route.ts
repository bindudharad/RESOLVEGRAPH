import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { evidenceStorage, EvidenceStorageError } from "@/server/storage/evidence-storage";
import { EvidenceGuardService } from "@/server/services/evidenceguard.service";
import { SellerWorkflowOrchestrator } from "@/server/seller";
import { BerrV2Service } from "@/server/ai/reasoning/berr-v2.service";
import { BegSyncService } from "@/server/graph/beg-sync.service";
import { SecurityAuditService } from "@/server/services/security-audit.service";
import {
  CaseCategory,
  CasePriority,
  CaseStatus,
  CaseStage,
  EventType,
  PartyRole,
  ClaimType,
  RemedyType,
  EvidenceType,
  EvidenceSource,
  VerificationStatus,
  EvidenceVisibility,
} from "@/generated/prisma/client";

function mapCategoryToEnum(category: string): CaseCategory {
  const cat = category.toLowerCase();
  if (cat.includes("wrong product")) return CaseCategory.NOT_AS_DESCRIBED;
  if (cat.includes("damaged")) return CaseCategory.DAMAGED_GOODS;
  if (cat.includes("missing") || cat.includes("item not received")) return CaseCategory.NON_DELIVERY;
  if (cat.includes("specification") || cat.includes("differ")) return CaseCategory.NOT_AS_DESCRIBED;
  if (cat.includes("payment")) return CaseCategory.BILLING_ERROR;
  if (cat.includes("refund")) return CaseCategory.REFUND_DISPUTE;
  return CaseCategory.OTHER;
}

function mapCategoryToClaimType(category: string): ClaimType {
  const cat = category.toLowerCase();
  if (cat.includes("wrong product")) return ClaimType.SIGNIFICANTLY_NOT_AS_DESCRIBED;
  if (cat.includes("damaged")) return ClaimType.DEFECTIVE_OR_DAMAGED;
  if (cat.includes("missing")) return ClaimType.ITEM_NOT_RECEIVED;
  if (cat.includes("specification")) return ClaimType.SIGNIFICANTLY_NOT_AS_DESCRIBED;
  if (cat.includes("payment")) return ClaimType.UNAUTHORIZED_CHARGE;
  if (cat.includes("refund")) return ClaimType.RETURN_REJECTED;
  return ClaimType.OTHER;
}

function mapRemedyToEnum(remedy: string): RemedyType {
  const rem = remedy.toLowerCase();
  if (rem.includes("replacement")) return RemedyType.REPLACEMENT;
  if (rem.includes("refund")) return RemedyType.FULL_REFUND;
  // "Either is acceptable" maps to FULL_REFUND as baseline preference while preserving exact label in metadata
  return RemedyType.FULL_REFUND;
}

function inferEvidenceType(tag: string, mimeType: string, filename: string): EvidenceType {
  const lowerTag = tag.toLowerCase();
  const lowerMime = mimeType.toLowerCase();
  const lowerName = filename.toLowerCase();

  if (lowerTag.includes("invoice") || lowerTag.includes("order")) return EvidenceType.INVOICE;
  if (lowerTag.includes("receipt") || lowerTag.includes("payment") || lowerTag.includes("bank") || lowerTag.includes("refund")) {
    return EvidenceType.RECEIPT;
  }
  if (lowerTag.includes("photo") || lowerMime.startsWith("image/")) return EvidenceType.PHOTO;
  if (lowerMime === "application/pdf" || lowerName.includes("invoice")) return EvidenceType.INVOICE;
  if (lowerName.includes("receipt")) return EvidenceType.RECEIPT;
  return EvidenceType.OTHER;
}

export async function POST(req: NextRequest) {
  const savedStorageKeys: string[] = [];

  try {
    const user = await requireAuth(req);
    const formData = await req.formData();

    const platform = (formData.get("platform") as string)?.trim();
    const orderId = (formData.get("orderId") as string)?.trim();
    const productName = (formData.get("productName") as string)?.trim();
    const amountStr = (formData.get("amount") as string)?.trim();
    const currency = (formData.get("currency") as string)?.trim() || "INR";
    const category = (formData.get("category") as string)?.trim();
    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();
    const requestedRemedy = (formData.get("requestedRemedy") as string)?.trim() || "EITHER";
    const purchaseDate = (formData.get("purchaseDate") as string)?.trim() || undefined;
    const idempotencyKey = (formData.get("idempotencyKey") as string)?.trim();

    if (!platform) {
      return NextResponse.json({ error: "Shopping platform is required" }, { status: 400 });
    }
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }
    if (!productName) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }
    const amountNum = parseFloat(amountStr);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "Valid purchase amount is required" }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: "Complaint category is required" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "Complaint title is required" }, { status: 400 });
    }
    if (!description || description.length < 5) {
      return NextResponse.json({ error: "Description must be at least 5 characters" }, { status: 400 });
    }

    // 1. Idempotency check to prevent duplicate complaint creation on retry/double-click
    if (idempotencyKey) {
      const existingEvent = await prisma.caseEvent.findFirst({
        where: {
          actorId: user.id,
          eventType: EventType.CASE_CREATED,
          metadataJson: { contains: `"idempotencyKey":"${idempotencyKey}"` },
        },
        include: {
          case: {
            include: { evidence: true },
          },
        },
      });

      if (existingEvent?.case) {
        return NextResponse.json({
          success: true,
          duplicatePrevented: true,
          case: {
            id: existingEvent.case.caseNumber,
            dbId: existingEvent.case.id,
            caseNumber: existingEvent.case.caseNumber,
            title: existingEvent.case.title,
            platform,
            orderId,
            productName,
            category,
            amount: existingEvent.case.amountMinor / 100,
            currency: existingEvent.case.currency,
            requestedRemedy,
            status: "Submitted",
            evidenceCount: existingEvent.case.evidence.length,
            createdAt: existingEvent.case.createdAt.toISOString(),
          },
        });
      }
    }

    // 2. Validate & store uploaded files securely into private storage (.private/evidence/) BEFORE DB commit
    const uploadFiles = formData.getAll("evidence_files") as File[];
    const uploadTags = formData.getAll("evidence_tags") as string[];

    const preparedFiles: Array<{
      buffer: Buffer;
      tag: string;
      stored: Awaited<ReturnType<typeof evidenceStorage.saveFile>>;
      evidenceType: EvidenceType;
    }> = [];

    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      if (!file || !(file instanceof File) || file.size === 0) continue;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const tag = (uploadTags[i] || "supporting").trim();

      const stored = await evidenceStorage.saveFile(buffer, file.name, file.type);
      savedStorageKeys.push(stored.storageKey);

      preparedFiles.push({
        buffer,
        tag,
        stored,
        evidenceType: inferEvidenceType(tag, stored.detectedMimeType, stored.sanitizedFilename),
      });
    }

    const amountMinor = Math.round(amountNum * 100);
    const dbCategory = mapCategoryToEnum(category);
    const dbClaimType = mapCategoryToClaimType(category);
    const dbRemedy = mapRemedyToEnum(requestedRemedy);

    // Assign unassigned neutral organizationId (null) until Buyer Evidence Screening +
    // Verified Seller Identification safely associates an actual registered seller organization.
    const platformInvestigator = await prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [{ isPlatformAdmin: true }, { role: "ADMIN" }],
      },
      select: { id: true },
    });
    const merchantId = platformInvestigator?.id || "usr_priya_admin";
    const organizationId: string | null = null;

    // 3. Atomic transaction creating CaseRecord, Claim, Evidence links, and Audit Events
    // Compute next caseNumber outside the interactive transaction so SQLite begins directly
    // with an INSERT (avoiding SHARED -> RESERVED lock-upgrade SQLITE_BUSY deadlocks),
    // with bounded retry on P2002 (concurrent caseNumber race) or transient P1008 lock.
    const existingCases = await prisma.caseRecord.findMany({
      where: { caseNumber: { startsWith: "RG-" } },
      select: { caseNumber: true },
    });

    let baseMaxNum = 1000;
    for (const c of existingCases) {
      const match = c.caseNumber.match(/^RG-(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > baseMaxNum) baseMaxNum = n;
      }
    }

    const formattedDescription = `[Platform: ${platform} | Order ID: ${orderId} | Product: ${productName} | Category: ${category}]\n\n${description}`;

    const runCaseCreationTx = async (caseNumber: string) =>
      prisma.$transaction(
        async (tx) => {
          const newCase = await tx.caseRecord.create({
            data: {
              caseNumber,
              title,
              description: formattedDescription,
              category: dbCategory,
              priority: CasePriority.MEDIUM,
              amountMinor,
              currency,
              buyerId: user.id,
              merchantId,
              organizationId,
              stage: CaseStage.INTAKE,
              status: CaseStatus.SUBMITTED,
            },
          });

          const newClaim = await tx.claim.create({
            data: {
              caseId: newCase.id,
              authorId: user.id,
              partyRole: PartyRole.BUYER,
              claimType: dbClaimType,
              statement: description,
              requestedRemedy: dbRemedy,
            },
          });

          await tx.caseEvent.create({
            data: {
              caseId: newCase.id,
              actorId: user.id,
              eventType: EventType.CASE_CREATED,
              description: `Customer complaint ${caseNumber} submitted for ${platform} order ${orderId}: "${title}"`,
              metadataJson: JSON.stringify({
                idempotencyKey: idempotencyKey || undefined,
                platform,
                orderId,
                productName,
                amount: amountNum,
                currency,
                originalCategory: category,
                customTitle: title,
                requestedRemedy,
                purchaseDate,
                submissionDate: new Date().toISOString(),
              }),
            },
          });

          const createdEvidenceRecords: Array<{
            id: string;
            filename: string;
            sha256: string;
            buffer: Buffer;
          }> = [];

          for (const item of preparedFiles) {
            const evidence = await tx.evidence.create({
              data: {
                caseId: newCase.id,
                claimId: newClaim.id,
                uploadedById: user.id,
                filename: item.stored.sanitizedFilename,
                mimeType: item.stored.detectedMimeType,
                sizeBytes: item.stored.sizeBytes,
                storageKey: item.stored.storageKey,
                sha256: item.stored.sha256,
                description: `Customer-submitted ${item.tag} for ${caseNumber}`,
                evidenceType: item.evidenceType,
                sourceType: EvidenceSource.BUYER_UPLOAD,
                // Never mark customer upload as independently verified upfront
                verificationStatus: VerificationStatus.UNVERIFIED,
                visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
                metadataJson: JSON.stringify({
                  slotTag: item.tag,
                  uploadedAt: new Date().toISOString(),
                }),
              },
            });

            createdEvidenceRecords.push({
              id: evidence.id,
              filename: evidence.filename,
              sha256: evidence.sha256,
              buffer: item.buffer,
            });

            await tx.caseEvent.create({
              data: {
                caseId: newCase.id,
                actorId: user.id,
                eventType: EventType.EVIDENCE_UPLOADED,
                description: `Buyer uploaded ${item.tag}: ${evidence.filename} (SHA-256: ${evidence.sha256.slice(0, 12)}…)`,
                metadataJson: JSON.stringify({
                  evidenceId: evidence.id,
                  filename: evidence.filename,
                  sizeBytes: item.stored.sizeBytes,
                  sha256: evidence.sha256,
                  source: "BUYER_UPLOAD",
                }),
              },
            });
          }

          // Record buyer evidence screening queue milestone; seller requests start only after screening passes.
          await tx.caseEvent.create({
            data: {
              caseId: newCase.id,
              actorId: user.id,
              eventType: EventType.TIMELINE_EVENT_RECORDED,
              description: `Complaint submitted for ${platform} order ${orderId}. Queued for buyer evidence screening prior to seller identification.`,
              metadataJson: JSON.stringify({
                stage: "BUYER_EVIDENCE_SCREENING_QUEUED",
                platform,
                orderId,
              }),
            },
          });

          return { newCase, newClaim, caseNumber, createdEvidenceRecords };
        },
        { maxWait: 10000, timeout: 20000 }
      );

    let result: Awaited<ReturnType<typeof runCaseCreationTx>> | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidateNumber = `RG-${baseMaxNum + 1 + attempt}`;
      try {
        result = await runCaseCreationTx(candidateNumber);
        break;
      } catch (txErr: unknown) {
        const code =
          typeof txErr === "object" && txErr !== null && "code" in txErr
            ? String((txErr as { code?: unknown }).code)
            : "";
        if ((code === "P2002" || code === "P1008") && attempt < 4) {
          await new Promise((r) => setTimeout(r, 75 * (attempt + 1)));
          continue;
        }
        throw txErr;
      }
    }
    if (!result) {
      throw new Error("Unable to allocate unique case number for complaint submission");
    }

    // 4. Trigger behind-the-scenes EvidenceGuard & Seller Identification/Outreach + BERR v2 analysis
    for (const ev of result.createdEvidenceRecords) {
      await EvidenceGuardService.analyzeEvidence(ev.id, ev.buffer).catch((err) => {
        console.warn(`Background EvidenceGuard analysis skipped for ${ev.id}:`, err);
      });
    }

    let sellerWorkflowResult = null;
    if (result.createdEvidenceRecords.length > 0) {
      sellerWorkflowResult = await SellerWorkflowOrchestrator.initiateAfterScreening({
        caseIdOrNumber: result.newCase.id,
        actorId: user.id,
        marketplaceHint: platform,
        orderIdHint: orderId,
        productNameHint: productName,
        runGuardIfMissing: false,
        idempotencyKey: `gateway:${result.newCase.id}:initial`,
      }).catch((err) => {
        console.warn(`Seller workflow initiation skipped for ${result.caseNumber}:`, err);
        return null;
      });
    }

    const analysisRun = await prisma.aIAnalysisRun.create({
      data: {
        caseId: result.newCase.id,
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
        caseId: result.newCase.id,
        triggerEvent: "COMPLAINT_CREATED",
        actorId: user.id,
        rerunBerr: false,
      }).catch((err) => {
        console.warn(`Initial BEG sync warning for ${result.caseNumber}:`, err);
      });

      const berrOut = await BerrV2Service.evaluateCase(result.newCase.id, {
        triggerReason: "COMPLAINT_CREATED",
        createdById: user.id,
      });
      await prisma.aIAnalysisRun.update({
        where: { id: analysisRun.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      await prisma.caseRecord.update({
        where: { id: result.newCase.id },
        data: { status: CaseStatus.UNDER_ANALYSIS, stage: CaseStage.INVESTIGATION },
      });
      await prisma.caseEvent.create({
        data: {
          caseId: result.newCase.id,
          actorId: user.id,
          eventType: EventType.AI_ANALYSIS_COMPLETED,
          description: `Initial RESOLVEGRAPH examination completed (${berrOut.factCounts.agreed} agreed, ${berrOut.factCounts.verified} verified, ${berrOut.factCounts.missing} missing).`,
          metadataJson: JSON.stringify({
            analysisRunId: analysisRun.id,
          }),
        },
      });
    } catch (err) {
      console.warn(`Background BERR evaluation skipped for ${result.caseNumber}:`, err);
      await prisma.aIAnalysisRun.update({
        where: { id: analysisRun.id },
        data: { status: "QUEUED" },
      }).catch(() => {});
    }

    await prisma.notificationMessage.create({
      data: {
        userId: user.id,
        title: `Complaint ${result.caseNumber} Submitted`,
        body: `Complaint submitted successfully for ${productName} (${platform}). RESOLVEGRAPH has started analyzing your complaint.`,
        linkUrl: `/cases?complaint=${encodeURIComponent(result.caseNumber)}`,
        type: "SUCCESS",
      },
    }).catch(() => {});

    await SecurityAuditService.record({
      actorId: user.id,
      action: "BUYER_COMPLAINT_SUBMITTED",
      targetType: "CaseRecord",
      targetId: result.newCase.id,
      status: "SUCCESS",
      metadata: {
        caseNumber: result.caseNumber,
        platform,
        evidenceCount: result.createdEvidenceRecords.length,
      },
    });

    return NextResponse.json({
      success: true,
      case: {
        id: result.caseNumber,
        dbId: result.newCase.id,
        caseNumber: result.caseNumber,
        title,
        platform,
        orderId,
        productName,
        category,
        amount: amountNum,
        currency,
        requestedRemedy,
        status: "Submitted",
        evidenceCount: result.createdEvidenceRecords.length,
        evidence: result.createdEvidenceRecords.map((e) => ({
          id: e.id,
          filename: e.filename,
          sha256: e.sha256,
        })),
        createdAt: result.newCase.createdAt.toISOString(),
      },
      sellerWorkflow: sellerWorkflowResult
        ? {
            screeningPassed: sellerWorkflowResult.screening.passed,
            screeningState: sellerWorkflowResult.screening.screeningState,
            matchOutcome: sellerWorkflowResult.matchResolution?.matchOutcome ?? null,
            selectedChannel: sellerWorkflowResult.gatewayResult?.selectedChannel ?? null,
            requestStatus: sellerWorkflowResult.gatewayResult?.requestStatus ?? null,
            requestId: sellerWorkflowResult.gatewayResult?.requestId ?? null,
            requestNumber: sellerWorkflowResult.gatewayResult?.requestNumber ?? null,
            marketplaceSupportUrl:
              sellerWorkflowResult.gatewayResult?.marketplaceSupportUrl ?? null,
          }
        : null,
    });
  } catch (error: unknown) {
    // Rollback private stored files if database persistence failed
    for (const key of savedStorageKeys) {
      await evidenceStorage.deleteFile(key).catch(() => {});
    }

    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof EvidenceStorageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Complaint submission error:", error);
    const message = error instanceof Error ? error.message : "Failed to submit complaint";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
