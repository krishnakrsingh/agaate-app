import type { PrismaClient } from "@prisma/client";
import { SYSTEM_ROLE_DEFINITIONS } from "../src/modules/auth/domain/rolePolicy";

export async function seedRoleDefinitions(prisma: PrismaClient) {
  const bySlug = new Map<string, string>();

  for (const def of SYSTEM_ROLE_DEFINITIONS) {
    const row = await prisma.roleDefinition.upsert({
      where: { slug: def.slug },
      create: {
        slug: def.slug,
        label: def.label,
        description: def.description,
        tier: def.tier,
        scope: def.scope,
        permissions: def.permissions,
        isSystem: def.isSystem,
        active: true,
      },
      update: {
        label: def.label,
        description: def.description,
        tier: def.tier,
        scope: def.scope,
        permissions: def.permissions,
        isSystem: def.isSystem,
      },
    });
    bySlug.set(def.slug, row.id);
  }

  return bySlug;
}

export async function backfillUserRoleDefinitions(prisma: PrismaClient, bySlug: Map<string, string>) {
  for (const [slug, id] of bySlug) {
    await prisma.user.updateMany({
      where: { role: slug as any, roleDefinitionId: null },
      data: { roleDefinitionId: id },
    });
  }
}
