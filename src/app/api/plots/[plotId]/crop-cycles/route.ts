import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@infrastructure/http";
import { createCropCycle, CropCycleFault } from "@modules/cropping";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ plotId: string }> }
) {
  try {
    const { plotId } = await params;
    const cycle = await createCropCycle({
      plotId,
      rawInput: await request.json(),
    });
    return NextResponse.json(cycle, { status: 201 });
  } catch (error) {
    if (error instanceof CropCycleFault) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return apiError(error);
  }
}
