/**
 * modules/estates/domain/estatePolicy — pure domain rules for estates.
 *
 * Framework-free: no React, no Next.js, no Prisma.
 * Single source of truth for estate lifecycle, status transitions, area limits,
 * and activation requirements.
 */

import { milestoneTemplates } from "@/lib/business";
export class EstateFault extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>
  ) {
    super(typeof body.error === "string" ? body.error : "Estate operation failed.");
    this.name = "EstateFault";
  }
}

export const ESTATE_STATUSES = ["SETUP", "ACTIVE", "INACTIVE", "COMPLETED"] as const;
export type EstateStatus = (typeof ESTATE_STATUSES)[number];

export const ESTATE_STATUS_TRANSITIONS: Record<string, string[]> = {
  SETUP: ["ACTIVE"],
  ACTIVE: ["INACTIVE", "COMPLETED"],
  INACTIVE: ["ACTIVE", "COMPLETED"],
  COMPLETED: [],
};

export function canTransitionEstate(from: string, to: string): boolean {
  return ESTATE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertCultivableWithinTotal(cultivableArea: number, totalArea: number): void {
  if (cultivableArea > totalArea) {
    throw new EstateFault(422, { error: "Cultivable area cannot exceed total area." });
  }
}

export interface ActivationPlot {
  deletedAt: Date | string | null;
  status: string | null;
  cropCycles?: Array<{
    status?: string | null;
    mulchEnabled?: boolean;
    establishmentType?: "NURSERY_TRANSPLANTATION" | "DIRECT_SOWING" | null;
    milestones?: Array<{ name: string }>;
  }>;
}

export function assertCanActivateEstate(
  currentStatus: string,
  plots: ActivationPlot[]
): { ready: boolean; error?: string; status?: number } {
  if (currentStatus !== "SETUP") {
    return {
      ready: false,
      error: `Farm activation is only allowed from SETUP status. Current status: ${currentStatus}`,
      status: 409,
    };
  }

  const activePlots = plots.filter((p) => !p.deletedAt && p.status !== "ARCHIVED");
  if (activePlots.length === 0) {
    return {
      ready: false,
      error: "Farm activation requires at least one plot.",
      status: 422,
    };
  }

  const ready = activePlots.some((p) =>
    (p.cropCycles ?? []).some((c) => {
      if (!c || (c.status !== "PLANNED" && c.status !== "ACTIVE")) return false;
      const establishmentType =
        c.establishmentType === "NURSERY_TRANSPLANTATION" || c.establishmentType === "DIRECT_SOWING"
          ? c.establishmentType
          : "NURSERY_TRANSPLANTATION";
      const required = milestoneTemplates({
        mulchEnabled: !!c.mulchEnabled,
        establishmentType,
      }).map((m) => m.name);
      return required.every((name) =>
        (c.milestones ?? []).some((m) => m.name === name || (name === "First Harvest" && m.name === "Harvesting"))
      );
    })
  );

  if (!ready) {
    return {
      ready: false,
      error: "Farm activation requires at least one non-archived plot with a planned crop cycle and all standard milestones.",
      status: 422,
    };
  }

  return { ready: true };
}
