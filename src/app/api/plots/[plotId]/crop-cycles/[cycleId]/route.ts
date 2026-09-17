import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@infrastructure/http";
import {
  getCropCycleDetail,
  updateCropCycle,
  deleteCropCycle,
  CropCycleFault,
} from "@modules/cropping";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ plotId: string; cycleId: string }> }
) {
  try {
    const { plotId, cycleId } = await params;
    const cycle = await getCropCycleDetail({ plotId, cycleId });
    return NextResponse.json(cycle);
  } catch (error) {
    if (error instanceof CropCycleFault) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return apiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ plotId: string; cycleId: string }> }
) {
  try {
    const { plotId, cycleId } = await params;
    const updated = await updateCropCycle({
      plotId,
      cycleId,
      rawInput: await request.json(),
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof CropCycleFault) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return apiError(error);
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ plotId: string; cycleId: string }> }
) {
  try {
    const { plotId, cycleId } = await params;
    await deleteCropCycle({ plotId, cycleId });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof CropCycleFault) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return apiError(error);
  }
}
