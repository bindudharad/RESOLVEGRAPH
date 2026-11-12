/**
 * RESOLVEGRAPH — Marketplace Communication Adapter & Help Centre Fallback Service
 *
 * Strictly enforces honest external integration boundaries:
 * - Never invents marketplace APIs or scrapes authenticated pages.
 * - Never claims an external request was delivered without real authorized API execution.
 * - Provides controlled official Help Centre URLs and copyable buyer messages when
 *   automatic marketplace communication is unavailable.
 */

import { marketplaceRegistry } from '@/server/integrations/marketplace/marketplace-registry';
import type { MarketplaceProvider } from '@/server/integrations/marketplace/marketplace.types';
import {
  MARKETPLACE_HELP_CENTRES,
  normalizeMarketplaceName,
  type NormalizedMarketplace,
  type RequestedEvidenceRequirement,
} from './seller.types';

export interface MarketplaceDispatchInput {
  caseNumber: string;
  orderId: string;
  marketplace: NormalizedMarketplace;
  sellerLegalName?: string | null;
  sellerMarketplaceId?: string | null;
  productName: string;
  complaintCategory: string;
  requestedItems: RequestedEvidenceRequirement[];
  idempotencyKey?: string;
}

export interface MarketplaceDispatchResult {
  available: boolean;
  delivered: boolean;
  executionStatus: 'DELIVERED' | 'PENDING' | 'UNSUPPORTED' | 'FAILED';
  externalReferenceId?: string;
  reason: string;
}

export interface MarketplaceCommunicationAdapter {
  readonly marketplace: NormalizedMarketplace;
  isAuthorizedForOutboundRequest(): { authorized: boolean; reason: string };
  sendEvidenceRequest(input: MarketplaceDispatchInput): Promise<MarketplaceDispatchResult>;
}

function mapToRegistryProvider(mp: NormalizedMarketplace): MarketplaceProvider | null {
  switch (mp) {
    case 'AMAZON':
      return 'AMAZON';
    case 'FLIPKART':
      return 'FLIPKART';
    case 'OLX':
      return 'OLX';
    case 'SHOPIFY':
      return 'SHOPIFY';
    case 'DIRECT':
      return 'CUSTOM_MERCHANT';
    default:
      return null;
  }
}

class DefaultMarketplaceCommunicationAdapter implements MarketplaceCommunicationAdapter {
  constructor(public readonly marketplace: NormalizedMarketplace) {}

  public isAuthorizedForOutboundRequest(): { authorized: boolean; reason: string } {
    const registryProvider = mapToRegistryProvider(this.marketplace);
    const registryAdapter = registryProvider
      ? marketplaceRegistry.getAdapter(registryProvider)
      : undefined;

    if (this.marketplace === 'AMAZON') {
      const hasCreds = Boolean(
        process.env.AMAZON_SP_API_CLIENT_ID?.trim() &&
          process.env.AMAZON_SP_API_CLIENT_SECRET?.trim() &&
          process.env.AMAZON_SP_API_MESSAGING_ENABLED === 'true'
      );
      if (!hasCreds) {
        return {
          authorized: false,
          reason: `Amazon adapter status is ${registryAdapter?.authorizationStatus ?? 'UNCONFIGURED'}: authorized outbound seller-evidence messaging credentials are not configured.`,
        };
      }
      return {
        authorized: false,
        reason: 'Amazon SP-API outbound buyer-dispute seller messaging endpoint is not connected in this environment.',
      };
    }

    if (this.marketplace === 'FLIPKART') {
      const hasCreds = Boolean(
        process.env.FLIPKART_APP_ID?.trim() &&
          process.env.FLIPKART_APP_SECRET?.trim() &&
          process.env.FLIPKART_MESSAGING_ENABLED === 'true'
      );
      if (!hasCreds) {
        return {
          authorized: false,
          reason: `Flipkart adapter status is ${registryAdapter?.authorizationStatus ?? 'UNCONFIGURED'}: no authorized Flipkart seller-communication API integration is available.`,
        };
      }
      return {
        authorized: false,
        reason: 'Flipkart Seller API does not expose an authorized third-party consumer complaint outreach endpoint in this environment.',
      };
    }

    if (this.marketplace === 'OLX' || this.marketplace === 'MEESHO' || this.marketplace === 'MYNTRA') {
      return {
        authorized: false,
        reason: `${MARKETPLACE_HELP_CENTRES[this.marketplace].displayName} does not provide an authorized public API for automated seller evidence requests.`,
      };
    }

    return {
      authorized: false,
      reason: `Automatic marketplace seller communication is unavailable for ${this.marketplace}.`,
    };
  }

  public async sendEvidenceRequest(
    _input: MarketplaceDispatchInput
  ): Promise<MarketplaceDispatchResult> {
    void _input;
    const authCheck = this.isAuthorizedForOutboundRequest();
    return {
      available: false,
      delivered: false,
      executionStatus: 'UNSUPPORTED',
      reason: authCheck.reason,
    };
  }
}

export class MarketplaceCommunicationService {
  private static customAdapters = new Map<
    NormalizedMarketplace,
    MarketplaceCommunicationAdapter
  >();

  public static registerAdapter(adapter: MarketplaceCommunicationAdapter): void {
    this.customAdapters.set(adapter.marketplace, adapter);
  }

  public static resetAdaptersForTesting(): void {
    this.customAdapters.clear();
  }

  public static getAdapter(rawMarketplace: string): MarketplaceCommunicationAdapter {
    const mp = normalizeMarketplaceName(rawMarketplace);
    return this.customAdapters.get(mp) ?? new DefaultMarketplaceCommunicationAdapter(mp);
  }

  public static getHelpCentreConfig(rawMarketplace: string) {
    const mp = normalizeMarketplaceName(rawMarketplace);
    return MARKETPLACE_HELP_CENTRES[mp] ?? MARKETPLACE_HELP_CENTRES.OTHER;
  }

  /**
   * Prepares a factual, buyer-copyable message for submitting through the marketplace's
   * official order-support channel when no registered seller portal or API is available.
   */
  public static buildCustomerAssistedMessage(input: {
    caseNumber: string;
    marketplace: string;
    orderId: string;
    productName: string;
    sellerName?: string | null;
    complaintCategory: string;
    requestedItems: RequestedEvidenceRequirement[];
  }): string {
    const mpConfig = this.getHelpCentreConfig(input.marketplace);
    const itemsText = input.requestedItems
      .map((item, idx) => `${idx + 1}. ${item.label}: ${item.description}`)
      .join('\n');

    return [
      `Subject: Seller Verification & Evidence Request — Order ${input.orderId} (${mpConfig.displayName})`,
      '',
      `Hello ${mpConfig.displayName} Support Team,`,
      '',
      `I am requesting seller verification details for my order (${input.orderId}) concerning "${input.productName}".`,
      input.sellerName ? `Identified Seller on Invoice/Order: ${input.sellerName}` : null,
      `Issue Category: ${input.complaintCategory}`,
      `RESOLVEGRAPH Case Reference: ${input.caseNumber}`,
      '',
      'Please request the seller to confirm and provide any available records from the following:',
      itemsText,
      '',
      'Please share the seller response or reference number through this support ticket so I can upload it to my complaint record.',
    ]
      .filter((line) => line !== null)
      .join('\n');
  }
}
