/**
 * Face recognition configuration — single source of truth for model version and match threshold.
 * Spec §5-6: threshold must be configuration, versioned, and empirically validated. No scattered magic numbers.
 */

// Model identity — must match enrolled FaceEnrollment.modelId/modelVersion. If these change, previous embeddings are not comparable.
export const FACE_MODEL_ID = process.env.FACE_MODEL_ID ?? "face-api-vladmandic";
export const FACE_MODEL_VERSION = process.env.FACE_MODEL_VERSION ?? "0.2.0"; // maps to nets: tinyFaceDetector+landmark68+recognition
export const FACE_MODEL_DESCRIPTOR_LENGTH = 128; // 128D float embedding

// Threshold versioning — bump when threshold recalibrated on validation dataset
export const FACE_THRESHOLD_VERSION = process.env.FACE_THRESHOLD_VERSION ?? "2026-08-31-v1";

// Euclidean distance threshold for face-api.js recognition (lower = stricter, higher = permissive)
// Default 0.6 is face-api.js recommended (LFW FPR ~0.1% at 0.5, ~2% at 0.6). This is NOT 0.42 arbitrary.
// This value MUST be validated on Agaate-specific dataset before production tightening.
// Store as env string to allow tuning without code change.
export const FACE_MATCH_THRESHOLD: number = (() => {
  const raw = process.env.FACE_MATCH_THRESHOLD ?? "0.6";
  const n = Number(raw);
  if (Number.isNaN(n) || n <= 0 || n > 2) throw new Error(`FACE_MATCH_THRESHOLD must be number (0,2], got ${raw}`);
  return n;
})();

// Enrollment requirements
export const FACE_ENROLLMENT_FRAMES_REQUIRED = 3;
export const FACE_ENROLLMENT_MIN_QUALITY_SCORE = 0.7; // detection score threshold
export const FACE_ENROLLMENT_MIN_FACE_SIZE_PX = 80; // bounding box min dimension

export type FaceModelMeta = {
  modelId: string;
  modelVersion: string;
  descriptorLength: number;
  threshold: number;
  thresholdVersion: string;
};

export function faceModelMeta(): FaceModelMeta {
  return {
    modelId: FACE_MODEL_ID,
    modelVersion: FACE_MODEL_VERSION,
    descriptorLength: FACE_MODEL_DESCRIPTOR_LENGTH,
    threshold: FACE_MATCH_THRESHOLD,
    thresholdVersion: FACE_THRESHOLD_VERSION,
  };
}
