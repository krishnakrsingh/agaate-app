import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireRole } from "@modules/auth";
import { apiError } from "@infrastructure/http";
import { attendanceSchema, startAttendance, endAttendance, getTodayShift, AttendanceFault } from "@modules/attendance";

export async function GET() {
  try {
    const actor = await currentActor();
    const attendance = await getTodayShift({ userId: actor.id });
    return NextResponse.json({ attendance });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { assertSameOrigin, getClientIp, throttle } = await import("@infrastructure/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    requireRole(actor.role, ["FARM_OFFICER", "SUPER_ADMIN"]);
    const clockSlot = throttle(`attendance:${getClientIp(request.headers)}:${actor.id}`, 30, 60_000);
    if (!clockSlot.allowed) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    const input = attendanceSchema.parse(await request.json());

    const result =
      input.action === "START"
        ? await startAttendance({ input, actor })
        : await endAttendance({ input, actor });
    return NextResponse.json({
      attendance: result.attendance,
      distanceMeters: result.distanceMeters,
      withinGeofence: result.withinGeofence,
      geofenceBasis: result.geofenceBasis,
    });
  } catch (error) {
    if (error instanceof AttendanceFault) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return apiError(error);
  }
}

