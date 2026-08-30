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

    // ── BRD §17 & §18: Pure Selfie + GPS Location Matching ──
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
      { farmId: input.farmId, outside, distanceMeters: distance }
    );
    return NextResponse.json({ attendance, distanceMeters: distance, withinGeofence: !outside });
  } catch (error) {
    return apiError(error);
  }
}
