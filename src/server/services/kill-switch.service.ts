/**
 * RESOLVEGRAPH Hackathon Expansion
 * Feature 09: Emergency Kill Switch Service
 * 
 * Provides backend-enforced administrative shutdown of:
 * - Outbound PayPal API operations
 * - External payment provider gateways
 * - Autonomous AI agent execution
 * - Outbound customer notifications
 */

import { prisma } from '@/lib/prisma';
import { HashChainedAuditService } from './hash-chained-audit.service';

export interface KillSwitchUpdateInput {
  isOutboundPayPalKilled?: boolean;
  isExternalProviderKilled?: boolean;
  isAutonomousAgentKilled?: boolean;
  isNotificationKilled?: boolean;
  reason: string;
  actorId: string;
}

export class KillSwitchService {
  private static readonly RECORD_ID = 'global_kill_switch';

  /**
   * Retrieves current kill switch status, seeding defaults if missing.
   */
  public static async getStatus() {
    let config = await prisma.killSwitchConfig.findUnique({
      where: { id: this.RECORD_ID },
    });

    if (!config) {
      config = await prisma.killSwitchConfig.create({
        data: {
          id: this.RECORD_ID,
          isOutboundPayPalKilled: false,
          isExternalProviderKilled: false,
          isAutonomousAgentKilled: false,
          isNotificationKilled: false,
          reason: 'Initial system boot default state',
        },
      });
    }

    return config;
  }

  /**
   * Updates kill switch flags and writes a cryptographic audit log.
   */
  public static async updateStatus(input: KillSwitchUpdateInput) {
    const previous = await this.getStatus();

    const updated = await prisma.killSwitchConfig.upsert({
      where: { id: this.RECORD_ID },
      update: {
        isOutboundPayPalKilled: input.isOutboundPayPalKilled ?? previous.isOutboundPayPalKilled,
        isExternalProviderKilled: input.isExternalProviderKilled ?? previous.isExternalProviderKilled,
        isAutonomousAgentKilled: input.isAutonomousAgentKilled ?? previous.isAutonomousAgentKilled,
        isNotificationKilled: input.isNotificationKilled ?? previous.isNotificationKilled,
        reason: input.reason,
        updatedById: input.actorId,
      },
      create: {
        id: this.RECORD_ID,
        isOutboundPayPalKilled: input.isOutboundPayPalKilled ?? false,
        isExternalProviderKilled: input.isExternalProviderKilled ?? false,
        isAutonomousAgentKilled: input.isAutonomousAgentKilled ?? false,
        isNotificationKilled: input.isNotificationKilled ?? false,
        reason: input.reason,
        updatedById: input.actorId,
      },
    });

    await HashChainedAuditService.recordEvent({
      action: 'KILL_SWITCH_UPDATED',
      actorId: input.actorId,
      resourceType: 'KillSwitchConfig',
      resourceId: this.RECORD_ID,
      details: {
        previousState: {
          payPalKilled: previous.isOutboundPayPalKilled,
          providersKilled: previous.isExternalProviderKilled,
          agentsKilled: previous.isAutonomousAgentKilled,
          notifsKilled: previous.isNotificationKilled,
        },
        newState: {
          payPalKilled: updated.isOutboundPayPalKilled,
          providersKilled: updated.isExternalProviderKilled,
          agentsKilled: updated.isAutonomousAgentKilled,
          notifsKilled: updated.isNotificationKilled,
        },
        reason: input.reason,
      },
    });

    return updated;
  }

  /**
   * Asserts outbound PayPal operations are permitted.
   * Throws Error if kill switch is active.
   */
  public static async assertPayPalAllowed() {
    const status = await this.getStatus();
    if (status.isOutboundPayPalKilled) {
      throw new Error(`Outbound PayPal operations blocked by administrative kill switch. Reason: ${status.reason || 'Safety lock active'}`);
    }
  }

  /**
   * Asserts external provider operations are permitted.
   */
  public static async assertProviderAllowed(providerName: string) {
    const status = await this.getStatus();
    if (status.isExternalProviderKilled) {
      throw new Error(`External provider ${providerName} blocked by administrative kill switch. Reason: ${status.reason || 'Safety lock active'}`);
    }
  }

  /**
   * Asserts automated agent actions are permitted.
   */
  public static async assertAgentAllowed() {
    const status = await this.getStatus();
    if (status.isAutonomousAgentKilled) {
      throw new Error(`Autonomous agent operations blocked by administrative kill switch. Reason: ${status.reason || 'Safety lock active'}`);
    }
  }

  /**
   * Asserts notification delivery is permitted.
   */
  public static async assertNotificationAllowed() {
    const status = await this.getStatus();
    if (status.isNotificationKilled) {
      throw new Error(`Notification dispatch blocked by administrative kill switch. Reason: ${status.reason || 'Safety lock active'}`);
    }
  }
}
