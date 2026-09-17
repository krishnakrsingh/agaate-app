import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@infrastructure/http";
import { getEstateTaskPins, EstateFault } from "@modules/estates";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params;
    const statusParam = request.nextUrl.searchParams.get("status");
    const data = await getEstateTaskPins({
      estateId: farmId,
      statusParam,
    });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof EstateFault) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return apiError(error);
  }
}
