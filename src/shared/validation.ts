import { z } from "zod";

/**
 * shared/validation — generic reusable primitive validation schemas.
 * Domain-specific schemas belong exclusively in their respective modules.
 */

export const lat = z.coerce.number().gte(-90).lte(90);
export const lng = z.coerce.number().gte(-180).lte(180);
export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD.");
