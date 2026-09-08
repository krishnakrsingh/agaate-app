import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { downloadUrl } from "@/lib/storage";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const key = request.nextUrl.searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "Storage key required." }, { status: 400 });
    }

    const url = await downloadUrl(key);
    return NextResponse.json({ url, expiresInSeconds: 300 });
  } catch (error) {
    return apiError(error);
  }
}
