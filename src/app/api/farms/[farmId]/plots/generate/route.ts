import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import {
  parseBoundaryToRing,
  toGeoJsonPolygon,
  ringAcres,
  roundAcresForDb,
  ringWithinRing,
  ringIsSimple,
  gridSplitRing,
  representativePoint,
  type LngLat,
} from "@/lib/geo-server";
import { commitBoundary } from "@/lib/geo-versions";

const irrigationItem = z.object({
  type: z.enum(["Drip", "Rain Pipe", "Sprinkler", "Flood", "Other"]),
  details: z.string().max(300).optional().nullable(),
});

const schema = z.object({
  cols: z.coerce.number().int().min(1).max(10).default(3),
  rows: z.coerce.number().int().min(1).max(10).default(2),
  namePrefix: z.string().min(1).max(40).default("Block"),
  soilType: z.string().max(100).optional().nullable(),
  irrigation: z
    .array(irrigationItem)
    .max(5)
    .optional()
    .default([])
    .superRefine((arr, ctx) => {
      for (const it of arr ?? []) {
        if (it.type === "Other" && !it.details?.trim()) {
          ctx.addIssue({ code: "custom", message: "Details are required for Other irrigation type.", path: ["irrigation"] });
        }
      }
    }),
});

/**
 * Partition a farm's drawn polygon into a cols×rows block grid.
 * Every generated polygon is clipped from the REAL farm geometry (never
 * hardcoded rectangles) and re-validated through the canonical spatial
 * checks before persistence. Whole batch is transactional: any invalid
 * block aborts everything.
 * POST /api/farms/[farmId]/plots/generate
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params;
    const actor = await requireFarmAccess(farmId, true);
    const input = schema.parse(await request.json());

    if (input.cols * input.rows > 50) {
      throw new Error("Grid is too fine: cols × rows must not exceed 50 blocks per call.");
    }

    const farm = await prisma.farm.findUniqueOrThrow({
      where: { id: farmId },
      select: { name: true, boundaryGeoJson: true },
    });
    if (!farm.boundaryGeoJson) {
      throw new Error("This farm has no drawn boundary yet — draw the farm boundary before subdividing it.");
    }
    let farmRing: LngLat[];
    try {
      const parsed = parseBoundaryToRing(farm.boundaryGeoJson);
      if (parsed === null) throw new Error("unreadable");
      farmRing = parsed;
    } catch {
      throw new Error("The farm's stored boundary is unreadable — redraw the farm boundary first.");
    }

    const farmAcres = ringAcres(farmRing);
    const minAcres = Math.max(0.05, farmAcres * 0.01);
    const cells = gridSplitRing(farmRing, input.cols, input.rows, minAcres);
    if (cells.length === 0) {
      throw new Error(
        "Partition produced no viable blocks — the farm polygon may be too small or degenerate for this grid."
      );
    }

    // Defense in depth: every generated polygon re-passes canonical checks.
    for (const cell of cells) {
      const label = `${input.namePrefix} ${String.fromCharCode(65 + cell.col)}${cell.row + 1}`;
      if (!ringIsSimple(cell.ring)) {
        throw new Error(`Generated block ${label} failed spatial validation (self-intersecting) — aborting.`);
      }
      if (!ringWithinRing(cell.ring, farmRing)) {
        throw new Error(`Generated block ${label} failed spatial validation (outside farm fence) — aborting.`);
      }
    }

    const taken = new Set(
      (await prisma.plot.findMany({ where: { farmId }, select: { name: true } })).map((p) => p.name.toLowerCase())
    );
    const uniqueName = (base: string) => {
      let name = base;
      let n = 2;
      while (taken.has(name.toLowerCase())) name = `${base} (${n++})`;
      taken.add(name.toLowerCase());
      return name;
    };

    const centroid = (ring: LngLat[]): { lat: number; lng: number } => {
      const [lng, lat] = representativePoint(ring);
      return { lng, lat };
    };

    const plots = await prisma.$transaction(async (tx) => {
      const out = [];
      for (const cell of cells) {
        const label = `${input.namePrefix} ${String.fromCharCode(65 + cell.col)}${cell.row + 1}`;
        const c = centroid(cell.ring);
        const acres = roundAcresForDb(cell.acres);
        const { result: created } = await commitBoundary(
          tx,
          { type: "PLOT" },
          { geoJson: toGeoJsonPolygon(cell.ring), acres },
          { source: "GRID_SPLIT", actorId: actor.id, actorName: actor.name },
          async (t) =>
            t.plot.create({
              data: {
                farmId,
                name: uniqueName(label),
                area: acres,
                latitude: Math.min(90, Math.max(-90, c.lat)),
                longitude: Math.min(180, Math.max(-180, c.lng)),
                soilType: input.soilType ?? null,
                boundaryGeoJson: toGeoJsonPolygon(cell.ring),
                measuredAcres: acres,
                status: "SETUP",
                irrigation: input.irrigation?.length ? { create: input.irrigation } : undefined,
              },
              include: { irrigation: true },
            })
        );
        out.push(created);
      }
      return out;
    });

    const totalAcres = roundAcresForDb(plots.reduce((s, p) => s + Number(p.measuredAcres ?? p.area), 0));
    await audit(actor.id, "GENERATE", "Plot", farmId, {
      farmId,
      blocks: plots.length,
      names: plots.map((p) => p.name),
    });
    return NextResponse.json(
      { plots, totalAcres, farmAcres: roundAcresForDb(farmAcres) },
      { status: 201 }
    );
  } catch (error) {
    return apiError(error);
  }
}
