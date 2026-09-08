import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { currentActor, requireRole, accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, paginationParams } from "@/lib/api";

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"]),
  farmId: z.string().optional(),
  farmIds: z.array(z.string().min(1)).default([]),
  managesFarmIds: z.array(z.string().min(1)).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "FARM_ADMIN"]);
    const { limit, offset } = paginationParams(request.nextUrl.searchParams);

    let where: any = {};
    if (actor.role === "FARM_ADMIN") {
      const ownedFarms = await prisma.farm.findMany({
        where: await accessibleFarmWhere(),
        select: { id: true },
      });
      const farmIds = ownedFarms.map((f) => f.id);
      where = {
        farmAccess: {
          some: { farmId: { in: farmIds } },
        },
      };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        farmAccess: {
          select: {
            farmId: true,
            canManage: true,
            farm: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(users);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "FARM_ADMIN"]);
    const input = createUserSchema.parse(await request.json());

    // Farm owners can only create Farm Officers (Farm Managers) for their own estates
    if (actor.role === "FARM_ADMIN") {
      if (input.role !== "FARM_OFFICER") {
        throw new Error("Farm Owners can only create Farm Officer accounts for on-site management.");
      }

      const accessibleFarms = await prisma.farm.findMany({
        where: await accessibleFarmWhere(),
        select: { id: true },
      });
      const accessibleFarmIds = new Set(accessibleFarms.map((f) => f.id));

      const targetFarms = [...new Set([...input.farmIds, ...(input.farmId ? [input.farmId] : [])])];
      for (const farmId of targetFarms) {
        if (!accessibleFarmIds.has(farmId)) {
          throw new Error("You do not have administrative authority over one of the selected farms.");
        }
      }
    }

    const farmIds = [...new Set([...input.farmIds, ...(input.farmId ? [input.farmId] : []), ...input.managesFarmIds])];
    if (farmIds.length) {
      const count = await prisma.farm.count({ where: { id: { in: farmIds } } });
      if (count !== farmIds.length) throw new Error("A selected farm no longer exists.");
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) {
      throw new Error("A user account with this email address already exists.");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.$transaction(async (tx) =>
      tx.user.create({
        data: {
          name: input.name,
          email: input.email.toLowerCase(),
          passwordHash,
          role: input.role,
          farmAccess: {
            create: farmIds.map((farmId) => ({
              farmId,
              canManage: input.role === "FARM_ADMIN" && input.managesFarmIds.includes(farmId),
            })),
          },
        },
        include: { farmAccess: true },
      })
    );

    const { passwordHash: _, ...safeUser } = user as any;

    await audit(actor.id, "CREATE", "User", user.id, {
      role: user.role,
      farmIds,
      createdByRole: actor.role,
    });

    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
