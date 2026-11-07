import { prisma } from '@/lib/prisma';

export interface RegisterUpiComplaintInput {
  caseId?: string;
  paymentProvider:
    | 'PHONEPE'
    | 'GOOGLE_PAY'
    | 'PAYTM'
    | 'BHIM'
    | 'OTHER_UPI'
    | 'BANK_TRANSFER'
    | 'PAYPAL';
  transactionReference: string; // 12-digit UTR, RRN, or reference
  amountMinor: number;
  currency?: string;
  complaintCategory:
    | 'FAILED_PAYMENT'
    | 'PENDING_PAYMENT'
    | 'DEBITED_NOT_CREDITED'
    | 'DUPLICATE_PAYMENT'
    | 'WRONG_RECIPIENT'
    | 'UNAUTHORIZED_TRANSACTION'
    | 'REFUND_PENDING'
    | 'MERCHANT_DISAGREEMENT';
  senderVpa?: string;
  recipientVpa?: string;
  receiptEvidenceId?: string;
}

export interface EscalationGuidance {
  requiresImmediateAction: boolean;
  regulatoryFramework: string;
  recommendedActions: string[];
  helplines: { name: string; contact: string; url?: string }[];
  tatSummary: string;
  disclaimer: string;
}

export class UpiComplaintService {
  /**
   * Generates honest, compliance-grounded escalation guidance based on complaint category.
   */
  public generateEscalationGuidance(
    category: RegisterUpiComplaintInput['complaintCategory'],
    provider: string,
    reference: string
  ): EscalationGuidance {
    const disclaimer =
      'NOTICE: Status is CUSTOMER_SUBMITTED. ResolveGraph records customer-submitted claims and does not perform autonomous bank clearing. All bank-level reversals require customer escalation through official banking channels.';

    if (category === 'UNAUTHORIZED_TRANSACTION') {
      return {
        requiresImmediateAction: true,
        regulatoryFramework:
          'RBI Circular RBI/2017-18/15 (Zero Liability of a Customer in Unauthorized Electronic Banking Transactions)',
        recommendedActions: [
          'IMMEDIATE ACTION: Block your UPI profile and freeze linked bank accounts via your mobile banking app or branch hotline.',
          'NOTIFY BANK WITHIN 72 HOURS: Under RBI guidelines, customer liability is ZERO if unauthorized fraud is reported within 3 working days.',
          `Report reference ${reference} to your issuing bank and requesting immediate chargeback / recall.`,
          'FILE CYBERCRIME REPORT: File a complaint on the National Cyber Crime Reporting Portal or call 1930 immediately.',
          'LODGE NPCI DISPUTE: Visit NPCI Dispute Redressal Mechanism portal to register the dispute against the PSP app.',
        ],
        helplines: [
          { name: 'National Cyber Crime Helpline', contact: '1930', url: 'https://cybercrime.gov.in' },
          { name: 'NPCI UPI Dispute Portal', contact: 'Online Form', url: 'https://www.npci.org.in/what-we-do/upi/dispute-redressal-mechanism' },
          { name: 'RBI Ombudsman Portal (CMS)', contact: 'Online CMS', url: 'https://cms.rbi.org.in' },
        ],
        tatSummary:
          'Crucial: Notify your bank within 3 working days to secure zero customer liability protections.',
        disclaimer,
      };
    }

    if (category === 'DEBITED_NOT_CREDITED' || category === 'FAILED_PAYMENT') {
      return {
        requiresImmediateAction: false,
        regulatoryFramework:
          'RBI Circular DPSS.CO.PD No.629/02.01.014/2019-20 (Harmonisation of Turn Around Time - TAT and customer compensation for failed transactions)',
        recommendedActions: [
          'WAIT FOR AUTO-REVERSAL: Under NPCI / RBI guidelines, failed UPI transactions where money is debited must be auto-credited back to the customer within T+1 day.',
          `If funds are not reversed within T+1 day, share UTR ${reference} with your bank's customer grievance officer.`,
          'COMPENSATION ENTITLEMENT: If the bank fails to reverse within T+1 day, the customer is entitled to compensation of ₹100 per day of delay.',
          'ESCALATE: If unresolved after 30 days, submit a complaint to the RBI Ombudsman.',
        ],
        helplines: [
          { name: `${provider} Customer Support`, contact: 'In-app Help section' },
          { name: 'NPCI UPI Dispute Portal', contact: 'Online Form', url: 'https://www.npci.org.in/what-we-do/upi/dispute-redressal-mechanism' },
        ],
        tatSummary: 'Auto-reversal expected within T+1 day. Compensation of ₹100/day applies thereafter.',
        disclaimer,
      };
    }

    if (category === 'DUPLICATE_PAYMENT') {
      return {
        requiresImmediateAction: false,
        regulatoryFramework: 'Merchant Bilateral Settlement & Reconciliation Protocol',
        recommendedActions: [
          `Share duplicate transaction reference ${reference} in the ResolveGraph Shared Resolution Room.`,
          'Merchant must cross-reference payment gateway statements against the dual debits.',
          'Merchant or gateway should initiate direct credit adjustment for the second transaction.',
        ],
        helplines: [
          { name: 'ResolveGraph Shared Resolution Room', contact: 'Case Discussion Tab' },
        ],
        tatSummary: 'Standard bilateral reconciliation window is 2-4 business days.',
        disclaimer,
      };
    }

    // Default guidance for wrong recipient, refund pending, merchant disagreement
    return {
      requiresImmediateAction: false,
      regulatoryFramework: 'Payment and Settlement Systems Act / Consumer Protection Act, 2019',
      recommendedActions: [
        `Record transaction reference ${reference} in case dispute evidence.`,
        'Engage directly with the merchant in the Shared Resolution Room with bank receipt evidence.',
        'If merchant fails to respond within 7 days, request bilateral mediation or platform resolution.',
      ],
      helplines: [
        { name: 'National Consumer Helpline', contact: '1915', url: 'https://consumerhelpline.gov.in' },
      ],
      tatSummary: 'Bilateral dispute resolution period: up to 14 days.',
      disclaimer,
    };
  }

