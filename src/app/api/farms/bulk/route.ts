import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";

const bulkSchema = z.object({
  farmIds: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(["STATUS", "STAGE"]),
  status: z.enum(["SETUP", "ACTIVE", "INACTIVE", "COMPLETED"]).optional(),
  setupStage: z.enum(["SURVEY_SOIL_TEST", "PLOT_DEMARCATION", "BED_SOIL_PREP", "IRRIGATION_LAYOUT", "HANDED_OVER"]).optional(),
  expectedCount: z.number().int().min(1).max(200).optional(),
});

/** Bulk farm status/stage changes for onboarding queues (SUPER_ADMIN only). */
export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);
    const input = bulkSchema.parse(await request.json());
    if (input.expectedCount != null && input.expectedCount !== input.farmIds.length) {
      return NextResponse.json({ error: "Selection changed while confirming. Review the preview and retry." }, { status: 409 });
    }
    const data: any = {};
    if (input.action === "STATUS" && input.status) data.status = input.status;
    if (input.action === "STAGE" && input.setupStage) {
      data.setupStage = input.setupStage;
      if (input.setupStage === "HANDED_OVER") {
        data.status = "ACTIVE";
        data.handedOverAt = new Date();
      }
    }
    if (!Object.keys(data).length) return NextResponse.json({ error: "Validation failed" }, { status: 422 });
    const existing = await prisma.farm.findMany({ where: { id: { in: input.farmIds } }, select: { id: true } });
    const found = new Set(existing.map((f) => f.id));
    const missing = input.farmIds.filter((id) => !found.has(id));
    const result = await prisma.farm.updateMany({ where: { id: { in: existing.map((f) => f.id) } }, data });
    await audit(actor.id, "BULK_UPDATE", "Farm", `${result.count}-farms`, { action: input.action, requested: input.farmIds.length, updated: result.count });
    return NextResponse.json({ updated: result.count, missing });
  } catch (error) {
    return apiError(error);
  }
}
