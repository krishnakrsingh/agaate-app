import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { distanceMeters, utcDateOnly } from "@/lib/business";
import { apiError } from "@/lib/api";

const schema = z.object({
  farmId: z.string().optional(),
  action: z.enum(["START", "END"]),
  latitude: z.coerce.number().gte(-90).lte(90).optional(),
  longitude: z.coerce.number().gte(-180).lte(180).optional(),
  selfieMediaId: z.string().optional(),
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
      orderBy: { startAt: "desc" },
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

    // ── ACTION: START SHIFT ──
    if (input.action === "START") {
      if (!input.farmId) {
        return NextResponse.json({ error: "Farm selection is required to start a shift." }, { status: 422 });
      }
      if (input.latitude == null || input.longitude == null) {
        return NextResponse.json({ error: "GPS location is required to verify start-of-shift presence." }, { status: 422 });
      }
      if (!input.selfieMediaId) {
        return NextResponse.json({ error: "A valid uploaded selfie is required to start a shift." }, { status: 422 });
      }

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
      if (outside && !input.reason) {
        return NextResponse.json(
          { error: "A reason is required outside the farm geofence.", distanceMeters: distance },
          { status: 422 }
        );
      }

      const attendance = await prisma.$transaction(async (tx) => {
        const existing = await tx.attendance.findUnique({
          where: {
            userId_farmId_attendanceDate: {
              userId: actor.id,
              farmId: input.farmId!,
              attendanceDate: today(),
            },
          },
        });
        if (existing) throw new Error("Day has already been started for this farm.");

        const created = await tx.attendance.create({
          data: {
            userId: actor.id,
            farmId: input.farmId!,
            attendanceDate: today(),
            status: outside ? "EXCEPTION_PENDING" : "OPEN",
            startAt: new Date(),
            startLatitude: input.latitude,
            startLongitude: input.longitude,
            startSelfieKey: media.storageKey,
            exceptionReason: input.reason,
          },
        });
        if (outside) {
          await tx.attendanceException.create({
            data: { attendanceId: created.id, distanceMeters: distance, reason: input.reason! },
          });
        }
        return created;
      });

      await audit(
        actor.id,
        "START_DAY",
        "Attendance",
        attendance.id,
        { farmId: input.farmId, outside, distanceMeters: distance }
      );
      return NextResponse.json({ attendance, distanceMeters: distance, withinGeofence: !outside });
    }

    // ── ACTION: END SHIFT ──
    // Locate the active shift for today
    const existing = input.farmId
      ? await prisma.attendance.findUnique({
          where: {
            userId_farmId_attendanceDate: {
              userId: actor.id,
              farmId: input.farmId,
              attendanceDate: today(),
            },
          },
          include: { farm: true },
        })
      : await prisma.attendance.findFirst({
          where: {
            userId: actor.id,
            attendanceDate: today(),
            endAt: null,
          },
          include: { farm: true },
          orderBy: { startAt: "desc" },
        });

    if (!existing || !existing.startAt) {
      throw new Error("Start the day before ending it.");
    }
    if (existing.endAt) {
      throw new Error("Day has already been ended.");
    }

    const targetFarmId = existing.farmId;
    await requireFarmAccess(targetFarmId);
    const farm = existing.farm ?? (await prisma.farm.findUniqueOrThrow({ where: { id: targetFarmId } }));

    // Optional selfie on clock out
    let endSelfieKey: string | null = null;
    if (input.selfieMediaId) {
      const media = await prisma.mediaAsset.findFirst({
        where: {
          id: input.selfieMediaId,
          uploadedById: actor.id,
          kind: "SELFIE",
          verifiedAt: { not: null },
        },
      });
      if (media) endSelfieKey = media.storageKey;
    }

    // Location determination: use provided coordinates or fallback to shift start/farm coordinates
    const endLat = input.latitude ?? (existing.startLatitude != null ? Number(existing.startLatitude) : Number(farm.latitude));
    const endLng = input.longitude ?? (existing.startLongitude != null ? Number(existing.startLongitude) : Number(farm.longitude));

    const distance = distanceMeters(
      { latitude: Number(farm.latitude), longitude: Number(farm.longitude) },
      { latitude: endLat, longitude: endLng }
    );
    const outside = distance > farm.geofenceRadiusMeters;
    const reason = input.reason || (outside ? (existing.exceptionReason || "Clocked out outside geofence") : undefined);

    const attendance = await prisma.$transaction(async (tx) => {
      const endStatus = outside
        ? "EXCEPTION_PENDING"
        : existing.status === "OPEN" || existing.status === "EXCEPTION_APPROVED"
        ? "COMPLETED"
        : existing.status;

      return tx.attendance.update({
        where: { id: existing.id },
        data: {
          endAt: new Date(),
          endLatitude: endLat,
          endLongitude: endLng,
          endSelfieKey: endSelfieKey ?? existing.endSelfieKey,
          status: endStatus,
          exception: outside
            ? {
                upsert: {
                  create: { distanceMeters: distance, reason: reason ?? "Outside geofence clock-out" },
                  update: { distanceMeters: distance, reason: reason ?? "Outside geofence clock-out" },
                },
              }
            : undefined,
        },
      });
    });

    await audit(
      actor.id,
      "END_DAY",
      "Attendance",
      attendance.id,
      { farmId: targetFarmId, outside, distanceMeters: distance }
    );
    return NextResponse.json({ attendance, distanceMeters: distance, withinGeofence: !outside });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE() {
  try {
    const actor = await currentActor();
    const attendanceDate = today();
    await prisma.attendance.deleteMany({
      where: { userId: actor.id, attendanceDate },
    });
    await audit(actor.id, "RESET_DEMO_SHIFT", "Attendance", actor.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}

