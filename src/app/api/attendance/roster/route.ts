import { NextRequest, NextResponse } from "next/server";
import { currentActor, accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, noStore } from "@/lib/api";
import { distanceMeters, utcDateOnly } from "@/lib/business";
import { attendanceDisplayVerdict } from "@/lib/attendance-geo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    if (!["SUPER_ADMIN", "FARM_ADMIN"].includes(actor.role)) {
      throw new Error("Only administrators and farm directors can view the operational roster.");
    }

    const { searchParams } = request.nextUrl;
    const dateParam = searchParams.get("date");
    const farmIdParam = searchParams.get("farmId");

    const targetDate = dateParam ? utcDateOnly(new Date(dateParam)) : utcDateOnly(new Date());
    const farmScope = await accessibleFarmWhere();

    // Query estates accessible to current actor — bounded at scale.
    // Without a farm filter a SUPER_ADMIN scope can match lakhs of farms;
    // refuse broad loads and force a scoped estate pick.
    if (!farmIdParam && actor.role === "SUPER_ADMIN") {
      const estateCount = await prisma.farm.count({ where: farmScope });
      if (estateCount > 200) {
        return NextResponse.json(
          {
            date: (dateParam || new Date().toISOString().slice(0, 10)).slice(0, 10),
            summary: {
              totalOfficers: 0,
              onDutyCount: 0,
              completedCount: 0,
              exceptionPendingCount: 0,
              notClockedInCount: 0,
              withinGeofenceCount: 0,
              complianceRate: 100,
            },
            roster: [],
            estates: [],
            requiresEstateFilter: true,
            estateCount,
          },
          { headers: noStore }
        );
      }
    }
    const estates = await prisma.farm.findMany({
      where: farmIdParam
        ? { AND: [farmScope, { id: farmIdParam }] }
        : farmScope,
      select: {
        id: true,
        name: true,
        location: true,
        latitude: true,
        longitude: true,
        geofenceRadiusMeters: true,
        boundaryGeoJson: true,
        status: true,
      },
      orderBy: { name: "asc" },
      take: 500,
    });

    const estateIds = estates.map((e) => e.id);

    // Plot fences for plot-linked attendance rows (two bounded queries).
    const plotIdRows = await prisma.attendance.findMany({
      where: { farmId: { in: estateIds }, attendanceDate: targetDate, NOT: { plotId: null } },
      select: { plotId: true },
    });
    const rosterPlotIds = [...new Set(plotIdRows.map((r) => r.plotId).filter((id): id is string => !!id))];
    const rosterPlots = rosterPlotIds.length
      ? await prisma.plot.findMany({
          where: { id: { in: rosterPlotIds } },
          select: { id: true, farmId: true, boundaryGeoJson: true, deletedAt: true, status: true },
        })
      : [];
    const rosterPlotMap = new Map(rosterPlots.map((p) => [p.id, p]));

    if (estateIds.length === 0) {
      return NextResponse.json(
        {
          date: targetDate.toISOString().slice(0, 10),
          summary: {
            totalOfficers: 0,
            onDutyCount: 0,
            completedCount: 0,
            exceptionPendingCount: 0,
            notClockedInCount: 0,
            withinGeofenceCount: 0,
            complianceRate: 100,
          },
          roster: [],
          estates: [],
        },
        { headers: noStore }
      );
    }

    // Query Farm Officers with access to these estates — bounded.
    const officers = await prisma.user.findMany({
      where: {
        role: "FARM_OFFICER",
        active: true,
        farmAccess: {
          some: {
            farmId: { in: estateIds },
          },
        },
      },
      take: 2000,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        farmAccess: {
          where: { farmId: { in: estateIds } },
          select: { farmId: true, canManage: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Query today's attendance records on these estates
    const attendances = await prisma.attendance.findMany({
      where: {
        farmId: { in: estateIds },
        attendanceDate: targetDate,
      },
      include: {
        exception: true,
        user: { select: { id: true, name: true, email: true, role: true } },
        farm: {
          select: {
            id: true,
            name: true,
            location: true,
            latitude: true,
            longitude: true,
            geofenceRadiusMeters: true,
            boundaryGeoJson: true,
          },
        },
      },
    });

    // Map attendance by userId_farmId
    const attendanceMap = new Map<string, (typeof attendances)[number]>();
    for (const att of attendances) {
      attendanceMap.set(`${att.userId}_${att.farmId}`, att);
    }

    // Build roster items: every assigned (officer, farm) pair
    type RosterItem = {
      officerId: string;
      officerName: string;
      officerEmail: string;
      farmId: string;
      farmName: string;
      farmLocation: string;
      attendanceId: string | null;
      status: string; // 'OPEN' | 'COMPLETED' | 'EXCEPTION_PENDING' | 'EXCEPTION_APPROVED' | 'EXCEPTION_REJECTED' | 'NOT_CLOCKED_IN'
      hasStarted: boolean;
      hasEnded: boolean;
      startAt: string | null;
      endAt: string | null;
      startLatitude: number | null;
      startLongitude: number | null;
      distanceMeters: number | null;
      withinGeofence: boolean;
      geofenceBasis: string | null;
      startSelfieKey: string | null;
      endSelfieKey: string | null;
      exceptionReason: string | null;
      exceptionId: string | null;
      exceptionStatus: string | null;
      durationMinutes: number | null;
    };

    const roster: RosterItem[] = [];

    // Pair officers with each estate they have access to
    for (const officer of officers) {
      for (const access of officer.farmAccess) {
        const estate = estates.find((e) => e.id === access.farmId);
        if (!estate) continue;

        const att = attendanceMap.get(`${officer.id}_${estate.id}`);
        if (att) {
          const startLat = att.startLatitude === null || att.startLatitude === undefined ? null : Number(att.startLatitude);
          const startLng = att.startLongitude === null || att.startLongitude === undefined ? null : Number(att.startLongitude);
          let dist = att.exception?.distanceMeters ? Number(att.exception.distanceMeters) : null;

          if (dist === null && startLat !== null && startLng !== null) {
            dist = distanceMeters(
              { latitude: Number(estate.latitude), longitude: Number(estate.longitude) },
              { latitude: startLat, longitude: startLng }
            );
          }

          // Canonical display verdict over stored check-in GPS (never a copy).
          const verdict = attendanceDisplayVerdict({
            startLat,
            startLng,
            farmId: estate.id,
            farm: estate,
            plot: att.plotId ? rosterPlotMap.get(att.plotId) ?? null : null,
            storedBasis: att.geofenceBasis,
          });
          const inside = verdict.inside;

          let durationMinutes: number | null = null;
          if (att.startAt) {
            const end = att.endAt ? new Date(att.endAt).getTime() : Date.now();
            durationMinutes = Math.max(0, Math.round((end - new Date(att.startAt).getTime()) / 60000));
          }

          roster.push({
            officerId: officer.id,
            officerName: officer.name,
            officerEmail: officer.email,
            farmId: estate.id,
            farmName: estate.name,
            farmLocation: estate.location,
            attendanceId: att.id,
            status: att.status,
            hasStarted: !!att.startAt,
            hasEnded: !!att.endAt,
            startAt: att.startAt ? att.startAt.toISOString() : null,
            endAt: att.endAt ? att.endAt.toISOString() : null,
            startLatitude: startLat,
            startLongitude: startLng,
            distanceMeters: dist !== null ? Math.round(dist) : null,
            withinGeofence: inside,
            geofenceBasis: verdict.basis,
            startSelfieKey: att.startSelfieKey,
            endSelfieKey: att.endSelfieKey,
            exceptionReason: att.exceptionReason || att.exception?.reason || null,
            exceptionId: att.exception?.id || null,
            exceptionStatus: att.exception?.status || null,
            durationMinutes,
          });
        } else {
          roster.push({
            officerId: officer.id,
            officerName: officer.name,
            officerEmail: officer.email,
            farmId: estate.id,
            farmName: estate.name,
            farmLocation: estate.location,
            attendanceId: null,
            status: "NOT_CLOCKED_IN",
            hasStarted: false,
            hasEnded: false,
            startAt: null,
            endAt: null,
            startLatitude: null,
            startLongitude: null,
            distanceMeters: null,
            withinGeofence: true,
            geofenceBasis: null,
            startSelfieKey: null,
            endSelfieKey: null,
            exceptionReason: null,
            exceptionId: null,
            exceptionStatus: null,
            durationMinutes: null,
          });
        }
      }
    }

    // Also include any attendance records for officers not explicitly in the farmAccess list
    for (const att of attendances) {
      const alreadyIncluded = roster.some(
        (r) => r.officerId === att.userId && r.farmId === att.farmId
      );
      if (!alreadyIncluded) {
        const estate = estates.find((e) => e.id === att.farmId) || att.farm;
        const startLat = att.startLatitude === null || att.startLatitude === undefined ? null : Number(att.startLatitude);
        const startLng = att.startLongitude === null || att.startLongitude === undefined ? null : Number(att.startLongitude);
        let dist = att.exception?.distanceMeters ? Number(att.exception.distanceMeters) : null;
        if (dist === null && startLat !== null && startLng !== null && estate) {
          dist = distanceMeters(
            { latitude: Number(estate.latitude), longitude: Number(estate.longitude) },
            { latitude: startLat, longitude: startLng }
          );
        }
        const verdict = estate
          ? attendanceDisplayVerdict({
              startLat,
              startLng,
              farmId: estate.id,
              farm: estate,
              plot: att.plotId ? rosterPlotMap.get(att.plotId) ?? null : null,
              storedBasis: att.geofenceBasis,
            })
          : { inside: true, basis: null as string | null };
        const inside = verdict.inside;
        let durationMinutes: number | null = null;
        if (att.startAt) {
          const end = att.endAt ? new Date(att.endAt).getTime() : Date.now();
          durationMinutes = Math.max(0, Math.round((end - new Date(att.startAt).getTime()) / 60000));
        }

        roster.push({
          officerId: att.user.id,
          officerName: att.user.name,
          officerEmail: att.user.email,
          farmId: att.farmId,
          farmName: estate?.name || "Estate",
          farmLocation: estate?.location || "",
          attendanceId: att.id,
          status: att.status,
          hasStarted: !!att.startAt,
          hasEnded: !!att.endAt,
          startAt: att.startAt ? att.startAt.toISOString() : null,
          endAt: att.endAt ? att.endAt.toISOString() : null,
          startLatitude: startLat,
          startLongitude: startLng,
          distanceMeters: dist !== null ? Math.round(dist) : null,
          withinGeofence: inside,
          geofenceBasis: verdict.basis,
          startSelfieKey: att.startSelfieKey,
          endSelfieKey: att.endSelfieKey,
          exceptionReason: att.exceptionReason || att.exception?.reason || null,
          exceptionId: att.exception?.id || null,
          exceptionStatus: att.exception?.status || null,
          durationMinutes,
        });
      }
    }

    // Compute Summary Rollups
    const totalOfficers = roster.length;
    const onDutyCount = roster.filter(
      (r) => r.status === "OPEN" || r.status === "EXCEPTION_APPROVED"
    ).length;
    const completedCount = roster.filter((r) => r.status === "COMPLETED" || r.hasEnded).length;
    const exceptionPendingCount = roster.filter(
      (r) => r.status === "EXCEPTION_PENDING"
    ).length;
    const notClockedInCount = roster.filter((r) => r.status === "NOT_CLOCKED_IN").length;
    const presentCount = totalOfficers - notClockedInCount;
    const withinGeofenceCount = roster.filter(
      (r) => r.hasStarted && r.withinGeofence
    ).length;
    const complianceRate =
      presentCount > 0 ? Math.round((withinGeofenceCount / presentCount) * 100) : 100;

    return NextResponse.json(
      {
        date: targetDate.toISOString().slice(0, 10),
        summary: {
          totalOfficers,
          onDutyCount,
          completedCount,
          exceptionPendingCount,
          notClockedInCount,
          withinGeofenceCount,
          complianceRate,
        },
        roster,
        estates: estates.map((e) => ({ id: e.id, name: e.name, location: e.location })),
      },
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}
