import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";

const bulkSchema = z.object({
  exceptionIds: z.array(z.string().min(1)).min(1).max(200),
  status: z.enum(["APPROVED", "REJECTED"]),
  expectedCount: z.number().int().min(1).max(200).optional(),
});

/** Bulk approve/reject attendance exceptions (only PENDING transition). */
export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "FARM_ADMIN"]);
    const input = bulkSchema.parse(await request.json());
    if (input.expectedCount != null && input.expectedCount !== input.exceptionIds.length) {
      return NextResponse.json({ error: "Selection changed while confirming. Review the preview and retry." }, { status: 409 });
    }
    const exceptions = await prisma.attendanceException.findMany({
      where: { id: { in: input.exceptionIds }, status: "PENDING" },
      include: { attendance: { select: { id: true, farmId: true, endAt: true } } },
    });
    for (const farmId of [...new Set(exceptions.map((e) => e.attendance.farmId))]) await requireFarmAccess(farmId, true);
    let updated = 0;
    for (const ex of exceptions) {
      await prisma.$transaction(async (tx) => {
        await tx.attendanceException.update({ where: { id: ex.id }, data: { status: input.status, reviewedById: actor.id, reviewedAt: new Date() } });
        await tx.attendance.update({
          where: { id: ex.attendanceId },
          data: { status: input.status === "APPROVED" ? (ex.attendance.endAt ? "COMPLETED" : "EXCEPTION_APPROVED") : "EXCEPTION_REJECTED" },
        });
      });
      updated += 1;
    }
    const skipped = input.exceptionIds.length - updated;
    await audit(actor.id, `ATTENDANCE_EXCEPTION_BULK_${input.status}`, "AttendanceException", `${updated}-exceptions`, { requested: input.exceptionIds.length, updated, skipped });
    return NextResponse.json({ updated, skipped });
  } catch (error) {
    return apiError(error);
  }
}
