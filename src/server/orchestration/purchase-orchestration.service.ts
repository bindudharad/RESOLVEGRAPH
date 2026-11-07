import { prisma } from "@/lib/prisma";
import { OrderService, CreateCommerceOrderInput } from "../paypal/services/order.service";
import { EventOrchestrationService } from "./event-orchestration.service";
import { EventType } from "@/generated/prisma/client";

export class PurchaseOrchestrationService {
  /**
   * Coordinates the creation of a validated commerce order with items in minor units.
   */
  public static async createOrderWithItems(input: CreateCommerceOrderInput) {
    if (!input.items || input.items.length === 0) {
      throw new Error("Order must contain at least one line item.");
    }

    // Verify minor unit calculations
    let calculatedTotal = 0;
    for (const item of input.items) {
      if (item.unitAmountMinor <= 0) {
        throw new Error(`Item ${item.title} must have a positive unitAmountMinor.`);
      }
      if (item.quantity <= 0) {
        throw new Error(`Item ${item.title} must have a positive quantity.`);
      }
      calculatedTotal += item.unitAmountMinor * item.quantity;
    }

    const { order, payment, paypalOrder } = await OrderService.createOrder({
      ...input,
    });

    const paypalOrderId = paypalOrder?.id || payment?.providerOrderId;
    const approveUrl = paypalOrder?.links?.find((l: { rel: string; href: string }) => l.rel === "approve")?.href;

    if (input.caseId) {
      await EventOrchestrationService.recordCaseEvent({
        caseId: input.caseId,
        eventType: EventType.ORDER_CREATED,
        actorId: input.buyerId,
        description: `Commerce Order ${order.orderNumber} ($${(calculatedTotal / 100).toFixed(2)}) linked to case.`,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          totalAmountMinor: calculatedTotal,
          paypalOrderId,
        },
      });

      await EventOrchestrationService.recordTimelineEvent({
        caseId: input.caseId,
        eventType: "ORDER_CREATED",
        title: `Order Created: ${order.orderNumber}`,
        description: `Purchased items totaling $${(calculatedTotal / 100).toFixed(2)}`,
        occurredAt: order.createdAt,
        timeBasis: "SYSTEM_OBSERVED",
        sourceParty: "BUYER",
        actorId: input.buyerId,
      });
    }

    return { order, payment, paypalOrderId, approveUrl };
  }

  /**
   * Associates an existing commerce order with a dispute case.
   */
  public static async linkOrderToCase(orderId: string, caseId: string, actorId?: string) {
    const updated = await prisma.commerceOrder.update({
      where: { id: orderId },
      data: { caseId },
    });

    await EventOrchestrationService.recordCaseEvent({
      caseId,
      eventType: EventType.ORDER_CREATED,
      actorId,
      description: `Linked existing commerce order ${updated.orderNumber} to this dispute case.`,
      metadata: { orderId: updated.id, orderNumber: updated.orderNumber },
    });

    return updated;
  }

  /**
   * Retrieves full details for an order including line items, payments, refunds, and disputes.
   */
  public static async getOrderDetails(orderId: string) {
    return prisma.commerceOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        buyer: {
          select: { id: true, fullName: true, email: true },
        },
        merchantOrganization: true,
        case: true,
        payments: {
          include: {
            refunds: true,
            disputes: true,
          },
        },
      },
    });
  }

  /**
   * Returns all orders associated with a dispute case.
   */
  public static async getOrdersForCase(caseId: string) {
    return prisma.commerceOrder.findMany({
      where: { caseId },
      include: {
        items: true,
        payments: {
          include: {
            refunds: true,
            disputes: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
