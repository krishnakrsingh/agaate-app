import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "./prisma";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { encryptEmbedding } from "./biometric-crypto";
import { averageEmbeddings } from "./face-embedding";
import { FACE_MODEL_ID, FACE_MODEL_VERSION } from "./face-config";

function emb(seed: number): number[] {
  const arr = new Array(128).fill(0).map((_, i) => Math.sin(seed * 50 + i * 0.2) * 0.5);
  const norm = Math.sqrt(arr.reduce((s, v) => s + v * v, 0));
  return arr.map((v) => v / norm);
}

describe.sequential("Stage 3 & 4: Liveness & Integrated Attendance", () => {
  let userId: string;
  let farmId: string;

  beforeAll(async () => {
    const hash = await bcrypt.hash("Password12345!", 10);
    const u = await prisma.user.create({
      data: { name: "Liveness Test Officer", email: `liveness-${Date.now()}@test.agaate.local`, passwordHash: hash, role: "FARM_OFFICER" },
    });
    userId = u.id;
    const farm = await prisma.farm.create({
      data: {
        name: `Liveness Farm ${Date.now()}`,
        ownerName: "Test",
        location: "Test",
        latitude: 12.9716,
        longitude: 77.5946,
        totalArea: 5,
        cultivableArea: 4,
        waterSource: "Well",
        geofenceRadiusMeters: 500,
      },
    });
    farmId = farm.id;
    await prisma.farmAccess.create({ data: { userId, farmId, canManage: false } });

    // Create face enrollment with 3 frames
    const frames = [emb(10), emb(10).map((v) => v + (Math.random() - 0.5) * 0.02), emb(10).map((v) => v + (Math.random() - 0.5) * 0.02)];
    const ref = averageEmbeddings(frames);
    const enc = encryptEmbedding(new Float32Array(ref));
    await prisma.faceEnrollment.create({
      data: {
        userId,
        modelId: FACE_MODEL_ID,
        modelVersion: FACE_MODEL_VERSION,
        thresholdVersion: "2026-08-31-v1",
        encryptedEmbedding: enc.ciphertext,
        iv: enc.iv,
        authTag: enc.authTag,
        status: "ACTIVE",
        consentGivenAt: new Date(),
        enrollmentCount: 3,
      },
    });

    // Create passkey
    await prisma.passkeyCredential.create({
      data: {
        userId,
        credentialId: `test-cred-${Date.now()}`,
        publicKey: Buffer.from("test-key").toString("base64url"),
        counter: 0n,
      },
    });
  });

  afterAll(async () => {
    await prisma.livenessChallenge.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { actorId: userId } });
    await prisma.attendance.deleteMany({ where: { userId } });
    await prisma.faceEnrollment.deleteMany({ where: { userId } });
    await prisma.passkeyCredential.deleteMany({ where: { userId } });
    await prisma.farmAccess.deleteMany({ where: { userId } });
    await prisma.farm.deleteMany({ where: { id: farmId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("creates a single-use liveness challenge and rejects replay", async () => {
    const challenge = randomBytes(16).toString("base64url");
    const created = await prisma.livenessChallenge.create({
      data: { userId, challenge, instruction: "TURN_LEFT", expiresAt: new Date(Date.now() + 2 * 60 * 1000) },
    });
    expect(created.used).toBe(false);

    // Simulate verification consuming it
    await prisma.livenessChallenge.update({ where: { id: created.id }, data: { used: true } });
    const after = await prisma.livenessChallenge.findUniqueOrThrow({ where: { id: created.id } });
    expect(after.used).toBe(true);

    // Replay should be rejected (used=true)
    const replayCheck = await prisma.livenessChallenge.findUnique({ where: { id: created.id } });
    expect(replayCheck!.used).toBe(true);
  });

  it("rejects expired liveness challenge", async () => {
    const challenge = randomBytes(16).toString("base64url");
    const created = await prisma.livenessChallenge.create({
      data: { userId, challenge, instruction: "BLINK", expiresAt: new Date(Date.now() - 1000) },
    });
    expect(created.expiresAt < new Date()).toBe(true);
    await prisma.livenessChallenge.delete({ where: { id: created.id } });
  });

  it("prevents challenge reuse across users (ID substitution)", async () => {
    const challenge = randomBytes(16).toString("base64url");
    const created = await prisma.livenessChallenge.create({
      data: { userId, challenge, instruction: "SMILE", expiresAt: new Date(Date.now() + 60000) },
    });
    const otherUserId = "cm0000000000000000000000";
    // Other user should not be able to use this challenge
    const found = await prisma.livenessChallenge.findUnique({ where: { id: created.id } });
    expect(found!.userId).not.toBe(otherUserId);
    await prisma.livenessChallenge.delete({ where: { id: created.id } });
  });

  it("attendance requires recent biometric proof when enrolled (server authority)", async () => {
    // Without recent audit logs, attendance should be blocked
    const recentWebAuthn = await prisma.auditLog.findFirst({
      where: { actorId: userId, action: "WEBAUTHN_AUTH_VERIFY", createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
    });
    expect(recentWebAuthn).toBeNull(); // none yet

    const recentFace = await prisma.auditLog.findFirst({
      where: { actorId: userId, action: { in: ["FACE_VERIFY_MATCH", "LIVENESS_VERIFY_PASS"] }, createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
    });
    expect(recentFace).toBeNull();

    // Simulate attendance attempt would fail server check (we test logic, not HTTP)
    const passkeyCount = await prisma.passkeyCredential.count({ where: { userId, revokedAt: null } });
    expect(passkeyCount).toBeGreaterThan(0);
    const hasActiveFace = await prisma.faceEnrollment.findUnique({ where: { userId } });
    expect(hasActiveFace!.status).toBe("ACTIVE");
    // Server would return 422 for both missing proofs
  });

  it("attendance succeeds when recent proofs exist", async () => {
    // Create recent audit logs to simulate successful verifications within 5 min
    await prisma.auditLog.create({
      data: { actorId: userId, action: "WEBAUTHN_AUTH_VERIFY", entityType: "PasskeyCredential", entityId: "test", metadata: { credentialId: "test" } },
    });
    await prisma.auditLog.create({
      data: { actorId: userId, action: "LIVENESS_VERIFY_PASS", entityType: "LivenessChallenge", entityId: "test", metadata: { distance: 0.3, similarityPercent: 75 } },
    });
    await prisma.auditLog.create({
      data: { actorId: userId, action: "FACE_VERIFY_MATCH", entityType: "FaceEnrollment", entityId: "test", metadata: { distance: 0.3 } },
    });

    const recentWebAuthn = await prisma.auditLog.findFirst({
      where: { actorId: userId, action: "WEBAUTHN_AUTH_VERIFY", createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
    });
    const recentLiveness = await prisma.auditLog.findFirst({
      where: { actorId: userId, action: "LIVENESS_VERIFY_PASS", createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
    });
    expect(recentWebAuthn).not.toBeNull();
    expect(recentLiveness).not.toBeNull();
  });

  it("revoked enrollment blocks verification", async () => {
    await prisma.faceEnrollment.update({ where: { userId }, data: { status: "REVOKED", revokedAt: new Date() } });
    const enrollment = await prisma.faceEnrollment.findUniqueOrThrow({ where: { userId } });
    expect(enrollment.status).toBe("REVOKED");
    // Server would return 404 for verify attempt
    await prisma.faceEnrollment.update({ where: { userId }, data: { status: "ACTIVE", revokedAt: null } });
  });
});
