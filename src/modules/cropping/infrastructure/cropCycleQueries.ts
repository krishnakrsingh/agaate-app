/**
 * modules/cropping/infrastructure/cropCycleQueries — database queries & transactions for crop cycles.
 *
 * Direct Prisma access is sealed inside this layer.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CropCycleCreateInput,
  CropCyclePatchInput,
  MilestoneInput,
} from "../schemas/cropCycle";

type Db = Pick<PrismaClient, "plot" | "farm" | "cropCycle" | "cropVariety" | "milestone" | "task">;

export async function findPlotForCropCycle(db: Db, plotId: string) {
  const prismaDb = db as unknown as PrismaClient;
  return prismaDb.plot.findUniqueOrThrow({
    where: { id: plotId },
    include: { farm: { select: { id: true, status: true } } },
  });
}

export async function createCropCycleTransaction(
  prismaClient: PrismaClient,
  args: {
    plotId: string;
    farmId: string;
    initialStatus: "ACTIVE" | "PLANNED";
    input: CropCycleCreateInput;
    calc: { expectedTotalBeds: number | null; expectedPlants: number | null };
    milestones: MilestoneInput[];
    actorId: string;
  }
) {
  const { plotId, farmId, initialStatus, input, calc, milestones, actorId } = args;

  return prismaClient.$transaction(async (tx) => {
    const created = await tx.cropCycle.create({
      data: {
        plotId,
        status: initialStatus,
        cropName: input.cropName,
        startDate: input.startDate,
        expectedFirstHarvestDate: input.expectedFirstHarvestDate,
        establishmentType: input.establishmentType,
        bedPreparationEnabled: input.bedPreparationEnabled,
        bedWidthCm: input.bedWidthCm,
        bedCenterDistanceCm: input.bedCenterDistanceCm,
        expectedBedsPerAcre: input.expectedBedsPerAcre,
        expectedTotalBeds: calc.expectedTotalBeds,
        mulchEnabled: input.mulchEnabled,
        mulchHolePattern: input.mulchHolePattern,
        plantDistanceCm: input.plantDistanceCm,
        expectedPlantsPerAcre: input.expectedPlantsPerAcre,
        expectedPlants: calc.expectedPlants,
        varieties: {
          create: [...new Set(input.varieties)].map((name) => ({ name })),
        },
        milestones: {
          create: milestones,
        },
      },
      include: { milestones: true },
    });

    await tx.task.createMany({
      data: created.milestones.map((m) => ({
        farmId,
        plotId,
        cropCycleId: created.id,
        milestoneId: m.id,
        origin: "SYSTEM",
        category: "MILESTONE",
        title: m.name,
        description: `Complete the ${m.name} milestone.`,
        dueDate: m.targetDate,
        status: "AVAILABLE",
        createdById: actorId,
      })),
    });

    return created;
  });
}

export async function findCropCycleDetail(
  db: Db,
  args: { plotId: string; cycleId: string }
) {
  const prismaDb = db as unknown as PrismaClient;
  return prismaDb.cropCycle.findFirstOrThrow({
    where: { id: args.cycleId, plotId: args.plotId },
    include: {
      varieties: true,
      milestones: { orderBy: { targetDate: "asc" } },
    },
  });
}

export async function findCropCycleForPatch(
  db: Db,
  args: { plotId: string; cycleId: string }
) {
  const prismaDb = db as unknown as PrismaClient;
  return prismaDb.cropCycle.findFirstOrThrow({
    where: { id: args.cycleId, plotId: args.plotId },
    include: {
      plot: { select: { farmId: true, area: true } },
      milestones: true,
    },
  });
}

export async function updateCropCycleTransaction(
  prismaClient: PrismaClient,
  args: {
    plotId: string;
    cycleId: string;
    existingCycle: {
      plot: { farmId: string };
      milestones: Array<{ id: string; name: string }>;
    };
    input: CropCyclePatchInput;
    calc: { expectedTotalBeds: number | null; expectedPlants: number | null };
    actorId: string;
  }
) {
  const { plotId, cycleId, existingCycle, input, calc, actorId } = args;

  return prismaClient.$transaction(async (tx) => {
    const { varieties, milestones, ...base } = input;

    if (varieties) {
      await tx.cropVariety.deleteMany({ where: { cropCycleId: cycleId } });
      await tx.cropVariety.createMany({
        data: [...new Set(varieties)].map((name) => ({ cropCycleId: cycleId, name })),
      });
    }

    if (milestones) {
      const retained = milestones.filter((item) => item.id).map((item) => item.id!);
      const removed = existingCycle.milestones
        .filter((item) => !retained.includes(item.id))
        .map((item) => item.id);

      if (removed.length) {
        await tx.task.updateMany({
          where: {
            milestoneId: { in: removed },
            status: { in: ["DRAFT", "ASSIGNED", "AVAILABLE"] },
          },
          data: { status: "CANCELLED", milestoneId: null },
        });
        await tx.milestone.deleteMany({ where: { id: { in: removed } } });
      }

      for (const item of milestones) {
        const existing = item.id && existingCycle.milestones.some((m) => m.id === item.id) ? item.id : null;
        const saved = existing
          ? await tx.milestone.update({
              where: { id: existing },
              data: { name: item.name, targetDate: item.targetDate, remarks: item.remarks },
            })
          : await tx.milestone.create({
              data: { cropCycleId: cycleId, name: item.name, targetDate: item.targetDate, remarks: item.remarks },
            });

        await tx.task.updateMany({
          where: { milestoneId: saved.id, status: { in: ["DRAFT", "ASSIGNED", "AVAILABLE"] } },
          data: {
            title: saved.name,
            dueDate: saved.targetDate,
            description: `Complete the ${saved.name} milestone.`,
          },
        });

        if (!existing) {
          await tx.task.create({
            data: {
              farmId: existingCycle.plot.farmId,
              plotId,
              cropCycleId: cycleId,
              milestoneId: saved.id,
              origin: "SYSTEM",
              category: "MILESTONE",
              title: saved.name,
              description: `Complete the ${saved.name} milestone.`,
              dueDate: saved.targetDate,
              status: "AVAILABLE",
              createdById: actorId,
            },
          });
        }
      }
    }

    return tx.cropCycle.update({
      where: { id: cycleId },
      data: {
        ...base,
        expectedTotalBeds: calc.expectedTotalBeds,
        expectedPlants: calc.expectedPlants,
      },
      include: { varieties: true, milestones: true },
    });
  });
}

export async function findCropCycleForDelete(
  db: Db,
  args: { plotId: string; cycleId: string }
) {
  const prismaDb = db as unknown as PrismaClient;
  return prismaDb.cropCycle.findFirstOrThrow({
    where: { id: args.cycleId, plotId: args.plotId },
    include: { plot: { select: { farmId: true } } },
  });
}

export async function cancelCropCycleTransaction(
  prismaClient: PrismaClient,
  cycleId: string
) {
  return prismaClient.$transaction(async (tx) => {
    await tx.cropCycle.update({
      where: { id: cycleId },
      data: { status: "CANCELLED" },
    });
    await tx.task.updateMany({
      where: { cropCycleId: cycleId, status: { in: ["DRAFT", "ASSIGNED", "AVAILABLE"] } },
      data: { status: "CANCELLED" },
    });
  });
}

export async function findPlotForNewCropCyclePage(db: Db, plotId: string) {
  const prismaDb = db as unknown as PrismaClient;
  return prismaDb.plot.findUniqueOrThrow({
    where: { id: plotId },
    include: { farm: { select: { id: true, name: true } } },
  });
}

export async function findCropCycleForDetailPage(
  db: Db,
  args: { plotId: string; cycleId: string }
) {
  const prismaDb = db as unknown as PrismaClient;
  return prismaDb.cropCycle.findUniqueOrThrow({
    where: { id: args.cycleId, plotId: args.plotId },
    include: {
      plot: {
        include: {
          farm: { select: { id: true, name: true, location: true } },
        },
      },
      varieties: true,
      milestones: {
        orderBy: { targetDate: "asc" },
        include: {
          tasks: {
            include: {
              assignedOfficer: { select: { name: true } },
              executions: {
                include: {
                  materials: true,
                  labour: true,
                  media: true,
                },
              },
            },
          },
        },
      },
      monitoring: {
        orderBy: { createdAt: "desc" },
        include: {
          officer: { select: { name: true } },
          media: true,
        },
      },
      incidents: {
        orderBy: { createdAt: "desc" },
        include: {
          reporter: { select: { name: true } },
          media: true,
          followUps: true,
        },
      },
      tasks: {
        orderBy: { dueDate: "asc" },
        include: {
          assignedOfficer: { select: { name: true } },
          executions: {
            include: {
              materials: true,
              labour: true,
              media: true,
            },
          },
        },
      },
    },
  });
}

export async function findPlotForEditCropCyclePage(db: Db, plotId: string) {
  const prismaDb = db as unknown as PrismaClient;
  return prismaDb.plot.findUniqueOrThrow({
    where: { id: plotId },
    select: { farmId: true, name: true, farm: { select: { name: true } } },
  });
}
