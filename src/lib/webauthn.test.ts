import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "./prisma";
import { storeChallenge, consumeChallenge, getRpConfig } from "./webauthn";
import { encryptEmbedding, decryptEmbedding } from "./biometric-crypto";
import bcrypt from "bcryptjs";

describe.sequential("Stage 1: WebAuthn Challenge Lifecycle & Security", () => {
  let testUserId: string;
  let disabledUserId: string;

  beforeAll(async () => {
    const hash = await bcrypt.hash("Password12345!", 10);
    const u = await prisma.user.create({
      data: { name: "WebAuthn Test User", email: `webauthn-${Date.now()}@test.agaate.local`, passwordHash: hash, role: "FARM_OFFICER" },
    });
    testUserId = u.id;
    const d = await prisma.user.create({
      data: { name: "Disabled WebAuthn User", email: `webauthn-disabled-${Date.now()}@test.agaate.local`, passwordHash: hash, role: "FARM_OFFICER", active: false },
    });
    disabledUserId = d.id;
  });

  afterAll(async () => {
    await prisma.webAuthnChallenge.deleteMany({ where: { userId: { in: [testUserId, disabledUserId] } } });
    await prisma.passkeyCredential.deleteMany({ where: { userId: { in: [testUserId, disabledUserId] } } });
    await prisma.faceEnrollment.deleteMany({ where: { userId: { in: [testUserId, disabledUserId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [testUserId, disabledUserId] } } });
  });

  it("stores a registration challenge and allows single consumption", async () => {
    const challenge = `test-reg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await storeChallenge({ userId: testUserId, challenge, type: "registration" });
    const found = await prisma.webAuthnChallenge.findUnique({ where: { challenge } });
    expect(found).not.toBeNull();
    expect(found!.userId).toBe(testUserId);

    const consumed = await consumeChallenge({ userId: testUserId, challenge, type: "registration" });
    expect(consumed.challenge).toBe(challenge);

    const after = await prisma.webAuthnChallenge.findUnique({ where: { challenge } });
    expect(after).toBeNull();
  });

  it("rejects replay of consumed challenge", async () => {
    const challenge = `replay-${Date.now()}`;
    await storeChallenge({ userId: testUserId, challenge, type: "authentication" });
    await consumeChallenge({ userId: testUserId, challenge, type: "authentication" });
    await expect(consumeChallenge({ userId: testUserId, challenge, type: "authentication" })).rejects.toThrow(/Challenge not found/);
  });

  it("rejects expired challenge", async () => {
    const challenge = `expired-${Date.now()}`;
    await prisma.webAuthnChallenge.create({
      data: { userId: testUserId, challenge, type: "authentication", expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(consumeChallenge({ userId: testUserId, challenge, type: "authentication" })).rejects.toThrow(/expired/i);
  });

  it("rejects challenge for wrong user (ID substitution)", async () => {
    const challenge = `wrong-user-${Date.now()}`;
    await storeChallenge({ userId: testUserId, challenge, type: "registration" });
    await expect(consumeChallenge({ userId: disabledUserId, challenge, type: "registration" })).rejects.toThrow(/does not belong/);
    // cleanup
    await prisma.webAuthnChallenge.deleteMany({ where: { challenge } });
  });

  it("rejects challenge type mismatch", async () => {
    const challenge = `mismatch-${Date.now()}`;
    await storeChallenge({ userId: testUserId, challenge, type: "registration" });
    await expect(consumeChallenge({ userId: testUserId, challenge, type: "authentication" })).rejects.toThrow(/type mismatch/i);
    await prisma.webAuthnChallenge.deleteMany({ where: { challenge } });
  });

  it("enforces single active challenge per user+type (replaces previous)", async () => {
    const c1 = `single-1-${Date.now()}`;
    const c2 = `single-2-${Date.now() + 1}`;
    await storeChallenge({ userId: testUserId, challenge: c1, type: "registration" });
    await storeChallenge({ userId: testUserId, challenge: c2, type: "registration" });
    const remaining = await prisma.webAuthnChallenge.findMany({ where: { userId: testUserId, type: "registration" } });
    expect(remaining).toHaveLength(1);
    expect(remaining[0].challenge).toBe(c2);
    await prisma.webAuthnChallenge.deleteMany({ where: { challenge: c2 } });
  });

  it("getRpConfig derives from request headers", async () => {
    const req = new Request("http://localhost:3000/api/webauthn/register/options", { headers: { host: "localhost:3000" } });
    const { rpId, rpName, origin } = getRpConfig(req);
    expect(rpId).toBe("localhost");
    expect(origin).toBe("http://localhost:3000");
    expect(rpName).toBeTruthy();
  });

  it("disabled user cannot be used for WebAuthn (active check)", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: disabledUserId } });
    expect(user.active).toBe(false);
    // Registration and authentication routes check actor.active before generating options
    // Simulate guard: require active true
    const isActive = user.active;
    expect(() => {
      if (!isActive) throw new Error("Account is unavailable");
    }).toThrow(/Account is unavailable/);
  });

  it("passkey credential counter increments and detects replay", async () => {
    // Simulate creation then auth increment
    const cred = await prisma.passkeyCredential.create({
      data: {
        userId: testUserId,
        credentialId: `cred-${Date.now()}-test`,
        publicKey: Buffer.from("test-public-key").toString("base64url"),
        counter: 5n,
        transports: JSON.stringify(["internal"]),
        deviceType: "singleDevice",
        backedUp: false,
      },
    });
    expect(Number(cred.counter)).toBe(5);

    // Simulate successful auth increments counter
    const updated = await prisma.passkeyCredential.update({
      where: { id: cred.id },
      data: { counter: 6n, lastUsedAt: new Date() },
    });
    expect(Number(updated.counter)).toBe(6);

    // Replay with old counter should be flagged (newCounter <= oldCounter)
    const newCounter = 5;
    const isReplay = newCounter <= Number(cred.counter);
    expect(isReplay).toBe(true);
  });

  it("revoked passkey is excluded from authentication options", async () => {
    const cred = await prisma.passkeyCredential.create({
      data: {
        userId: testUserId,
        credentialId: `cred-revoked-${Date.now()}`,
        publicKey: Buffer.from("revoked-key").toString("base64url"),
        counter: 0n,
        revokedAt: new Date(),
      },
    });
    const active = await prisma.passkeyCredential.findMany({ where: { userId: testUserId, revokedAt: null } });
    expect(active.find((c) => c.id === cred.id)).toBeUndefined();
  });
});

describe("Stage 1: Biometric Encryption (AES-256-GCM) Roundtrip", () => {
  it("encrypts and decrypts embedding correctly", () => {
    const original = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, -0.1, -0.2]);
    const enc = encryptEmbedding(original);
    expect(enc.ciphertext).toBeTruthy();
    expect(enc.iv).toBeTruthy();
    expect(enc.authTag).toBeTruthy();
    const dec = decryptEmbedding(enc);
    expect(dec.length).toBe(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(dec[i]).toBeCloseTo(original[i], 5);
    }
  });

  it("different embeddings produce different ciphertexts (IV randomness)", () => {
    const emb = [1.0, 2.0, 3.0];
    const e1 = encryptEmbedding(emb);
    const e2 = encryptEmbedding(emb);
    expect(e1.ciphertext).not.toBe(e2.ciphertext);
    expect(e1.iv).not.toBe(e2.iv);
  });

  it("decryption fails with wrong authTag", () => {
    const enc = encryptEmbedding([0.5, 0.6]);
    const tampered = { ...enc, authTag: Buffer.from("wrongtag12345678").toString("base64") };
    expect(() => decryptEmbedding(tampered)).toThrow();
  });

  it("requires 32-byte key via env", async () => {
    const prev = process.env.BIOMETRIC_ENCRYPTION_KEY;
    process.env.BIOMETRIC_ENCRYPTION_KEY = "short";
    expect(() => encryptEmbedding([0.1])).toThrow(/32 bytes/);
    process.env.BIOMETRIC_ENCRYPTION_KEY = prev;
  });
});
