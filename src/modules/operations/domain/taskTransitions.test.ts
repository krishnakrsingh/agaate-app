/**
 * Characterization tests for the canonical task transition table.
 * The matrix below IS the legacy business.ts contract (moved verbatim);
 * any change here is a product decision, not a migration.
 */
import { describe, it, expect } from "vitest";
import { HttpError } from "@/shared/errors";
import {
  TASK_TRANSITIONS,
  canTransitionTask,
  OFFICER_REQUESTABLE_STATUSES,
  assertOfficerStatusPermitted,
  assertOfficerTransitionAllowed,
} from "./taskTransitions";

describe("taskTransitions (legacy matrix pinned)", () => {
  it("allows exactly the legacy edges", () => {
    expect(TASK_TRANSITIONS).toEqual({
      DRAFT: ["ASSIGNED", "AVAILABLE", "CANCELLED"],
      ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
      AVAILABLE: ["IN_PROGRESS", "CANCELLED"],
      IN_PROGRESS: ["COMPLETED", "BLOCKED"],
      BLOCKED: ["IN_PROGRESS", "CANCELLED"],
    });
    expect(canTransitionTask("ASSIGNED", "IN_PROGRESS")).toBe(true);
    expect(canTransitionTask("IN_PROGRESS", "COMPLETED")).toBe(true);
    expect(canTransitionTask("COMPLETED", "IN_PROGRESS")).toBe(false);
    expect(canTransitionTask("ASSIGNED", "COMPLETED")).toBe(false);
    expect(canTransitionTask("ASSIGNED", "ASSIGNED")).toBe(false);
    expect(canTransitionTask("NOPE", "IN_PROGRESS")).toBe(false);
  });

  it("restricts officer requests to start/block/cancel", () => {
    expect([...OFFICER_REQUESTABLE_STATUSES]).toEqual(["IN_PROGRESS", "BLOCKED", "CANCELLED"]);
    expect(() => assertOfficerStatusPermitted("IN_PROGRESS")).not.toThrow();
    const f = (() => {
      try {
        assertOfficerStatusPermitted("ASSIGNED");
      } catch (e) {
        return e as HttpError;
      }
      throw new Error("expected throw");
    })();
    expect(f).toBeInstanceOf(HttpError);
    expect(f.status).toBe(403);
  });

  it("rejects illegal officer transitions with 409", () => {
    expect(() => assertOfficerTransitionAllowed("ASSIGNED", "IN_PROGRESS")).not.toThrow();
    try {
      assertOfficerTransitionAllowed("ASSIGNED", "BLOCKED");
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(HttpError);
      expect((e as HttpError).status).toBe(409);
      expect((e as Error).message).toBe("BLOCKED is not a valid transition from ASSIGNED.");
    }
  });
});
