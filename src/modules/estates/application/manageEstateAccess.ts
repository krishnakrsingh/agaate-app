/**
 * modules/estates/application/manageEstateAccess — use-case for estate officer access control.
 *
 * Orchestrates:
 * - Listing officers and access assignments
 * - Assigning active FARM_OFFICER to active farms (with automatic unassigned task association)
 * - Unassigning FARM_OFFICER access
 * - Audit logging
 */

import { prisma } from "@/infrastructure/db";
import { audit } from "@/infrastructure/audit";
import { requireFarmAccess } from "@modules/auth";
import { EstateFault } from "../domain/estatePolicy";
import {
  estateOfficerAssignSchema,
  estateOfficerUnassignSchema,
} from "../schemas/estate";
import {
  findEstateForPatch,
  findEstateAccessList,
  findUserForOfficerAssignment,
  assignEstateOfficerTransaction,
  unassignEstateOfficerRecord,
} from "../infrastructure/estateQueries";

export async function listEstateAccess(args: {
  estateId: string;
  actor?: { id: string; role: string };
}) {
  const { estateId } = args;
  await (args.actor ?? requireFarmAccess(estateId, true));
  return findEstateAccessList(prisma, estateId);
}

export async function assignEstateOfficer(args: {
  estateId: string;
  rawInput: unknown;
  actor?: { id: string; role: string };
}) {
  const { estateId, rawInput } = args;
  const actor = args.actor ?? (await requireFarmAccess(estateId, true));

  if (!["SUPER_ADMIN", "FARM_ADMIN"].includes(actor.role)) {
    throw new EstateFault(403, {
      error: "Only Farm Admins or Super Admins can assign farm officers.",
    });
  }

  const farm = await findEstateForPatch(prisma, estateId);
  if (farm.status !== "ACTIVE" && farm.status !== "SETUP") {
    throw new EstateFault(400, {
      error: "Farm officers can only be assigned to active or setup estates.",
    });
  }

  const input = estateOfficerAssignSchema.parse(rawInput);
  const target = await findUserForOfficerAssignment(prisma, input.userId);
  if (target.role !== "FARM_OFFICER" || !target.active) {
    throw new EstateFault(400, {
      error: "Only active Farm Officer accounts can be assigned.",
    });
  }

  const result = await assignEstateOfficerTransaction(prisma, {
    estateId,
    userId: input.userId,
    canManage: input.canManage,
  });

  await audit(actor.id, "ASSIGN_FARM_OFFICER", "FarmAccess", result.id, {
    farmId: estateId,
    userId: input.userId,
  });

  return result;
}

export async function unassignEstateOfficer(args: {
  estateId: string;
  rawInput: unknown;
  actor?: { id: string; role: string };
}) {
  const { estateId, rawInput } = args;
  const actor = args.actor ?? (await requireFarmAccess(estateId, true));

  if (!["SUPER_ADMIN", "FARM_ADMIN"].includes(actor.role)) {
    throw new EstateFault(403, {
      error: "Only Farm Admins or Super Admins can remove farm officers.",
    });
  }

  const { userId } = estateOfficerUnassignSchema.parse(rawInput);
  const target = await findUserForOfficerAssignment(prisma, userId);
  if (target.role !== "FARM_OFFICER") {
    throw new EstateFault(400, {
      error: "Only Farm Officer assignments can be removed here.",
    });
  }

  await unassignEstateOfficerRecord(prisma, estateId, userId);
  await audit(actor.id, "UNASSIGN_FARM_OFFICER", "FarmAccess", estateId, {
    farmId: estateId,
    userId,
  });
}
