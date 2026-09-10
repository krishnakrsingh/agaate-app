import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { validatePlotGeometry, roundAcresForDb } from "@/lib/geo-server";
import { commitBoundary } from "@/lib/geo-versions";

const schema = z.object({
  name: z.string().min(1).max(120).optional(),
  area: z.coerce.number().positive().optional(),
  latitude: z.coerce.number().gte(-90).lte(90).optional(),
  longitude: z.coerce.number().gte(-180).lte(180).optional(),
  soilType: z.string().max(100).nullable().optional(),
  status: z.enum(["SETUP", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  // Drawn boundary (GeoJSON string or legacy). Absent = keep existing;
  // null/empty = clear; value = validate + server-compute acres.
  boundary: z.any().optional().nullable(),
  irrigation: z
    .array(
      z.object({
        type: z.enum(["Drip", "Rain Pipe", "Sprinkler", "Flood", "Other"]),
        details: z.string().max(300).optional().nullable(),
      })
    )
    .min(1)
    .optional()
    .superRefine((arr, ctx) => {
      if (!arr) return;
      if (new Set(arr.map((x) => x.type)).size !== arr.length) {
        ctx.addIssue({
          code: "custom",
          message: "Irrigation types must be unique.",
          path: ["irrigation"],
        });
      }
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

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ plotId: string }> }
) {
  try {
    const { plotId } = await params;
    // Fetch farm scope first so existence isn't oracle-able: no access => 404.
    const scope = await prisma.plot.findUnique({ where: { id: plotId }, select: { farmId: true } });
    if (!scope) return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    try {
      await requireFarmAccess(scope.farmId);
    } catch {
      return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    }
    const plot = await prisma.plot.findUniqueOrThrow({
      where: { id: plotId },
      include: {
        irrigation: true,
        cropCycles: { include: { varieties: true, milestones: true } },
        farm: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(plot);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ plotId: string }> }
) {
  try {
    const { plotId } = await params;
    const existing = await prisma.plot.findUnique({ where: { id: plotId }, include: { farm: { select: { totalArea: true, cultivableArea: true, boundaryGeoJson: true } } } });
    if (!existing) return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    let actor;
    try {
      actor = await requireFarmAccess(existing.farmId, true);
    } catch {
      return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    }
    const input = schema.parse(await request.json());

    if (existing.status === "ARCHIVED") {
      throw new Error("An archived plot cannot be edited.");
    }

    // Canonical geometry path. Boundary present (even null) takes over:
    // validated containment + server-computed acres replace client values.
    let geoJson = existing.boundaryGeoJson;
    let measured: number | null = existing.measuredAcres === null ? null : Number(existing.measuredAcres);
    let area = input.area ?? Number(existing.area);
    if (input.boundary !== undefined) {
      const geo = validatePlotGeometry(input.boundary, existing.farm.boundaryGeoJson);
      if (geo === null) {
        geoJson = null;
        measured = null;
      } else {
        geoJson = geo.geoJson;
        measured = roundAcresForDb(geo.acres);
        area = measured;
      }
    }
    // Allocation cap is enforced INSIDE the tx below (farm-row lock +
    // fresh aggregate); no pre-tx check here by design.
    if (input.status === "ARCHIVED") {
      const liveCycles = await prisma.cropCycle.count({
        where: { plotId, status: { in: ["PLANNED", "ACTIVE"] } },
      });
      if (liveCycles) {
        return NextResponse.json(
          { error: "A plot with active/planned crop cycles cannot be archived." },
          { status: 409 }
        );
      }
    }

    const plot = await prisma.$transaction(async (tx) => {
      // Farm-row lock first (consistent ordering everywhere), then the
      // allocation cap is re-checked on fresh numbers: pre-tx aggregates
      // cannot arbitrate concurrent writers.
      await tx.$queryRawUnsafe("SELECT id FROM `Farm` WHERE id = ? FOR UPDATE", existing.farmId);
      const fresh = await tx.plot.aggregate({
        where: { farmId: existing.farmId, deletedAt: null, id: { not: plotId } },
        _sum: { area: true },
      });
      if (Math.round((Number(fresh._sum.area ?? 0) + area) * 100) / 100 > Math.round(Number(existing.farm.cultivableArea) * 100) / 100) {
        throw new Error("Total plot area cannot exceed the farm's cultivable area.");
      }
      if (input.irrigation) {
        await tx.irrigationConfiguration.deleteMany({ where: { plotId } });
        await tx.irrigationConfiguration.createMany({
          data: input.irrigation.map((v) => ({ plotId, ...v })),
        });
      }
      const { irrigation, boundary: _boundary, ...rest } = input;
      const updateData = { ...rest, area, boundaryGeoJson: geoJson, measuredAcres: measured };
      if (input.boundary === undefined) {
        return tx.plot.update({ where: { id: plotId }, data: updateData, include: { irrigation: true } });
      }
      const { result } = await commitBoundary(
        tx,
        { type: "PLOT", id: plotId },
        { geoJson, acres: measured },
        { source: "MANUAL_DRAW", actorId: actor.id, actorName: actor.name },
        async (t) => t.plot.update({ where: { id: plotId }, data: updateData, include: { irrigation: true } })
      );
      return result;
    });

    await audit(actor.id, "UPDATE", "Plot", plotId, {
      fields: Object.keys(input).filter((k) => k !== "irrigation" && k !== "boundary"),
      boundary: input.boundary === undefined ? "unchanged" : input.boundary === null ? "cleared" : "redrawn",
      area,
    });
    return NextResponse.json(plot);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ plotId: string }> }
) {
  try {
    const { plotId } = await params;
    const plot = await prisma.plot.findUnique({ where: { id: plotId } });
    if (!plot) return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    let actor;
    try {
      actor = await requireFarmAccess(plot.farmId, true);
    } catch {
      return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    }
    const active = await prisma.cropCycle.count({
      where: { plotId, status: { in: ["PLANNED", "ACTIVE"] } },
    });
    if (active) {
      return NextResponse.json(
        { error: "A plot with active/planned crop cycles cannot be archived." },
        { status: 409 }
      );
    }
    await prisma.plot.update({
      where: { id: plotId },
      data: { status: "ARCHIVED", deletedAt: new Date() },
    });
    await audit(actor.id, "ARCHIVE", "Plot", plotId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
