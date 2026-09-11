import { NextRequest, NextResponse } from "next/server";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { commitBoundary, serializeBoundaryVersion, plotsOutsideRing } from "@/lib/geo-versions";
import { validatePlotGeometry } from "@/lib/geo-server";
import { parseBoundaryToRing } from "@/lib/geo-core";
import { z } from "zod";

/**
 * Restore a historical boundary as a NEW version (history is append-only:
 * v5 → restore v2 → v6 == v2 geometry; v1..v5 never change).
 * Provenance stays truthful: source/captureId come from the restored
 * version (how the geometry was produced), actor is the restorer,
 * restoredFromVersionId links the chain.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const force = z.object({ force: z.boolean().optional() }).parse(body).force === true;
    const version = await prisma.boundaryVersion.findUnique({ where: { id } });
    if (!version) return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });

    const farmId =
      version.entityType === "FARM"
        ? version.entityId
        : (await prisma.plot.findUnique({ where: { id: version.entityId }, select: { farmId: true } }))?.farmId;
    if (!farmId) return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    let actor;
    try {
      actor = await requireFarmAccess(farmId, true);
    } catch {
      // Mask existence: no-access reads as not-found (plot-route idiom).
      return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    }

    // Restoring an older (often bigger, often smaller) farm fence must not
    // silently orphan fenced plots. Same rule as farm PATCH.
    if (version.entityType === "FARM") {
      let newRing = null;
      try {
        newRing = version.boundaryGeoJson ? parseBoundaryToRing(version.boundaryGeoJson) : null;
      } catch {
        newRing = null;
      }
      // parse failure on a stored version is corruption: refuse loudly.
      if (version.boundaryGeoJson && !newRing) {
        return NextResponse.json({ error: "Stored historical geometry is unreadable and cannot be restored." }, { status: 422 });
      }
      const check = await plotsOutsideRing(prisma, farmId, newRing);
      const orphans = [...check.outside, ...check.unverifiable];
      if (orphans.length > 0 && !force) {
        return NextResponse.json(
          {
            error: `Restoring this fence would leave ${orphans.length} fenced plot(s) outside the farm: ${orphans.slice(0, 5).join(", ")}${orphans.length > 5 ? "…" : ""}. Resend with force:true (audited).`,
            code: "FARM_SHRINK_ORPHANS",
            plots: orphans,
          },
          { status: 409 }
        );
      }
      if (orphans.length > 0) {
        await audit(actor.id, "RESTORE_FORCE_SHRINK", "Farm", farmId, { fromVersion: version.version, orphanedPlots: orphans });
      }
    }

    // The farm fence may have moved since this version: re-validate plot
    // containment against TODAY's fence before restoring.
    if (version.entityType === "PLOT" && version.boundaryGeoJson) {
      const farm = await prisma.farm.findUniqueOrThrow({ where: { id: farmId }, select: { boundaryGeoJson: true } });
      try {
        validatePlotGeometry(version.boundaryGeoJson, farm.boundaryGeoJson);
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Historical plot no longer fits the current farm fence." },
          { status: 422 }
        );
      }
    }

    const acres = version.measuredAcres === null ? null : Number(version.measuredAcres);
    const committed = await prisma.$transaction((tx) =>
      commitBoundary(
        tx,
        { type: version.entityType, id: version.entityId },
        { geoJson: version.boundaryGeoJson, acres },
        {
          source: version.source,
          actorId: actor.id,
          actorName: actor.name,
          captureId: version.captureId,
          restoredFromVersionId: version.id,
        },
        async (t) => {
          if (version.entityType === "FARM") {
            return t.farm.update({
              where: { id: version.entityId },
              data: { boundaryGeoJson: version.boundaryGeoJson, measuredAcres: version.measuredAcres },
            });
          }
          return t.plot.update({
            where: { id: version.entityId },
            data: {
              boundaryGeoJson: version.boundaryGeoJson,
              measuredAcres: version.measuredAcres,
              ...(acres !== null ? { area: acres } : {}),
            },
          });
        }
      )
    );

    await audit(actor.id, "RESTORE", version.entityType === "FARM" ? "Farm" : "Plot", version.entityId, {
      fromVersion: version.version,
      toVersion: committed.version,
      restoredFrom: version.id,
    });
    const row = await prisma.boundaryVersion.findUniqueOrThrow({ where: { id: committed.id } });
    return NextResponse.json(serializeBoundaryVersion(row), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
