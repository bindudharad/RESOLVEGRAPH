/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { MultilingualVoiceService } from '@/server/services/multilingual-voice.service';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    if (!body.statement) {
      return NextResponse.json({ error: 'statement is required.' }, { status: 400 });
    }

    const lang = (body.inputLanguage || 'en').toLowerCase();
    if (!['en', 'kn', 'hi'].includes(lang)) {
      return NextResponse.json({ error: 'Supported languages are en, kn, and hi.' }, { status: 400 });
    }

    const result = await MultilingualVoiceService.processComplaint({
      userId: user.id,
      caseId: body.caseId,
      inputLanguage: lang as any,
      statement: String(body.statement),
      hasAudioConsent: Boolean(body.hasAudioConsent),
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Complaint processing failed' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAuth(request);
    const body = await request.json();

    if (!body.complaintId || !body.confirmedFields) {
      return NextResponse.json({ error: 'complaintId and confirmedFields are required.' }, { status: 400 });
    }

    const updated = await MultilingualVoiceService.confirmComplaint(body.complaintId, body.confirmedFields);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Complaint confirmation failed' }, { status: 500 });
  }
}
