import { PrismaClient } from "@prisma/client";

/**
 * infrastructure/db — the ONLY sanctioned Prisma import path.
 *
 * Connection policy, query logging, and connection singleton attach HERE.
 * Rule: application/infrastructure code imports `prisma` from `@/infrastructure/db`,
 * never `@/lib/prisma`.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = prisma;

