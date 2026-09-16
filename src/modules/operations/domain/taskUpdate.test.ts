/**
 * Characterization tests for PATCH guards (ownership, field scope,
 * completion redirect, planning-field detection). Messages are the API
 * contract — pinned verbatim.
 */
import { describe, it, expect } from "vitest";
import { HttpError } from "@/shared/errors";
import {
  PLANNING_FIELDS,
  hasPlanningFields,
  assertTaskOwnership,
  assertOfficerFieldScope,
  assertNotCompletion,
} from "./taskUpdate";

function faultOf(fn: () => void): HttpError {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(HttpError);
    return e as HttpError;
  }
  throw new Error("expected HttpError");
}

describe("taskUpdate guards (legacy behavior pinned)", () => {
  it("detects planning fields (legacy list, category included)", () => {
    expect(PLANNING_FIELDS).toContain("category");
    expect(hasPlanningFields(["title"])).toBe(false);
    expect(hasPlanningFields(["title", "priority"])).toBe(true);
    expect(hasPlanningFields([])).toBe(false);
  });

  it("rejects officers touching others' tasks (403)", () => {
    expect(() => assertTaskOwnership({ assignedOfficerId: "o1" }, "o1")).not.toThrow();
    expect(() => assertTaskOwnership({ assignedOfficerId: null }, "o1")).not.toThrow();
    const f = faultOf(() => assertTaskOwnership({ assignedOfficerId: "o2" }, "o1"));
    expect(f.status).toBe(403);
    expect(f.message).toBe("This task is assigned to another officer.");
  });

  it("rejects officer planning edits (403)", () => {
    expect(() => assertOfficerFieldScope(false)).not.toThrow();
    const f = faultOf(() => assertOfficerFieldScope(true));
    expect(f.status).toBe(403);
    expect(f.message).toBe("Farm Officers cannot edit planned activity details.");
  });

  it("redirects COMPLETED to the execution endpoint (409)", () => {
    expect(() => assertNotCompletion("IN_PROGRESS")).not.toThrow();
    expect(() => assertNotCompletion(undefined)).not.toThrow();
    const f = faultOf(() => assertNotCompletion("COMPLETED"));
    expect(f.status).toBe(409);
    expect(f.message).toBe("Use the execution completion endpoint to complete an activity.");
  });
});
