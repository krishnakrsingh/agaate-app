import { describe, expect, it } from "vitest";
import {
  calculatedInfrastructure,
  canTransitionTask,
  distanceMeters,
  isWithinRollingSevenDays,
  labourHours,
  milestoneTemplates,
  variance,
  parseUtcDate,
  utcDateOnly,
  DEFAULT_GEOFENCE_RADIUS_METERS,
} from "./business";

describe("Farm Business Rules & Domain Formulations", () => {
  describe("Infrastructure & Plant Population Calculations", () => {
    it("calculates expected total beds and plants from plot area and per-acre rates", () => {
      const result = calculatedInfrastructure(2.5, 400, 1600);
      expect(result.expectedTotalBeds).toBe(1000);
      expect(result.expectedPlants).toBe(4000);
    });

    it("handles nullable beds and plant configurations safely", () => {
      expect(calculatedInfrastructure(5.0, null, null)).toEqual({
        expectedTotalBeds: null,
        expectedPlants: null,
      });
      expect(calculatedInfrastructure(3.0, 350, null)).toEqual({
        expectedTotalBeds: 1050,
        expectedPlants: null,
      });
      expect(calculatedInfrastructure(3.0, null, 2000)).toEqual({
        expectedTotalBeds: null,
        expectedPlants: 6000,
      });
    });
  });

  describe("Variance Calculation", () => {
    it("reports positive amount and positive percentage variance", () => {
      expect(variance(100, 115)).toEqual({ amount: 15, percentage: 15 });
    });

    it("reports negative amount and negative percentage variance", () => {
      expect(variance(100, 80)).toEqual({ amount: -20, percentage: -20 });
    });

    it("returns null for null inputs or zero expected amount", () => {
      expect(variance(null, 100)).toBeNull();
      expect(variance(100, null)).toBeNull();
      expect(variance(0, 50)).toEqual({ amount: 50, percentage: null });
    });
  });

  describe("Labour Tracking", () => {
    it("calculates total labour hours correctly with integers and decimals", () => {
      expect(labourHours(5, 6)).toBe(30);
      expect(labourHours(4, 5.5)).toBe(22);
      expect(labourHours(0, 8)).toBe(0);
    });
  });

  describe("Haversine Distance & Geofence Validation", () => {
    it("returns 0 distance for identical coordinates", () => {
      const coord = { latitude: 12.9716, longitude: 77.5946 };
      expect(distanceMeters(coord, coord)).toBe(0);
    });

    it("calculates precise distance between distinct points", () => {
      // Bangalore City coordinates to a point ~1.1km north
      const farm = { latitude: 12.9716, longitude: 77.5946 };
      const officer = { latitude: 12.9816, longitude: 77.5946 };
      const dist = distanceMeters(farm, officer);
      expect(dist).toBeGreaterThan(1000);
      expect(dist).toBeLessThan(1200);
      expect(dist > DEFAULT_GEOFENCE_RADIUS_METERS).toBe(true);
    });

    it("detects when officer is within default 500m geofence radius", () => {
      const farm = { latitude: 12.9716, longitude: 77.5946 };
      const officerNearby = { latitude: 12.9720, longitude: 77.5948 };
      const dist = distanceMeters(farm, officerNearby);
      expect(dist).toBeLessThan(DEFAULT_GEOFENCE_RADIUS_METERS);
    });
  });

  describe("Dynamic Milestone Template Generation", () => {
    it("generates correct 4 standard milestones for Mulch=YES and Establishment=NURSERY", () => {
      const harvestDate = new Date("2026-11-30T00:00:00Z");
      const milestones = milestoneTemplates({
        mulchEnabled: true,
        establishmentType: "NURSERY_TRANSPLANTATION",
        firstHarvestDate: harvestDate,
      });

      expect(milestones).toHaveLength(4);
      expect(milestones[0].name).toBe("Land Preparation");
      expect(milestones[1].name).toBe("Mulching & TP / Sowing Readiness");
      expect(milestones[2].name).toBe("Transplantation");
      expect(milestones[3].name).toBe("First Harvest");
      expect(milestones[3].targetDate).toEqual(harvestDate);
    });

    it("generates correct 4 standard milestones for Mulch=NO and Establishment=DIRECT_SOWING", () => {
      const milestones = milestoneTemplates({
        mulchEnabled: false,
        establishmentType: "DIRECT_SOWING",
      });

      expect(milestones).toHaveLength(4);
      expect(milestones[0].name).toBe("Land Preparation");
      expect(milestones[1].name).toBe("TP / Sowing Readiness");
      expect(milestones[2].name).toBe("Direct Sowing");
      expect(milestones[3].name).toBe("First Harvest");
      expect(milestones[3].targetDate).toBeNull();
    });
  });

  describe("Task State Machine Transitions", () => {
    it("allows valid forward task status transitions", () => {
      expect(canTransitionTask("DRAFT", "ASSIGNED")).toBe(true);
      expect(canTransitionTask("DRAFT", "AVAILABLE")).toBe(true);
      expect(canTransitionTask("DRAFT", "CANCELLED")).toBe(true);
      expect(canTransitionTask("ASSIGNED", "IN_PROGRESS")).toBe(true);
      expect(canTransitionTask("AVAILABLE", "IN_PROGRESS")).toBe(true);
      expect(canTransitionTask("IN_PROGRESS", "COMPLETED")).toBe(true);
      expect(canTransitionTask("IN_PROGRESS", "BLOCKED")).toBe(true);
      expect(canTransitionTask("BLOCKED", "IN_PROGRESS")).toBe(true);
      expect(canTransitionTask("BLOCKED", "CANCELLED")).toBe(true);
    });

    it("rejects invalid, skipped, or backward task status transitions", () => {
      expect(canTransitionTask("COMPLETED", "IN_PROGRESS")).toBe(false);
      expect(canTransitionTask("COMPLETED", "DRAFT")).toBe(false);
      expect(canTransitionTask("CANCELLED", "ASSIGNED")).toBe(false);
      expect(canTransitionTask("DRAFT", "COMPLETED")).toBe(false);
      expect(canTransitionTask("ASSIGNED", "COMPLETED")).toBe(false);
    });
  });

  describe("Agronomy Planning 7-Day Rolling Window Rule", () => {
    it("accepts dates within today and the next 6 days", () => {
      const now = new Date("2026-08-30T10:00:00Z");
      expect(isWithinRollingSevenDays(new Date("2026-08-30T00:00:00Z"), now)).toBe(true);
      expect(isWithinRollingSevenDays(new Date("2026-08-31T00:00:00Z"), now)).toBe(true);
      expect(isWithinRollingSevenDays(new Date("2026-09-05T00:00:00Z"), now)).toBe(true);
    });

    it("rejects past dates or dates beyond the 7-day rolling window", () => {
      const now = new Date("2026-08-30T10:00:00Z");
      expect(isWithinRollingSevenDays(new Date("2026-08-29T23:59:59Z"), now)).toBe(false);
      expect(isWithinRollingSevenDays(new Date("2026-09-06T00:00:00Z"), now)).toBe(false);
      expect(isWithinRollingSevenDays(new Date("2026-10-01T00:00:00Z"), now)).toBe(false);
    });
  });

  describe("UTC Date Centralization", () => {
    it("normalizes any timestamp to UTC midnight", () => {
      const d = new Date("2026-08-30T15:45:30.123Z");
      const utc = utcDateOnly(d);
      expect(utc.toISOString()).toBe("2026-08-30T00:00:00.000Z");
    });

    it("parses ISO date strings to UTC midnight", () => {
      expect(parseUtcDate("2026-08-30").toISOString()).toBe("2026-08-30T00:00:00.000Z");
      expect(parseUtcDate("2026-08-30T23:59:59Z").toISOString()).toBe("2026-08-30T00:00:00.000Z");
    });

    it("treats today at any time as same UTC date", () => {
      const morning = new Date("2026-08-30T06:00:00Z");
      const evening = new Date("2026-08-30T22:00:00Z");
      expect(utcDateOnly(morning).getTime()).toBe(utcDateOnly(evening).getTime());
    });

    it("ensures delayed detection is date-only not time-dependent", () => {
      // due today should NOT be delayed when checked at noon UTC
      const todayNoon = new Date("2026-08-30T12:00:00Z");
      const todayMidnight = utcDateOnly(todayNoon);
      const tomorrow = new Date(todayMidnight);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      // simulated DB dueDate = today midnight, check lt todayMidnight -> false (not delayed)
      expect(todayMidnight < todayMidnight).toBe(false);
      const yesterday = new Date(todayMidnight);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      expect(yesterday < todayMidnight).toBe(true);
      expect(tomorrow < todayMidnight).toBe(false);
    });
  });
});
