import { describe, it, expect } from "vitest";
import {
  canTransitionCropCycle,
  assertPlotNotArchived,
  assertActiveCycleNotDeleted,
  calculatedInfrastructure,
  milestoneTemplates,
  assertStandardMilestones,
  CropCycleFault,
} from "./cropCyclePolicy";

describe("cropCyclePolicy domain rules", () => {
  it("enforces allowed status transitions", () => {
    expect(canTransitionCropCycle("PLANNED", "ACTIVE")).toBe(true);
    expect(canTransitionCropCycle("PLANNED", "CANCELLED")).toBe(true);
    expect(canTransitionCropCycle("PLANNED", "COMPLETED")).toBe(false);

    expect(canTransitionCropCycle("ACTIVE", "COMPLETED")).toBe(true);
    expect(canTransitionCropCycle("ACTIVE", "CANCELLED")).toBe(true);
    expect(canTransitionCropCycle("ACTIVE", "PLANNED")).toBe(false);

    expect(canTransitionCropCycle("COMPLETED", "ACTIVE")).toBe(false);
    expect(canTransitionCropCycle("CANCELLED", "ACTIVE")).toBe(false);
  });

  it("asserts plot is not archived", () => {
    expect(() => assertPlotNotArchived("SETUP")).not.toThrow();
    expect(() => assertPlotNotArchived("ACTIVE")).not.toThrow();
    expect(() => assertPlotNotArchived("ARCHIVED")).toThrow(CropCycleFault);
    expect(() => assertPlotNotArchived("ARCHIVED")).toThrow("An archived plot cannot receive crop cycles.");
  });

  it("asserts active cycle cannot be deleted", () => {
    expect(() => assertActiveCycleNotDeleted("PLANNED")).not.toThrow();
    expect(() => assertActiveCycleNotDeleted("COMPLETED")).not.toThrow();
    expect(() => assertActiveCycleNotDeleted("ACTIVE")).toThrow(CropCycleFault);
    expect(() => assertActiveCycleNotDeleted("ACTIVE")).toThrow("An active crop cycle cannot be deleted.");
  });

  it("calculates infrastructure accurately", () => {
    const calc = calculatedInfrastructure(2.5, 200, 6000);
    expect(calc.expectedTotalBeds).toBe(500);
    expect(calc.expectedPlants).toBe(15000);

    const empty = calculatedInfrastructure(2.5, null, null);
    expect(empty.expectedTotalBeds).toBeNull();
    expect(empty.expectedPlants).toBeNull();
  });

  it("generates milestone templates based on establishment and mulch", () => {
    const templates1 = milestoneTemplates({
      mulchEnabled: false,
      establishmentType: "DIRECT_SOWING",
    });
    expect(templates1.map((t) => t.name)).toEqual([
      "Land Preparation",
      "TP / Sowing Readiness",
      "Direct Sowing",
      "First Harvest",
    ]);

    const templates2 = milestoneTemplates({
      mulchEnabled: true,
      establishmentType: "NURSERY_TRANSPLANTATION",
    });
    expect(templates2.map((t) => t.name)).toEqual([
      "Land Preparation",
      "Mulching & TP / Sowing Readiness",
      "Transplantation",
      "First Harvest",
    ]);
  });

  it("validates standard milestone retention", () => {
    const valid = [
      { name: "Land Preparation" },
      { name: "TP / Sowing Readiness" },
      { name: "Direct Sowing" },
      { name: "First Harvest" },
    ];
    expect(() =>
      assertStandardMilestones(valid, [
        "Land Preparation",
        "TP / Sowing Readiness",
        "Direct Sowing",
        "First Harvest",
      ])
    ).not.toThrow();

    const withHarvestingAlias = [
      { name: "Land Preparation" },
      { name: "TP / Sowing Readiness" },
      { name: "Direct Sowing" },
      { name: "Harvesting" },
    ];
    expect(() =>
      assertStandardMilestones(withHarvestingAlias, [
        "Land Preparation",
        "TP / Sowing Readiness",
        "Direct Sowing",
        "First Harvest",
      ])
    ).not.toThrow();

    const missing = [
      { name: "Land Preparation" },
      { name: "TP / Sowing Readiness" },
    ];
    expect(() =>
      assertStandardMilestones(missing, [
        "Land Preparation",
        "TP / Sowing Readiness",
        "Direct Sowing",
        "First Harvest",
      ])
    ).toThrow("All four standard milestones are required.");
  });
});
