import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "@/lib/access";
import { Prisma } from "@prisma/client";
export function apiError(error: unknown) {
  if (error instanceof HttpError || (typeof error === "object" && error !== null && "status" in error && typeof (error as any).status === "number")) {
    return NextResponse.json({ error: (error as any).message }, { status: (error as any).status });
  }
  if (error instanceof ZodError) {
    const flat = error.flatten();
    const firstFieldErr = Object.entries(flat.fieldErrors)[0]?.[1]?.[0];
    const firstFormErr = flat.formErrors[0];
    const message = firstFormErr || firstFieldErr || "Validation failed";
    return NextResponse.json({ error: message, details: flat }, { status: 422 });
  }
  if (error instanceof Error && (error.message === "Unauthenticated" || error.message === "Account is unavailable")) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(error);
    if (error.code === "P2025") return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    return NextResponse.json({ error: "The requested record could not be saved." }, { status: 409 });
  }
  if (error instanceof Error && /not configured|provider is temporarily unavailable/i.test(error.message)) { console.error(error); return NextResponse.json({ error: "This integration is temporarily unavailable." }, { status: 503 }); }
  if (error instanceof Error) {
    // Never leak internal detail (S3 errors, stock levels, paths). Only
    // allow-listed user-facing messages reach the client.
    const msg = error.message || "";
    const userFacing = /^(Validation failed|Authentication required|You do not have|Farm selection|GPS location|A valid uploaded selfie|A reason is required|Day has already|Start the day|An archived plot|Total plot area|A plot with|Insufficient stock|A user account|Farm Owners can only|You do not have administrative|Either mobile|Cultivable area|Initial plot|Too many failed|Invalid email|Invalid mobile|Password is required|Email or phone|File and farmId|Uploaded file|You cannot confirm|Media is not|Storage key|Invalid storage|Cross-origin|Uploads are temporarily|A valid media kind|Only active Farm Officer|Farm officers can only|Only Farm Admins|At least one active|You cannot remove your own|A selected farm|Agronomy activities|The assigned user|The selected plot|The selected crop|One or more activity|One or more crop|This task is assigned|The crop cycle must be|The requested record|Date of birth|The selected agronomist|Select a specific)/i.test(msg);
    if (userFacing) return NextResponse.json({ error: msg }, { status: 422 });
    console.error(error);
    return NextResponse.json({ error: "An unexpected server error occurred." }, { status: 500 });
  }
  console.error(error); return NextResponse.json({ error: "An unexpected server error occurred." }, { status: 500 });
}
export const noStore = { "Cache-Control": "no-store" };
export function paginationParams(sp: URLSearchParams) {
  const rawLimit = sp.get("limit");
  const rawOffset = sp.get("offset");
  const limit = rawLimit == null ? 100 : Number(rawLimit);
  const offset = rawOffset == null ? 0 : Number(rawOffset);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new Error("limit must be an integer between 1 and 200.");
  if (!Number.isInteger(offset) || offset < 0) throw new Error("offset must be a non-negative integer.");
  return { limit, offset };
}
