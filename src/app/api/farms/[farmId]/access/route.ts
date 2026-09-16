import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import {
  listEstateAccess,
  assignEstateOfficer,
  unassignEstateOfficer,
  EstateFault,
} from "@modules/estates";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params;
    const data = await listEstateAccess({ estateId: farmId });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof EstateFault) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return apiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params;
    const result = await assignEstateOfficer({
      estateId: farmId,
      rawInput: await request.json(),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof EstateFault) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return apiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params;
    await unassignEstateOfficer({
      estateId: farmId,
      rawInput: await request.json(),
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof EstateFault) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return apiError(error);
  }
}
