/**
 * operations/domain/taskTransitions — the ONE authoritative owner of legal
 * task status transitions.
 *
 * Canonical table (moved verbatim from lib/business.ts, which re-exports it
 * as a marked compatibility shim until the hq slice migrates):
 * - missing FROM key → illegal (COMPLETED/CANCELLED are terminal)
 * - DRAFT is never requestable via PATCH (absent from the transport enum)
 * - IN_PROGRESS → COMPLETED is listed but unreachable via PATCH: the route
 *   redirects COMPLETED to the execution completion endpoint first
 *
 * Pure: no Prisma, no Next, no HTTP. Violations throw framework-free
 * HttpError, rendered by the transport layer via apiError.
 */

import { HttpError } from "@/shared/errors";

export const TASK_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["ASSIGNED", "AVAILABLE", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  AVAILABLE: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "BLOCKED"],
  BLOCKED: ["IN_PROGRESS", "CANCELLED"],
};

export function canTransitionTask(from: string, to: string): boolean {
  return TASK_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Statuses a FARM_OFFICER may request (transport allow-list, not the table). */
export const OFFICER_REQUESTABLE_STATUSES = ["IN_PROGRESS", "BLOCKED", "CANCELLED"] as const;

export function assertOfficerStatusPermitted(status: string): void {
  if (!(OFFICER_REQUESTABLE_STATUSES as readonly string[]).includes(status)) {
    throw new HttpError(403, "Farm Officers can only start, block, or cancel their assigned tasks.");
  }
}

/** Officer-only table gate (privileged roles bypass the table entirely). */
export function assertOfficerTransitionAllowed(from: string, to: string): void {
  if (!canTransitionTask(from, to)) {
    throw new HttpError(409, `${to} is not a valid transition from ${from}.`);
  }
}
