import crypto from 'crypto';

export interface UcpDisputeRecord {
  protocolVersion: 'UCP/1.0';
  disputeId: string;
  orderAnchor: {
    externalPlatform: string;
    orderReference: string;
    amountMinor: number;
    currency: string;
  };
  evidenceMerkleRoot: string;
  contestedFacts: Array<{ claim: string; party: 'BUYER' | 'MERCHANT'; discrepancyScore: number }>;
  recommendedRemedy: string;
  timestamp: string;
  signature: string;
}

export interface Ap2PaymentMandate {
  protocolVersion: 'AP2/1.0';
  mandateId: string;
  debtorAgent: string;
  creditorAgent: string;
  maxAmountMinor: number;
  currency: string;
  settlementCondition: 'MUTUAL_DISPUTE_RESOLUTION_REACHED';
  humanApprovalProof: {
    approverId: string;
    approvalTimestamp: string;
    approvalSignature: string;
  };
}

export class UcpAp2ProtocolAdapter {
  /**
   * Generates a portable Universal Commerce Protocol dispute package.
   */
  public generateUcpDisputePackage(params: {
    caseId: string;
    externalOrderRef: string;
    amountMinor: number;
    currency: string;
    evidenceHashes: string[];
    contestedFacts: Array<{ claim: string; party: 'BUYER' | 'MERCHANT'; discrepancyScore: number }>;
    remedy: string;
    signingKey: string;
  }): UcpDisputeRecord {
    const combinedHashes = params.evidenceHashes.join(':');
    const evidenceMerkleRoot = crypto.createHash('sha256').update(combinedHashes).digest('hex');

    const timestamp = new Date().toISOString();
    const digest = `${params.caseId}:${params.externalOrderRef}:${evidenceMerkleRoot}:${timestamp}`;
    const signature = crypto.createHmac('sha256', params.signingKey).update(digest).digest('hex');

    return {
      protocolVersion: 'UCP/1.0',
      disputeId: `UCP_DSP_${params.caseId}`,
      orderAnchor: {
        externalPlatform: 'RESOLVEGRAPH_NODE',
        orderReference: params.externalOrderRef,
        amountMinor: params.amountMinor,
        currency: params.currency,
      },
      evidenceMerkleRoot,
      contestedFacts: params.contestedFacts,
      recommendedRemedy: params.remedy,
      timestamp,
      signature,
    };
  }

  /**
   * Validates AP2 Agent Payment Mandate proof of human sign-off.
   */
  public validateAp2Mandate(mandate: Ap2PaymentMandate, signingKey: string): boolean {
    if (mandate.protocolVersion !== 'AP2/1.0') return false;
    if (!mandate.humanApprovalProof?.approvalSignature) return false;

    const payload = `${mandate.mandateId}:${mandate.maxAmountMinor}:${mandate.humanApprovalProof.approverId}`;
    const expectedSig = crypto.createHmac('sha256', signingKey).update(payload).digest('hex');
    return mandate.humanApprovalProof.approvalSignature === expectedSig;
  }
}

export const ucpAp2Adapter = new UcpAp2ProtocolAdapter();
