import { NextRequest } from "next/server";
import { accessibleFarmWhere } from "@/lib/access";
import { apiError, paginatedJson } from "@/lib/api";
import { listPlots, parsePlotListParams } from "@modules/plots";

export async function GET(request: NextRequest) {
  try {
    const accessibleWhere = await accessibleFarmWhere();
    const sp = request.nextUrl.searchParams;
    const { filters, limit, offset } = parsePlotListParams(sp);

    const { plots, total } = await listPlots({
      accessibleWhere,
      filters,
      limit,
      offset,
    });

    return paginatedJson(plots, total);
  } catch (error) {
    return apiError(error);
  }
}
