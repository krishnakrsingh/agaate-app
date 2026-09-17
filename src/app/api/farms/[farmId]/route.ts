import { NextRequest, NextResponse } from "next/server";
import { requireFarmAccess } from "@modules/auth";
import { apiError } from "@infrastructure/http";
import { getEstateDetail, updateEstate, EstateFault } from "@modules/estates";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params;
    const farm = await getEstateDetail({ estateId: farmId });
    return NextResponse.json(farm);
  } catch (error) {
    if (error instanceof EstateFault) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return apiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params;
    const actor = await requireFarmAccess(farmId, true);
    const farm = await updateEstate({
      estateId: farmId,
      rawInput: await request.json(),
      actor,
    });
    return NextResponse.json(farm);
  } catch (error) {
    if (error instanceof EstateFault) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return apiError(error);
  }
}
