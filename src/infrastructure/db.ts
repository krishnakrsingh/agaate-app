/**
 * infrastructure/db — the ONLY sanctioned Prisma import path going forward.
 *
 * Today: re-export of the existing singleton (src/lib/prisma.ts).
 * Target: connection policy, query logging, and read/write splitting
 * attach HERE, not in 133 scattered route files.
 *
 * Rule: new application code imports `prisma` from
 * `@/infrastructure/db` (or `@infrastructure/db`), never `@/lib/prisma`.
 * Old path kept as compat until callers migrate (tracked in
 * docs/architecture/MIGRATION_STATUS.md).
 */

export { prisma } from "@/lib/prisma";
