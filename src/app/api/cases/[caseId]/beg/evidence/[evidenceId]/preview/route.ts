import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { canViewEvidence } from "@/server/auth/permissions";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { evidenceStorage } from "@/server/storage/evidence-storage";

async function readStreamToLimitedUtf8(stream: NodeJS.ReadableStream, maxBytes = 4096): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(buf);
    total += buf.length;
    if (total >= maxBytes) break;
  }
  return Buffer.concat(chunks).toString("utf-8").slice(0, maxBytes);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string; evidenceId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId, evidenceId } = await context.params;

    const caseRecord = await getCaseByIdAuthorized(user, caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
    }

    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;

    const evidence = await prisma.evidence.findFirst({
      where: {
        id: evidenceId,
        caseId: realDbCaseId,
      },
      include: {
        uploadedBy: { select: { id: true, fullName: true, email: true, role: true } },
        analysisResults: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        fieldExtractions: {
          orderBy: { createdAt: "desc" },
          take: 30,
        },
        extractedFacts: {
          orderBy: { createdAt: "desc" },
          take: 25,
        },
      },
    });

    if (!evidence) {
      return NextResponse.json({ error: `Evidence '${evidenceId}' not found` }, { status: 404 });
    }

    if (!canViewEvidence(user, evidence, caseRecord)) {
      return NextResponse.json(
        { error: "Access denied: You do not have permission to preview this evidence artifact." },
        { status: 403 }
      );
    }

    const mime = (evidence.mimeType || "").toLowerCase();
    let previewMode: "image" | "pdf" | "video" | "text" | "metadata" = "metadata";
    if (mime.startsWith("image/")) previewMode = "image";
    else if (mime === "application/pdf") previewMode = "pdf";
    else if (mime.startsWith("video/")) previewMode = "video";
    else if (
      mime.startsWith("text/") ||
      mime.includes("json") ||
      evidence.filename.endsWith(".txt") ||
      evidence.filename.endsWith(".csv") ||
      evidence.filename.endsWith(".json")
    ) {
      previewMode = "text";
    }

    let textExcerpt: string | null = null;
    if (previewMode === "text") {
      try {
        const { stream } = evidenceStorage.getFileStream(evidence.storageKey);
        textExcerpt = await readStreamToLimitedUtf8(stream, 4096);
      } catch {
        textExcerpt = null;
      }
    }

    const latestAnalysis = evidence.analysisResults[0] || null;

    return NextResponse.json({
      evidence: {
        id: evidence.id,
        caseId: evidence.caseId,
        filename: evidence.filename,
        mimeType: evidence.mimeType,
        sizeBytes: evidence.sizeBytes,
        sha256: evidence.sha256,
        evidenceType: evidence.evidenceType,
        sourceType: evidence.sourceType,
        visibility: evidence.visibility,
        verificationStatus: evidence.verificationStatus,
        findingsSummary: latestAnalysis?.findingsSummary || null,
        uploadedBy: evidence.uploadedBy.fullName || evidence.uploadedBy.email,
        uploadedParty: evidence.uploadedById === caseRecord.buyerId ? "BUYER" : "SELLER",
        createdAt: evidence.createdAt.toISOString(),
        downloadUrl: `/api/evidence/${encodeURIComponent(evidence.id)}/download`,
      },
      previewMode,
      textExcerpt,
      analysis: latestAnalysis
        ? {
            id: latestAnalysis.id,
            assessmentState: latestAnalysis.assessmentState,
            confidence: latestAnalysis.confidence,
            findingsSummary: latestAnalysis.findingsSummary,
            humanReviewRecommended: latestAnalysis.humanReviewRecommended,
            extractedFields: evidence.fieldExtractions.map((f) => ({
              id: f.id,
              fieldKey: f.fieldName,
              rawValue: f.extractedValue,
              normalizedValue: f.userCorrectedValue || f.extractedValue,
              confidence: f.confidence,
              sourceSnippet: f.sourceSnippet,
            })),
          }
        : null,
      extractedFacts: evidence.extractedFacts.map((ef) => ({
        id: ef.id,
        factType: ef.factType,
        fieldKey: ef.fieldKey,
        rawValue: ef.rawValue,
        normalizedValue: ef.normalizedValue,
        sourceExcerpt: ef.sourceExcerpt,
        pageNumber: ef.pageNumber,
        reviewStatus: ef.reviewStatus,
      })),
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to preview evidence";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
