/**
 * modules/estates/schemas/estate — transport & input validation for estates.
 */

import { z } from "zod";
import { parseSort, paginationParams } from "@infrastructure/http";

export const estateCreateSchema = z
  .object({
    name: z.string().min(2).max(120),
    ownerName: z.string().min(2).max(120),
    location: z.string().min(2).max(180),
    address: z.string().max(500).optional().nullable(),
    latitude: z.coerce.number().gte(-90).lte(90),
    longitude: z.coerce.number().gte(-180).lte(180),
    totalArea: z.coerce.number().positive(),
    cultivableArea: z.coerce.number().positive(),
    waterSource: z.string().min(2).max(180),
    geofenceRadiusMeters: z.coerce.number().int().min(50).max(10000).optional(),
    clientId: z.string().optional().nullable(),
    setupStage: z
      .enum(["SURVEY_SOIL_TEST", "PLOT_DEMARCATION", "BED_SOIL_PREP", "IRRIGATION_LAYOUT", "HANDED_OVER"])
      .optional(),
  })
  .refine((v) => v.cultivableArea <= v.totalArea, {
    message: "Cultivable area cannot exceed total area.",
    path: ["cultivableArea"],
  });

export type EstateCreateInput = z.infer<typeof estateCreateSchema>;

export const estatePatchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  ownerName: z.string().min(2).max(120).optional(),
  location: z.string().min(2).max(180).optional(),
  address: z.string().max(500).nullable().optional(),
  latitude: z.coerce.number().gte(-90).lte(90).optional(),
  longitude: z.coerce.number().gte(-180).lte(180).optional(),
  totalArea: z.coerce.number().positive().optional(),
  cultivableArea: z.coerce.number().positive().optional(),
  waterSource: z.string().min(2).max(180).optional(),
  geofenceRadiusMeters: z.coerce.number().int().min(50).max(10000).optional(),
  boundaryGeoJson: z.any().optional().nullable(),
  boundary: z.any().optional().nullable(),
  status: z.enum(["SETUP", "ACTIVE", "INACTIVE", "COMPLETED"]).optional(),
  force: z.boolean().optional(),
});

export type EstatePatchInput = z.infer<typeof estatePatchSchema>;

export const estateOfficerAssignSchema = z.object({
  userId: z.string().min(1),
  canManage: z.boolean().default(false),
});

export type EstateOfficerAssignInput = z.infer<typeof estateOfficerAssignSchema>;

export const estateOfficerUnassignSchema = z.object({
  userId: z.string().min(1),
});

export type EstateOfficerUnassignInput = z.infer<typeof estateOfficerUnassignSchema>;

export interface EstateListFilters {
  search?: string;
  clientId?: string;
  status?: string;
  state?: string;
  district?: string;
  setupStage?: string;
  hasBoundary?: string;
  stalledOnly?: boolean;
}

export interface EstateListParams {
  filters: EstateListFilters;
  limit: number;
  offset: number;
  sortBy: string;
  order: "asc" | "desc";
}

export function parseEstateListParams(sp: URLSearchParams): EstateListParams {
  const { limit, offset } = paginationParams(sp);
  const search = sp.get("search")?.trim() || undefined;
  const clientId = sp.get("clientId")?.trim() || undefined;
  const status = sp.get("status")?.trim() || undefined;
  const state = sp.get("state")?.trim() || undefined;
  const district = sp.get("district")?.trim() || undefined;
  const setupStage = sp.get("setupStage")?.trim() || undefined;
  const hasBoundary = sp.get("hasBoundary")?.trim() || undefined;
  const stalledOnly = sp.get("stalledOnly")?.trim() === "true";
  const { sortBy, order } = parseSort(sp, ["createdAt", "updatedAt", "name", "totalArea"], "createdAt");

  return {
    filters: {
      search,
      clientId,
      status,
      state,
      district,
      setupStage,
      hasBoundary,
      stalledOnly,
    },
    limit,
    offset,
    sortBy,
    order: order as "asc" | "desc",
  };
}
