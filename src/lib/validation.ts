import { z } from "zod";

// ponytail: single source for repeated route schemas — use instead of inline copies
export const farmId = z.string().min(1);
export const lat = z.coerce.number().gte(-90).lte(90);
export const lng = z.coerce.number().gte(-180).lte(180);
export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD.");
export const irrigationType = z.enum(["Drip", "Sprinkler", "Rain Pipe", "Flood", "Other"]);
export const soilType = z.string().max(100).optional().nullable();
