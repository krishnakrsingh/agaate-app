import { NextResponse } from "next/server";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";

export async function POST(_: Request, { params }: { params: Promise<{ farmId: string }> }) {
  try {
    const { farmId } = await params;
    const actor = await requireFarmAccess(farmId, true);
    const farm = await prisma.farm.findUniqueOrThrow({ where: { id: farmId } });
    if (farm.status === "ACTIVE") {
      return NextResponse.json(farm);
    }
    const active = await prisma.farm.update({
      where: { id: farmId },
      data: { status: "ACTIVE" },
    });
    await prisma.plot.updateMany({
      where: { farmId, status: "SETUP", deletedAt: null },
      data: { status: "ACTIVE" },
    });
    await prisma.cropCycle.updateMany({
      where: { plot: { farmId }, status: "PLANNED" },
      data: { status: "ACTIVE" },
    });
    await audit(actor.id, "ACTIVATE", "Farm", farmId);
    return NextResponse.json(active);
  } catch (error) {
    return apiError(error);
  }
}
