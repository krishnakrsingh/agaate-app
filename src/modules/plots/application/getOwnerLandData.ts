/**
 * modules/plots/application/getOwnerLandData — application use-case for
 * the Owner Land & Plots Explorer server page (src/app/(estate)/owner/land/page.tsx).
 */

import { prisma } from "@/infrastructure/db";
import { accessibleFarmWhere } from "@modules/auth";
import { findOwnerLandData } from "../infrastructure/plotQueries";

type Db = typeof prisma;

export async function getOwnerLandData(opts?: { db?: Db }) {
  const db = opts?.db ?? prisma;
  const farmWhere = await accessibleFarmWhere();
  return findOwnerLandData(db, farmWhere);
}
