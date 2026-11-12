import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionContext } from '@/server/auth/session';
import { canViewEvidence } from '@/server/auth/permissions';
import { evidenceStorage } from '@/server/storage/evidence-storage';
import { SecurityAuditService } from '@/server/services/security-audit.service';
import { Readable } from 'node:stream';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ evidenceId: string }> }
) {
  const { evidenceId } = await params;
  const ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  // 1. Enforce authentication
  const session = await getSessionContext(request);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
  }
  const { user } = session;

  // 2. Fetch evidence record
  const evidence = await prisma.evidence.findUnique({
    where: { id: evidenceId },
    include: {
      case: {
        select: {
          id: true,
          caseNumber: true,
          title: true,
          buyerId: true,
          merchantId: true,
          assignedManagerId: true,
          organizationId: true,
        },
      },
      uploadedBy: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
      },
    },
  });

  if (!evidence) {
    return NextResponse.json({ error: 'Evidence record not found' }, { status: 404 });
  }

  // 3. Enforce tenant and role authorization with fine-grained visibility rules
  const authorized = canViewEvidence(user, evidence, evidence.case);
  if (!authorized) {
    await SecurityAuditService.record({
      actorId: user.id,
      action: 'EVIDENCE_ACCESS_DENIED',
      targetType: 'EVIDENCE',
      targetId: evidence.id,
      status: 'DENIED',
      ipAddress,
      userAgent,
      metadata: {
        caseNumber: evidence.case.caseNumber,
        filename: evidence.filename,
        visibility: evidence.visibility,
        reason: 'User lacks required permissions or tenancy to access this evidence',
      },
    });

    return NextResponse.json(
      { error: 'Forbidden: You do not have permission to view or download this evidence item' },
      { status: 403 }
    );
  }

  // 4. Stream private file safely
  try {
    const { stream, sizeBytes } = evidenceStorage.getFileStream(evidence.storageKey);

    await SecurityAuditService.record({
      actorId: user.id,
      action: 'EVIDENCE_DOWNLOAD',
      targetType: 'EVIDENCE',
      targetId: evidence.id,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      metadata: {
        caseNumber: evidence.case.caseNumber,
        filename: evidence.filename,
        storageKey: evidence.storageKey,
        sizeBytes,
      },
    });

    const webStream = Readable.toWeb(stream) as ReadableStream;
    const wantsInline = request.nextUrl.searchParams.get('inline') === '1';
    const safeInlineMimeTypes = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm',
    ]);
    const dispositionType =
      wantsInline && safeInlineMimeTypes.has((evidence.mimeType || '').toLowerCase())
        ? 'inline'
        : 'attachment';

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': evidence.mimeType || 'application/octet-stream',
        'Content-Disposition': `${dispositionType}; filename="${encodeURIComponent(evidence.filename)}"`,
        'Content-Length': sizeBytes.toString(),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err) {
    console.error('File stream retrieval error:', err);
    return NextResponse.json(
      { error: 'Evidence file binary unavailable in secure storage' },
      { status: 404 }
    );
  }
}
