/**
 * modules/plots — public entrypoint for the Plots domain.
 *
 * Canonical owner of Plot identity, lifecycle, configuration, and business rules.
 * Import ONLY from this file — never from domain/, application/, schemas/,
 * or infrastructure/ internals (enforced by architecture boundary tests).
 */

export { listPlots } from "./application/listPlots";
export { getPlotDetail } from "./application/getPlotDetail";
export { getPlotPageData } from "./application/getPlotPageData";
export { getOwnerLandData } from "./application/getOwnerLandData";
export {
  plotCreateSchema,
  plotPatchSchema,
  parsePlotListParams,
  type PlotCreateInput,
  type PlotPatchInput,
  type PlotListFilters,
  type PlotListParams,
} from "./schemas/plot";
export {
  PLOT_STATUSES,
  assertPlotAreaWithinRemaining,
  assertIrrigationValid,
  PlotFault,
  type PlotStatus,
  type IrrigationEntry,
} from "./domain/plotPolicy";
