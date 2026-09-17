import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireRole } from "@modules/auth";
import { apiError } from "@infrastructure/http";
import { completeTask, completionSchema, CompletionFault } from "@modules/operations";

/**
 * POST /api/tasks/[taskId]/complete — thin adapter.
 * Transport: parse (Zod) → authenticate → edge role check → use-case → respond.
 * All completion rules, reads, writes, and audit live in modules/operations.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const actor = await currentActor();
    requireRole(actor.role, ["FARM_OFFICER", "SUPER_ADMIN"]);
    const input = completionSchema.parse(await request.json());
    const { execution } = await completeTask({ taskId, input, actor });
    return NextResponse.json(execution);
  } catch (error) {
    if (error instanceof CompletionFault) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return apiError(error);
  }
}
