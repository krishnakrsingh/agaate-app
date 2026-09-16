import { NextRequest, NextResponse } from "next/server";
import { accessibleFarmWhere, requireFarmAccess } from "@/lib/access";
import { apiError, paginatedJson } from "@/lib/api";
import { listPlots, parsePlotListParams, createPlot, PlotFault } from "@modules/plots";

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const farmId = body.farmId || request.nextUrl.searchParams.get("farmId");
    if (!farmId) {
      return NextResponse.json(
        { error: "farmId is required to create a plot." },
        { status: 400 }
      );
    }
    const actor = await requireFarmAccess(farmId, true);
    const plot = await createPlot({
      farmId,
      rawInput: body,
      actor,
    });

    return NextResponse.json(plot, { status: 201 });
  } catch (error) {
    if (error instanceof PlotFault) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return apiError(error);
  }
}
