/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { UniversalEvidenceIntakeService } from '@/server/services/universal-evidence-intake.service';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const contentType = request.headers.get('content-type') || '';

    let filename = `upload_${Date.now()}.png`;
    let mimeType = 'image/png';
    let fileBuffer: Buffer;
    let caseId: string | undefined;
    let sourceType: any = 'OTHER';
    let manualData: Record<string, unknown> | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      caseId = (formData.get('caseId') as string) || undefined;
      sourceType = (formData.get('sourceType') as string) || 'OTHER';

      if (!file) {
        return NextResponse.json({ error: 'No file supplied in form data' }, { status: 400 });
      }

      filename = file.name;
      mimeType = file.type || 'application/octet-stream';
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      const body = await request.json();
      caseId = body.caseId;
      sourceType = body.sourceType || 'MANUAL_ENTRY';
      filename = body.filename || `manual_${Date.now()}.txt`;
      mimeType = body.mimeType || 'text/plain';
      manualData = body.manualData;

      if (body.contentBase64) {
        fileBuffer = Buffer.from(body.contentBase64, 'base64');
      } else if (body.text) {
        fileBuffer = Buffer.from(body.text, 'utf-8');
      } else {
        fileBuffer = Buffer.from(JSON.stringify(manualData || {}), 'utf-8');
      }
    }

    const result = await UniversalEvidenceIntakeService.ingestEvidence({
      caseId,
      uploadedById: user.id,
      filename,
      mimeType,
      fileBuffer,
      sourceType,
      manualData,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Evidence intake failed' }, { status: 500 });
  }
}
