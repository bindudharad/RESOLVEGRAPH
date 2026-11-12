import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError, requirePlatformAdmin } from '@/server/auth/require-auth';
import {
  getSafeGeminiConfigSummary,
  runGeminiConnectionTest,
} from '@/server/ai/gemini';

export const dynamic = 'force-dynamic';

const ConnectionTestBodySchema = z.object({
  model: z.string().trim().min(1).max(120).optional(),
});

function statusForFailureCode(code?: string): number {
  switch (code) {
    case 'MISSING_API_KEY':
      return 503;
    case 'INVALID_API_KEY':
      return 401;
    case 'PAID_MODEL_BLOCKED':
      return 403;
    case 'UNSUPPORTED_MODEL':
      return 400;
    case 'RATE_LIMIT_EXCEEDED':
    case 'QUOTA_EXCEEDED':
      return 429;
    case 'NETWORK_FAILURE':
    case 'INVALID_RESPONSE':
      return 502;
    case 'PROVIDER_ERROR':
      return 503;
    default:
      return 500;
  }
}

/**
 * GET /api/ai/gemini/health
 * Returns safe, non-secret Gemini configuration status for platform admins.
 * Pass ?verify=true to execute a live minimal connection test.
 */
export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin(request);

    const verify = request.nextUrl.searchParams.get('verify') === 'true';
    const configSummary = getSafeGeminiConfigSummary();

    if (!verify) {
      return NextResponse.json({
        success: true,
        provider: 'google-gemini',
        ...configSummary,
      });
    }

    const result = await runGeminiConnectionTest();
    return NextResponse.json(result, {
      status: result.ok ? 200 : statusForFailureCode(result.errorCode),
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      {
        status: 'GEMINI CONNECTION: FAILED',
        ok: false,
        errorCode: 'PROVIDER_ERROR',
        errorMessage: 'Failed to inspect Gemini configuration.',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/gemini/health
 * Runs a minimal backend-only Gemini free-tier text generation connection test.
 */
export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin(request);

    const rawBody = await request.json().catch(() => ({}));
    const parsed = ConnectionTestBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          status: 'GEMINI CONNECTION: FAILED',
          ok: false,
          errorCode: 'UNSUPPORTED_MODEL',
          errorMessage: 'Invalid request body for Gemini connection test.',
        },
        { status: 400 }
      );
    }

    const result = await runGeminiConnectionTest({
      model: parsed.data.model,
    });

    return NextResponse.json(result, {
      status: result.ok ? 200 : statusForFailureCode(result.errorCode),
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      {
        status: 'GEMINI CONNECTION: FAILED',
        ok: false,
        errorCode: 'PROVIDER_ERROR',
        errorMessage: 'Unexpected backend failure while testing Gemini connection.',
      },
      { status: 500 }
    );
  }
}
