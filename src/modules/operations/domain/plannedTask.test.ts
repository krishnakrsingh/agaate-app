/**
 * Characterization tests for operations/domain/plannedTask.
 * Each case pins the EXACT legacy response of POST /api/tasks so the
 * migration cannot drift. Window boundaries use injected clocks.
 */
import { describe, it, expect } from "vitest";
import { HttpError } from "@/shared/errors";
import {
  assertPlanningWindow,
  assertFarmActive,
  assertOfficerEligible,
  assertPlotInFarm,
  assertCycleInScope,
} from "./plannedTask";

function faultOf(fn: () => void): HttpError {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(HttpError);
    return e as HttpError;
  }
  throw new Error("expected HttpError");
}

// Fixed clock: 2026-09-16T12:00:00Z (a Wednesday).
const NOW = new Date("2026-09-16T12:00:00Z");
const d = (iso: string) => new Date(iso + "T00:00:00Z");

describe("plannedTask domain rules (legacy behavior pinned)", () => {
  it("accepts today..today+6, rejects yesterday and today+7", () => {
    for (const day of ["2026-09-16", "2026-09-17", "2026-09-22"]) {
      expect(() => assertPlanningWindow(d(day), NOW)).not.toThrow();
    }
    for (const day of ["2026-09-15", "2026-09-23", "2026-10-06"]) {
      const f = faultOf(() => assertPlanningWindow(d(day), NOW));
      expect(f.status).toBe(422);
      expect(f.message).toBe("Agronomy activities must be planned within the rolling seven-day window.");
    }
  });

  it("requires an ACTIVE farm", () => {
    expect(() => assertFarmActive("ACTIVE")).not.toThrow();
    for (const s of ["SETUP", "INACTIVE", "COMPLETED"]) {
      const f = faultOf(() => assertFarmActive(s));
      expect(f.status).toBe(422);
      expect(f.message).toBe("Agronomy activities can only be planned for an active farm.");
    }
  });

  it("requires an active Farm Officer with access to this farm", () => {
    const ok = { role: "FARM_OFFICER", active: true, farmAccess: [{ farmId: "f" }] };
    expect(() => assertOfficerEligible(ok)).not.toThrow();
    const cases: Array<[string, unknown]> = [
      ["null row", null],
      ["wrong role", { ...ok, role: "FARM_ADMIN" }],
      ["inactive", { ...ok, active: false }],
      ["no access rows", { ...ok, farmAccess: [] }],
    ];
    for (const [name, row] of cases) {
      const f = faultOf(() => assertOfficerEligible(row as never));
      expect(f.status, name).toBe(422);
      expect(f.message, name).toBe("The assigned user must be an active Farm Officer assigned to this farm.");
    }
  });

  it("pins plot/cycle scope messages", () => {
    expect(() => assertPlotInFarm(true)).not.toThrow();
    expect(() => assertCycleInScope(true)).not.toThrow();
    expect(faultOf(() => assertPlotInFarm(false)).message).toBe(
      "The selected plot is not part of this farm."
    );
    expect(faultOf(() => assertCycleInScope(false)).message).toBe(
      "The selected crop cycle is not part of this farm and plot."
    );
  });
});
