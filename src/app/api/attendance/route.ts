import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { distanceMeters, utcDateOnly } from "@/lib/business";
import { apiError } from "@/lib/api";

const schema = z.object({
  farmId: z.string(),
  action: z.enum(["START", "END"]),
  latitude: z.coerce.number().gte(-90).lte(90),
  longitude: z.coerce.number().gte(-180).lte(180),
  selfieMediaId: z.string(),
  reason: z.string().min(5).max(1000).optional(),
});

const today = () => utcDateOnly(new Date());

export async function GET() {
  try {
    const actor = await currentActor();
    const attendance = await prisma.attendance.findFirst({
      where: {
        userId: actor.id,
        attendanceDate: today(),
      },
      include: {
        farm: { select: { id: true, name: true, location: true } },
      },
      orderBy: { attendanceDate: "desc" },
    });

    return NextResponse.json({ attendance });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["FARM_OFFICER", "SUPER_ADMIN"]);
    const input = schema.parse(await request.json());
    await requireFarmAccess(input.farmId);
    const farm = await prisma.farm.findUniqueOrThrow({ where: { id: input.farmId } });
    const media = await prisma.mediaAsset.findFirst({
      where: {
        id: input.selfieMediaId,
        uploadedById: actor.id,
        kind: "SELFIE",
        verifiedAt: { not: null },
      },
    });
    if (!media) throw new Error("A valid uploaded selfie is required.");
    const distance = distanceMeters(
      { latitude: Number(farm.latitude), longitude: Number(farm.longitude) },
      { latitude: input.latitude, longitude: input.longitude }
    );
    const outside = distance > farm.geofenceRadiusMeters;
    if (outside && !input.reason)
      return NextResponse.json(
        { error: "A reason is required outside the farm geofence.", distanceMeters: distance },
        { status: 422 }
      );

    // ── Stage 4: Biometric presence verification (server-authoritative, not client trust) ──
    // If user has enrolled passkey/face, require recent server-verified proof within 5 minutes.
    // No fake confidence, no client boolean — we check audit + DB state.
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [passkeyCount, faceEnrollment] = await Promise.all([
      prisma.passkeyCredential.count({ where: { userId: actor.id, revokedAt: null } }),
      prisma.faceEnrollment.findUnique({ where: { userId: actor.id } }),
    ]);

    const strictBiometric = process.env.REQUIRE_BIOMETRIC_FOR_ATTENDANCE === "true" && actor.role === "FARM_OFFICER";
    if (strictBiometric) {
      if (passkeyCount === 0)
        return NextResponse.json(
          { error: "Device enrollment required. Please register a passkey at /settings/biometric before clocking attendance (strict mode)." },
          { status: 422 }
        );
      const hasActiveFaceStrict = faceEnrollment && faceEnrollment.status === "ACTIVE" && !faceEnrollment.revokedAt;
      if (!hasActiveFaceStrict)
        return NextResponse.json(
          { error: "Face enrollment required. Please complete 3-frame face enrollment at /settings/biometric." },
          { status: 422 }
        );
    }

    let webauthnVerified = false;
    let webauthnCredentialId: string | null = null;
    let faceVerified = false;
    let faceDistance: number | null = null;
    let faceSimilarityPercent: number | null = null;
    let faceModelId: string | null = null;
    let faceThresholdVersion: string | null = null;
    let livenessVerified = false;
    let livenessChallengeId: string | null = null;

    if (passkeyCount > 0 || strictBiometric) {
      const recentWebAuthn = await prisma.auditLog.findFirst({
        where: { actorId: actor.id, action: "WEBAUTHN_AUTH_VERIFY", createdAt: { gte: fiveMinutesAgo } },
        orderBy: { createdAt: "desc" },
      });
      if (!recentWebAuthn) {
        return NextResponse.json(
          { error: "Device verification required within 5 minutes. Please verify with Face ID / Fingerprint at /settings/biometric before clocking attendance." },
          { status: 422 }
        );
      }
      webauthnVerified = true;
      webauthnCredentialId = (recentWebAuthn.metadata as any)?.credentialId ?? null;
    }

    const hasActiveFace = faceEnrollment && faceEnrollment.status === "ACTIVE" && !faceEnrollment.revokedAt;
    if (hasActiveFace || strictBiometric) {
      const recentFace = await prisma.auditLog.findFirst({
        where: {
          actorId: actor.id,
          action: { in: ["FACE_VERIFY_MATCH", "LIVENESS_VERIFY_PASS"] },
          createdAt: { gte: fiveMinutesAgo },
        },
        orderBy: { createdAt: "desc" },
      });
      if (!recentFace) {
        return NextResponse.json(
          { error: "Face verification required within 5 minutes. Please verify face at /settings/biometric before clocking attendance." },
          { status: 422 }
        );
      }
      faceVerified = true;
      faceDistance = (recentFace.metadata as any)?.distance ?? null;
      faceSimilarityPercent = (recentFace.metadata as any)?.similarityPercent ?? null;
      faceModelId = (recentFace.metadata as any)?.modelId ?? faceEnrollment?.modelId ?? null;
      faceThresholdVersion = (recentFace.metadata as any)?.thresholdVersion ?? faceEnrollment?.thresholdVersion ?? null;

      const recentLiveness = await prisma.auditLog.findFirst({
        where: { actorId: actor.id, action: "LIVENESS_VERIFY_PASS", createdAt: { gte: fiveMinutesAgo } },
        orderBy: { createdAt: "desc" },
      });
      if (!recentLiveness) {
        return NextResponse.json(
          { error: "Liveness verification required within 5 minutes. Please complete the randomized liveness challenge at /settings/biometric." },
          { status: 422 }
        );
      }
      livenessVerified = true;
      livenessChallengeId = recentLiveness.entityId;
    }

    const attendance = await prisma.$transaction(async (tx) => {
      const existing = await tx.attendance.findUnique({
        where: {
          userId_farmId_attendanceDate: {
            userId: actor.id,
            farmId: input.farmId,
            attendanceDate: today(),
          },
        },
      });
      if (input.action === "START") {
        if (existing) throw new Error("Day has already been started for this farm.");
        const created = await tx.attendance.create({
          data: {
            userId: actor.id,
            farmId: input.farmId,
            attendanceDate: today(),
            status: outside ? "EXCEPTION_PENDING" : "OPEN",
            startAt: new Date(),
            startLatitude: input.latitude,
            startLongitude: input.longitude,
            startSelfieKey: media.storageKey,
            exceptionReason: input.reason,
            webauthnVerified,
            webauthnCredentialId,
            faceVerified,
            faceDistance,
            faceSimilarityPercent,
            faceModelId,
            faceThresholdVersion,
            livenessVerified,
            livenessChallengeId,
          },
        });
        if (outside)
          await tx.attendanceException.create({
            data: { attendanceId: created.id, distanceMeters: distance, reason: input.reason! },
          });
        return created;
      }
      if (!existing?.startAt) throw new Error("Start the day before ending it.");
      if (existing.endAt) throw new Error("Day has already been ended.");
      const endStatus = outside
        ? "EXCEPTION_PENDING"
        : existing.status === "OPEN"
        ? "COMPLETED"
        : existing.status;
      return tx.attendance.update({
        where: { id: existing.id },
        data: {
          endAt: new Date(),
          endLatitude: input.latitude,
          endLongitude: input.longitude,
          endSelfieKey: media.storageKey,
          status: endStatus,
          webauthnVerified,
          webauthnCredentialId,
          faceVerified,
          faceDistance,
          faceSimilarityPercent,
          faceModelId,
          faceThresholdVersion,
          livenessVerified,
          livenessChallengeId,
          exception: outside
            ? {
                upsert: {
                  create: { distanceMeters: distance, reason: input.reason! },
                  update: { distanceMeters: distance, reason: input.reason! },
                },
              }
            : undefined,
        },
      });
    });
    await audit(
      actor.id,
      input.action === "START" ? "START_DAY" : "END_DAY",
      "Attendance",
      attendance.id,
      { farmId: input.farmId, outside, distanceMeters: distance, webauthnVerified, faceVerified, livenessVerified, faceDistance, faceModelId }
    );
    return NextResponse.json({ attendance, distanceMeters: distance, withinGeofence: !outside });
  } catch (error) {
    return apiError(error);
  }
}
