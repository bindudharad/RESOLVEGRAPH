import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { CameraSessionService } from '../src/server/services/camera-session.service';

describe('RESOLVEGRAPH Version 2.0: Dual-Sight AI & Mobile Capture Suite', () => {
  let testBuyerId: string;
  let testCaseId: string;
  let createdSessionToken: string;
  let createdSessionId: string;

  before(async () => {
    let buyer = await prisma.user.findFirst({ where: { role: 'BUYER' } });
    if (!buyer) {
      buyer = await prisma.user.create({
        data: {
          email: `buyer.capture.${Date.now()}@example.com`,
          fullName: 'Capture Test Buyer',
          role: 'BUYER',
        },
      });
    }
    testBuyerId = buyer.id;

    // Get an existing case for evidence linkage
    const existingCase = await prisma.caseRecord.findFirst();
    testCaseId = existingCase?.id || 'case_dummy';
  });

  after(async () => {
    if (createdSessionId) {
      await prisma.cameraStreamRecord.deleteMany({ where: { sessionId: createdSessionId } });
      await prisma.captureChallenge.deleteMany({ where: { sessionId: createdSessionId } });
      await prisma.cameraSession.delete({ where: { id: createdSessionId } }).catch(() => {});
    }
  });

  test('Module 10: generates 6-digit unboxing challenge and initializes camera session', async () => {
    const session = await CameraSessionService.initiateSession({
      buyerId: testBuyerId,
      caseId: testCaseId,
      deviceInfo: 'Google Pixel 8 Pro / Android 14',
      captureMode: 'DUAL_CONCURRENT',
      isFrontOptionalAccepted: true,
    });

    createdSessionToken = session.sessionToken;
    createdSessionId = session.id;

    assert.ok(session.id);
    assert.ok(session.sessionToken.startsWith('sess_'));
    assert.equal(session.status, 'INITIALIZED');
    assert.equal(session.challenges.length, 1);

    const challenge = session.challenges[0];
    assert.match(challenge.challengeCode, /^\d{6}$/); // Exactly 6 digits
    assert.equal(challenge.isVerifiedInVideo, false);
    assert.ok(challenge.expiresAt > new Date());
  });

  test('Module 10: retrieves active challenge by token and rejects invalid session tokens', async () => {
    assert.ok(createdSessionToken);

    // 1. Valid token lookup
    const result = await CameraSessionService.getSessionByToken(createdSessionToken);
    assert.ok(result);
    assert.equal(result?.session.id, createdSessionId);
    assert.equal(result?.isExpired, false);
    assert.match(result?.activeChallenge?.challengeCode || '', /^\d{6}$/);

    // 2. Invalid token lookup
    const invalidResult = await CameraSessionService.getSessionByToken('sess_invalid_token_9999');
    assert.equal(invalidResult, null);
  });

  test('Module 10: ingests video stream buffer, computes bitwise SHA-256, and links stream', async () => {
    assert.ok(createdSessionId);

    // Create synthetic MP4 binary payload
    const syntheticBuffer = Buffer.from('FAKE_MP4_VIDEO_STREAM_DATA_CHUNK_1024');

    const stream = await CameraSessionService.uploadStream({
      sessionId: createdSessionId,
      streamType: 'REAR_PACKAGE_STREAM',
      durationSeconds: 22.5,
      fps: 30.0,
      codec: 'video/mp4',
      fileBuffer: syntheticBuffer,
    });

    assert.ok(stream.id);
    assert.equal(stream.streamType, 'REAR_PACKAGE_STREAM');
    assert.equal(stream.fileSize, syntheticBuffer.length);
    assert.ok(stream.sha256 && stream.sha256.length === 64);

    // Verify session transitioned to UPLOADING
    const refreshed = await prisma.cameraSession.findUnique({ where: { id: createdSessionId } });
    assert.equal(refreshed?.status, 'UPLOADING');
  });

  test('Module 10: completes verification session and materializes Evidence record on case', async () => {
    assert.ok(createdSessionId);

    const completion = await CameraSessionService.completeSession(createdSessionId, testBuyerId);

    assert.equal(completion.session.status, 'COMPLETED');
    assert.ok(completion.session.completedAt);

    // If linked to case, verify evidence was created
    if (testCaseId) {
      assert.ok(completion.materializedEvidence.length >= 1);
      const ev = completion.materializedEvidence[0];
      assert.equal(ev.mimeType, 'video/mp4');
      assert.equal(ev.verificationStatus, 'VERIFIED');
      assert.ok(ev.description?.includes('Dual-Sight unboxing recording'));

      // Clean up materialized evidence
      await prisma.evidence.delete({ where: { id: ev.id } }).catch(() => {});
    }
  });
});
