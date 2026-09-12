import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { parseBoundary, roundAcresForDb } from "@/lib/geo-server";
import { commitBoundary, plotsOutsideRing } from "@/lib/geo-versions";
import { parseBoundaryToRing } from "@/lib/geo-core";

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  ownerName: z.string().min(2).max(120).optional(),
  location: z.string().min(2).max(180).optional(),
  address: z.string().max(500).nullable().optional(),
  latitude: z.coerce.number().gte(-90).lte(90).optional(),
  longitude: z.coerce.number().gte(-180).lte(180).optional(),
  totalArea: z.coerce.number().positive().optional(),
  cultivableArea: z.coerce.number().positive().optional(),
  waterSource: z.string().min(2).max(180).optional(),
  geofenceRadiusMeters: z.coerce.number().int().min(50).max(10000).optional(),
  boundaryGeoJson: z.any().optional().nullable(),
  // `boundary` accepted as an alias (plot API canonical name).
  boundary: z.any().optional().nullable(),
  status: z.enum(["SETUP", "ACTIVE", "INACTIVE", "COMPLETED"]).optional(),
  // Explicit override for fence changes that would orphan existing plots.
  force: z.boolean().optional(),
});

const farmTransitions: Record<string, string[]> = {
  SETUP: ["ACTIVE"],
  ACTIVE: ["INACTIVE", "COMPLETED"],
  INACTIVE: ["ACTIVE", "COMPLETED"],
  COMPLETED: [],
};

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params;
    await requireFarmAccess(farmId);
    const farm = await prisma.farm.findUniqueOrThrow({
      where: { id: farmId },
      include: {
        access: {
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
        plots: {
          where: { deletedAt: null },
          include: {
            irrigation: true,
            cropCycles: { include: { varieties: true, milestones: true } },
          },
        },
      },
    });
    return NextResponse.json(farm);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params;
    const actor = await requireFarmAccess(farmId, true);
    const input = patchSchema.parse(await request.json());
    const current = await prisma.farm.findUniqueOrThrow({
      where: { id: farmId },
      select: { status: true, totalArea: true, cultivableArea: true },
    });

    const total = input.totalArea ?? Number(current.totalArea);
    const cultivable = input.cultivableArea ?? Number(current.cultivableArea);

    if (cultivable > total) {
      throw new Error("Cultivable area cannot exceed total area.");
    }

    if (input.status && input.status !== current.status) {
      const allowed = farmTransitions[current.status] ?? [];
      if (!allowed.includes(input.status)) {
        return NextResponse.json({ error: `Invalid farm status transition from ${current.status} to ${input.status}. Allowed: ${allowed.join(", ") || "none (terminal)"}.` }, { status: 409 });
      }
      if (input.status === "ACTIVE") {
        const hasPlot = await prisma.plot.count({ where: { farmId, deletedAt: null } });
        if (!hasPlot) return NextResponse.json({ error: "Farm activation requires at least one plot." }, { status: 422 });
      }
    }

    // Normalize-on-write for boundary: server validates + computes acres, never trusts client math.
    // - undefined (absent) => no change, no version
    // - null / "" / [] => clear boundary (measuredAcres null) + version
    // - canonical GeoJSON string OR legacy [{lat,lng}] (stringified or raw) => validate + normalize + version
    const { boundaryGeoJson: rawCanonical, boundary: rawAlias, force: _force, ...rest } = input;
    const rawBoundary = rawCanonical !== undefined ? rawCanonical : rawAlias;
    let boundaryIntent: { kind: "keep" } | { kind: "set"; geoJson: string; acres: number } | { kind: "clear" } = { kind: "keep" };
    if (rawBoundary !== undefined) {
      const isEmpty =
        rawBoundary === null ||
        (typeof rawBoundary === "string" && rawBoundary.trim() === "") ||
        (Array.isArray(rawBoundary) && rawBoundary.length === 0);
      if (isEmpty) {
        boundaryIntent = { kind: "clear" };
      } else {
        try {
          const parsed = parseBoundary(rawBoundary);
          if (!parsed) {
            boundaryIntent = { kind: "clear" };
          } else {
            boundaryIntent = { kind: "set", geoJson: parsed.geoJson, acres: roundAcresForDb(parsed.acres) };
          }
        } catch (e) {
          return NextResponse.json(
            { error: e instanceof Error ? e.message : "Invalid farm boundary." },
            { status: 422 }
          );
        }
      }
    }

    // Farm-shrink safety: a smaller (or removed) fence must not silently
    // orphan fenced plots. Best-effort pre-check here (exact under the
    // transaction lock below for the allocation cap).
    let shrinkOrphans: string[] = [];
    if (boundaryIntent.kind !== "keep") {
      const newRing =
        boundaryIntent.kind === "set" ? parseBoundaryToRing(boundaryIntent.geoJson) : null;
      const check = await plotsOutsideRing(
        prisma,
        farmId,
        newRing
      );
      shrinkOrphans = [...check.outside, ...check.unverifiable];
      if (shrinkOrphans.length > 0 && input.force !== true) {
        return NextResponse.json(
          {
            error: `This fence change would leave ${shrinkOrphans.length} fenced plot(s) outside the farm: ${shrinkOrphans.slice(0, 5).join(", ")}${shrinkOrphans.length > 5 ? "…" : ""}. Move the plots first, or resend with force:true (audited).`,
            code: "FARM_SHRINK_ORPHANS",
            plots: shrinkOrphans,
          },
          { status: 409 }
        );
      }
    }

    // Current-state write + version insert happen in ONE transaction via
    // commitBoundary: partial states are structurally impossible.
    // The farm row is locked first so the allocation cap below is exact.
    const { result: farm } = await prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe("SELECT id FROM `Farm` WHERE id = ? FOR UPDATE", farmId);
      const allocated = await tx.plot.aggregate({
        where: { farmId, deletedAt: null },
        _sum: { area: true },
      });
      const totalAllocated = Math.round(Number(allocated._sum.area ?? 0) * 100) / 100;
      if (totalAllocated > Math.round(cultivable * 100) / 100) {
        throw new Error("Cultivable area cannot be reduced below the area already allocated to plots.");
      }
      if (boundaryIntent.kind === "keep") {
        const unchanged = await tx.farm.update({ where: { id: farmId }, data: { ...rest } });
        return { result: unchanged };
      }
      const b =
        boundaryIntent.kind === "set"
          ? { geoJson: boundaryIntent.geoJson, acres: boundaryIntent.acres }
          : { geoJson: null, acres: null };
      return commitBoundary(
        tx,
        { type: "FARM", id: farmId },
        b,
        { source: "MANUAL_DRAW", actorId: actor.id, actorName: actor.name },
        async (t) =>
          t.farm.update({
            where: { id: farmId },
            data: { ...rest, boundaryGeoJson: b.geoJson, measuredAcres: b.acres },
          })
      );
    });

    await audit(actor.id, input.status ? "STATUS_CHANGE" : "UPDATE", "Farm", farmId, { ...rest, boundary: boundaryIntent.kind, ...(shrinkOrphans.length > 0 ? { forcedShrink: true, orphanedPlots: shrinkOrphans } : {}) });
    return NextResponse.json(farm);
  } catch (error) {
    return apiError(error);
  }
}
