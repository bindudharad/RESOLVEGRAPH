/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { PayPalProviderFactory } from '../paypal-provider.factory';
import { IdempotencyService } from '../utils/idempotency';
import { CaseService } from '@/server/services/case.service';
import { EventType } from '@/generated/prisma/client';

export interface CreateCommerceOrderItemInput {
  productReference: string;
  sku?: string;
  title: string;
  quantity: number;
  unitAmountMinor: number;
}

export interface CreateCommerceOrderInput {
  buyerId: string;
  merchantOrganizationId: string;
  currency?: string;
  items: CreateCommerceOrderItemInput[];
  caseId?: string;
  customId?: string;
  invoiceId?: string;
  returnUrl?: string;
  cancelUrl?: string;
  idempotencyKey?: string;
}

export class OrderService {
  /**
   * Generates a unique, human-readable order number.
   */
  public static generateOrderNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${dateStr}-${rand}`;
  }

  /**
   * Creates an internal CommerceOrder and initializes the PayPal Order v2 checkout session.
   */
  public static async createOrder(input: CreateCommerceOrderInput) {
    if (!input.items || input.items.length === 0) {
      throw new Error('Order must contain at least one line item.');
    }

    const currency = (input.currency || 'USD').toUpperCase();

    // Verify buyer and merchant org exist
    const buyer = await prisma.user.findUnique({
      where: { id: input.buyerId },
    });
    if (!buyer) throw new Error(`Buyer not found: ${input.buyerId}`);

    const org = await prisma.organization.findUnique({
      where: { id: input.merchantOrganizationId },
    });
    if (!org) throw new Error(`Merchant organization not found: ${input.merchantOrganizationId}`);

    // Compute total minor units authoritatively
    let totalAmountMinor = 0;
    const validatedItems = input.items.map((item) => {
      if (item.quantity <= 0) throw new Error('Item quantity must be at least 1.');
      if (item.unitAmountMinor < 0) throw new Error('Unit amount cannot be negative.');
      const itemTotal = item.unitAmountMinor * item.quantity;
      totalAmountMinor += itemTotal;
      return {
        ...item,
        totalAmountMinor: itemTotal,
      };
    });

    if (totalAmountMinor <= 0) {
      throw new Error('Total order amount must be greater than zero.');
    }

    const orderNumber = this.generateOrderNumber();

    // Start idempotency tracking if key provided
    const idempotency = await IdempotencyService.startOperation(
      'ORDER_CREATE',
      orderNumber,
      input.idempotencyKey,
      input
    );

    // Create DB records within transaction
    const order = await prisma.commerceOrder.create({
      data: {
        orderNumber,
        buyerId: input.buyerId,
        merchantOrganizationId: input.merchantOrganizationId,
        currency,
        totalAmountMinor,
        status: 'PENDING',
        caseId: input.caseId || null,
        items: {
          create: validatedItems.map((item) => ({
            productReference: item.productReference,
            sku: item.sku || null,
            title: item.title,
            quantity: item.quantity,
            unitAmountMinor: item.unitAmountMinor,
            totalAmountMinor: item.totalAmountMinor,
          })),
        },
      },
      include: {
        items: true,
        merchantOrganization: true,
        buyer: true,
      },
    });

    try {
      const provider = PayPalProviderFactory.getProvider();
      const paypalOrder = await provider.createOrder(
        {
          referenceId: order.orderNumber,
          amountMinor: totalAmountMinor,
          currency,
          intent: 'CAPTURE',
          items: validatedItems.map((i) => ({
            name: i.title,
            quantity: i.quantity,
            unitAmountMinor: i.unitAmountMinor,
            sku: i.sku,
          })),
          customId: input.customId || order.id,
          invoiceId: input.invoiceId || order.orderNumber,
          returnUrl: input.returnUrl,
          cancelUrl: input.cancelUrl,
        },
        idempotency.requestId
      );

      // Create initial PayPalPayment tracking record
      const payment = await prisma.payPalPayment.create({
        data: {
          commerceOrderId: order.id,
          environment: process.env.PAYPAL_ENV || 'sandbox',
          providerOrderId: paypalOrder.id,
          amountMinor: totalAmountMinor,
          currency,
          paymentStatus: paypalOrder.status,
          intent: paypalOrder.intent || 'CAPTURE',
          invoiceId: input.invoiceId || order.orderNumber,
          customId: input.customId || order.id,
          rawResponseJson: JSON.stringify(paypalOrder),
        },
      });

      // Complete idempotency operation
      await IdempotencyService.completeOperation(idempotency.requestId, paypalOrder.id);

      // Log event if tied to a case
      if (order.caseId) {
        await CaseService.logEvent(
          order.caseId,
          EventType.ORDER_CREATED,
          input.buyerId,
          `Order ${order.orderNumber} initiated for ${order.currency} ${(totalAmountMinor / 100).toFixed(2)} with PayPal Order ID ${paypalOrder.id}`
        );
      }

      return {
        order,
        payment,
        paypalOrder,
      };
    } catch (err: any) {
      await IdempotencyService.failOperation(idempotency.requestId, err.message);
      // Mark order as cancelled/failed
      await prisma.commerceOrder.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });
      throw err;
    }
  }

  /**
   * Retrieves an order by ID or orderNumber with all related items and payment records.
   */
  public static async getOrderById(orderIdOrNumber: string) {
    return prisma.commerceOrder.findFirst({
      where: {
        OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
      },
      include: {
        items: true,
        payments: {
          include: {
            refunds: true,
            disputes: true,
          },
        },
        merchantOrganization: true,
        buyer: {
          select: { id: true, fullName: true, email: true },
        },
        case: {
          select: { id: true, caseNumber: true, status: true, title: true },
        },
      },
    });
  }
}
