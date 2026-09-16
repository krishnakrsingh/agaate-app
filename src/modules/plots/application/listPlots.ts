/**
 * modules/plots/application/listPlots — application use-case for listing plots.
 */

import { prisma } from "@/infrastructure/db";
import type { Prisma } from "@prisma/client";
import { findPlotsPage } from "../infrastructure/plotQueries";
import type { PlotListFilters } from "../schemas/plot";

type Db = typeof prisma;

export async function listPlots(opts: {
  accessibleWhere: Prisma.FarmWhereInput;
  filters: PlotListFilters;
  limit: number;
  offset: number;
  db?: Db;
}) {
  const { accessibleWhere, filters, limit, offset, db = prisma } = opts;
  return findPlotsPage(db, {
    accessibleWhere,
    filters,
    limit,
    offset,
  });
}
