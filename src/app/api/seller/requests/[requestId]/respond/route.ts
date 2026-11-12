/**
 * RESOLVEGRAPH — Seller Evidence Response Submission API
 *
 * POST /api/seller/requests/[requestId]/respond
 * Accepts multipart/form-data (real file uploads + structured JSON payload) or application/json.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { EvidenceStorageError } from '@/server/storage/evidence-storage';
import {
  SellerResponseService,
  SellerPortalAccessError,
  type RequestedItemResponseStatus,
  type SellerResponseStance,
} from '@/server/seller';

const VALID_STANCES = new Set<SellerResponseStance>([
  'AGREE',
  'DISAGREE',
  'CLARIFICATION_ONLY',
  'PARTIAL_AGREEMENT',
]);

const VALID_ITEM_STATUSES = new Set<RequestedItemResponseStatus>([
  'PENDING',
  'PROVIDED',
  'NOT_AVAILABLE',
  'NOT_APPLICABLE',
  'EXPLANATION_REQUIRED',
]);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { requestId } = await context.params;

    const contentType = request.headers.get('content-type') || '';

    let stance: SellerResponseStance = 'CLARIFICATION_ONLY';
    let summary = '';
    let additionalRemarks: string | undefined;
    let structuredDetails:
      | { productAndPacking?: Record<string, string>; dispatchAndSettlement?: Record<string, string> }
      | undefined;
    let declarationConfirmed = false;
    let idempotencyKey: string | undefined;
    let itemResponses: Array<{
      key: string;
      status: RequestedItemResponseStatus;
      note?: string;
    }> = [];
    const uploadedFiles: Array<{
      buffer: Buffer;
      filename: string;
      mimeType: string;
      requestedItemKey?: string;
      evidenceType?: string;
      description?: string;
      visibility?: 'SHARED_WITH_PARTICIPANTS' | 'MERCHANT_ONLY';
    }> = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const rawPayload = formData.get('payload');
      const parsedPayload =
        typeof rawPayload === 'string' && rawPayload.trim()
          ? JSON.parse(rawPayload)
          : {};

      const rawStance = String(
        parsedPayload.stance || formData.get('stance') || 'CLARIFICATION_ONLY'
      ).toUpperCase();
      if (!VALID_STANCES.has(rawStance as SellerResponseStance)) {
        return NextResponse.json({ error: `Invalid stance "${rawStance}".` }, { status: 400 });
      }
      stance = rawStance as SellerResponseStance;
      summary = String(parsedPayload.summary || formData.get('summary') || '').trim();
      additionalRemarks =
        parsedPayload.additionalRemarks ||
        (typeof formData.get('additionalRemarks') === 'string'
          ? (formData.get('additionalRemarks') as string)
          : undefined);
      structuredDetails =
        parsedPayload.structuredDetails && typeof parsedPayload.structuredDetails === 'object'
          ? parsedPayload.structuredDetails
          : undefined;
      declarationConfirmed =
        Boolean(parsedPayload.declarationConfirmed) ||
        formData.get('declarationConfirmed') === 'true';
      idempotencyKey =
        parsedPayload.idempotencyKey ||
        (typeof formData.get('idempotencyKey') === 'string'
          ? (formData.get('idempotencyKey') as string)
          : undefined);

      const rawItems = Array.isArray(parsedPayload.itemResponses)
        ? parsedPayload.itemResponses
        : (() => {
            const field = formData.get('itemResponses');
            if (typeof field === 'string' && field.trim()) return JSON.parse(field);
            return [];
          })();

      itemResponses = rawItems.map((it: { key?: unknown; status?: unknown; note?: unknown }) => {
        const st = String(it.status || 'PENDING') as RequestedItemResponseStatus;
        return {
          key: String(it.key || ''),
          status: VALID_ITEM_STATUSES.has(st) ? st : 'PENDING',
          note: typeof it.note === 'string' ? it.note : undefined,
        };
      });

      const fileMetaRaw = Array.isArray(parsedPayload.fileMetadata)
        ? parsedPayload.fileMetadata
        : [];

      const rawFiles = formData.getAll('files');
      for (let idx = 0; idx < rawFiles.length; idx++) {
        const f = rawFiles[idx];
        if (typeof f === 'object' && f !== null && 'arrayBuffer' in f) {
          const fileObj = f as File;
          if (fileObj.size === 0) continue;
          const meta = fileMetaRaw[idx] || {};
          uploadedFiles.push({
            buffer: Buffer.from(await fileObj.arrayBuffer()),
            filename: fileObj.name || `seller-evidence-${idx + 1}.pdf`,
            mimeType: fileObj.type || 'application/octet-stream',
            requestedItemKey:
              typeof meta.requestedItemKey === 'string'
                ? meta.requestedItemKey
                : (formData.get(`fileItemKey_${idx}`) as string) || undefined,
            evidenceType:
              typeof meta.evidenceType === 'string' ? meta.evidenceType : undefined,
            description:
              typeof meta.description === 'string' ? meta.description : undefined,
            visibility:
              meta.visibility === 'MERCHANT_ONLY'
                ? 'MERCHANT_ONLY'
                : 'SHARED_WITH_PARTICIPANTS',
          });
        }
      }
    } else {
      const body = await request.json();
      const rawStance = String(body.stance || 'CLARIFICATION_ONLY').toUpperCase();
      if (!VALID_STANCES.has(rawStance as SellerResponseStance)) {
        return NextResponse.json({ error: `Invalid stance "${rawStance}".` }, { status: 400 });
      }
      stance = rawStance as SellerResponseStance;
      summary = String(body.summary || '').trim();
      additionalRemarks =
        typeof body.additionalRemarks === 'string' ? body.additionalRemarks : undefined;
      structuredDetails =
        body.structuredDetails && typeof body.structuredDetails === 'object'
          ? body.structuredDetails
          : undefined;
      declarationConfirmed = Boolean(body.declarationConfirmed);
      idempotencyKey =
        typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined;

      if (Array.isArray(body.itemResponses)) {
        itemResponses = body.itemResponses.map(
          (it: { key?: unknown; status?: unknown; note?: unknown }) => {
            const st = String(it.status || 'PENDING') as RequestedItemResponseStatus;
            return {
              key: String(it.key || ''),
              status: VALID_ITEM_STATUSES.has(st) ? st : 'PENDING',
              note: typeof it.note === 'string' ? it.note : undefined,
            };
          }
        );
      }

      if (Array.isArray(body.files)) {
        for (const f of body.files) {
          if (f?.contentBase64 && f?.filename) {
            uploadedFiles.push({
              buffer: Buffer.from(String(f.contentBase64), 'base64'),
              filename: String(f.filename),
              mimeType: String(f.mimeType || 'application/pdf'),
              requestedItemKey:
                typeof f.requestedItemKey === 'string' ? f.requestedItemKey : undefined,
              evidenceType:
                typeof f.evidenceType === 'string' ? f.evidenceType : undefined,
              description:
                typeof f.description === 'string' ? f.description : undefined,
              visibility:
                f.visibility === 'MERCHANT_ONLY'
                  ? 'MERCHANT_ONLY'
                  : 'SHARED_WITH_PARTICIPANTS',
            });
          }
        }
      }
    }

    const result = await SellerResponseService.submitSellerResponse({
      requestId,
      user,
      stance,
      summary,
      additionalRemarks,
      structuredDetails,
      itemResponses,
      files: uploadedFiles,
      declarationConfirmed,
      idempotencyKey,
    });

    return NextResponse.json({ success: true, response: result }, { status: 201 });
  } catch (err) {
    if (
      err instanceof AuthError ||
      err instanceof SellerPortalAccessError ||
      err instanceof EvidenceStorageError
    ) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('POST /api/seller/requests/[requestId]/respond error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to submit seller response' },
      { status: 500 }
    );
  }
}
