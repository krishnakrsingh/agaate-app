import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { utcDateOnly } from "@/lib/business";
import { apiError } from "@/lib/api";
import { validateAttendanceLocation } from "@/lib/attendance-geo";

const schema = z.object({
  farmId: z.string().optional(),
  plotId: z.string().optional(),
  action: z.enum(["START", "END"]),
  latitude: z.number().gte(-90).lte(90).optional(),
  longitude: z.number().gte(-180).lte(180).optional(),
  accuracyMeters: z.number().optional(),
  selfieMediaId: z.string().optional(),
  reason: z.string().min(3).max(1000).optional(),
});

const SELFIE_FRESH_MS = 30 * 60 * 1000;

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
    const { assertSameOrigin, getClientIp } = await import("@/lib/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    requireRole(actor.role, ["FARM_OFFICER", "SUPER_ADMIN"]);
    const { throttle } = await import("@/lib/rate-limit");
    const clockSlot = throttle(`attendance:${getClientIp(request.headers)}:${actor.id}`, 30, 60_000);
    if (!clockSlot.allowed) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
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
          farmId: input.farmId,
          kind: "SELFIE",
          verifiedAt: { not: null },
        },
      });
      if (!media?.verifiedAt) throw new Error("A valid uploaded selfie is required.");
      // One-time fresh binding: selfies expire after 30 min and can't be replayed.
      if (Date.now() - new Date(media.verifiedAt).getTime() > SELFIE_FRESH_MS || Date.now() - new Date(media.createdAt).getTime() > SELFIE_FRESH_MS) {
        throw new Error("A valid uploaded selfie is required.");
      }
      const reused = await prisma.attendance.findFirst({
        where: { userId: actor.id, attendanceDate: today(), OR: [{ startSelfieKey: media.storageKey }, { endSelfieKey: media.storageKey }] },
        select: { id: true },
      });
      if (reused) throw new Error("A valid uploaded selfie is required.");

      // Canonical location decision (plot → farm polygon → radius).
      // Server-authoritative; any frontend radar is display-only.
      let startPlot: { farmId: string; boundaryGeoJson: string | null; deletedAt: Date | null; status: string } | null = null;
      if (input.plotId) {
        const found = await prisma.plot.findUnique({
          where: { id: input.plotId },
          select: { farmId: true, boundaryGeoJson: true, deletedAt: true, status: true },
        });
        if (!found) return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
        startPlot = found;
      }
      const checked = validateAttendanceLocation({
        lat: input.latitude,
        lng: input.longitude,
        accuracyMeters: input.accuracyMeters,
        farmId: input.farmId!,
        farm,
        plot: startPlot,
      });
      if (!checked.ok) {
        return NextResponse.json({ error: checked.message, code: checked.code }, { status: checked.status });
      }
      const outside = !checked.inside;
      const basis = checked.basis;
      const distance = checked.distanceMeters;
      const linkPlotId =
        startPlot && !startPlot.deletedAt && startPlot.status !== "ARCHIVED" ? input.plotId! : null;
      if (outside && !input.reason) {
        return NextResponse.json(
          {
            error: "A reason is required outside the farm geofence.",
            code: "REASON_REQUIRED",
            distanceMeters: distance,
            geofenceBasis: basis,
          },
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
            plotId: linkPlotId,
            attendanceDate: today(),
            status: outside ? "EXCEPTION_PENDING" : "OPEN",
            geofenceBasis: basis,
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
        { farmId: input.farmId, plotId: linkPlotId, outside, distanceMeters: distance, geofenceBasis: basis }
      );
      return NextResponse.json({ attendance, distanceMeters: distance, withinGeofence: !outside, geofenceBasis: basis });
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

    // Optional selfie on clock out (same freshness + farm binding as clock-in)
    let endSelfieKey: string | null = null;
    if (input.selfieMediaId) {
      const media = await prisma.mediaAsset.findFirst({
        where: {
          id: input.selfieMediaId,
          uploadedById: actor.id,
          farmId: targetFarmId,
          kind: "SELFIE",
          verifiedAt: { not: null },
        },
      });
      if (media?.verifiedAt && Date.now() - new Date(media.verifiedAt).getTime() <= SELFIE_FRESH_MS && Date.now() - new Date(media.createdAt).getTime() <= SELFIE_FRESH_MS) {
        const reusedEnd = await prisma.attendance.findFirst({
          where: { userId: actor.id, attendanceDate: today(), OR: [{ startSelfieKey: media.storageKey }, { endSelfieKey: media.storageKey }] },
          select: { id: true },
        });
        if (!reusedEnd) endSelfieKey = media.storageKey;
      }
    }

    // GPS is mandatory on clock-out: no fallback to start/farm coords (clock-out-from-anywhere).
    if (input.latitude == null || input.longitude == null) {
      return NextResponse.json({ error: "GPS location is required to verify end-of-shift presence." }, { status: 422 });
    }
    const endLat = input.latitude;
    const endLng = input.longitude;

    // END uses the START-associated plot (if any) through the same canonical path.
    let endPlot: { farmId: string; boundaryGeoJson: string | null; deletedAt: Date | null; status: string } | null = null;
    if (existing.plotId) {
      endPlot = await prisma.plot.findUnique({
        where: { id: existing.plotId },
        select: { farmId: true, boundaryGeoJson: true, deletedAt: true, status: true },
      });
    }
    const endChecked = validateAttendanceLocation({
      lat: endLat,
      lng: endLng,
      accuracyMeters: input.accuracyMeters,
      farmId: targetFarmId,
      farm,
      plot: endPlot,
    });
    if (!endChecked.ok) {
      return NextResponse.json({ error: endChecked.message, code: endChecked.code }, { status: endChecked.status });
    }
    const distance = endChecked.distanceMeters;
    const outside = !endChecked.inside;
    const basis = endChecked.basis;
    if (outside && !input.reason) {
      return NextResponse.json(
        {
          error: "A reason is required outside the farm geofence.",
          code: "REASON_REQUIRED",
          distanceMeters: distance,
          geofenceBasis: basis,
        },
        { status: 422 }
      );
    }
    const reason = input.reason || undefined;

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
          geofenceBasis: basis,
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
      { farmId: targetFarmId, outside, distanceMeters: distance, geofenceBasis: basis }
    );
    return NextResponse.json({ attendance, distanceMeters: distance, withinGeofence: !outside, geofenceBasis: basis });
  } catch (error) {
    return apiError(error);
  }
}