  /**
   * Registers a customer-submitted payment complaint.
   * Enforces honest state labeling (CUSTOMER_SUBMITTED).
   */
  public async registerComplaint(input: RegisterUpiComplaintInput) {
    if (!input.transactionReference || input.transactionReference.trim().length === 0) {
      throw new Error('Transaction reference (UTR/RRN/ID) is required');
    }

    if (input.amountMinor <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    if (input.caseId) {
      const caseExists = await prisma.caseRecord.findUnique({
        where: { id: input.caseId },
      });
      if (!caseExists) {
        throw new Error(`Case with ID ${input.caseId} not found`);
      }
    }

    const guidance = this.generateEscalationGuidance(
      input.complaintCategory,
      input.paymentProvider,
      input.transactionReference.trim()
    );

    const complaint = await prisma.paymentComplaint.create({
      data: {
        caseId: input.caseId || null,
        paymentProvider: input.paymentProvider,
        transactionReference: input.transactionReference.trim(),
        amountMinor: input.amountMinor,
        currency: input.currency?.toUpperCase() || 'INR',
        complaintCategory: input.complaintCategory,
        senderVpa: input.senderVpa?.trim() || null,
        recipientVpa: input.recipientVpa?.trim() || null,
        receiptEvidenceId: input.receiptEvidenceId || null,
        providerVerificationStatus: 'CUSTOMER_SUBMITTED', // Honest labeling
        escalationGuidanceProvided: true,
      },
    });

    return {
      complaint,
      guidance,
      verificationNotice:
        'Recorded as CUSTOMER_SUBMITTED. ResolveGraph does not claim banking authorization without active bank gateway integration.',
    };
  }

  /**
   * Retrieves complaints with optional filters.
   */
  public async listComplaints(filters?: {
    caseId?: string;
    paymentProvider?: string;
    complaintCategory?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.caseId) where.caseId = filters.caseId;
    if (filters?.paymentProvider) where.paymentProvider = filters.paymentProvider;
    if (filters?.complaintCategory) where.complaintCategory = filters.complaintCategory;

    return prisma.paymentComplaint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        case: {
          select: {
            id: true,
            title: true,
            caseNumber: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Retrieves a single complaint by ID with its escalation guidance.
   */
  public async getComplaintById(id: string) {
    const complaint = await prisma.paymentComplaint.findUnique({
      where: { id },
      include: {
        case: {
          select: {
            id: true,
            title: true,
            caseNumber: true,
            status: true,
          },
        },
      },
    });

    if (!complaint) return null;

    const guidance = this.generateEscalationGuidance(
      complaint.complaintCategory as RegisterUpiComplaintInput['complaintCategory'],
      complaint.paymentProvider,
      complaint.transactionReference
    );

    return {
      complaint,
      guidance,
    };
  }
}

export const upiComplaintService = new UpiComplaintService();
