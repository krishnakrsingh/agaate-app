import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { utcDateOnly } from "@/lib/business";

const manualSchema = z.object({
  farmId: z.string().cuid(),
  date: z.coerce.date(),
  temperature: z.coerce.number().gte(-50).lte(60).optional().nullable(),
  humidity: z.coerce.number().gte(0).lte(100).optional().nullable(),
  windSpeed: z.coerce.number().gte(0).lte(200).optional().nullable(),
  rainForecast: z.coerce.number().gte(0).lte(500).optional().nullable(),
  remarks: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    const farmId = z.string().cuid().parse(request.nextUrl.searchParams.get("farmId"));
    const dateParam = request.nextUrl.searchParams.get("date");
    if (!dateParam) throw new Error("date query parameter is required.");
    const date = utcDateOnly(new Date(dateParam));
    await requireFarmAccess(farmId);
    const plan = await prisma.agronomyPlan.findUnique({ where: { farmId_planDate: { farmId, planDate: date } } });
    if (!plan) return NextResponse.json({ farmId, planDate: date, manual: null });
    return NextResponse.json({
      farmId,
      planDate: date,
      manual: {
        temperature: plan.manualTemperature,
        humidity: plan.manualHumidity,
        windSpeed: plan.manualWindSpeed,
        rainForecast: plan.manualRainForecast,
        remarks: plan.manualWeatherRemarks,
        notes: plan.notes,
        updatedAt: plan.updatedAt,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST", "FARM_ADMIN"]);
    const input = manualSchema.parse(await request.json());
    await requireFarmAccess(input.farmId);
    const date = utcDateOnly(input.date);
    const existing = await prisma.agronomyPlan.findUnique({ where: { farmId_planDate: { farmId: input.farmId, planDate: date } } });
    if (existing && existing.createdById !== actor.id && actor.role !== "SUPER_ADMIN") {
      // Agronomist/Farm Admin can update existing plan's weather even if not creator — allow
    }
    const plan = await prisma.agronomyPlan.upsert({
      where: { farmId_planDate: { farmId: input.farmId, planDate: date } },
      update: {
        manualTemperature: input.temperature,
        manualHumidity: input.humidity,
        manualWindSpeed: input.windSpeed,
        manualRainForecast: input.rainForecast,
        manualWeatherRemarks: input.remarks,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      create: {
        farmId: input.farmId,
        planDate: date,
        manualTemperature: input.temperature,
        manualHumidity: input.humidity,
        manualWindSpeed: input.windSpeed,
        manualRainForecast: input.rainForecast,
        manualWeatherRemarks: input.remarks,
        notes: input.notes,
        createdById: actor.id,
      },
    });
    await audit(actor.id, "UPSERT_MANUAL_WEATHER", "AgronomyPlan", plan.id, { farmId: input.farmId, planDate: date.toISOString().slice(0, 10) });
    return NextResponse.json(plan, { status: existing ? 200 : 201 });
  } catch (error) {
    return apiError(error);
  }
}
