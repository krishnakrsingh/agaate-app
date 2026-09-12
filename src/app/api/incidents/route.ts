import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole, accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, noStore, paginatedJson, paginationParams } from "@/lib/api";
import { downloadUrl } from "@/lib/storage";
import { validateAttendanceLocation } from "@/lib/attendance-geo";
import { parseBoundaryToRing, pointInRing, ringAcres, type LngLat } from "@/lib/geo-core";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    farmId: z.string().min(1),
    plotId: z.string().min(1).optional().nullable(),
    cropCycleId: z.string().min(1).optional().nullable(),
    level: z.enum(["FARM", "PLOT", "CROP"]),
    type: z.string().min(2).max(120),
    description: z.string().min(5).max(2000),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().nullable(),
    impactPercent: z.coerce.number().min(0).max(100).optional().nullable(),
    mediaIds: z.array(z.string().min(1)).max(10).default([]),
    latitude: z.number().gte(-90).lte(90).optional(),
    longitude: z.number().gte(-180).lte(180).optional(),
    accuracyMeters: z.number().optional(),
  })
  .superRefine((v, ctx) => {
    if ((v.latitude === undefined) !== (v.longitude === undefined)) {
      ctx.addIssue({ code: "custom", path: ["latitude"], message: "GPS report needs both latitude and longitude." });
    }    if (v.level === "FARM" && (v.plotId || v.cropCycleId)) {
      ctx.addIssue({
        code: "custom",
        path: ["level"],
        message: "A farm incident cannot include plot or crop references.",
      });
    }
    if (v.level === "PLOT" && !v.plotId) {
      // Auto-attach allowed: a PLOT report with GPS but no plotId gets its
      // plot from the smallest containing fence (validated below).
      const hasGps = v.latitude !== undefined && v.longitude !== undefined;
      if (!hasGps) {
        ctx.addIssue({
          code: "custom",
          path: ["plotId"],
          message: "A plot incident requires a plot.",
        });
      }
    }
    if (v.level === "PLOT" && v.cropCycleId) {
      ctx.addIssue({
        code: "custom",
        path: ["cropCycleId"],
        message: "A plot incident cannot include a crop reference.",
      });
    }
    if (v.level === "CROP" && (!v.plotId || !v.cropCycleId)) {
      ctx.addIssue({
        code: "custom",
        path: ["cropCycleId"],
        message: "A crop incident requires a plot and crop cycle.",
      });
    }
  });

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    const farmScope = await accessibleFarmWhere();
    const { searchParams } = request.nextUrl;
    const farmIdParam = searchParams.get("farmId");
    const statusParam = searchParams.get("status");
    const severityParam = searchParams.get("severity");
    const levelParam = searchParams.get("level");
    const q = searchParams.get("search")?.trim() || searchParams.get("q")?.trim();
    const { limit, offset } = paginationParams(searchParams);

    const where: any = {
      farm: farmIdParam ? { AND: [farmScope, { id: farmIdParam }] } : farmScope,
    };

    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam;
    }
    if (severityParam && severityParam !== "ALL") {
      where.severity = severityParam;
    }
    if (levelParam && levelParam !== "ALL") {
      where.level = levelParam;
    }
    if (q) {
      where.AND = [...(where.AND || []), { OR: [{ type: { contains: q } }, { description: { contains: q } }] }];
    }

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
      where,
      include: {
        farm: { select: { id: true, name: true, location: true } },
        plot: { select: { id: true, name: true } },
        cropCycle: { select: { id: true, cropName: true } },
        reporter: { select: { id: true, name: true, email: true, role: true } },
        media: {
          select: {
            id: true,
            storageKey: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
          },
        },
        followUps: {
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      }),
      prisma.incident.count({ where }),
    ]);

    // Generate signed download URLs for media assets
    const enriched = await Promise.all(
      incidents.map(async (inc) => {
        const mediaWithUrls = await Promise.all(
          inc.media.map(async (m) => {
            try {
              const url = await downloadUrl(m.storageKey);
              return { ...m, url };
            } catch {
              return { ...m, url: null };
            }
          })
        );

        const primaryImageUrl = mediaWithUrls.find((m) => m.url)?.url || null;

        return {
          id: inc.id,
          farmId: inc.farmId,
          farmName: inc.farm.name,
          farmLocation: inc.farm.location,
          plotId: inc.plotId,
          plotName: inc.plot?.name || null,
          cropCycleId: inc.cropCycleId,
          cropName: inc.cropCycle?.cropName || null,
          reporterName: inc.reporter.name,
          reporterEmail: inc.reporter.email,
          reporterRole: inc.reporter.role,
          level: inc.level,
          type: inc.type,
          severity: inc.severity || "MEDIUM",
          description: inc.description,
          impactPercent: inc.impactPercent ? inc.impactPercent.toString() : null,
          status: inc.status,
          createdAt: inc.createdAt.toISOString(),
          media: mediaWithUrls,
          primaryImageUrl,
          followUps: inc.followUps.map((f) => ({
            id: f.id,
            authorName: f.author.name,
            action: f.action,
            remarks: f.remarks,
            createdAt: f.createdAt.toISOString(),
          })),
        };
      })
    );

    return paginatedJson(enriched, total, noStore);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["FARM_OFFICER", "FARM_ADMIN", "AGRONOMIST", "SUPER_ADMIN"]);
    const input = schema.parse(await request.json());
    await requireFarmAccess(input.farmId);

    if (
      input.plotId &&
      !(await prisma.plot.findFirst({
        where: { id: input.plotId, farmId: input.farmId, deletedAt: null },
      }))
    ) {
      throw new Error("The selected plot is not part of this farm.");
    }

    if (
      input.cropCycleId &&
      !(await prisma.cropCycle.findFirst({
        where: {
          id: input.cropCycleId,
          plot: { farmId: input.farmId, deletedAt: null },
          ...(input.plotId ? { plotId: input.plotId } : {}),
        },
      }))
    ) {
      throw new Error("The selected crop cycle is not part of this farm and plot.");
    }

    const { mediaIds, latitude, longitude, accuracyMeters, ...incidentInput } = input;

    // Optional scouting GPS: verify against the named plot, or auto-attach
    // the smallest containing fence (PLOT level without plotId). Farm-level
    // reports verify farm presence. Outside the farm → 422, always.
    let scoutPlotId: string | null = input.plotId ?? null;
    let scoutGeo: { latitude: number; longitude: number; basis: "PLOT_POLYGON" | "FARM_POLYGON" | "RADIUS" } | null = null;
    if (latitude !== undefined && longitude !== undefined) {
      const farm = await prisma.farm.findUniqueOrThrow({
        where: { id: input.farmId },
        select: { latitude: true, longitude: true, geofenceRadiusMeters: true, boundaryGeoJson: true },
      });
      if (scoutPlotId) {
        const plot = await prisma.plot.findUnique({
          where: { id: scoutPlotId },
          select: { farmId: true, boundaryGeoJson: true, deletedAt: true, status: true },
        });
        const checked = validateAttendanceLocation({
          lat: latitude, lng: longitude, accuracyMeters,
          farmId: input.farmId, farm,
          plot: plot && plot.farmId === input.farmId ? plot : null,
        });
        if (!checked.ok) {
          return NextResponse.json({ error: checked.message, code: checked.code }, { status: checked.status });
        }
        if (!checked.inside) {
          return NextResponse.json(
            {
              error: `Report location is outside the plot fence — ${Math.round(checked.distanceMeters)}m away.`,
              code: "SCOUT_OUTSIDE_PLOT",
              distanceMeters: checked.distanceMeters,
              geofenceBasis: checked.basis,
            },
            { status: 422 }
          );
        }
        scoutGeo = { latitude, longitude, basis: checked.basis };
      } else {
        // Auto-attach: smallest fenced plot containing the fix.
        const candidates = await prisma.plot.findMany({
          where: { farmId: input.farmId, deletedAt: null, status: { not: "ARCHIVED" }, boundaryGeoJson: { not: null } },
          select: { id: true, boundaryGeoJson: true },
        });
        let best: { id: string; acres: number } | null = null;
        for (const c of candidates) {
          let ring: LngLat[] | null = null;
          try {
            ring = parseBoundaryToRing(c.boundaryGeoJson);
          } catch {
            continue;
          }
          if (ring && pointInRing([longitude, latitude], ring)) {
            const acres = ringAcres(ring);
            if (!best || acres < best.acres) best = { id: c.id, acres };
          }
        }
        if (!best) {
          // Inside the farm but in no plot? Verify farm presence for the record.
          const farmChecked = validateAttendanceLocation({ lat: latitude, lng: longitude, accuracyMeters, farmId: input.farmId, farm, plot: null });
          if (!farmChecked.ok) {
            return NextResponse.json({ error: farmChecked.message, code: farmChecked.code }, { status: farmChecked.status });
          }
          if (!farmChecked.inside) {
            return NextResponse.json(
              { error: "Report location is outside the farm.", code: "SCOUT_OUTSIDE_FARM", geofenceBasis: farmChecked.basis },
              { status: 422 }
            );
          }
          scoutGeo = { latitude, longitude, basis: farmChecked.basis };
        } else {
          // Smallest containing fence wins; re-validated through the
          // canonical path (farm containment included).
          const attached = await prisma.plot.findUnique({
            where: { id: best.id },
            select: { farmId: true, boundaryGeoJson: true, deletedAt: true, status: true },
          });
          const rechecked = validateAttendanceLocation({
            lat: latitude, lng: longitude, accuracyMeters,
            farmId: input.farmId, farm,
            plot: attached && attached.farmId === input.farmId ? attached : null,
          });
          if (!rechecked.ok || !rechecked.inside) {
            return NextResponse.json(
              { error: "Report location is outside the farm.", code: "SCOUT_OUTSIDE_FARM", geofenceBasis: "PLOT_POLYGON" },
              { status: 422 }
            );
          }
          scoutPlotId = best.id;
          scoutGeo = { latitude, longitude, basis: rechecked.basis };
        }
      }
    }

    const incident = await prisma.$transaction(async (tx) => {
      const item = await tx.incident.create({
        data: {
          ...incidentInput,
          plotId: scoutPlotId ?? input.plotId ?? null,
          ...(scoutGeo ? { latitude: scoutGeo.latitude, longitude: scoutGeo.longitude, geofenceBasis: scoutGeo.basis } : {}),
          reporterId: actor.id,
        },
        include: {
          farm: { select: { id: true, name: true } },
          plot: { select: { id: true, name: true } },
          cropCycle: { select: { id: true, cropName: true } },
        },
      });

      if (mediaIds.length) {
        const count = await tx.mediaAsset.updateMany({
          where: {
            id: { in: mediaIds },
            uploadedById: actor.id,
            kind: "INCIDENT_PHOTO",
            incidentId: null,
            verifiedAt: { not: null },
          },
          data: {
            incidentId: item.id,
            farmId: input.farmId,
          },
        });

        if (count.count !== mediaIds.length) {
          throw new Error("One or more incident photos are unavailable or unverified.");
        }
      }

      return item;
    });

    await audit(actor.id, "CREATE", "Incident", incident.id, {
      level: incident.level,
      type: incident.type,
      mediaCount: mediaIds.length,
      ...(scoutGeo ? { geofenceBasis: scoutGeo.basis, plotId: scoutPlotId } : {}),
    });

    return NextResponse.json({ ...incident, ...(scoutGeo ? { geofenceBasis: scoutGeo.basis, attachedPlotId: scoutPlotId } : {}) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
