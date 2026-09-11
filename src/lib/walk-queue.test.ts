import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  enqueueWalk,
  markWalk,
  removeWalk,
  loadQueue,
  saveActiveWalk,
  loadActiveWalk,
  newCaptureId,
  WALK_QUEUE_KEY,
  WALK_ACTIVE_KEY,
} from "./walk-queue";
import type { GpsSample } from "./track";

const sample = (n: number): GpsSample[] =>
  Array.from({ length: n }, (_, i) => ({ lat: 13.09 + i * 0.0001, lng: 77.6, acc: 5, t: 1000 + i * 5000 }));

describe("walk-queue: durable outbox", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    });
  });

  it("enqueue → load → mark → remove round-trips", () => {
    enqueueWalk({ captureId: "c1", target: { kind: "FARM", farmId: "f1" }, samples: sample(10) });
    expect(loadQueue()).toHaveLength(1);
    markWalk("c1", "SYNCING", null, true);
    const [w] = loadQueue();
    expect(w.status).toBe("SYNCING");
    expect(w.attempts).toBe(1);
    markWalk("c1", "ACCEPTED");
    expect(loadQueue()[0].status).toBe("ACCEPTED");
    removeWalk("c1");
    expect(loadQueue()).toHaveLength(0);
  });

  it("same captureId twice → single entry (no duplicate sync)", () => {
    const body = { captureId: "dup", target: { kind: "FARM", farmId: "f1" } as const, samples: sample(10) };
    enqueueWalk(body);
    enqueueWalk(body);
    expect(loadQueue()).toHaveLength(1);
    expect(loadQueue()[0].status).toBe("QUEUED");
  });

  it("corrupt storage → empty, never throws", () => {
    localStorage.setItem(WALK_QUEUE_KEY, "{{{broken");
    expect(loadQueue()).toEqual([]);
    localStorage.setItem(WALK_ACTIVE_KEY, "42");
    expect(loadActiveWalk()).toBeNull();
  });

  it("active walk survives a reload (save → load)", () => {
    saveActiveWalk({ target: { kind: "PLOT_NEW", farmId: "f1", name: "Walked Block" }, samples: sample(25), startedAt: 123 });
    const restored = loadActiveWalk();
    expect(restored?.samples).toHaveLength(25);
    expect(restored?.target).toMatchObject({ kind: "PLOT_NEW", name: "Walked Block" });
    saveActiveWalk(null);
    expect(loadActiveWalk()).toBeNull();
  });

  it("captureIds are unique", () => {
    const ids = new Set(Array.from({ length: 200 }, () => newCaptureId()));
    expect(ids.size).toBe(200);
  });

  it("failed states carry messages and stay retryable", () => {
    enqueueWalk({ captureId: "c9", target: { kind: "FARM", farmId: "f9" }, samples: sample(10) });
    markWalk("c9", "FAILED_AUTH", "Forbidden", true);
    const [w] = loadQueue();
    expect(w.status).toBe("FAILED_AUTH");
    expect(w.lastError).toBe("Forbidden");
    expect(w.attempts).toBe(1);
    // re-queue for retry keeps the same captureId (idempotent resubmit)
    enqueueWalk({ captureId: "c9", target: { kind: "FARM", farmId: "f9" }, samples: sample(10) });
    expect(loadQueue()).toHaveLength(1);
    expect(loadQueue()[0].status).toBe("QUEUED");
  });
});
