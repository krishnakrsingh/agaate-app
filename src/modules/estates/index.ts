/**
 * modules/estates — public entrypoint for the Estates domain.
 *
 * Canonical owner of Estate identity, lifecycle, configuration, and business rules.
 * Import ONLY from this file — never from domain/, application/, schemas/,
 * or infrastructure/ internals (enforced by architecture boundary tests).
 */

export { listEstates } from "./application/listEstates";
export { getEstateDetail } from "./application/getEstateDetail";
export { getEstateCommandCenter } from "./application/getEstateCommandCenter";
export { createEstate } from "./application/createEstate";
export { updateEstate } from "./application/updateEstate";
export { activateEstate } from "./application/activateEstate";
export {
  listEstateAccess,
  assignEstateOfficer,
  unassignEstateOfficer,
} from "./application/manageEstateAccess";
export { getEstateTaskPins } from "./application/getEstateTaskPins";
export {
  estateCreateSchema,
  estatePatchSchema,
  estateOfficerAssignSchema,
  estateOfficerUnassignSchema,
  parseEstateListParams,
  type EstateCreateInput,
  type EstatePatchInput,
  type EstateOfficerAssignInput,
  type EstateOfficerUnassignInput,
  type EstateListFilters,
  type EstateListParams,
} from "./schemas/estate";
export {
  ESTATE_STATUSES,
  ESTATE_STATUS_TRANSITIONS,
  canTransitionEstate,
  assertCultivableWithinTotal,
  assertCultivableNotBelowAllocated,
  assertValidEstateStatusTransition,
  assertCanActivateEstate,
  EstateFault,
  type EstateStatus,
} from "./domain/estatePolicy";
export type { EstateListRow } from "./infrastructure/estateQueries";
