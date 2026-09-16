/**
 * modules/plots/application/updatePlot — use-case for updating a plot.
 *
 * Handles input parsing, lifecycle invariants (archived plot immutability,
 * live cycle archive guards), spatial boundary containment & acreage calculation,
 * transactional persistence under farm-row lock, and audit logging.
 */

import { prisma } from "@/infrastructure/db";
import { audit } from "@/lib/audit";
import { requireFarmAccess } from "@/lib/access";
import { validatePlotGeometry, roundAcresForDb } from "@modules/spatial";
import { plotPatchSchema, type PlotPatchInput } from "../schemas/plot";
import {
  PlotFault,
  assertPlotCanBeEdited,
  assertPlotCanBeArchived,
} from "../domain/plotPolicy";
import {
  findPlotForPatch,
  countPlotLiveCycles,
  updatePlotWithBoundaryTransaction,
} from "../infrastructure/plotQueries";

export async function updatePlot(args: {
  plotId: string;
  rawInput: unknown;
  actor?: { id: string; name?: string | null };
}) {
  const { plotId, rawInput } = args;

  const existing = await findPlotForPatch(prisma, plotId);
  if (!existing) {
    throw new PlotFault(404, { error: "The requested record was not found." });
  }

  let actor = args.actor;
  if (!actor) {
    try {
      actor = await requireFarmAccess(existing.farmId, true);
    } catch {
      throw new PlotFault(404, { error: "The requested record was not found." });
    }
  }

  const input: PlotPatchInput = plotPatchSchema.parse(rawInput);
  assertPlotCanBeEdited(existing.status);

  let geoJson = existing.boundaryGeoJson;
  let measured: number | null =
    existing.measuredAcres === null ? null : Number(existing.measuredAcres);
  let area = input.area ?? Number(existing.area);
  const rawBoundary = input.boundary !== undefined ? input.boundary : input.boundaryGeoJson;

  if (rawBoundary !== undefined) {
    const geo = validatePlotGeometry(rawBoundary, existing.farm.boundaryGeoJson);
    if (geo === null) {
      geoJson = null;
      measured = null;
    } else {
      geoJson = geo.geoJson;
      measured = roundAcresForDb(geo.acres);
      area = measured;
    }
  }

  if (input.status === "ARCHIVED") {
    const liveCycles = await countPlotLiveCycles(prisma, plotId);
    assertPlotCanBeArchived(liveCycles);
  }

  const plot = await updatePlotWithBoundaryTransaction(prisma, {
    plotId,
    existing,
    input,
    area,
    geoJson,
    measured,
    actor,
  });

  await audit(actor.id, "UPDATE", "Plot", plotId, {
    fields: Object.keys(input).filter((k) => k !== "irrigation" && k !== "boundary"),
    boundary:
      input.boundary === undefined
        ? "unchanged"
        : input.boundary === null
        ? "cleared"
        : "redrawn",
    area,
  });

  return plot;
}
