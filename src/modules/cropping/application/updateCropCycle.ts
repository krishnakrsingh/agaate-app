/**
 * modules/cropping/application/updateCropCycle — use-case for updating a crop cycle.
 *
 * Handles transport input parsing, effective value merges, milestone retention checks,
 * bed/mulch constraints, infrastructure recalculations, atomic persistence with milestone task syncing,
 * and audit logging.
 */

import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireFarmAccess } from "@/lib/access";
import {
  cropCyclePatchSchema,
  type CropCyclePatchInput,
} from "../schemas/cropCycle";
import {
  calculatedInfrastructure,
  assertStandardMilestones,
  CropCycleFault,
} from "../domain/cropCyclePolicy";
import {
  findCropCycleForPatch,
  updateCropCycleTransaction,
} from "../infrastructure/cropCycleQueries";

export async function updateCropCycle(args: {
  plotId: string;
  cycleId: string;
  rawInput: unknown;
  actor?: { id: string };
}) {
  const { plotId, cycleId, rawInput } = args;

  const cycle = await findCropCycleForPatch(prisma, { plotId, cycleId });
  const actor = args.actor ?? (await requireFarmAccess(cycle.plot.farmId, true));

  const input: CropCyclePatchInput = cropCyclePatchSchema.parse(rawInput);

  const effectiveBeds =
    input.expectedBedsPerAcre !== undefined
      ? input.expectedBedsPerAcre
      : cycle.expectedBedsPerAcre == null
      ? null
      : Number(cycle.expectedBedsPerAcre);

  const effectiveMulch =
    input.mulchEnabled !== undefined ? input.mulchEnabled : cycle.mulchEnabled;

  const effectivePattern =
    input.mulchHolePattern !== undefined ? input.mulchHolePattern : cycle.mulchHolePattern;

  const effectivePlantDistance =
    input.plantDistanceCm !== undefined
      ? input.plantDistanceCm
      : cycle.plantDistanceCm == null
      ? null
      : Number(cycle.plantDistanceCm);

  if ((input.bedPreparationEnabled ?? cycle.bedPreparationEnabled) && effectiveBeds == null) {
    throw new CropCycleFault(422, {
      error: "Expected beds per acre is required when bed preparation is enabled.",
    });
  }

  if (effectiveMulch && (effectivePattern == null || effectivePlantDistance == null)) {
    throw new CropCycleFault(422, {
      error: "Mulch pattern and plant distance are required when mulching is enabled.",
    });
  }

  const effectivePlants =
    input.expectedPlantsPerAcre !== undefined
      ? input.expectedPlantsPerAcre
      : cycle.expectedPlantsPerAcre == null
      ? null
      : Number(cycle.expectedPlantsPerAcre);

  if (input.milestones) {
    const required = [
      "Land Preparation",
      effectiveMulch ? "Mulching & TP / Sowing Readiness" : "TP / Sowing Readiness",
      (input.establishmentType ?? cycle.establishmentType) === "NURSERY_TRANSPLANTATION"
        ? "Transplantation"
        : "Direct Sowing",
      "First Harvest",
    ];
    if (!required.every((name) => input.milestones!.some((m) => m.name === name))) {
      throw new CropCycleFault(422, {
        error: "All four standard milestones must be retained.",
      });
    }
  }

  const calc = calculatedInfrastructure(
    Number(cycle.plot.area),
    effectiveBeds,
    effectivePlants
  );

  const updated = await updateCropCycleTransaction(prisma, {
    plotId,
    cycleId,
    existingCycle: cycle,
    input,
    calc,
    actorId: actor.id,
  });

  await audit(actor.id, "UPDATE", "CropCycle", cycleId, {
    plotId,
    varietiesChanged: Boolean(input.varieties),
    milestonesChanged: Boolean(input.milestones),
  });

  return updated;
}
