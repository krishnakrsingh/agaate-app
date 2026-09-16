import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { activateEstate, EstateFault } from "@modules/estates";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params;
    const active = await activateEstate({ estateId: farmId });
    return NextResponse.json(active);
  } catch (error) {
    if (error instanceof EstateFault) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return apiError(error);
  }
}
