import { describe, it, expect } from "vitest";
import {
  canTransitionEstate,
  assertCultivableWithinTotal,
  assertCanActivateEstate,
  assertValidEstateStatusTransition,
  assertCultivableNotBelowAllocated,
  EstateFault,
} from "./estatePolicy";

describe("estatePolicy domain rules", () => {
  it("enforces allowed status transitions", () => {
    expect(canTransitionEstate("SETUP", "ACTIVE")).toBe(true);
    expect(canTransitionEstate("SETUP", "INACTIVE")).toBe(false);
    expect(canTransitionEstate("SETUP", "COMPLETED")).toBe(false);

    expect(canTransitionEstate("ACTIVE", "INACTIVE")).toBe(true);
    expect(canTransitionEstate("ACTIVE", "COMPLETED")).toBe(true);
    expect(canTransitionEstate("ACTIVE", "SETUP")).toBe(false);

    expect(canTransitionEstate("INACTIVE", "ACTIVE")).toBe(true);
    expect(canTransitionEstate("INACTIVE", "COMPLETED")).toBe(true);

    expect(canTransitionEstate("COMPLETED", "ACTIVE")).toBe(false);
    expect(canTransitionEstate("COMPLETED", "SETUP")).toBe(false);
  });

  it("asserts cultivable area cannot exceed total area", () => {
    expect(() => assertCultivableWithinTotal(5, 10)).not.toThrow();
    expect(() => assertCultivableWithinTotal(10, 10)).not.toThrow();
    expect(() => assertCultivableWithinTotal(10.1, 10)).toThrow(EstateFault);
    expect(() => assertCultivableWithinTotal(10.1, 10)).toThrow("Cultivable area cannot exceed total area.");
  });

  it("validates activation status requirements", () => {
    const res = assertCanActivateEstate("ACTIVE", []);
    expect(res.ready).toBe(false);
    expect(res.status).toBe(409);
  });

  it("rejects activation with no plots", () => {
    const res = assertCanActivateEstate("SETUP", []);
    expect(res.ready).toBe(false);
    expect(res.status).toBe(422);
    expect(res.error).toContain("at least one plot");
  });

  it("rejects activation without standard milestones", () => {
    const plots = [
      {
        deletedAt: null,
        status: "SETUP",
        cropCycles: [
          {
            status: "PLANNED",
            mulchEnabled: false,
            establishmentType: "DIRECT_SOWING" as const,
            milestones: [{ name: "Land Preparation" }],
          },
        ],
      },
    ];
    const res = assertCanActivateEstate("SETUP", plots);
    expect(res.ready).toBe(false);
    expect(res.status).toBe(422);
  });

  it("approves activation with planned crop cycle and all standard milestones", () => {
    const plots = [
      {
        deletedAt: null,
        status: "SETUP",
        cropCycles: [
          {
            status: "PLANNED",
            mulchEnabled: false,
            establishmentType: "DIRECT_SOWING" as const,
            milestones: [
              { name: "Land Preparation" },
              { name: "TP / Sowing Readiness" },
              { name: "Direct Sowing" },
              { name: "First Harvest" },
            ],
          },
        ],
      },
    ];
    const res = assertCanActivateEstate("SETUP", plots);
    expect(res.ready).toBe(true);
  });

  it("asserts valid status transition or throws EstateFault", () => {
    expect(() => assertValidEstateStatusTransition("SETUP", "SETUP")).not.toThrow();
    expect(() => assertValidEstateStatusTransition("SETUP", "ACTIVE")).not.toThrow();
    expect(() => assertValidEstateStatusTransition("SETUP", "COMPLETED")).toThrow(EstateFault);
    expect(() => assertValidEstateStatusTransition("COMPLETED", "ACTIVE")).toThrow(EstateFault);
  });

  it("asserts cultivable area not below allocated plots area", () => {
    expect(() => assertCultivableNotBelowAllocated(10, 8)).not.toThrow();
    expect(() => assertCultivableNotBelowAllocated(10, 10)).not.toThrow();
    expect(() => assertCultivableNotBelowAllocated(9.9, 10)).toThrow(EstateFault);
    expect(() => assertCultivableNotBelowAllocated(9.9, 10)).toThrow("Cultivable area cannot be reduced below the area already allocated to plots.");
  });
});
