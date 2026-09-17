import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, HttpError, requirePermission, normalizePermissions } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { audit } from "@infrastructure/audit";
import { apiError } from "@infrastructure/http";

const patchSchema = z.object({
  label: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).min(1).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { assertSameOrigin } = await import("@infrastructure/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    requirePermission(actor, "internal_team:manage");
    const { id } = await params;
    const input = patchSchema.parse(await request.json());

    const current = await prisma.roleDefinition.findUniqueOrThrow({ where: { id } });
    if (current.slug === "SUPER_ADMIN" && input.active === false) {
      throw new Error("Cannot deactivate the Super Admin role.");
    }
    if (current.slug === "SUPER_ADMIN" && input.permissions) {
      const perms = normalizePermissions(input.permissions);
      if (!perms.includes("internal_team:manage") || !perms.includes("platform:admin")) {
        throw new Error("Super Admin must retain platform and internal team permissions.");
      }
    }

    const permissions = input.permissions ? normalizePermissions(input.permissions) : undefined;
    if (input.permissions && !permissions?.length) {
      throw new Error("Select at least one valid permission.");
    }

    const updated = await prisma.roleDefinition.update({
      where: { id },
      data: {
        label: input.label?.trim(),
        description: input.description?.trim(),
        permissions,
        active: input.active,
      },
      include: { _count: { select: { users: true } } },
    });

    await audit(actor.id, "UPDATE", "RoleDefinition", id, {
      label: updated.label,
      active: updated.active,
      permissionCount: permissions?.length,
    });

    return NextResponse.json({
      id: updated.id,
      slug: updated.slug,
      label: updated.label,
      description: updated.description,
      tier: updated.tier,
      scope: updated.scope,
      permissions: normalizePermissions(Array.isArray(updated.permissions) ? (updated.permissions as string[]) : []),
      isSystem: updated.isSystem,
      active: updated.active,
      userCount: updated._count.users,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { assertSameOrigin } = await import("@infrastructure/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    requirePermission(actor, "internal_team:manage");
    const { id } = await params;

    const row = await prisma.roleDefinition.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (row.isSystem) throw new HttpError(400, "System roles cannot be deleted.");
    if (row._count.users > 0) {
      throw new HttpError(400, "Reassign users before deleting this role.");
    }

    await prisma.roleDefinition.delete({ where: { id } });
    await audit(actor.id, "DELETE", "RoleDefinition", id, { slug: row.slug });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
