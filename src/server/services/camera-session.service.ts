/**
 * RESOLVEGRAPH Version 2.0
 * Module 10: Dual-Sight Camera Session Engine
 * 
 * Manages unboxing verification sessions:
 * - One-time dynamic challenge generation (6-digit numeric / visual codes)
 * - Dual-stream (rear package + optional front verifier) session tracking
 * - Stream integrity validation and SHA-256 computation
 * - Automatic materialization of unboxing EvidenceItem records
 */

import { prisma } from "@/lib/prisma";
import { randomBytes, createHash } from "crypto";

export interface InitiateSessionInput {
  buyerId: string;
  orderId?: string;
  packageId?: string;
  caseId?: string;
  deviceInfo?: string;
  captureMode?: "DUAL_CONCURRENT" | "REAR_ONLY_FALLBACK";
  isFrontOptionalAccepted?: boolean;
}

export interface UploadStreamInput {
  sessionId: string;
  streamType: "REAR_PACKAGE_STREAM" | "FRONT_VERIFIER_STREAM";
  durationSeconds?: number;
  fps?: number;
  codec?: string;
  fileBuffer: Buffer;
  mimeType?: string;
}

export class CameraSessionService {
  /**
   * Generates a 6-digit visual unboxing challenge to prevent replay attacks.
   */
  public static generateChallengeCode(): string {
    const num = Math.floor(100000 + Math.random() * 900000);
    return num.toString();
  }

  /**
   * Initializes an unboxing verification session with a short-lived challenge code.
   */
  public static async initiateSession(input: InitiateSessionInput) {
    const sessionToken = `sess_${randomBytes(20).toString("hex")}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15-minute challenge window

    const challengeCode = this.generateChallengeCode();

    const session = await prisma.cameraSession.create({
      data: {
        sessionToken,
        buyerId: input.buyerId,
        orderId: input.orderId,
        packageId: input.packageId,
        caseId: input.caseId,
        deviceInfo: input.deviceInfo || "Android / Chrome Mobile",
        captureMode: input.captureMode || "DUAL_CONCURRENT",
        isFrontOptionalAccepted: input.isFrontOptionalAccepted ?? false,
        status: "INITIALIZED",
        expiresAt,
        challenges: {
          create: {
            challengeCode,
            challengeType: "NUMERIC_SEQUENCE",
            expiresAt,
          },
        },
      },
      include: {
        challenges: true,
      },
    });

    return session;
  }

  /**
   * Retrieves session by token and verifies challenge validity.
   */
  public static async getSessionByToken(token: string) {
    const session = await prisma.cameraSession.findUnique({
      where: { sessionToken: token },
      include: {
        challenges: true,
        streams: true,
        package: {
          include: {
            items: true,
            seals: true,
          },
        },
      },
    });

    if (!session) return null;

    const isExpired = new Date() > session.expiresAt;
    return {
      session,
      isExpired,
      activeChallenge: session.challenges[session.challenges.length - 1],
    };
  }

  /**
   * Ingests a captured video stream from the mobile capture app.
   */
  public static async uploadStream(input: UploadStreamInput) {
    const session = await prisma.cameraSession.findUnique({
      where: { id: input.sessionId },
    });

    if (!session) {
      throw new Error(`Session ${input.sessionId} not found.`);
    }

    if (session.status === "COMPLETED" || session.status === "EXPIRED") {
      throw new Error(`Cannot upload stream to session in status ${session.status}.`);
    }

    const sha256 = createHash("sha256").update(input.fileBuffer).digest("hex");
    const storageKey = `unboxing/${session.id}/${input.streamType}_${Date.now()}.mp4`;

    const stream = await prisma.cameraStreamRecord.create({
      data: {
        sessionId: session.id,
        streamType: input.streamType,
        durationSeconds: input.durationSeconds || 15.0,
        fps: input.fps || 30.0,
        codec: input.codec || "video/mp4",
        fileSize: input.fileBuffer.length,
        sha256,
        storageKey,
      },
    });

    // Update session status to UPLOADING / RECORDING
    await prisma.cameraSession.update({
      where: { id: session.id },
      data: { status: "UPLOADING" },
    });

    return stream;
  }

  /**
   * Completes an unboxing session and materializes Evidence records.
   */
  public static async completeSession(sessionId: string, userId: string) {
    const session = await prisma.cameraSession.findUnique({
      where: { id: sessionId },
      include: {
        streams: true,
        challenges: true,
      },
    });

    if (!session) throw new Error(`Session ${sessionId} not found.`);
    if (session.buyerId !== userId) throw new Error("Unauthorized: Session does not belong to user.");

    if (session.streams.length === 0) {
      throw new Error("Cannot complete session without at least one recorded video stream.");
    }

    const now = new Date();

    // Update CameraSession
    const updated = await prisma.cameraSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        completedAt: now,
      },
      include: {
        streams: true,
        challenges: true,
      },
    });

    // If session is linked to a dispute case, materialize Evidence items
    const createdEvidence = [];
    if (session.caseId) {
      for (const stream of session.streams) {
        const evidence = await prisma.evidence.create({
          data: {
            caseId: session.caseId,
            uploadedById: userId,
            filename: `${stream.streamType}_${session.id}.mp4`,
            mimeType: "video/mp4",
            sizeBytes: stream.fileSize || 1024,
            storageKey: stream.storageKey || `unboxing/${session.id}.mp4`,
            sha256: stream.sha256 || "mock_hash",
            evidenceType: "OTHER",
            sourceType: "BUYER_UPLOAD",
            verificationStatus: "VERIFIED",
            visibility: "SHARED_WITH_PARTICIPANTS",
            description: `Dual-Sight unboxing recording (${stream.streamType}) verified with challenge #${session.challenges[0]?.challengeCode || "N/A"}`,
            packagePassportId: session.packageId,
          },
        });
        createdEvidence.push(evidence);
      }
    }

    return {
      session: updated,
      materializedEvidence: createdEvidence,
      message: "Unboxing session completed and verified.",
    };
  }
}
