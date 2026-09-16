import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireRole } from "@/lib/access";
import { apiError, paginatedJson } from "@/lib/api";
import { plannedTaskSchema, planTask, parseTaskListParams, listTasks } from "@modules/operations";

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    const search = request.nextUrl ? request.nextUrl.searchParams : new URL(request.url).searchParams;
    const { filters, limit, offset } = parseTaskListParams(search);
    const { tasks, total } = await listTasks({ actor, filters, limit, offset });
    return paginatedJson(tasks, total);
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST"]);
    const input = plannedTaskSchema.parse(await request.json());
    const { task } = await planTask({ input, actor });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
