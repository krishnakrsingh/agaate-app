import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireRole, HttpError } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, noStore } from "@/lib/api";
import { taskTransitions } from "@/lib/business";

const patchSchema = z.object({
  status: z.enum(["DRAFT", "ASSIGNED", "AVAILABLE", "IN_PROGRESS", "COMPLETED", "CANCELLED", "BLOCKED"]).optional(),
  assignedOfficerId: z.string().min(1).nullable().optional(),
});

// GET /api/hq/tasks/[taskId] — task detail for the ledger drawer: task with
// farm/plot/assignee names, field-work executions (who worked on it), the
// Task audit trail (assignment history: who was assigned when), and the
// server-computed allowed status transitions.
export async function GET(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);
    const { taskId } = await params;

    const task = await prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: {
        farm: { select: { id: true, name: true, client: { select: { id: true, name: true, code: true } } } },
        plot: { select: { id: true, name: true } },
        assignedOfficer: { select: { id: true, name: true } },
        executions: { include: { officer: { select: { id: true, name: true } } } },
      },
    });
    const history = await prisma.auditLog.findMany({
      where: { entityType: "Task", entityId: taskId },
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(
      { task, history, allowedTransitions: taskTransitions[task.status] ?? [] },
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}

// PATCH /api/hq/tasks/[taskId] — status change with strict transition
// enforcement (taskTransitions is the single source of truth) plus officer
// assignment with the same active-officer-with-farm-access check as task
// creation. Every change writes an audit entry, so the drawer can always
// reconstruct who was assigned when. COMPLETED stays on the execution
// completion endpoint, mirroring /api/tasks/[taskId].
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);
    const { taskId } = await params;
    const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
    const input = patchSchema.parse(await request.json());

    const allowed = taskTransitions[task.status] ?? [];
    const hasStatusChange = !!input.status && input.status !== task.status;
    if (input.status && input.status !== task.status) {
      if (input.status === "COMPLETED") {
        return NextResponse.json({ error: "Use the execution completion endpoint to complete a task." }, { status: 409 });
      }
      if (!allowed.includes(input.status)) {
        return NextResponse.json(
          { error: `${input.status} is not a valid transition from ${task.status}. Valid: ${allowed.length ? allowed.join(", ") : "none"}.` },
          { status: 409 }
        );
      }
    }
    const hasAssignChange = "assignedOfficerId" in input && input.assignedOfficerId !== task.assignedOfficerId;
    if (!hasStatusChange && !hasAssignChange) throw new HttpError(422, "Nothing to update.");

    let assignName: string | null = null;
    if (hasAssignChange && input.assignedOfficerId) {
      const officer = await prisma.user.findUnique({
        where: { id: input.assignedOfficerId },
        select: { name: true, role: true, active: true, farmAccess: { where: { farmId: task.farmId } } },
      });
      if (!officer || officer.role !== "FARM_OFFICER" || !officer.active || !officer.farmAccess.length) {
        throw new Error("The assigned user must be an active Farm Officer assigned to this farm.");
      }
      assignName = officer.name;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.task.update({
        where: { id: taskId },
        data: {
          ...(hasStatusChange ? { status: input.status! } : {}),
          ...(hasAssignChange ? { assignedOfficerId: input.assignedOfficerId } : {}),
        },
      });
      if (input.status === "IN_PROGRESS") {
        await tx.taskExecution.upsert({
          where: { taskId },
          update: {
            status: "IN_PROGRESS",
            startedAt: new Date(),
            ...(input.assignedOfficerId ? { officerId: input.assignedOfficerId } : {}),
          },
          create: {
            taskId,
            officerId: input.assignedOfficerId ?? task.assignedOfficerId ?? actor.id,
            status: "IN_PROGRESS",
            startedAt: new Date(),
          },
        });
      }
      return next;
    });

    await audit(actor.id, "UPDATE", "Task", taskId, {
      from: task.status,
      to: updated.status,
      fields: [...(hasStatusChange ? ["status"] : []), ...(hasAssignChange ? ["assignedOfficerId"] : [])],
      assignedFrom: task.assignedOfficerId,
      assignedTo: updated.assignedOfficerId,
      assignedToName: assignName,
    });

    return NextResponse.json({ task: updated, allowedTransitions: taskTransitions[updated.status] ?? [] });
  } catch (error) {
    return apiError(error);
  }
}
