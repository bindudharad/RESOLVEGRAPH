/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { UniversalEvidenceIntakeService } from '@/server/services/universal-evidence-intake.service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    if (!body.correctedValue) {
      return NextResponse.json({ error: 'correctedValue is required.' }, { status: 400 });
    }

    const updated = await UniversalEvidenceIntakeService.correctExtractedField(
      id,
      String(body.correctedValue),
      user.id
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Correction failed' }, { status: 500 });
  }
}
