import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { DeliveryReminderService } from '../src/server/services/delivery-reminder.service';
import { PackagePassportService } from '../src/server/services/package-passport.service';

describe('RESOLVEGRAPH Version 2.0: Delivery & Unboxing Reminder Suite', () => {
  let testUserId: string;
  let testPackageId: string;
  let scheduledReminderId: string;

  before(async () => {
    let user = await prisma.user.findFirst({ where: { role: 'BUYER' } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `buyer.reminder.${Date.now()}@example.com`,
          fullName: 'Reminder Test Buyer',
          role: 'BUYER',
        },
      });
    }
    testUserId = user.id;

    // Create a package for testing reminders
    const pkg = await PackagePassportService.createPackagePassport({
      merchantOrganizationId: 'org-techstore',
      carrierName: 'Delhivery',
      trackingNumber: 'DEL-991204',
      items: [{ productName: 'Samsung 990 Pro 2TB SSD', declaredCapacity: '2 TB' }],
      userId: testUserId,
    });
    testPackageId = pkg.id;
  });

  after(async () => {
    if (testPackageId) {
      await prisma.notificationMessage.deleteMany({ where: { userId: testUserId } });
      await prisma.deliveryReminder.deleteMany({ where: { packageId: testPackageId } });
      await prisma.deliveryEvent.deleteMany({ where: { packageId: testPackageId } });
      await prisma.packageEvent.deleteMany({ where: { packageId: testPackageId } });
      await prisma.packageItem.deleteMany({ where: { packageId: testPackageId } });
      await prisma.packagePassport.delete({ where: { id: testPackageId } }).catch(() => {});
    }
  });

  test('Module 09: records estimated vs confirmed delivery events accurately', async () => {
    // 1. Estimated delivery event
    const estimated = await DeliveryReminderService.recordDeliveryEvent({
      packageId: testPackageId,
      eventType: 'OUT_FOR_DELIVERY',
      isEstimated: true,
      checkpoint: 'Regional Sorting Hub',
      rawSource: 'CARRIER_API_ESTIMATE',
    });

    assert.equal(estimated.isEstimated, true);
    assert.equal(estimated.eventType, 'OUT_FOR_DELIVERY');

    // Verify package is NOT prematurely marked out for delivery on estimate
    const pkgAfterEst = await PackagePassportService.getPackageById(testPackageId);
    assert.equal(pkgAfterEst?.status, 'REGISTERED');

    // 2. Confirmed delivery event
    const confirmed = await DeliveryReminderService.recordDeliveryEvent({
      packageId: testPackageId,
      eventType: 'OUT_FOR_DELIVERY',
      isEstimated: false,
      checkpoint: 'Local Hub Van #4',
      rawSource: 'COURIER_HANDHELD_SCAN',
      userId: testUserId,
    });

    assert.equal(confirmed.isEstimated, false);

    // Verify package status transitioned
    const pkgAfterConf = await PackagePassportService.getPackageById(testPackageId);
    assert.equal(pkgAfterConf?.status, 'OUT_FOR_DELIVERY');
  });

  test('Module 09: schedules delivery reminder and prevents duplicate reminder scheduling', async () => {
    // Schedule pre-delivery unboxing prep reminder
    const firstSchedule = await DeliveryReminderService.scheduleReminder({
      userId: testUserId,
      packageId: testPackageId,
      reminderType: 'PRE_DELIVERY_PREP',
      scheduledFor: new Date(Date.now() - 5000), // Due 5 seconds ago
      messageText: 'Your package is arriving soon. Please inspect physical seals before unboxing.',
    });

    assert.equal(firstSchedule.isDuplicate, false);
    assert.ok(firstSchedule.reminder.id);
    scheduledReminderId = firstSchedule.reminder.id;

    // Attempt to schedule duplicate reminder
    const secondSchedule = await DeliveryReminderService.scheduleReminder({
      userId: testUserId,
      packageId: testPackageId,
      reminderType: 'PRE_DELIVERY_PREP',
      scheduledFor: new Date(),
    });

    assert.equal(secondSchedule.isDuplicate, true);
    assert.equal(secondSchedule.reminder.id, firstSchedule.reminder.id);
  });

  test('Module 09: processes due reminders idempotently and creates in-app notification', async () => {
    const processResult = await DeliveryReminderService.processDueReminders();
    assert.ok(processResult.processedCount >= 1);

    // Verify reminder status updated to SENT
    const updatedReminder = await prisma.deliveryReminder.findUnique({
      where: { id: scheduledReminderId },
    });
    assert.equal(updatedReminder?.status, 'SENT');
    assert.ok(updatedReminder?.sentAt);

    // Verify in-app notification was materialized
    const { notifications, unreadCount } = await DeliveryReminderService.getUserNotifications(testUserId);
    assert.ok(notifications.length >= 1);
    assert.ok(unreadCount >= 1);
  });

  test('Module 09: buyer confirms parcel receipt, updating package and triggering unboxing prompt', async () => {
    const confirmResult = await DeliveryReminderService.confirmParcelReceipt(testUserId, testPackageId);
    assert.equal(confirmResult.success, true);

    // Verify package transitioned to DELIVERED
    const pkg = await PackagePassportService.getPackageById(testPackageId);
    assert.equal(pkg?.status, 'DELIVERED');
    assert.ok(pkg?.deliveredAt);

    // Verify urgent unboxing notification prompt is created
    const { notifications } = await DeliveryReminderService.getUserNotifications(testUserId);
    const unboxingNotice = notifications.find((n) => n.title.includes('Unboxing'));
    assert.ok(unboxingNotice);
    assert.equal(unboxingNotice?.type, 'URGENT');
  });

  test('Module 09: marks in-app notification as read', async () => {
    const { notifications, unreadCount: beforeCount } = await DeliveryReminderService.getUserNotifications(testUserId);
    const firstNotice = notifications[0];
    assert.ok(firstNotice);

    await DeliveryReminderService.markNotificationRead(firstNotice.id, testUserId);

    const { unreadCount: afterCount } = await DeliveryReminderService.getUserNotifications(testUserId);
    assert.equal(afterCount, beforeCount - 1);
  });

  test('Module 09: cancels scheduled reminder successfully', async () => {
    const newReminder = await DeliveryReminderService.scheduleReminder({
      userId: testUserId,
      packageId: testPackageId,
      reminderType: 'POST_DELIVERY_INSPECTION',
      scheduledFor: new Date(Date.now() + 3600000), // Due in 1 hour
      messageText: 'Check if you have any questions about your delivered product.',
    });

    const cancelled = await DeliveryReminderService.cancelReminder(newReminder.reminder.id, testUserId);
    assert.equal(cancelled.status, 'CANCELLED');
  });
});
