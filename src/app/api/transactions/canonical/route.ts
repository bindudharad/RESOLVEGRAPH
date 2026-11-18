/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { prisma } from '@/lib/prisma';
import {
  CanonicalTransactionService,
  SUPPORTED_CANONICAL_PROVIDERS,
  isSupportedProvider,
  CanonicalProvider,
} from '@/server/services/canonical-transaction.service';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const caseId = searchParams.get('caseId') || undefined;
    const provider = searchParams.get('provider') || undefined;
    const status = searchParams.get('status') || undefined;

    let resolvedCaseId = caseId;
    if (resolvedCaseId) {
      const foundCase = await prisma.caseRecord.findFirst({
        where: {
          OR: [
            { id: resolvedCaseId },
            { caseNumber: resolvedCaseId },
          ],
        },
        select: { id: true },
      });
      if (foundCase) {
        resolvedCaseId = foundCase.id;
      }
    }

    const where: any = {};
    if (resolvedCaseId) where.caseId = resolvedCaseId;
    if (provider) where.provider = provider.toUpperCase();
    if (status) where.normalizedStatus = status.toUpperCase();

    const transactions = await prisma.canonicalTransaction.findMany({
      where,
      include: {
        sourceRecords: true,
        matchingDecisions: true,
        mismatches: true,
      },
      orderBy: { transactionTimestamp: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, count: transactions.length, data: transactions });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Failed to list transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const body = await request.json();

    // 1. Validate Provider
    if (!body.provider || typeof body.provider !== 'string') {
      return NextResponse.json({ error: 'provider is required.' }, { status: 400 });
    }
    const rawProvider = body.provider.trim().toUpperCase();
    if (!isSupportedProvider(rawProvider)) {
      return NextResponse.json(
        {
          error: `Unsupported provider "${body.provider}". Supported providers: ${SUPPORTED_CANONICAL_PROVIDERS.join(', ')}.`,
        },
        { status: 400 }
      );
    }
    const provider: CanonicalProvider = rawProvider as CanonicalProvider;

    // 2. Validate grossAmountMinor
    if (body.grossAmountMinor === undefined || body.grossAmountMinor === null) {
      return NextResponse.json({ error: 'grossAmountMinor is required.' }, { status: 400 });
    }
    const grossAmount = Number(body.grossAmountMinor);
    if (!Number.isFinite(grossAmount) || !Number.isInteger(grossAmount)) {
      return NextResponse.json(
        { error: 'grossAmountMinor must be an integer minor currency unit.' },
        { status: 400 }
      );
    }
    if (grossAmount === 0) {
      return NextResponse.json({ error: 'grossAmountMinor cannot be zero.' }, { status: 400 });
    }
    if (grossAmount < 0) {
      return NextResponse.json({ error: 'grossAmountMinor cannot be negative.' }, { status: 400 });
    }

    // 3. Validate feeAmountMinor if provided
    let feeAmount = 0;
    if (body.feeAmountMinor !== undefined && body.feeAmountMinor !== null) {
      const parsedFee = Number(body.feeAmountMinor);
      if (!Number.isFinite(parsedFee) || !Number.isInteger(parsedFee) || parsedFee < 0) {
        return NextResponse.json(
          { error: 'feeAmountMinor must be a non-negative integer.' },
          { status: 400 }
        );
      }
      feeAmount = parsedFee;
    }

    // 4. Validate currency if provided
    let currency = 'INR';
    if (body.currency) {
      const curStr = String(body.currency).trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(curStr)) {
        return NextResponse.json(
          { error: 'currency must be a valid 3-letter ISO code (e.g. INR, USD, EUR).' },
          { status: 400 }
        );
      }
      currency = curStr;
    }

    // 5. Prevent duplicate transaction references for the same provider
    const externalRef = body.externalReference || body.canonicalReference;
    const providerTxId = body.providerTxId;
    const refToCheck = providerTxId || externalRef;

    if (refToCheck) {
      const existing = await prisma.canonicalTransaction.findFirst({
        where: {
          provider,
          OR: [
            { providerTxId: refToCheck },
            { externalReference: refToCheck },
          ],
        },
        select: { id: true, provider: true, providerTxId: true, externalReference: true },
      });
      if (existing) {
        return NextResponse.json(
          {
            error: `Transaction with reference "${refToCheck}" already exists for provider ${provider}.`,
            existingId: existing.id,
          },
          { status: 409 }
        );
      }
    }

    // 6. Resolve Case ID to cuid if supplied
    let resolvedCaseId: string | undefined = undefined;
    if (body.caseId) {
      const foundCase = await prisma.caseRecord.findFirst({
        where: {
          OR: [
            { id: body.caseId },
            { caseNumber: body.caseId },
          ],
        },
        select: { id: true },
      });
      if (foundCase) {
        resolvedCaseId = foundCase.id;
      }
    }

    // 7. Validate source records if provided
    if (body.sourceRecords !== undefined) {
      if (!Array.isArray(body.sourceRecords)) {
        return NextResponse.json({ error: 'sourceRecords must be an array.' }, { status: 400 });
      }
      for (const rec of body.sourceRecords) {
        if (!rec || typeof rec !== 'object') {
          return NextResponse.json(
            { error: 'Each item in sourceRecords must be an object.' },
            { status: 400 }
          );
        }
        if (rec.claimedAmountMinor !== undefined && rec.claimedAmountMinor !== null) {
          const sAmt = Number(rec.claimedAmountMinor);
          if (!Number.isFinite(sAmt) || !Number.isInteger(sAmt)) {
            return NextResponse.json(
              { error: 'sourceRecord claimedAmountMinor must be an integer.' },
              { status: 400 }
            );
          }
        }
      }
    }

    const tx = await CanonicalTransactionService.createCanonicalTransaction({
      caseId: resolvedCaseId,
      provider,
      providerTxId,
      externalReference: externalRef,
      payerReference: body.payerReference,
      payeeReference: body.payeeReference,
      merchantName: body.merchantName,
      orderReference: body.orderReference,
      grossAmountMinor: grossAmount,
      feeAmountMinor: feeAmount,
      currency,
      originalStatus: body.originalStatus || 'COMPLETED',
      transactionTimestamp: body.transactionTimestamp ? new Date(body.transactionTimestamp) : new Date(),
      metadata: body.metadata,
    });

    if (Array.isArray(body.sourceRecords) && body.sourceRecords.length > 0) {
      for (const rec of body.sourceRecords) {
        await CanonicalTransactionService.recordSourceObservation({
          caseId: resolvedCaseId,
          canonicalTransactionId: tx.id,
          sourceType: rec.sourceType || 'PAYMENT_GATEWAY',
          sourceName: rec.providerName || rec.sourceName || provider,
          referenceId: rec.claimedReference || rec.referenceId || `REF-${Date.now()}`,
          amountMinor: rec.claimedAmountMinor ?? rec.amountMinor ?? tx.grossAmountMinor,
          currency: rec.claimedCurrency || rec.currency || tx.currency,
          reportedStatus: rec.claimedStatus || rec.reportedStatus || 'COMPLETED',
          reportedAt: rec.reportedAt ? new Date(rec.reportedAt) : new Date(),
        });
      }
    }

    return NextResponse.json({ success: true, data: tx }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Failed to create canonical transaction' }, { status: 500 });
  }
}
