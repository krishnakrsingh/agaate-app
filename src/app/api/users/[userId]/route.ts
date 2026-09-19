import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  currentActor,
  requirePermission,
  resolveManageFarmIds,
  loadRoleDefinitionForAssignment,
} from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { audit } from "@infrastructure/audit";
import { apiError } from "@infrastructure/http";

const schema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(["SUPER_ADMIN", "OPERATIONS_MANAGER", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"]).optional(),
  roleDefinitionId: z.string().min(1).optional(),
  active: z.boolean().optional(),
  password: z.string().min(12).max(128).optional(),
  farmIds: z.array(z.string().min(1)).optional(),
  managesFarmIds: z.array(z.string().min(1)).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const actor = await currentActor();
    requirePermission(actor, "internal_team:manage");
    const { userId } = await params;
    const input = schema.parse(await request.json());

    const current = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        role: true,
        active: true,
        roleDefinition: { select: { slug: true, scope: true, tier: true } },
      },
    });

    const currentSlug = current.roleDefinition?.slug ?? current.role;
    let roleAssignment: { role: typeof current.role; roleDefinitionId: string; scope: string; tier: string } | null = null;

    if (input.roleDefinitionId) {
      const def = await loadRoleDefinitionForAssignment(prisma, input.roleDefinitionId);
      if (def.tier !== "hq") throw new Error("Only HQ roles can be assigned from internal team.");
      roleAssignment = def;
    } else if (input.role) {
      const def = await prisma.roleDefinition.findFirst({ where: { slug: input.role, isSystem: true } });
      if (!def) throw new Error("Unknown system role.");
      roleAssignment = {
        role: input.role,
        roleDefinitionId: def.id,
        scope: def.scope,
        tier: def.tier,
      };
    }

    const nextSlug = roleAssignment?.role ?? currentSlug;
    const demotingSelf =
      userId === actor.id &&
      (input.active === false || (roleAssignment && roleAssignment.role !== "SUPER_ADMIN"));

    if (demotingSelf) throw new Error("You cannot remove your own Super Admin access.");

    if (
      currentSlug === "SUPER_ADMIN" &&
      (input.active === false || (roleAssignment && roleAssignment.role !== "SUPER_ADMIN"))
    ) {
      const remaining = await prisma.user.count({
        where: {
          active: true,
          roleDefinition: { slug: "SUPER_ADMIN" },
          id: { not: userId },
        },
      });
      if (!remaining) throw new Error("At least one active Super Admin is required.");
    }

    const scope = roleAssignment?.scope ?? current.roleDefinition?.scope ?? "self";
    const tier = roleAssignment?.tier ?? current.roleDefinition?.tier ?? "field";
    const effectiveRole = roleAssignment?.role ?? current.role;
    const ids = input.farmIds ?? [];
    const manage = resolveManageFarmIds(effectiveRole, input.managesFarmIds ?? [], scope as any);
    const all = [...new Set([...ids, ...manage])];

    if (effectiveRole === "FARM_OFFICER" && all.length > 1) {
      throw new Error("Validation failed: a Farm Officer can only be assigned to at most one farm.");
    }

    if (input.farmIds || input.managesFarmIds) {
      if (all.length !== await prisma.farm.count({ where: { id: { in: all } } })) {
        throw new Error("A selected farm no longer exists.");
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      let passwordHash: string | undefined;
      if (input.password) passwordHash = await bcrypt.hash(input.password, 12);

      if (input.farmIds || input.managesFarmIds) {
        await tx.farmAccess.deleteMany({ where: { userId } });
        if (all.length) {
          await tx.farmAccess.createMany({
            data: all.map((farmId) => ({ userId, farmId, canManage: manage.includes(farmId) })),
          });
        }
      }

      return tx.user.update({
        where: { id: userId },
        data: {
          name: input.name,
          role: roleAssignment?.role,
          roleDefinitionId: roleAssignment?.roleDefinitionId,
          active: input.active,
          ...(passwordHash ? { passwordHash } : {}),
        },
        include: {
          farmAccess: true,
          roleDefinition: {
            select: { id: true, slug: true, label: true, tier: true, scope: true },
          },
        },
      });
    });

    const { passwordHash: _, ...safeUpdated } = updated as any;
    await audit(actor.id, "UPDATE", "User", userId, {
      role: updated.role,
      roleDefinitionId: updated.roleDefinitionId,
      active: updated.active,
      farmIds: all,
    });
    return NextResponse.json(safeUpdated);
  } catch (error) {
    return apiError(error);
  }
}
