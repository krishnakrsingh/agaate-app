/**
 * modules/estates/application/listEstates — application use-case for listing estates.
 */

import { prisma } from "@/infrastructure/db";
import type { Prisma } from "@prisma/client";
import { findEstatesPage, type EstateListRow } from "../infrastructure/estateQueries";
import type { EstateListFilters } from "../schemas/estate";

type Db = typeof prisma;

export async function listEstates(opts: {
  accessibleWhere: Prisma.FarmWhereInput;
  filters: EstateListFilters;
  limit: number;
  offset: number;
  sortBy: string;
  order: "asc" | "desc";
  db?: Db;
}): Promise<{ estates: EstateListRow[]; total: number }> {
  const { accessibleWhere, filters, limit, offset, sortBy, order, db = prisma } = opts;
  return findEstatesPage(db, {
    accessibleWhere,
    filters,
    limit,
    offset,
    sortBy,
    order,
  });
}
