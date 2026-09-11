/**
 * walk-queue — durable offline outbox for perimeter-walk captures.
 *
 * Mechanism: localStorage (the codebase's established durable client
 * store; tracks are small — 2000 samples × ~60B ≈ 120KB max, well within
 * limits). Survives reload, browser restart, and days offline. No service
 * worker exists in this app, so the capture PAGE must have been opened
 * while online at least once — stated in the UI, not hidden.
 *
 * Status is honest: QUEUED/SYNCING only describe LOCAL state. ACCEPTED is
 * set solely from a server 2xx. Nothing here is authoritative.
 */

import type { GpsSample } from "./track";

export type WalkTarget =
  | { kind: "FARM"; farmId: string }
  | { kind: "PLOT_NEW"; farmId: string; name: string; soilType?: string | null }
  | { kind: "PLOT_EXISTING"; farmId: string; plotId: string };

export type WalkStatus =
  | "QUEUED"
  | "SYNCING"
  | "ACCEPTED"
  | "FAILED_RETRYABLE"
  | "FAILED_AUTH"
  | "FAILED_VALIDATION";

export interface QueuedWalk {
  captureId: string;
  target: WalkTarget;
  samples: GpsSample[];
  status: WalkStatus;
  attempts: number;
  lastError: string | null;
  updatedAt: number;
}

export interface ActiveWalk {
  target: WalkTarget;
  samples: GpsSample[];
  startedAt: number;
}

export const WALK_QUEUE_KEY = "agaate_walks_v1";
export const WALK_ACTIVE_KEY = "agaate_walk_active_v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full/blocked: capture continues in memory; sync unaffected
  }
}

export function loadQueue(): QueuedWalk[] {
  const q = read<unknown>(WALK_QUEUE_KEY, []);
  return Array.isArray(q) ? (q as QueuedWalk[]) : [];
}

function saveQueue(q: QueuedWalk[]): void {
  write(WALK_QUEUE_KEY, q);
}

/** Enqueue (or re-queue) a capture. Same captureId twice → single entry. */
export function enqueueWalk(walk: Omit<QueuedWalk, "status" | "attempts" | "lastError" | "updatedAt">): QueuedWalk[] {
  const q = loadQueue().filter((w) => w.captureId !== walk.captureId);
  q.unshift({
    ...walk,
    status: "QUEUED",
    attempts: 0,
    lastError: null,
    updatedAt: Date.now(),
  });
  saveQueue(q);
  return q;
}

export function markWalk(
  captureId: string,
  status: WalkStatus,
  lastError: string | null = null,
  bumpAttempts = false
): QueuedWalk[] {
  const q = loadQueue().map((w) =>
    w.captureId === captureId
      ? { ...w, status, lastError, attempts: w.attempts + (bumpAttempts ? 1 : 0), updatedAt: Date.now() }
      : w
  );
  saveQueue(q);
  return q;
}

export function removeWalk(captureId: string): QueuedWalk[] {
  const q = loadQueue().filter((w) => w.captureId !== captureId);
  saveQueue(q);
  return q;
}

export function saveActiveWalk(a: ActiveWalk | null): void {
  if (a === null) {
    try {
      localStorage.removeItem(WALK_ACTIVE_KEY);
    } catch {
      // ignore
    }
    return;
  }
  write(WALK_ACTIVE_KEY, a);
}

export function loadActiveWalk(): ActiveWalk | null {
  const a = read<unknown>(WALK_ACTIVE_KEY, null);
  if (!a || typeof a !== "object") return null;
  const v = a as Partial<ActiveWalk>;
  if (!v.target || !Array.isArray(v.samples)) return null;
  return v as ActiveWalk;
}

export function newCaptureId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `walk-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}
