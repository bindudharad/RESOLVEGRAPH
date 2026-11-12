import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { canAccessCase, canViewEvidence, canUploadEvidenceWithVisibility } from '@/server/auth/permissions';
import { CaseService } from '@/server/services/case.service';
import { evidenceStorage } from '@/server/storage/evidence-storage';
import { createEvidenceSchema } from '@/server/validators/case.validator';
import { SecurityAuditService } from '@/server/services/security-audit.service';
import { BegSyncService } from '@/server/graph/beg-sync.service';
import { EvidenceVisibility, EvidenceType, EvidenceSource, VerificationStatus } from '@/generated/prisma/client';
import { ZodError } from 'zod';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    const caseRecord = await prisma.caseRecord.findFirst({
      where: { OR: [{ caseNumber: caseId }, { id: caseId }] },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
    }

    if (!canAccessCase(user, caseRecord)) {
      return NextResponse.json({ error: 'Access denied: You are not authorized to view evidence for this case.' }, { status: 403 });
    }

    const allEvidence = await prisma.evidence.findMany({
      where: { caseId: caseRecord.id },
      include: { uploadedBy: true, claim: true },
      orderBy: { createdAt: 'desc' },
    });

    // Enforce fine-grained visibility rules (BUYER_ONLY, MERCHANT_ONLY, INTERNAL)
    const accessible = allEvidence.filter((ev) => canViewEvidence(user, ev, caseRecord));

    return NextResponse.json(accessible);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  let savedStorageKey: string | null = null;
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    const caseRecord = await prisma.caseRecord.findFirst({
      where: { OR: [{ caseNumber: caseId }, { id: caseId }] },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
    }

    const contentType = request.headers.get('content-type') || '';

    // A. Handle Multipart Form-Data (Binary File Upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const description = (formData.get('description') as string) || '';
      const rawVisibility = (formData.get('visibility') as string) || 'SHARED_WITH_PARTICIPANTS';
      const rawEvidenceType = (formData.get('evidenceType') as string) || 'OTHER';

      if (!file) {
        return NextResponse.json({ error: 'No file provided in form-data field "file"' }, { status: 400 });
      }

      const visibility = (rawVisibility in EvidenceVisibility ? rawVisibility : 'SHARED_WITH_PARTICIPANTS') as EvidenceVisibility;
      const evidenceType = (rawEvidenceType in EvidenceType ? rawEvidenceType : 'OTHER') as EvidenceType;

      // Check upload authorization against requested visibility
      if (!canUploadEvidenceWithVisibility(user, caseRecord, visibility)) {
        return NextResponse.json(
          { error: `Access denied: You cannot upload evidence with visibility '${visibility}'.` },
          { status: 403 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Validate magic bytes & save into private storage (.private/evidence/)
      const stored = await evidenceStorage.saveFile(buffer, file.name, file.type);
      savedStorageKey = stored.storageKey;

      const sourceType = caseRecord.buyerId === user.id ? EvidenceSource.BUYER_UPLOAD : EvidenceSource.MERCHANT_PORTAL;

      const evidence = await CaseService.addEvidence(caseId, {
        uploadedById: user.id,
        filename: stored.sanitizedFilename,
        mimeType: stored.detectedMimeType,
        sizeBytes: stored.sizeBytes,
        storageKey: stored.storageKey,
        sha256: stored.sha256,
        description,
        evidenceType,
        sourceType,
        verificationStatus: VerificationStatus.UNVERIFIED,
        visibility,
      });

      await BegSyncService.handleDomainEvent({
        caseId: caseRecord.id,
        triggerEvent: 'BUYER_EVIDENCE_UPLOADED',
        actorId: user.id,
        rerunBerr: false,
      }).catch((err) => console.warn('[Evidence POST] BEG sync skipped:', err));

      await SecurityAuditService.record({
        actorId: user.id,
        action: 'EVIDENCE_UPLOADED',
        targetType: 'Evidence',
        targetId: evidence.id,
        status: 'SUCCESS',
        metadata: {
          caseNumber: caseRecord.caseNumber,
          filename: stored.sanitizedFilename,
          sha256: stored.sha256,
          visibility,
        },
      });

      return NextResponse.json(evidence, { status: 201 });
    }

    // B. Handle JSON Metadata Registration
    const body = await request.json();
    const validated = createEvidenceSchema.parse(body);

    if (!canUploadEvidenceWithVisibility(user, caseRecord, validated.visibility)) {
      return NextResponse.json(
        { error: `Access denied: You cannot upload evidence with visibility '${validated.visibility}'.` },
        { status: 403 }
      );
    }

    const evidence = await CaseService.addEvidence(caseId, {
      ...validated,
      uploadedById: user.id,
    });

    await BegSyncService.handleDomainEvent({
      caseId: caseRecord.id,
      triggerEvent: 'BUYER_EVIDENCE_UPLOADED',
      actorId: user.id,
      rerunBerr: false,
    }).catch((err) => console.warn('[Evidence POST JSON] BEG sync skipped:', err));

    await SecurityAuditService.record({
      actorId: user.id,
      action: 'EVIDENCE_METADATA_REGISTERED',
      targetType: 'Evidence',
      targetId: evidence.id,
      status: 'SUCCESS',
      metadata: {
        caseNumber: caseRecord.caseNumber,
        filename: validated.filename,
        sha256: validated.sha256,
        visibility: validated.visibility,
      },
    });

    return NextResponse.json(evidence, { status: 201 });
  } catch (error: unknown) {
    // If private file was created before an error occurred, clean it up to prevent orphaned files
    if (savedStorageKey) {
      await evidenceStorage.deleteFile(savedStorageKey);
    }

    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to add evidence';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
