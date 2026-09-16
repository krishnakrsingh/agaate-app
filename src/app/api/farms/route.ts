import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { accessibleFarmWhere, currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { DEFAULT_GEOFENCE_RADIUS_METERS } from "@/lib/business";
import { apiError, paginatedJson } from "@/lib/api";
import { listEstates, parseEstateListParams } from "@modules/estates";

const farmSchema = z
  .object({
    name: z.string().min(2).max(120),
    ownerName: z.string().min(2).max(120),
    location: z.string().min(2).max(180),
    address: z.string().max(500).optional().nullable(),
    latitude: z.coerce.number().gte(-90).lte(90),
    longitude: z.coerce.number().gte(-180).lte(180),
    totalArea: z.coerce.number().positive(),
    cultivableArea: z.coerce.number().positive(),
    waterSource: z.string().min(2).max(180),
    geofenceRadiusMeters: z.coerce.number().int().min(50).max(10000).optional(),
    clientId: z.string().optional().nullable(),
    setupStage: z.enum(["SURVEY_SOIL_TEST", "PLOT_DEMARCATION", "BED_SOIL_PREP", "IRRIGATION_LAYOUT", "HANDED_OVER"]).optional(),
  })
  .refine((v) => v.cultivableArea <= v.totalArea, {
    message: "Cultivable area cannot exceed total area.",
    path: ["cultivableArea"],
  });

export async function GET(request: NextRequest) {
  try {
    const accessibleWhere = await accessibleFarmWhere();
    const sp = request.nextUrl.searchParams;
    const { filters, limit, offset, sortBy, order } = parseEstateListParams(sp);
    const { estates, total } = await listEstates({
      accessibleWhere,
      filters,
      limit,
      offset,
      sortBy,
      order,
    });

    return paginatedJson(estates, total);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "FARM_ADMIN"]);
    const input = farmSchema.parse(await request.json());
    const canManage = actor.role === "SUPER_ADMIN" || actor.role === "FARM_ADMIN";

    let targetClientId = input.clientId || null;
    if (!targetClientId && actor.clientId) {
      targetClientId = actor.clientId;
    }

    const farm = await prisma.farm.create({
      data: {
        name: input.name,
        ownerName: input.ownerName,
        location: input.location,
        address: input.address || null,
        latitude: input.latitude,
        longitude: input.longitude,
        totalArea: input.totalArea,
        cultivableArea: input.cultivableArea,
        waterSource: input.waterSource,
        geofenceRadiusMeters: input.geofenceRadiusMeters ?? DEFAULT_GEOFENCE_RADIUS_METERS,
        clientId: targetClientId,
        setupStage: input.setupStage || "SURVEY_SOIL_TEST",
        setupProgress: input.setupStage === "HANDED_OVER" ? 100 : 10,
        status: input.setupStage === "HANDED_OVER" ? "ACTIVE" : "SETUP",
        access: {
          create: {
            userId: actor.id,
            canManage: canManage,
          },
        },
      },
    });

    await audit(actor.id, "CREATE", "Farm", farm.id, { name: farm.name });
    return NextResponse.json(farm, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
