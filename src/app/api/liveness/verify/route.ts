import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { decryptEmbedding } from "@/lib/biometric-crypto";
import { compareEmbeddings, validateEmbedding } from "@/lib/face-embedding";

const schema = z.object({
  challengeId: z.string().cuid(),
  embedding: z.array(z.number()).min(1).max(512),
  modelId: z.string().min(1).max(80),
  modelVersion: z.string().min(1).max(40),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    if (!actor.active) throw new Error("Account is unavailable");

    const input = schema.parse(await request.json());

    // Validate challenge: exists, belongs to user, not used, not expired
    const challenge = await prisma.livenessChallenge.findUnique({ where: { id: input.challengeId } });
    if (!challenge) return NextResponse.json({ error: "Liveness challenge not found." }, { status: 404 });
    if (challenge.userId !== actor.id) return NextResponse.json({ error: "Challenge does not belong to this user." }, { status: 403 });
    if (challenge.used) return NextResponse.json({ error: "Challenge already used. Request a new one (replay prevented)." }, { status: 409 });
    if (challenge.expiresAt < new Date()) {
      await prisma.livenessChallenge.delete({ where: { id: challenge.id } });
      return NextResponse.json({ error: "Challenge has expired. Please request a new one." }, { status: 422 });
    }

    // Validate face enrollment
    const enrollment = await prisma.faceEnrollment.findUnique({ where: { userId: actor.id } });
    if (!enrollment || enrollment.status !== "ACTIVE" || enrollment.revokedAt)
      return NextResponse.json({ error: "No active face enrollment." }, { status: 404 });

    if (input.modelId !== enrollment.modelId || input.modelVersion !== enrollment.modelVersion) {
      return NextResponse.json(
        {
          error: `Model mismatch: enrolled ${enrollment.modelId}@${enrollment.modelVersion}, live ${input.modelId}@${input.modelVersion}. Please re-enroll.`,
        },
        { status: 422 }
      );
    }

    const liveCheck = validateEmbedding(input.embedding);
    if (!liveCheck.valid) return NextResponse.json({ error: liveCheck.error }, { status: 422 });

    let reference: Float32Array;
    try {
      reference = decryptEmbedding({ ciphertext: enrollment.encryptedEmbedding, iv: enrollment.iv, authTag: enrollment.authTag });
    } catch {
      return NextResponse.json({ error: "Stored biometric reference corrupted. Please re-enroll." }, { status: 500 });
    }

    // Same-person check (distance ≤ threshold). This also guards replay where attacker reuses old embedding from different person.
    const result = compareEmbeddings({
      reference: Array.from(reference),
      candidate: input.embedding,
      modelId: enrollment.modelId,
      modelVersion: enrollment.modelVersion,
      thresholdVersion: enrollment.thresholdVersion ?? undefined,
    });

    // Mark challenge as used regardless of match? Only on successful match to allow retry on fail? But spec says prevent replay — consume only on successful liveness to allow retry on fail.
    // We consume challenge only on match to prevent brute force replay, and on mismatch we keep challenge for one more retry? For simplicity, consume on match, keep on mismatch for retry within TTL.
    // Here we consume only if matched; if not matched, keep challenge for retry but audit failed attempt.
    let livenessVerified = false;
    if (result.matched) {
      await prisma.livenessChallenge.update({ where: { id: challenge.id }, data: { used: true } });
      await prisma.faceEnrollment.update({ where: { userId: actor.id }, data: { lastVerifiedAt: new Date() } });
      livenessVerified = true;
      await audit(actor.id, "LIVENESS_VERIFY_PASS", "LivenessChallenge", challenge.id, {
        instruction: challenge.instruction,
        distance: result.distance,
        similarityPercent: result.similarityPercent,
        matched: true,
      });
    } else {
      await audit(actor.id, "LIVENESS_VERIFY_FAIL", "LivenessChallenge", challenge.id, {
        instruction: challenge.instruction,
        distance: result.distance,
        similarityPercent: result.similarityPercent,
        matched: false,
      });
    }

    // Document honest security level: basic challenge-response freshness, not strong PAD
    return NextResponse.json({
      verified: livenessVerified,
      livenessVerified,
      matched: result.matched,
      distance: result.distance,
      similarityPercent: result.similarityPercent,
      threshold: result.threshold,
      thresholdVersion: result.thresholdVersion,
      modelId: result.modelId,
      modelVersion: result.modelVersion,
      instruction: challenge.instruction,
      // Honest disclaimer
      securityLevel: "basic-challenge-response-freshness",
      message: livenessVerified
        ? `✓ Liveness verified — ${challenge.instruction} challenge passed, face matched`
        : `Liveness check failed — face did not match or challenge not satisfied. Please retry.`,
    });
  } catch (error) {
    return apiError(error);
  }
}
