/**
 * Characterization tests for operations/domain/completion.
 * Each case pins the EXACT legacy response (status + message) of
 * POST /api/tasks/[taskId]/complete so the migration cannot drift.
 */
import { describe, it, expect } from "vitest";
import {
  CompletionFault,
  assertAssignee,
  assertCompletableStatus,
  assertActualsAllowed,
  geofenceLabel,
} from "./completion";

function faultOf(fn: () => void): CompletionFault {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(CompletionFault);
    return e as CompletionFault;
  }
  throw new Error("expected CompletionFault");
}

describe("completion domain rules (legacy behavior pinned)", () => {
  it("rejects non-IN_PROGRESS tasks with 409", () => {
    for (const s of ["DRAFT", "ASSIGNED", "AVAILABLE", "BLOCKED", "CANCELLED", "COMPLETED"]) {
      const f = faultOf(() => assertCompletableStatus(s));
      expect(f.status).toBe(409);
      expect(f.body).toEqual({ error: "Start the activity before recording completion." });
    }
    expect(() => assertCompletableStatus("IN_PROGRESS")).not.toThrow();
  });

  it("rejects officers completing others' tasks with 403", () => {
    const task = { status: "IN_PROGRESS", assignedOfficerId: "officer-a", cropCycleId: null, milestoneId: null };
    const f = faultOf(() => assertAssignee(task, { id: "officer-b", role: "FARM_OFFICER" }));
    expect(f.status).toBe(403);
    expect(f.body).toEqual({ error: "This task is assigned to another officer." });
    expect(() => assertAssignee(task, { id: "officer-a", role: "FARM_OFFICER" })).not.toThrow();
    expect(() => assertAssignee(task, { id: "anyone", role: "SUPER_ADMIN" })).not.toThrow();
  });

  it("gates actual bed counts to the Land Preparation milestone (422)", () => {
    const ok = {
      status: "IN_PROGRESS",
      assignedOfficerId: "o",
      cropCycleId: "c",
      milestoneId: "m",
      milestone: { name: "Land Preparation" },
    };
    expect(() => assertActualsAllowed(ok, { actualBedsCreated: 10 })).not.toThrow();
    const wrong = { ...ok, milestone: { name: "Transplantation" } };
    const f = faultOf(() => assertActualsAllowed(wrong, { actualBedsCreated: 10 }));
    expect(f.status).toBe(422);
    expect(f.body).toEqual({
      error: "Actual bed count can only be recorded on the Land Preparation milestone.",
    });
    const nocycle = { ...ok, cropCycleId: null };
    expect(faultOf(() => assertActualsAllowed(nocycle, { actualBedsCreated: 1 })).status).toBe(422);
  });

  it("gates actual plant counts to Transplantation / Direct Sowing (422)", () => {
    const base = {
      status: "IN_PROGRESS",
      assignedOfficerId: "o",
      cropCycleId: "c",
      milestoneId: "m",
      milestone: { name: "Land Preparation" },
    };
    for (const name of ["Transplantation", "Direct Sowing"]) {
      expect(() => assertActualsAllowed({ ...base, milestone: { name } }, { actualPlants: 5 })).not.toThrow();
    }
    const f = faultOf(() => assertActualsAllowed(base, { actualPlants: 5 }));
    expect(f.status).toBe(422);
    expect(f.body).toEqual({
      error: "Actual plant count can only be recorded on a Transplantation or Direct Sowing milestone.",
    });
  });

  it("labels geofence bases exactly as the legacy message did", () => {
    expect(geofenceLabel("PLOT_POLYGON")).toBe("plot fence");
    expect(geofenceLabel("FARM_POLYGON")).toBe("farm fence");
    expect(geofenceLabel("RADIUS")).toBe("radius");
  });
});
