/**
 * modules/estates/application/activateEstate — use-case for activating an estate.
 *
 * Verifies caller farm write permissions, evaluates domain activation readiness
 * (SETUP status, at least one plot with planned crop cycle & standard milestones),
 * executes the multi-entity activation transaction, and logs an audit record.
 */

import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireFarmAccess } from "@/lib/access";
import { assertCanActivateEstate, EstateFault } from "../domain/estatePolicy";
import {
  findEstateForActivation,
  activateEstateTransaction,
} from "../infrastructure/estateQueries";

export async function activateEstate(args: {
  estateId: string;
  actor?: { id: string };
}) {
  const { estateId } = args;
  const actor = args.actor ?? (await requireFarmAccess(estateId, true));

  const farm = await findEstateForActivation(prisma, estateId);
  const check = assertCanActivateEstate(farm.status, farm.plots);

  if (!check.ready) {
    throw new EstateFault(check.status ?? 422, { error: check.error });
  }

  const active = await activateEstateTransaction(prisma, estateId);
  await audit(actor.id, "ACTIVATE", "Farm", estateId);

  return active;
}
