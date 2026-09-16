/**
 * Characterization tests for attendance lifecycle rules.
 * START/END validity, end-status resolution, selfie freshness, and
 * presence gates — messages are the API contract, pinned verbatim.
 */
import { describe, it, expect } from "vitest";
import { AttendanceFault } from "./attendancePolicy";
import {
  SELFIE_FRESH_MS,
  isSelfieFresh,
  assertStartPresent,
  assertStartAllowed,
  assertEndAllowed,
  resolveEndStatus,
  resolveLinkPlotId,
} from "./attendancePolicy";

function faultOf(fn: () => void): AttendanceFault {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(AttendanceFault);
    return e as AttendanceFault;
  }
  throw new Error("expected AttendanceFault");
}

describe("attendancePolicy (legacy behavior pinned)", () => {
  it("resolves END status exactly as legacy", () => {
    expect(resolveEndStatus(true, "OPEN")).toBe("EXCEPTION_PENDING");
    expect(resolveEndStatus(true, "EXCEPTION_REJECTED")).toBe("EXCEPTION_PENDING");
    expect(resolveEndStatus(false, "OPEN")).toBe("COMPLETED");
    expect(resolveEndStatus(false, "EXCEPTION_APPROVED")).toBe("COMPLETED");
    expect(resolveEndStatus(false, "EXCEPTION_PENDING")).toBe("EXCEPTION_PENDING");
    expect(resolveEndStatus(false, "EXCEPTION_REJECTED")).toBe("EXCEPTION_REJECTED");
  });

  it("blocks duplicate START and unstarted/repeated END", () => {
    expect(() => assertStartAllowed(null)).not.toThrow();
    // Dup-START travels the plain-Error channel (apiError allow-list → 422),
    // exactly as legacy — not an AttendanceFault.
    try {
      assertStartAllowed({ id: "x" });
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toBe("Day has already been started for this farm.");
    }
    expect(() => assertEndAllowed({ startAt: new Date(), endAt: null })).not.toThrow();
    // END gates also travel the plain-Error channel (allow-list → 422).
    const endFirst = (() => {
      try {
        assertEndAllowed(null);
      } catch (e) {
        return e as Error;
      }
      throw new Error("expected throw");
    })();
    expect(endFirst.message).toBe("Start the day before ending it.");
    const endAgain = (() => {
      try {
        assertEndAllowed({ startAt: new Date(), endAt: new Date() });
      } catch (e) {
        return e as Error;
      }
      throw new Error("expected throw");
    })();
    expect(endAgain.message).toBe("Day has already been ended.");
  });

  it("enforces dual-clock 30-minute selfie freshness", () => {
    expect(SELFIE_FRESH_MS).toBe(30 * 60 * 1000);
    const now = new Date("2026-09-16T12:00:00Z");
    const ago = (ms: number) => new Date(now.getTime() - ms);
    const fresh = { verifiedAt: ago(29 * 60 * 1000), createdAt: ago(29 * 60 * 1000), storageKey: "k" };
    expect(isSelfieFresh(fresh, now)).toBe(true);
    expect(isSelfieFresh({ ...fresh, verifiedAt: ago(31 * 60 * 1000) }, now)).toBe(false);
    expect(isSelfieFresh({ ...fresh, createdAt: ago(31 * 60 * 1000) }, now)).toBe(false);
    expect(isSelfieFresh({ ...fresh, verifiedAt: null }, now)).toBe(false);
  });

  it("pins START presence gates in legacy order", () => {
    expect(faultOf(() => assertStartPresent({})).body).toEqual({
      error: "Farm selection is required to start a shift.",
    });
    expect(faultOf(() => assertStartPresent({ farmId: "f" })).body).toEqual({
      error: "GPS location is required to verify start-of-shift presence.",
    });
    expect(faultOf(() => assertStartPresent({ farmId: "f", latitude: 1, longitude: 2 })).body).toEqual({
      error: "A valid uploaded selfie is required to start a shift.",
    });
  });

  it("links plots only when alive", () => {
    expect(resolveLinkPlotId({ deletedAt: null, status: "ACTIVE" }, "p")).toBe("p");
    expect(resolveLinkPlotId({ deletedAt: new Date(), status: "ACTIVE" }, "p")).toBe(null);
    expect(resolveLinkPlotId({ deletedAt: null, status: "ARCHIVED" }, "p")).toBe(null);
    expect(resolveLinkPlotId(null, "p")).toBe(null);
  });
});
