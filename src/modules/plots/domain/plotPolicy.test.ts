import { describe, it, expect } from "vitest";
import {
  assertPlotAreaWithinRemaining,
  assertIrrigationValid,
  assertPlotCanBeEdited,
  assertPlotCanBeArchived,
  PlotFault,
} from "./plotPolicy";

describe("plotPolicy domain rules", () => {
  it("enforces allocated plot area does not exceed cultivable area", () => {
    expect(() => assertPlotAreaWithinRemaining(4.0, 8.0)).not.toThrow();
    expect(() => assertPlotAreaWithinRemaining(8.0, 8.0)).not.toThrow();
    expect(() => assertPlotAreaWithinRemaining(8.01, 8.0)).toThrow(PlotFault);
    expect(() => assertPlotAreaWithinRemaining(8.01, 8.0)).toThrow(
      "Total plot area cannot exceed the farm's cultivable area."
    );
  });

  it("validates irrigation entries uniqueness", () => {
    expect(() =>
      assertIrrigationValid([
        { type: "Drip", details: "Inline" },
        { type: "Sprinkler" },
      ])
    ).not.toThrow();

    expect(() =>
      assertIrrigationValid([
        { type: "Drip" },
        { type: "Drip" },
      ])
    ).toThrow("Irrigation types must be unique.");
  });

  it("requires details for 'Other' irrigation type", () => {
    expect(() =>
      assertIrrigationValid([{ type: "Other", details: "Special misting system" }])
    ).not.toThrow();

    expect(() =>
      assertIrrigationValid([{ type: "Other", details: "   " }])
    ).toThrow("Details are required for Other irrigation type.");

    expect(() =>
      assertIrrigationValid([{ type: "Other" }])
    ).toThrow("Details are required for Other irrigation type.");
  });

  it("asserts plot can be edited unless archived", () => {
    expect(() => assertPlotCanBeEdited("SETUP")).not.toThrow();
    expect(() => assertPlotCanBeEdited("ACTIVE")).not.toThrow();
    expect(() => assertPlotCanBeEdited("ARCHIVED")).toThrow("An archived plot cannot be edited.");
  });

  it("asserts plot can be archived only without active/planned cycles", () => {
    expect(() => assertPlotCanBeArchived(0)).not.toThrow();
    expect(() => assertPlotCanBeArchived(1)).toThrow("A plot with active/planned crop cycles cannot be archived.");
  });
});
