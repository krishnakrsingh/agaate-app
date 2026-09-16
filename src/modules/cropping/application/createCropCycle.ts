/**
 * modules/cropping/application/createCropCycle — use-case for creating a crop cycle.
 *
 * Enforces plot existence, farm write authorization, plot status invariants,
 * infrastructure calculations, standard milestone prerequisites, transactional persistence
 * (with automatic task creation for each milestone), and audit logging.
 */

import { prisma } from "@/infrastructure/db";
import { audit } from "@/lib/audit";
import { requireFarmAccess } from "@/lib/access";
import {
  cropCycleCreateSchema,
  type CropCycleCreateInput,
} from "../schemas/cropCycle";
import {
  calculatedInfrastructure,
  milestoneTemplates,
  assertPlotNotArchived,
  assertStandardMilestones,
} from "../domain/cropCyclePolicy";
import {
  findPlotForCropCycle,
  createCropCycleTransaction,
} from "../infrastructure/cropCycleQueries";

export async function createCropCycle(args: {
  plotId: string;
  rawInput: unknown;
  actor?: { id: string };
}) {
  const { plotId, rawInput } = args;

  const plot = await findPlotForCropCycle(prisma, plotId);
  const actor = args.actor ?? (await requireFarmAccess(plot.farmId, true));

  assertPlotNotArchived(plot.status);

  const input: CropCycleCreateInput = cropCycleCreateSchema.parse(rawInput);
  const calc = calculatedInfrastructure(
    Number(plot.area),
    input.expectedBedsPerAcre,
    input.expectedPlantsPerAcre
  );

  const defaultNames = milestoneTemplates(input).map((m) => m.name);
  assertStandardMilestones(input.milestones, defaultNames);

  const milestones = [...input.milestones, ...input.supportActivities];
  const initialStatus = plot.farm.status === "ACTIVE" ? "ACTIVE" : "PLANNED";

  const cycle = await createCropCycleTransaction(prisma, {
    plotId,
    farmId: plot.farmId,
    initialStatus,
    input,
    calc,
    milestones,
    actorId: actor.id,
  });

  await audit(actor.id, "CREATE", "CropCycle", cycle.id, {
    plotId,
    cropName: cycle.cropName,
    milestoneCount: cycle.milestones.length,
  });

  return cycle;
}
