import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "@/lib/access";
import { Prisma } from "@prisma/client";
export function apiError(error: unknown) {
  if (error instanceof HttpError || (typeof error === "object" && error !== null && "status" in error && typeof (error as any).status === "number")) {
    return NextResponse.json({ error: (error as any).message }, { status: (error as any).status });
  }
  if (error instanceof ZodError) return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 422 });
  if (error instanceof Error && (error.message === "Unauthenticated" || error.message === "Account is unavailable")) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (error instanceof Prisma.PrismaClientKnownRequestError) { console.error(error); return NextResponse.json({ error: "The requested record could not be saved." }, { status: 409 }); }
  if (error instanceof Error && /not configured|provider is temporarily unavailable/i.test(error.message)) { console.error(error); return NextResponse.json({ error: "This integration is temporarily unavailable." }, { status: 503 }); }
  if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 422 });
  console.error(error); return NextResponse.json({ error: "An unexpected server error occurred." }, { status: 500 });
}
export const noStore = { "Cache-Control": "no-store" };
export function paginationParams(sp: URLSearchParams) {
  const rawLimit = sp.get("limit");
  const rawOffset = sp.get("offset");
  const rawCursor = sp.get("cursor");
  const limit = rawLimit == null ? 100 : Number(rawLimit);
  const offset = rawOffset == null ? 0 : Number(rawOffset);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new Error("limit must be an integer between 1 and 200.");
  if (!Number.isInteger(offset) || offset < 0) throw new Error("offset must be a non-negative integer.");
  if (rawCursor != null && rawCursor.length < 10) throw new Error("cursor is invalid.");
  return { limit, offset, cursor: rawCursor ?? null };
}
