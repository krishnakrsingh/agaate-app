import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requirePermission } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, noStore } from "@/lib/api";
import { normalizePermissions } from "@/lib/rbac";
import { legacyRoleForDefinition, slugifyRoleName } from "@/lib/role-definitions-seed";

const createSchema = z.object({
  label: z.string().min(2).max(80),
  description: z.string().max(500).optional().default(""),
  permissions: z.array(z.string()).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requirePermission(actor, "internal_team:manage");

    const tier = request.nextUrl.searchParams.get("tier")?.trim();
    const where: any = {};
    if (tier) where.tier = tier;

    const rows = await prisma.roleDefinition.findMany({
      where,
      orderBy: [{ isSystem: "desc" }, { label: "asc" }],
      include: { _count: { select: { users: true } } },
    });

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        label: r.label,
        description: r.description,
        tier: r.tier,
        scope: r.scope,
        permissions: normalizePermissions(Array.isArray(r.permissions) ? (r.permissions as string[]) : []),
        isSystem: r.isSystem,
        active: r.active,
        userCount: r._count.users,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { assertSameOrigin } = await import("@/lib/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    requirePermission(actor, "internal_team:manage");

    const input = createSchema.parse(await request.json());
    const permissions = normalizePermissions(input.permissions);
    if (!permissions.length) throw new Error("Select at least one valid permission.");

    let slug = slugifyRoleName(input.label);
    if (!slug) throw new Error("Role name must contain letters or numbers.");
    const taken = await prisma.roleDefinition.findUnique({ where: { slug } });
    if (taken) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const row = await prisma.roleDefinition.create({
      data: {
        slug,
        label: input.label.trim(),
        description: input.description?.trim() ?? "",
        tier: "hq",
        scope: "platform",
        permissions,
        isSystem: false,
        active: true,
      },
    });

    await audit(actor.id, "CREATE", "RoleDefinition", row.id, { slug: row.slug, label: row.label });

    return NextResponse.json(
      {
        id: row.id,
        slug: row.slug,
        label: row.label,
        description: row.description,
        tier: row.tier,
        scope: row.scope,
        permissions,
        isSystem: row.isSystem,
        active: row.active,
        legacyRole: legacyRoleForDefinition(row.slug, "hq"),
      },
      { status: 201 }
    );
  } catch (error) {
    return apiError(error);
  }
}
