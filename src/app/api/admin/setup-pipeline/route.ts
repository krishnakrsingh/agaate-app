import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, noStore } from "@/lib/api";
import { FarmSetupStage, Prisma } from "@prisma/client";

const updateStageSchema = z.object({
  farmId: z.string().min(1),
  setupStage: z.nativeEnum(FarmSetupStage),
  setupProgress: z.number().int().min(0).max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const search = searchParams.get("search")?.trim() || "";
    const stageParam = searchParams.get("stage")?.trim() || "ALL";
    const stateParam = searchParams.get("state")?.trim() || "";
    const districtParam = searchParams.get("district")?.trim() || "";
    const slaParam = searchParams.get("sla")?.trim() || "ALL";
    const sortBy = searchParams.get("sortBy")?.trim() || "updatedAt";
    const sortOrder = (searchParams.get("sortOrder")?.toLowerCase() === "asc" ? "asc" : "desc") as "asc" | "desc";

    // 1. Stage filter condition
    const stageCondition: Prisma.FarmWhereInput =
      stageParam !== "ALL" && Object.values(FarmSetupStage).includes(stageParam as FarmSetupStage)
        ? { setupStage: stageParam as FarmSetupStage }
        : {
            OR: [
              { status: "SETUP" },
              { setupStage: { not: "HANDED_OVER" } },
              {
                AND: [
                  { setupStage: "HANDED_OVER" },
                  { handedOverAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
                ],
              },
            ],
          };

    // 2. Search filter condition (Farm Name, Survey No, District, Village, Client Name, Client Code)
    const searchCondition: Prisma.FarmWhereInput = search
      ? {
          OR: [
            { name: { contains: search } },
            { surveyNumber: { contains: search } },
            { location: { contains: search } },
            { district: { contains: search } },
            { village: { contains: search } },
            { ownerName: { contains: search } },
            { clientPhone: { contains: search } },
            {
              client: {
                OR: [
                  { name: { contains: search } },
                  { code: { contains: search } },
                  { phone: { contains: search } },
                ],
              },
            },
          ],
        }
      : {};

    // 3. State & District filter
    const geoCondition: Prisma.FarmWhereInput = {};
    if (stateParam) {
      geoCondition.OR = [
        { state: { contains: stateParam } },
        { location: { contains: stateParam } },
      ];
    }
    if (districtParam) {
      geoCondition.district = { contains: districtParam };
    }

    // 4. SLA filter condition (based on days since last stage update)
    const now = new Date();
    const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const slaCondition: Prisma.FarmWhereInput = {};
    if (slaParam === "OVERDUE") {
      slaCondition.updatedAt = { lte: fortyFiveDaysAgo };
      slaCondition.setupStage = { not: "HANDED_OVER" };
    } else if (slaParam === "APPROACHING") {
      slaCondition.updatedAt = { lte: thirtyDaysAgo, gt: fortyFiveDaysAgo };
      slaCondition.setupStage = { not: "HANDED_OVER" };
    } else if (slaParam === "ON_TRACK") {
      slaCondition.updatedAt = { gt: thirtyDaysAgo };
    }

    // Combined query where clause
    const where: Prisma.FarmWhereInput = {
      AND: [stageCondition, searchCondition, geoCondition, slaCondition],
    };

    // 5. Database aggregation for total counts across all stages (O(1) database aggregation)
    const [
      stageGroups,
      inFlightAcreageAgg,
      totalMatchingCount,
      paginatedFarms,
      overdueCount,
      approachingCount,
    ] = await Promise.all([
      prisma.farm.groupBy({
        by: ["setupStage"],
        _count: { _all: true },
        where: {
          OR: [
            { status: "SETUP" },
            { setupStage: { not: "HANDED_OVER" } },
            {
              AND: [
                { setupStage: "HANDED_OVER" },
                { handedOverAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
              ],
            },
          ],
        },
      }),
      prisma.farm.aggregate({
        _sum: {
          totalArea: true,
          cultivableArea: true,
        },
        where: {
          setupStage: { not: "HANDED_OVER" },
        },
      }),
      prisma.farm.count({ where }),
      prisma.farm.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
              code: true,
              companyName: true,
            },
          },
          _count: {
            select: { plots: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.farm.count({
        where: {
          setupStage: { not: "HANDED_OVER" },
          updatedAt: { lte: fortyFiveDaysAgo },
        },
      }),
      prisma.farm.count({
        where: {
          setupStage: { not: "HANDED_OVER" },
          updatedAt: { lte: thirtyDaysAgo, gt: fortyFiveDaysAgo },
        },
      }),
    ]);

    // Build stageCounts mapping
    const stageCounts: Record<FarmSetupStage, number> = {
      SURVEY_SOIL_TEST: 0,
      PLOT_DEMARCATION: 0,
      BED_SOIL_PREP: 0,
      IRRIGATION_LAYOUT: 0,
      HANDED_OVER: 0,
    };

    for (const group of stageGroups) {
      if (group.setupStage && stageCounts[group.setupStage] !== undefined) {
        stageCounts[group.setupStage] = group._count._all;
      }
    }

    const totalInFlight =
      stageCounts.SURVEY_SOIL_TEST +
      stageCounts.PLOT_DEMARCATION +
      stageCounts.BED_SOIL_PREP +
      stageCounts.IRRIGATION_LAYOUT;

    // Transform paginated farms with calculated SLA health
    const farms = paginatedFarms.map((f) => {
      const daysInStage = Math.max(
        0,
        Math.floor((now.getTime() - new Date(f.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
      );

      let slaStatus: "ON_TRACK" | "APPROACHING" | "OVERDUE" = "ON_TRACK";
      if (f.setupStage !== "HANDED_OVER") {
        if (daysInStage >= 45) slaStatus = "OVERDUE";
        else if (daysInStage >= 30) slaStatus = "APPROACHING";
      }

      return {
        id: f.id,
        name: f.name,
        surveyNumber: f.surveyNumber,
        village: f.village,
        taluk: f.taluk,
        district: f.district,
        state: f.state,
        location: f.location,
        ownerName: f.ownerName,
        clientPhone: f.clientPhone,
        client: f.client,
        totalArea: f.totalArea.toString(),
        cultivableArea: f.cultivableArea.toString(),
        plotsCount: f._count.plots,
        status: f.status,
        setupStage: f.setupStage,
        setupProgress: f.setupProgress,
        soilType: f.soilType,
        soilPh: f.soilPh?.toString() || null,
        waterSource: f.waterSource,
        fencingType: f.fencingType,
        targetHandoverDate: f.targetHandoverDate ? f.targetHandoverDate.toISOString() : null,
        daysInStage,
        slaStatus,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
        handedOverAt: f.handedOverAt ? f.handedOverAt.toISOString() : null,
      };
    });

    // Provide legacy stages grouping for backwards compatibility
    const stages: Record<FarmSetupStage, any[]> = {
      SURVEY_SOIL_TEST: [],
      PLOT_DEMARCATION: [],
      BED_SOIL_PREP: [],
      IRRIGATION_LAYOUT: [],
      HANDED_OVER: [],
    };
    for (const f of farms) {
      if (stages[f.setupStage]) {
        stages[f.setupStage].push(f);
      }
    }

    return NextResponse.json(
      {
        farms,
        pagination: {
          page,
          limit,
          totalCount: totalMatchingCount,
          totalPages: Math.max(1, Math.ceil(totalMatchingCount / limit)),
        },
        stageCounts: {
          ...stageCounts,
          totalInFlight,
        },
        summaryStats: {
          totalInFlightAcreage: inFlightAcreageAgg._sum.totalArea
            ? parseFloat(inFlightAcreageAgg._sum.totalArea.toString())
            : 0,
          totalInFlightCultivable: inFlightAcreageAgg._sum.cultivableArea
            ? parseFloat(inFlightAcreageAgg._sum.cultivableArea.toString())
            : 0,
          slaOverdueCount: overdueCount,
          slaApproachingCount: approachingCount,
        },
        stages,
      },
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);

    const body = await request.json();
    const input = updateStageSchema.parse(body);

    const defaultProgressMap: Record<FarmSetupStage, number> = {
      SURVEY_SOIL_TEST: 20,
      PLOT_DEMARCATION: 40,
      BED_SOIL_PREP: 60,
      IRRIGATION_LAYOUT: 80,
      HANDED_OVER: 100,
    };

    const progress =
      input.setupProgress ?? defaultProgressMap[input.setupStage] ?? 50;

    const farm = await prisma.farm.update({
      where: { id: input.farmId },
      data: {
        setupStage: input.setupStage,
        setupProgress: progress,
        ...(input.setupStage === "HANDED_OVER"
          ? { status: "ACTIVE", handedOverAt: new Date() }
          : {}),
      },
    });

    await audit(actor.id, "UPDATE", "Farm", farm.id, {
      setupStage: input.setupStage,
      setupProgress: progress,
    });

    return NextResponse.json(farm);
  } catch (error) {
    return apiError(error);
  }
}

