/**
 * modules/plots/application/getPlotDetail — application use-case for plot detail.
 */

import { prisma } from "@/infrastructure/db";
import { requireFarmAccess } from "@modules/auth";
import { findPlotDetail } from "../infrastructure/plotQueries";
import { PlotFault } from "../domain/plotPolicy";

type Db = typeof prisma;

export async function getPlotDetail(opts: {
  plotId: string;
  db?: Db;
}) {
  const { plotId, db = prisma } = opts;
  const plot = await findPlotDetail(db, plotId);
  if (!plot) {
    throw new PlotFault(404, { error: "The requested record was not found." });
  }
  try {
    await requireFarmAccess(plot.farmId);
  } catch {
    throw new PlotFault(404, { error: "The requested record was not found." });
  }
  return plot;
}
