/**
 * modules/cropping/application/getCropCyclePageData — use-cases for crop cycle server page composition.
 *
 * Eliminates direct Prisma usage from crop cycle server pages.
 */

import { prisma } from "@/infrastructure/db";
import { requireFarmAccess } from "@modules/auth";
import {
  findPlotForNewCropCyclePage,
  findCropCycleForDetailPage,
  findPlotForEditCropCyclePage,
} from "../infrastructure/cropCycleQueries";

export async function getNewCropCyclePageData(args: { plotId: string }) {
  const { plotId } = args;
  const plot = await findPlotForNewCropCyclePage(prisma, plotId);
  await requireFarmAccess(plot.farmId, true);
  return { plot };
}

export async function getCropCycleDetailPageData(args: {
  plotId: string;
  cycleId: string;
}) {
  const { plotId, cycleId } = args;
  const cycle = await findCropCycleForDetailPage(prisma, { plotId, cycleId });
  await requireFarmAccess(cycle.plot.farmId);
  return { cycle };
}

export async function getEditCropCyclePageData(args: {
  plotId: string;
  cycleId: string;
}) {
  const { plotId } = args;
  const plot = await findPlotForEditCropCyclePage(prisma, plotId);
  await requireFarmAccess(plot.farmId, true);
  return { plot };
}
