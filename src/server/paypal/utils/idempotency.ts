import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export interface StartOperationResult {
  requestId: string;
  isRetry: boolean;
  existingStatus?: string;
  providerResourceId?: string | null;
}

export class IdempotencyService {
  /**
   * Generates a stable or unique idempotency key.
   */
  public static generateRequestId(operationType: string, resourceId: string): string {
    const randomHex = crypto.randomBytes(8).toString('hex');
    return `RG-${operationType.toUpperCase()}-${resourceId.slice(0, 8)}-${randomHex}`;
  }

  /**
   * Computes a SHA-256 hash of the request payload to ensure idempotency consistency.
   */
  public static hashPayload(payload: unknown): string {
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * Records or checks an operation in the database.
   */
  public static async startOperation(
    operationType: string,
    internalResourceId: string,
    providedRequestId?: string,
    payload?: unknown
  ): Promise<StartOperationResult> {
    const payloadHash = payload ? this.hashPayload(payload) : undefined;

    if (providedRequestId) {
      const existing = await prisma.payPalApiOperation.findUnique({
        where: { paypalRequestId: providedRequestId },
      });

      if (existing) {
        // If payload hash was recorded and mismatches, throw idempotency conflict
        if (existing.requestPayloadHash && payloadHash && existing.requestPayloadHash !== payloadHash) {
          throw new Error(
            `Idempotency conflict: PayPal-Request-Id "${providedRequestId}" was previously submitted with a different payload.`
          );
        }

        // Increment attempt count
        await prisma.payPalApiOperation.update({
          where: { id: existing.id },
          data: {
            attemptCount: { increment: 1 },
            lastAttemptAt: new Date(),
          },
        });

        return {
          requestId: existing.paypalRequestId,
          isRetry: true,
          existingStatus: existing.status,
          providerResourceId: existing.providerResourceId,
        };
      }
    }

    const requestId = providedRequestId || this.generateRequestId(operationType, internalResourceId);

    await prisma.payPalApiOperation.create({
      data: {
        operationType,
        internalResourceId,
        paypalRequestId: requestId,
        status: 'PENDING',
        attemptCount: 1,
        requestPayloadHash: payloadHash,
        lastAttemptAt: new Date(),
      },
    });

    return {
      requestId,
      isRetry: false,
    };
  }

  /**
   * Marks an operation as SUCCEEDED with the provider resource ID.
   */
  public static async completeOperation(
    requestId: string,
    providerResourceId?: string
  ): Promise<void> {
    await prisma.payPalApiOperation.updateMany({
      where: { paypalRequestId: requestId },
      data: {
        status: 'SUCCEEDED',
        providerResourceId: providerResourceId || undefined,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Marks an operation as FAILED with an error code.
   */
  public static async failOperation(
    requestId: string,
    errorCode: string
  ): Promise<void> {
    await prisma.payPalApiOperation.updateMany({
      where: { paypalRequestId: requestId },
      data: {
        status: 'FAILED',
        safeErrorCode: errorCode.slice(0, 100),
        updatedAt: new Date(),
      },
    });
  }
}
