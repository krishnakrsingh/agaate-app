/**
 * modules/cropping — public entrypoint for the Cropping domain.
 *
 * Canonical owner of Crop Cycle lifecycle, varieties, milestones,
 * planting plans, and infrastructure calculations.
 * Import ONLY from this file — never from domain/, application/, schemas/,
 * or infrastructure/ internals (enforced by architecture boundary tests).
 */

export { createCropCycle } from "./application/createCropCycle";
export { getCropCycleDetail } from "./application/getCropCycleDetail";
export { updateCropCycle } from "./application/updateCropCycle";
export { deleteCropCycle } from "./application/deleteCropCycle";
export {
  getNewCropCyclePageData,
  getCropCycleDetailPageData,
  getEditCropCyclePageData,
} from "./application/getCropCyclePageData";

export {
  cropCycleCreateSchema,
  cropCyclePatchSchema,
  milestoneInputSchema,
  type CropCycleCreateInput,
  type CropCyclePatchInput,
  type MilestoneInput,
} from "./schemas/cropCycle";

export {
  CROP_CYCLE_STATUSES,
  CROP_CYCLE_TRANSITIONS,
  canTransitionCropCycle,
  assertPlotNotArchived,
  assertActiveCycleNotDeleted,
  calculatedInfrastructure,
  milestoneTemplates,
  assertStandardMilestones,
  CropCycleFault,
  type CropCycleStatus,
  type MilestoneTemplateInput,
} from "./domain/cropCyclePolicy";
