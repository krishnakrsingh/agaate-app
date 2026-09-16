/**
 * modules/plots/schemas/plot — transport & input validation for plots.
 */

import { z } from "zod";
import { paginationParams } from "@/lib/api";

const irrigationItemSchema = z.object({
  type: z.enum(["Drip", "Rain Pipe", "Sprinkler", "Flood", "Other"]),
  details: z.string().max(300).optional().nullable(),
});

export const plotCreateSchema = z.object({
  name: z.string().min(1).max(120),
  area: z.coerce.number().positive(),
  latitude: z.coerce.number().gte(-90).lte(90),
  longitude: z.coerce.number().gte(-180).lte(180),
  soilType: z.string().max(100).optional().nullable(),
  boundary: z.any().optional().nullable(),
  boundaryGeoJson: z.any().optional().nullable(),
  irrigation: z
    .array(irrigationItemSchema)
    .max(20)
    .optional()
    .default([])
    .refine((v) => new Set(v.map((x) => x.type)).size === v.length, "Irrigation types must be unique.")
    .superRefine((arr, ctx) => {
      for (const it of arr) {
        if (it.type === "Other" && !it.details?.trim()) {
          ctx.addIssue({
            code: "custom",
            message: "Details are required for Other irrigation type.",
            path: ["irrigation"],
          });
        }
      }
    }),
});

export type PlotCreateInput = z.infer<typeof plotCreateSchema>;

export const plotPatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  area: z.coerce.number().positive().optional(),
  latitude: z.coerce.number().gte(-90).lte(90).optional(),
  longitude: z.coerce.number().gte(-180).lte(180).optional(),
  soilType: z.string().max(100).nullable().optional(),
  status: z.enum(["SETUP", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  boundary: z.any().optional().nullable(),
  boundaryGeoJson: z.any().optional().nullable(),
  irrigation: z
    .array(irrigationItemSchema)
    .min(1)
    .optional()
    .superRefine((arr, ctx) => {
      if (!arr) return;
      if (new Set(arr.map((x) => x.type)).size !== arr.length) {
        ctx.addIssue({
          code: "custom",
          message: "Irrigation types must be unique.",
          path: ["irrigation"],
        });
      }
      for (const it of arr) {
        if (it.type === "Other" && !it.details?.trim()) {
          ctx.addIssue({
            code: "custom",
            message: "Details are required for Other irrigation type.",
            path: ["irrigation"],
          });
        }
      }
    }),
});

export type PlotPatchInput = z.infer<typeof plotPatchSchema>;

export interface PlotListFilters {
  search?: string;
  farmId?: string;
  status?: string;
}

export interface PlotListParams {
  filters: PlotListFilters;
  limit: number;
  offset: number;
}

export function parsePlotListParams(sp: URLSearchParams): PlotListParams {
  const { limit, offset } = paginationParams(sp);
  const search = sp.get("search")?.trim() || undefined;
  const farmId = sp.get("farmId")?.trim() || undefined;
  const status = sp.get("status")?.trim() || undefined;

  return {
    filters: {
      search,
      farmId,
      status,
    },
    limit,
    offset,
  };
}
