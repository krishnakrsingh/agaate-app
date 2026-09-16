/**
 * modules/cropping/schemas/cropCycle — transport & input validation schemas for crop cycles.
 */

import { z } from "zod";

const date = z.coerce.date();

export const milestoneInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(2).max(120),
  targetDate: date,
  remarks: z.string().max(500).optional().nullable(),
});

export type MilestoneInput = z.infer<typeof milestoneInputSchema>;

export const cropCycleCreateSchema = z
  .object({
    cropName: z.string().min(2).max(120),
    startDate: date,
    expectedFirstHarvestDate: date.optional().nullable(),
    establishmentType: z.enum(["NURSERY_TRANSPLANTATION", "DIRECT_SOWING"]),
    varieties: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
    bedPreparationEnabled: z.boolean(),
    bedWidthCm: z.coerce.number().positive().optional().nullable(),
    bedCenterDistanceCm: z.coerce.number().positive().optional().nullable(),
    expectedBedsPerAcre: z.coerce.number().positive().optional().nullable(),
    mulchEnabled: z.boolean(),
    mulchHolePattern: z.enum(["SINGLE_LINE", "DOUBLE_LINE_ZIGZAG"]).optional().nullable(),
    plantDistanceCm: z.coerce.number().positive().optional().nullable(),
    expectedPlantsPerAcre: z.coerce.number().positive().optional().nullable(),
    milestones: z.array(milestoneInputSchema).min(3),
    supportActivities: z.array(milestoneInputSchema).max(10).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.bedPreparationEnabled && !v.expectedBedsPerAcre) {
      ctx.addIssue({
        code: "custom",
        path: ["expectedBedsPerAcre"],
        message: "Expected beds per acre is required when bed preparation is enabled.",
      });
    }
    if (v.mulchEnabled && (!v.mulchHolePattern || !v.plantDistanceCm)) {
      ctx.addIssue({
        code: "custom",
        path: ["mulchHolePattern"],
        message: "Mulch pattern and plant distance are required when mulching is enabled.",
      });
    }
  });

export type CropCycleCreateInput = z.infer<typeof cropCycleCreateSchema>;

export const cropCyclePatchSchema = z.object({
  cropName: z.string().min(2).max(120).optional(),
  startDate: date.optional(),
  expectedFirstHarvestDate: date.optional().nullable(),
  establishmentType: z.enum(["NURSERY_TRANSPLANTATION", "DIRECT_SOWING"]).optional(),
  varieties: z.array(z.string().trim().min(1).max(80)).min(1).max(20).optional(),
  bedPreparationEnabled: z.boolean().optional(),
  bedWidthCm: z.coerce.number().positive().optional().nullable(),
  bedCenterDistanceCm: z.coerce.number().positive().optional().nullable(),
  expectedBedsPerAcre: z.coerce.number().positive().optional().nullable(),
  mulchEnabled: z.boolean().optional(),
  mulchHolePattern: z.enum(["SINGLE_LINE", "DOUBLE_LINE_ZIGZAG"]).optional().nullable(),
  plantDistanceCm: z.coerce.number().positive().optional().nullable(),
  expectedPlantsPerAcre: z.coerce.number().positive().optional().nullable(),
  milestones: z.array(milestoneInputSchema).min(3).optional(),
});

export type CropCyclePatchInput = z.infer<typeof cropCyclePatchSchema>;
