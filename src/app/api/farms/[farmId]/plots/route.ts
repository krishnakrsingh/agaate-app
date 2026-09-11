import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { validatePlotGeometry, roundAcresForDb } from "@/lib/geo-server";
import { commitBoundary } from "@/lib/geo-versions";

const schema = z.object({
  name: z.string().min(1).max(120),
  area: z.coerce.number().positive(),
  latitude: z.coerce.number().gte(-90).lte(90),
  longitude: z.coerce.number().gte(-180).lte(180),
  soilType: z.string().max(100).optional().nullable(),
  // Optional drawn boundary (GeoJSON Polygon string or legacy [{lat,lng}]).
  // Canonical server path validates containment + computes acres; when
  // present, the server-computed area wins over client `area`.
  boundary: z.any().optional().nullable(),
  irrigation: z
    .array(
      z.object({
        type: z.enum(["Drip", "Rain Pipe", "Sprinkler", "Flood", "Other"]),
        details: z.string().max(300).optional().nullable(),
      })
    )
    .max(20)
    .optional()
    .default([])
    .refine((v) => new Set(v.map((x) => x.type)).size === v.length, "Irrigation types must be unique.")
    .superRefine((arr, ctx) => {
      for (const it of arr) {
        if (it.type === "Other" && !it.details?.trim()) {
          ctx.addIssue({
            code: "custom",
            message: "Details are required for Other irrigation type.",
            path: ["irrigation"],
          });
        }
      }
    }),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params;
    const actor = await requireFarmAccess(farmId, true);
    const input = schema.parse(await request.json());
    const farm = await prisma.farm.findUniqueOrThrow({
      where: { id: farmId },
      select: { cultivableArea: true, boundaryGeoJson: true },
    });

    // Canonical geometry path: validate containment, server-compute acres.
    const geo = validatePlotGeometry(input.boundary ?? null, farm.boundaryGeoJson);
    const finalArea = geo ? roundAcresForDb(geo.acres) : input.area;
    const boundary = geo ? { geoJson: geo.geoJson, acres: roundAcresForDb(geo.acres) } : null;

    // Allocation cap is enforced INSIDE the tx under the farm-row lock:
    // pre-tx reads cannot arbitrate concurrent writers.
    const createData = (area: number) => ({
      farmId,
      name: input.name,
      area,
      latitude: input.latitude,
      longitude: input.longitude,
      soilType: input.soilType,
      boundaryGeoJson: boundary?.geoJson ?? null,
      measuredAcres: boundary ? boundary.acres : null,
      status: "SETUP" as const,
      irrigation: { create: input.irrigation },
    });
    const { result: plot } = await prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe("SELECT id FROM `Farm` WHERE id = ? FOR UPDATE", farmId);
      const allocated = await tx.plot.aggregate({
        where: { farmId, deletedAt: null },
        _sum: { area: true },
      });
      const totalAllocated = Math.round((Number(allocated._sum.area ?? 0) + finalArea) * 100) / 100;
      if (totalAllocated > Math.round(Number(farm.cultivableArea) * 100) / 100) {
        throw new Error("Total plot area cannot exceed the farm's cultivable area.");
      }
      if (!boundary) {
        return { result: await tx.plot.create({ data: createData(finalArea), include: { irrigation: true } }) };
      }
      // Versions track GEOMETRY states only (first fence becomes v1).
      return commitBoundary(
        tx,
        { type: "PLOT" },
        { geoJson: boundary.geoJson, acres: boundary.acres },
        { source: "MANUAL_DRAW", actorId: actor.id, actorName: actor.name },
        async (t) => t.plot.create({ data: createData(finalArea), include: { irrigation: true } })
      );
    });

    await audit(actor.id, "CREATE", "Plot", plot.id, { farmId, name: plot.name });
    return NextResponse.json(plot, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
