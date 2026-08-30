"use client";
// Browser-only helpers for face detection/embedding. Stage 2 uses @vladmandic/face-api (MIT).
// This file is never imported on server; dynamic import inside components.

export type FaceQualityResult = {
  valid: boolean;
  reason?: string;
  score?: number;
  boxWidth?: number;
  boxHeight?: number;
};

export type FaceDescriptorResult = {
  descriptor: number[];
  score: number;
  box: { width: number; height: number };
};

// Quality gate per spec §3 — reject low-quality frames
export function checkQuality(descriptorResult: { score: number; box: { width: number; height: number } }): FaceQualityResult {
  if (descriptorResult.score < 0.7) return { valid: false, reason: "Face confidence too low. Move closer and improve lighting.", score: descriptorResult.score };
  const min = 80;
  if (descriptorResult.box.width < min || descriptorResult.box.height < min)
    return { valid: false, reason: `Face too small (${Math.round(descriptorResult.box.width)}px). Move closer.`, boxWidth: descriptorResult.box.width, boxHeight: descriptorResult.box.height };
  return { valid: true, score: descriptorResult.score, boxWidth: descriptorResult.box.width, boxHeight: descriptorResult.box.height };
}

// Euclidean distance threshold config is server-side; client only provides embedding
export function isDescriptorLengthValid(d: unknown): boolean {
  return Array.isArray(d) && d.length === 128 && d.every((v) => typeof v === "number" && Number.isFinite(v));
}
