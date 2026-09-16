/**
 * modules/estates/application/getEstateDetail — application use-case for estate detail.
 */

import { prisma } from "@/infrastructure/db";
import { requireFarmAccess } from "@modules/auth";
import { findEstateDetail } from "../infrastructure/estateQueries";

type Db = typeof prisma;

export async function getEstateDetail(opts: {
  estateId: string;
  manageOnly?: boolean;
  db?: Db;
}) {
  const { estateId, manageOnly = false, db = prisma } = opts;
  await requireFarmAccess(estateId, manageOnly);
  return findEstateDetail(db, estateId);
}
