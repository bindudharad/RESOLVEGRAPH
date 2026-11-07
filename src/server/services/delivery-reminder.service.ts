/**
 * RESOLVEGRAPH Version 2.0
 * Module 09: Smart Delivery & Unboxing Reminder Engine
 * 
 * Manages transit checkpoints, durable scheduled notifications, and pre-unboxing reminders:
 * - Distinguishes estimated delivery from confirmed delivery events
 * - Schedules durable reminders for out-for-delivery and unboxing preparation
 * - Multi-channel provider abstraction (In-App, Email, Push)
 * - Duplicate reminder prevention and idempotent execution
 */

import { prisma } from "@/lib/prisma";

export interface RecordDeliveryEventInput {
  packageId?: string;
  purchaseMemoryId?: string;
  eventType:
    | "ORDER_CONFIRMED"
    | "PACKAGE_REGISTERED"
    | "DISPATCHED"
    | "IN_TRANSIT"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "DELIVERY_FAILED"
    | "RETURNED";
  carrier?: string;
  checkpoint?: string;
  isEstimated?: boolean;
  eventTimestamp?: Date;
  rawSource?: string;
  userId?: string;
}

export interface ScheduleReminderInput {
  userId: string;
  packageId?: string;
  purchaseMemoryId?: string;
  reminderType: "PRE_DELIVERY_PREP" | "OUT_FOR_DELIVERY_ALERT" | "UNBOXING_EVIDENCE_PROMPT" | "POST_DELIVERY_INSPECTION";
  scheduledFor: Date;
  channel?: "IN_APP" | "EMAIL" | "PUSH";
  messageText?: string;
}

export class DeliveryReminderService {
  /**
   * Records a carrier or customer transit checkpoint event.
   */
  public static async recordDeliveryEvent(input: RecordDeliveryEventInput) {
    const timestamp = input.eventTimestamp || new Date();
    const isEstimated = input.isEstimated ?? false;

    const event = await prisma.deliveryEvent.create({
      data: {
        packageId: input.packageId,
        purchaseMemoryId: input.purchaseMemoryId,
        eventType: input.eventType,
        carrier: input.carrier,
        checkpoint: input.checkpoint,
        isEstimated,
        eventTimestamp: timestamp,
        rawSource: input.rawSource,
      },
    });

    // If package linked, update status accordingly
    if (input.packageId && !isEstimated) {
      if (input.eventType === "DELIVERED") {
        await prisma.packagePassport.update({
          where: { id: input.packageId },
          data: { status: "DELIVERED", deliveredAt: timestamp },
        });
      } else if (input.eventType === "OUT_FOR_DELIVERY") {
        await prisma.packagePassport.update({
          where: { id: input.packageId },
          data: { status: "OUT_FOR_DELIVERY" },
        });
      }
    }

    // Automatically trigger reminder scheduling based on high-importance lifecycle events
    if (input.userId) {
      if (input.eventType === "OUT_FOR_DELIVERY") {
        await this.scheduleReminder({
          userId: input.userId,
          packageId: input.packageId,
          purchaseMemoryId: input.purchaseMemoryId,
          reminderType: "OUT_FOR_DELIVERY_ALERT",
          scheduledFor: new Date(), // Immediate alert
          messageText:
            "Your parcel is out for delivery today. Before opening, prepare your phone to record the package seals and shipping label.",
        });
      } else if (input.eventType === "DELIVERED" && !isEstimated) {
        await this.scheduleReminder({
          userId: input.userId,
          packageId: input.packageId,
          purchaseMemoryId: input.purchaseMemoryId,
          reminderType: "UNBOXING_EVIDENCE_PROMPT",
          scheduledFor: new Date(),
          messageText:
            "Parcel delivered! Start your RESOLVEGRAPH Dual-Sight unboxing verification session now to preserve evidence.",
        });
      }
    }

    return event;
  }

