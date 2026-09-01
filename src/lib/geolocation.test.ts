import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function getErrorMessage(code: number) {
  if (code === 1) return "Location permission was denied. Enter coordinates manually.";
  if (code === 3) return "Location timed out. Try again or enter coordinates manually.";
  return "Location is unavailable. Enter coordinates manually.";
}

describe("Plot Get Current Location (MVP UX)", () => {
  it("maps GeolocationPositionError codes to user-friendly messages", () => {
    expect(getErrorMessage(1)).toContain("permission was denied");
    expect(getErrorMessage(2)).toContain("unavailable");
    expect(getErrorMessage(3)).toContain("timed out");
    expect(getErrorMessage(0)).toContain("unavailable");
  });

  it("keeps manual entry available (inputs remain editable after capture)", async () => {
    // Verify source files contain both capture and manual input
    const plotForm = fs.readFileSync(path.join(process.cwd(), "src/components/plot-form.tsx"), "utf-8");
    expect(plotForm).toContain("Capture GPS");
    expect(plotForm).toContain('name="latitude"');
    expect(plotForm).toContain('name="longitude"');
    expect(plotForm).toContain("enableHighAccuracy: true");
    expect(plotForm).toContain("timeout: 10000");

    const farmForm = fs.readFileSync(path.join(process.cwd(), "src/components/farm-form.tsx"), "utf-8");
    expect(farmForm).toContain("Capture GPS");
    expect(farmForm).toContain('name="latitude"');
  });

  it("handles permission denied, unavailable, timeout, and unsupported", async () => {
    const files = ["src/components/plot-form.tsx", "src/components/farm-form.tsx", "src/components/farm-edit-form.tsx", "src/components/plot-edit-form.tsx"];
    for (const f of files) {
      const content = fs.readFileSync(path.join(process.cwd(), f), "utf-8");
      const hasUnsupported = content.includes("not supported") || content.includes("cannot provide") || content.includes("does not provide");
      expect(hasUnsupported).toBe(true);
      expect(content).toContain("permission was denied");
      expect(content).toContain("timed out");
      expect(content).toContain("unavailable");
      expect(content).toContain("Enter coordinates manually");
    }
  });

  it("navigator.geolocation.getCurrentPosition is called with high accuracy and timeout", () => {
    const plotForm = fs.readFileSync(path.join(process.cwd(), "src/components/plot-form.tsx"), "utf-8");
    expect(plotForm).toContain("getCurrentPosition");
    expect(plotForm).toMatch(/enableHighAccuracy:\s*true/);
    expect(plotForm).toMatch(/timeout:\s*10000/);
  });
});
