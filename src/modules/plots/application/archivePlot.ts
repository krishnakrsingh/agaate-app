/**
 * modules/plots/application/archivePlot — use-case for archiving (soft-deleting) a plot.
 *
 * Enforces live-cycle guards, sets status to ARCHIVED with deletedAt, and records audit log.
 */

import { prisma } from "@/infrastructure/db";
import { audit } from "@/infrastructure/audit";
import { requireFarmAccess } from "@/lib/access";
import { PlotFault, assertPlotCanBeArchived } from "../domain/plotPolicy";
import {
  findPlotForPatch,
  countPlotLiveCycles,
  archivePlotRecord,
} from "../infrastructure/plotQueries";

export async function archivePlot(args: {
  plotId: string;
  actor?: { id: string };
}) {
  const { plotId } = args;

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

  const liveCycles = await countPlotLiveCycles(prisma, plotId);
  assertPlotCanBeArchived(liveCycles);

  await archivePlotRecord(prisma, plotId);
  await audit(actor.id, "ARCHIVE", "Plot", plotId);
}
