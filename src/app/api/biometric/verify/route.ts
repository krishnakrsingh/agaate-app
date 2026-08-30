import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { decryptEmbedding } from "@/lib/biometric-crypto";
import { compareEmbeddings, validateEmbedding } from "@/lib/face-embedding";
import { faceModelMeta } from "@/lib/face-config";

const schema = z.object({
  embedding: z.array(z.number()).min(1).max(512),
  modelId: z.string().min(1).max(80),
  modelVersion: z.string().min(1).max(40),
  // Optional liveness claim — Stage 3 will validate challenge; Stage 2 records but does not spoof-proof
  liveness: z.object({ challengeId: z.string().optional(), passed: z.boolean().optional() }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    if (!actor.active) throw new Error("Account is unavailable");

    const input = schema.parse(await request.json());

    const enrollment = await prisma.faceEnrollment.findUnique({ where: { userId: actor.id } });
    if (!enrollment || enrollment.status !== "ACTIVE" || enrollment.revokedAt) {
      return NextResponse.json({ error: "No active face enrollment. Please enroll first with consent." }, { status: 404 });
    }

    // Model version guard — embeddings from different model versions not comparable
    if (input.modelId !== enrollment.modelId || input.modelVersion !== enrollment.modelVersion) {
      return NextResponse.json(
        {
          error: `Model version mismatch: enrolled ${enrollment.modelId}@${enrollment.modelVersion}, live ${input.modelId}@${input.modelVersion}. Please re-enroll.`,
          enrolledModel: { modelId: enrollment.modelId, modelVersion: enrollment.modelVersion },
          liveModel: { modelId: input.modelId, modelVersion: input.modelVersion },
        },
        { status: 422 }
      );
    }

    const liveCheck = validateEmbedding(input.embedding);
    if (!liveCheck.valid) return NextResponse.json({ error: liveCheck.error }, { status: 422 });

    let reference: Float32Array;
    try {
      reference = decryptEmbedding({
        ciphertext: enrollment.encryptedEmbedding,
        iv: enrollment.iv,
        authTag: enrollment.authTag,
      });
    } catch {
      return NextResponse.json({ error: "Stored biometric reference corrupted or key mismatch. Please re-enroll." }, { status: 500 });
    }

    const result = compareEmbeddings({
      reference: Array.from(reference),
      candidate: input.embedding,
      modelId: enrollment.modelId,
      modelVersion: enrollment.modelVersion,
      thresholdVersion: enrollment.thresholdVersion ?? undefined,
    });

    // Update lastVerifiedAt regardless of match (attempt tracking)
    await prisma.faceEnrollment.update({
      where: { userId: actor.id },
      data: { lastVerifiedAt: new Date() },
    });

    await audit(actor.id, result.matched ? "FACE_VERIFY_MATCH" : "FACE_VERIFY_NO_MATCH", "FaceEnrollment", enrollment.id, {
      modelId: result.modelId,
      modelVersion: result.modelVersion,
      threshold: result.threshold,
      thresholdVersion: result.thresholdVersion,
      distance: result.distance,
      similarityPercent: result.similarityPercent,
      matched: result.matched,
      liveness: input.liveness ?? null,
    });

    return NextResponse.json({
      matched: result.matched,
      distance: result.distance,
      similarityPercent: result.similarityPercent,
      threshold: result.threshold,
      thresholdVersion: result.thresholdVersion,
      modelId: result.modelId,
      modelVersion: result.modelVersion,
      message: result.matched ? "✓ Face verified" : "Face verification failed — similarity below threshold. Please retry in better lighting.",
    });
  } catch (error) {
    return apiError(error);
  }
}
