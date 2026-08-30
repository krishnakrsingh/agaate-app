import { NextResponse } from "next/server";
import { currentActor } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { faceModelMeta } from "@/lib/face-config";

export async function GET() {
  try {
    const actor = await currentActor();
    const enrollment = await prisma.faceEnrollment.findUnique({
      where: { userId: actor.id },
      select: {
        id: true,
        modelId: true,
        modelVersion: true,
        thresholdVersion: true,
        status: true,
        enrollmentCount: true,
        qualityScore: true,
        createdAt: true,
        updatedAt: true,
        revokedAt: true,
        consentGivenAt: true,
        lastVerifiedAt: true,
      },
    });

    if (!enrollment) {
      return NextResponse.json({ enrolled: false, expectedModel: faceModelMeta() });
    }

    const isActive = enrollment.status === "ACTIVE" && !enrollment.revokedAt;
    const modelMismatch = enrollment.modelId !== faceModelMeta().modelId || enrollment.modelVersion !== faceModelMeta().modelVersion;

    return NextResponse.json({
      enrolled: isActive,
      status: enrollment.status,
      modelId: enrollment.modelId,
      modelVersion: enrollment.modelVersion,
      thresholdVersion: enrollment.thresholdVersion,
      enrollmentCount: enrollment.enrollmentCount,
      qualityScore: enrollment.qualityScore?.toString() ?? null,
      createdAt: enrollment.createdAt,
      updatedAt: enrollment.updatedAt,
      revokedAt: enrollment.revokedAt,
      consentGivenAt: enrollment.consentGivenAt,
      lastVerifiedAt: enrollment.lastVerifiedAt,
      modelMismatch,
      expectedModel: faceModelMeta(),
    });
  } catch (error) {
    return apiError(error);
  }
}
