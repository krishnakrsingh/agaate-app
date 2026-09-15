import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SYSTEM = [
  { slug: "SUPER_ADMIN", label: "Super Admin", description: "Full platform control", tier: "hq", scope: "platform", permissions: ["platform:admin","internal_team:manage","clients:read","clients:write","onboarding:manage","farms:read_all","farms:write","analytics:read","tasks:create","tasks:read","incidents:read","incidents:write","attendance:manage","farm_team:manage","farm_settings:manage","field_ops:execute"], isSystem: true },
  { slug: "OPERATIONS_MANAGER", label: "Operations Manager", description: "HQ operations", tier: "hq", scope: "platform", permissions: ["clients:read","clients:write","onboarding:manage","farms:read_all","farms:write","analytics:read","tasks:read","incidents:read","attendance:manage"], isSystem: true },
  { slug: "AGRONOMIST", label: "Agronomist", description: "Technical specialist", tier: "hq", scope: "assigned", permissions: ["farms:read_all","analytics:read","tasks:create","tasks:read","incidents:read","incidents:write","field_ops:execute"], isSystem: true },
  { slug: "FARM_ADMIN", label: "Farm Owner", description: "Client portal admin", tier: "client", scope: "client", permissions: ["farms:read_all","tasks:read","incidents:read","incidents:write","attendance:manage","farm_team:manage","farm_settings:manage"], isSystem: true },
  { slug: "FARM_OFFICER", label: "Farm Manager", description: "On-site operator", tier: "field", scope: "self", permissions: ["tasks:read","incidents:read","incidents:write","field_ops:execute"], isSystem: true },
];

try {
  const bySlug = new Map();
  for (const def of SYSTEM) {
    const row = await prisma.roleDefinition.upsert({
      where: { slug: def.slug },
      create: def,
      update: { label: def.label, description: def.description, tier: def.tier, scope: def.scope, permissions: def.permissions, isSystem: def.isSystem },
    });
    bySlug.set(def.slug, row.id);
  }
  for (const [slug, id] of bySlug) {
    const n = await prisma.user.updateMany({ where: { role: slug, roleDefinitionId: null }, data: { roleDefinitionId: id } });
    if (n.count) console.log(`Backfilled ${n.count} users -> ${slug}`);
  }
  console.log("Done.");
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