  /**
   * Schedules a reminder with duplicate protection.
   */
  public static async scheduleReminder(input: ScheduleReminderInput) {
    const channel = input.channel || "IN_APP";

    // Duplicate protection: prevent scheduling same reminder type for same package within active window
    const existing = await prisma.deliveryReminder.findFirst({
      where: {
        userId: input.userId,
        packageId: input.packageId,
        reminderType: input.reminderType,
        status: { in: ["SCHEDULED", "SENT"] },
      },
    });

    if (existing) {
      return { reminder: existing, isDuplicate: true };
    }

    const defaultMsg =
      input.messageText ||
      "Your parcel is arriving soon. Remember to inspect the packaging and start your unboxing verification session.";

    const reminder = await prisma.deliveryReminder.create({
      data: {
        userId: input.userId,
        packageId: input.packageId,
        purchaseMemoryId: input.purchaseMemoryId,
        reminderType: input.reminderType,
        scheduledFor: input.scheduledFor,
        channel,
        messageText: defaultMsg,
        status: "SCHEDULED",
      },
    });

    return { reminder, isDuplicate: false };
  }

  /**
   * Executes due reminders idempotently and delivers in-app notifications.
   */
  public static async processDueReminders(): Promise<{ processedCount: number; errors: string[] }> {
    const now = new Date();
    const dueReminders = await prisma.deliveryReminder.findMany({
      where: {
        status: "SCHEDULED",
        scheduledFor: { lte: now },
      },
    });

    let processedCount = 0;
    const errors: string[] = [];

    for (const reminder of dueReminders) {
      try {
        // Create user in-app notification message
        await prisma.notificationMessage.create({
          data: {
            userId: reminder.userId,
            title:
              reminder.reminderType === "UNBOXING_EVIDENCE_PROMPT"
                ? "Start Unboxing Verification Session"
                : "Delivery Update",
            body: reminder.messageText,
            linkUrl: reminder.packageId ? `/packages/${reminder.packageId}` : "/purchases",
            type: reminder.reminderType === "UNBOXING_EVIDENCE_PROMPT" ? "URGENT" : "INFO",
          },
        });

        // Mark reminder as SENT
        await prisma.deliveryReminder.update({
          where: { id: reminder.id },
          data: {
            status: "SENT",
            sentAt: now,
          },
        });

        processedCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to dispatch reminder ${reminder.id}: ${msg}`);
      }
    }

    return { processedCount, errors };
  }

  /**
   * Allows customer to explicitly confirm parcel receipt, triggering unboxing flow.
   */
  public static async confirmParcelReceipt(userId: string, packageId: string) {
    const pkg = await prisma.packagePassport.findUnique({ where: { id: packageId } });
    if (!pkg) throw new Error(`Package ${packageId} not found.`);

    const now = new Date();

    // Record verified DELIVERED event
    await prisma.deliveryEvent.create({
      data: {
        packageId,
        purchaseMemoryId: pkg.purchaseMemoryId,
        eventType: "DELIVERED",
        isEstimated: false,
        eventTimestamp: now,
        checkpoint: "Buyer Handover (Customer Confirmed)",
        rawSource: "BUYER_PORTAL_CONFIRMATION",
      },
    });

    // Update package
    await prisma.packagePassport.update({
      where: { id: packageId },
      data: { status: "DELIVERED", deliveredAt: now },
    });

    // Trigger immediate unboxing session notification
    const reminderResult = await this.scheduleReminder({
      userId,
      packageId,
      purchaseMemoryId: pkg.purchaseMemoryId || undefined,
      reminderType: "UNBOXING_EVIDENCE_PROMPT",
      scheduledFor: now,
      messageText:
        "You confirmed parcel receipt! Before opening the package, launch your Dual-Sight unboxing verification to record physical seals.",
    });

    // Process immediately
    await this.processDueReminders();

    return { success: true, packageId, reminder: reminderResult.reminder };
  }

  /**
   * Cancels a scheduled reminder.
   */
  public static async cancelReminder(reminderId: string, userId: string) {
    const reminder = await prisma.deliveryReminder.findUnique({ where: { id: reminderId } });
    if (!reminder || reminder.userId !== userId) {
      throw new Error(`Reminder ${reminderId} not found or unauthorized.`);
    }

    return prisma.deliveryReminder.update({
      where: { id: reminderId },
      data: { status: "CANCELLED" },
    });
  }

  /**
   * Lists in-app notifications for user.
   */
  public static async getUserNotifications(userId: string) {
    const notifications = await prisma.notificationMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = await prisma.notificationMessage.count({
      where: { userId, isRead: false },
    });
    return { notifications, unreadCount };
  }

  /**
   * Marks a notification as read.
   */
  public static async markNotificationRead(notificationId: string, userId: string) {
    return prisma.notificationMessage.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }
}
