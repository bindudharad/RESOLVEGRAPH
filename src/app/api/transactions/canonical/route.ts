/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { prisma } from '@/lib/prisma';
import { CanonicalTransactionService } from '@/server/services/canonical-transaction.service';

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

    const provider = body.provider || 'PAYPAL';
    if (body.grossAmountMinor === undefined) {
      return NextResponse.json({ error: 'provider and grossAmountMinor are required.' }, { status: 400 });
    }

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

    const tx = await CanonicalTransactionService.createCanonicalTransaction({
      caseId: resolvedCaseId,
      provider: provider.toUpperCase(),
      providerTxId: body.providerTxId,
      externalReference: body.externalReference || body.canonicalReference,
      payerReference: body.payerReference,
      payeeReference: body.payeeReference,
      merchantName: body.merchantName,
      orderReference: body.orderReference,
      grossAmountMinor: parseInt(String(body.grossAmountMinor), 10),
      feeAmountMinor: body.feeAmountMinor ? parseInt(String(body.feeAmountMinor), 10) : 0,
      currency: body.currency || 'INR',
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
