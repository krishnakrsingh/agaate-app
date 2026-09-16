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
export {
  estateCreateSchema,
  estatePatchSchema,
  parseEstateListParams,
  type EstateCreateInput,
  type EstatePatchInput,
  type EstateListFilters,
  type EstateListParams,
} from "./schemas/estate";
export {
  ESTATE_STATUSES,
  ESTATE_STATUS_TRANSITIONS,
  canTransitionEstate,
  assertCultivableWithinTotal,
  assertCanActivateEstate,
  EstateFault,
  type EstateStatus,
} from "./domain/estatePolicy";
export type { EstateListRow } from "./infrastructure/estateQueries";
