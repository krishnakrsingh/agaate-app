/**
 * modules/estates/application/createEstate — use-case for creating an estate.
 *
 * Orchestrates authorization, input validation, client scoping, persistence,
 * and audit logging.
 */

import { requireRole, type Actor } from "@modules/auth";
import { prisma } from "@/infrastructure/db";
import { audit } from "@/infrastructure/audit";
import { estateCreateSchema, type EstateCreateInput } from "../schemas/estate";
import { createEstateRecord } from "../infrastructure/estateQueries";

export async function createEstate(args: {
  rawInput: unknown;
  actor: Actor;
}) {
  const { rawInput, actor } = args;
  requireRole(actor, ["SUPER_ADMIN", "FARM_ADMIN"]);

  const input: EstateCreateInput = estateCreateSchema.parse(rawInput);
  const canManage = actor.role === "SUPER_ADMIN" || actor.role === "FARM_ADMIN";

  let targetClientId = input.clientId || null;
  if (!targetClientId && actor.clientId) {
    targetClientId = actor.clientId;
  }

  const farm = await createEstateRecord(prisma, {
    input,
    actorId: actor.id,
    canManage,
    targetClientId,
  });

  await audit(actor.id, "CREATE", "Farm", farm.id, { name: farm.name });

  return farm;
}
