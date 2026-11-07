import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { upiComplaintService } from "@/server/services/upi-complaint.service";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId") || undefined;
    const paymentProvider = searchParams.get("paymentProvider") || undefined;
    const complaintCategory = searchParams.get("complaintCategory") || undefined;

    const complaints = await upiComplaintService.listComplaints({
      caseId,
      paymentProvider,
      complaintCategory,
    });

    return NextResponse.json({
      success: true,
      complaints,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/payments/complaints GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const body = await request.json().catch(() => ({}));

    const {
      caseId,
      paymentProvider,
      transactionReference,
      amountMinor,
      currency,
      complaintCategory,
      senderVpa,
      recipientVpa,
      receiptEvidenceId,
    } = body;

    if (!paymentProvider || !transactionReference || typeof amountMinor !== 'number' || !complaintCategory) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: paymentProvider, transactionReference, amountMinor, complaintCategory are required.",
        },
        { status: 400 }
      );
    }

    const result = await upiComplaintService.registerComplaint({
      caseId,
      paymentProvider,
      transactionReference,
      amountMinor,
      currency,
      complaintCategory,
      senderVpa,
      recipientVpa,
      receiptEvidenceId,
    });

    return NextResponse.json(
      {
        success: true,
        complaint: result.complaint,
        guidance: result.guidance,
        verificationNotice: result.verificationNotice,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/payments/complaints POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
