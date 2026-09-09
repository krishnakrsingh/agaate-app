import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { currentActor, requireRole, accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, paginationParams } from "@/lib/api";

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(254).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  password: z.string().min(12).max(128),
  role: z.enum(["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"]).default("FARM_OFFICER"),
  isSupervisor: z.boolean().default(false),
  farmId: z.string().optional(),
  farmIds: z.array(z.string().min(1)).default([]),
  managesFarmIds: z.array(z.string().min(1)).default([]),
}).superRefine((data, ctx) => {
  if (!data.email && !data.phone) {
    ctx.addIssue({
      code: "custom",
      path: ["phone"],
      message: "Either mobile number or email address is required.",
    });
  }
});

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "FARM_ADMIN"]);
    const { limit, offset } = paginationParams(request.nextUrl.searchParams);

    const farmIdParam = request.nextUrl.searchParams.get("farmId");

    let where: any = {};
    if (actor.role === "FARM_ADMIN") {
      const ownedFarms = await prisma.farm.findMany({
        where: await accessibleFarmWhere(),
        select: { id: true },
      });
      const farmIds = ownedFarms.map((f) => f.id);
      const targetIds = farmIdParam && farmIds.includes(farmIdParam) ? [farmIdParam] : farmIds;
      where = {
        farmAccess: {
          some: { farmId: { in: targetIds } },
        },
      };
    } else if (farmIdParam) {
      where = {
        farmAccess: {
          some: { farmId: farmIdParam },
        },
      };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isSupervisor: true,
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
    const { assertSameOrigin } = await import("@/lib/security");
    assertSameOrigin(request);
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

    const rawPhone = input.phone ? input.phone.replace(/[^\d+]/g, "") : null;
    const digits = rawPhone?.replace(/[^\d]/g, "") ?? "";
    const normalizedPhone = rawPhone && digits.length >= 10 && digits.length <= 15 ? rawPhone : null;
    if (!input.email && !normalizedPhone) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 });
    }
    const normalizedEmail = (input.email && input.email.trim())
      ? input.email.trim().toLowerCase()
      : `${(normalizedPhone || "worker").replace(/[^\d]/g, "")}@worker.agaate.ag`;

    // Check if email or phone already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      },
    });
    if (existing) {
      throw new Error("A user account with this mobile number or email already exists.");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.$transaction(async (tx) =>
      tx.user.create({
        data: {
          name: input.name,
          email: normalizedEmail,
          phone: normalizedPhone,
          isSupervisor: input.isSupervisor,
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
