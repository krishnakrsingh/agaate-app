import "server-only";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Role } from "@prisma/client";
import type { Actor } from "../domain/actorPolicy";

const secret = new TextEncoder().encode(process.env.APP_SESSION_SECRET ?? "");

export function requireSecret() {
  if (secret.length < 32) {
    throw new Error("APP_SESSION_SECRET must be set to a random value of at least 32 characters.");
  }
}

const LEGACY_ROLES = new Set<Role>([
  "SUPER_ADMIN",
  "OPERATIONS_MANAGER",
  "FARM_ADMIN",
  "AGRONOMIST",
  "FARM_OFFICER",
]);

export async function signSessionToken(actor: Actor): Promise<string> {
  requireSecret();
  if (!LEGACY_ROLES.has(actor.role)) throw new Error("Invalid role for session.");
  const { randomUUID } = await import("crypto");
  return new SignJWT({
    userId: actor.id,
    role: actor.role,
    roleSlug: actor.roleSlug,
    name: actor.name,
    jti: randomUUID(),
    iss: "agaate",
    aud: "agaate-app",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<JWTPayload | null> {
  try {
    requireSecret();
    const { payload } = await jwtVerify(token, secret);
    if (payload.iss != null && payload.iss !== "agaate") return null;
    const aud = (payload as Record<string, unknown>).aud;
    if (aud != null && aud !== "agaate-app" && !(Array.isArray(aud) && (aud as string[]).includes("agaate-app"))) {
      return null;
    }
    if (typeof payload.userId !== "string" || typeof payload.name !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}
