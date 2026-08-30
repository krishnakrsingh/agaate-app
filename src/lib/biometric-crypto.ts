import "server-only";
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

/**
 * AES-256-GCM encryption for biometric embeddings.
 * Key must be 32 bytes (256 bits) provided as base64 or hex via BIOMETRIC_ENCRYPTION_KEY env.
 * Stage 2 will use this; Stage 1 only validates key presence for audit.
 */

function getKey(): Buffer {
  const raw = process.env.BIOMETRIC_ENCRYPTION_KEY;
  if (!raw) throw new Error("BIOMETRIC_ENCRYPTION_KEY is not configured. Generate 32 random bytes and set as base64.");
  // Try base64 decode first
  try {
    const buf = Buffer.from(raw, "base64");
    if (buf.length === 32) return buf;
  } catch {}
  // Try hex
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  // Try raw utf8 if exactly 32 chars
  const buf = Buffer.from(raw, "utf-8");
  if (buf.length === 32) return buf;
  throw new Error("BIOMETRIC_ENCRYPTION_KEY must be 32 bytes (base64 of 32 bytes or 64 hex chars).");
}

export function encryptEmbedding(embedding: Float32Array | number[]): { ciphertext: string; iv: string; authTag: string } {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(new Float32Array(embedding).buffer);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptEmbedding(params: { ciphertext: string; iv: string; authTag: string }): Float32Array {
  const key = getKey();
  const iv = Buffer.from(params.iv, "base64");
  const authTag = Buffer.from(params.authTag, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const encrypted = Buffer.from(params.ciphertext, "base64");
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  // Convert back to Float32Array
  return new Float32Array(decrypted.buffer, decrypted.byteOffset, decrypted.byteLength / 4);
}

export function hasBiometricKey(): boolean {
  return Boolean(process.env.BIOMETRIC_ENCRYPTION_KEY);
}
