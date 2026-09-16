/**
 * modules/plots/domain/plotPolicy — pure domain rules for plots.
 *
 * Framework-free: no React, no Next.js, no Prisma.
 * Single source of truth for plot lifecycle, status, area limits, and irrigation rules.
 */

export class PlotFault extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>
  ) {
    super(typeof body.error === "string" ? body.error : "Plot operation failed.");
    this.name = "PlotFault";
  }
}

export const PLOT_STATUSES = ["SETUP", "ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type PlotStatus = (typeof PLOT_STATUSES)[number];

export function assertPlotAreaWithinRemaining(totalAllocated: number, cultivableArea: number): void {
  const roundedAllocated = Math.round(totalAllocated * 100) / 100;
  const roundedCultivable = Math.round(cultivableArea * 100) / 100;
  if (roundedAllocated > roundedCultivable) {
    throw new PlotFault(422, { error: "Total plot area cannot exceed the farm's cultivable area." });
  }
}

export interface IrrigationEntry {
  type: "Drip" | "Rain Pipe" | "Sprinkler" | "Flood" | "Other" | string;
  details?: string | null;
}

export function assertIrrigationValid(entries: IrrigationEntry[]): void {
  const types = entries.map((e) => e.type);
  if (new Set(types).size !== types.length) {
    throw new PlotFault(422, { error: "Irrigation types must be unique." });
  }
  for (const item of entries) {
    if (item.type === "Other" && !item.details?.trim()) {
      throw new PlotFault(422, { error: "Details are required for Other irrigation type." });
    }
  }
}
