/**
 * modules/cropping/application/deleteCropCycle — use-case for deleting (cancelling) a crop cycle.
 *
 * Verifies active cycle immutability guard, cancels cycle and pending milestone tasks atomically,
 * and records an audit log.
 */

import { prisma } from "@/infrastructure/db";
import { audit } from "@/infrastructure/audit";
import { requireFarmAccess } from "@modules/auth";
import { assertActiveCycleNotDeleted } from "../domain/cropCyclePolicy";
import {
  findCropCycleForDelete,
  cancelCropCycleTransaction,
} from "../infrastructure/cropCycleQueries";

export async function deleteCropCycle(args: {
  plotId: string;
  cycleId: string;
  actor?: { id: string };
}) {
  const { plotId, cycleId } = args;

  const cycle = await findCropCycleForDelete(prisma, { plotId, cycleId });
  const actor = args.actor ?? (await requireFarmAccess(cycle.plot.farmId, true));

  assertActiveCycleNotDeleted(cycle.status);

  await cancelCropCycleTransaction(prisma, cycleId);
  await audit(actor.id, "CANCEL", "CropCycle", cycleId, { plotId });
}
