/**
 * modules/plots/application/getPlotPageData — application use-case for
 * the Plot Detail server page (src/app/plots/[plotId]/page.tsx).
 */

import { prisma } from "@/infrastructure/db";
import { requireFarmAccess } from "@modules/auth";
import { findPlotPageData } from "../infrastructure/plotQueries";

type Db = typeof prisma;

export async function getPlotPageData(opts: {
  plotId: string;
  manageOnly?: boolean;
  db?: Db;
}) {
  const { plotId, manageOnly = true, db = prisma } = opts;
  const plot = await findPlotPageData(db, plotId);
  await requireFarmAccess(plot.farmId, manageOnly);
  return plot;
}
