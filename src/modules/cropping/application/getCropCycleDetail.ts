/**
 * modules/cropping/application/getCropCycleDetail — use-case for getting crop cycle detail.
 *
 * Verifies caller farm read permissions and retrieves crop cycle with varieties and ordered milestones.
 */

import { prisma } from "@/infrastructure/db";
import { requireFarmAccess } from "@/lib/access";
import { findPlotForCropCycle, findCropCycleDetail } from "../infrastructure/cropCycleQueries";

export async function getCropCycleDetail(args: {
  plotId: string;
  cycleId: string;
  actor?: { id: string };
}) {
  const { plotId, cycleId } = args;

  const plot = await findPlotForCropCycle(prisma, plotId);
  await (args.actor ?? requireFarmAccess(plot.farmId));

  return findCropCycleDetail(prisma, { plotId, cycleId });
}
