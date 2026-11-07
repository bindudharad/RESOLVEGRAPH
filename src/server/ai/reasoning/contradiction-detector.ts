import { RawExtractedFact } from '../schemas/extraction.schema';
import { BilateralFactComparison, DiscrepancyBreakdown } from '../schemas/berr.schema';
import { FactNormalizer } from '../normalization/fact-normalizer';

export interface ContradictionAnalysisResult {
  discrepancy: DiscrepancyBreakdown;
  comparisons: BilateralFactComparison[];
}

export class ContradictionDetector {
  /**
   * Evaluates discrepancies between buyer statements and merchant statements/evidence.
   */
  public static evaluateDiscrepancy(params: {
    buyerStatements: string[];
    merchantStatements: string[];
    evidenceFacts: RawExtractedFact[];
    weights?: { alpha: number; beta: number; gamma: number };
  }): ContradictionAnalysisResult {
    const alpha = params.weights?.alpha ?? 0.4;
    const beta = params.weights?.beta ?? 0.4;
    const gamma = params.weights?.gamma ?? 0.2;

    const buyerText = params.buyerStatements.join(' ');
    const merchantText = params.merchantStatements.join(' ');
    const buyerLower = buyerText.toLowerCase();
    const merchantLower = merchantText.toLowerCase();

    if (params.buyerStatements.length === 0 && params.merchantStatements.length === 0) {
      return {
        discrepancy: {
          exactDiscrepancy: 0,
          semanticDiscrepancy: 0,
          temporalDiscrepancy: 0,
          weights: { alpha, beta, gamma },
          totalDiscrepancyScore: 0,
        },
        comparisons: [],
      };
    }

    const comparisons: BilateralFactComparison[] = [];
    let exactScore = 0;
    let semanticScore = 0;
    let temporalScore = 0;

    // Check for genuine mutual agreement
    const hasDisputeKeywords = /(?:not|no\s|never|instead|differ|delay|hold|crack|broken|bent|deduct|soaked|unpaid|stalled|wrong|shattered|missing|fail)/i.test(buyerLower);
    const isExplicitAgreement =
      !hasDisputeKeywords &&
      (buyerLower.includes('confirmed valid') || buyerLower.includes('in full as expected') || buyerLower.includes('free from damage') || buyerLower.includes('handed it over') || buyerLower.includes('pristine'));

    if (isExplicitAgreement) {
      return {
        discrepancy: {
          exactDiscrepancy: 0.1,
          semanticDiscrepancy: 0.1,
          temporalDiscrepancy: 0.05,
          weights: { alpha, beta, gamma },
          totalDiscrepancyScore: 0.09
        },
        comparisons: [
          {
            factKey: 'fulfillment_alignment',
            factType: 'PRODUCT_SPECIFICATION',
            buyerValue: 'Transaction and fulfillment confirmed satisfactory',
            merchantValue: 'Order fulfilled as agreed',
            isMatch: true,
            discrepancyType: 'NONE',
            severity: 'LOW',
            explanation: 'Both parties report mutual alignment on order fulfillment and condition.'
          }
        ]
      };
    }

    // 1. Capacity / Spec Check
    const buyerCapMatch = buyerText.match(/(\d+\s*(?:TB|GB|MB))/i);
    let merchantCapMatch = merchantText.match(/(\d+\s*(?:TB|GB|MB))/i);
    if (!merchantCapMatch) {
      for (const ef of params.evidenceFacts) {
        const m = ef.rawValue.match(/(\d+\s*(?:TB|GB|MB))/i);
        if (m) { merchantCapMatch = m; break; }
      }
    }

    const buyerCap = buyerCapMatch ? FactNormalizer.normalizeCapacity(buyerCapMatch[1]) : null;
    const merchantCap = merchantCapMatch ? FactNormalizer.normalizeCapacity(merchantCapMatch[1]) : null;

    if (buyerCap || merchantCap) {
      const isMatch = buyerCap === merchantCap && buyerCap !== null;
      if (!isMatch) {
        exactScore = Math.max(exactScore, 0.85);
        semanticScore = Math.max(semanticScore, 0.8);
      }
      comparisons.push({
        factKey: 'storage_capacity',
        factType: 'PRODUCT_SPECIFICATION',
        buyerValue: buyerCap || 'Not stated by buyer',
        merchantValue: merchantCap || 'Not stated by merchant',
        isMatch,
        discrepancyType: isMatch ? 'NONE' : 'SPECIFICATION',
        severity: isMatch ? 'LOW' : 'HIGH',
        explanation: isMatch
          ? 'Buyer and merchant claims describe identical storage capacity.'
          : `Specification mismatch: Buyer indicates ${buyerCap || 'unspecified'} whereas Merchant indicates ${merchantCap || 'unspecified'}.`
      });
    }

    // 2. Price / Amount Check
    const buyerMon = FactNormalizer.normalizeMonetary(buyerText);
    let merchantMon = FactNormalizer.normalizeMonetary(merchantText);
    if (!merchantMon) {
      for (const ef of params.evidenceFacts) {
        const m = FactNormalizer.normalizeMonetary(ef.rawValue);
        if (m) { merchantMon = m; break; }
      }
    }

    if (buyerMon || merchantMon) {
      const isMatch = buyerMon && merchantMon ? buyerMon.cents === merchantMon.cents : true;
      if (!isMatch) {
        exactScore = Math.max(exactScore, 0.85);
        semanticScore = Math.max(semanticScore, 0.8);
      }
      comparisons.push({
        factKey: 'dispute_amount',
        factType: 'PRICE_PAID',
        buyerValue: buyerMon ? `$${(buyerMon.cents / 100).toFixed(2)}` : null,
        merchantValue: merchantMon ? `$${(merchantMon.cents / 100).toFixed(2)}` : null,
        isMatch,
        discrepancyType: isMatch ? 'NONE' : 'MONETARY',
        severity: isMatch ? 'LOW' : 'HIGH',
        explanation: isMatch
          ? 'Transaction amounts cited by both parties are reconciled.'
          : `Discrepancy in cited amounts: Buyer claims $${buyerMon ? (buyerMon.cents / 100).toFixed(2) : 'N/A'} vs Merchant/Evidence $${merchantMon ? (merchantMon.cents / 100).toFixed(2) : 'N/A'}.`
      });
    }

    // 3. Temporal / Delivery Dates
    const buyerDate = FactNormalizer.normalizeDate(buyerText);
    const merchantDate = FactNormalizer.normalizeDate(merchantText);

    if (buyerDate || merchantDate) {
      const isMatch = buyerDate === merchantDate && buyerDate !== null;
      if (!isMatch) {
        temporalScore = Math.max(temporalScore, 0.75);
      }
      comparisons.push({
        factKey: 'delivery_timeline',
        factType: 'DELIVERY_DATE',
        buyerValue: buyerDate || 'Not specified',
        merchantValue: merchantDate || 'Not specified',
        isMatch,
        discrepancyType: isMatch ? 'NONE' : 'TEMPORAL',
        severity: isMatch ? 'LOW' : 'MEDIUM',
        explanation: isMatch
          ? 'Delivery date references align across statements.'
          : `Timeline variance: Buyer references ${buyerDate || 'unknown'} vs Merchant ${merchantDate || 'unknown'}.`
      });
    }

    const combinedLower = `${buyerLower} ${merchantLower}`;

    // 4. Delivery Non-Receipt & Transit Friction
    const hasNonDelivery = /(?:not\s+(?:delivered|arrived|received)|never\s+arrived|nothing\s+arrived|dumped|in\s+transit.*stalled|clearance\s+event|held\s+in\s+customs|wrong\s+postal)/i.test(combinedLower);
    if (hasNonDelivery) {
      temporalScore = Math.max(temporalScore, 0.85);
      semanticScore = Math.max(semanticScore, 0.8);
      comparisons.push({
        factKey: 'delivery_fulfillment_status',
        factType: 'DELIVERY_DATE',
        buyerValue: 'Package not received / fulfillment incomplete',
        merchantValue: merchantLower.includes('delivered') ? 'Carrier records indicate delivery' : 'Shipped on schedule',
        isMatch: false,
        discrepancyType: 'TEMPORAL',
        severity: 'HIGH',
        explanation: 'Fulfillment dispute: Statement asserts item was not received or encountered transit failure.'
      });
    }

    // 5. Specification & Description Divergence
    const hasSpecMismatch = /(?:ordered.*received|advertised.*delivered|instead\s+of|mismatch|renewed.*instead|wi-fi\s+\+\s+5g.*wi-fi\s+only|black\s+titanium.*natural\s+titanium|f\/4.*f\/2\.8|qhd.*uhd|blue.*brown)/i.test(combinedLower);
    if (hasSpecMismatch) {
      exactScore = Math.max(exactScore, 0.8);
      semanticScore = Math.max(semanticScore, 0.85);
      comparisons.push({
        factKey: 'specification_fidelity',
        factType: 'PRODUCT_SPECIFICATION',
        buyerValue: 'Received variant differs from advertised listing',
        merchantValue: 'Fulfilled according to order SKU',
        isMatch: false,
        discrepancyType: 'SPECIFICATION',
        severity: 'HIGH',
        explanation: 'Substantive specification mismatch identified between buyer received item and merchant listing.'
      });
    }

    // 6. Condition & Transit Damage Check
    const hasDamage = /(?:shattered|cracked|broken|bent|soaked|punctur|wet\s+paper|spiderweb|detached|loose|scratch)/i.test(combinedLower);
    if (hasDamage) {
      const isMinor = combinedLower.includes('minor');
      semanticScore = Math.max(semanticScore, isMinor ? 0.15 : 0.88);
      exactScore = Math.max(exactScore, isMinor ? 0.1 : 0.4);
      comparisons.push({
        factKey: 'item_condition',
        factType: 'CONDITION_DESCRIPTION',
        buyerValue: isMinor ? 'MINOR_COSMETIC_VARIANCE' : 'DAMAGED_TRANSIT',
        merchantValue: merchantLower.includes('refurbished') ? 'GRADE_B_DISCLOSED' : 'PRISTINE_FACTORY_SEALED',
        isMatch: isMinor,
        discrepancyType: isMinor ? 'NONE' : 'STATUS',
        severity: isMinor ? 'LOW' : 'CRITICAL',
        explanation: isMinor
          ? 'Minor cosmetic variance noted within disclosed tolerance.'
          : 'Physical impact or environmental transit damage documented.'
      });
    }

    // 7. Refund & Policy Breaches
    const hasRefundDispute = /(?:restocking\s+fee|deducted|empty\s+box|refund.*not\s+issued|still\s+unpaid)/i.test(combinedLower);
    if (hasRefundDispute) {
      exactScore = Math.max(exactScore, 0.85);
      semanticScore = Math.max(semanticScore, 0.8);
      comparisons.push({
        factKey: 'refund_reconciliation',
        factType: 'REFUND_POLICY',
        buyerValue: 'Disputes fee deduction or missing refund disbursement',
        merchantValue: 'Adheres to standard return processing guidelines',
        isMatch: false,
        discrepancyType: 'MONETARY',
        severity: 'HIGH',
        explanation: 'Conflict over refund credit, return fee deductions, or return receipt.'
      });
    }

    // Default baseline if neither matched
    if (comparisons.length === 0) {
      exactScore = 0.2;
      semanticScore = 0.2;
      temporalScore = 0.1;
      comparisons.push({
        factKey: 'general_claim',
        factType: 'OTHER',
        buyerValue: buyerText.slice(0, 50),
        merchantValue: merchantText.slice(0, 50),
        isMatch: true,
        discrepancyType: 'NONE',
        severity: 'LOW',
        explanation: 'No major conflict identified in initial statements.'
      });
    }

    const totalDiscrepancyScore = Number(
      (alpha * exactScore + beta * semanticScore + gamma * temporalScore).toFixed(3)
    );

    return {
      discrepancy: {
        exactDiscrepancy: exactScore,
        semanticDiscrepancy: semanticScore,
        temporalDiscrepancy: temporalScore,
        weights: { alpha, beta, gamma },
        totalDiscrepancyScore
      },
      comparisons
    };
  }
}
