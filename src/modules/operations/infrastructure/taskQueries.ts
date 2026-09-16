import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * operations/infrastructure/taskQueries — the persistence boundary for task
 * reads. Prisma types never leave this file as exported module API
 * (callers use rows opaquely; JSON serialization at the route erases the
 * shape for UI consumers, which depend on documented fields, not models).
 */

type Db = Pick<PrismaClient, "task" | "$transaction">;

/**
 * Canonical read shape for task retrieval (GET /api/tasks, detail, PATCH
 * responses). Each relation is consumed, none is decorative:
 * - farm/plot/cropCycle/milestone names → queue cards, badges, filters
 * - assignedOfficer.name → assignee badge (scalar id comes from the task row)
 * - executions.media → the ONLY source for primaryImageUrl/media[] signing
 * Deliberately NOT shared with hq ledger (flat SQL) or drawers — those have
 * different contracts and their own shapes (see checkpoint-6 audit).
 */
export const TASK_LIST_INCLUDE = {
  farm: { select: { id: true, name: true } },
  plot: { select: { id: true, name: true } },
  cropCycle: { select: { id: true, cropName: true } },
  milestone: { select: { id: true, name: true } },
  assignedOfficer: { select: { name: true } },
  executions: {
    include: {
      media: true,
    },
  },
} as const;

export type TaskListRow = Prisma.TaskGetPayload<{ include: typeof TASK_LIST_INCLUDE }>;

/** Fixed endpoint ordering: soonest due first, then lexicographic priority. */
const TASK_LIST_ORDER: Prisma.TaskOrderByWithRelationInput[] = [{ dueDate: "asc" }, { priority: "desc" }];

export async function findTasksPage(
  db: Db,
  args: { where: Prisma.TaskWhereInput; limit: number; offset: number }
): Promise<{ rows: TaskListRow[]; total: number }> {
  const [rows, total] = await Promise.all([
    db.task.findMany({
      where: args.where,
      include: TASK_LIST_INCLUDE,
      orderBy: TASK_LIST_ORDER,
      take: args.limit,
      skip: args.offset,
    }),
    db.task.count({ where: args.where }),
  ]);
  return { rows, total };
}

type Tx = Prisma.TransactionClient;

/**
 * PATCH persistence: task row update + conditional IN_PROGRESS execution
 * claim, atomically. `data` is composed by the application layer (field
 * updates + status + officer self-assign); this function owns only the
 * transaction mechanics. No concurrency protection exists upstream
 * (last-writer-wins, re-entry clobbers startedAt) — preserved as-is.
 */
export async function persistTaskUpdate(
  db: Db,
  args: {
    taskId: string;
    data: Prisma.TaskUpdateInput;
    startExecution: { officerId: string } | null;
  }
): Promise<TaskListRow> {
  return db.$transaction(async (tx: Tx) => {
    const updated = await tx.task.update({
      where: { id: args.taskId },
      data: args.data,
      include: TASK_LIST_INCLUDE,
    });

    if (args.startExecution) {
      await tx.taskExecution.upsert({
        where: { taskId: args.taskId },
        update: { status: "IN_PROGRESS", startedAt: new Date(), officerId: args.startExecution.officerId },
        create: {
          taskId: args.taskId,
          officerId: args.startExecution.officerId,
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });
    }

    return updated as TaskListRow;
  });
}
