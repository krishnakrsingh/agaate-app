import { NextRequest, NextResponse } from "next/server";
import { accessibleFarmWhere, currentActor } from "@/lib/access";
import { apiError, paginatedJson } from "@/lib/api";
import { listEstates, parseEstateListParams, createEstate } from "@modules/estates";

export async function GET(request: NextRequest) {
  try {
    const accessibleWhere = await accessibleFarmWhere();
    const sp = request.nextUrl.searchParams;
    const { filters, limit, offset, sortBy, order } = parseEstateListParams(sp);
    const { estates, total } = await listEstates({
      accessibleWhere,
      filters,
      limit,
      offset,
      sortBy,
      order,
    });

    return paginatedJson(estates, total);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    const farm = await createEstate({
      rawInput: await request.json(),
      actor,
    });
    return NextResponse.json(farm, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
