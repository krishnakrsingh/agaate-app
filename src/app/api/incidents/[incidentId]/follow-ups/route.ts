import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, paginationParams } from "@/lib/api";

const createSchema = z.object({
  action: z.string().min(3).max(120),
  remarks: z.string().max(2000).optional().nullable(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ incidentId: string }> }) {
  try {
    const { incidentId } = await params;
    const actor = await currentActor();
    const incident = await prisma.incident.findUniqueOrThrow({ where: { id: incidentId } });
    await requireFarmAccess(incident.farmId);
    const { limit, offset } = paginationParams(request.nextUrl.searchParams);
    const [followUps, total] = await Promise.all([
      prisma.incidentFollowUp.findMany({
        where: { incidentId },
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.incidentFollowUp.count({ where: { incidentId } }),
    ]);
    return NextResponse.json({ followUps, total });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ incidentId: string }> }) {
  try {
    const { incidentId } = await params;
    const actor = await currentActor();
    const incident = await prisma.incident.findUniqueOrThrow({ where: { id: incidentId } });
    await requireFarmAccess(incident.farmId);
    if (incident.status === "CLOSED") return NextResponse.json({ error: "A closed incident cannot receive follow-ups. Reopen it first." }, { status: 409 });
    const input = createSchema.parse(await request.json());
    const followUp = await prisma.incidentFollowUp.create({
      data: { incidentId, authorId: actor.id, action: input.action, remarks: input.remarks },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
    await prisma.incident.update({ where: { id: incidentId }, data: { status: incident.status === "OPEN" ? "ACKNOWLEDGED" : undefined } });
    await audit(actor.id, "CREATE_FOLLOW_UP", "IncidentFollowUp", followUp.id, { incidentId, action: input.action });
    return NextResponse.json(followUp, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
