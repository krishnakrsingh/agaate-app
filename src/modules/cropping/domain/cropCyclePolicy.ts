/**
 * modules/cropping/domain/cropCyclePolicy — pure domain rules for crop cycles.
 *
 * Framework-free: no React, no Next.js, no Prisma.
 * Single source of truth for crop cycle lifecycle, status transitions,
 * infrastructure calculations, and milestone templates.
 */

export class CropCycleFault extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>
  ) {
    super(typeof body.error === "string" ? body.error : "Crop cycle operation failed.");
    this.name = "CropCycleFault";
  }
}

export const CROP_CYCLE_STATUSES = ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"] as const;
export type CropCycleStatus = (typeof CROP_CYCLE_STATUSES)[number];

export const CROP_CYCLE_TRANSITIONS: Record<string, string[]> = {
  PLANNED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionCropCycle(from: string, to: string): boolean {
  return CROP_CYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertPlotNotArchived(plotStatus: string): void {
  if (plotStatus === "ARCHIVED") {
    throw new CropCycleFault(422, { error: "An archived plot cannot receive crop cycles." });
  }
}

export function assertActiveCycleNotDeleted(cycleStatus: string): void {
  if (cycleStatus === "ACTIVE") {
    throw new CropCycleFault(409, { error: "An active crop cycle cannot be deleted." });
  }
}

export function calculatedInfrastructure(
  plotArea: number,
  bedsPerAcre?: number | null,
  plantsPerAcre?: number | null
): { expectedTotalBeds: number | null; expectedPlants: number | null } {
  return {
    expectedTotalBeds: bedsPerAcre == null ? null : plotArea * bedsPerAcre,
    expectedPlants: plantsPerAcre == null ? null : plotArea * plantsPerAcre,
  };
}

export interface MilestoneTemplateInput {
  mulchEnabled: boolean;
  establishmentType: "NURSERY_TRANSPLANTATION" | "DIRECT_SOWING";
  firstHarvestDate?: Date | null;
}

export function milestoneTemplates(input: MilestoneTemplateInput): Array<{ name: string; targetDate: Date | null }> {
  return [
    "Land Preparation",
    input.mulchEnabled ? "Mulching & TP / Sowing Readiness" : "TP / Sowing Readiness",
    input.establishmentType === "NURSERY_TRANSPLANTATION" ? "Transplantation" : "Direct Sowing",
    "First Harvest",
  ].map((name) => ({
    name,
    targetDate: name === "First Harvest" && input.firstHarvestDate ? input.firstHarvestDate : null,
  }));
}

export function assertStandardMilestones(
  milestones: Array<{ name: string }>,
  requiredNames: string[]
): void {
  const hasStandard = requiredNames.every((name) =>
    milestones.some(
      (m) => m.name === name || (name === "First Harvest" && m.name === "Harvesting")
    )
  );
  if (!hasStandard) {
    throw new CropCycleFault(422, { error: "All four standard milestones are required." });
  }
}
