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

    const where: any = {};
    if (caseId) where.caseId = caseId;
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

    if (!body.provider || body.grossAmountMinor === undefined) {
      return NextResponse.json({ error: 'provider and grossAmountMinor are required.' }, { status: 400 });
    }

    const tx = await CanonicalTransactionService.createCanonicalTransaction({
      caseId: body.caseId,
      provider: body.provider.toUpperCase(),
      providerTxId: body.providerTxId,
      externalReference: body.externalReference,
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

    return NextResponse.json({ success: true, data: tx }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Failed to create canonical transaction' }, { status: 500 });
  }
}
