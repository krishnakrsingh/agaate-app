export const DEFAULT_GEOFENCE_RADIUS_METERS = 500;
const EARTH_RADIUS_METERS = 6_371_000;
const radians = (degrees: number) => degrees * Math.PI / 180;
export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const dLat = radians(b.latitude - a.latitude); const dLon = radians(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
export function calculatedInfrastructure(plotArea: number, bedsPerAcre?: number | null, plantsPerAcre?: number | null) {
  return { expectedTotalBeds: bedsPerAcre == null ? null : plotArea * bedsPerAcre, expectedPlants: plantsPerAcre == null ? null : plotArea * plantsPerAcre };
}
export function variance(expected: number | null, actual: number | null) {
  if (expected == null || actual == null) return null;
  const amount = actual - expected; return { amount, percentage: expected === 0 ? null : (amount / expected) * 100 };
}
export function labourHours(labourers: number, hours: number) { return labourers * hours; }
export function utcDateOnly(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
export function parseUtcDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return utcDateOnly(d);
}
export function isWithinRollingSevenDays(value: Date, now = new Date()) {
  const start = utcDateOnly(now);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const candidate = utcDateOnly(value);
  return candidate >= start && candidate <= end;
}
export const taskTransitions: Record<string, string[]> = { DRAFT: ["ASSIGNED", "AVAILABLE", "CANCELLED"], ASSIGNED: ["IN_PROGRESS", "CANCELLED"], AVAILABLE: ["IN_PROGRESS", "CANCELLED"], IN_PROGRESS: ["COMPLETED", "BLOCKED"], BLOCKED: ["IN_PROGRESS", "CANCELLED"] };
export function canTransitionTask(from: string, to: string) { return taskTransitions[from]?.includes(to) ?? false; }
export function milestoneTemplates(input: { mulchEnabled: boolean; establishmentType: "NURSERY_TRANSPLANTATION" | "DIRECT_SOWING"; firstHarvestDate?: Date | null }) {
  return ["Land Preparation", input.mulchEnabled ? "Mulching & TP / Sowing Readiness" : "TP / Sowing Readiness", input.establishmentType === "NURSERY_TRANSPLANTATION" ? "Transplantation" : "Direct Sowing", "First Harvest"].map((name) => ({ name, targetDate: name === "First Harvest" && input.firstHarvestDate ? input.firstHarvestDate : null }));
}
