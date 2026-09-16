import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getPlotDetail, updatePlot, archivePlot, PlotFault } from "@modules/plots";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ plotId: string }> }
) {
  try {
    const { plotId } = await params;
    const plot = await getPlotDetail({ plotId });
    return NextResponse.json(plot);
  } catch (error) {
    if (error instanceof PlotFault) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return apiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ plotId: string }> }
) {
  try {
    const { plotId } = await params;
    const plot = await updatePlot({
      plotId,
      rawInput: await request.json(),
    });
    return NextResponse.json(plot);
  } catch (error) {
    if (error instanceof PlotFault) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return apiError(error);
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ plotId: string }> }
) {
  try {
    const { plotId } = await params;
    await archivePlot({ plotId });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof PlotFault) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return apiError(error);
  }
}
