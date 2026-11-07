import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { PackagePassportService } from '../src/server/services/package-passport.service';

describe('RESOLVEGRAPH Version 2.0: Package Passport Suite', () => {
  let merchantUserId: string;
  let testPackageId: string;
  let validQrToken: string;
  const testOrgId = 'org-techstore';

  before(async () => {
    let merchant = await prisma.user.findFirst({ where: { role: 'MERCHANT' } });
    if (!merchant) {
      merchant = await prisma.user.create({
        data: {
          email: `merchant.test.${Date.now()}@example.com`,
          fullName: 'Test Merchant Operator',
          role: 'MERCHANT',
          organization: testOrgId,
        },
      });
    }
    merchantUserId = merchant.id;
  });

  after(async () => {
    if (testPackageId) {
      await prisma.deliveryEvent.deleteMany({ where: { packageId: testPackageId } });
      await prisma.packageEvent.deleteMany({ where: { packageId: testPackageId } });
      await prisma.packageSeal.deleteMany({ where: { packageId: testPackageId } });
      await prisma.packageItem.deleteMany({ where: { packageId: testPackageId } });
      await prisma.packagePassport.delete({ where: { id: testPackageId } }).catch(() => {});
    }
  });

  test('Module 08: registers Package Passport with unique ID, items, and signed QR token', async () => {
    const pkg = await PackagePassportService.createPackagePassport({
      merchantOrganizationId: testOrgId,
      carrierName: 'BlueDart Express',
      trackingNumber: 'BD-88912891',
      items: [
        {
          productName: 'Crucial P3 Plus 1TB NVMe SSD',
          modelNumber: 'CT1000P3PSSD8',
          sku: 'SSD-CRU-1TB',
          serialNumber: 'SN-99882211',
          quantity: 1,
          declaredCapacity: '1 TB',
          condition: 'NEW_SEALED',
        },
      ],
      userId: merchantUserId,
    });

    testPackageId = pkg.id;
    validQrToken = pkg.qrToken;

    assert.ok(pkg.id);
    assert.match(pkg.packageNumber, /^PKG-\d{4}-[A-F0-9]+$/);
    assert.equal(pkg.status, 'REGISTERED');
    assert.ok(pkg.qrToken.includes('.'));
    assert.ok(pkg.qrCodeSvg?.includes('<svg'));
    assert.ok(pkg.integrityHash.length === 64);
    assert.equal(pkg.items.length, 1);
    assert.equal(pkg.items[0].declaredCapacity, '1 TB');
    assert.equal(pkg.events[0].eventType, 'CREATED');
  });

  test('Module 08: validates genuine signed QR token and rejects forged or tampered token', async () => {
    assert.ok(validQrToken, 'Requires valid QR token from creation test');

    // 1. Verify genuine token
    const verification = await PackagePassportService.verifyQrCode(validQrToken);
    assert.equal(verification.isValid, true);
    assert.equal(verification.items?.length, 1);
    assert.equal(verification.items?.[0].productName, 'Crucial P3 Plus 1TB NVMe SSD');

    // 2. Reject forged signature token
    const parts = validQrToken.split('.');
    const forgedToken = `${parts[0]}.${parts[1]}.tampered_signature_hex_00000000`;
    const forgedVerification = await PackagePassportService.verifyQrCode(forgedToken);
    assert.equal(forgedVerification.isValid, false);
    assert.ok(forgedVerification.error?.includes('Invalid or forged'));

    // 3. Reject non-existent token
    const nonExistent = PackagePassportService.generateSignedQrToken('PKG-2026-UNKNOWN');
    const nonExistentVerification = await PackagePassportService.verifyQrCode(nonExistent);
    assert.equal(nonExistentVerification.isValid, false);
    assert.ok(nonExistentVerification.error?.includes('not found'));
  });

  test('Module 08: privacy safety check — QR verification does NOT expose buyer PII', async () => {
    assert.ok(validQrToken);
    const verification = await PackagePassportService.verifyQrCode(validQrToken);

    // Verify absence of sensitive PII fields in public verification payload
    const serialized = JSON.stringify(verification);
    assert.equal(serialized.includes('buyerAddress'), false);
    assert.equal(serialized.includes('phone'), false);
    assert.equal(serialized.includes('creditCard'), false);
    assert.equal(serialized.includes('paymentToken'), false);
  });

  test('Module 08: attaches tamper-evident seal and updates cumulative integrity hash', async () => {
    assert.ok(testPackageId);

    const initialPkg = await PackagePassportService.getPackageById(testPackageId);
    const initialHash = initialPkg?.integrityHash;

    const result = await PackagePassportService.attachSeal({
      packageId: testPackageId,
      sealNumber: 'SEAL-TECH-99120',
      sealType: 'TAMPER_EVIDENT_TAPE',
      photoStorageKey: 'seals/proof_tape_99120.jpg',
      userId: merchantUserId,
    });

    assert.equal(result.package.status, 'SEALED');
    assert.equal(result.seal.sealNumber, 'SEAL-TECH-99120');
    assert.equal(result.seal.verificationStatus, 'INTACT');

    // Integrity hash must evolve after seal is applied
    assert.notEqual(result.package.integrityHash, initialHash);
    assert.ok(result.package.integrityHash.length === 64);
  });

  test('Module 08: dispatches package and generates matching delivery transit event', async () => {
    assert.ok(testPackageId);

    const dispatched = await PackagePassportService.dispatchPackage({
      packageId: testPackageId,
      carrierName: 'DHL Express',
      trackingNumber: 'DHL-TRACK-99182',
      userId: merchantUserId,
    });

    assert.equal(dispatched.status, 'DISPATCHED');
    assert.equal(dispatched.carrierName, 'DHL Express');
    assert.equal(dispatched.trackingNumber, 'DHL-TRACK-99182');
    assert.ok(dispatched.dispatchedAt);

    // Verify matching DeliveryEvent was created
    const deliveryEvent = await prisma.deliveryEvent.findFirst({
      where: { packageId: testPackageId, eventType: 'DISPATCHED' },
    });
    assert.ok(deliveryEvent);
    assert.equal(deliveryEvent?.carrier, 'DHL Express');
  });

  test('Module 08: tenant isolation blocks cross-tenant package queries', async () => {
    const techStorePackages = await PackagePassportService.listPackages('org-techstore');
    assert.ok(techStorePackages.every((p) => p.merchantOrganizationId === 'org-techstore'));

    const otherOrgPackages = await PackagePassportService.listPackages('org-digitalmart');
    assert.ok(otherOrgPackages.every((p) => p.merchantOrganizationId === 'org-digitalmart'));
  });
});
