import { NextRequest, NextResponse } from "next/server";
import { requireFarmAccess } from "@modules/auth";
import { apiError } from "@infrastructure/http";
import { createPlot, PlotFault } from "@modules/plots";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params;
    const actor = await requireFarmAccess(farmId, true);
    const plot = await createPlot({
      farmId,
      rawInput: await request.json(),
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
