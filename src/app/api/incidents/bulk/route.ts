import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";

const bulkSchema = z.object({
  incidentIds: z.array(z.string().min(1)).min(1).max(200),
  status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED", "CLOSED"]),
  expectedCount: z.number().int().min(1).max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST"]);
    const input = bulkSchema.parse(await request.json());
    if (input.expectedCount != null && input.expectedCount !== input.incidentIds.length) {
      return NextResponse.json({ error: "Selection changed while confirming. Review the preview and retry." }, { status: 409 });
    }
    const incidents = await prisma.incident.findMany({ where: { id: { in: input.incidentIds } }, select: { id: true, farmId: true } });
    const found = new Set(incidents.map((i) => i.id));
    const missing = input.incidentIds.filter((id) => !found.has(id));
    for (const farmId of [...new Set(incidents.map((i) => i.farmId))]) await requireFarmAccess(farmId, true);
    const result = await prisma.incident.updateMany({ where: { id: { in: incidents.map((i) => i.id) } }, data: { status: input.status } });
    await audit(actor.id, "BULK_UPDATE", "Incident", `${result.count}-incidents`, { status: input.status, requested: input.incidentIds.length, updated: result.count });
    return NextResponse.json({ updated: result.count, missing });
  } catch (error) {
    return apiError(error);
  }
}
