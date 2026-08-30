import "server-only";
import { FACE_MATCH_THRESHOLD, FACE_MODEL_ID, FACE_MODEL_VERSION, FACE_THRESHOLD_VERSION } from "./face-config";

/**
 * Server-side embedding comparison. Stage 2 uses Euclidean distance (face-api.js standard).
 * Cosine also provided for alternative models; threshold config selects metric.
 */

export function euclideanDistance(a: number[] | Float32Array, b: number[] | Float32Array): number {
  if (a.length !== b.length) throw new Error(`Embedding length mismatch: ${a.length} vs ${b.length}`);
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function cosineSimilarity(a: number[] | Float32Array, b: number[] | Float32Array): number {
  if (a.length !== b.length) throw new Error(`Embedding length mismatch`);
  let dot = 0, nA = 0, nB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    nA += a[i] * a[i];
    nB += b[i] * b[i];
  }
  const denom = Math.sqrt(nA) * Math.sqrt(nB);
  return denom === 0 ? 0 : dot / denom;
}

// Converts euclidean distance to similarity percentage for display (honest, inverse)
// face-api distance 0 → 100%, 0.6 → ~60%, 1.2 → 0%
export function distanceToSimilarityPercent(distance: number): number {
  // Clamp and invert: similarity = max(0, 100 * (1 - distance / 1.2))
  // 1.2 is approx max observed distance for face-api 128D normalized descriptors
  const sim = Math.max(0, 1 - distance / 1.2);
  return Math.round(sim * 100);
}

export type FaceMatchResult = {
  distance: number;
  similarityPercent: number;
  matched: boolean;
  threshold: number;
  thresholdVersion: string;
  modelId: string;
  modelVersion: string;
};

export function compareEmbeddings(params: {
  reference: number[] | Float32Array;
  candidate: number[] | Float32Array;
  threshold?: number;
  modelId?: string;
  modelVersion?: string;
  thresholdVersion?: string;
}): FaceMatchResult {
  const threshold = params.threshold ?? FACE_MATCH_THRESHOLD;
  const distance = euclideanDistance(params.reference, params.candidate);
  const matched = distance <= threshold;
  return {
    distance,
    similarityPercent: distanceToSimilarityPercent(distance),
    matched,
    threshold,
    thresholdVersion: params.thresholdVersion ?? FACE_THRESHOLD_VERSION,
    modelId: params.modelId ?? FACE_MODEL_ID,
    modelVersion: params.modelVersion ?? FACE_MODEL_VERSION,
  };
}

// Average multiple enrollment embeddings into single reference (L2-normalized mean)
export function averageEmbeddings(embeddings: number[][]): number[] {
  if (!embeddings.length) throw new Error("No embeddings to average");
  const len = embeddings[0].length;
  for (const e of embeddings) if (e.length !== len) throw new Error("Embedding length mismatch in enrollment set");
  const mean = new Array(len).fill(0);
  for (const e of embeddings) for (let i = 0; i < len; i++) mean[i] += e[i];
  for (let i = 0; i < len; i++) mean[i] /= embeddings.length;
  // L2 normalize for stable comparison
  const norm = Math.sqrt(mean.reduce((s, v) => s + v * v, 0));
  if (norm === 0) throw new Error("Zero-norm mean embedding");
  return mean.map((v) => v / norm);
}

// Validate embedding shape and values
export function validateEmbedding(emb: unknown): { valid: boolean; error?: string } {
  if (!Array.isArray(emb)) return { valid: false, error: "Embedding must be array" };
  if (emb.length !== 128) return { valid: false, error: `Embedding must be length 128, got ${emb.length}` };
  for (let i = 0; i < emb.length; i++) {
    const v = emb[i];
    if (typeof v !== "number" || !Number.isFinite(v)) return { valid: false, error: `Embedding[${i}] not finite number` };
    if (Math.abs(v) > 10) return { valid: false, error: `Embedding[${i}] out of plausible range` };
  }
  return { valid: true };
}
