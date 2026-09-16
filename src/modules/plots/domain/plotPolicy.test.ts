import { describe, it, expect } from "vitest";
import {
  assertPlotAreaWithinRemaining,
  assertIrrigationValid,
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
});
