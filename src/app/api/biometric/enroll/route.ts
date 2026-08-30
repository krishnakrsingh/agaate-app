import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { encryptEmbedding } from "@/lib/biometric-crypto";
import { averageEmbeddings, validateEmbedding } from "@/lib/face-embedding";
import { FACE_ENROLLMENT_FRAMES_REQUIRED, FACE_MODEL_ID, FACE_MODEL_VERSION, FACE_THRESHOLD_VERSION, faceModelMeta } from "@/lib/face-config";

const schema = z.object({
  embeddings: z.array(z.array(z.number())).min(1).max(10),
  modelId: z.string().min(1).max(80),
  modelVersion: z.string().min(1).max(40),
  consent: z.boolean(),
  consentVersion: z.string().max(40).optional(),
  qualityScores: z.array(z.number().min(0).max(1)).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    if (!actor.active) throw new Error("Account is unavailable");

    const input = schema.parse(await request.json());

    if (!input.consent) throw new Error("Enrollment requires explicit consent. Please accept biometric data processing.");

    // Model version guard — must match server expected or at least be from allowed set
    // Do not silently accept arbitrary model strings; ensure client and server agree on comparison basis
    if (input.modelId !== FACE_MODEL_ID || input.modelVersion !== FACE_MODEL_VERSION) {
      return NextResponse.json(
        {
          error: `Model mismatch: server expects ${FACE_MODEL_ID}@${FACE_MODEL_VERSION}, got ${input.modelId}@${input.modelVersion}. Please reload with correct face model.`,
          expected: faceModelMeta(),
        },
        { status: 422 }
      );
    }

    if (input.embeddings.length < FACE_ENROLLMENT_FRAMES_REQUIRED) {
      return NextResponse.json(
        { error: `At least ${FACE_ENROLLMENT_FRAMES_REQUIRED} valid enrollment frames are required. Received ${input.embeddings.length}.` },
        { status: 422 }
      );
    }

    for (let idx = 0; idx < input.embeddings.length; idx++) {
      const v = validateEmbedding(input.embeddings[idx]);
      if (!v.valid) return NextResponse.json({ error: `Embedding ${idx}: ${v.error}` }, { status: 422 });
    }

    // Average and validate mean
    const reference = averageEmbeddings(input.embeddings);

    // Quality gate — if client provided qualityScores, ensure avg >= threshold
    if (input.qualityScores && input.qualityScores.length) {
      const avgQuality = input.qualityScores.reduce((a, b) => a + b, 0) / input.qualityScores.length;
      if (avgQuality < 0.5) {
        return NextResponse.json({ error: `Average quality ${avgQuality.toFixed(2)} below minimum. Please retry in better lighting.` }, { status: 422 });
      }
    }

    // Encrypt reference embedding for storage
    const encrypted = encryptEmbedding(reference);

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? null;

    const enrollment = await prisma.faceEnrollment.upsert({
      where: { userId: actor.id },
      update: {
        modelId: FACE_MODEL_ID,
        modelVersion: FACE_MODEL_VERSION,
        thresholdVersion: FACE_THRESHOLD_VERSION,
        encryptedEmbedding: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        status: "ACTIVE",
        consentGivenAt: new Date(),
        consentIp: ip,
        enrollmentCount: input.embeddings.length,
        qualityScore: input.qualityScores ? input.qualityScores.reduce((a, b) => a + b, 0) / input.qualityScores.length : null,
        revokedAt: null,
      },
      create: {
        userId: actor.id,
        modelId: FACE_MODEL_ID,
        modelVersion: FACE_MODEL_VERSION,
        thresholdVersion: FACE_THRESHOLD_VERSION,
        encryptedEmbedding: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        status: "ACTIVE",
        consentGivenAt: new Date(),
        consentIp: ip,
        enrollmentCount: input.embeddings.length,
        qualityScore: input.qualityScores ? input.qualityScores.reduce((a, b) => a + b, 0) / input.qualityScores.length : null,
      },
    });

    await audit(actor.id, "FACE_ENROLL", "FaceEnrollment", enrollment.id, {
      modelId: FACE_MODEL_ID,
      modelVersion: FACE_MODEL_VERSION,
      enrollmentCount: input.embeddings.length,
      thresholdVersion: FACE_THRESHOLD_VERSION,
    });

    return NextResponse.json(
      {
        enrolled: true,
        enrollmentId: enrollment.id,
        model: faceModelMeta(),
        enrollmentCount: enrollment.enrollmentCount,
        status: enrollment.status,
      },
      { status: 201 }
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE() {
  try {
    const actor = await currentActor();
    const enrollment = await prisma.faceEnrollment.findUnique({ where: { userId: actor.id } });
    if (!enrollment || enrollment.status === "REVOKED") {
      return NextResponse.json({ error: "No active enrollment to revoke." }, { status: 404 });
    }
    const updated = await prisma.faceEnrollment.update({
      where: { userId: actor.id },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
    await audit(actor.id, "FACE_REVOKE", "FaceEnrollment", updated.id, { modelId: updated.modelId });
    return NextResponse.json({ revoked: true, revokedAt: updated.revokedAt });
  } catch (error) {
    return apiError(error);
  }
}
